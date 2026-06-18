# Free server-side STT setup

The voice command UI can use three input paths:

1. Browser speech recognition when the browser supports it.
2. Server-side STT recording through `/api/speech/transcribe`.
3. Typed commands as the universal fallback.

Server-side STT is intentionally command-based so the project can use a free local engine instead of a paid API.

## Environment variables

Set these in `backend/.env`:

```env
STT_COMMAND=
STT_ARGS=
STT_LANGUAGE=th
STT_TIMEOUT_MS=30000
STT_MAX_UPLOAD_BYTES=8388608
```

`STT_COMMAND` is the executable to run.

`STT_ARGS` is split by spaces and supports:

- `{input}`: temporary uploaded audio file path
- `{language}` or `{lang}`: language code, default `th`

The command should print either plain transcript text or JSON with `text`/`transcript`.

## Example: wrapper script

You can point `STT_COMMAND` at any local script:

```env
STT_COMMAND=C:\tools\read-voice-stt\transcribe.cmd
STT_ARGS={input} {language}
```

The script must print the recognized text to stdout:

```bat
@echo off
rem Replace this line with whisper.cpp, faster-whisper, or vosk.
python C:\tools\read-voice-stt\transcribe.py %1 %2
```

## Example: whisper.cpp

After installing whisper.cpp and downloading a local model:

```env
STT_COMMAND=C:\tools\whisper.cpp\build\bin\Release\whisper-cli.exe
STT_ARGS=-m C:\models\ggml-small.bin -l {language} -nt -f {input}
```

If your whisper.cpp output includes extra log text, use a wrapper script that extracts only the transcript.

## Important limits

- Microphone access still requires HTTPS or localhost in modern browsers.
- iOS/Safari support for recording varies by version.
- No paid API is used by this integration.
- Accuracy depends on the local model you install.
