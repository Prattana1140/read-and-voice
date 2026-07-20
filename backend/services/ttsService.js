const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const backendDir = path.resolve(__dirname, "..");
const defaultPython =
  process.env.SERVER_TTS_COMMAND ||
  process.env.OCR_PYTHON_COMMAND ||
  process.env.STT_COMMAND ||
  (process.platform === "win32" ? "python" : "python3");
const scriptPath = path.join(__dirname, "scripts", "edge_tts_synthesize.py");

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function isServerTtsEnabled() {
  return /^(1|true|yes|on)$/i.test(readEnv("ENABLE_SERVER_TTS"));
}

function clampText(text) {
  const limit = Math.max(100, Math.min(5000, Number(readEnv("SERVER_TTS_MAX_CHARS") || 1200)));
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function percentFromNumber(value, fallback = "+0%") {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const percent = Math.round((number - 1) * 100);
  return `${percent >= 0 ? "+" : ""}${Math.max(-50, Math.min(100, percent))}%`;
}

function pitchFromNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "+0Hz";
  const hz = Math.round((number - 1) * 50);
  return `${hz >= 0 ? "+" : ""}${Math.max(-50, Math.min(50, hz))}Hz`;
}

function execFileAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf8", windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        return reject(error);
      }
      resolve({ stdout: String(stdout || ""), stderr: String(stderr || "") });
    });
  });
}

function getServerTtsStatus() {
  return {
    enabled: isServerTtsEnabled(),
    configured: Boolean(defaultPython && fs.existsSync(scriptPath)),
    engine: "edge-tts",
    voice: readEnv("SERVER_TTS_VOICE") || "th-TH-PremwadeeNeural",
    max_chars: Number(readEnv("SERVER_TTS_MAX_CHARS") || 1200),
  };
}

async function checkServerTtsRuntime() {
  const status = getServerTtsStatus();
  if (!status.enabled) {
    return { ok: true, skipped: true, status, message: "Server TTS is disabled." };
  }
  if (!status.configured) {
    return { ok: false, skipped: false, status, message: "Server TTS command or script is missing." };
  }

  await execFileAsync(defaultPython, [scriptPath, "--healthcheck"], {
    cwd: backendDir,
    timeout: Number(readEnv("SERVER_TTS_TIMEOUT_MS") || 120000),
  });
  return { ok: true, skipped: false, status, message: "Server TTS healthcheck passed." };
}

async function listServerTtsVoices() {
  const { stdout } = await execFileAsync(defaultPython, [scriptPath, "--list-voices"], {
    cwd: backendDir,
    timeout: Number(readEnv("SERVER_TTS_TIMEOUT_MS") || 120000),
    maxBuffer: 10 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout || "{}");
  return Array.isArray(parsed.voices) ? parsed.voices : [];
}

async function synthesizeSpeech({ text, voice, rate, pitch, volume }) {
  if (!isServerTtsEnabled()) {
    const error = new Error("Server TTS is disabled.");
    error.code = "SERVER_TTS_DISABLED";
    throw error;
  }

  const cleanText = clampText(text);
  if (!cleanText) {
    const error = new Error("Text is required.");
    error.code = "SERVER_TTS_TEXT_REQUIRED";
    throw error;
  }

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "read-voice-tts-"));
  const outputPath = path.join(
    tempDir,
    `${crypto.createHash("sha1").update(cleanText).digest("hex").slice(0, 16)}.mp3`,
  );

  try {
    await execFileAsync(
      defaultPython,
      [
        scriptPath,
        "--text",
        cleanText,
        "--output",
        outputPath,
        "--voice",
        String(voice || readEnv("SERVER_TTS_VOICE") || "th-TH-PremwadeeNeural"),
        "--rate",
        percentFromNumber(rate),
        "--pitch",
        pitchFromNumber(pitch),
        "--volume",
        percentFromNumber(volume),
      ],
      {
        cwd: backendDir,
        timeout: Number(readEnv("SERVER_TTS_TIMEOUT_MS") || 120000),
        maxBuffer: 5 * 1024 * 1024,
      },
    );

    const audio = await fs.promises.readFile(outputPath);
    return {
      audio,
      contentType: "audio/mpeg",
      engine: "edge-tts",
    };
  } finally {
    fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

module.exports = {
  checkServerTtsRuntime,
  getServerTtsStatus,
  listServerTtsVoices,
  synthesizeSpeech,
};
