<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../utils/api";

type ReaderResponse = {
  is_locked?: boolean;
  lock_reason?: string;
  title?: string;
  access_type?: string;
  content?: string;
};

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref("");
const title = ref("Reader");
const lockReason = ref("");
const content = ref("");

const voices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoice = ref("");
const rate = ref(1);
const pitch = ref(1);
const volume = ref(1);
const fontSize = ref(22);
const lineHeight = ref(1.9);
const darkMode = ref(false);

const sentences = ref<string[]>([]);
const currentIndex = ref(0);
const isSpeaking = ref(false);
const isPaused = ref(false);

const isEpisodeMode = computed(() => !!route.query.episode);
const readerKey = computed(() => {
  const bookId = String(route.params.id || "");
  const episodeId = String(route.query.episode || "");
  return episodeId ? `reader-episode-${episodeId}` : `reader-book-${bookId}`;
});

const selectedVoiceObject = computed(() => {
  return voices.value.find((voice) => voice.name === selectedVoice.value) || null;
});

const currentProgress = computed(() => {
  if (!sentences.value.length) return 0;
  return Math.min(100, Math.round(((currentIndex.value + 1) / sentences.value.length) * 100));
});

function splitSentences(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, " <PARA> ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…。！？])\s+|<PARA>/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => {
      if (item.length <= 220) return [item];
      return item.match(/.{1,180}([,;:]\s*|$)/g)?.map((chunk) => chunk.trim()).filter(Boolean) || [item];
    });
}

function loadVoices() {
  const list = window.speechSynthesis.getVoices();
  voices.value = list;

  if (selectedVoice.value && list.some((voice) => voice.name === selectedVoice.value)) return;

  const thaiVoice = list.find((voice) => voice.lang?.toLowerCase().includes("th"));
  selectedVoice.value = thaiVoice?.name || list[0]?.name || "";
}

function loadReaderSettings() {
  darkMode.value = localStorage.getItem("reader-dark-mode") === "true";
  fontSize.value = Number(localStorage.getItem("reader-font-size") || 22);
  lineHeight.value = Number(localStorage.getItem("reader-line-height") || 1.9);
  rate.value = Number(localStorage.getItem("reader-rate") || 1);
  pitch.value = Number(localStorage.getItem("reader-pitch") || 1);
  volume.value = Number(localStorage.getItem("reader-volume") || 1);
  selectedVoice.value = localStorage.getItem("reader-voice") || "";
}

function saveReaderSettings() {
  localStorage.setItem("reader-dark-mode", String(darkMode.value));
  localStorage.setItem("reader-font-size", String(fontSize.value));
  localStorage.setItem("reader-line-height", String(lineHeight.value));
  localStorage.setItem("reader-rate", String(rate.value));
  localStorage.setItem("reader-pitch", String(pitch.value));
  localStorage.setItem("reader-volume", String(volume.value));
  localStorage.setItem("reader-voice", selectedVoice.value);
}

function loadProgress() {
  const saved = localStorage.getItem(`${readerKey.value}-index`);
  const index = Number(saved || 0);
  if (!Number.isNaN(index) && index >= 0 && index < sentences.value.length) {
    currentIndex.value = index;
  }
}

function saveProgress() {
  localStorage.setItem(`${readerKey.value}-index`, String(currentIndex.value));
}

async function scrollToCurrent() {
  await nextTick();
  document.querySelector(".sentence.active")?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

async function fetchContent() {
  loading.value = true;
  error.value = "";
  lockReason.value = "";
  content.value = "";
  sentences.value = [];

  try {
    const endpoint = isEpisodeMode.value
      ? `/reader/episodes/${route.query.episode}/content`
      : `/reader/books/${route.params.id}/content`;

    const { data } = await api.get<ReaderResponse>(endpoint);

    title.value = data.title || (isEpisodeMode.value ? "ตอนนิยาย" : "หนังสือ");

    if (data.is_locked) {
      lockReason.value = data.lock_reason || "ต้องซื้อหรือสมัครแพ็กเกจก่อนอ่าน";
      return;
    }

    content.value = data.content || "";
    sentences.value = splitSentences(content.value);
    loadProgress();
    await scrollToCurrent();
  } catch (err: any) {
    error.value = err?.response?.data?.message || "โหลดเนื้อหาไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

function stopSpeech() {
  window.speechSynthesis.cancel();
  isSpeaking.value = false;
  isPaused.value = false;
}

function speakFrom(index: number) {
  if (!sentences.value.length || index < 0 || index >= sentences.value.length) return;

  stopSpeech();
  currentIndex.value = index;
  saveProgress();

  const utterance = new SpeechSynthesisUtterance(sentences.value[index]);
  utterance.lang = selectedVoiceObject.value?.lang || "th-TH";
  utterance.voice = selectedVoiceObject.value;
  utterance.rate = rate.value;
  utterance.pitch = pitch.value;
  utterance.volume = volume.value;

  utterance.onstart = () => {
    isSpeaking.value = true;
    isPaused.value = false;
    scrollToCurrent();
  };

  utterance.onend = () => {
    saveProgress();
    const nextIndex = currentIndex.value + 1;
    if (nextIndex < sentences.value.length) {
      speakFrom(nextIndex);
    } else {
      isSpeaking.value = false;
      isPaused.value = false;
    }
  };

  utterance.onerror = () => {
    isSpeaking.value = false;
    isPaused.value = false;
  };

  window.speechSynthesis.speak(utterance);
}

function play() {
  speakFrom(currentIndex.value);
}

function pause() {
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    isPaused.value = true;
    isSpeaking.value = false;
    saveProgress();
  }
}

function resume() {
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    isPaused.value = false;
    isSpeaking.value = true;
    scrollToCurrent();
  } else {
    play();
  }
}

function nextSentence() {
  if (currentIndex.value < sentences.value.length - 1) speakFrom(currentIndex.value + 1);
}

function previousSentence() {
  if (currentIndex.value > 0) speakFrom(currentIndex.value - 1);
}

function restart() {
  currentIndex.value = 0;
  saveProgress();
  play();
}

watch([selectedVoice, rate, pitch, volume, fontSize, lineHeight, darkMode], saveReaderSettings);
watch(() => route.fullPath, fetchContent);

onMounted(async () => {
  loadReaderSettings();
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  await fetchContent();
});

onBeforeUnmount(() => {
  saveProgress();
  saveReaderSettings();
  stopSpeech();
  window.speechSynthesis.onvoiceschanged = null;
});
</script>

<template>
  <main class="reader-page" :class="{ dark: darkMode }">
    <header class="reader-header">
      <button class="ghost-btn" type="button" @click="router.back()">กลับ</button>
      <div>
        <p>{{ isEpisodeMode ? "รายตอน" : "อีบุ๊ก" }}</p>
        <h1>{{ title }}</h1>
      </div>
      <button class="ghost-btn" type="button" @click="darkMode = !darkMode">
        {{ darkMode ? "โหมดสว่าง" : "โหมดกลางคืน" }}
      </button>
    </header>

    <section v-if="loading" class="state-card">กำลังโหลดเนื้อหา...</section>
    <section v-else-if="error" class="state-card error">{{ error }}</section>

    <section v-else-if="lockReason" class="locked-card">
      <h2>ยังอ่านไม่ได้</h2>
      <p>{{ lockReason }}</p>
      <div class="locked-actions">
        <button type="button" @click="router.push(`/book/${route.params.id}`)">ไปหน้าหนังสือ</button>
        <button type="button" @click="router.push('/subscription-plans')">สมัครแพ็กเกจ</button>
      </div>
    </section>

    <section v-else class="reader-shell">
      <aside class="controls">
        <div class="progress">
          <strong>{{ currentProgress }}%</strong>
          <span>{{ currentIndex + 1 }} / {{ sentences.length }} ประโยค</span>
          <div><i :style="{ width: currentProgress + '%' }"></i></div>
        </div>

        <label>
          Voice
          <select v-model="selectedVoice">
            <option v-for="voice in voices" :key="voice.name" :value="voice.name">
              {{ voice.name }} ({{ voice.lang }})
            </option>
          </select>
        </label>

        <label>Speed {{ rate }}<input v-model="rate" type="range" min="0.5" max="2" step="0.1" /></label>
        <label>Pitch {{ pitch }}<input v-model="pitch" type="range" min="0.5" max="2" step="0.1" /></label>
        <label>Volume {{ volume }}<input v-model="volume" type="range" min="0" max="1" step="0.1" /></label>
        <label>Font {{ fontSize }}px<input v-model="fontSize" type="range" min="16" max="40" step="1" /></label>
        <label>Line {{ lineHeight }}<input v-model="lineHeight" type="range" min="1.4" max="2.6" step="0.1" /></label>

        <div class="button-grid">
          <button class="primary" type="button" @click="play">อ่าน</button>
          <button type="button" @click="pause">พัก</button>
          <button type="button" @click="resume">ต่อ</button>
          <button type="button" @click="stopSpeech">หยุด</button>
          <button type="button" @click="previousSentence">ก่อนหน้า</button>
          <button type="button" @click="nextSentence">ถัดไป</button>
          <button type="button" @click="restart">เริ่มใหม่</button>
        </div>
      </aside>

      <article class="reader-content" :style="{ fontSize: fontSize + 'px', lineHeight }">
        <span
          v-for="(sentence, index) in sentences"
          :key="index"
          class="sentence"
          :class="{ active: index === currentIndex }"
          @click="speakFrom(index)"
        >
          {{ sentence }}
        </span>
      </article>
    </section>
  </main>
</template>

<style scoped>
.reader-page {
  min-height: 100vh;
  background: #f6f7fb;
  color: #1f2937;
  padding: 20px;
}

.reader-page.dark {
  background: #111827;
  color: #f9fafb;
}

.reader-header {
  align-items: center;
  display: grid;
  gap: 14px;
  grid-template-columns: auto 1fr auto;
  margin: 0 auto 18px;
  max-width: 1280px;
}

.reader-header p,
.reader-header h1 {
  margin: 0;
}

.reader-header p {
  color: #0f766e;
  font-weight: 800;
}

.reader-header h1 {
  font-size: 26px;
}

.ghost-btn,
button {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #111827;
  cursor: pointer;
  font-weight: 800;
  padding: 10px 12px;
}

.dark .ghost-btn,
.dark button,
.dark .controls,
.dark .reader-content,
.dark .state-card,
.dark .locked-card {
  background: #1f2937;
  border-color: #374151;
  color: #f9fafb;
}

.state-card,
.locked-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin: 0 auto;
  max-width: 880px;
  padding: 24px;
}

.error {
  color: #dc2626;
}

.locked-card h2 {
  margin-top: 0;
}

.locked-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.reader-shell {
  display: grid;
  gap: 18px;
  grid-template-columns: 300px minmax(0, 1fr);
  margin: 0 auto;
  max-width: 1280px;
}

.controls,
.reader-content {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.controls {
  align-self: start;
  display: grid;
  gap: 14px;
  padding: 16px;
  position: sticky;
  top: 16px;
}

.controls label {
  display: grid;
  gap: 8px;
  font-weight: 800;
}

.controls select,
.controls input[type="range"] {
  width: 100%;
}

.progress strong,
.progress span {
  display: block;
}

.progress span {
  color: #6b7280;
  font-size: 13px;
  margin-top: 4px;
}

.progress div {
  background: #e5e7eb;
  border-radius: 999px;
  height: 8px;
  margin-top: 10px;
  overflow: hidden;
}

.progress i {
  background: #14b8a6;
  display: block;
  height: 100%;
}

.button-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, 1fr);
}

.button-grid .primary {
  background: #14b8a6;
  border-color: #14b8a6;
  color: white;
}

.reader-content {
  min-height: calc(100vh - 110px);
  padding: 34px;
}

.sentence {
  border-radius: 8px;
  cursor: pointer;
  margin-right: 4px;
  padding: 2px 4px;
}

.sentence:hover {
  background: #ecfeff;
}

.sentence.active {
  background: #fef08a;
  color: #111827;
}

@media (max-width: 900px) {
  .reader-header,
  .reader-shell {
    grid-template-columns: 1fr;
  }

  .controls {
    position: static;
  }
}
</style>
