const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const backendDir = path.resolve(__dirname, "..");

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function isSttEnabled() {
  return /^(1|true|yes|on)$/i.test(readEnv("ENABLE_STT"));
}

function getSttCommand() {
  return readEnv("STT_COMMAND");
}

function getSttStatus() {
  const command = getSttCommand();
  return {
    enabled: isSttEnabled(),
    configured: Boolean(command),
    engine: command ? "local-command" : "not-configured",
    command: command ? path.basename(command) : "",
    language: readEnv("STT_LANGUAGE") || "th",
    max_upload_bytes: Number(readEnv("STT_MAX_UPLOAD_BYTES") || 8 * 1024 * 1024),
    timeout_ms: Number(readEnv("STT_TIMEOUT_MS") || 30000),
  };
}

function extensionForMime(mimeType = "") {
  if (/webm/i.test(mimeType)) return ".webm";
  if (/ogg/i.test(mimeType)) return ".ogg";
  if (/mpeg|mp3/i.test(mimeType)) return ".mp3";
  if (/wav/i.test(mimeType)) return ".wav";
  if (/mp4|m4a/i.test(mimeType)) return ".m4a";
  return ".audio";
}

function parseArgsTemplate(template, inputPath, language) {
  if (!template) return [inputPath];

  const args = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;

  while ((match = pattern.exec(String(template))) !== null) {
    args.push(match[1] ?? match[2] ?? match[3]);
  }

  return args.map((arg) =>
    arg
      .replaceAll("{backend}", backendDir.replace(/\\/g, "/"))
      .replaceAll("{input}", inputPath)
      .replaceAll("{language}", language)
      .replaceAll("{lang}", language),
  );
}

function execFileText(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        encoding: "utf8",
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stderr = stderr;
          reject(error);
          return;
        }

        resolve(String(stdout || "").trim());
      },
    );
  });
}

function parseTranscript(stdout) {
  const text = String(stdout || "").trim();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "string") return parsed.trim();
    if (typeof parsed.text === "string") return parsed.text.trim();
    if (typeof parsed.transcript === "string") return parsed.transcript.trim();
  } catch {
    // Plain text output is the most portable contract for local STT commands.
  }

  return text;
}

async function transcribeAudioBuffer({ buffer, mimeType, language }) {
  const command = getSttCommand();
  if (!command) {
    const error = new Error("STT_COMMAND is not configured.");
    error.code = "STT_NOT_CONFIGURED";
    throw error;
  }

  if (!buffer?.length) {
    const error = new Error("Audio file is required.");
    error.code = "STT_AUDIO_REQUIRED";
    throw error;
  }

  const activeLanguage = String(language || readEnv("STT_LANGUAGE") || "th").trim() || "th";
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "read-voice-stt-"));
  const inputPath = path.join(tempDir, `command${extensionForMime(mimeType)}`);

  try {
    await fs.promises.writeFile(inputPath, buffer);
    const args = parseArgsTemplate(readEnv("STT_ARGS"), inputPath, activeLanguage);
    const stdout = await execFileText(
      command,
      args,
      Number(readEnv("STT_TIMEOUT_MS") || 30000),
    );
    const transcript = parseTranscript(stdout);

    if (!transcript) {
      const error = new Error("STT command returned an empty transcript.");
      error.code = "STT_EMPTY_TRANSCRIPT";
      throw error;
    }

    return {
      transcript,
      language: activeLanguage,
      engine: "local-command",
    };
  } finally {
    fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function checkSttRuntime() {
  const status = getSttStatus();
  if (!status.configured) {
    return {
      ok: !status.enabled,
      skipped: !status.enabled,
      status,
      message: status.enabled
        ? "STT is enabled but STT_COMMAND is missing."
        : "STT is disabled; set ENABLE_STT=true and STT_COMMAND to enable it.",
    };
  }

  const healthcheckArgs = readEnv("STT_HEALTHCHECK_ARGS");
  if (!healthcheckArgs) {
    return {
      ok: true,
      skipped: true,
      status,
      message: "STT command is configured; set STT_HEALTHCHECK_ARGS for an executable runtime check.",
    };
  }

  const args = parseArgsTemplate(healthcheckArgs, "__healthcheck__", status.language);
  await execFileText(getSttCommand(), args, status.timeout_ms);
  return {
    ok: true,
    skipped: false,
    status,
    message: "STT command healthcheck passed.",
  };
}

module.exports = {
  checkSttRuntime,
  execFileText,
  extensionForMime,
  getSttCommand,
  getSttStatus,
  isSttEnabled,
  parseArgsTemplate,
  parseTranscript,
  transcribeAudioBuffer,
};
