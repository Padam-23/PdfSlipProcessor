const jwt = require("jsonwebtoken");

/**
 * Middleware to protect admin-only routes.
 * Expects: Authorization: Bearer <admin_jwt>
 */
const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Admin access token required." });
    }

    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "Admin auth not configured." });
    }

    const decoded = jwt.verify(token, secret);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: not an admin." });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    console.error("Admin auth error:", err.message);
    return res.status(403).json({ message: "Invalid or expired admin token." });
  }
};

module.exports = { authenticateAdmin };
