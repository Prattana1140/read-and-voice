import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const srcDir = path.join(rootDir, "src");
const thaiPattern = /[ก-๙]/;
const ignoredFiles = new Set([
  path.normalize("src/utils/voiceCommands.ts"),
  path.normalize("src/utils/i18n.ts"),
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!/\.(vue|ts)$/i.test(entry.name)) return [];
    return [fullPath];
  });
}

const findings = [];

for (const filePath of walk(srcDir)) {
  const relative = path.normalize(path.relative(rootDir, filePath));
  if (ignoredFiles.has(relative)) continue;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!thaiPattern.test(trimmed)) return;
    if (trimmed.includes("// i18n-ok")) return;
    findings.push({
      file: relative,
      line: index + 1,
      text: trimmed.slice(0, 180),
    });
  });
}

if (!findings.length) {
  console.log("OK no hard-coded Thai text found outside i18n allowlist.");
  process.exit(0);
}

console.log(`Found ${findings.length} hard-coded Thai text entries outside i18n allowlist.`);
for (const item of findings.slice(0, 120)) {
  console.log(`${item.file}:${item.line} ${item.text}`);
}
if (findings.length > 120) {
  console.log(`...and ${findings.length - 120} more.`);
}

process.exitCode = 1;
