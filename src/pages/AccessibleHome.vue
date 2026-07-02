<script setup lang="ts">
import { onMounted } from "vue";
import { announceAccessibilityMessage, enableVisualAssistPreset } from "../utils/accessibility";

const quickActions = [
  {
    number: "01",
    title: "อ่านต่อจากชั้นหนังสือ",
    description: "เปิดหนังสือที่คุณมีสิทธิ์อ่านและกลับไปยังหน้าล่าสุด",
    to: "/my-library",
    label: "เริ่มอ่าน",
    tone: "mint",
  },
  {
    number: "02",
    title: "ค้นหาหนังสือใหม่",
    description: "เลือกหนังสือและเรื่องอ่านต่อเนื่องจากหมวดหมู่ที่สนใจ",
    to: "/store",
    label: "เปิดร้านหนังสือ",
    tone: "yellow",
  },
  {
    number: "03",
    title: "ตั้งค่าการอ่านและเสียง",
    description: "เลือกเสียง ความเร็ว ขนาดตัวอักษร และรูปแบบที่อ่านสบาย",
    to: "/profile",
    label: "ตั้งค่าของฉัน",
    tone: "blue",
  },
  {
    number: "04",
    title: "กระเป๋าคอยน์",
    description: "ตรวจสอบยอดคงเหลือ ประวัติรายการ และช่องทางเติมคอยน์",
    to: "/coin-wallet",
    label: "ดูกระเป๋า",
    tone: "peach",
  },
];

const activeAssistants = [
  "ตัวอักษรขนาดใหญ่",
  "คอนทราสต์สูง",
  "ระยะบรรทัดอ่านง่าย",
  "รองรับโปรแกรมอ่านหน้าจอ",
];

const voiceCommandGroups = [
  {
    title: "ค้นหาและเดินทาง",
    commands: ["ค้นหา นิยายรัก", "เปิดร้านหนังสือ", "เปิดชั้นหนังสือ", "ไปบนสุด"],
  },
  {
    title: "อ่านและฟัง",
    commands: ["อ่านทั้งหน้า", "เล่นเสียง", "หยุดก่อน", "ประโยคถัดไป"],
  },
  {
    title: "ควบคุมและกรอกข้อมูล",
    commands: ["เลื่อนลง", "กดปุ่ม บันทึก", "ไปที่ช่อง อีเมล", "ส่งฟอร์ม"],
  },
];

onMounted(() => {
  enableVisualAssistPreset();
  announceAccessibilityMessage("เปิดศูนย์การอ่านแบบเข้าถึงได้แล้ว เลือกงานที่ต้องการจากเมนูหลัก");
});
</script>

<template>
  <main class="accessible-home">
    <div class="page-shell">
      <section class="hero" aria-labelledby="accessible-home-title">
        <div class="hero__copy">
          <p class="eyebrow"><span aria-hidden="true"></span> ศูนย์การอ่านแบบเข้าถึงได้</p>
          <h1 id="accessible-home-title">ทุกเรื่องที่อยากอ่าน<br />อยู่ใกล้แค่เอื้อม</h1>
          <p class="hero__intro">
            หน้านี้ปรับการมองเห็นให้แล้ว เลือกอ่าน ฟัง หรือค้นหาหนังสือได้ทันที
            และควบคุมทุกอย่างด้วยคีย์บอร์ดหรือเสียง
          </p>
          <div class="hero__actions" aria-label="ทางลัดแนะนำ">
            <RouterLink class="primary-link" to="/my-library">
              เปิดชั้นหนังสือของฉัน <span aria-hidden="true">→</span>
            </RouterLink>
            <RouterLink class="secondary-link" to="/support">ขอความช่วยเหลือ</RouterLink>
          </div>
        </div>

        <aside class="assist-card" aria-labelledby="assist-title">
          <div class="assist-card__icon" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          <p class="assist-card__label">พร้อมใช้งาน</p>
          <h2 id="assist-title">ตัวช่วยของคุณเปิดอยู่</h2>
          <ul>
            <li v-for="assistant in activeAssistants" :key="assistant">
              <span aria-hidden="true">✓</span>{{ assistant }}
            </li>
          </ul>
          <RouterLink to="/profile">ปรับการตั้งค่า <span aria-hidden="true">→</span></RouterLink>
        </aside>
      </section>

      <section class="quick-section" aria-labelledby="quick-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow"><span aria-hidden="true"></span> เริ่มต้นอย่างรวดเร็ว</p>
            <h2 id="quick-title">วันนี้คุณอยากทำอะไร?</h2>
          </div>
          <p>เลือกหนึ่งรายการ ระบบจะพาคุณไปยังหน้าที่ต้องการทันที</p>
        </div>

        <div class="action-grid">
          <RouterLink
            v-for="action in quickActions"
            :key="action.to"
            :to="action.to"
            class="action-card"
            :class="`action-card--${action.tone}`"
            :aria-label="`${action.title}: ${action.description}`"
          >
            <span class="action-card__number" aria-hidden="true">{{ action.number }}</span>
            <div>
              <h3>{{ action.title }}</h3>
              <p>{{ action.description }}</p>
            </div>
            <span class="action-card__link">{{ action.label }} <b aria-hidden="true">→</b></span>
          </RouterLink>
        </div>
      </section>

      <section class="voice-section" aria-labelledby="voice-title">
        <div class="voice-callout">
          <div class="voice-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
          <div>
            <p class="eyebrow"><span aria-hidden="true"></span> สั่งงานด้วยเสียง</p>
            <h2 id="voice-title">พูดสั้น ๆ แล้วให้เราช่วยจัดการ</h2>
            <p>กดปุ่มไมโครโฟนมุมขวาล่าง อนุญาตการใช้ไมค์ แล้วพูดคำสั่งภาษาไทย</p>
          </div>
        </div>

        <details class="voice-guide">
          <summary>ดูตัวอย่างคำสั่งเสียง <span aria-hidden="true">＋</span></summary>
          <div class="command-grid">
            <article v-for="group in voiceCommandGroups" :key="group.title">
              <h3>{{ group.title }}</h3>
              <ul>
                <li v-for="command in group.commands" :key="command"><code>{{ command }}</code></li>
              </ul>
            </article>
          </div>
          <p class="voice-note">
            แนะนำให้ใช้ Chrome หรือ Edge ผ่าน HTTPS หรือ localhost หากพบหลายรายการให้พูดว่า
            “อันที่หนึ่ง” หรือ “อันที่สอง”
          </p>
        </details>
      </section>
    </div>
  </main>
</template>

<style scoped>
.accessible-home {
  --ink: #102a2a;
  --muted: #526969;
  --green: #08786d;
  --green-dark: #075a53;
  min-height: calc(100dvh - 120px);
  padding: clamp(28px, 5vw, 68px) var(--page-gutter, 20px) 72px;
  color: var(--ink);
  background:
    radial-gradient(circle at 8% 8%, rgba(255, 216, 111, 0.25), transparent 27%),
    radial-gradient(circle at 92% 16%, rgba(63, 179, 165, 0.13), transparent 25%),
    #f7f5ed;
}

.page-shell { width: min(1160px, 100%); margin: 0 auto; }
.hero { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(310px, 0.65fr); gap: clamp(28px, 5vw, 76px); align-items: center; }
.hero__copy { padding-block: 12px; }
.eyebrow { display: flex; align-items: center; gap: 9px; margin: 0 0 14px; color: var(--green-dark); font-size: 0.82rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
.eyebrow span { width: 24px; height: 3px; border-radius: 99px; background: #eeae39; }
h1 { max-width: 760px; margin: 0; color: var(--ink); font-size: clamp(2.75rem, 6.5vw, 5.6rem); font-weight: 900; letter-spacing: -0.055em; line-height: 0.98; }
.hero__intro { max-width: 680px; margin: 26px 0 0; color: var(--muted); font-size: clamp(1.05rem, 1.7vw, 1.25rem); line-height: 1.8; }
.hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
.hero__actions a { display: inline-flex; min-height: 54px; align-items: center; justify-content: center; gap: 14px; border: 2px solid var(--green); border-radius: 999px; padding: 12px 22px; font-weight: 900; text-decoration: none; }
.primary-link { background: var(--green); color: white; }
.secondary-link { background: transparent; color: var(--green-dark); }
.hero__actions a:hover { transform: translateY(-2px); }
.hero__actions a:focus-visible, .action-card:focus-visible, .assist-card a:focus-visible, summary:focus-visible { outline: 4px solid #f4bd4f; outline-offset: 4px; }

.assist-card { position: relative; overflow: hidden; border: 1px solid rgba(8, 120, 109, 0.22); border-radius: 30px; padding: 30px; background: #e4f2e8; box-shadow: 0 22px 60px rgba(28, 73, 66, 0.11); }
.assist-card::after { position: absolute; right: -50px; bottom: -60px; width: 170px; height: 170px; border: 28px solid rgba(255,255,255,.4); border-radius: 50%; content: ""; }
.assist-card__icon { display: flex; width: 62px; height: 62px; align-items: center; justify-content: center; gap: 4px; border-radius: 20px; background: var(--green); }
.assist-card__icon span { width: 5px; border-radius: 9px; background: white; }
.assist-card__icon span:nth-child(1) { height: 18px; }.assist-card__icon span:nth-child(2) { height: 32px; }.assist-card__icon span:nth-child(3) { height: 23px; }
.assist-card__label { margin: 22px 0 5px; color: var(--green-dark); font-size: .83rem; font-weight: 900; text-transform: uppercase; }
.assist-card h2 { margin: 0; font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.2; }
.assist-card ul { display: grid; gap: 10px; margin: 20px 0; padding: 0; list-style: none; }
.assist-card li { display: flex; gap: 10px; align-items: center; font-weight: 700; }
.assist-card li span { display: inline-grid; width: 24px; height: 24px; flex: 0 0 auto; place-items: center; border-radius: 50%; background: white; color: var(--green); }
.assist-card a { position: relative; z-index: 1; display: inline-flex; gap: 10px; color: var(--green-dark); font-weight: 900; }

.quick-section { margin-top: clamp(64px, 9vw, 110px); }
.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 30px; margin-bottom: 28px; }
.section-heading h2, .voice-callout h2 { margin: 0; font-size: clamp(2rem, 4vw, 3.4rem); letter-spacing: -0.035em; line-height: 1.1; }
.section-heading > p { max-width: 370px; margin: 0; color: var(--muted); line-height: 1.7; }
.action-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.action-card { display: flex; min-height: 310px; flex-direction: column; justify-content: space-between; border: 1px solid rgba(16,42,42,.1); border-radius: 24px; padding: 24px; color: var(--ink); text-decoration: none; transition: transform .2s ease, box-shadow .2s ease; }
.action-card:hover { transform: translateY(-5px); box-shadow: 0 18px 36px rgba(18,63,58,.12); }
.action-card--mint { background: #dcefe8; }.action-card--yellow { background: #f8e9ae; }.action-card--blue { background: #dceaf0; }.action-card--peach { background: #f5dfcf; }
.action-card__number { color: rgba(16,42,42,.55); font-size: .9rem; font-weight: 900; letter-spacing: .08em; }
.action-card h3 { margin: 0; font-size: clamp(1.25rem, 2vw, 1.65rem); line-height: 1.25; }
.action-card p { margin: 12px 0 0; color: #385353; line-height: 1.65; }
.action-card__link { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(16,42,42,.18); padding-top: 16px; font-weight: 900; }
.action-card__link b { font-size: 1.4rem; }

.voice-section { overflow: hidden; margin-top: 18px; border-radius: 28px; background: var(--ink); color: #f7f5ed; }
.voice-callout { display: grid; grid-template-columns: 110px 1fr; gap: 28px; align-items: center; padding: clamp(28px, 5vw, 52px); }
.voice-callout .eyebrow { color: #9ddbd1; }.voice-callout h2 { color: white; }.voice-callout p:last-child { max-width: 680px; margin: 14px 0 0; color: #c8d7d4; line-height: 1.7; }
.voice-mark { display: flex; width: 94px; height: 94px; align-items: center; justify-content: center; gap: 5px; border-radius: 50%; background: #f1b74b; }
.voice-mark i { width: 5px; border-radius: 8px; background: var(--ink); }.voice-mark i:nth-child(1),.voice-mark i:nth-child(5){height:20px}.voice-mark i:nth-child(2),.voice-mark i:nth-child(4){height:38px}.voice-mark i:nth-child(3){height:54px}
.voice-guide { border-top: 1px solid rgba(255,255,255,.15); }
.voice-guide summary { display: flex; min-height: 64px; align-items: center; justify-content: space-between; padding: 12px clamp(28px, 5vw, 52px); cursor: pointer; font-weight: 900; list-style: none; }
.voice-guide summary::-webkit-details-marker { display: none; }.voice-guide[open] summary span { transform: rotate(45deg); }
.command-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding: 8px clamp(28px, 5vw, 52px) 24px; }
.command-grid article { border: 1px solid rgba(255,255,255,.14); border-radius: 18px; padding: 20px; background: rgba(255,255,255,.06); }
.command-grid h3 { margin: 0 0 14px; font-size: 1.05rem; }.command-grid ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.command-grid code { color: #fff3cc; font-family: inherit; font-weight: 800; }.voice-note { margin: 0; padding: 0 clamp(28px, 5vw, 52px) 32px; color: #c8d7d4; line-height: 1.7; }

@media (max-width: 960px) { .hero { grid-template-columns: 1fr; }.assist-card { max-width: 650px; }.action-grid { grid-template-columns: repeat(2, 1fr); }.action-card { min-height: 260px; } }
@media (max-width: 680px) { .accessible-home { padding-top: 24px; }.section-heading { display: block; }.section-heading > p { margin-top: 12px; }.action-grid, .command-grid { grid-template-columns: 1fr; }.action-card { min-height: 230px; }.voice-callout { grid-template-columns: 1fr; }.voice-mark { width: 74px; height: 74px; }.hero__actions { align-items: stretch; flex-direction: column; }.hero__actions a { width: 100%; }.assist-card { padding: 24px; border-radius: 24px; } }
@media (prefers-reduced-motion: reduce) { .action-card, .hero__actions a { transition: none; }.action-card:hover, .hero__actions a:hover { transform: none; } }
</style>
