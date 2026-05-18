<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";

type ReaderResponse = {
  is_locked?: boolean;
  lock_reason?: string;
  title?: string;
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

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const episodesLoading = ref(false);
const error = ref("");
const lockReason = ref("");
const title = ref("หน้าอ่าน");
const bookTitle = ref("");
const bookCover = ref("");
const content = ref("");
const episodes = ref<Episode[]>([]);

const voices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoice = ref("");
const rate = ref(1);
const pitch = ref(1);
const volume = ref(1);

const sentences = ref<string[]>([]);
const currentIndex = ref(0);
const isSpeaking = ref(false);
const isPaused = ref(false);
const hasAudioSession = ref(false);
const shareStatus = ref("");

const currentEpisodeId = computed(() => Number(route.query.episode || 0));
const isEpisodeMode = computed(() => !!currentEpisodeId.value);
const isAuthenticated = computed(() => Boolean(localStorage.getItem("token")));
const contentRouteKey = computed(() => `${route.params.id || ""}:${route.query.episode || ""}`);
const readerKey = computed(() => {
  const bookId = String(route.params.id || "");
  const episodeId = String(route.query.episode || "");
  return episodeId ? `reader-episode-${episodeId}` : `reader-book-${bookId}`;
});
const selectedVoiceObject = computed(() => {
  return voices.value.find((voice) => voice.name === selectedVoice.value) || null;
});
const pageTitle = computed(() => bookTitle.value || title.value || "Read and Voice");
const coverUrl = computed(() => resolveAssetUrl(bookCover.value));
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
const listenSubtitle = computed(() => {
  const index = activeEpisodeIndex.value >= 0 ? activeEpisodeIndex.value + 1 : 1;
  return isEpisodeMode.value ? String(index) : "1";
});
const listenEpisodeCount = computed(() => `${episodes.value.length || 1} ตอน`);
const listenTrackTitle = computed(() => {
  if (isEpisodeMode.value) {
    return title.value || `ตอนที่ ${listenSubtitle.value}`;
  }

  return pageTitle.value;
});
const listenDescription = computed(() => {
  return sentences.value[currentIndex.value] || pageTitle.value;
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
    .split(/(?<=[.!?ๆฯ])\s+|<PARA>/)
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

async function loadVoiceSettings() {
  rate.value = Number(localStorage.getItem("reader-rate") || 1);
  pitch.value = Number(localStorage.getItem("reader-pitch") || 1);
  volume.value = Number(localStorage.getItem("reader-volume") || 1);
  selectedVoice.value = localStorage.getItem("reader-voice") || "";

  if (!isAuthenticated.value) return;

  try {
    const { data } = await api.get("/account/preferences");
    const tts = data?.preferences?.tts || {};
    if (Number.isFinite(Number(tts.rate))) rate.value = Number(tts.rate);
    if (Number.isFinite(Number(tts.pitch))) pitch.value = Number(tts.pitch);
    if (Number.isFinite(Number(tts.volume))) volume.value = Number(tts.volume);
    if (typeof tts.voice === "string") selectedVoice.value = tts.voice;
  } catch {
    // Local voice settings remain the fallback.
  }
}

function saveVoiceSettings() {
  localStorage.setItem("reader-rate", String(rate.value));
  localStorage.setItem("reader-pitch", String(pitch.value));
  localStorage.setItem("reader-volume", String(volume.value));
  localStorage.setItem("reader-voice", selectedVoice.value);

  if (!isAuthenticated.value) return;

  api.put("/account/preferences", {
    preferences: {
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
    // Local progress is enough.
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
    // Keep playback quiet if sync fails.
  });
}

async function fetchContent() {
  loading.value = true;
  error.value = "";
  lockReason.value = "";
  content.value = "";
  sentences.value = [];
  currentIndex.value = 0;

  try {
    const endpoint = isEpisodeMode.value
      ? `/reader/episodes/${route.query.episode}/content`
      : `/reader/books/${route.params.id}/content`;

    const { data } = await api.get<ReaderResponse>(endpoint);
    title.value = data.title || (isEpisodeMode.value ? "ตอนนิยาย" : "หนังสือ");

    if (data.is_locked) {
      lockReason.value = data.lock_reason || "ต้องมีสิทธิ์ก่อนจึงจะฟังได้";
      return;
    }

    content.value = data.content || "";
    sentences.value = splitSentences(content.value);
    await loadProgress();
    await nextTick();
    resume();
  } catch (err: any) {
    error.value = err?.response?.data?.message || "โหลดเนื้อหาสำหรับอ่านให้ฟังไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

function stopSpeech() {
  window.speechSynthesis.cancel();
  isSpeaking.value = false;
  isPaused.value = false;
  hasAudioSession.value = false;
}

function speakFrom(index: number) {
  if (!sentences.value.length || index < 0 || index >= sentences.value.length) return;

  window.speechSynthesis.cancel();
  currentIndex.value = index;
  hasAudioSession.value = true;
  isSpeaking.value = false;
  isPaused.value = false;
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
  };

  utterance.onend = () => {
    saveProgress();
    const nextIndex = currentIndex.value + 1;
    if (nextIndex < sentences.value.length) {
      speakFrom(nextIndex);
      return;
    }

    isSpeaking.value = false;
    isPaused.value = false;
  };

  utterance.onerror = () => {
    isSpeaking.value = false;
    isPaused.value = false;
  };

  window.speechSynthesis.speak(utterance);
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
  if (!sentences.value.length) return;

  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    hasAudioSession.value = true;
    isPaused.value = false;
    isSpeaking.value = true;
    return;
  }

  speakFrom(currentIndex.value);
}

function toggleAudio() {
  if (isSpeaking.value) {
    pause();
    return;
  }

  resume();
}

function handleVoiceReaderCommand(event: Event) {
  const command = (event as CustomEvent<string>).detail;

  if (command === "play") {
    resume();
    return;
  }

  if (command === "pause") {
    pause();
    return;
  }

  if (command === "stop") {
    stopSpeech();
    return;
  }

  if (command === "next") {
    nextSentence();
    return;
  }

  if (command === "previous") {
    previousSentence();
  }
}

function previousSentence() {
  if (currentIndex.value > 0) speakFrom(currentIndex.value - 1);
}

function nextSentence() {
  if (currentIndex.value < sentences.value.length - 1) speakFrom(currentIndex.value + 1);
}

function adjustRate(amount: number) {
  rate.value = Number(Math.min(2, Math.max(0.5, rate.value + amount)).toFixed(1));
}

function goBackToReader() {
  router.replace({
    name: "ReaderPage",
    params: { id: route.params.id },
    query: { ...route.query },
  });
}

function openEpisode(episode: Episode) {
  stopSpeech();
  router.push({
    name: "ReaderListenPage",
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
    title: listenTrackTitle.value,
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

watch([selectedVoice, rate, pitch, volume], saveVoiceSettings);

watch(contentRouteKey, async () => {
  stopSpeech();
  await Promise.all([loadBookTitle(), loadEpisodes()]);
  await fetchContent();
});

onMounted(async () => {
  await loadVoiceSettings();
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  await Promise.all([loadBookTitle(), loadEpisodes()]);
  await fetchContent();
  window.addEventListener("read-voice:reader-command", handleVoiceReaderCommand as EventListener);
});

onBeforeUnmount(() => {
  saveProgress();
  saveVoiceSettings();
  stopSpeech();
  window.speechSynthesis.onvoiceschanged = null;
  window.removeEventListener("read-voice:reader-command", handleVoiceReaderCommand as EventListener);
});
</script>

<template>
  <main class="listen-page" :style="{ '--cover-url': `url(${coverUrl})` }">
    <div class="listen-page__backdrop"></div>
    <div class="listen-page__overlay"></div>

    <header class="listen-page__topbar">
      <button type="button" aria-label="กลับหน้าอ่าน" @click="goBackToReader">‹</button>
      <div class="listen-page__title-group">
        <strong>{{ pageTitle }}</strong>
        <small v-if="episodesLoading">กำลังโหลดตอน...</small>
        <small v-else>{{ listenEpisodeCount }}</small>
      </div>
      <button type="button" aria-label="แชร์" @click="shareReader">↗</button>
    </header>

    <section v-if="loading" class="listen-page__state">
      กำลังเตรียมโหมดอ่านให้ฟัง...
    </section>

    <section v-else-if="error" class="listen-page__state listen-page__state--error">
      {{ error }}
    </section>

    <section v-else-if="lockReason" class="listen-page__state listen-page__state--locked">
      <h2>ยังไม่สามารถฟังได้</h2>
      <p>{{ lockReason }}</p>
      <div class="listen-page__locked-actions">
        <button type="button" @click="router.push(`/book/${route.params.id}`)">กลับไปหน้ารายละเอียด</button>
        <button type="button" @click="goBackToReader">กลับหน้าอ่าน</button>
      </div>
    </section>

    <template v-else>
      <section class="listen-page__content">
        <span class="listen-page__count">{{ listenEpisodeCount }}</span>
        <div class="listen-page__cover">
          <img :src="coverUrl" :alt="pageTitle" />
        </div>
        <strong class="listen-page__index">{{ listenSubtitle }}</strong>
        <p class="listen-page__track">{{ listenTrackTitle }}</p>
        <p class="listen-page__caption">{{ listenDescription }}</p>
        <p v-if="shareStatus" class="listen-page__share-status">{{ shareStatus }}</p>
      </section>

      <section class="listen-page__controls">
        <button type="button" :disabled="currentIndex <= 0" @click="previousSentence">‹</button>
        <button class="listen-page__play" type="button" @click="toggleAudio">
          {{ isSpeaking ? "Ⅱ" : "▶" }}
        </button>
        <button type="button" :disabled="currentIndex >= sentences.length - 1" @click="nextSentence">›</button>
      </section>

      <section class="listen-page__episode-nav">
        <button type="button" :disabled="!previousEpisode" @click="goPreviousEpisode">ตอนก่อนหน้า</button>
        <button type="button" :disabled="!nextEpisode" @click="goNextEpisode">ตอนถัดไป</button>
      </section>

      <section class="listen-page__voice">
        <label>
          <span>เสียง</span>
          <select v-model="selectedVoice">
            <option v-for="voice in voices" :key="voice.name" :value="voice.name">
              {{ voice.name }}
            </option>
          </select>
        </label>
        <label>
          <span>ความเร็ว {{ rate.toFixed(1) }}</span>
          <div class="listen-page__range">
            <button type="button" @click="adjustRate(-0.1)">−</button>
            <input v-model="rate" type="range" min="0.5" max="2" step="0.1" />
            <button type="button" @click="adjustRate(0.1)">+</button>
          </div>
        </label>
      </section>

      <button class="listen-page__exit" type="button" @click="goBackToReader">
        ออกจากโหมดอ่านให้ฟัง
      </button>
    </template>
  </main>
</template>

<style scoped>
.listen-page {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto auto auto;
  min-height: 100svh;
  overflow: hidden;
  background: #050606;
  color: #ffffff;
}

.listen-page__backdrop,
.listen-page__overlay {
  position: absolute;
  inset: 0;
}

.listen-page__backdrop {
  background-image: var(--cover-url);
  background-position: center top;
  background-size: cover;
  filter: blur(2px);
  opacity: 0.78;
  transform: scale(1.04);
}

.listen-page__overlay {
  background:
    linear-gradient(180deg, rgba(2, 9, 12, 0.3) 0%, rgba(2, 8, 10, 0.12) 20%, rgba(0, 0, 0, 0.7) 60%, rgba(0, 0, 0, 0.98) 84%),
    linear-gradient(90deg, rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.32));
}

.listen-page__topbar,
.listen-page__content,
.listen-page__controls,
.listen-page__episode-nav,
.listen-page__voice,
.listen-page__exit,
.listen-page__state {
  position: relative;
  z-index: 1;
}

.listen-page__topbar {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  gap: 10px;
  align-items: center;
  padding: max(10px, env(safe-area-inset-top)) 16px 8px;
}

.listen-page__topbar button {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.24);
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 24px;
  padding: 0;
}

.listen-page__title-group {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.listen-page__title-group strong,
.listen-page__title-group small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.listen-page__title-group strong {
  font-size: 15px;
}

.listen-page__title-group small {
  color: rgba(255, 255, 255, 0.76);
  font-size: 12px;
  font-weight: 700;
}

.listen-page__content {
  display: grid;
  align-content: start;
  justify-items: center;
  padding: 8px 20px 20px;
  text-align: center;
}

.listen-page__count {
  justify-self: end;
  border-radius: 999px;
  background: rgba(5, 16, 18, 0.72);
  color: rgba(255, 255, 255, 0.96);
  font-size: 13px;
  font-weight: 900;
  margin-bottom: 12px;
  padding: 10px 16px;
}

.listen-page__cover {
  width: min(100%, 420px);
  aspect-ratio: 2 / 3;
  border-radius: 0 0 26px 26px;
  overflow: hidden;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.36);
}

.listen-page__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.listen-page__index {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  margin-top: 18px;
}

.listen-page__track,
.listen-page__caption,
.listen-page__share-status {
  width: min(100%, 360px);
  margin: 0;
}

.listen-page__track {
  font-size: 17px;
  font-weight: 800;
  line-height: 1.55;
  margin-top: 10px;
}

.listen-page__caption {
  color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.6;
  margin-top: 8px;
}

.listen-page__share-status {
  color: #8bf4ea;
  font-size: 12px;
  font-weight: 800;
  margin-top: 10px;
}

.listen-page__controls {
  display: grid;
  grid-template-columns: 1fr 84px 1fr;
  align-items: center;
  width: min(330px, calc(100vw - 56px));
  min-height: 112px;
  margin: 0 auto 14px;
  border-radius: 26px;
  background: rgba(24, 24, 24, 0.92);
  padding: 0 24px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
}

.listen-page__controls button {
  width: 60px;
  height: 60px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.36);
  cursor: pointer;
  font: inherit;
  font-size: 24px;
  font-weight: 900;
  padding: 0;
}

.listen-page__controls button:disabled,
.listen-page__episode-nav button:disabled {
  opacity: 0.24;
  cursor: not-allowed;
}

.listen-page__play {
  width: 84px !important;
  height: 84px !important;
  background: #55c6bd !important;
  color: #ffffff !important;
  font-size: 30px !important;
  box-shadow: 0 14px 24px rgba(85, 198, 189, 0.28);
}

.listen-page__episode-nav,
.listen-page__voice {
  width: min(360px, calc(100vw - 44px));
  margin: 0 auto;
}

.listen-page__episode-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.listen-page__episode-nav button,
.listen-page__locked-actions button {
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  padding: 0 16px;
}

.listen-page__voice {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(10, 10, 10, 0.44);
  backdrop-filter: blur(10px);
}

.listen-page__voice label {
  display: grid;
  gap: 8px;
}

.listen-page__voice span {
  font-size: 14px;
  font-weight: 800;
}

.listen-page__voice select,
.listen-page__voice input {
  width: 100%;
}

.listen-page__voice select {
  min-height: 40px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font: inherit;
  padding: 0 12px;
}

.listen-page__range {
  display: grid;
  grid-template-columns: 34px 1fr 34px;
  gap: 8px;
  align-items: center;
}

.listen-page__range button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 18px;
  font-weight: 900;
  padding: 0;
}

.listen-page__range input[type="range"] {
  accent-color: #55c6bd;
}

.listen-page__exit {
  justify-self: center;
  min-height: 42px;
  margin: 18px 0 max(26px, env(safe-area-inset-bottom));
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.66);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  padding: 0 18px;
}

.listen-page__state {
  align-self: center;
  width: min(420px, calc(100vw - 40px));
  margin: 0 auto;
  border-radius: 22px;
  background: rgba(15, 15, 15, 0.84);
  padding: 28px 24px;
  text-align: center;
}

.listen-page__state--error {
  color: #ffb4b4;
}

.listen-page__state--locked h2 {
  margin: 0 0 10px;
}

.listen-page__state--locked p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
}

.listen-page__locked-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

@media (min-width: 900px) {
  .listen-page {
    grid-template-rows: auto 1fr auto auto;
  }

  .listen-page__content {
    padding-top: 20px;
  }

  .listen-page__count {
    justify-self: center;
  }
}
</style>
