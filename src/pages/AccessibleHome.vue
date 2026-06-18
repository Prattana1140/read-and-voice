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
    title: "กระเป๋าคอยน์",
    description: "ตรวจสอบยอดเงินและเติมคอยน์",
    to: "/coin-wallet",
  },
];

const voiceCommandGroups = [
  {
    title: "เริ่มต้นและค้นหา",
    commands: [
      "ช่วยเหลือ",
      "ค้นหา นิยายรัก",
      "เปิดร้านหนังสือ",
      "เปิดชั้นหนังสือ",
    ],
  },
  {
    title: "อ่านและฟัง",
    commands: [
      "อ่านทั้งหน้า",
      "เล่นเสียง",
      "หยุดก่อน",
      "ประโยคถัดไป",
    ],
  },
  {
    title: "ควบคุมหน้าจอ",
    commands: [
      "เลื่อนลง",
      "ไปบนสุด",
      "กดปุ่ม บันทึก",
      "ไปที่ช่อง อีเมล",
    ],
  },
  {
    title: "กรอกข้อมูล",
    commands: [
      "กรอกว่า สมชาย",
      "กรอก อีเมล ว่า test@example.com",
      "ล้างข้อความ",
      "ส่งฟอร์ม",
    ],
  },
];

const voiceTips = [
  "ใช้ Chrome หรือ Edge เพื่อรองรับการฟังคำสั่งเสียงดีที่สุด",
  "เปิดผ่าน HTTPS หรือ localhost เพื่อให้เบราว์เซอร์อนุญาตไมโครโฟน",
  "หน้าเข้าสู่ระบบใช้คำสั่งเสียงแบบกดครั้งเดียว ไม่เปิดฟังต่อเนื่อง",
  "ถ้าระบบพบหลายรายการ ให้พูดว่า อันที่หนึ่ง หรือ อันที่สอง",
];

onMounted(() => {
  enableVisualAssistPreset();
  announceAccessibilityMessage("เปิดหน้าใช้งานสำหรับผู้พิการทางสายตาแล้ว");
});
</script>

<template>
  <main class="accessible-home">
    <section class="accessible-panel" aria-labelledby="accessible-home-title">
      <p class="eyebrow">ตัวช่วยการมองเห็น</p>
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

      <section class="voice-guide" aria-labelledby="voice-guide-title">
        <div class="voice-guide__head">
          <p class="eyebrow">สั่งงานด้วยเสียง</p>
          <h2 id="voice-guide-title">ลองพูดคำสั่งเหล่านี้</h2>
          <p>กดปุ่มไมค์มุมขวาล่าง อนุญาตไมโครโฟน แล้วพูดคำสั่งสั้น ๆ เป็นภาษาไทย</p>
        </div>

        <div class="command-grid">
          <article v-for="group in voiceCommandGroups" :key="group.title" class="command-group">
            <h3>{{ group.title }}</h3>
            <ul>
              <li v-for="command in group.commands" :key="command">
                <code>{{ command }}</code>
              </li>
            </ul>
          </article>
        </div>

        <div class="voice-tips">
          <h3>ก่อนใช้งานจริง</h3>
          <ul>
            <li v-for="tip in voiceTips" :key="tip">{{ tip }}</li>
          </ul>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.accessible-home {
  min-height: calc(100vh - 120px);
  min-height: calc(100dvh - 120px);
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 48px;
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

.voice-guide {
  margin-top: 24px;
  display: grid;
  gap: 18px;
}

.voice-guide__head {
  display: grid;
  gap: 8px;
}

.voice-guide__head h2,
.voice-guide__head p {
  margin: 0;
}

.voice-guide__head h2 {
  font-size: 1.7rem;
  line-height: 1.25;
}

.voice-guide__head p {
  font-size: 1.05rem;
  line-height: 1.7;
}

.command-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.command-group {
  border: 3px solid #111827;
  border-radius: 18px;
  background: #ffffff;
  padding: 18px;
}

.command-group h3,
.command-group ul,
.voice-tips h3,
.voice-tips ul {
  margin: 0;
}

.command-group h3 {
  font-size: 1.15rem;
}

.command-group ul {
  display: grid;
  gap: 10px;
  padding: 14px 0 0;
  list-style: none;
}

.command-group code {
  display: inline-block;
  max-width: 100%;
  border: 2px solid #0f766e;
  border-radius: 999px;
  background: #ecfdf5;
  color: #0f172a;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.35;
  padding: 7px 12px;
  white-space: normal;
}

.voice-tips {
  border: 3px dashed #111827;
  border-radius: 18px;
  background: #fff7cc;
  padding: 18px 20px;
}

.voice-tips ul {
  display: grid;
  gap: 8px;
  padding: 12px 0 0 20px;
  line-height: 1.7;
}

@media (max-width: 720px) {
  .accessible-home {
    place-items: start center;
  }

  .accessible-panel {
    border-width: 3px;
    border-radius: 20px;
    padding: 22px 18px;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }

  .command-grid {
    grid-template-columns: 1fr;
  }

  .action-card {
    min-height: 132px;
  }
}
</style>
