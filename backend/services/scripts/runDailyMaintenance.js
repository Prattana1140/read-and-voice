require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env"), quiet: true });

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const backendRoot = path.join(__dirname, "..", "..");
const reportDir =
  process.env.OPERATION_REPORT_DIR || path.join(backendRoot, "backups", "reports");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function runStep(name, script) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [path.join("services", "scripts", script)], {
    cwd: backendRoot,
    env: process.env,
    encoding: "utf8",
    windowsHide: true,
  });

  return {
    name,
    ok: result.status === 0,
    exit_code: result.status,
    duration_ms: Date.now() - startedAt,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

function trimOutput(value, maxLength = 12000) {
  const text = String(value || "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}\n...trimmed...`;
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });

  const steps = [
    runStep("monitor", "monitorCheck.js"),
    runStep("content_audit", "auditContentQuality.js"),
    runStep("database_backup", "backupDatabase.js"),
  ].map((step) => ({
    ...step,
    stdout: trimOutput(step.stdout),
    stderr: trimOutput(step.stderr),
  }));

  const report = {
    ok: steps.every((step) => step.ok),
    checked_at: new Date().toISOString(),
    steps,
  };

  const reportPath = path.join(reportDir, `daily-maintenance-${timestamp()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify({
    ok: report.ok,
    report: reportPath,
    steps: steps.map((step) => ({
      name: step.name,
      ok: step.ok,
      duration_ms: step.duration_ms,
    })),
  }, null, 2));

  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error("daily maintenance failed:", error.message);
  process.exit(1);
});
