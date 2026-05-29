const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("CRITICAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in authController.");
}

const supabase = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

/**
 * Compute license_status from a license key record.
 * Updates DB status to 'expired' if past expiry date.
 */
async function computeLicenseStatus(licenseKey) {
  if (!licenseKey) return { license_status: "none", licenseKey: null };

  const now = new Date();
  const expiresAt = licenseKey.expires_at ? new Date(licenseKey.expires_at) : null;

  if (licenseKey.status === "revoked") {
    return { license_status: "revoked", licenseKey };
  }

  if (licenseKey.status === "expired" || (expiresAt && now > expiresAt)) {
    if (licenseKey.status !== "expired") {
      await supabase
        .from("license_keys")
        .update({ status: "expired" })
        .eq("id", licenseKey.id);
    }
    return { license_status: "expired", licenseKey };
  }

  if (licenseKey.status === "active") {
    return { license_status: "active", licenseKey };
  }

  return { license_status: "none", licenseKey };
}

/**
 * POST /auth/google
 * Verifies the Supabase access token from Google OAuth,
 * creates/updates the user in the users table,
 * and returns user data + license_status so the frontend
 * knows where to redirect (dashboard vs /activate).
 */
const googleAuth = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ message: "Database integration not configured properly on the server." });
    }

    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "Access token is required." });
    }

    // Verify the Supabase token and get the user info
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !supabaseUser) {
      console.error("Supabase auth verification error:", authError);
      return res.status(401).json({ message: "Invalid or expired access token." });
    }

    const { email, id: supabaseUserId, user_metadata } = supabaseUser;

    if (!email) {
      return res.status(400).json({ message: "Google account must have an email address." });
    }

    // ── Fetch user (no join — use separate query for license) ──────
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    let user;

    if (fetchError && fetchError.code === "PGRST116") {
      // User does not exist — create a new one
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          email,
          supabase_user_id: supabaseUserId,
          display_name: user_metadata?.full_name || user_metadata?.name || email.split("@")[0],
          avatar_url: user_metadata?.avatar_url || null,
          pdf_limit: 100,
          pdf_used: 0,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user:", insertError);
        return res.status(500).json({ message: "Error creating user account." });
      }

      user = newUser;
    } else if (fetchError) {
      console.error("Error fetching user:", fetchError);
      return res.status(500).json({ message: "Error looking up user." });
    } else {
      user = existingUser;

      const { error: updateError } = await supabase
        .from("users")
        .update({
          supabase_user_id: supabaseUserId,
          display_name: user_metadata?.full_name || user_metadata?.name || user.display_name,
          avatar_url: user_metadata?.avatar_url || user.avatar_url,
          last_login: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating user:", updateError);
      }
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Account is inactive." });
    }

    // ── Fetch license separately ───────────────────────────────────
    let licenseKey = null;
    if (user.license_key_id) {
      const { data: lk } = await supabase
        .from("license_keys")
        .select("*")
        .eq("id", user.license_key_id)
        .single();
      licenseKey = lk;
    }

    const { license_status } = await computeLicenseStatus(licenseKey);
    // ─────────────────────────────────────────────────────────────

    res.json({
      token: accessToken,
      license_status,
      user: {
        id: user.id,
        email: user.email,
        pdf_limit: user.pdf_limit,
        pdf_used: user.pdf_used,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        license_expires_at: licenseKey?.expires_at || null,
      },
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { googleAuth };