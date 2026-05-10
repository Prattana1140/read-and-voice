const { spawn } = require("child_process");

const env = {
  ...process.env,
  VITE_API_BASE_URL: "https://read-and-voice-api.onrender.com",
};

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(command, ["run", "dev:frontend", "--", "--host", "127.0.0.1"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
