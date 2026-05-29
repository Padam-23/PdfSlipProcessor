const express = require("express");
const router = express.Router();
const { upload } = require("../controllers/uploadController");
const { authenticateToken } = require("../middleware/auth");

router.post("/slips", authenticateToken, upload.single("slips"), (req, res) => {
  res.json({ message: "Slips PDF uploaded successfully" });
});

router.post("/reports", authenticateToken, upload.single("reports"), (req, res) => {
  res.json({ message: "Reports PDF uploaded successfully" });
});

module.exports = router;