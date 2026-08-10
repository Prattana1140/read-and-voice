<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "../utils/i18n";
import type { ReaderVoiceCommand } from "../utils/voiceCommands";

type ListenSession = {
  active?: boolean;
  title?: string;
  bookTitle?: string;
  description?: string;
  coverUrl?: string;
  route?: string;
  isSpeaking?: boolean;
  isPaused?: boolean;
  isPreparing?: boolean;
  currentIndex?: number;
  total?: number;
  bookId?: string;
  episodeId?: string;
  updatedAt?: number;
};

type PlayerPosition = {
  x: number;
  y: number;
};

const SESSION_KEY = "read-voice-listen-session";
const POSITION_KEY = "read-voice-listen-mini-position";
const HIDDEN_KEY = "read-voice-listen-mini-hidden";
const READER_TTS_ACTIVE_KEY = "read-voice-reader-tts-active";
const PENDING_LISTEN_COMMAND_KEY = "read-voice-pending-listen-command";
const EDGE_PADDING = 12;

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const session = ref<ListenSession | null>(null);
const hidden = ref(localStorage.getItem(HIDDEN_KEY) === "true");
const isSpeaking = ref(false);
const isPaused = ref(false);
const position = ref<PlayerPosition>({ x: 24, y: 120 });
const dragging = ref(false);
const dragMoved = ref(false);
let dragOffset = { x: 0, y: 0 };
let dragStart = { x: 0, y: 0 };
let statusTimer: number | undefined;

const shouldShow = computed(() => {
  return Boolean(session.value?.active && route.name !== "ReaderListenPage");
});

const progressLabel = computed(() => {
  const current = Number(session.value?.currentIndex || 0) + 1;
  const total = Number(session.value?.total || 0);
  return total > 0 ? `${Math.min(current, total)} / ${total}` : "";
});

function clampPosition(next: PlayerPosition): PlayerPosition {
  if (typeof window === "undefined") return next;
  const width = hidden.value ? 58 : 320;
  const height = hidden.value ? 58 : 122;
  return {
    x: Math.min(Math.max(next.x, EDGE_PADDING), Math.max(EDGE_PADDING, window.innerWidth - width - EDGE_PADDING)),
    y: Math.min(Math.max(next.y, EDGE_PADDING), Math.max(EDGE_PADDING, window.innerHeight - height - EDGE_PADDING)),
  };
}

function savePosition() {
  localStorage.setItem(POSITION_KEY, JSON.stringify(position.value));
}

function loadPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
      position.value = clampPosition({ x: saved.x, y: saved.y });
    } else {
      position.value = clampPosition({
        x: window.innerWidth - 344,
        y: window.innerHeight - 170,
      });
    }
  } catch {
    position.value = clampPosition({
      x: window.innerWidth - 344,
      y: window.innerHeight - 170,
    });
  }
}

function readSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    session.value = parsed?.active ? parsed : null;
  } catch {
    session.value = null;
  }
}

function syncSpeechStatus() {
  isPaused.value = Boolean(session.value?.isPaused || window.speechSynthesis.paused);
  isSpeaking.value = Boolean(session.value?.isSpeaking || session.value?.isPreparing || (window.speechSynthesis.speaking && !window.speechSynthesis.paused));
}

function updateSession(event: Event) {
  const detail = (event as CustomEvent<ListenSession>).detail;
  if (detail?.active === false) {
    session.value = null;
    return;
  }
  session.value = detail?.active ? detail : session.value;
  syncSpeechStatus();
}

function updateStoredSession(patch: Partial<ListenSession>) {
  if (!session.value) return;
  session.value = { ...session.value, ...patch, updatedAt: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session.value));
  window.dispatchEvent(new CustomEvent("read-voice:listen-session", { detail: session.value }));
}

function queueListenCommand(command: ReaderVoiceCommand) {
  if (!session.value?.route) return;
  localStorage.setItem(
    PENDING_LISTEN_COMMAND_KEY,
    JSON.stringify({
      command,
      route: session.value.route,
      bookId: session.value.bookId || "",
      episodeId: session.value.episodeId || "",
      at: Date.now(),
    }),
  );
  if (route.name !== "ReaderListenPage") {
    router.push(session.value.route);
  }
}

function dispatchReaderCommand(command: ReaderVoiceCommand) {
  window.dispatchEvent(new CustomEvent("read-voice:reader-command", { detail: command }));
}

function togglePlayback() {
  const command: ReaderVoiceCommand = isSpeaking.value ? "pause" : "play";

  if (command === "pause") {
    dispatchReaderCommand("pause");
    if ("speechSynthesis" in window && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
    updateStoredSession({ isSpeaking: false, isPaused: true, isPreparing: false });
    localStorage.setItem(READER_TTS_ACTIVE_KEY, "true");
    syncSpeechStatus();
    return;
  }

  if ("speechSynthesis" in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    dispatchReaderCommand("play");
    updateStoredSession({ isSpeaking: true, isPaused: false, isPreparing: false });
    localStorage.setItem(READER_TTS_ACTIVE_KEY, "true");
    syncSpeechStatus();
    return;
  }

  if (route.name === "ReaderListenPage") {
    dispatchReaderCommand("play");
    syncSpeechStatus();
    return;
  }
  queueListenCommand("play");
  syncSpeechStatus();
}

function runListenCommand(command: ReaderVoiceCommand) {
  if (command === "stop") {
    closePlayer();
    return;
  }

  if (command === "play" || command === "pause") {
    togglePlayback();
    return;
  }

  queueListenCommand(command);
}

function closePlayer() {
  dispatchReaderCommand("stop");
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  session.value = null;
  localStorage.setItem(READER_TTS_ACTIVE_KEY, "false");
  localStorage.removeItem(PENDING_LISTEN_COMMAND_KEY);
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ active: false, isSpeaking: false, isPaused: false }),
  );
  window.dispatchEvent(new CustomEvent("read-voice:listen-session", {
    detail: { active: false },
  }));
}

function hidePlayer() {
  hidden.value = true;
  localStorage.setItem(HIDDEN_KEY, "true");
  position.value = clampPosition(position.value);
  savePosition();
}

function showPlayer() {
  if (dragMoved.value) return;
  hidden.value = false;
  localStorage.setItem(HIDDEN_KEY, "false");
  position.value = clampPosition(position.value);
  savePosition();
}

function openListenPage() {
  if (dragMoved.value) return;
  if (session.value?.route) router.push(session.value.route);
}

function startDrag(event: PointerEvent) {
  const targetElement = event.target as HTMLElement | null;
  if (
    targetElement?.closest("button, a, input, textarea, select")
    && !targetElement.closest(".listen-mini__bubble")
  ) {
    return;
  }

  dragging.value = true;
  dragMoved.value = false;
  const target = event.currentTarget as HTMLElement;
  target.setPointerCapture(event.pointerId);
  dragStart = {
    x: event.clientX,
    y: event.clientY,
  };
  dragOffset = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y,
  };
}

function moveDrag(event: PointerEvent) {
  if (!dragging.value) return;
  if (Math.abs(event.clientX - dragStart.x) > 4 || Math.abs(event.clientY - dragStart.y) > 4) {
    dragMoved.value = true;
  }
  position.value = clampPosition({
    x: event.clientX - dragOffset.x,
    y: event.clientY - dragOffset.y,
  });
}

function stopDrag(event: PointerEvent) {
  if (!dragging.value) return;
  dragging.value = false;
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  savePosition();
  window.setTimeout(() => {
    dragMoved.value = false;
  }, 120);
}

function handleResize() {
  position.value = clampPosition(position.value);
  savePosition();
}

onMounted(() => {
  loadPosition();
  readSession();
  syncSpeechStatus();
  window.addEventListener("read-voice:listen-session", updateSession as EventListener);
  window.addEventListener("resize", handleResize);
  statusTimer = window.setInterval(syncSpeechStatus, 700);
});

onBeforeUnmount(() => {
  window.removeEventListener("read-voice:listen-session", updateSession as EventListener);
  window.removeEventListener("resize", handleResize);
  if (statusTimer) window.clearInterval(statusTimer);
});
</script>

<template>
  <aside
    v-if="shouldShow"
    class="listen-mini"
    :class="{ 'listen-mini--hidden': hidden, 'is-dragging': dragging }"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @pointerdown="startDrag"
    @pointermove="moveDrag"
    @pointerup="stopDrag"
    @pointercancel="stopDrag"
  >
    <button
      v-if="hidden"
      class="listen-mini__bubble"
      type="button"
      :aria-label="t('listen.showMini')"
      @click="showPlayer"
    >
      🎧
    </button>

    <template v-else>
      <div
        class="listen-mini__handle"
        :title="t('listen.dragMini')"
      >
        <span></span>
        <span></span>
      </div>

      <img
        v-if="session?.coverUrl"
        class="listen-mini__cover"
        :src="session.coverUrl"
        alt=""
      />

      <div class="listen-mini__copy" @click="openListenPage">
        <strong>{{ session?.title || t("listen.title") }}</strong>
        <span>{{ session?.bookTitle || session?.description }}</span>
        <small>{{ progressLabel }}</small>
      </div>

      <div class="listen-mini__actions">
        <button type="button" :aria-label="t('listen.previous')" @click="runListenCommand('previous')">‹</button>
        <button type="button" :aria-label="isSpeaking ? t('listen.pause') : t('listen.play')" @click="togglePlayback">
          {{ isSpeaking ? "Ⅱ" : "▶" }}
        </button>
        <button type="button" :aria-label="t('listen.next')" @click="runListenCommand('next')">›</button>
        <button type="button" aria-label="ลดความเร็ว" @click="runListenCommand('slower')">−</button>
        <button type="button" aria-label="เพิ่มความเร็ว" @click="runListenCommand('faster')">+</button>
        <button type="button" :aria-label="t('listen.hideMini')" @click="hidePlayer">−</button>
        <button type="button" :aria-label="t('listen.closeMini')" @click="closePlayer">×</button>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.listen-mini {
  position: fixed;
  z-index: 150;
  display: grid;
  grid-template-columns: 40px 52px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  width: min(320px, calc(100vw - 24px));
  min-height: 104px;
  border: 1px solid rgba(20, 184, 166, 0.24);
  border-radius: 16px;
  background: rgba(12, 18, 19, 0.92);
  color: #ffffff;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.24);
  padding: 10px;
  backdrop-filter: blur(16px);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.listen-mini.is-dragging {
  cursor: grabbing;
}

.listen-mini--hidden {
  display: block;
  width: auto;
  min-height: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.listen-mini__bubble {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border: 1px solid rgba(20, 184, 166, 0.28);
  border-radius: 999px;
  background: #101819;
  color: #ffffff;
  cursor: grab;
  font-size: 22px;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.22);
}

.listen-mini__handle {
  display: grid;
  place-items: center;
  align-self: stretch;
  border-radius: 12px;
  cursor: grab;
}

.listen-mini__handle span {
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.36);
}

.listen-mini__cover {
  width: 52px;
  height: 72px;
  border-radius: 8px;
  object-fit: cover;
}

.listen-mini__copy {
  display: grid;
  gap: 3px;
  min-width: 0;
  cursor: grab;
}

.listen-mini__copy strong,
.listen-mini__copy span,
.listen-mini__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.listen-mini__copy strong {
  font-size: 14px;
  line-height: 1.25;
}

.listen-mini__copy span,
.listen-mini__copy small {
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
  font-weight: 700;
}

.listen-mini__actions {
  display: grid;
  grid-template-columns: repeat(4, 32px);
  gap: 5px;
}

.listen-mini__actions button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 15px;
  font-weight: 900;
  padding: 0;
}

.listen-mini__actions button:nth-child(2) {
  background: #55c6bd;
}

@media (max-width: 520px) {
  .listen-mini {
    grid-template-columns: 28px 44px minmax(0, 1fr);
    width: calc(100vw - 24px);
  }

  .listen-mini__cover {
    width: 44px;
    height: 60px;
  }

  .listen-mini__actions {
    grid-column: 1 / -1;
    grid-template-columns: repeat(7, 1fr);
  }

  .listen-mini__actions button {
    width: 100%;
  }
}
</style>
