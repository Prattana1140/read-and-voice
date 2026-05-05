<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  accessibilityState,
  announceAccessibilityMessage,
  toggleAccessibilityMode,
  updateAccessibilitySettings,
} from "../utils/accessibility";
import api from "../utils/api";

type WidgetPosition = {
  x: number;
  y: number;
};

const POSITION_STORAGE_KEY = "read-voice-accessibility-widget-position";
const LAUNCHER_SIZE = 54;
const EDGE_PADDING = 12;
const PANEL_WIDTH = 360;
const PANEL_GAP = 10;
const MIN_PANEL_SPACE = 320;
const DRAG_THRESHOLD = 4;

const isOpen = ref(false);
const position = ref<WidgetPosition>({ x: 0, y: 0 });
const viewportSize = ref({ width: 0, height: 0 });
const isDragging = ref(false);
const movedDuringPointer = ref(false);
const widgetRef = ref<HTMLElement | null>(null);

let dragStartX = 0;
let dragStartY = 0;
let dragStartPosition: WidgetPosition = { x: 0, y: 0 };

const widgetStyle = computed(() => {
  if (!accessibilityState.enabled) return {};

  return {
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
  };
});

const panelAlignsLeft = computed(() => {
  if (viewportSize.value.width <= 640) return false;

  return position.value.x + LAUNCHER_SIZE - PANEL_WIDTH < EDGE_PADDING;
});

const panelOpensUp = computed(() => {
  if (viewportSize.value.width <= 640) return false;

  const spaceBelow = viewportSize.value.height - position.value.y - LAUNCHER_SIZE - PANEL_GAP - EDGE_PADDING;
  const spaceAbove = position.value.y - PANEL_GAP - EDGE_PADDING;

  return spaceBelow < MIN_PANEL_SPACE && spaceAbove > spaceBelow;
});

const fontPercent = computed(() => `${Math.round(accessibilityState.fontScale * 100)}%`);

const shouldRenderWidget = computed(() => isOpen.value || accessibilityState.enabled);

const updateViewportSize = () => {
  viewportSize.value = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const clampPosition = (next: WidgetPosition): WidgetPosition => {
  if (typeof window === "undefined") return next;

  const maxX = Math.max(EDGE_PADDING, window.innerWidth - LAUNCHER_SIZE - EDGE_PADDING);
  const maxY = Math.max(EDGE_PADDING, window.innerHeight - LAUNCHER_SIZE - EDGE_PADDING);

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
    x: Math.max(EDGE_PADDING, window.innerWidth - LAUNCHER_SIZE - 24),
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

  isOpen.value = !isOpen.value;
};

const handleExternalToggle = () => {
  toggleAccessibilityMode();
  isOpen.value = false;
};

const togglePanelFromExternal = () => {
  isOpen.value = !isOpen.value;
};

const toggleModeFromPanel = () => {
  toggleAccessibilityMode();
  isOpen.value = false;
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

  isOpen.value = false;
};

const increaseFont = () => {
  updateAccessibilitySettings({ fontScale: Math.min(1.5, accessibilityState.fontScale + 0.06) });
  announceAccessibilityMessage(`ขยายตัวอักษรเป็น ${fontPercent.value}`);
};

const decreaseFont = () => {
  updateAccessibilitySettings({ fontScale: Math.max(1, accessibilityState.fontScale - 0.06) });
  announceAccessibilityMessage(`ลดขนาดตัวอักษรเป็น ${fontPercent.value}`);
};

const increaseSpacing = () => {
  updateAccessibilitySettings({
    lineSpacing: Math.min(2.4, accessibilityState.lineSpacing + 0.1),
    letterSpacing: Math.min(0.08, accessibilityState.letterSpacing + 0.01),
  });
  announceAccessibilityMessage("เพิ่มระยะห่างการอ่านแล้ว");
};

const decreaseSpacing = () => {
  updateAccessibilitySettings({
    lineSpacing: Math.max(1.5, accessibilityState.lineSpacing - 0.1),
    letterSpacing: Math.max(0, accessibilityState.letterSpacing - 0.01),
  });
  announceAccessibilityMessage("ลดระยะห่างการอ่านแล้ว");
};

const toggleContrast = () => {
  updateAccessibilitySettings({ highContrast: !accessibilityState.highContrast });
  announceAccessibilityMessage(accessibilityState.highContrast ? "เปิดคอนทราสต์สูงแล้ว" : "ปิดคอนทราสต์สูงแล้ว");
};

const toggleUiSpeech = () => {
  updateAccessibilitySettings({ speakUi: !accessibilityState.speakUi });
  announceAccessibilityMessage(accessibilityState.speakUi ? "เปิดการอ่านออกเสียงเมนูแล้ว" : "ปิดการอ่านออกเสียงเมนูแล้ว");
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
      'align-left': accessibilityState.enabled && panelAlignsLeft,
      'open-up': accessibilityState.enabled && panelOpensUp,
      'panel-only': !accessibilityState.enabled,
    }"
    :style="widgetStyle"
  >
    <button
      v-if="accessibilityState.enabled"
      class="a11y-launcher"
      type="button"
      :aria-expanded="isOpen"
      aria-label="ตัวช่วยการเข้าถึง"
      title="ลากเพื่อย้ายตำแหน่ง กดเพื่อเปิดตัวช่วยการเข้าถึง"
      @click="togglePanel"
      @pointerdown="startDrag"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Zm-7 5.1 5.1 1.4v3.4l-2.2 5.4 2 .8 2.1-5 2.1 5 2-.8-2.2-5.4v-3.4L19 9.4l-.6-2.1-4.8 1.3h-3.2L5.6 7.3 5 9.4Z" />
      </svg>
      <span v-if="accessibilityState.enabled" class="a11y-status" aria-hidden="true"></span>
    </button>

    <section v-if="isOpen" class="a11y-panel" aria-label="ตัวช่วยการเข้าถึง">
      <div class="a11y-panel__head">
        <div>
          <strong>โหมดช่วยการเข้าถึง</strong>
          <small>ปรับทั้งเว็บให้ใช้งานง่ายขึ้นทันที</small>
        </div>
        <div class="a11y-panel__actions">
          <button class="a11y-pill" type="button" @click="toggleModeFromPanel">
            {{ accessibilityState.enabled ? "ปิดโหมด" : "เปิดโหมด" }}
          </button>
          <button class="a11y-close" type="button" aria-label="ย่อเป็นไอคอน" @click="isOpen = false">
            ย่อ
          </button>
        </div>
      </div>

      <div class="a11y-grid">
        <button class="a11y-card" type="button" :aria-pressed="accessibilityState.highContrast" @click="toggleContrast">
          <strong>คอนทราสต์สูง</strong>
          <span>{{ accessibilityState.highContrast ? "เปิดอยู่" : "ปิดอยู่" }}</span>
        </button>
        <button class="a11y-card" type="button" :aria-pressed="accessibilityState.speakUi" @click="toggleUiSpeech">
          <strong>อ่านเมนูออกเสียง</strong>
          <span>{{ accessibilityState.speakUi ? "เปิดอยู่" : "ปิดอยู่" }}</span>
        </button>
      </div>

      <div class="a11y-control">
        <span>ขนาดตัวอักษร</span>
        <div class="a11y-inline">
          <button type="button" @click="decreaseFont">A-</button>
          <strong>{{ fontPercent }}</strong>
          <button type="button" @click="increaseFont">A+</button>
        </div>
      </div>

      <div class="a11y-control">
        <span>ระยะห่างการอ่าน</span>
        <div class="a11y-inline">
          <button type="button" @click="decreaseSpacing">ลด</button>
          <button type="button" @click="increaseSpacing">เพิ่ม</button>
        </div>
      </div>

      <p class="a11y-note">
        ใช้ปุ่ม <kbd>Alt</kbd> + <kbd>A</kbd> เพื่อเปิดหรือปิดโหมดนี้ และ <kbd>Alt</kbd> + <kbd>M</kbd> เพื่อข้ามไปยังเนื้อหาหลัก
      </p>
    </section>
  </div>
</template>

<style scoped>
.a11y-widget {
  position: fixed;
  width: 54px;
  height: 54px;
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
  width: 54px;
  height: 54px;
  min-height: 54px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: #e6fbf7;
  color: #0f766e;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.22);
  touch-action: none;
  pointer-events: auto;
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.a11y-launcher:hover,
.a11y-launcher:focus-visible {
  background: #ccf7ee;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.28);
  transform: translateY(-1px);
}

.a11y-widget.dragging .a11y-launcher {
  cursor: grabbing;
  transform: scale(1.04);
}

.a11y-launcher svg {
  width: 27px;
  height: 27px;
  fill: currentColor;
}

.a11y-status {
  position: absolute;
  right: 6px;
  top: 6px;
  width: 11px;
  height: 11px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: #10b981;
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
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.18);
  padding: 18px;
  pointer-events: auto;
}

.a11y-widget.panel-only .a11y-panel {
  position: relative;
  top: auto;
  right: auto;
  width: min(360px, calc(100vw - 32px));
  max-height: min(86vh, 620px);
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

.a11y-panel__head strong,
.a11y-card strong,
.a11y-control strong {
  color: #112031;
}

.a11y-panel__head small,
.a11y-card span,
.a11y-note {
  color: #5b6b7b;
}

.a11y-pill,
.a11y-close,
.a11y-inline button {
  min-height: 40px;
  border-radius: 999px;
  background: #e6fbf7;
  color: #0f766e;
  font-weight: 800;
  padding: 0 14px;
}

.a11y-close {
  background: #eef2f7;
  color: #334155;
}

.a11y-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.a11y-card {
  display: grid;
  gap: 4px;
  border-radius: 16px;
  background: #f6fbfb;
  padding: 14px;
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

.a11y-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

kbd {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #1e293b;
  font-size: 12px;
  font-weight: 800;
  padding: 2px 6px;
}

@media (max-width: 640px) {
  .a11y-panel {
    position: fixed;
    top: auto;
    right: 12px;
    bottom: 12px;
    left: 12px;
    width: auto;
    max-height: min(78vh, 560px);
  }

  .a11y-widget.panel-only .a11y-panel {
    position: relative;
    top: auto;
    right: auto;
    bottom: auto;
    left: auto;
    width: min(360px, calc(100vw - 32px));
    max-height: min(86vh, 620px);
  }

  .a11y-grid {
    grid-template-columns: 1fr;
  }
}
</style>
