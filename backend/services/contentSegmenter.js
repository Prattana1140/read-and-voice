const crypto = require("crypto");
const {
  normalizeDisplayText,
  normalizeTtsText,
  splitIntoParagraphs,
} = require("./contentNormalizer");

const SENTENCE_SPLIT_PATTERN = /(?<=[.!?…。]|[ก-๙][ๆฯ]?[\r\n]|[\u0E2F])\s+|(?<=\n)/u;

function slugify(value, fallback = "item") {
  const base = String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-ก-๙]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return base || fallback;
}

function detectBlockType(text, preferredType = "paragraph") {
  const value = String(text || "").trim();
  if (!value) return preferredType;
  if (/^[-*•]\s+/.test(value)) return "list_item";
  if (/^["“].+["”]$/.test(value)) return "quote";
  if (/^[A-Zก-๙0-9\s]{1,80}$/.test(value) && value.length <= 80) return "heading";
  if (/^[-–—]\s*/.test(value) || /["“]/.test(value)) return preferredType === "dialogue" ? "dialogue" : preferredType;
  return preferredType;
}

function splitIntoSentences(text) {
  const normalized = normalizeTtsText(text);
  if (!normalized) return [];

  const rawSegments = normalized
    .split(SENTENCE_SPLIT_PATTERN)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (rawSegments.length > 0) {
    return rawSegments;
  }

  return [normalized];
}

function buildBlocksFromRawText(rawText, preferredType = "paragraph") {
  return splitIntoParagraphs(rawText).map((paragraph, index) => ({
    block_order: index + 1,
    block_type: detectBlockType(paragraph, preferredType),
    display_text: paragraph,
  }));
}

function prepareStructuredContent({ bookId, unitId, blocks = [] }) {
  const preparedBlocks = [];
  const preparedSentences = [];
  let sentenceOrder = 0;

  blocks.forEach((block, index) => {
    const displayText = normalizeDisplayText(block.display_text || block.text || "");
    if (!displayText) return;

    const blockType = detectBlockType(displayText, block.block_type || block.type || "paragraph");
    const sentences = splitIntoSentences(block.tts_text || displayText);
    const normalizedTts = normalizeTtsText(block.tts_text || displayText);

    preparedBlocks.push({
      book_unit_id: unitId,
      block_order: index + 1,
      block_type: blockType,
      display_text: displayText,
      tts_text: normalizedTts,
      speaker_name: block.speaker_name || null,
      char_count: displayText.length,
      sentence_count: sentences.length,
      metadata_json: block.metadata_json || null,
    });

    let runningOffset = 0;
    sentences.forEach((sentence, sentenceIndex) => {
      const displaySentence = normalizeDisplayText(sentence);
      const ttsSentence = normalizeTtsText(sentence);
      const startOffset = normalizedTts.indexOf(ttsSentence, runningOffset);
      const safeStartOffset = startOffset >= 0 ? startOffset : null;
      const safeEndOffset =
        safeStartOffset === null ? null : safeStartOffset + ttsSentence.length;
      runningOffset = safeEndOffset || runningOffset;
      sentenceOrder += 1;

      preparedSentences.push({
        sentence_uuid: crypto.randomUUID(),
        book_id: bookId,
        book_unit_id: unitId,
        block_order: index + 1,
        sentence_order: sentenceOrder,
        sentence_in_block: sentenceIndex + 1,
        display_text: displaySentence,
        tts_text: ttsSentence,
        plain_text: displaySentence,
        start_offset: safeStartOffset,
        end_offset: safeEndOffset,
        duration_ms_estimate: Math.max(1500, Math.round(ttsSentence.length * 85)),
      });
    });
  });

  return {
    blocks: preparedBlocks,
    sentences: preparedSentences,
    stats: {
      total_blocks: preparedBlocks.length,
      total_sentences: preparedSentences.length,
      total_characters: preparedBlocks.reduce(
        (sum, block) => sum + Number(block.char_count || 0),
        0,
      ),
      total_words: preparedSentences.reduce((sum, sentence) => {
        return sum + String(sentence.plain_text || "").split(/\s+/).filter(Boolean).length;
      }, 0),
    },
  };
}

module.exports = {
  buildBlocksFromRawText,
  prepareStructuredContent,
  slugify,
  splitIntoSentences,
};
