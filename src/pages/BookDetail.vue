<template>
  <div class="book-detail-page">
    <div class="container">
      <div v-if="loading" class="state-box">
        กำลังโหลดข้อมูลหนังสือ...
      </div>

      <div v-else-if="error" class="state-box error">
        {{ error }}
      </div>

      <div v-else-if="book" class="book-layout">
        <!-- =========================
             SIDEBAR: ปก + ข้อมูลหลัก + ปุ่มลัด + TTS ตัวอย่าง
             ========================= -->
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
          <p class="book-author">ผู้แต่ง: {{ book.author || "ไม่ระบุ" }}</p>

          <p v-if="book.category_name" class="book-meta">
            หมวดหมู่: {{ book.category_name }}
          </p>

          <p v-if="book.description" class="book-description">
            {{ book.description }}
          </p>

          <div class="access-card" :class="`access-${bookAccessType}`">
            <span class="access-badge">{{ bookAccessLabel }}</span>
            <strong>{{ bookPriceLabel }}</strong>
            <p>{{ bookAccessHint }}</p>
          </div>

          <!-- ปุ่มลัด -->
          <div class="quick-actions">
            <button class="btn reader-btn" @click="openReaderPage">
              {{ primaryReaderLabel }}
            </button>

            <button class="btn primary library-btn" @click="addToLibrary">
              เพิ่มเข้าชั้นหนังสือ
            </button>

            <button class="btn wishlist-btn" @click="addToWishlist">
              เพิ่ม Wishlist
            </button>

            <button class="btn cart-btn" @click="addWholeBookToCart">
              {{ bookAccessType === "paid" ? "เพิ่มลงตะกร้า" : "เก็บไว้ในตะกร้า" }}
            </button>

            <button
              v-if="bookAccessType === 'paid'"
              class="btn coin-btn"
              @click="router.push('/coin-wallet')"
            >
              เติม coin
            </button>

            <button
              v-if="bookAccessType === 'subscription' && !hasActiveSubscription"
              class="btn subscribe-btn"
              @click="router.push('/subscription-plans')"
            >
              สมัครรายเดือน
            </button>
          </div>

          <!-- TTS ตัวอย่าง -->
          <div
            v-if="book.content_type !== 'serial' && sentences.length"
            class="tts-panel"
          >
            <h3>ทดลองอ่านออกเสียง</h3>
            <p class="tts-note">
              ส่วนนี้เป็นตัวอย่างการฟังเบื้องต้น หากต้องการอ่านแบบเต็มหน้าจอให้กดเปิด Reader
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
              <button class="btn primary" @click="playBook">เริ่มอ่าน</button>
              <button class="btn" @click="pauseBook">หยุดชั่วคราว</button>
              <button class="btn" @click="resumeBook">เล่นต่อ</button>
              <button class="btn danger" @click="stopSpeech">หยุด</button>
            </div>

            <div class="button-group">
              <button class="btn" @click="restartBook">เริ่มใหม่</button>
              <button class="btn" @click="prevSentence">ย้อนกลับ</button>
              <button class="btn" @click="replayCurrent">อ่านซ้ำ</button>
              <button class="btn" @click="nextSentence">ถัดไป</button>
            </div>

            <div class="status-box">
              <p>จำนวนประโยคตัวอย่าง: {{ sentences.length }}</p>
              <p>กำลังอ่านประโยคที่: {{ sentences.length ? currentIndex + 1 : 0 }}</p>
              <p v-if="isSpeaking">สถานะ: กำลังอ่าน</p>
              <p v-else-if="isPaused">สถานะ: หยุดชั่วคราว</p>
              <p v-else>สถานะ: ยังไม่เริ่ม</p>
            </div>
          </div>
        </aside>

        <!-- =========================
             CONTENT AREA
             ========================= -->
        <main class="book-content">
          <div class="content-header">
            <h2>
              {{ book.content_type === "serial" ? "รายการตอน" : "ตัวอย่างเนื้อหา" }}
            </h2>

            <div class="top-right-actions">
              <button class="small-btn" @click="goToWishlist">Wishlist</button>
              <button class="small-btn" @click="goToCart">ตะกร้า</button>
            </div>
          </div>

          <!-- =========================
               กรณีเป็นนิยายรายตอน / serial
               ========================= -->
          <div v-if="book.content_type === 'serial'" class="episode-list">
            <!-- กล่องซื้อทั้งเรื่อง / สมัครรายเดือน -->
            <div class="purchase-actions">
              <button
                v-if="book.access_type === 'paid'"
                class="btn primary"
                :disabled="buyingBook"
                @click="addBookToCart(book.id)"
              >
                {{ buyingBook ? "กำลังเพิ่ม..." : `ซื้ออีบุ๊ก ${book.price || 0} coin` }}
              </button>

              <router-link
                v-if="book.access_type === 'subscription'"
                class="subscribe-link"
                to="/subscription-plans"
              >
                สมัครรายเดือนเพื่ออ่าน
              </router-link>
            </div>

            <article
              v-for="episode in episodes"
              :key="episode.id"
              class="episode-item"
            >
              <div>
                <strong>ตอนที่ {{ episode.episode_number }}: {{ episode.title }}</strong>
                <p>{{ getEpisodeAccessLabel(episode) }}</p>
              </div>

              <div class="episode-actions">
                <button class="small-btn" @click="openEpisodeReader(episode)">
                  {{ isEpisodeFree(episode) ? "อ่านตอนนี้" : "ดูสถานะตอน" }}
                </button>

                <button
                  v-if="isEpisodePaid(episode)"
                  class="small-btn"
                  :disabled="buyingEpisodeId === episode.id"
                  @click="addEpisodeToCart(episode)"
                >
                  {{
                    buyingEpisodeId === episode.id
                      ? "กำลังเพิ่ม..."
                      : "เพิ่มตอนลงตะกร้า"
                  }}
                </button>

                <router-link
                  v-if="episode.access_type === 'subscription'"
                  class="subscribe-link small-link"
                  to="/subscription-plans"
                >
                  สมัครรายเดือน
                </router-link>
              </div>
            </article>

            <div v-if="!episodes.length" class="empty-content">
              ยังไม่มีตอนที่เผยแพร่
            </div>
          </div>

          <!-- =========================
               กรณีเป็น ebook เต็มเล่ม
               ========================= -->
          <div
            v-else
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

          <p v-if="previewNotice" class="preview-notice">{{ previewNotice }}</p>

          <div v-if="book.content_type !== 'serial'" class="preview-footer">
            <button
              class="btn reader-btn preview-reader-btn"
              @click="openReaderPage"
            >
              เปิดอ่านเต็มเล่มใน Reader
            </button>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// =========================
// ส่วน import
// ใช้สำหรับดึง dependency ที่จำเป็นเข้ามา
// =========================
import { API_BASE_URL } from "../utils/api";
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { getAuthHeaders, getUser } from "../utils/auth";
import api from "../utils/api";

// =========================
// Type สำหรับข้อมูลหนังสือ
// ใช้ช่วยให้ TypeScript รู้ shape ของข้อมูล
// =========================
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
  content_type?: "ebook" | "serial";
  access_type?: "paid" | "free" | "subscription";
  episode_count?: number;
};

type Episode = {
  id: number;
  book_id: number;
  episode_number: number;
  title: string;
  price: number;
  is_free?: number;
  access_type?: "paid" | "free" | "subscription";
};

// จำกัดจำนวนประโยคตัวอย่างในหน้า detail
const PREVIEW_LIMIT = 12;

// =========================
// route / router
// ใช้อ่าน id จาก URL และสั่งเปลี่ยนหน้า
// =========================
const route = useRoute();
const router = useRouter();

// =========================
// state หลักของหน้า
// =========================
const book = ref<Book | null>(null);
const episodes = ref<Episode[]>([]);
const loading = ref(true);
const error = ref("");
const previewNotice = ref("");

// state ฝั่ง reader preview
const fontSize = ref(22);
const rate = ref(1);
const pitch = ref(1);
const volume = ref(1);

// state voice
const voices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoice = ref("");

// state ประโยคสำหรับ TTS preview
const sentences = ref<string[]>([]);
const currentIndex = ref(0);

// state สถานะเสียง
const isSpeaking = ref(false);
const isPaused = ref(false);

// state subscription/cart
const subscriptionInfo = ref<any>(null);
const buyingBook = ref(false);
const buyingEpisodeId = ref<number | null>(null);

// =========================
// computed
// ใช้คำนวณข้อมูลจาก state
// =========================
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

// =========================
// helper functions
// =========================
const handleImgError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
};

const isEpisodeFree = (episode: Episode) => {
  return Number(episode.is_free) === 1 || episode.access_type === "free" || Number(episode.price) <= 0;
};

const isEpisodePaid = (episode: Episode) => {
  return episode.access_type === "paid" || (!isEpisodeFree(episode) && episode.access_type !== "subscription");
};

const getEpisodeAccessLabel = (episode: Episode) => {
  if (episode.access_type === "subscription") {
    return "อ่านได้ด้วยแพ็กเกจรายเดือน";
  }

  if (isEpisodeFree(episode)) {
    return "อ่านฟรี";
  }

  return `ใช้ ${episode.price || 0} coin`;
};

const bookAccessType = computed(() => {
  return book.value?.access_type || "free";
});

const hasActiveSubscription = computed(() => {
  return Boolean(subscriptionInfo.value?.isActive);
});

const bookAccessLabel = computed(() => {
  if (bookAccessType.value === "subscription") return "อ่านด้วยรายเดือน";
  if (bookAccessType.value === "paid") return "ใช้ coin";
  return "อ่านฟรี";
});

const bookPriceLabel = computed(() => {
  if (bookAccessType.value === "subscription") {
    return hasActiveSubscription.value ? "แพ็กเกจกำลังใช้งาน" : "ต้องมีแพ็กเกจ";
  }

  if (bookAccessType.value === "paid") {
    return `${book.value?.price || 0} coin`;
  }

  return "0 coin";
});

const bookAccessHint = computed(() => {
  if (bookAccessType.value === "subscription") {
    return hasActiveSubscription.value
      ? "บัญชีนี้มีแพ็กเกจรายเดือน สามารถเปิดอ่านได้"
      : "สมัครแพ็กเกจรายเดือนก่อนเพื่ออ่านเนื้อหานี้";
  }

  if (bookAccessType.value === "paid") {
    return "เติม coin ให้พอ แล้วเพิ่มลงตะกร้าหรือซื้อเพื่อปลดล็อก";
  }

  return "เปิดอ่านและฟังเสียงได้ทันที";
});

const primaryReaderLabel = computed(() => {
  if (bookAccessType.value === "free") return "อ่านฟรีใน Reader";
  if (bookAccessType.value === "subscription" && hasActiveSubscription.value) {
    return "อ่านด้วยแพ็กเกจใน Reader";
  }

  return "ตรวจสิทธิ์/อ่านใน Reader";
});

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
    .split(/(?<=[.!?…。！？])/)
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

    if (!Number.isNaN(parsed) && parsed >= 0 && parsed < sentences.value.length) {
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

// =========================
// API load data
// =========================
const fetchBook = async () => {
  loading.value = true;
  error.value = "";
  previewNotice.value = "";

  try {
    const id = Number(route.params.id);

    const bookRes = await axios.get(`${API_BASE_URL}/api/books/${id}`);
    book.value = bookRes.data;

    // ถ้าเป็น serial ให้โหลดเฉพาะรายการตอน
    if (book.value?.content_type === "serial") {
      const episodeRes = await axios.get(`${API_BASE_URL}/api/books/${id}/episodes`);
      episodes.value = Array.isArray(episodeRes.data) ? episodeRes.data : [];
      sentences.value = [];
      return;
    }

    // ถ้าเป็น ebook ให้โหลด content preview
    const contentRes = await axios.get(`${API_BASE_URL}/api/books/${id}/content`, {
      headers: getAuthHeaders(),
    });

    const rawData = contentRes.data;

    if (Array.isArray(rawData)) {
      const fullText = rawData.map((p: any) => p.content || "").join(" ");
      const hasPreview = rawData.some((p: any) => p.is_preview);

      if (hasPreview) {
        previewNotice.value = "ขณะนี้แสดงเฉพาะตัวอย่างเนื้อหา หากต้องการอ่านเต็มเล่มให้เข้าสู่ระบบหรือซื้อก่อน";
      }

      const normalized = normalizeContent(fullText);
      const allSentences = splitSentences(normalized);
      sentences.value = allSentences.slice(0, PREVIEW_LIMIT);
    } else if (rawData?.content) {
      const normalized = normalizeContent(rawData.content);
      const allSentences = splitSentences(normalized);
      sentences.value = allSentences.slice(0, PREVIEW_LIMIT);

      if (rawData?.is_preview) {
        previewNotice.value = "ขณะนี้แสดงเฉพาะตัวอย่างเนื้อหา";
      }
    } else {
      sentences.value = [];
    }

    loadProgress();
  } catch (err) {
    console.error("fetchBook error:", err);
    error.value = "โหลดหนังสือไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

const loadSubscriptionStatus = async () => {
  try {
    const { data } = await api.get("/subscriptions/me");
    subscriptionInfo.value = data;
  } catch {
    subscriptionInfo.value = null;
  }
};

// =========================
// TTS functions
// =========================
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

// =========================
// navigation
// =========================
const openReaderPage = () => {
  if (!book.value) return;
  stopSpeech();

  router.push({
    name: "ReaderPage",
    params: { id: book.value.id },
  });
};

const openEpisodeReader = (episode: Episode) => {
  if (!book.value) return;
  stopSpeech();

  router.push({
    name: "ReaderPage",
    params: { id: book.value.id },
    query: { episode: String(episode.id) },
  });
};

const goToWishlist = () => {
  router.push({ name: "WishList" });
};

const goToCart = () => {
  router.push({ name: "Cart" });
};

// =========================
// actions: library / wishlist / cart
// =========================
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
      { headers: getAuthHeaders() },
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
  const exists = wishlist.some((item: any) => Number(item.id) === Number(book.value?.id));

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

const addWholeBookToCart = async () => {
  if (!book.value) return;

  if (bookAccessType.value === "free") {
    openReaderPage();
    return;
  }

  if (bookAccessType.value === "subscription" && !hasActiveSubscription.value) {
    router.push("/subscription-plans");
    return;
  }

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
      },
    );

    alert("เพิ่มลงตะกร้าแล้ว");
  } catch (err: any) {
    alert(err?.response?.data?.message || "เพิ่มลงตะกร้าไม่สำเร็จ");
    console.error("addWholeBookToCart error:", err);
  }
};

const addBookToCart = async (bookId: number) => {
  try {
    if (bookAccessType.value === "free") {
      openReaderPage();
      return;
    }

    buyingBook.value = true;
    await api.post("/cart", { book_id: bookId, quantity: 1 });
    alert("เพิ่มอีบุ๊กลงตะกร้าแล้ว");
  } catch (error: any) {
    alert(error?.response?.data?.message || "เพิ่มอีบุ๊กลงตะกร้าไม่สำเร็จ");
  } finally {
    buyingBook.value = false;
  }
};

const addEpisodeToCart = async (episode: Episode) => {
  try {
    buyingEpisodeId.value = episode.id;
    await api.post("/cart", { episode_id: episode.id, quantity: 1 });
    alert("เพิ่มตอนลงตะกร้าแล้ว");
  } catch (error: any) {
    alert(error?.response?.data?.message || "เพิ่มตอนลงตะกร้าไม่สำเร็จ");
  } finally {
    buyingEpisodeId.value = null;
  }
};

// =========================
// watchers
// =========================
watch([fontSize, rate, pitch, volume, selectedVoice], () => {
  savePreviewSettings();
});

// =========================
// lifecycle
// =========================
onMounted(async () => {
  loadPreviewSettings();
  await fetchBook();
  await loadSubscriptionStatus();
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

.access-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  margin: 0 0 18px;
  padding: 14px;
}

.access-card strong {
  color: #111827;
  display: block;
  font-size: 24px;
  margin-top: 8px;
}

.access-card p {
  color: #667085;
  line-height: 1.5;
  margin: 8px 0 0;
}

.access-badge {
  border-radius: 8px;
  display: inline-flex;
  font-size: 13px;
  font-weight: 900;
  padding: 6px 10px;
}

.access-free .access-badge {
  background: #ecfdf5;
  color: #047857;
}

.access-paid .access-badge {
  background: #fff7ed;
  color: #c2410c;
}

.access-subscription .access-badge {
  background: #eef2ff;
  color: #3730a3;
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

.coin-btn {
  width: 100%;
  background: #ecfdf5;
  color: #047857;
}

.subscribe-btn {
  width: 100%;
  background: #eef2ff;
  color: #3730a3;
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

.episode-list {
  display: grid;
  gap: 12px;
}

.episode-item {
  align-items: center;
  background: #fcfcff;
  border: 1px solid #ececf3;
  border-radius: 8px;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 16px;
}

.episode-item p {
  color: #667085;
  margin: 6px 0 0;
}

.episode-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.purchase-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.subscribe-link {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  background: #eef6ff;
  color: #2f63d8;
  text-decoration: none;
  font-weight: 700;
}

.small-link {
  padding: 8px 10px;
  border-radius: 10px;
}

.preview-notice {
  background: #fff8e6;
  border: 1px solid #ffe3a3;
  border-radius: 8px;
  color: #7a4d00;
  font-weight: 700;
  margin: 16px 0 0;
  padding: 12px 14px;
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

  .episode-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .episode-actions {
    justify-content: flex-start;
  }
}
</style>
