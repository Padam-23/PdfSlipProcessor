const express = require("express");
const router = express.Router();
const { processFiles } = require("../controllers/processController");
const { authenticateToken } = require("../middleware/auth");

router.post("/", authenticateToken, processFiles);

module.exports = router;