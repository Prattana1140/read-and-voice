<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { API_BASE_URL } from "../utils/api";

type ReaderResponse = {
  is_locked?: boolean;
  lock_reason?: string;
  title?: string;
  access_type?: string;
  content?: string;
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

type ColorMode = "light" | "sepia" | "dark";
type ReadingMode = "continuous" | "focus";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const episodesLoading = ref(false);
const error = ref("");
const title = ref("Reader");
const bookTitle = ref("");
const bookCover = ref("");
const lockReason = ref("");
const content = ref("");
const episodes = ref<Episode[]>([]);

const voices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoice = ref("");
const rate = ref(1);
const pitch = ref(1);
const volume = ref(1);
const fontSize = ref(20);
const lineHeight = ref(2);
const colorMode = ref<ColorMode>("sepia");
const readingMode = ref<ReadingMode>("continuous");

const sentences = ref<string[]>([]);
const currentIndex = ref(0);
const isSpeaking = ref(false);
const isPaused = ref(false);
const isTocOpen = ref(false);
const isSettingsOpen = ref(false);
const isListenMode = ref(false);
const hasAudioSession = ref(false);
const isVoiceSettingsOpen = ref(false);
const shareStatus = ref("");

const defaultCover = "/no-cover.png";

const currentEpisodeId = computed(() => Number(route.query.episode || 0));
const isEpisodeMode = computed(() => !!currentEpisodeId.value);
const readerKey = computed(() => {
  const bookId = String(route.params.id || "");
  const episodeId = String(route.query.episode || "");
  return episodeId ? `reader-episode-${episodeId}` : `reader-book-${bookId}`;
});
const contentRouteKey = computed(() => {
  return `${route.params.id || ""}:${route.query.episode || ""}`;
});

const selectedVoiceObject = computed(() => {
  return voices.value.find((voice) => voice.name === selectedVoice.value) || null;
});

const isDarkMode = computed(() => colorMode.value === "dark");
const pageTitle = computed(() => bookTitle.value || title.value || "Read and Voice");
const breadcrumbTitle = computed(() => title.value || pageTitle.value);
const coverUrl = computed(() => {
  const cover = bookCover.value;
  if (!cover) return defaultCover;
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;
  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
});
const activeEpisodeIndex = computed(() => {
  return episodes.value.findIndex((episode) => episode.id === currentEpisodeId.value);
});
const previousEpisode = computed(() => {
  const index = activeEpisodeIndex.value;
  return index > 0 ? episodes.value[index - 1] : null;
});
const nextEpisode = computed(() => {
  const index = activeEpisodeIndex.value;
  return index >= 0 && index < episodes.value.length - 1 ? episodes.value[index + 1] : null;
});
const paragraphs = computed(() => {
  const source = content.value || sentences.value.join(" ");
  return source
    .replace(/\r/g, "")
    .split(/\n\s*\n|\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
});
const listenTitle = computed(() => {
  if (isEpisodeMode.value) return title.value || "ตอนที่กำลังฟัง";
  return pageTitle.value;
});
const listenSubtitle = computed(() => {
  const index = activeEpisodeIndex.value >= 0 ? activeEpisodeIndex.value + 1 : 1;
  return isEpisodeMode.value ? String(index) : "1";
});
const listenDescription = computed(() => {
  return sentences.value[currentIndex.value] || paragraphs.value[0] || pageTitle.value;
});
const showMobileAudioDock = computed(() => {
  return hasAudioSession.value || isSpeaking.value || isPaused.value;
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
  const savedColorMode = localStorage.getItem("reader-color-mode") as ColorMode | null;
  const legacyDarkMode = localStorage.getItem("reader-dark-mode") === "true";
  colorMode.value = ["light", "sepia", "dark"].includes(savedColorMode || "")
    ? (savedColorMode as ColorMode)
    : legacyDarkMode
      ? "dark"
      : "sepia";
  readingMode.value =
    localStorage.getItem("reader-reading-mode") === "focus" ? "focus" : "continuous";
  fontSize.value = Number(localStorage.getItem("reader-font-size") || 20);
  lineHeight.value = Number(localStorage.getItem("reader-line-height") || 2);
  rate.value = Number(localStorage.getItem("reader-rate") || 1);
  pitch.value = Number(localStorage.getItem("reader-pitch") || 1);
  volume.value = Number(localStorage.getItem("reader-volume") || 1);
  selectedVoice.value = localStorage.getItem("reader-voice") || "";
}

function saveReaderSettings() {
  localStorage.setItem("reader-color-mode", colorMode.value);
  localStorage.setItem("reader-dark-mode", String(isDarkMode.value));
  localStorage.setItem("reader-reading-mode", readingMode.value);
  localStorage.setItem("reader-font-size", String(fontSize.value));
  localStorage.setItem("reader-line-height", String(lineHeight.value));
  localStorage.setItem("reader-rate", String(rate.value));
  localStorage.setItem("reader-pitch", String(pitch.value));
  localStorage.setItem("reader-volume", String(volume.value));
  localStorage.setItem("reader-voice", selectedVoice.value);
}

function setColorMode(mode: ColorMode) {
  colorMode.value = mode;
}

function adjustFont(amount: number) {
  fontSize.value = Math.min(36, Math.max(16, fontSize.value + amount));
}

function adjustRate(amount: number) {
  rate.value = Number(Math.min(2, Math.max(0.5, rate.value + amount)).toFixed(1));
}

function adjustPitch(amount: number) {
  pitch.value = Number(Math.min(2, Math.max(0.5, pitch.value + amount)).toFixed(1));
}

async function loadEpisodes() {
  if (!route.params.id) return;

  episodesLoading.value = true;
  try {
    const { data } = await api.get<Episode[]>(`/books/${route.params.id}/episodes`);
    episodes.value = Array.isArray(data) ? data : [];
  } catch {
    episodes.value = [];
  } finally {
    episodesLoading.value = false;
  }
}

async function loadBookTitle() {
  if (!route.params.id) return;

  try {
    const { data } = await api.get(`/books/${route.params.id}`);
    bookTitle.value = data?.title || "";
    bookCover.value = data?.cover_url || data?.cover || data?.cover_image || "";
  } catch {
    bookTitle.value = "";
    bookCover.value = "";
  }
}

async function loadProgress() {
  const saved = localStorage.getItem(`${readerKey.value}-index`);
  const index = Number(saved || 0);
  if (!Number.isNaN(index) && index >= 0 && index < sentences.value.length) {
    currentIndex.value = index;
  }

  if (isEpisodeMode.value || !route.params.id) return;

  try {
    const { data } = await api.get(`/progress/${route.params.id}`);
    const serverIndex = Number(data?.last_position ?? 0);

    if (!Number.isNaN(serverIndex) && serverIndex >= 0 && serverIndex < sentences.value.length) {
      currentIndex.value = serverIndex;
    }

    if (data?.rate) rate.value = Number(data.rate);
    if (data?.pitch) pitch.value = Number(data.pitch);
    if (data?.volume) volume.value = Number(data.volume);
    if (data?.voice_name) selectedVoice.value = data.voice_name;
  } catch {
    // Local progress is enough when the server has no saved position yet.
  }
}

function saveProgress() {
  localStorage.setItem(`${readerKey.value}-index`, String(currentIndex.value));

  if (isEpisodeMode.value || !route.params.id || !sentences.value.length) return;

  api
    .post("/progress", {
      book_id: Number(route.params.id),
      current_page: 1,
      last_position: currentIndex.value,
      progress_percent: currentProgress.value,
      rate: rate.value,
      pitch: pitch.value,
      volume: volume.value,
      voice_name: selectedVoice.value || null,
    })
    .catch(() => {
      // Keep the reading flow quiet if progress sync is unavailable.
    });
}

async function scrollToCurrent() {
  await nextTick();
  document.querySelector(".reader-paragraph.is-active")?.scrollIntoView({
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
  currentIndex.value = 0;
  isTocOpen.value = false;
  isSettingsOpen.value = false;
  isVoiceSettingsOpen.value = false;

  try {
    const endpoint = isEpisodeMode.value
      ? `/reader/episodes/${route.query.episode}/content`
      : `/reader/books/${route.params.id}/content`;

    const { data } = await api.get<ReaderResponse>(endpoint);

    title.value = data.title || (isEpisodeMode.value ? "ตอนนิยาย" : "หนังสือ");

    if (data.is_locked) {
      lockReason.value =
        data.lock_reason || "ต้องซื้อหนังสือหรือสมัครแพ็กเกจก่อนอ่าน";
      return;
    }

    content.value = data.content || "";
    sentences.value = splitSentences(content.value);
    await loadProgress();
    await scrollToCurrent();
  } catch (err: any) {
    error.value = err?.response?.data?.message || "โหลดเนื้อหาไม่สำเร็จ";
  } finally {
    loading.value = false;
    if (route.query.listen === "1" && !error.value && !lockReason.value) {
      enterListenMode(false);
    }
  }
}

function stopSpeech() {
  window.speechSynthesis.cancel();
  isSpeaking.value = false;
  isPaused.value = false;
  hasAudioSession.value = false;
  isListenMode.value = false;
}

function speakFrom(index: number) {
  if (!sentences.value.length || index < 0 || index >= sentences.value.length) return;

  window.speechSynthesis.cancel();
  isSpeaking.value = false;
  isPaused.value = false;
  hasAudioSession.value = true;
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
    hasAudioSession.value = true;
    isPaused.value = true;
    isSpeaking.value = false;
    saveProgress();
  }
}

function resume() {
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    hasAudioSession.value = true;
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

function toggleAudio() {
  if (isSpeaking.value) {
    pause();
    return;
  }

  resume();
}

function enterListenMode(updateUrl = true) {
  hasAudioSession.value = true;
  isListenMode.value = true;
  isTocOpen.value = false;
  isSettingsOpen.value = false;

  if (updateUrl && route.query.listen !== "1") {
    router.replace({
      name: "ReaderPage",
      params: route.params,
      query: { ...route.query, listen: "1" },
    });
  }

  if (!isSpeaking.value) {
    resume();
  }
}

function exitListenMode() {
  // Leave speech synthesis running; this only returns to the normal reading page.
  isListenMode.value = false;
  isVoiceSettingsOpen.value = false;

  if (route.query.listen === "1") {
    const { listen: _listen, ...query } = route.query;
    router.replace({
      name: "ReaderPage",
      params: route.params,
      query,
    });
  }
}

function toggleVoiceSettings() {
  isVoiceSettingsOpen.value = !isVoiceSettingsOpen.value;
}

function openEpisode(episode: Episode) {
  stopSpeech();
  router.push({
    name: "ReaderPage",
    params: { id: route.params.id },
    query: { episode: String(episode.id) },
  });
}

function goPreviousEpisode() {
  if (previousEpisode.value) openEpisode(previousEpisode.value);
}

function goNextEpisode() {
  if (nextEpisode.value) openEpisode(nextEpisode.value);
}

async function shareReader() {
  shareStatus.value = "";
  const shareData = {
    title: breadcrumbTitle.value,
    text: pageTitle.value,
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    shareStatus.value = "คัดลอกลิงก์แล้ว";
  } catch {
    shareStatus.value = "แชร์ไม่สำเร็จ";
  }
}

function isEpisodeFree(episode: Episode) {
  return Number(episode.is_free) === 1 || episode.access_type === "free" || Number(episode.price) <= 0;
}

watch(
  [selectedVoice, rate, pitch, volume, fontSize, lineHeight, colorMode, readingMode],
  saveReaderSettings,
);
watch(
  contentRouteKey,
  async () => {
    await fetchContent();
  },
);

watch(
  () => route.query.listen,
  (listen) => {
    if (loading.value || error.value || lockReason.value) return;
    if (listen === "1") {
      enterListenMode(false);
      return;
    }

    isListenMode.value = false;
    isVoiceSettingsOpen.value = false;
  },
);

onMounted(async () => {
  loadReaderSettings();
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  await Promise.all([loadBookTitle(), loadEpisodes()]);
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
  <main class="reader-page" :class="[colorMode, readingMode]">
    <div class="reader-wrap">
      <header class="mobile-reader-appbar">
        <button type="button" aria-label="ย้อนกลับ" @click="router.back()">‹</button>
        <span>{{ activeEpisodeIndex >= 0 ? activeEpisodeIndex + 1 : 1 }}</span>
        <div class="mobile-reader-actions">
          <button type="button" aria-label="สารบัญ" @click="isTocOpen = !isTocOpen">☰</button>
          <button type="button" aria-label="ปรับตัวอักษร" @click="isSettingsOpen = !isSettingsOpen">Aa</button>
          <button type="button" aria-label="บันทึก">♡</button>
          <button type="button" aria-label="แชร์" @click="shareReader">⋮</button>
        </div>
      </header>

      <nav class="reader-breadcrumb" aria-label="breadcrumb">
        <router-link to="/">หน้าหลัก</router-link>
        <span>&gt;</span>
        <router-link :to="`/book/${route.params.id}`">{{ pageTitle }}</router-link>
        <span v-if="isEpisodeMode">&gt;</span>
        <span v-if="isEpisodeMode">{{ breadcrumbTitle }}</span>
      </nav>

      <header class="reader-titlebar">
        <h1>{{ pageTitle }}</h1>
      </header>

      <section class="reader-toolbar" aria-label="เครื่องมืออ่าน">
        <div class="toolbar-left">
          <button class="gold-btn" type="button" @click="isTocOpen = !isTocOpen">
            ☰ สารบัญ
          </button>

          <div v-if="isTocOpen" class="toc-popover">
            <div class="toc-head">
              <strong>สารบัญ</strong>
              <small v-if="episodesLoading">กำลังโหลด...</small>
            </div>
            <button
              v-for="episode in episodes"
              :key="episode.id"
              class="toc-item"
              :class="{ active: episode.id === currentEpisodeId }"
              type="button"
              @click="openEpisode(episode)"
            >
              <span>เล่มที่ 1 ตอนที่ {{ episode.episode_number }} {{ episode.title }}</span>
              <small>{{ isEpisodeFree(episode) ? "อ่านฟรี" : `${episode.price || 0} coin` }}</small>
            </button>
            <p v-if="!episodesLoading && !episodes.length" class="toc-empty">
              ไม่มีรายการตอน
            </p>
          </div>
        </div>

        <div class="toolbar-right">
          <button class="gold-btn listen-toolbar-btn" type="button" @click="enterListenMode">
            ▶ อ่านให้ฟัง
          </button>
          <button class="gold-btn" type="button" @click="isSettingsOpen = !isSettingsOpen">
            A ปรับตัวอักษร
          </button>
          <button class="gold-btn" type="button" @click="shareReader">แชร์</button>

          <div v-if="isSettingsOpen" class="settings-popover">
            <strong>ขนาดตัวอักษร</strong>
            <div class="settings-row">
              <button type="button" @click="adjustFont(-1)">A-</button>
              <button type="button" @click="adjustFont(1)">A+</button>
            </div>

            <strong>สีพื้นหลัง</strong>
            <div class="theme-row">
              <button
                type="button"
                :class="{ active: colorMode === 'sepia' }"
                @click="setColorMode('sepia')"
              >
                A
              </button>
              <button
                type="button"
                :class="{ active: colorMode === 'light' }"
                @click="setColorMode('light')"
              >
                A
              </button>
              <button
                type="button"
                :class="{ active: colorMode === 'dark' }"
                @click="setColorMode('dark')"
              >
                A
              </button>
            </div>

          </div>
        </div>
      </section>

      <p v-if="shareStatus" class="share-status">{{ shareStatus }}</p>

      <section v-if="loading" class="state-card">กำลังโหลดเนื้อหา...</section>
      <section v-else-if="error" class="state-card error">{{ error }}</section>

      <section v-else-if="lockReason" class="locked-card">
        <h2>ยังอ่านไม่ได้</h2>
        <p>{{ lockReason }}</p>
        <div class="locked-actions">
          <button type="button" @click="router.push(`/book/${route.params.id}`)">
            ไปหน้าหนังสือ
          </button>
          <button type="button" @click="router.push('/subscription-plans')">
            สมัครแพ็กเกจ
          </button>
        </div>
      </section>

      <article
        v-else
        class="reader-content"
        :class="{ focus: readingMode === 'focus' }"
        :style="{ fontSize: fontSize + 'px', lineHeight }"
      >
        <h2 v-if="isEpisodeMode">{{ title }}</h2>
        <p
          v-for="(paragraph, index) in paragraphs"
          :key="index"
          class="reader-paragraph"
          :class="{ 'is-active': index === currentIndex }"
          @click="speakFrom(Math.min(index, sentences.length - 1))"
        >
          {{ paragraph }}
        </p>
      </article>

      <button
        v-if="!loading && !error && !lockReason"
        class="mobile-comment-float"
        type="button"
        aria-label="ความคิดเห็น"
      >
        ▣
      </button>

      <button
        v-if="!showMobileAudioDock && !loading && !error && !lockReason"
        class="listen-floating-cta"
        type="button"
        @click="enterListenMode"
      >
        <span>▶</span>
        อ่านให้ฟัง
      </button>

      <section v-if="showMobileAudioDock && !loading && !error && !lockReason" class="mobile-mini-player">
        <img :src="coverUrl" :alt="pageTitle" />
        <button type="button" aria-label="ย้อนประโยค" @click="previousSentence">‹</button>
        <button class="mini-play" type="button" @click="enterListenMode">
          {{ isSpeaking ? "Ⅱ" : "▶" }}
        </button>
        <button type="button" aria-label="ถัดไป" @click="nextSentence">›</button>
        <button type="button" aria-label="หยุดอ่านให้ฟัง" @click="stopSpeech">×</button>
      </section>

      <footer v-if="!loading && !error && !lockReason" class="reader-footer-nav">
        <button type="button" :disabled="!previousEpisode" @click="goPreviousEpisode">
          ย้อนกลับ
        </button>
        <button type="button" @click="router.push(`/book/${route.params.id}`)">
          กลับหน้าหนังสือ
        </button>
        <button type="button" :disabled="!nextEpisode" @click="goNextEpisode">
          อ่านต่อ
        </button>
      </footer>

      <nav v-if="!loading && !error && !lockReason" class="mobile-bottom-tabs" aria-label="เมนูอ่าน">
        <button type="button">คอมเมนต์</button>
        <button type="button" @click="router.push(`/book/${route.params.id}`)">เพิ่มเข้าชั้น</button>
        <button class="active" type="button" @click="enterListenMode">เล่น</button>
        <button type="button" :disabled="!previousEpisode" @click="goPreviousEpisode">ก่อนหน้า</button>
        <button type="button" :disabled="!nextEpisode" @click="goNextEpisode">ถัดไป</button>
      </nav>

      <section
        v-if="isListenMode && !loading && !error && !lockReason"
        class="listen-mode"
        :style="{ '--cover-url': `url(${coverUrl})` }"
        aria-label="โหมดอ่านให้ฟัง"
      >
        <div class="listen-mode__scrim"></div>
        <header class="listen-mode__topbar">
          <button type="button" aria-label="กลับหน้าอ่าน" @click="exitListenMode">‹</button>
          <span>{{ pageTitle }}</span>
          <small>{{ episodes.length || 1 }} ตอน</small>
          <button type="button" aria-label="บันทึก">♡</button>
          <button type="button" aria-label="ตั้งค่าเสียง" @click="toggleVoiceSettings">⚙</button>
        </header>

        <div class="listen-mode__content">
          <div class="listen-mode__cover">
            <img :src="coverUrl" :alt="pageTitle" />
          </div>
          <strong>{{ listenSubtitle }}</strong>
          <p>{{ listenDescription }}</p>
        </div>

        <div class="listen-mode__controls">
          <button type="button" :disabled="currentIndex <= 0" @click="previousSentence">‹</button>
          <button class="listen-mode__play" type="button" @click="toggleAudio">
            {{ isSpeaking ? "Ⅱ" : "▶" }}
          </button>
          <button type="button" :disabled="currentIndex >= sentences.length - 1" @click="nextSentence">›</button>
        </div>

        <button class="listen-mode__exit" type="button" @click="exitListenMode">
          ออกจากโหมดอ่านให้ฟัง
        </button>

        <section v-if="isVoiceSettingsOpen" class="voice-sheet" aria-label="ปรับแต่งเสียง">
          <div class="voice-sheet__head">
            <button type="button" aria-label="ปิดตั้งค่าเสียง" @click="toggleVoiceSettings">×</button>
            <h2>ปรับแต่งเสียง</h2>
          </div>

          <label class="voice-field">
            <span>เสียง</span>
            <div class="voice-selector">
              <button type="button" aria-label="เสียงก่อนหน้า">‹</button>
              <select v-model="selectedVoice">
                <option v-for="voice in voices" :key="voice.name" :value="voice.name">
                  {{ voice.name }}
                </option>
              </select>
              <button type="button" aria-label="เสียงถัดไป">›</button>
            </div>
          </label>

          <label class="voice-field">
            <span>ความเร็ว</span>
            <div class="voice-range-row">
              <small>ช้า</small>
              <button type="button" @click="adjustRate(-0.1)">−</button>
              <input v-model.number="rate" type="range" min="0.5" max="2" step="0.1" />
              <button type="button" @click="adjustRate(0.1)">+</button>
              <small>เร็ว</small>
            </div>
          </label>

          <label class="voice-field">
            <span>โทนเสียง</span>
            <div class="voice-range-row">
              <small>ต่ำ</small>
              <button type="button" @click="adjustPitch(-0.1)">−</button>
              <input v-model.number="pitch" type="range" min="0.5" max="2" step="0.1" />
              <button type="button" @click="adjustPitch(0.1)">+</button>
              <small>สูง</small>
            </div>
          </label>

          <button class="voice-reset" type="button" @click="rate = 1; pitch = 1; volume = 1">
            รีเซ็ตเป็นค่าเริ่มต้น
          </button>
        </section>
      </section>
    </div>
  </main>
</template>

<style scoped>
.reader-page {
  min-height: 100vh;
  background: #f7f3ef;
  color: #2a2319;
  padding: 0 16px 48px;
}

.reader-page.light {
  background: #f7f3ef;
}

.reader-page.sepia {
  background: #f7f3ef;
}

.reader-page.dark {
  background: #1d1a16;
  color: #f8eed1;
}

.reader-wrap {
  width: min(100%, 960px);
  margin: 0 auto;
}

.mobile-reader-appbar,
.mobile-mini-player,
.mobile-bottom-tabs,
.mobile-comment-float,
.listen-floating-cta,
.listen-mode {
  display: none;
}

.reader-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
  min-height: 30px;
  color: #7b6042;
  font-size: 12px;
}

.reader-breadcrumb a {
  color: #7b6042;
  text-decoration: none;
}

.reader-breadcrumb a:hover {
  color: #d98308;
}

.reader-titlebar {
  position: relative;
  min-height: 42px;
  display: flex;
  align-items: center;
  border-bottom: 2px solid #db8a13;
  background:
    linear-gradient(90deg, #f2de9b, #ead089 45%, #f4e7b9),
    repeating-linear-gradient(45deg, rgba(123, 96, 66, 0.18) 0 2px, transparent 2px 8px);
  background-blend-mode: overlay;
  padding: 0 24px;
}

.reader-titlebar::before,
.reader-titlebar::after {
  content: "";
  position: absolute;
  top: -4px;
  width: 12px;
  height: 46px;
  border-radius: 999px;
  background: linear-gradient(#b56d1a, #f6cf7a 40%, #9a5211);
  box-shadow: 0 2px 5px rgba(68, 45, 20, 0.22);
}

.reader-titlebar::before {
  left: -5px;
  transform: rotate(10deg);
}

.reader-titlebar::after {
  right: -5px;
  transform: rotate(-10deg);
}

.reader-titlebar h1 {
  margin: 0;
  color: #17120b;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.2;
}

.reader-toolbar {
  position: relative;
  z-index: 4;
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
  padding: 12px 0;
}

.toolbar-left,
.toolbar-right {
  position: relative;
  display: flex;
  gap: 6px;
}

.gold-btn,
.reader-footer-nav button,
.locked-actions button {
  border: 0;
  border-radius: 4px;
  background: #f5c947;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  min-height: 34px;
  padding: 0 14px;
}

.gold-btn:hover,
.reader-footer-nav button:hover:not(:disabled),
.locked-actions button:hover {
  background: #eda917;
}

.listen-toolbar-btn {
  background: #55c6bd;
  box-shadow: 0 10px 20px rgba(85, 198, 189, 0.24);
}

.listen-toolbar-btn:hover {
  background: #35afa5;
}

.toc-popover,
.settings-popover {
  position: absolute;
  top: 40px;
  border: 1px solid #2b2115;
  border-radius: 3px;
  background: #fffdf3;
  box-shadow: 0 14px 24px rgba(34, 25, 15, 0.18);
}

.toc-popover {
  left: 0;
  width: min(280px, calc(100vw - 32px));
  max-height: 330px;
  overflow-y: auto;
  padding: 8px 0;
}

.toc-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px 7px;
  color: #2b2115;
  font-size: 13px;
}

.toc-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  width: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #2f2417;
  cursor: pointer;
  font: inherit;
  padding: 8px 12px;
  text-align: left;
}

.toc-item:hover,
.toc-item.active {
  background: #fff1c7;
}

.toc-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-item small {
  color: #e06d00;
  font-weight: 900;
  white-space: nowrap;
}

.toc-empty {
  margin: 0;
  color: #8a7358;
  padding: 16px 12px 10px;
  text-align: center;
}

.settings-popover {
  right: 0;
  display: grid;
  gap: 9px;
  min-width: 156px;
  padding: 12px;
}

.settings-popover strong {
  color: #1f160d;
  font-size: 13px;
}

.settings-row,
.theme-row {
  display: flex;
  gap: 7px;
}

.settings-row button,
.theme-row button,
.read-control {
  border: 0;
  border-radius: 4px;
  background: #55c6ae;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  min-height: 30px;
  padding: 0 12px;
}

.theme-row button {
  background: #fff0bc;
  color: #755114;
}

.theme-row button:nth-child(2) {
  background: #ffffff;
  color: #303030;
}

.theme-row button:nth-child(3) {
  background: #292929;
  color: #ffffff;
}

.theme-row button.active {
  outline: 2px solid #55c6ae;
}

.read-control {
  width: 100%;
  background: #55c6ae;
}

.read-control.secondary {
  background: #e8b72c;
}

.share-status {
  margin: -4px 0 8px;
  color: #b36b10;
  font-size: 12px;
  font-weight: 800;
  text-align: right;
}

.state-card,
.locked-card {
  border: 1px solid #efd88a;
  background: #fff8cc;
  color: #2a2319;
  padding: 28px;
}

.error {
  color: #b91c1c;
}

.locked-card h2 {
  margin: 0 0 8px;
}

.locked-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reader-content {
  min-height: calc(100vh - 230px);
  background: #fff8cc;
  color: #231b12;
  padding: 26px 42px 48px;
  text-align: left;
}

.reader-page.light .reader-content {
  background: #fffefa;
}

.reader-page.dark .reader-content {
  background: #28231d;
  color: #f7ebcf;
}

.reader-content h2 {
  margin: 0 0 24px;
  color: inherit;
  font-size: 1.1em;
  text-align: center;
}

.reader-paragraph {
  margin: 0 0 1.25em;
  text-indent: 2em;
  transition: background 0.16s ease;
}

.reader-paragraph:hover,
.reader-paragraph.is-active {
  background: rgba(245, 201, 71, 0.2);
}

.reader-content.focus .reader-paragraph {
  display: none;
}

.reader-content.focus .reader-paragraph.is-active {
  display: block;
  min-height: 45vh;
  align-content: center;
  font-size: 1.1em;
}

.reader-footer-nav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding-top: 16px;
}

.reader-footer-nav button {
  width: 100%;
  min-height: 36px;
}

.reader-footer-nav button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.reader-page.dark .reader-breadcrumb,
.reader-page.dark .reader-breadcrumb a {
  color: #e8c46d;
}

.reader-page.dark .reader-titlebar {
  border-color: #a96f1d;
}

@media (max-width: 700px) {
  .reader-page {
    min-height: 100svh;
    background: #f8f6f0;
    padding: 0 0 112px;
  }

  .reader-wrap {
    width: 100%;
  }

  .mobile-reader-appbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: 8px;
    align-items: center;
    min-height: 54px;
    background: rgba(248, 246, 240, 0.94);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(31, 31, 31, 0.06);
    padding: 6px 14px;
  }

  .reader-page.dark .mobile-reader-appbar {
    background: rgba(16, 18, 18, 0.9);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .mobile-reader-appbar button {
    display: inline-grid;
    place-items: center;
    min-width: 32px;
    height: 36px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: currentColor;
    cursor: pointer;
    font: inherit;
    font-size: 24px;
    line-height: 1;
    padding: 0;
  }

  .mobile-reader-appbar > span {
    font-size: 14px;
    font-weight: 800;
  }

  .mobile-reader-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .mobile-reader-actions button {
    font-size: 20px;
  }

  .reader-breadcrumb,
  .reader-titlebar {
    display: none;
  }

  .reader-toolbar {
    position: relative;
    z-index: 30;
    display: block;
    height: 0;
    padding: 0;
  }

  .toolbar-left,
  .toolbar-right {
    position: static;
    display: block;
  }

  .toolbar-left > .gold-btn,
  .toolbar-right > .gold-btn {
    display: none;
  }

  .toc-popover {
    position: fixed;
    top: 56px;
    left: 12px;
    width: min(300px, calc(100vw - 24px));
    max-height: min(420px, calc(100svh - 140px));
    border-color: rgba(23, 18, 11, 0.22);
    border-radius: 8px;
    background: #fffef8;
  }

  .settings-popover {
    position: fixed;
    inset: auto 0 0;
    width: auto;
    min-width: 0;
    border: 0;
    border-radius: 18px 18px 0 0;
    background: #ffffff;
    box-shadow: 0 -18px 42px rgba(0, 0, 0, 0.24);
    padding: 22px 24px 28px;
  }

  .settings-popover::before {
    content: "ตั้งค่าการอ่าน";
    color: #1f1f1f;
    font-size: 18px;
    font-weight: 900;
    justify-self: center;
    margin-bottom: 8px;
  }

  .settings-row button,
  .theme-row button,
  .read-control {
    min-height: 36px;
    border-radius: 6px;
  }

  .reader-content {
    min-height: calc(100svh - 166px);
    background: #fbfaf5;
    color: #2a2926;
    padding: 36px 28px 170px;
    text-align: center;
  }

  .reader-page.sepia .reader-content,
  .reader-page.light .reader-content {
    background: #fbfaf5;
  }

  .reader-page.dark .reader-content {
    background: #101212;
    color: #f3efe6;
  }

  .reader-content h2 {
    margin: 0 0 18px;
    font-size: 20px;
  }

  .reader-paragraph {
    margin: 0 0 1.2em;
    color: inherit;
    font-size: 1em;
    text-align: center;
    text-indent: 0;
  }

  .reader-paragraph:first-of-type {
    margin-top: 10px;
  }

  .reader-paragraph:hover,
  .reader-paragraph.is-active {
    background: transparent;
  }

  .mobile-comment-float {
    position: fixed;
    right: 28px;
    top: 240px;
    z-index: 15;
    place-items: center;
    width: 42px;
    height: 42px;
    border: 0;
    border-radius: 999px;
    background: rgba(50, 50, 50, 0.32);
    color: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    font-size: 18px;
  }

  .listen-floating-cta {
    position: fixed;
    left: 50%;
    bottom: 76px;
    z-index: 22;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-width: 172px;
    min-height: 48px;
    border: 0;
    border-radius: 999px;
    background: #55c6bd;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 16px;
    font-weight: 900;
    padding: 0 22px;
    transform: translateX(-50%);
    box-shadow: 0 16px 30px rgba(37, 140, 132, 0.28);
  }

  .listen-floating-cta span {
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
    font-size: 13px;
  }

  .mobile-mini-player {
    position: fixed;
    left: 50%;
    bottom: 70px;
    z-index: 22;
    display: grid;
    grid-template-columns: 38px 30px 42px 30px 28px;
    gap: 2px;
    align-items: center;
    width: min(236px, calc(100vw - 72px));
    min-height: 46px;
    border-radius: 999px;
    background: rgba(21, 21, 21, 0.82);
    color: #ffffff;
    padding: 4px 8px 4px 5px;
    transform: translateX(-50%);
    box-shadow: 0 14px 26px rgba(0, 0, 0, 0.26);
  }

  .mobile-mini-player img {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    object-fit: cover;
  }

  .mobile-mini-player button {
    display: inline-grid;
    place-items: center;
    width: 30px;
    height: 34px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 22px;
    line-height: 1;
  }

  .mobile-mini-player .mini-play {
    width: 42px;
    background: #55c6bd;
    color: #ffffff;
    font-size: 19px;
    font-weight: 900;
  }

  .reader-footer-nav {
    display: none;
  }

  .mobile-bottom-tabs {
    position: fixed;
    inset: auto 0 0;
    z-index: 21;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    min-height: 58px;
    border-top: 1px solid rgba(31, 31, 31, 0.08);
    background: rgba(251, 250, 245, 0.96);
    backdrop-filter: blur(10px);
  }

  .reader-page.dark .mobile-bottom-tabs {
    background: rgba(16, 18, 18, 0.94);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .mobile-bottom-tabs button {
    border: 0;
    background: transparent;
    color: #8a8781;
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    font-weight: 800;
    padding: 8px 3px;
  }

  .mobile-bottom-tabs button.active {
    color: #55c6bd;
  }

  .mobile-bottom-tabs button:disabled {
    opacity: 0.36;
  }

  .listen-mode {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    overflow: hidden;
    background: #050606;
    color: #ffffff;
  }

  .listen-mode::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: var(--cover-url);
    background-size: cover;
    background-position: center top;
    filter: blur(1px);
    opacity: 0.72;
    transform: scale(1.04);
  }

  .listen-mode::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(3, 6, 6, 0.2) 0%, rgba(3, 6, 6, 0.14) 42%, rgba(0, 0, 0, 0.98) 78%),
      linear-gradient(90deg, rgba(0, 0, 0, 0.38), rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.38));
  }

  .listen-mode__scrim {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: rgba(0, 0, 0, 0.08);
  }

  .listen-mode__topbar,
  .listen-mode__content,
  .listen-mode__controls,
  .listen-mode__exit {
    position: relative;
    z-index: 2;
  }

  .listen-mode__topbar {
    display: grid;
    grid-template-columns: 36px 1fr auto 34px 34px;
    gap: 8px;
    align-items: center;
    min-height: 62px;
    padding: 8px 16px;
    color: rgba(255, 255, 255, 0.92);
  }

  .listen-mode__topbar button {
    display: inline-grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.12);
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 26px;
    line-height: 1;
    padding: 0;
  }

  .listen-mode__topbar span {
    min-width: 0;
    overflow: hidden;
    color: #ffffff;
    font-size: 14px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .listen-mode__topbar small {
    color: rgba(255, 255, 255, 0.78);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .listen-mode__content {
    display: grid;
    align-content: end;
    justify-items: center;
    min-height: 0;
    padding: 18px 28px 32px;
    text-align: center;
  }

  .listen-mode__cover {
    width: min(78vw, 320px);
    aspect-ratio: 2 / 3;
    opacity: 0;
    pointer-events: none;
  }

  .listen-mode__cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .listen-mode__content strong {
    color: #ffffff;
    font-size: 24px;
    font-weight: 800;
    line-height: 1;
  }

  .listen-mode__content p {
    width: min(100%, 340px);
    margin: 18px 0 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 17px;
    font-weight: 800;
    line-height: 1.55;
  }

  .listen-mode__controls {
    display: grid;
    grid-template-columns: 1fr 62px 1fr;
    align-items: center;
    width: min(260px, calc(100vw - 96px));
    min-height: 70px;
    margin: 0 auto 20px;
    border-radius: 12px;
    background: rgba(22, 22, 22, 0.82);
    padding: 0 18px;
  }

  .listen-mode__controls button {
    display: inline-grid;
    place-items: center;
    width: 54px;
    height: 54px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: rgba(255, 255, 255, 0.56);
    cursor: pointer;
    font: inherit;
    font-size: 46px;
    line-height: 1;
    padding: 0;
  }

  .listen-mode__controls button:disabled {
    opacity: 0.22;
  }

  .listen-mode__controls .listen-mode__play {
    width: 62px;
    height: 62px;
    background: #55c6bd;
    color: #ffffff;
    font-size: 28px;
    font-weight: 900;
  }

  .listen-mode__exit {
    align-self: end;
    justify-self: center;
    min-height: 42px;
    margin: 0 0 max(22px, env(safe-area-inset-bottom));
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: rgba(255, 255, 255, 0.62);
    cursor: pointer;
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    padding: 0 18px;
  }

  .voice-sheet {
    position: fixed;
    inset: auto 0 0;
    z-index: 4;
    display: grid;
    gap: 22px;
    border-radius: 18px 18px 0 0;
    background: #ffffff;
    color: #1f1f1f;
    padding: 18px 24px max(34px, env(safe-area-inset-bottom));
    box-shadow: 0 -20px 42px rgba(0, 0, 0, 0.35);
  }

  .voice-sheet__head {
    display: grid;
    grid-template-columns: 36px 1fr 36px;
    align-items: center;
    min-height: 34px;
  }

  .voice-sheet__head button {
    display: inline-grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #252525;
    cursor: pointer;
    font: inherit;
    font-size: 26px;
    padding: 0;
  }

  .voice-sheet__head h2 {
    margin: 0;
    color: #1f1f1f;
    font-size: 18px;
    font-weight: 900;
    text-align: center;
  }

  .voice-field {
    display: grid;
    gap: 10px;
  }

  .voice-field > span {
    color: #1f1f1f;
    font-size: 15px;
    font-weight: 900;
  }

  .voice-selector {
    display: grid;
    grid-template-columns: 56px 1fr 56px;
    min-height: 38px;
    border: 1px solid #e2e2e2;
    border-radius: 5px;
    overflow: hidden;
  }

  .voice-selector button,
  .voice-selector select {
    border: 0;
    background: #ffffff;
    color: #2a2a2a;
    font: inherit;
    font-weight: 800;
  }

  .voice-selector button {
    cursor: pointer;
    font-size: 28px;
  }

  .voice-selector button:first-child {
    border-right: 1px solid #ededed;
  }

  .voice-selector button:last-child {
    border-left: 1px solid #ededed;
    color: #d0d0d0;
  }

  .voice-selector select {
    min-width: 0;
    text-align: center;
    text-align-last: center;
  }

  .voice-range-row {
    display: grid;
    grid-template-columns: auto 28px 1fr 28px auto;
    gap: 8px;
    align-items: center;
  }

  .voice-range-row small {
    color: #6f6f6f;
    font-size: 13px;
    font-weight: 800;
  }

  .voice-range-row button {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 999px;
    background: #edf7f5;
    color: #45bdb4;
    cursor: pointer;
    font: inherit;
    font-size: 18px;
    font-weight: 900;
    padding: 0;
  }

  .voice-range-row input[type="range"] {
    width: 100%;
    accent-color: #55c6bd;
  }

  .voice-reset {
    justify-self: center;
    min-height: 42px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #9a9a9a;
    cursor: pointer;
    font: inherit;
    font-size: 15px;
    font-weight: 900;
    padding: 0 18px;
  }
}
</style>
