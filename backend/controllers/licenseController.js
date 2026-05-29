const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /license/activate
 * Validates and assigns a license key to the authenticated user.
 */
const activateLicense = async (req, res) => {
  try {
    const { key } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!key || typeof key !== "string") {
      return res.status(400).json({ message: "License key is required." });
    }

    const cleanKey = key.trim().toUpperCase();

    // Fetch the key from the database
    const { data: licenseKey, error: fetchError } = await supabase
      .from("license_keys")
      .select("*")
      .eq("key", cleanKey)
      .single();

    if (fetchError || !licenseKey) {
      return res.status(400).json({ message: "Invalid license key. Please check and try again." });
    }

    // Must be unused
    if (licenseKey.status !== "unused") {
      if (licenseKey.status === "active" && licenseKey.assigned_user_id === userId) {
        return res.status(400).json({ message: "This key is already active on your account." });
      }
      if (licenseKey.status === "revoked") {
        return res.status(400).json({ message: "This license key has been revoked." });
      }
      if (licenseKey.status === "expired") {
        return res.status(400).json({ message: "This license key has expired." });
      }
      return res.status(400).json({ message: "This license key has already been used." });
    }

    // Check if already assigned to another user
    if (licenseKey.assigned_user_id && licenseKey.assigned_user_id !== userId) {
      return res.status(400).json({ message: "This license key is already assigned to another account." });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day license

    // Activate the key
    const { error: updateKeyError } = await supabase
      .from("license_keys")
      .update({
        status: "active",
        activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        assigned_user_id: userId,
        assigned_email: userEmail,
      })
      .eq("id", licenseKey.id);

    if (updateKeyError) {
      console.error("Error activating license key:", updateKeyError);
      return res.status(500).json({ message: "Failed to activate license key." });
    }

    // Link license key to user
    const { error: updateUserError } = await supabase
      .from("users")
      .update({ license_key_id: licenseKey.id })
      .eq("id", userId);

    if (updateUserError) {
      console.error("Error linking license to user:", updateUserError);
      return res.status(500).json({ message: "Failed to link license to account." });
    }

    return res.json({
      message: "License activated successfully! Welcome aboard.",
      license_status: "active",
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("License activation error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /license/status
 * Returns the current user's license status and expiry.
 */
const getLicenseStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Step 1: get the user's license_key_id
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("license_key_id")
      .eq("id", userId)
      .single();

    if (userError) {
      return res.status(500).json({ message: "Failed to fetch user." });
    }

    if (!user?.license_key_id) {
      return res.json({ license_status: "none", expires_at: null, days_remaining: 0 });
    }

    // Step 2: fetch the license key record separately
    const { data: licenseKey, error: licError } = await supabase
      .from("license_keys")
      .select("id, status, expires_at, activated_at")
      .eq("id", user.license_key_id)
      .single();

    if (licError || !licenseKey) {
      return res.json({ license_status: "none", expires_at: null, days_remaining: 0 });
    }

    const now = new Date();
    const expiresAt = licenseKey.expires_at ? new Date(licenseKey.expires_at) : null;
    let license_status = licenseKey.status;

    // Auto-expire if past expiry date
    if (license_status === "active" && expiresAt && now > expiresAt) {
      license_status = "expired";
      await supabase
        .from("license_keys")
        .update({ status: "expired" })
        .eq("id", licenseKey.id);
    }

    const daysRemaining = expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return res.json({
      license_status,
      expires_at: licenseKey.expires_at,
      activated_at: licenseKey.activated_at,
      days_remaining: daysRemaining,
    });
  } catch (err) {
    console.error("License status error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};


module.exports = { activateLicense, getLicenseStatus };
