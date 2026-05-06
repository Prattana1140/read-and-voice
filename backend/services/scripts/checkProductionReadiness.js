require("dotenv").config({ quiet: true });

const { getProductionReadiness } = require("../readiness");

const result = getProductionReadiness();

for (const check of result.checks) {
  console.log(`${check.ok ? "OK" : "MISSING"} ${check.name}: ${check.message}`);
}

if (!result.ready) {
  process.exitCode = 1;
}
