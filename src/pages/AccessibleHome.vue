<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { announceAccessibilityMessage, enableVisualAssistPreset } from "../utils/accessibility";

const router = useRouter();

const quickActions = [
  {
    title: "ชั้นหนังสือของฉัน",
    description: "เปิดรายการหนังสือที่มีสิทธิ์อ่านแล้ว",
    to: "/my-library",
  },
  {
    title: "เลือกหนังสือใหม่",
    description: "ไปยังหน้าร้านหนังสือแบบเรียบง่าย",
    to: "/store",
  },
  {
    title: "โหมดฟังเสียง",
    description: "ตั้งค่าเพื่อใช้งานการฟังและการอ่านออกเสียง",
    to: "/profile",
  },
  {
    title: "กระเป๋า Coin",
    description: "ตรวจสอบยอดเงินและเติมคอยน์",
    to: "/coin-wallet",
  },
];

onMounted(() => {
  enableVisualAssistPreset();
  announceAccessibilityMessage("เปิดหน้าใช้งานสำหรับผู้พิการทางสายตาแล้ว");
});
</script>

<template>
  <main class="accessible-home">
    <section class="accessible-panel" aria-labelledby="accessible-home-title">
      <p class="eyebrow">Visual Assist</p>
      <h1 id="accessible-home-title">หน้าใช้งานแบบอ่านง่าย</h1>
      <p class="intro">
        ระบบเปิดโหมดตัวอักษรใหญ่ คอนทราสต์สูง และการอ่านชื่อปุ่มอัตโนมัติให้แล้ว
      </p>

      <div class="action-grid">
        <button
          v-for="action in quickActions"
          :key="action.to"
          type="button"
          class="action-card"
          :aria-label="`${action.title} ${action.description}`"
          @click="router.push(action.to)"
        >
          <strong>{{ action.title }}</strong>
          <span>{{ action.description }}</span>
        </button>
      </div>

      <div class="support-box">
        <h2>ตัวช่วยที่เปิดให้อัตโนมัติ</h2>
        <ul>
          <li>ตัวอักษรใหญ่ขึ้น</li>
          <li>คอนทราสต์สูง</li>
          <li>ระยะห่างบรรทัดมากขึ้น</li>
          <li>อ่านชื่อปุ่มและฟอร์มด้วยเสียง</li>
        </ul>
      </div>
    </section>
  </main>
</template>

<style scoped>
.accessible-home {
  min-height: calc(100vh - 120px);
  padding: 32px 20px 48px;
  background:
    radial-gradient(circle at top left, rgba(255, 214, 10, 0.2), transparent 32%),
    linear-gradient(180deg, #08141c 0%, #0d1e28 100%);
  display: grid;
  place-items: center;
}

.accessible-panel {
  width: min(840px, 100%);
  background: #fffef2;
  color: #111827;
  border: 4px solid #111827;
  border-radius: 28px;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.24);
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f766e;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.15;
}

.intro {
  margin: 14px 0 0;
  font-size: 1.15rem;
  line-height: 1.8;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 24px;
}

.action-card {
  min-height: 150px;
  border: 3px solid #111827;
  border-radius: 24px;
  background: #ffffff;
  color: inherit;
  text-align: left;
  padding: 22px;
  cursor: pointer;
  display: grid;
  gap: 10px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.action-card strong {
  font-size: 1.5rem;
  line-height: 1.25;
}

.action-card span {
  font-size: 1rem;
  line-height: 1.75;
}

.action-card:hover,
.action-card:focus-visible {
  background: #fff7cc;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.25);
  transform: translateY(-2px);
}

.support-box {
  margin-top: 24px;
  border-radius: 22px;
  border: 3px dashed #0f766e;
  padding: 20px 22px;
  background: #f0fdf9;
}

.support-box h2 {
  margin: 0 0 12px;
  font-size: 1.3rem;
}

.support-box ul {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
  line-height: 1.7;
}

@media (max-width: 720px) {
  .accessible-panel {
    padding: 22px 18px;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }

  .action-card {
    min-height: 132px;
  }
}
</style>
