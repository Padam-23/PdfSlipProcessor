require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs-extra");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in server.js.");
}

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

app.use(cors({
  origin: [
    "https://pdfslipprocessor.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Session-Id"],
  credentials: true
}));

// Handle OPTIONS preflight requests explicitly
app.options("*", cors());

// Trust proxy for Render's forwarded headers
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/output", express.static(path.join(__dirname, "output")));

const authRoutes = require("./routes/auth");
const uploadRoutes = require("./routes/upload");
const processRoutes = require("./routes/process");
const usageRoutes = require("./routes/usage");
const licenseRoutes = require("./routes/license");
const adminRoutes = require("./routes/admin");

app.use("/auth", authRoutes);
app.use("/upload", uploadRoutes);
app.use("/process", processRoutes);
app.use("/usage", usageRoutes);
app.use("/license", licenseRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ message: "PDF Slip Processor API" });
});

// Health check endpoint for Render monitoring
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { supabase };