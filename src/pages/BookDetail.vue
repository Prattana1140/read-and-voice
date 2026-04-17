<template>
  <div class="book-detail-page">
    <div class="container">
      <div v-if="loading" class="state-box">กำลังโหลดข้อมูลหนังสือ...</div>

      <div v-else-if="error" class="state-box error">
        {{ error }}
      </div>

      <div v-else-if="book" class="book-layout">
        <aside class="book-sidebar">
          <div class="cover-box">
            <img
              :src="bookCover"
              :alt="book.title"
              class="cover-image"
              @error="handleImgError"
            />
          </div>

          <h1 class="book-title">{{ book.title }}</h1>
          <p class="book-author">ผู้แต่ง: {{ book.author }}</p>

          <p v-if="book.category_name" class="book-meta">
            หมวดหมู่: {{ book.category_name }}
          </p>

          <p v-if="book.description" class="book-description">
            {{ book.description }}
          </p>

          <div class="quick-actions">
            <button class="btn reader-btn" @click="openReaderPage">
              📖 โหมดอ่านเต็มจอ
            </button>

            <button class="btn primary library-btn" @click="addToLibrary">
              ➕ เพิ่มเข้าชั้นหนังสือ
            </button>

            <button class="btn wishlist-btn" @click="addToWishlist">
              ♡ เพิ่ม Wishlist
            </button>

            <button class="btn cart-btn" @click="addToCart">
              🛒 เพิ่มลงตะกร้า
            </button>
          </div>

          <div class="tts-panel">
            <h3>ทดลองอ่านออกเสียง</h3>
            <p class="tts-note">
              หน้านี้เป็นตัวอย่างเสียงเบื้องต้น หากต้องการอ่านเต็มเล่มให้เข้าโหมดอ่านเต็มจอ
            </p>

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
              <input
                v-model="pitch"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
              />
            </div>

            <div class="control-group">
              <label>Volume: {{ volume }}</label>
              <input v-model="volume" type="range" min="0" max="1" step="0.1" />
            </div>

            <div class="control-group">
              <label>ขนาดตัวอักษร: {{ fontSize }}px</label>
              <input
                v-model="fontSize"
                type="range"
                min="16"
                max="36"
                step="1"
              />
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

            <div class="status-box">
              <p>จำนวนประโยคตัวอย่าง: {{ sentences.length }}</p>
              <p>
                กำลังอ่านประโยคที่:
                {{ sentences.length ? currentIndex + 1 : 0 }}
              </p>
              <p v-if="isSpeaking">สถานะ: กำลังอ่าน</p>
              <p v-else-if="isPaused">สถานะ: หยุดชั่วคราว</p>
              <p v-else>สถานะ: ยังไม่เริ่ม</p>
            </div>
          </div>
        </aside>

        <main class="book-content">
          <div class="content-header">
            <h2>ตัวอย่างเนื้อหา</h2>

            <div class="top-right-actions">
              <button class="small-btn" @click="goToWishlist">Wishlist</button>
              <button class="small-btn" @click="goToCart">ตะกร้า</button>
            </div>
          </div>

          <div
            class="reader-box"
            :style="{ fontSize: fontSize + 'px', lineHeight: '1.9' }"
          >
            <span
              v-for="(sentence, index) in sentences"
              :key="index"
              class="sentence"
              :class="{ active: index === currentIndex }"
              @click="selectSentence(index)"
            >
              {{ sentence }}
            </span>

            <div v-if="!sentences.length" class="empty-content">
              ไม่พบเนื้อหาสำหรับอ่านออกเสียง
            </div>
          </div>

          <div class="preview-footer">
            <button class="btn reader-btn preview-reader-btn" @click="openReaderPage">
              เปิดอ่านเต็มเล่มใน Reader
            </button>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { API_BASE_URL } from "../utils/api";
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
  cover_image?: string;
  content?: string;
  full_text?: string;
  category_name?: string;
  price?: number;
};

const PREVIEW_LIMIT = 12;

const route = useRoute();
const router = useRouter();

const book = ref<Book | null>(null);
const loading = ref(true);
const error = ref("");

const fontSize = ref(22);
const rate = ref(1);
const pitch = ref(1);
const volume = ref(1);

const voices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoice = ref("");

const sentences = ref<string[]>([]);
const currentIndex = ref(0);

const isSpeaking = ref(false);
const isPaused = ref(false);

const selectedVoiceObject = computed(() => {
  return voices.value.find((v) => v.name === selectedVoice.value) || null;
});

const bookCover = computed(() => {
  const cover =
    book.value?.cover_url || book.value?.cover || book.value?.cover_image || "";

  if (!cover) return "/no-cover.png";
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;

  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
});

const progressKey = computed(() => {
  return book.value ? `book-preview-progress-${book.value.id}` : "";
});

const handleImgError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
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

const saveProgress = () => {
  if (!progressKey.value) return;
  localStorage.setItem(progressKey.value, String(currentIndex.value));
};

const loadProgress = () => {
  if (!progressKey.value) return;

  const saved = localStorage.getItem(progressKey.value);
  if (saved !== null) {
    const parsed = Number(saved);

    if (
      !Number.isNaN(parsed) &&
      parsed >= 0 &&
      parsed < sentences.value.length
    ) {
      currentIndex.value = parsed;
    }
  }
};

const savePreviewSettings = () => {
  localStorage.setItem("book-detail-font-size", String(fontSize.value));
  localStorage.setItem("book-detail-rate", String(rate.value));
  localStorage.setItem("book-detail-pitch", String(pitch.value));
  localStorage.setItem("book-detail-volume", String(volume.value));
  localStorage.setItem("book-detail-voice", selectedVoice.value);
};

const loadPreviewSettings = () => {
  const savedFont = localStorage.getItem("book-detail-font-size");
  const savedRate = localStorage.getItem("book-detail-rate");
  const savedPitch = localStorage.getItem("book-detail-pitch");
  const savedVolume = localStorage.getItem("book-detail-volume");
  const savedVoice = localStorage.getItem("book-detail-voice");

  if (savedFont !== null) fontSize.value = Number(savedFont) || 22;
  if (savedRate !== null) rate.value = Number(savedRate) || 1;
  if (savedPitch !== null) pitch.value = Number(savedPitch) || 1;
  if (savedVolume !== null) volume.value = Number(savedVolume) || 1;
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

    const bookRes = await axios.get(`${API_BASE_URL}/api/books/${id}`);
    book.value = bookRes.data;

    const contentRes = await axios.get(
      `${API_BASE_URL}/api/books/${id}/content`
    );

    const fullText = contentRes.data.map((p: any) => p.content || "").join(" ");
    const normalized = normalizeContent(fullText);
    const allSentences = splitSentences(normalized);

    sentences.value = allSentences.slice(0, PREVIEW_LIMIT);
    loadProgress();
  } catch (err) {
    console.error("fetchBook error:", err);
    error.value = "โหลดหนังสือไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
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
  saveProgress();

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
  saveProgress();
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
  if (!sentences.value.length) return;
  speakFrom(currentIndex.value);
};

const selectSentence = (index: number) => {
  speakFrom(index);
};

const openReaderPage = () => {
  if (!book.value) return;
  stopSpeech();
  router.push({ name: "ReaderPage", params: { id: book.value.id } });
};

const addToLibrary = async () => {
  try {
    const user = getUser();
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อน");
      router.push({ name: "Login" });
      return;
    }

    if (!book.value) return;

    const res = await axios.post(
      `${API_BASE_URL}/api/library`,
      { book_id: book.value.id },
      { headers: getAuthHeaders() }
    );

    alert(res.data.message || "เพิ่มเข้าชั้นหนังสือสำเร็จ");
  } catch (err: any) {
    alert(err?.response?.data?.message || "เพิ่มเข้าชั้นหนังสือไม่สำเร็จ");
    console.error("addToLibrary error:", err);
  }
};

const addToWishlist = () => {
  if (!book.value) return;

  const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
  const exists = wishlist.some(
    (item: any) => Number(item.id) === Number(book.value?.id)
  );

  if (exists) {
    alert("หนังสือเล่มนี้อยู่ใน Wishlist แล้ว");
    return;
  }

  wishlist.push({
    id: book.value.id,
    title: book.value.title,
    author: book.value.author,
    cover: bookCover.value,
  });

  localStorage.setItem("wishlist", JSON.stringify(wishlist));
  alert("เพิ่มเข้า Wishlist สำเร็จ");
};

const addToCart = async () => {
  if (!book.value) return;

  const token = localStorage.getItem("token");

  if (!token) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    router.push({ name: "Login" });
    return;
  }

  try {
    await axios.post(
      `${API_BASE_URL}/api/cart`,
      { book_id: book.value.id },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    alert("เพิ่มลงตะกร้าแล้ว");
  } catch (err: any) {
    alert(err?.response?.data?.message || "เพิ่มลงตะกร้าไม่สำเร็จ");
    console.error("addToCart error:", err);
  }
};

const goToWishlist = () => {
  router.push({ name: "WishList" });
};

const goToCart = () => {
  router.push({ name: "Cart" });
};

watch([fontSize, rate, pitch, volume, selectedVoice], () => {
  savePreviewSettings();
});

onMounted(async () => {
  loadPreviewSettings();
  await fetchBook();
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  scrollToCurrent();
});

onBeforeUnmount(() => {
  saveProgress();
  savePreviewSettings();
  stopSpeech();
  window.speechSynthesis.onvoiceschanged = null;
});
</script>

<style scoped>
.book-detail-page {
  min-height: 100vh;
  background: #f7f8fc;
  padding: 24px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.state-box {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.state-box.error {
  color: #b00020;
}

.book-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
}

.book-sidebar,
.book-content {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.cover-box {
  width: 100%;
  height: 420px;
  border-radius: 16px;
  overflow: hidden;
  background: #ececf3;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.book-title {
  font-size: 28px;
  margin-bottom: 8px;
  color: #222;
}

.book-author {
  color: #555;
  margin-bottom: 8px;
}

.book-meta {
  color: #667085;
  margin-bottom: 12px;
  font-weight: 600;
}

.book-description {
  margin: 0 0 20px;
  color: #475467;
  line-height: 1.6;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.quick-actions {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}

.tts-panel h3 {
  margin-bottom: 8px;
}

.tts-note {
  margin: 0 0 16px;
  color: #667085;
  line-height: 1.5;
  font-size: 14px;
}

.control-group {
  margin-bottom: 16px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #333;
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
  background: #eceef7;
  font-weight: 600;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn.primary {
  background: #6c63ff;
  color: white;
}

.btn.danger {
  background: #ff5b6e;
  color: white;
}

.reader-btn {
  width: 100%;
  background: #222b45;
  color: white;
}

.preview-reader-btn {
  max-width: 320px;
}

.library-btn {
  width: 100%;
}

.wishlist-btn {
  width: 100%;
  background: #fff1f4;
  color: #c23b61;
}

.cart-btn {
  width: 100%;
  background: #eef6ff;
  color: #2f63d8;
}

.status-box {
  margin-top: 12px;
  background: #f6f7fb;
  border-radius: 14px;
  padding: 14px;
  color: #444;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.book-content h2 {
  margin: 0;
}

.top-right-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.small-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  background: #edf1f7;
  color: #1f2430;
  font-weight: 700;
  cursor: pointer;
}

.reader-box {
  background: #fcfcff;
  border: 1px solid #ececf3;
  border-radius: 16px;
  padding: 24px;
  min-height: 500px;
  max-height: 75vh;
  overflow-y: auto;
  color: #222;
}

.sentence {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 8px;
  transition: all 0.2s ease;
  margin-right: 4px;
}

.sentence:hover {
  background: #eef1ff;
}

.sentence.active {
  background: #fff1a8;
}

.empty-content {
  margin-top: 20px;
  color: #777;
}

.preview-footer {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

@media (max-width: 960px) {
  .book-layout {
    grid-template-columns: 1fr;
  }

  .cover-box {
    height: 320px;
  }

  .content-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .preview-footer {
    justify-content: stretch;
  }

  .preview-reader-btn {
    max-width: none;
    width: 100%;
  }
}
</style>
