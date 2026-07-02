const { spawnSync } = require("child_process");

const fileList = spawnSync(
  "rg",
  ["--files", "-g", "*.js", "server.js", "routes", "services", "middleware", "config"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
  },
);

if (fileList.status !== 0) {
  process.stderr.write(fileList.stderr || "Unable to list JavaScript files.\n");
  process.exit(1);
}

const files = fileList.stdout.split(/\r?\n/).filter(Boolean);
let failed = false;

for (const file of files) {
  const result = spawnSync("node", ["--check", file], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || `Syntax check failed: ${file}\n`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`OK syntax: ${files.length} JavaScript files`);
}
