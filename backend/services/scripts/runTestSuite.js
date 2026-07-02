const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const testFiles = fs
  .readdirSync(path.join(process.cwd(), "tests"))
  .filter((file) => file.endsWith(".test.js"))
  .map((file) => path.join("tests", file));

const checks = [
  { label: "unit tests", command: "node", args: ["--test", ...testFiles] },
  { label: "syntax check", command: "node", args: ["services/scripts/checkSyntax.js"] },
  { label: "production readiness", command: "node", args: ["services/scripts/checkProductionReadiness.js"] },
  { label: "email delivery", command: "node", args: ["services/scripts/checkEmailDelivery.js"] },
  { label: "database connection", command: "node", args: ["services/scripts/testDbConnection.js"] },
  { label: "ocr runtime", command: "node", args: ["services/scripts/checkOcrRuntime.js"] },
  { label: "stt runtime", command: "node", args: ["services/scripts/checkSttRuntime.js"] },
];

let failed = false;

for (const check of checks) {
  console.log(`\n== ${check.label} ==`);
  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
}
