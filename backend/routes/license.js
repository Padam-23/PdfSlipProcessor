const express = require("express");
const router = express.Router();
const { activateLicense, getLicenseStatus } = require("../controllers/licenseController");
const { authenticateToken } = require("../middleware/auth");

// POST /license/activate — user enters key to activate
router.post("/activate", authenticateToken, activateLicense);

// GET /license/status — check current user's license status
router.get("/status", authenticateToken, getLicenseStatus);

module.exports = router;
