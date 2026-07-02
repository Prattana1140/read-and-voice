require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env"), quiet: true });

const { checkSttRuntime } = require("../sttService");

(async () => {
  try {
    const result = await checkSttRuntime();
    const label = result.ok ? (result.skipped ? "SKIP" : "OK") : "MISSING";
    console.log(`${label} stt: ${result.message}`);
    console.log(
      JSON.stringify(
        {
          enabled: result.status.enabled,
          configured: result.status.configured,
          engine: result.status.engine,
          command: result.status.command,
          language: result.status.language,
        },
        null,
        2,
      ),
    );

    if (!result.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("MISSING stt:", error.message);
    if (error.stderr) console.error(error.stderr);
    process.exitCode = 1;
  }
})();
