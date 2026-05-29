const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in usageController.");
}

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const getUsage = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ message: "Database integration not configured properly on the server." });
    }
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, pdf_limit, pdf_used, plan_expiry, is_active")
      .eq("id", req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getUsage };