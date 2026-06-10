<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";
import { accessibilityState, announceAccessibilityMessage } from "../utils/accessibility";

type ReaderResponse = {
  is_locked?: boolean;
  lock_reason?: string;
  title?: string;
  content?: string;
  structured?: StructuredReaderPayload | null;
};

type StructuredSentence = {
  id?: number;
  sentence_uuid?: string;
  display_text?: string;
  tts_text?: string;
  plain_text?: string;
};

type StructuredBlock = {
  id?: number;
  block_order?: number;
  block_type?: string;
  display_text?: string;
  tts_text?: string;
  sentences?: StructuredSentence[];
};

type StructuredReaderPayload = {
  version?: string;
  blocks?: StructuredBlock[];
  sentences?: StructuredSentence[];
  plain_text?: string;
};

type Episode = {
  id: number;
  book_id: number;
  episode_number: number;
  title: string;
  price: number;
  is_free?: number;
  access_type?: "paid" | "free" | "subscription";
  comment_count?: number;
};

type EpisodeComment = {
  id: number;
  user_id: number;
  episode_id: number;
  comment: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  can_manage?: boolean;
};

type ColorMode = "light" | "sepia" | "dark";
type ReadingMode = "continuous" | "focus";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const episodesLoading = ref(false);
const commentsLoading = ref(false);
const commentSaving = ref(false);
const error = ref("");
const lockReason = ref("");
const shareStatus = ref("");
const commentError = ref("");
const commentSuccess = ref("");

const title = ref("อ่าน e-book");
const bookTitle = ref("");
const bookCover = ref("");
const content = ref("");
const structuredBlocks = ref<StructuredBlock[]>([]);

const episodes = ref<Episode[]>([]);
const comments = ref<EpisodeComment[]>([]);

const commentText = ref("");
const editingCommentId = ref<number | null>(null);

const fontSize = ref(20);
const lineHeight = ref(2);
const colorMode = ref<ColorMode>("sepia");
const readingMode = ref<ReadingMode>("continuous");
const rate = ref(1);
const pitch = ref(1);
const volume = ref(1);
const selectedVoice = ref("");
const voices = ref<SpeechSynthesisVoice[]>([]);

const sentences = ref<string[]>([]);
const currentIndex = ref(0);
const isSpeaking = ref(false);
const isPaused = ref(false);
const isTocOpen = ref(false);
const isSettingsOpen = ref(false);
const isCommentsOpen = ref(false);

const currentEpisodeId = computed(() => Number(route.query.episode || 0));
const isEpisodeMode = computed(() => currentEpisodeId.value > 0);
const isAuthenticated = computed(() => Boolean(localStorage.getItem("token")));
const selectedVoiceObject = computed(() => {
  return voices.value.find((voice) => voice.name === selectedVoice.value) || null;
});
const isDarkMode = computed(() => colorMode.value === "dark");
const pageTitle = computed(() => bookTitle.value || title.value || "Read and Voice");
const breadcrumbTitle = computed(() => title.value || pageTitle.value);
const coverUrl = computed(() => resolveAssetUrl(bookCover.value));
const readerKey = computed(() => {
  const bookId = String(route.params.id || "");
  const episodeId = String(route.query.episode || "");
  return episodeId ? `reader-episode-${episodeId}` : `reader-book-${bookId}`;
});
const contentRouteKey = computed(() => `${route.params.id || ""}:${route.query.episode || ""}`);
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
  if (structuredBlocks.value.length) {
    return structuredBlocks.value
      .map((block) => String(block.display_text || block.tts_text || "").trim())
      .filter(Boolean);
  }

  const source = content.value || sentences.value.join(" ");
  return source
    .replace(/<PARA>/g, "\n\n")
    .replace(/\r/g, "")
    .split(/\n\s*\n|\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
});
const currentProgress = computed(() => {
  if (!sentences.value.length) return 0;
  return Math.min(100, Math.round(((currentIndex.value + 1) / sentences.value.length) * 100));
});
const commentPanelTitle = computed(() => {
  if (!isEpisodeMode.value) return "ความคิดเห็น";
  return `ความคิดเห็นตอน ${title.value || ""}`.trim();
});
const readerContentStyle = computed(() => ({
  fontSize: `${Math.max(fontSize.value, Math.round(20 * accessibilityState.fontScale))}px`,
  lineHeight: Math.max(lineHeight.value, accessibilityState.lineSpacing),
  letterSpacing: `${accessibilityState.letterSpacing}em`,
}));

function splitSentences(text: string) {
  return text
    .replace(/<PARA>/g, " <PARA> ")
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, " <PARA> ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+|<PARA>/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => {
      if (item.length <= 220) return [item];
      return item.match(/.{1,180}([,;:]\s*|$)/g)?.map((chunk) => chunk.trim()).filter(Boolean) || [item];
    });
}

function normalizeStructuredSentences(payload?: StructuredReaderPayload | null) {
  if (!payload) return [];

  const directSentences = Array.isArray(payload.sentences) ? payload.sentences : [];
  const blockSentences = Array.isArray(payload.blocks)
    ? payload.blocks.flatMap((block) => Array.isArray(block.sentences) ? block.sentences : [])
    : [];
  const source = directSentences.length ? directSentences : blockSentences;

  return source
    .map((sentence) => String(sentence.tts_text || sentence.display_text || sentence.plain_text || "").trim())
    .filter(Boolean);
}

function loadVoices() {
  const list = window.speechSynthesis.getVoices();
  voices.value = list;

  if (selectedVoice.value && list.some((voice) => voice.name === selectedVoice.value)) {
    return;
  }

  const thaiVoice = list.find((voice) => voice.lang?.toLowerCase().includes("th"));
  selectedVoice.value = thaiVoice?.name || list[0]?.name || "";
}

async function loadReaderSettings() {
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

  if (!isAuthenticated.value) return;

  try {
    const { data } = await api.get("/account/preferences");
    const reader = data?.preferences?.reader || {};
    const tts = data?.preferences?.tts || {};

    if (["light", "sepia", "dark"].includes(reader.color_mode)) {
      colorMode.value = reader.color_mode;
    }
    if (reader.reading_mode === "focus" || reader.reading_mode === "continuous") {
      readingMode.value = reader.reading_mode;
    }
    if (Number.isFinite(Number(reader.font_size))) fontSize.value = Number(reader.font_size);
    if (Number.isFinite(Number(reader.line_height))) lineHeight.value = Number(reader.line_height);
    if (Number.isFinite(Number(tts.rate))) rate.value = Number(tts.rate);
    if (Number.isFinite(Number(tts.pitch))) pitch.value = Number(tts.pitch);
    if (Number.isFinite(Number(tts.volume))) volume.value = Number(tts.volume);
    if (typeof tts.voice === "string") selectedVoice.value = tts.voice;
  } catch {
    // Local settings remain the fallback when preference sync is unavailable.
  }
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

  if (!isAuthenticated.value) return;

  api.put("/account/preferences", {
    preferences: {
      reader: {
        color_mode: colorMode.value,
        reading_mode: readingMode.value,
        font_size: fontSize.value,
        line_height: lineHeight.value,
      },
      tts: {
        rate: rate.value,
        pitch: pitch.value,
        volume: volume.value,
        voice: selectedVoice.value,
      },
    },
  }).catch(() => {
    // Settings are already saved locally.
  });
}

function setColorMode(mode: ColorMode) {
  colorMode.value = mode;
}

function adjustFont(amount: number) {
  fontSize.value = Math.min(36, Math.max(16, fontSize.value + amount));
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
    // Keep local progress as a fallback.
  }
}

function saveProgress() {
  localStorage.setItem(`${readerKey.value}-index`, String(currentIndex.value));

  if (isEpisodeMode.value || !route.params.id || !sentences.value.length) return;

  api.post("/progress", {
    book_id: Number(route.params.id),
    current_page: 1,
    last_position: currentIndex.value,
    progress_percent: currentProgress.value,
    rate: rate.value,
    pitch: pitch.value,
    volume: volume.value,
    voice_name: selectedVoice.value || null,
  }).catch(() => {
    // Keep reading flow quiet if progress sync fails.
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
  structuredBlocks.value = [];
  sentences.value = [];
  currentIndex.value = 0;
  isTocOpen.value = false;
  isSettingsOpen.value = false;
  if (!isEpisodeMode.value) {
    isCommentsOpen.value = false;
  }

  try {
    const endpoint = isEpisodeMode.value
      ? `/reader/episodes/${route.query.episode}/content`
      : `/reader/books/${route.params.id}/content`;

    const { data } = await api.get<ReaderResponse>(endpoint);
    title.value = data.title || (isEpisodeMode.value ? "ตอนนิยาย" : "หนังสือ");

    if (data.is_locked) {
      lockReason.value = data.lock_reason || "ต้องมีสิทธิ์ก่อนจึงจะอ่านเนื้อหาส่วนนี้ได้";
      return;
    }

    structuredBlocks.value = Array.isArray(data.structured?.blocks) ? data.structured.blocks : [];
    content.value = data.structured?.plain_text || data.content || "";
    sentences.value = normalizeStructuredSentences(data.structured);
    if (!sentences.value.length) {
      sentences.value = splitSentences(content.value);
    }
    await loadProgress();
    await scrollToCurrent();
  } catch (err: any) {
    error.value = err?.response?.data?.message || "โหลดเนื้อหาไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function loadEpisodeComments() {
  if (!isEpisodeMode.value || !currentEpisodeId.value) {
    comments.value = [];
    commentText.value = "";
    editingCommentId.value = null;
    commentError.value = "";
    commentSuccess.value = "";
    return;
  }

  commentsLoading.value = true;
  commentError.value = "";

  try {
    const { data } = await api.get(`/episodes/${currentEpisodeId.value}/comments`);
    comments.value = Array.isArray(data?.items) ? data.items : [];
  } catch (err: any) {
    comments.value = [];
    commentError.value = err?.response?.data?.message || "โหลดความคิดเห็นไม่สำเร็จ";
  } finally {
    commentsLoading.value = false;
  }
}

function stopSpeech() {
  window.speechSynthesis.cancel();
  isSpeaking.value = false;
  isPaused.value = false;
}

function toggleSpeechPlayback() {
  if (!sentences.value.length) return;

  if (isSpeaking.value && !isPaused.value && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    isPaused.value = true;
    announceAccessibilityMessage("หยุดการอ่านชั่วคราวแล้ว");
    return;
  }

  if (isPaused.value) {
    window.speechSynthesis.resume();
    isPaused.value = false;
    isSpeaking.value = true;
    announceAccessibilityMessage("อ่านต่อจากตำแหน่งเดิมแล้ว");
    return;
  }

  speakFrom(currentIndex.value);
}

function speakFrom(index: number) {
  if (!sentences.value.length || index < 0 || index >= sentences.value.length) return;

  window.speechSynthesis.cancel();
  isSpeaking.value = false;
  isPaused.value = false;
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
    announceAccessibilityMessage(`กำลังอ่านย่อหน้าที่ ${index + 1}`);
  };

  utterance.onend = () => {
    isSpeaking.value = false;
    isPaused.value = false;
    saveProgress();
  };

  utterance.onerror = () => {
    isSpeaking.value = false;
    isPaused.value = false;
  };

  window.speechSynthesis.speak(utterance);
}

function openListenPage() {
  router.push({
    name: "ReaderListenPage",
    params: route.params,
    query: { ...route.query },
  });
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

function moveReadingFocus(step: number) {
  if (!sentences.value.length) return;

  const nextIndexValue = Math.min(sentences.value.length - 1, Math.max(0, currentIndex.value + step));
  currentIndex.value = nextIndexValue;
  saveProgress();
  scrollToCurrent();
  announceAccessibilityMessage(`เลือกย่อหน้าที่ ${nextIndexValue + 1}`);
}

function toggleComments() {
  isCommentsOpen.value = !isCommentsOpen.value;

  if (isCommentsOpen.value && isEpisodeMode.value && !comments.value.length && !commentsLoading.value) {
    loadEpisodeComments();
  }
}

function resetCommentForm() {
  editingCommentId.value = null;
  commentText.value = "";
  commentError.value = "";
  commentSuccess.value = "";
}

function startEditComment(comment: EpisodeComment) {
  editingCommentId.value = comment.id;
  commentText.value = comment.comment || "";
  commentError.value = "";
  commentSuccess.value = "";
  isCommentsOpen.value = true;
}

async function submitComment() {
  if (!isEpisodeMode.value || !currentEpisodeId.value) return;

  if (!isAuthenticated.value) {
    commentError.value = "กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น";
    return;
  }

  const payload = { comment: commentText.value.trim() };
  if (!payload.comment) {
    commentError.value = "กรุณาพิมพ์ความคิดเห็นก่อนส่ง";
    return;
  }

  commentSaving.value = true;
  commentError.value = "";
  commentSuccess.value = "";

  try {
    if (editingCommentId.value) {
      await api.put(`/episode-comments/${editingCommentId.value}`, payload);
      commentSuccess.value = "แก้ไขความคิดเห็นแล้ว";
    } else {
      await api.post(`/episodes/${currentEpisodeId.value}/comments`, payload);
      commentSuccess.value = "ส่งความคิดเห็นแล้ว";
    }

    announceAccessibilityMessage(commentSuccess.value);

    resetCommentForm();
    await loadEpisodeComments();
  } catch (err: any) {
    commentError.value = err?.response?.data?.message || "บันทึกความคิดเห็นไม่สำเร็จ";
  } finally {
    commentSaving.value = false;
  }
}

async function deleteComment(commentId: number) {
  if (!window.confirm("ต้องการลบความคิดเห็นนี้ใช่ไหม")) return;

  try {
    commentSaving.value = true;
    commentError.value = "";
    commentSuccess.value = "";
    await api.delete(`/episode-comments/${commentId}`);

    if (editingCommentId.value === commentId) {
      resetCommentForm();
    }

    commentSuccess.value = "ลบความคิดเห็นแล้ว";
    announceAccessibilityMessage(commentSuccess.value);
    await loadEpisodeComments();
  } catch (err: any) {
    commentError.value = err?.response?.data?.message || "ลบความคิดเห็นไม่สำเร็จ";
  } finally {
    commentSaving.value = false;
  }
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
    announceAccessibilityMessage(shareStatus.value);
  } catch {
    shareStatus.value = "แชร์ไม่สำเร็จ";
    announceAccessibilityMessage(shareStatus.value);
  }
}

function isEpisodeFree(episode: Episode) {
  return Number(episode.is_free) === 1 || episode.access_type === "free" || Number(episode.price) <= 0;
}

function handleReaderKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  const tagName = target?.tagName?.toLowerCase();

  if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    toggleSpeechPlayback();
    return;
  }

  if (event.code === "ArrowRight" || event.code === "KeyK") {
    event.preventDefault();
    moveReadingFocus(1);
    return;
  }

  if (event.code === "ArrowLeft" || event.code === "KeyJ") {
    event.preventDefault();
    moveReadingFocus(-1);
    return;
  }

  if (event.code === "Escape") {
    isTocOpen.value = false;
    isSettingsOpen.value = false;
    isCommentsOpen.value = false;
  }
}

function handleVoiceReaderCommand(event: Event) {
  const command = (event as CustomEvent<string>).detail;

  if (command === "play") {
    if (isSpeaking.value && !isPaused.value) return;
    toggleSpeechPlayback();
    return;
  }

  if (command === "pause") {
    if (isSpeaking.value && !isPaused.value) toggleSpeechPlayback();
    return;
  }

  if (command === "stop") {
    stopSpeech();
    return;
  }

  if (command === "next") {
    moveReadingFocus(1);
    return;
  }

  if (command === "previous") {
    moveReadingFocus(-1);
  }
}

watch(
  [selectedVoice, rate, pitch, volume, fontSize, lineHeight, colorMode, readingMode],
  saveReaderSettings,
);

watch(contentRouteKey, async () => {
  stopSpeech();
  await fetchContent();
  await loadEpisodeComments();
});

onMounted(async () => {
  await loadReaderSettings();
  if (accessibilityState.enabled) {
    fontSize.value = Math.max(fontSize.value, 24);
    lineHeight.value = Math.max(lineHeight.value, accessibilityState.lineSpacing);
  }
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  window.addEventListener("keydown", handleReaderKeydown);
  window.addEventListener("read-voice:reader-command", handleVoiceReaderCommand as EventListener);
  await Promise.all([loadBookTitle(), loadEpisodes()]);
  await fetchContent();
  await loadEpisodeComments();
});

onBeforeUnmount(() => {
  saveProgress();
  saveReaderSettings();
  stopSpeech();
  window.speechSynthesis.onvoiceschanged = null;
  window.removeEventListener("keydown", handleReaderKeydown);
  window.removeEventListener("read-voice:reader-command", handleVoiceReaderCommand as EventListener);
});
</script>

<template>
  <main class="reader-page" :class="[colorMode, readingMode, { 'accessibility-reader': accessibilityState.enabled }]">
    <div class="reader-wrap">
      <header class="mobile-reader-appbar">
        <button type="button" aria-label="ย้อนกลับ" @click="router.back()">←</button>
        <span>{{ activeEpisodeIndex >= 0 ? `ตอนที่ ${activeEpisodeIndex + 1}` : "หน้าอ่าน" }}</span>
        <div class="mobile-reader-actions">
          <button type="button" aria-label="สารบัญ" @click="isTocOpen = !isTocOpen">☰</button>
          <button type="button" aria-label="ตั้งค่าการอ่าน" @click="isSettingsOpen = !isSettingsOpen">Aa</button>
          <button type="button" aria-label="แชร์" @click="shareReader">↗</button>
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
        <div class="reader-titlebar__copy">
          <h1>{{ pageTitle }}</h1>
          <small v-if="coverUrl && !isEpisodeMode">โหมดอ่าน e-book</small>
          <small v-else-if="isEpisodeMode">โหมดอ่านรายตอนพร้อมความคิดเห็น</small>
        </div>
        <img v-if="coverUrl && !isEpisodeMode" :src="coverUrl" :alt="pageTitle" class="reader-titlebar__cover" />
      </header>

      <section class="reader-toolbar" aria-label="เครื่องมือการอ่าน">
        <div class="toolbar-left">
          <button class="gold-btn" type="button" @click="isTocOpen = !isTocOpen">☰ สารบัญ</button>

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
              <span>ตอน {{ episode.episode_number }} {{ episode.title }}</span>
              <small>
                {{ isEpisodeFree(episode) ? "ฟรี" : `${episode.price || 0} คอยน์` }}
                <template v-if="episode.comment_count"> · {{ episode.comment_count }} ความคิดเห็น</template>
              </small>
            </button>
            <p v-if="!episodesLoading && !episodes.length" class="toc-empty">ยังไม่พบรายการตอน</p>
          </div>
        </div>

        <div class="toolbar-right">
          <button v-if="isEpisodeMode" class="gold-btn" type="button" :class="{ active: isCommentsOpen }" @click="toggleComments">
            💬 ความคิดเห็น
          </button>
          <button class="gold-btn listen-toolbar-btn" type="button" @click="openListenPage">🎧 อ่านให้ฟัง</button>
          <button class="gold-btn" type="button" @click="isSettingsOpen = !isSettingsOpen">A ตั้งค่าการอ่าน</button>
          <button class="gold-btn" type="button" @click="shareReader">แชร์</button>

          <div v-if="isSettingsOpen" class="settings-popover">
            <strong>ขนาดตัวอักษร</strong>
            <div class="settings-row">
              <button type="button" @click="adjustFont(-1)">A-</button>
              <button type="button" @click="adjustFont(1)">A+</button>
            </div>

            <strong>พื้นหลัง</strong>
            <div class="theme-row">
              <button type="button" :class="{ active: colorMode === 'sepia' }" @click="setColorMode('sepia')">กระดาษ</button>
              <button type="button" :class="{ active: colorMode === 'light' }" @click="setColorMode('light')">ครีม</button>
              <button type="button" :class="{ active: colorMode === 'dark' }" @click="setColorMode('dark')">น้ำตาล</button>
            </div>
          </div>
        </div>
      </section>

      <p v-if="shareStatus" class="share-status" aria-live="polite">{{ shareStatus }}</p>

      <section v-if="loading" class="state-card">กำลังโหลดเนื้อหา...</section>
      <section v-else-if="error" class="state-card error" aria-live="assertive">{{ error }}</section>

      <section v-else-if="lockReason" class="locked-card">
        <h2>ยังไม่สามารถอ่านหน้านี้ได้</h2>
        <p>{{ lockReason }}</p>
        <div class="locked-actions">
          <button type="button" @click="router.push(`/book/${route.params.id}`)">กลับไปหน้าหนังสือ</button>
          <button type="button" @click="router.push('/subscription-plans')">ดูแพ็กเกจสมาชิก</button>
        </div>
      </section>

      <div v-else class="reader-main-grid">
        <article id="reader-content" class="reader-content" :class="{ focus: readingMode === 'focus' }" :style="readerContentStyle">
          <h2 v-if="isEpisodeMode">{{ title }}</h2>
          <p
            v-for="(paragraph, index) in paragraphs"
            :key="index"
            class="reader-paragraph"
            :class="{ 'is-active': index === currentIndex }"
            :tabindex="0"
            @click="speakFrom(Math.min(index, sentences.length - 1))"
            @keydown.enter.prevent="speakFrom(Math.min(index, sentences.length - 1))"
          >
            {{ paragraph }}
          </p>
        </article>

        <aside class="comments-panel" :class="{ open: isCommentsOpen }" aria-label="ความคิดเห็น">
          <div class="comments-panel__head">
            <div>
              <strong>{{ commentPanelTitle }}</strong>
              <small v-if="isEpisodeMode">{{ comments.length }} รายการ</small>
              <small v-else>แสดงความคิดเห็นได้ในโหมดอ่านรายตอน</small>
            </div>
            <button type="button" class="ghost-btn" @click="isCommentsOpen = false">ปิด</button>
          </div>

          <template v-if="isEpisodeMode">
            <form class="comment-form" @submit.prevent="submitComment">
              <textarea
                v-model="commentText"
                rows="4"
                :disabled="commentSaving"
                :placeholder="isAuthenticated ? 'พิมพ์ความคิดเห็นเกี่ยวกับตอนนี้' : 'กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น'"
              />
              <div class="comment-form__actions">
                <button type="submit" :disabled="commentSaving || !isAuthenticated">
                  {{
                    commentSaving
                      ? "กำลังบันทึก..."
                      : editingCommentId
                        ? "บันทึกการแก้ไข"
                        : "ส่งความคิดเห็น"
                  }}
                </button>
                <button v-if="editingCommentId" type="button" class="ghost-btn" @click="resetCommentForm">ยกเลิก</button>
                <button v-if="!isAuthenticated" type="button" class="ghost-btn" @click="router.push('/login')">เข้าสู่ระบบ</button>
              </div>
            </form>

            <p v-if="commentError" class="comment-feedback error">{{ commentError }}</p>
            <p v-if="commentSuccess" class="comment-feedback success">{{ commentSuccess }}</p>
            <div v-if="commentsLoading" class="comment-state">กำลังโหลดความคิดเห็น...</div>
            <div v-else-if="!comments.length" class="comment-state">ยังไม่มีความคิดเห็น เริ่มคุยเป็นคนแรกได้เลย</div>

            <article v-for="comment in comments" :key="comment.id" class="comment-item">
              <div class="comment-item__meta">
                <strong>{{ comment.user_name }}</strong>
                <span>{{ new Date(comment.created_at).toLocaleString('th-TH') }}</span>
              </div>
              <p>{{ comment.comment }}</p>
              <div v-if="comment.can_manage" class="comment-item__actions">
                <button type="button" class="ghost-btn" @click="startEditComment(comment)">แก้ไข</button>
                <button type="button" class="ghost-btn danger" @click="deleteComment(comment.id)">ลบ</button>
              </div>
            </article>
          </template>

          <div v-else class="comment-state">
            ความคิดเห็นจะเปิดใช้งานในโหมดอ่านรายตอน เมื่อเปิดตอนนิยายแล้วจึงจะร่วมพูดคุยได้
          </div>
        </aside>
      </div>

      <button v-if="!loading && !error && !lockReason && isEpisodeMode" class="mobile-comment-float" type="button" aria-label="ความคิดเห็น" @click="toggleComments">
        💬
      </button>

      <button v-if="!loading && !error && !lockReason" class="listen-floating-cta" type="button" @click="openListenPage">
        <span>🎧</span>
        อ่านให้ฟัง
      </button>

      <footer v-if="!loading && !error && !lockReason" class="reader-footer-nav">
        <button type="button" :disabled="!previousEpisode" @click="goPreviousEpisode">ตอนก่อนหน้า</button>
        <button type="button" @click="router.push(`/book/${route.params.id}`)">กลับไปหน้าหนังสือ</button>
        <button type="button" :disabled="!nextEpisode" @click="goNextEpisode">ตอนถัดไป</button>
      </footer>

      <nav v-if="!loading && !error && !lockReason" class="mobile-bottom-tabs" aria-label="เมนูหน้าอ่าน">
        <button v-if="isEpisodeMode" type="button" :class="{ active: isCommentsOpen }" @click="toggleComments">คอมเมนต์</button>
        <button type="button" @click="router.push(`/book/${route.params.id}`)">หนังสือ</button>
        <button class="active" type="button" @click="openListenPage">อ่านให้ฟัง</button>
        <button type="button" :disabled="!previousEpisode" @click="goPreviousEpisode">ก่อนหน้า</button>
        <button type="button" :disabled="!nextEpisode" @click="goNextEpisode">ตอนถัดไป</button>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.reader-page {
  min-height: 100vh;
  background:
    linear-gradient(180deg, #f8eed2 0%, #f2dea6 100%),
    repeating-linear-gradient(
      -45deg,
      rgba(205, 161, 70, 0.08) 0,
      rgba(205, 161, 70, 0.08) 10px,
      rgba(255, 255, 255, 0.06) 10px,
      rgba(255, 255, 255, 0.06) 20px
    );
  color: #2a2114;
  padding: 24px 0 96px;
}

.reader-page.light {
  background: #f8f8f5;
  color: #222;
}

.reader-page.dark {
  background: #151311;
  color: #f2ebdd;
}

.reader-page.accessibility-reader {
  padding-bottom: 120px;
}

.reader-wrap {
  width: min(100% - 32px, 1200px);
  margin: 0 auto;
}

.mobile-reader-appbar,
.mobile-bottom-tabs,
.mobile-comment-float,
.listen-floating-cta {
  display: none;
}

.reader-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
  color: #7f673f;
  font-size: 13px;
  font-weight: 800;
}

.reader-breadcrumb a {
  color: inherit;
  text-decoration: none;
}

.reader-titlebar {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 12px;
  border: 1px solid #caa865;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 245, 216, 0.98), rgba(247, 229, 174, 0.98)),
    repeating-linear-gradient(
      -45deg,
      rgba(205, 161, 70, 0.12) 0,
      rgba(205, 161, 70, 0.12) 10px,
      rgba(255, 255, 255, 0.06) 10px,
      rgba(255, 255, 255, 0.06) 20px
    );
  box-shadow: 0 14px 28px rgba(96, 70, 21, 0.14);
  padding: 18px 24px;
}

.reader-titlebar__copy {
  display: grid;
  gap: 4px;
}

.reader-titlebar__copy h1 {
  margin: 0;
  font-size: 28px;
}

.reader-titlebar__copy small {
  color: #7a6644;
  font-weight: 700;
}

.reader-titlebar__cover {
  width: 56px;
  height: 78px;
  object-fit: cover;
  border-radius: 10px;
}

.reader-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
}

.gold-btn,
.settings-popover button,
.toc-item,
.locked-actions button,
.reader-footer-nav button,
.comment-form button,
.ghost-btn {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.gold-btn {
  min-height: 42px;
  background: #cfaa63;
  color: #2d2112;
  padding: 0 16px;
}

.gold-btn.active {
  background: linear-gradient(180deg, #e0b45d, #c48b22);
  color: #ffffff;
}

.toc-popover,
.settings-popover,
.comments-panel,
.state-card,
.locked-card,
.reader-content {
  border: 1px solid rgba(71, 54, 31, 0.12);
  background: rgba(255, 251, 241, 0.94);
  box-shadow: 0 18px 36px rgba(96, 69, 20, 0.12);
}

.toc-popover,
.settings-popover {
  width: min(320px, calc(100vw - 48px));
  border-radius: 18px;
  padding: 14px;
}

.toc-head,
.comments-panel__head,
.comment-item__meta,
.comment-item__actions,
.comment-form__actions,
.locked-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.toc-head {
  margin-bottom: 10px;
}

.toc-item {
  width: 100%;
  display: grid;
  gap: 4px;
  justify-items: start;
  margin-top: 8px;
  background: #f5efe3;
  color: #2a2116;
  padding: 12px 14px;
}

.toc-item.active {
  background: linear-gradient(180deg, #e0b45d, #c48b22);
  color: #ffffff;
}

.toc-empty,
.share-status,
.comment-state,
.comment-feedback,
.reader-titlebar__copy small {
  font-size: 13px;
}

.settings-popover {
  display: grid;
  gap: 12px;
}

.settings-row,
.theme-row {
  display: flex;
  gap: 8px;
}

.settings-popover button {
  min-width: 48px;
  min-height: 38px;
  background: #f0eadf;
  color: #2d2418;
}

.settings-popover button.active {
  background: linear-gradient(180deg, #e0b45d, #c48b22);
  color: #ffffff;
}

.share-status {
  margin: 0 0 14px;
  color: #127769;
  font-weight: 800;
}

.state-card,
.locked-card {
  border-radius: 22px;
  padding: 22px;
}

.state-card.error,
.comment-feedback.error {
  color: #b91c1c;
}

.locked-card h2 {
  margin-top: 0;
}

.locked-actions {
  margin-top: 14px;
}

.locked-actions button {
  min-height: 42px;
  background: #2f2b25;
  color: #ffffff;
  padding: 0 16px;
}

.reader-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;
}

.reader-content {
  border-radius: 24px;
  padding: 28px 32px 40px;
}

.reader-content.focus {
  box-shadow: 0 22px 42px rgba(34, 23, 12, 0.14);
}

.reader-content h2 {
  margin-top: 0;
  margin-bottom: 24px;
}

.reader-paragraph {
  margin: 0 0 1.2em;
  cursor: pointer;
  border-radius: 16px;
  padding: 8px 10px;
  transition: background-color 0.2s ease;
}

.reader-paragraph:hover {
  background: rgba(207, 170, 99, 0.12);
}

.reader-paragraph:focus-visible {
  outline: 3px solid #0f766e;
  outline-offset: 2px;
}

.reader-paragraph.is-active {
  background: rgba(255, 232, 170, 0.54);
}

.accessibility-reader .gold-btn,
.accessibility-reader .reader-footer-nav button,
.accessibility-reader .listen-floating-cta,
.accessibility-reader .mobile-comment-float {
  min-height: 50px;
}

.comments-panel {
  position: sticky;
  top: 24px;
  display: grid;
  gap: 14px;
  border-radius: 24px;
  padding: 18px;
}

.comments-panel__head strong,
.comment-item__meta strong {
  color: #1f1a14;
}

.comments-panel__head small,
.comment-item__meta span,
.comment-state {
  color: #74695c;
}

.comment-form {
  display: grid;
  gap: 10px;
}

.comment-form textarea {
  width: 100%;
  min-height: 120px;
  border: 1px solid #ddd1bf;
  border-radius: 16px;
  background: #fcfaf5;
  color: inherit;
  font: inherit;
  padding: 12px 14px;
  resize: vertical;
}

.comment-form button,
.ghost-btn {
  min-height: 38px;
  padding: 0 14px;
}

.comment-form button {
  background: linear-gradient(180deg, #e0b45d, #c48b22);
  color: #ffffff;
}

.ghost-btn {
  background: #efe8db;
  color: #2f281d;
}

.ghost-btn.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.comment-feedback {
  margin: 0;
  font-weight: 800;
}

.comment-feedback.success {
  color: #15803d;
}

.comment-item {
  display: grid;
  gap: 10px;
  border-top: 1px solid rgba(71, 54, 31, 0.08);
  padding-top: 14px;
}

.comment-item p {
  margin: 0;
  color: #332a21;
  line-height: 1.7;
}

.reader-footer-nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.reader-footer-nav button {
  min-height: 44px;
  background: #2f2b25;
  color: #ffffff;
  padding: 0 16px;
}

.reader-footer-nav button:disabled,
.mobile-bottom-tabs button:disabled,
.comment-form button:disabled,
.ghost-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 960px) {
  .reader-main-grid {
    grid-template-columns: 1fr;
  }

  .comments-panel {
    display: none;
  }

  .comments-panel.open {
    position: fixed;
    inset: 72px 12px 90px;
    z-index: 24;
    display: grid;
    overflow: auto;
  }

  .mobile-reader-appbar,
  .mobile-bottom-tabs,
  .mobile-comment-float,
  .listen-floating-cta {
    display: initial;
  }

  .mobile-reader-appbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .mobile-reader-appbar > button,
  .mobile-reader-actions button {
    min-width: 36px;
    min-height: 36px;
    border: 0;
    border-radius: 999px;
    background: linear-gradient(180deg, #e0b45d, #c48b22);
    color: #ffffff;
    font: inherit;
  }

  .mobile-reader-actions {
    display: flex;
    gap: 8px;
  }

  .reader-breadcrumb,
  .reader-titlebar {
    display: none;
  }

  .reader-toolbar {
    flex-direction: column;
  }

  .mobile-comment-float {
    position: fixed;
    right: 18px;
    top: 220px;
    z-index: 23;
    width: 46px;
    height: 46px;
    border: 0;
    border-radius: 999px;
    background: linear-gradient(180deg, #e0b45d, #c48b22);
    color: #ffffff;
    font-size: 20px;
  }

  .listen-floating-cta {
    position: fixed;
    right: 18px;
    bottom: 84px;
    z-index: 23;
    min-height: 46px;
    border: 0;
    border-radius: 999px;
    background: linear-gradient(180deg, #e0b45d, #c48b22);
    color: #ffffff;
    font: inherit;
    font-weight: 900;
    padding: 0 16px;
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
    background: rgba(255, 248, 233, 0.96);
    backdrop-filter: blur(10px);
  }

  .mobile-bottom-tabs button {
    border: 0;
    background: transparent;
    color: #8a8781;
    font: inherit;
    font-size: 11px;
    font-weight: 800;
    padding: 8px 3px;
  }

  .mobile-bottom-tabs button.active {
    color: #55c6bd;
  }
}

@media (max-width: 640px) {
  .reader-wrap {
    width: min(100% - 20px, 100%);
  }

  .reader-content {
    padding: 22px 16px 100px;
  }
}
</style>







