const express = require("express");
const router = express.Router();
const {
  adminLogin,
  getStats,
  getLicenses,
  generateLicense,
  revokeLicense,
  deleteLicense,
} = require("../controllers/adminController");
const { authenticateAdmin } = require("../middleware/adminAuth");

// POST /admin/login — get admin JWT (no auth required)
router.post("/login", adminLogin);

// All routes below require admin JWT
router.get("/stats", authenticateAdmin, getStats);
router.get("/licenses", authenticateAdmin, getLicenses);
router.post("/licenses/generate", authenticateAdmin, generateLicense);
router.post("/licenses/revoke", authenticateAdmin, revokeLicense);
router.delete("/licenses/:id", authenticateAdmin, deleteLicense);

module.exports = router;
