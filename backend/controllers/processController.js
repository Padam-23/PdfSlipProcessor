const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs-extra");
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined.");
}

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const processFiles = async (req, res) => {
  const sessionId = req.headers["x-session-id"] || uuidv4();
  const userId = req.user.id;

  try {
    if (!supabase) {
      return res.status(500).json({ message: "Supabase client is not initialized. Please configure server environment variables." });
    }
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.pdf_used >= user.pdf_limit) {
      return res.status(403).json({ message: "Your processing limit has expired. Contact administrator." });
    }

    const sessionDir = path.join(__dirname, "../temp", sessionId);
    const uploadDir = path.join(__dirname, "../uploads", sessionId);
    
    fs.ensureDirSync(sessionDir);

    const slipPdf = path.join(uploadDir, "slips.pdf");
    const reportPdf = path.join(uploadDir, "reports.pdf");

    if (!fs.existsSync(slipPdf) || !fs.existsSync(reportPdf)) {
      return res.status(400).json({ message: "Both PDF files are required" });
    }

    const startTime = Date.now();

    // Spawning standard system python
    // Add timeout to prevent Python process from hanging (5 minutes max)
    const PYTHON_TIMEOUT_MS = 5 * 60 * 1000;
    let pythonTimedOut = false;

    const pythonExecutable = process.platform === "win32" ? "python" : "python3";
    console.log(`Spawning Python process using: ${pythonExecutable}`);

    const pythonProcess = spawn(pythonExecutable, [
      path.join(__dirname, "../python/process_pdfs.py"),
      slipPdf,
      reportPdf,
      sessionDir
    ]);

    const pythonTimeout = setTimeout(() => {
      pythonTimedOut = true;
      console.error("Python process timed out — killing it");
      pythonProcess.kill("SIGKILL");
      cleanupLocalFiles();
      if (!res.headersSent) {
        return res.status(504).json({ message: "PDF processing timed out. The file may be too large. Please try again with a smaller PDF." });
      }
    }, PYTHON_TIMEOUT_MS);

    // Handle spawn error (e.g. system python not found) to prevent Express crash
    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python process:", err);
      clearTimeout(pythonTimeout);
      cleanupLocalFiles();
      if (!res.headersSent) {
        return res.status(500).json({ message: `Failed to initiate PDF processing: ${err.message}` });
      }
    });

    let stderrOutput = "";
    pythonProcess.stderr.on("data", (data) => {
      stderrOutput += data.toString();
      console.error("Python stderr:", data.toString());
    });

    pythonProcess.stdout.on("data", (data) => {
      console.log("Python stdout:", data.toString());
    });

    const cleanupLocalFiles = () => {
      try {
        const sessionDir = path.join(__dirname, "../temp", sessionId);
        const uploadDir = path.join(__dirname, "../uploads", sessionId);
        const outputDir = path.join(__dirname, "../output", sessionId);
        if (fs.existsSync(sessionDir)) fs.removeSync(sessionDir);
        if (fs.existsSync(uploadDir)) fs.removeSync(uploadDir);
        if (fs.existsSync(outputDir)) fs.removeSync(outputDir);
      } catch (cleanupErr) {
        console.error("Local cleanup failed:", cleanupErr);
      }
    };

    pythonProcess.on("close", async (code) => {
      clearTimeout(pythonTimeout);

      // If we already sent a timeout response, don't proceed
      if (pythonTimedOut) return;

      if (code !== 0) {
        console.error("Python process exited with code:", code, "stderr:", stderrOutput);
        cleanupLocalFiles();
        return res.status(500).json({ message: `PDF processing failed: ${stderrOutput || 'Unknown error'}` });
      }

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;

      const outputFile = path.join(sessionDir, "output", "final_output.pdf");

      if (!fs.existsSync(outputFile)) {
        cleanupLocalFiles();
        return res.status(500).json({ message: "Final PDF not generated. Check Python processing logs." });
      }
      
      const fileBuffer = fs.readFileSync(outputFile);
      const fileName = `${sessionId}/final_output.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(fileName, fileBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase Upload Error:", uploadError);
        cleanupLocalFiles();
        return res.status(500).json({ message: "Failed to upload processed PDF" });
      }

      const { data: publicUrlData } = supabase.storage
        .from("pdfs")
        .getPublicUrl(fileName);

      const downloadUrl = publicUrlData.publicUrl;

      // Clean up all local files immediately to save memory and space
      cleanupLocalFiles();

      // Automatically delete the file from Supabase Storage after 5 minutes (300000 ms)
      setTimeout(async () => {
        try {
          await supabase.storage.from("pdfs").remove([fileName]);
          console.log(`Auto-deleted ${fileName} from Supabase after 5 minutes`);
        } catch (delErr) {
          console.error(`Failed to auto-delete ${fileName}:`, delErr);
        }
      }, 5 * 60 * 1000);

      await supabase
        .from("users")
        .update({ pdf_used: user.pdf_used + 2 })
        .eq("id", userId);

      await supabase
        .from("processing_logs")
        .insert({
          user_id: userId,
          pdf_count: 1,
          processing_time: processingTime,
        });

      res.json({
        message: "Processing complete",
        downloadUrl,
        sessionId
      });
    });
  } catch (err) {
    console.error(err);
    try {
      const sessionDir = path.join(__dirname, "../temp", sessionId);
      const uploadDir = path.join(__dirname, "../uploads", sessionId);
      if (fs.existsSync(sessionDir)) fs.removeSync(sessionDir);
      if (fs.existsSync(uploadDir)) fs.removeSync(uploadDir);
    } catch(e) {}
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { processFiles };
