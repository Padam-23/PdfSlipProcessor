const express = require("express");
const router = express.Router();
const { processFiles } = require("../controllers/processController");
const { authenticateToken, requireActiveLicense } = require("../middleware/auth");

router.post("/", authenticateToken, requireActiveLicense, processFiles);

module.exports = router;