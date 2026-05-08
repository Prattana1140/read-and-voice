const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const readline = require("node:readline");

const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function isPortFree(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findPort(start, host = "127.0.0.1") {
  for (let port = start; port < start + 20; port += 1) {
    if (await isPortFree(port, host)) {
      return port;
    }
  }

  throw new Error(`No free port found from ${start} to ${start + 19}`);
}

function prefixLines(stream, label) {
  const reader = readline.createInterface({ input: stream });

  reader.on("line", (line) => {
    console.log(`[${label}] ${line}`);
  });
}

function cmdQuote(value) {
  const text = String(value);
  if (!/[\s"]/u.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function startProcess(label, command, args, options) {
  const spawnCommand = process.platform === "win32" ? "cmd.exe" : command;
  const spawnArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", [command, ...args].map(cmdQuote).join(" ")]
      : args;
  const child = spawn(spawnCommand, spawnArgs, {
    ...options,
    stdio: ["inherit", "pipe", "pipe"],
  });

  prefixLines(child.stdout, label);
  prefixLines(child.stderr, label);

  return child;
}

function stopProcess(child) {
  if (!child || child.killed) return;

  if (process.platform === "win32") {
    spawn("cmd.exe", ["/d", "/s", "/c", `taskkill /pid ${child.pid} /T /F`], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

async function main() {
  const backendPort = await findPort(Number(process.env.PORT || 3000));
  const frontendPort = await findPort(Number(process.env.VITE_PORT || 5173));
  const apiUrl = `http://127.0.0.1:${backendPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;

  console.log("Starting Read and Voice locally");
  console.log(`API: ${apiUrl}`);
  console.log(`Web: ${frontendUrl}`);
  console.log("Database: local MySQL from backend/.env, SSL disabled for local dev");

  const backend = startProcess("api", npmCmd, ["run", "dev"], {
    cwd: backendDir,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(backendPort),
      FRONTEND_URL: frontendUrl,
      API_PUBLIC_URL: apiUrl,
      DB_MODE: "local",
      DB_SSL: "false",
      DB_SSL_MODE: "disable",
    },
  });

  const frontend = startProcess(
    "web",
    npmCmd,
    [
      "run",
      "dev:frontend",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(frontendPort),
      "--strictPort",
    ],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        VITE_API_URL: apiUrl,
        VITE_API_BASE_URL: apiUrl,
      },
    },
  );

  const children = [backend, frontend];
  let shuttingDown = false;

  function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    children.forEach(stopProcess);
    process.exitCode = code;
  }

  for (const child of children) {
    child.on("exit", (code) => {
      if (shuttingDown) return;
      shutdown(code || 0);
    });
  }

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
