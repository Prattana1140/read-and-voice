<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  accessibilityState,
  announceAccessibilityMessage,
  toggleAccessibilityMode,
  updateAccessibilitySettings,
} from "../utils/accessibility";

const isOpen = ref(false);

const handleExternalToggle = () => {
  isOpen.value = true;
  toggleAccessibilityMode();
};

const fontPercent = computed(() => `${Math.round(accessibilityState.fontScale * 100)}%`);

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

onMounted(() => {
  window.addEventListener("read-voice:toggle-accessibility", handleExternalToggle);
});

onBeforeUnmount(() => {
  window.removeEventListener("read-voice:toggle-accessibility", handleExternalToggle);
});
</script>

<template>
  <div class="a11y-widget">
    <button
      class="a11y-trigger"
      type="button"
      aria-label="เปิดแผงช่วยการเข้าถึง"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      การเข้าถึง
    </button>

    <section v-if="isOpen" class="a11y-panel" aria-label="ตัวช่วยการเข้าถึง">
      <div class="a11y-panel__head">
        <div>
          <strong>โหมดช่วยการเข้าถึง</strong>
          <small>ปรับทั้งเว็บให้ใช้งานง่ายขึ้นทันที</small>
        </div>
        <button class="a11y-pill" type="button" @click="toggleAccessibilityMode">
          {{ accessibilityState.enabled ? "ปิดโหมด" : "เปิดโหมด" }}
        </button>
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
  right: 18px;
  bottom: 18px;
  z-index: 90;
  display: grid;
  justify-items: end;
  gap: 10px;
}

.a11y-trigger,
.a11y-pill,
.a11y-card,
.a11y-inline button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.a11y-trigger {
  min-height: 48px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0f766e, #0ea5a8);
  color: #fff;
  font-weight: 900;
  padding: 0 18px;
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.26);
}

.a11y-panel {
  width: min(92vw, 340px);
  display: grid;
  gap: 14px;
  border: 1px solid rgba(15, 118, 110, 0.14);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.18);
  padding: 18px;
}

.a11y-panel__head,
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
.a11y-inline button {
  min-height: 40px;
  border-radius: 999px;
  background: #e6fbf7;
  color: #0f766e;
  font-weight: 800;
  padding: 0 14px;
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
  .a11y-widget {
    right: 12px;
    bottom: 12px;
  }

  .a11y-grid {
    grid-template-columns: 1fr;
  }
}
</style>
