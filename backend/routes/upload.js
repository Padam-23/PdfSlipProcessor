const express = require("express");
const router = express.Router();
const { upload } = require("../controllers/uploadController");
const { authenticateToken, requireActiveLicense } = require("../middleware/auth");

router.post("/slips", authenticateToken, requireActiveLicense, upload.single("slips"), (req, res) => {
  res.json({ message: "Slips PDF uploaded successfully" });
});

router.post("/reports", authenticateToken, requireActiveLicense, upload.single("reports"), (req, res) => {
  res.json({ message: "Reports PDF uploaded successfully" });
});

module.exports = router;