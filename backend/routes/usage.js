const express = require("express");
const router = express.Router();
const { getUsage } = require("../controllers/usageController");
const { authenticateToken } = require("../middleware/auth");

router.get("/", authenticateToken, getUsage);

module.exports = router;