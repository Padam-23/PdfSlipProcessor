const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /admin/login
 * Validates admin credentials and returns a signed admin JWT.
 */
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminJwtSecret = process.env.ADMIN_JWT_SECRET;

    if (!adminUsername || !adminPassword || !adminJwtSecret) {
      return res.status(500).json({ message: "Admin credentials not configured on server." });
    }

    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ message: "Invalid admin credentials." });
    }

    const token = jwt.sign(
      { role: "admin", username: adminUsername },
      adminJwtSecret,
      { expiresIn: "8h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /admin/stats
 * Returns overview statistics for the admin dashboard.
 */
const getStats = async (req, res) => {
  try {
    const { data: licenses, error } = await supabase
      .from("license_keys")
      .select("status");

    if (error) {
      return res.status(500).json({ message: "Failed to fetch stats." });
    }

    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    const stats = {
      total_users: totalUsers || 0,
      total_licenses: licenses.length,
      active: licenses.filter((l) => l.status === "active").length,
      expired: licenses.filter((l) => l.status === "expired").length,
      unused: licenses.filter((l) => l.status === "unused").length,
      revoked: licenses.filter((l) => l.status === "revoked").length,
    };

    return res.json(stats);
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /admin/licenses
 * Returns all license keys with full details.
 */
const getLicenses = async (req, res) => {
  try {
    const { data: licenses, error } = await supabase
      .from("license_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ message: "Failed to fetch licenses." });
    }

    return res.json(licenses);
  } catch (err) {
    console.error("Admin get licenses error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * POST /admin/licenses/generate
 * Generates a new cryptographically secure license key in XXXX-XXXX-XXXX-XXXX format.
 */
const generateLicense = async (req, res) => {
  try {
    const segment = () => crypto.randomBytes(2).toString("hex").toUpperCase();
    const key = `${segment()}-${segment()}-${segment()}-${segment()}`;

    const { data: newKey, error } = await supabase
      .from("license_keys")
      .insert({
        key,
        status: "unused",
      })
      .select()
      .single();

    if (error) {
      console.error("Error generating license:", error);
      return res.status(500).json({ message: "Failed to generate license key." });
    }

    return res.json(newKey);
  } catch (err) {
    console.error("Generate license error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * POST /admin/licenses/revoke
 * Revokes an active license key by ID.
 */
const revokeLicense = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "License ID is required." });
    }

    const { data: license, error: fetchError } = await supabase
      .from("license_keys")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !license) {
      return res.status(404).json({ message: "License not found." });
    }

    if (license.status === "revoked") {
      return res.status(400).json({ message: "License is already revoked." });
    }

    const { error: updateError } = await supabase
      .from("license_keys")
      .update({ status: "revoked" })
      .eq("id", id);

    if (updateError) {
      return res.status(500).json({ message: "Failed to revoke license." });
    }

    return res.json({ message: "License revoked successfully." });
  } catch (err) {
    console.error("Revoke license error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * DELETE /admin/licenses/:id
 * Deletes an unused license key.
 */
const deleteLicense = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: license, error: fetchError } = await supabase
      .from("license_keys")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError || !license) {
      return res.status(404).json({ message: "License not found." });
    }

    if (license.status !== "unused") {
      return res.status(400).json({ message: "Only unused license keys can be deleted." });
    }

    const { error: deleteError } = await supabase
      .from("license_keys")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return res.status(500).json({ message: "Failed to delete license." });
    }

    return res.json({ message: "License deleted successfully." });
  } catch (err) {
    console.error("Delete license error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  adminLogin,
  getStats,
  getLicenses,
  generateLicense,
  revokeLicense,
  deleteLicense,
};
