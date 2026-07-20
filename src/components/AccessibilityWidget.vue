<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  accessibilityState,
  announceAccessibilityMessage,
  toggleAccessibilityMode,
  updateAccessibilitySettings,
} from "../utils/accessibility";
import api from "../utils/api";
import { useI18n } from "../utils/i18n";

type WidgetPosition = {
  x: number;
  y: number;
};

type ExternalAnchorRect = {
  bottom: number;
  left: number;
  right: number;
  width: number;
};

const POSITION_STORAGE_KEY = "read-voice-accessibility-widget-position";
const LAUNCHER_WIDTH = 64;
const LAUNCHER_HEIGHT = 64;
const EDGE_PADDING = 12;
const PANEL_WIDTH = 360;
const PANEL_GAP = 10;
const MIN_PANEL_SPACE = 320;
const DRAG_THRESHOLD = 4;

const isOpen = ref(false);
const openedFromExternal = ref(false);
const externalAnchor = ref<ExternalAnchorRect | null>(null);
const position = ref<WidgetPosition>({ x: 0, y: 0 });
const viewportSize = ref({ width: 0, height: 0 });
const isDragging = ref(false);
const movedDuringPointer = ref(false);
const widgetRef = ref<HTMLElement | null>(null);
const { t } = useI18n();

let dragStartX = 0;
let dragStartY = 0;
let dragStartPosition: WidgetPosition = { x: 0, y: 0 };

const widgetStyle = computed(() => {
  if (openedFromExternal.value && externalAnchor.value) {
    const panelWidth = Math.min(340, Math.max(0, viewportSize.value.width - EDGE_PADDING * 2));
    const left = Math.min(
      Math.max(externalAnchor.value.right - panelWidth, EDGE_PADDING),
      Math.max(EDGE_PADDING, viewportSize.value.width - panelWidth - EDGE_PADDING),
    );
    const top = Math.max(EDGE_PADDING, externalAnchor.value.bottom + PANEL_GAP);

    return {
      "--a11y-panel-left": `${left}px`,
      "--a11y-panel-top": `${top}px`,
      "--a11y-panel-width": `${panelWidth}px`,
    };
  }

  if (!accessibilityState.enabled || openedFromExternal.value) return {};

  return {
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
  };
});

const panelAlignsLeft = computed(() => {
  if (viewportSize.value.width <= 640) return false;

  return position.value.x + LAUNCHER_WIDTH - PANEL_WIDTH < EDGE_PADDING;
});

const panelOpensUp = computed(() => {
  if (viewportSize.value.width <= 640) return false;

  const spaceBelow = viewportSize.value.height - position.value.y - LAUNCHER_HEIGHT - PANEL_GAP - EDGE_PADDING;
  const spaceAbove = position.value.y - PANEL_GAP - EDGE_PADDING;

  return spaceBelow < MIN_PANEL_SPACE && spaceAbove > spaceBelow;
});

const fontPercent = computed(() => `${Math.round(accessibilityState.fontScale * 100)}%`);

const shouldRenderWidget = computed(() => isOpen.value);

const updateViewportSize = () => {
  viewportSize.value = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const clampPosition = (next: WidgetPosition): WidgetPosition => {
  if (typeof window === "undefined") return next;

  const maxX = Math.max(EDGE_PADDING, window.innerWidth - LAUNCHER_WIDTH - EDGE_PADDING);
  const maxY = Math.max(EDGE_PADDING, window.innerHeight - LAUNCHER_HEIGHT - EDGE_PADDING);

  return {
    x: Math.min(Math.max(next.x, EDGE_PADDING), maxX),
    y: Math.min(Math.max(next.y, EDGE_PADDING), maxY),
  };
};

const readStoredCoordinate = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const savePosition = () => {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position.value));
    if (localStorage.getItem("token")) {
      api.put("/account/preferences", {
        preferences: {
          accessibility: { widget_position: position.value },
        },
      }).catch(() => undefined);
    }
  } catch {
    // Position persistence is only a convenience; dragging should keep working without storage.
  }
};

const loadPosition = async () => {
  const fallback = {
    x: Math.max(EDGE_PADDING, window.innerWidth - LAUNCHER_WIDTH - 24),
    y: Math.max(EDGE_PADDING, 118),
  };

  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    position.value = clampPosition({
      x: readStoredCoordinate(parsed?.x, fallback.x),
      y: readStoredCoordinate(parsed?.y, fallback.y),
    });
  } catch {
    position.value = clampPosition(fallback);
  }

  if (!localStorage.getItem("token")) return;

  try {
    const { data } = await api.get("/account/preferences");
    const remote = data?.preferences?.accessibility?.widget_position;
    if (!remote || typeof remote !== "object") return;

    position.value = clampPosition({
      x: readStoredCoordinate(remote.x, position.value.x),
      y: readStoredCoordinate(remote.y, position.value.y),
    });
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position.value));
  } catch {
    // Local position remains the fallback.
  }
};

const togglePanel = () => {
  if (movedDuringPointer.value) {
    movedDuringPointer.value = false;
    return;
  }

  openedFromExternal.value = false;
  isOpen.value = !isOpen.value;
};

const handleExternalToggle = () => {
  toggleAccessibilityMode();
  openedFromExternal.value = false;
  isOpen.value = false;
};

const closePanel = () => {
  openedFromExternal.value = false;
  externalAnchor.value = null;
  isOpen.value = false;
};

const togglePanelFromExternal = (event?: Event) => {
  const detail = (event as CustomEvent<ExternalAnchorRect | undefined> | undefined)?.detail;
  const shouldOpen = !isOpen.value || !openedFromExternal.value;
  openedFromExternal.value = shouldOpen;
  externalAnchor.value = shouldOpen && detail ? detail : null;
  isOpen.value = shouldOpen;
};

const toggleModeFromPanel = () => {
  toggleAccessibilityMode();
  closePanel();
};

const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return;

  const movedX = event.clientX - dragStartX;
  const movedY = event.clientY - dragStartY;

  if (!movedDuringPointer.value && Math.hypot(movedX, movedY) < DRAG_THRESHOLD) {
    return;
  }

  movedDuringPointer.value = true;
  position.value = clampPosition({
    x: dragStartPosition.x + movedX,
    y: dragStartPosition.y + movedY,
  });
};

const stopDrag = () => {
  if (!isDragging.value) return;

  isDragging.value = false;
  savePosition();
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", stopDrag);
  window.removeEventListener("pointercancel", stopDrag);
};

const startDrag = (event: PointerEvent) => {
  if (event.button !== 0) return;

  const target = event.currentTarget as HTMLElement;

  isDragging.value = true;
  movedDuringPointer.value = false;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStartPosition = { ...position.value };
  target.setPointerCapture?.(event.pointerId);

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", stopDrag);
  window.addEventListener("pointercancel", stopDrag);
};

const handleResize = () => {
  updateViewportSize();
  position.value = clampPosition(position.value);
  savePosition();
};

const handleDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value || isDragging.value) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  if (widgetRef.value?.contains(target)) return;
  if (target.closest("[data-accessibility-toggle='true']")) return;

  closePanel();
};

const increaseFont = () => {
  updateAccessibilitySettings({ fontScale: Math.min(1.5, accessibilityState.fontScale + 0.06) });
  announceAccessibilityMessage(`${t("a11y.fontIncreased")} ${fontPercent.value}`);
};

const decreaseFont = () => {
  updateAccessibilitySettings({ fontScale: Math.max(1, accessibilityState.fontScale - 0.06) });
  announceAccessibilityMessage(`${t("a11y.fontDecreased")} ${fontPercent.value}`);
};

const increaseSpacing = () => {
  updateAccessibilitySettings({
    lineSpacing: Math.min(2.4, accessibilityState.lineSpacing + 0.1),
    letterSpacing: Math.min(0.08, accessibilityState.letterSpacing + 0.01),
  });
  announceAccessibilityMessage(t("a11y.spacingIncreased"));
};

const decreaseSpacing = () => {
  updateAccessibilitySettings({
    lineSpacing: Math.max(1.5, accessibilityState.lineSpacing - 0.1),
    letterSpacing: Math.max(0, accessibilityState.letterSpacing - 0.01),
  });
  announceAccessibilityMessage(t("a11y.spacingDecreased"));
};

const toggleContrast = () => {
  updateAccessibilitySettings({ highContrast: !accessibilityState.highContrast });
  announceAccessibilityMessage(accessibilityState.highContrast ? t("a11y.contrastOn") : t("a11y.contrastOff"));
};

onMounted(async () => {
  updateViewportSize();
  await loadPosition();
  window.addEventListener("resize", handleResize);
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  window.addEventListener("read-voice:toggle-accessibility", handleExternalToggle);
  window.addEventListener("read-voice:open-accessibility-panel", togglePanelFromExternal);
});

onBeforeUnmount(() => {
  stopDrag();
  window.removeEventListener("resize", handleResize);
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  window.removeEventListener("read-voice:toggle-accessibility", handleExternalToggle);
  window.removeEventListener("read-voice:open-accessibility-panel", togglePanelFromExternal);
});
</script>

<template>
  <div
    v-if="shouldRenderWidget"
    ref="widgetRef"
    class="a11y-widget"
    :class="{
      dragging: isDragging,
      'align-left': accessibilityState.enabled && !openedFromExternal && panelAlignsLeft,
      'open-up': accessibilityState.enabled && !openedFromExternal && panelOpensUp,
      'panel-only': openedFromExternal || !accessibilityState.enabled,
      'from-nav': openedFromExternal,
    }"
    :style="widgetStyle"
  >
    <button
      v-if="accessibilityState.enabled && !openedFromExternal"
      class="a11y-launcher"
      type="button"
      :aria-expanded="isOpen"
      :aria-label="t('a11y.launcherLabel')"
      :title="t('a11y.launcherTitle')"
      @click="togglePanel"
      @pointerdown="startDrag"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Zm-7 5.1 5.1 1.4v3.4l-2.2 5.4 2 .8 2.1-5 2.1 5 2-.8-2.2-5.4v-3.4L19 9.4l-.6-2.1-4.8 1.3h-3.2L5.6 7.3 5 9.4Z" />
      </svg>
      <span class="a11y-launcher__text">{{ t("a11y.launcherText") }}</span>
      <span v-if="accessibilityState.enabled" class="a11y-status" aria-hidden="true"></span>
    </button>

    <section v-if="isOpen" class="a11y-panel" :aria-label="t('a11y.launcherLabel')">
      <div class="a11y-panel__head">
        <div>
          <strong>{{ t("a11y.panelTitle") }}</strong>
          <small>{{ t("a11y.panelSubtitle") }}</small>
        </div>
        <div class="a11y-panel__actions">
          <button class="a11y-pill" type="button" @click="toggleModeFromPanel">
            {{ accessibilityState.enabled ? t("a11y.disableMode") : t("a11y.enableMode") }}
          </button>
          <button class="a11y-close" type="button" :aria-label="t('a11y.minimize')" @click="closePanel">
            {{ t("a11y.minimizeShort") }}
          </button>
        </div>
      </div>

      <button class="a11y-card" type="button" :aria-pressed="accessibilityState.highContrast" @click="toggleContrast">
        <strong>{{ t("a11y.highContrast") }}</strong>
        <span>{{ accessibilityState.highContrast ? t("a11y.on") : t("a11y.off") }}</span>
      </button>

      <div class="a11y-control">
        <span>{{ t("a11y.fontSize") }}</span>
        <div class="a11y-inline">
          <button type="button" @click="decreaseFont">A-</button>
          <strong>{{ fontPercent }}</strong>
          <button type="button" @click="increaseFont">A+</button>
        </div>
      </div>

      <div class="a11y-control">
        <span>{{ t("a11y.readingSpacing") }}</span>
        <div class="a11y-inline">
          <button type="button" @click="decreaseSpacing">{{ t("a11y.decrease") }}</button>
          <button type="button" @click="increaseSpacing">{{ t("a11y.increase") }}</button>
        </div>
      </div>

    </section>
  </div>
</template>

<style scoped>
.a11y-widget {
  position: fixed;
  width: 64px;
  height: 64px;
  z-index: 90;
  pointer-events: none;
}

.a11y-widget.panel-only {
  inset: 0;
  width: auto;
  height: auto;
  display: grid;
  place-items: center;
  padding: 16px;
}

.a11y-launcher,
.a11y-pill,
.a11y-close,
.a11y-card,
.a11y-inline button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.a11y-launcher {
  position: relative;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  min-height: 64px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.9) 0 12%, transparent 13%),
    linear-gradient(145deg, #effffb 0%, #65dfd1 48%, #087f78 100%);
  color: #075f5a;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    inset 0 -10px 18px rgba(3, 105, 99, 0.18);
  padding: 0;
  touch-action: none;
  pointer-events: auto;
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.a11y-launcher::before {
  content: "";
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.82);
  box-shadow:
    inset 0 0 0 1px rgba(15, 118, 110, 0.12),
    0 8px 18px rgba(5, 95, 90, 0.12);
}

.a11y-launcher:hover,
.a11y-launcher:focus-visible {
  background:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.98) 0 12%, transparent 13%),
    linear-gradient(145deg, #ffffff 0%, #7ce9dd 48%, #0d9488 100%);
  box-shadow:
    0 22px 46px rgba(15, 23, 42, 0.27),
    0 0 0 5px rgba(20, 184, 166, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
}

.a11y-widget.dragging .a11y-launcher {
  cursor: grabbing;
  transform: scale(1.02);
}

.a11y-launcher svg {
  position: relative;
  z-index: 1;
  width: 30px;
  height: 30px;
  fill: currentColor;
}

.a11y-launcher__text {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.a11y-status {
  position: absolute;
  right: 7px;
  top: 8px;
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
}

.a11y-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: min(360px, calc(100vw - 32px));
  max-height: min(620px, calc(100vh - 94px));
  overflow: auto;
  display: grid;
  gap: 14px;
  border: 1px solid rgba(15, 118, 110, 0.14);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(248, 253, 252, 0.99));
  box-shadow: 0 26px 56px rgba(15, 23, 42, 0.2);
  padding: 18px;
  pointer-events: auto;
  backdrop-filter: blur(14px);
}

.a11y-widget.panel-only .a11y-panel {
  position: relative;
  top: auto;
  right: auto;
  width: min(360px, calc(100vw - 32px));
  max-height: min(86vh, 620px);
}

.a11y-widget.from-nav .a11y-panel,
.a11y-widget.panel-only.from-nav .a11y-panel {
  position: fixed;
  top: var(--a11y-panel-top, 76px);
  right: auto;
  bottom: auto;
  left: var(--a11y-panel-left, auto);
  width: min(var(--a11y-panel-width, 340px), calc(100vw - 36px));
  max-height: calc(100dvh - 92px);
}

.a11y-widget.align-left .a11y-panel {
  right: auto;
  left: 0;
}

.a11y-widget.open-up .a11y-panel {
  top: auto;
  bottom: calc(100% + 10px);
}

.a11y-panel__head,
.a11y-panel__actions,
.a11y-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.a11y-panel__head {
  align-items: start;
}

.a11y-panel__head > div:first-child {
  min-width: 0;
}

.a11y-panel__head strong {
  display: block;
  font-size: 17px;
  line-height: 1.25;
}

.a11y-panel__head small {
  display: block;
  margin-top: 3px;
  font-size: 13px;
  line-height: 1.35;
}

.a11y-panel__head strong,
.a11y-card strong,
.a11y-control strong {
  color: #112031;
}

.a11y-panel__head small,
.a11y-card span {
  color: #5b6b7b;
}

.a11y-pill,
.a11y-close,
.a11y-inline button {
  min-height: 32px;
  border-radius: 999px;
  background: #e6fbf7;
  color: #0f766e;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.1;
  padding: 0 12px;
  white-space: nowrap;
}

.a11y-close {
  background: #eef2f7;
  color: #334155;
  min-width: 36px;
  padding: 0 10px;
}

.a11y-card {
  display: grid;
  gap: 4px;
  border-radius: 16px;
  background: #f6fbfb;
  padding: 12px 14px;
  text-align: left;
}

.a11y-control {
  display: grid;
  gap: 8px;
}

.a11y-control > span {
  color: #334155;
  font-weight: 700;
}

@media (max-width: 640px) {
  .a11y-widget.panel-only {
    place-items: end;
    padding: 0 18px 88px;
  }

  .a11y-panel {
    position: fixed;
    top: auto;
    right: 18px;
    bottom: 88px;
    left: auto;
    width: min(300px, calc(100vw - 36px));
    max-height: min(56vh, 420px);
    gap: 10px;
    border-radius: 16px;
    padding: 12px;
    box-shadow: 0 18px 38px rgba(15, 23, 42, 0.18);
  }

  .a11y-panel__head,
  .a11y-panel__actions,
  .a11y-inline {
    gap: 7px;
  }

  .a11y-panel__head {
    align-items: start;
    gap: 8px;
  }

  .a11y-panel__head strong {
    font-size: 16px;
    line-height: 1.25;
  }

  .a11y-panel__head small {
    font-size: 12px;
    line-height: 1.25;
  }

  .a11y-panel__actions {
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }

  .a11y-pill,
  .a11y-close,
  .a11y-inline button {
    min-height: 30px;
    border-radius: 999px;
    font-size: 13px;
    padding: 0 9px;
    white-space: nowrap;
  }

  .a11y-close {
    min-width: 34px;
    padding: 0 8px;
  }

  .a11y-card {
    gap: 2px;
    border-radius: 12px;
    padding: 10px 12px;
  }

  .a11y-card strong {
    font-size: 14px;
    line-height: 1.25;
  }

  .a11y-card span {
    font-size: 12px;
  }

  .a11y-control {
    gap: 6px;
  }

  .a11y-control > span {
    font-size: 13px;
  }

  .a11y-inline strong {
    font-size: 14px;
  }

  .a11y-widget.panel-only .a11y-panel {
    position: fixed;
    top: auto;
    right: 18px;
    bottom: 88px;
    left: auto;
    width: min(300px, calc(100vw - 36px));
    max-height: min(56vh, 420px);
  }

  .a11y-widget.from-nav .a11y-panel,
  .a11y-widget.panel-only.from-nav .a11y-panel {
    top: var(--a11y-panel-top, 76px);
    right: auto;
    bottom: auto;
    left: var(--a11y-panel-left, 18px);
    width: min(var(--a11y-panel-width, 300px), calc(100vw - 36px));
    max-height: calc(100dvh - 88px);
  }

  .a11y-widget.from-nav .a11y-panel__head {
    grid-template-columns: 1fr;
  }

  .a11y-widget.from-nav .a11y-panel__head,
  .a11y-widget.from-nav .a11y-panel__actions {
    align-items: start;
  }

  .a11y-widget.from-nav .a11y-panel__head {
    display: grid;
  }

  .a11y-widget.from-nav .a11y-panel__actions {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 360px) {
  .a11y-panel,
  .a11y-widget.panel-only .a11y-panel {
    right: 14px;
    width: min(280px, calc(100vw - 28px));
    padding: 10px;
  }

  .a11y-widget.panel-only {
    padding: 0 14px 84px;
  }

  .a11y-widget.from-nav .a11y-panel,
  .a11y-widget.panel-only.from-nav .a11y-panel {
    right: auto;
    left: var(--a11y-panel-left, 14px);
    width: min(var(--a11y-panel-width, 280px), calc(100vw - 28px));
  }
}
</style>
