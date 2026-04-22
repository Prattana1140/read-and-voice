const { sanitizeBookText } = require("./fileParser");

function normalizeDisplayText(text) {
  return sanitizeBookText(String(text || ""))
    .replace(/\u00A0/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function normalizeTtsText(text) {
  return normalizeDisplayText(text)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/([,.;:!?])([^\s])/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitIntoParagraphs(text) {
  return normalizeDisplayText(text)
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

module.exports = {
  normalizeDisplayText,
  normalizeTtsText,
  splitIntoParagraphs,
};
