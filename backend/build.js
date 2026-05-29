const { execSync } = require("child_process");
const os = require("os");
const path = require("path");

try {
  console.log("Installing Node.js dependencies...");
  execSync("npm install", { stdio: "inherit" });

  console.log("Installing Python dependencies locally inside repository...");
  const pythonPackagesPath = path.join(__dirname, "python_packages");

  // Attempt to install Python dependencies inside our repository folder
  let success = false;

  const methods = [
    `pip3 install --target="${pythonPackagesPath}" -r requirements.txt`,
    `python3 -m pip install --target="${pythonPackagesPath}" -r requirements.txt`,
    `pip install --target="${pythonPackagesPath}" -r requirements.txt`,
    `python -m pip install --target="${pythonPackagesPath}" -r requirements.txt`
  ];

  for (const cmd of methods) {
    try {
      console.log(`Running: ${cmd}`);
      execSync(cmd, { stdio: "inherit" });
      success = true;
      break;
    } catch (err) {
      console.log(`Command failed or not available: ${cmd.split(" ")[0]}`);
    }
  }

  if (!success) {
    throw new Error("All pip installation methods failed. Please ensure Python and pip are installed.");
  }

  console.log("Build completed successfully!");
} catch (error) {
  console.error("Build failed:", error.message);
  process.exit(1);
}
