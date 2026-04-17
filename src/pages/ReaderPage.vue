<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { getAuthHeaders, getUser } from "../utils/auth";

type Book = {
  id: number;
  title: string;
  author: string;
  description?: string;
  cover?: string;
  cover_url?: string;
  content?: string;
  full_text?: string;
};

type ProgressResponse = {
  current_page?: number;
  last_position?: number;
  progress_percent?: number;
  font_size?: number | null;
  rate?: number | null;
  pitch?: number | null;
  volume?: number | null;
  voice_name?: string | null;
};

const route = useRoute();
const router = useRouter();

const book = ref<Book | null>(null);
const loading = ref(true);
const error = ref("");

const fontSize = ref(24);
const lineHeight = ref(2);
const rate = ref(1);
const pitch = ref(1);
const volume = ref(1);

const voices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoice = ref("");

const sentences = ref<string[]>([]);
const currentIndex = ref(0);

const isSpeaking = ref(false);
const isPaused = ref(false);
const darkMode = ref(false);

const pageSize = ref(25);
const currentPage = ref(1);

let saveTimer: number | null = null;
let isUnmounting = false;

const selectedVoiceObject = computed(() => {
  return voices.value.find((v) => v.name === selectedVoice.value) || null;
});

const progressKey = computed(() => {
  return book.value ? `reader-progress-${book.value.id}` : "";
});

const themeClass = computed(() => {
  return darkMode.value ? "dark" : "light";
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(sentences.value.length / pageSize.value));
});

const pageStartIndex = computed(() => {
  return (currentPage.value - 1) * pageSize.value;
});

const pageEndIndex = computed(() => {
  return Math.min(pageStartIndex.value + pageSize.value, sentences.value.length);
});

const pagedSentences = computed(() => {
  return sentences.value.slice(pageStartIndex.value, pageEndIndex.value);
});

const normalizeContent = (raw: unknown): string => {
  if (!raw) return "";

  if (typeof raw === "string") {
    const trimmed = raw.trim();

    try {
      const parsed = JSON.parse(trimmed);
      return normalizeContent(parsed);
    } catch {
      return trimmed;
    }
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeContent(item)).join("\n");
  }

  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;

    if (typeof obj.content === "string") return obj.content;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.full_text === "string") return obj.full_text;

    if (Array.isArray(obj.chapters)) {
      return obj.chapters
        .map((ch) => {
          if (typeof ch === "string") return ch;

          if (typeof ch === "object" && ch !== null) {
            const chapter = ch as Record<string, unknown>;
            if (typeof chapter.content === "string") return chapter.content;
            if (typeof chapter.text === "string") return chapter.text;
          }

          return "";
        })
        .join("\n");
    }

    return Object.values(obj)
      .map((v) => normalizeContent(v))
      .join("\n");
  }

  return String(raw);
};

const splitSentences = (text: string): string[] => {
  if (!text) return [];

  const cleaned = text
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, " <PARA> ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(/(?<=[.!?…。！？])\s+|<PARA>/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .flatMap((s) => {
      if (s.length <= 220) return [s];
      return s.match(/.{1,180}([,;:]\s*|$)/g)?.map((x) => x.trim()) || [s];
    });
};

const loadVoices = () => {
  const list = window.speechSynthesis.getVoices();
  voices.value = list;

  const thaiVoice = list.find((v) => v.lang?.toLowerCase().includes("th"));
  if (thaiVoice && !selectedVoice.value) {
    selectedVoice.value = thaiVoice.name;
  }

  if (!selectedVoice.value && list.length > 0) {
    selectedVoice.value = list[0].name;
  }
};

const syncPageWithCurrentIndex = () => {
  currentPage.value = Math.floor(currentIndex.value / pageSize.value) + 1;
};

const saveProgress = () => {
  if (!progressKey.value) return;

  localStorage.setItem(
    progressKey.value,
    JSON.stringify({
      currentIndex: currentIndex.value,
      currentPage: currentPage.value,
    })
  );
};

const loadProgress = () => {
  if (!progressKey.value) return;

  const saved = localStorage.getItem(progressKey.value);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    if (
      typeof parsed.currentIndex === "number" &&
      parsed.currentIndex >= 0 &&
      parsed.currentIndex < sentences.value.length
    ) {
      currentIndex.value = parsed.currentIndex;
      syncPageWithCurrentIndex();
      return;
    }

    if (
      typeof parsed === "number" &&
      parsed >= 0 &&
      parsed < sentences.value.length
    ) {
      currentIndex.value = parsed;
      syncPageWithCurrentIndex();
    }
  } catch {
    const oldParsed = Number(saved);
    if (
      !Number.isNaN(oldParsed) &&
      oldParsed >= 0 &&
      oldParsed < sentences.value.length
    ) {
      currentIndex.value = oldParsed;
      syncPageWithCurrentIndex();
    }
  }
};

const saveReaderSettings = () => {
  localStorage.setItem("reader-dark-mode", String(darkMode.value));
  localStorage.setItem("reader-font-size", String(fontSize.value));
  localStorage.setItem("reader-line-height", String(lineHeight.value));
  localStorage.setItem("reader-rate", String(rate.value));
  localStorage.setItem("reader-pitch", String(pitch.value));
  localStorage.setItem("reader-volume", String(volume.value));
  localStorage.setItem("reader-page-size", String(pageSize.value));
  localStorage.setItem("reader-voice", selectedVoice.value);
};

const loadReaderSettings = () => {
  const savedDark = localStorage.getItem("reader-dark-mode");
  const savedFont = localStorage.getItem("reader-font-size");
  const savedLineHeight = localStorage.getItem("reader-line-height");
  const savedRate = localStorage.getItem("reader-rate");
  const savedPitch = localStorage.getItem("reader-pitch");
  const savedVolume = localStorage.getItem("reader-volume");
  const savedPageSize = localStorage.getItem("reader-page-size");
  const savedVoice = localStorage.getItem("reader-voice");

  if (savedDark !== null) darkMode.value = savedDark === "true";
  if (savedFont !== null) fontSize.value = Number(savedFont) || 24;
  if (savedLineHeight !== null) lineHeight.value = Number(savedLineHeight) || 2;
  if (savedRate !== null) rate.value = Number(savedRate) || 1;
  if (savedPitch !== null) pitch.value = Number(savedPitch) || 1;
  if (savedVolume !== null) volume.value = Number(savedVolume) || 1;
  if (savedPageSize !== null) pageSize.value = Number(savedPageSize) || 25;
  if (savedVoice !== null) selectedVoice.value = savedVoice;
};

const scrollToCurrent = async () => {
  await nextTick();

  const el = document.querySelector(".sentence.active");
  if (el) {
    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
};

const fetchBook = async () => {
  loading.value = true;
  error.value = "";

  try {
    const id = Number(route.params.id);

    const bookRes = await axios.get(`http://localhost:3000/api/books/${id}`);
    book.value = bookRes.data;

    const contentRes = await axios.get(
      `http://localhost:3000/api/books/${id}/content`
    );

    const fullText = contentRes.data.map((p: any) => p.content || "").join(" ");
    const normalized = normalizeContent(fullText);
    sentences.value = splitSentences(normalized);

    loadProgress();
  } catch (err) {
    console.error("fetchBook error:", err);
    error.value = "โหลดหนังสือไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

const loadProgressFromDB = async () => {
  try {
    if (!book.value) return;

    const user = getUser();
    if (!user) return;

    const res = await axios.get<ProgressResponse>(
      `http://localhost:3000/api/progress/${book.value.id}`,
      {
        headers: getAuthHeaders(),
      }
    );

    const data = res.data || {};
    const lastPosition = Number(data.last_position || 0);
    const savedPage = Number(data.current_page || 1);

    if (
      !Number.isNaN(lastPosition) &&
      lastPosition >= 0 &&
      lastPosition < sentences.value.length
    ) {
      currentIndex.value = lastPosition;
      syncPageWithCurrentIndex();
    } else if (
      !Number.isNaN(savedPage) &&
      savedPage >= 1 &&
      savedPage <= totalPages.value
    ) {
      currentPage.value = savedPage;
      currentIndex.value = (savedPage - 1) * pageSize.value;
    }

    if (typeof data.font_size === "number" && data.font_size > 0) {
      fontSize.value = data.font_size;
    }
    if (typeof data.rate === "number" && data.rate > 0) {
      rate.value = data.rate;
    }
    if (typeof data.pitch === "number" && data.pitch > 0) {
      pitch.value = data.pitch;
    }
    if (typeof data.volume === "number" && data.volume >= 0) {
      volume.value = data.volume;
    }
    if (typeof data.voice_name === "string" && data.voice_name.trim()) {
      selectedVoice.value = data.voice_name;
    }
  } catch (error) {
    console.error("loadProgressFromDB error:", error);
  }
};

const saveProgressToDB = async () => {
  try {
    if (!book.value || isUnmounting) return;

    const user = getUser();
    if (!user) return;

    const progressPercent =
      sentences.value.length > 0
        ? Math.round(((currentIndex.value + 1) / sentences.value.length) * 100)
        : 0;

    await axios.post(
      "http://localhost:3000/api/progress",
      {
        book_id: book.value.id,
        current_page: currentPage.value,
        last_position: currentIndex.value,
        progress_percent: progressPercent,
        font_size: fontSize.value,
        rate: rate.value,
        pitch: pitch.value,
        volume: volume.value,
        voice_name: selectedVoice.value || null,
      },
      {
        headers: getAuthHeaders(),
      }
    );
  } catch (error) {
    console.error("saveProgressToDB error:", error);
  }
};

const queueSaveProgressToDB = () => {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }

  saveTimer = window.setTimeout(() => {
    saveProgressToDB();
  }, 500);
};

const stopSpeech = () => {
  window.speechSynthesis.cancel();
  isSpeaking.value = false;
  isPaused.value = false;
};

const speakFrom = (index: number) => {
  if (!sentences.value.length) return;
  if (index < 0 || index >= sentences.value.length) return;

  stopSpeech();

  currentIndex.value = index;
  syncPageWithCurrentIndex();
  saveProgress();
  queueSaveProgressToDB();

  const text = sentences.value[index];
  const utter = new SpeechSynthesisUtterance(text);

  utter.lang = selectedVoiceObject.value?.lang || "th-TH";
  utter.voice = selectedVoiceObject.value || null;
  utter.rate = rate.value;
  utter.pitch = pitch.value;
  utter.volume = volume.value;

  utter.onstart = () => {
    isSpeaking.value = true;
    isPaused.value = false;
    scrollToCurrent();
  };

  utter.onend = () => {
    saveProgress();
    queueSaveProgressToDB();

    const nextIndex = currentIndex.value + 1;
    if (nextIndex < sentences.value.length) {
      speakFrom(nextIndex);
    } else {
      isSpeaking.value = false;
      isPaused.value = false;
    }
  };

  utter.onerror = (e) => {
    console.error("TTS error:", e);
    isSpeaking.value = false;
    isPaused.value = false;
  };

  window.speechSynthesis.speak(utter);
};

const playBook = () => {
  if (!sentences.value.length) return;
  speakFrom(currentIndex.value);
};

const pauseBook = () => {
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    isPaused.value = true;
    isSpeaking.value = false;
    saveProgress();
    queueSaveProgressToDB();
  }
};

const resumeBook = () => {
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    isPaused.value = false;
    isSpeaking.value = true;
    scrollToCurrent();
  } else {
    playBook();
  }
};

const restartBook = () => {
  currentIndex.value = 0;
  currentPage.value = 1;
  saveProgress();
  queueSaveProgressToDB();
  playBook();
};

const nextSentence = () => {
  if (currentIndex.value < sentences.value.length - 1) {
    speakFrom(currentIndex.value + 1);
  }
};

const prevSentence = () => {
  if (currentIndex.value > 0) {
    speakFrom(currentIndex.value - 1);
  }
};

const replayCurrent = () => {
  speakFrom(currentIndex.value);
};

const selectSentence = (indexInPage: number) => {
  const absoluteIndex = pageStartIndex.value + indexInPage;
  speakFrom(absoluteIndex);
};

const goPrevPage = () => {
  if (currentPage.value <= 1) return;
  stopSpeech();
  currentPage.value -= 1;
  currentIndex.value = pageStartIndex.value;
  saveProgress();
  queueSaveProgressToDB();
  scrollToCurrent();
};

const goNextPage = () => {
  if (currentPage.value >= totalPages.value) return;
  stopSpeech();
  currentPage.value += 1;
  currentIndex.value = pageStartIndex.value;
  saveProgress();
  queueSaveProgressToDB();
  scrollToCurrent();
};

const goBackToDetail = () => {
  if (book.value) {
    router.push({ name: "BookDetail", params: { id: book.value.id } });
  } else {
    router.back();
  }
};

const goToStore = () => {
  router.push({ name: "Store" });
};

watch(pageSize, () => {
  syncPageWithCurrentIndex();
  saveReaderSettings();
  queueSaveProgressToDB();
});

watch([selectedVoice, rate, pitch, volume], () => {
  saveReaderSettings();
  queueSaveProgressToDB();
});

watch([fontSize, lineHeight, darkMode], () => {
  saveReaderSettings();
});

onMounted(async () => {
  loadReaderSettings();
  await fetchBook();
  await loadProgressFromDB();
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  scrollToCurrent();
});

onBeforeUnmount(() => {
  isUnmounting = true;

  saveProgress();
  saveReaderSettings();

  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }

  stopSpeech();
  window.speechSynthesis.onvoiceschanged = null;
});
</script>

<template>
  <div class="reader-page" :class="themeClass">
    <div class="topbar">
      <div class="topbar-left">
        <button class="top-btn" @click="goToStore">← กลับร้านหนังสือ</button>
        <button class="top-btn" @click="goBackToDetail">รายละเอียดหนังสือ</button>
      </div>

      <div class="topbar-center" v-if="book">
        <h1 class="reader-title">{{ book.title }}</h1>
        <p class="reader-author">{{ book.author }}</p>
      </div>

      <div class="topbar-right">
        <button class="top-btn" @click="darkMode = !darkMode">
          {{ darkMode ? "☀ โหมดสว่าง" : "🌙 โหมดมืด" }}
        </button>
      </div>
    </div>

    <div class="reader-wrapper">
      <aside class="reader-control-panel">
        <div v-if="loading" class="panel-box">กำลังโหลดข้อมูลหนังสือ...</div>

        <div v-else-if="error" class="panel-box error">
          {{ error }}
        </div>

        <div v-else class="panel-box">
          <h3>ควบคุมการอ่าน</h3>

          <div class="control-group">
            <label>Voice</label>
            <select v-model="selectedVoice" class="input">
              <option
                v-for="voice in voices"
                :key="voice.name"
                :value="voice.name"
              >
                {{ voice.name }} ({{ voice.lang }})
              </option>
            </select>
          </div>

          <div class="control-group">
            <label>Speed: {{ rate }}</label>
            <input v-model="rate" type="range" min="0.5" max="2" step="0.1" />
          </div>

          <div class="control-group">
            <label>Pitch: {{ pitch }}</label>
            <input v-model="pitch" type="range" min="0.5" max="2" step="0.1" />
          </div>

          <div class="control-group">
            <label>Volume: {{ volume }}</label>
            <input v-model="volume" type="range" min="0" max="1" step="0.1" />
          </div>

          <div class="control-group">
            <label>ขนาดตัวอักษร: {{ fontSize }}px</label>
            <input v-model="fontSize" type="range" min="16" max="42" step="1" />
          </div>

          <div class="control-group">
            <label>ระยะห่างบรรทัด: {{ lineHeight }}</label>
            <input
              v-model="lineHeight"
              type="range"
              min="1.4"
              max="2.6"
              step="0.1"
            />
          </div>

          <div class="control-group">
            <label>จำนวนประโยคต่อหน้า: {{ pageSize }}</label>
            <input v-model="pageSize" type="range" min="10" max="50" step="5" />
          </div>

          <div class="button-group">
            <button class="btn primary" @click="playBook">▶ เริ่มอ่าน</button>
            <button class="btn" @click="pauseBook">⏸ หยุดชั่วคราว</button>
            <button class="btn" @click="resumeBook">⏯ เล่นต่อ</button>
            <button class="btn danger" @click="stopSpeech">⏹ หยุด</button>
          </div>

          <div class="button-group">
            <button class="btn" @click="restartBook">🔄 เริ่มใหม่</button>
            <button class="btn" @click="prevSentence">⏮ ย้อนกลับ</button>
            <button class="btn" @click="replayCurrent">🔁 อ่านซ้ำ</button>
            <button class="btn" @click="nextSentence">⏭ ถัดไป</button>
          </div>

          <div class="button-group">
            <button class="btn" @click="goPrevPage" :disabled="currentPage <= 1">
              ← หน้าก่อน
            </button>
            <button
              class="btn"
              @click="goNextPage"
              :disabled="currentPage >= totalPages"
            >
              หน้าถัดไป →
            </button>
          </div>

          <div class="status-box">
            <p>จำนวนประโยคทั้งหมด: {{ sentences.length }}</p>
            <p>หน้าปัจจุบัน: {{ currentPage }} / {{ totalPages }}</p>
            <p>ประโยคที่กำลังอ่าน: {{ currentIndex + 1 }}</p>
            <p v-if="isSpeaking">สถานะ: กำลังอ่าน</p>
            <p v-else-if="isPaused">สถานะ: หยุดชั่วคราว</p>
            <p v-else>สถานะ: ยังไม่เริ่ม</p>
          </div>
        </div>
      </aside>

      <main class="reader-main">
        <div v-if="loading" class="reader-box">
          กำลังโหลดข้อมูลหนังสือ...
        </div>

        <div v-else-if="error" class="reader-box error-text">
          {{ error }}
        </div>

        <div v-else class="reader-main-content">
          <div class="page-nav top-page-nav">
            <button class="page-btn" @click="goPrevPage" :disabled="currentPage <= 1">
              ← หน้าก่อน
            </button>
            <div class="page-indicator">
              หน้า {{ currentPage }} / {{ totalPages }}
            </div>
            <button
              class="page-btn"
              @click="goNextPage"
              :disabled="currentPage >= totalPages"
            >
              หน้าถัดไป →
            </button>
          </div>

          <div
            class="reader-box"
            :style="{ fontSize: fontSize + 'px', lineHeight: lineHeight }"
          >
            <span
              v-for="(sentence, index) in pagedSentences"
              :key="pageStartIndex + index"
              class="sentence"
              :class="{ active: pageStartIndex + index === currentIndex }"
              @click="selectSentence(index)"
            >
              {{ sentence }}
            </span>

            <div v-if="!pagedSentences.length" class="empty-content">
              ไม่พบเนื้อหาสำหรับอ่านออกเสียง
            </div>
          </div>

          <div class="page-nav bottom-page-nav">
            <button class="page-btn" @click="goPrevPage" :disabled="currentPage <= 1">
              ← หน้าก่อน
            </button>
            <div class="page-indicator">
              หน้า {{ currentPage }} / {{ totalPages }}
            </div>
            <button
              class="page-btn"
              @click="goNextPage"
              :disabled="currentPage >= totalPages"
            >
              หน้าถัดไป →
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.reader-page {
  min-height: 100vh;
  transition: background 0.2s ease, color 0.2s ease;
}

.reader-page.light {
  background: #f5f7fb;
  color: #222;
}

.reader-page.dark {
  background: #12161f;
  color: #f3f5f8;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(180, 180, 180, 0.15);
}

.reader-page.light .topbar {
  background: rgba(255, 255, 255, 0.88);
}

.reader-page.dark .topbar {
  background: rgba(18, 22, 31, 0.88);
}

.topbar-left,
.topbar-right {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.topbar-center {
  text-align: center;
}

.reader-title {
  font-size: 22px;
  margin: 0;
}

.reader-author {
  margin: 4px 0 0;
  opacity: 0.8;
}

.top-btn {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
}

.reader-page.light .top-btn {
  background: #eceef7;
  color: #222;
}

.reader-page.dark .top-btn {
  background: #232b3a;
  color: #f3f5f8;
}

.reader-wrapper {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.reader-control-panel {
  position: sticky;
  top: 96px;
  align-self: start;
}

.panel-box,
.reader-box {
  border-radius: 20px;
  padding: 24px;
}

.reader-page.light .panel-box,
.reader-page.light .reader-box {
  background: white;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.reader-page.dark .panel-box,
.reader-page.dark .reader-box {
  background: #1b2230;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}

.control-group {
  margin-bottom: 16px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

.input,
select,
input[type="range"] {
  width: 100%;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.btn {
  border: none;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:disabled,
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.reader-page.light .btn {
  background: #eceef7;
  color: #222;
}

.reader-page.dark .btn {
  background: #2b3446;
  color: #f3f5f8;
}

.btn.primary {
  background: #6c63ff !important;
  color: white !important;
}

.btn.danger {
  background: #ff5b6e !important;
  color: white !important;
}

.status-box {
  margin-top: 12px;
  border-radius: 14px;
  padding: 14px;
}

.reader-page.light .status-box {
  background: #f6f7fb;
}

.reader-page.dark .status-box {
  background: #232b3a;
}

.reader-main {
  min-width: 0;
}

.reader-main-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reader-box {
  min-height: 75vh;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}

.page-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-btn {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
}

.reader-page.light .page-btn {
  background: #eceef7;
  color: #222;
}

.reader-page.dark .page-btn {
  background: #2b3446;
  color: #f3f5f8;
}

.page-indicator {
  font-weight: 700;
  opacity: 0.9;
}

.sentence {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 8px;
  transition: all 0.2s ease;
  margin-right: 4px;
}

.reader-page.light .sentence:hover {
  background: #eef1ff;
}

.reader-page.dark .sentence:hover {
  background: #30384d;
}

.sentence.active {
  background: #fff1a8;
  color: #222;
}

.empty-content {
  margin-top: 20px;
  opacity: 0.8;
}

.error {
  color: #b00020;
}

.error-text {
  color: #ff7d8b;
}

@media (max-width: 1100px) {
  .reader-wrapper {
    grid-template-columns: 1fr;
  }

  .reader-control-panel {
    position: static;
  }
}

@media (max-width: 768px) {
  .topbar {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .topbar-left,
  .topbar-right,
  .page-nav {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>