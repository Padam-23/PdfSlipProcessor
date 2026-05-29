const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
}

/**
 * Middleware that verifies a Supabase access token (from Google OAuth),
 * attaches the user's database record to req.user,
 * and also checks their license status via a SEPARATE query (no join).
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token is required." });
    }

    if (!supabase) {
      return res.status(500).json({ message: "Auth service not configured properly." });
    }

    // Verify the Supabase token
    const { data: { user: supabaseUser }, error: verifyError } = await supabase.auth.getUser(token);

    if (verifyError || !supabaseUser) {
      console.error("Token verification failed:", verifyError?.message);
      return res.status(403).json({ message: "Invalid or expired token." });
    }

    const { email, id: supabaseUserId } = supabaseUser;

    if (!email) {
      return res.status(400).json({ message: "Token missing email." });
    }

    // ── Fetch user (plain select, no join) ────────────────────────
    let { data: dbUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("supabase_user_id", supabaseUserId)
      .single();

    // Fallback to email lookup on first login
    if (fetchError && fetchError.code === "PGRST116") {
      const result = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      dbUser = result.data;
      fetchError = result.error;
    }

    if (fetchError && fetchError.code === "PGRST116") {
      // Auto-create user
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          email,
          supabase_user_id: supabaseUserId,
          display_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || email.split("@")[0],
          avatar_url: supabaseUser.user_metadata?.avatar_url || null,
          pdf_limit: 100,
          pdf_used: 0,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error auto-creating user:", insertError);
        return res.status(500).json({ message: "Error creating user account." });
      }

      dbUser = newUser;
    } else if (fetchError) {
      console.error("Error fetching user:", fetchError);
      return res.status(500).json({ message: "Database error." });
    } else {
      // Update metadata on each request
      const { error: updateError } = await supabase
        .from("users")
        .update({
          supabase_user_id: supabaseUserId,
          display_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || dbUser.display_name,
          avatar_url: supabaseUser.user_metadata?.avatar_url || dbUser.avatar_url,
          last_login: new Date().toISOString(),
        })
        .eq("id", dbUser.id);

      if (updateError) {
        console.error("Error updating user:", updateError);
      }
    }

    if (!dbUser.is_active) {
      return res.status(403).json({ message: "Account is inactive." });
    }

    // ── Fetch license separately (no join) ────────────────────────
    let license_status = "none";
    let license_expires_at = null;

    if (dbUser.license_key_id) {
      const { data: licenseKey } = await supabase
        .from("license_keys")
        .select("*")
        .eq("id", dbUser.license_key_id)
        .single();

      if (licenseKey) {
        const now = new Date();
        const expiresAt = licenseKey.expires_at ? new Date(licenseKey.expires_at) : null;

        if (licenseKey.status === "revoked") {
          license_status = "revoked";
        } else if (licenseKey.status === "expired" || (expiresAt && now > expiresAt)) {
          license_status = "expired";
          if (licenseKey.status !== "expired") {
            await supabase
              .from("license_keys")
              .update({ status: "expired" })
              .eq("id", licenseKey.id);
          }
        } else if (licenseKey.status === "active") {
          license_status = "active";
        }

        license_expires_at = licenseKey.expires_at;
      }
    }
    // ─────────────────────────────────────────────────────────────

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      pdf_limit: dbUser.pdf_limit,
      pdf_used: dbUser.pdf_used,
      display_name: dbUser.display_name,
      avatar_url: dbUser.avatar_url,
      is_active: dbUser.is_active,
      license_status,
      license_expires_at,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Authentication error." });
  }
};

/**
 * Middleware that additionally requires an active license.
 */
const requireActiveLicense = (req, res, next) => {
  if (req.user.license_status !== "active") {
    return res.status(403).json({
      message: "License required.",
      license_status: req.user.license_status,
    });
  }
  next();
};

module.exports = { authenticateToken, requireActiveLicense };