const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extensionForMime,
  getSttStatus,
  parseArgsTemplate,
  parseTranscript,
} = require("../services/sttService");

test("parses STT argument templates", () => {
  assert.deepEqual(
    parseArgsTemplate("--model base --language {lang} {input}", "audio.wav", "th"),
    ["--model", "base", "--language", "th", "audio.wav"],
  );
  assert.deepEqual(
    parseArgsTemplate('"{backend}/services/scripts/stt_faster_whisper.py" {input}', "audio.wav", "th"),
    [`${require("node:path").resolve(__dirname, "..").replace(/\\/g, "/")}/services/scripts/stt_faster_whisper.py`, "audio.wav"],
  );
});

test("parses transcript output formats", () => {
  assert.equal(parseTranscript("hello"), "hello");
  assert.equal(parseTranscript(JSON.stringify({ text: "สวัสดี" })), "สวัสดี");
  assert.equal(parseTranscript(JSON.stringify({ transcript: "read voice" })), "read voice");
});

test("maps common audio mime types to extensions", () => {
  assert.equal(extensionForMime("audio/webm"), ".webm");
  assert.equal(extensionForMime("audio/mpeg"), ".mp3");
  assert.equal(extensionForMime("audio/wav"), ".wav");
});

test("reports STT status without exposing full command path", () => {
  const previous = process.env.STT_COMMAND;
  process.env.STT_COMMAND = "C:/tools/whisper.exe";

  try {
    const status = getSttStatus();
    assert.equal(status.configured, true);
    assert.equal(status.command, "whisper.exe");
  } finally {
    if (previous === undefined) delete process.env.STT_COMMAND;
    else process.env.STT_COMMAND = previous;
  }
});
