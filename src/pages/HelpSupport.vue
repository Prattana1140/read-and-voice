<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../utils/api";
import { getAuthUser, isAuthenticated } from "../utils/auth";

type SupportMode = "help" | "contact" | "report";

const route = useRoute();
const router = useRouter();
const user = getAuthUser() as { name?: string; email?: string } | null;

const mode = computed<SupportMode>(() => {
  if (route.name === "ReportIssue") return "report";
  if (route.name === "Contact") return "contact";
  return "help";
});

const name = ref(user?.name || "");
const email = ref(user?.email || "");
const subject = ref("");
const message = ref("");
const category = ref(mode.value === "report" ? "problem" : "general");
const saving = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");

const title = computed(() => {
  if (mode.value === "report") return "แจ้งปัญหาการใช้งาน";
  if (mode.value === "contact") return "ติดต่อทีม Read and Voice";
  return "ศูนย์ช่วยเหลือ";
});

const intro = computed(() => {
  if (mode.value === "report") return "บอกปัญหาที่พบ ทีมงานจะใช้ข้อมูลนี้เพื่อตรวจสอบและปรับปรุงระบบ";
  if (mode.value === "contact") return "ส่งคำถาม ข้อเสนอแนะ หรือเรื่องที่ต้องการให้ทีมงานช่วยดูแล";
  return "ค้นหาคำตอบเบื้องต้น หรือส่งคำถามให้ทีมงานจากแบบฟอร์มด้านล่าง";
});

const faqs = [
  {
    question: "ซื้อหนังสือแล้วอ่านได้ที่ไหน",
    answer: "ไปที่ชั้นหนังสือของฉัน หลังจากระบบยืนยันรายการซื้อสำเร็จ",
  },
  {
    question: "เติมเหรียญแล้วไม่ขึ้นต้องทำอย่างไร",
    answer: "เปิดหน้ากระเป๋าเหรียญแล้วกดรีเฟรช หากยังไม่ขึ้นให้ส่งเลขอ้างอิงผ่านแบบฟอร์มแจ้งปัญหา",
  },
  {
    question: "ต้องการใช้โหมดช่วยการเข้าถึง",
    answer: "กดปุ่มการเข้าถึงด้านล่างหน้าจอเพื่อปรับตัวอักษร สี และการอ่าน UI",
  },
];

function saveLocalTicket(payload: Record<string, unknown>) {
  const key = "read_voice_support_requests";
  const current = JSON.parse(localStorage.getItem(key) || "[]");
  current.unshift(payload);
  localStorage.setItem(key, JSON.stringify(current.slice(0, 20)));
}

async function submitSupportRequest() {
  errorMessage.value = "";
  statusMessage.value = "";

  if (!name.value.trim() || !email.value.trim() || !subject.value.trim() || !message.value.trim()) {
    errorMessage.value = "กรุณากรอกชื่อ อีเมล หัวข้อ และรายละเอียดให้ครบ";
    return;
  }

  const payload = {
    name: name.value.trim(),
    email: email.value.trim(),
    subject: subject.value.trim(),
    message: message.value.trim(),
    category: category.value,
    path: window.location.pathname,
    created_at: new Date().toISOString(),
    authenticated: isAuthenticated(),
  };

  try {
    saving.value = true;
    await api.post("/support/tickets", payload);
    statusMessage.value = "ส่งคำขอถึงทีมงานแล้ว";
  } catch {
    saveLocalTicket(payload);
    statusMessage.value =
      "บันทึกคำขอไว้ในเครื่องนี้แล้ว หากเชื่อมต่อระบบหลังบ้านพร้อม ระบบสามารถนำข้อมูลนี้ไปใช้ต่อได้";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="support-page">
    <section class="support-head">
      <div>
        <p>Support</p>
        <h1>{{ title }}</h1>
        <span>{{ intro }}</span>
      </div>
      <button type="button" @click="router.push('/search')">ค้นหาหนังสือ</button>
    </section>

    <section class="support-layout">
      <aside class="faq-panel" aria-label="คำถามที่พบบ่อย">
        <h2>คำถามที่พบบ่อย</h2>
        <article v-for="item in faqs" :key="item.question">
          <h3>{{ item.question }}</h3>
          <p>{{ item.answer }}</p>
        </article>
      </aside>

      <form class="support-form" @submit.prevent="submitSupportRequest">
        <h2>{{ mode === "report" ? "รายละเอียดปัญหา" : "ส่งข้อความถึงทีมงาน" }}</h2>

        <label>
          ประเภทเรื่อง
          <select v-model="category">
            <option value="general">คำถามทั่วไป</option>
            <option value="payment">การชำระเงินหรือเหรียญ</option>
            <option value="book">หนังสือหรือการอ่าน</option>
            <option value="accessibility">การช่วยการเข้าถึง</option>
            <option value="problem">แจ้งปัญหา</option>
          </select>
        </label>

        <label>
          ชื่อ
          <input v-model="name" type="text" autocomplete="name" />
        </label>

        <label>
          อีเมล
          <input v-model="email" type="email" autocomplete="email" />
        </label>

        <label>
          หัวข้อ
          <input v-model="subject" type="text" />
        </label>

        <label>
          รายละเอียด
          <textarea v-model="message" rows="7" />
        </label>

        <p v-if="errorMessage" class="notice error">{{ errorMessage }}</p>
        <p v-if="statusMessage" class="notice success">{{ statusMessage }}</p>

        <button type="submit" :disabled="saving">
          {{ saving ? "กำลังส่ง..." : "ส่งคำขอ" }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.support-page {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: var(--page-block) var(--page-gutter) 56px;
}

.support-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 20px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 24px;
}

.support-head p,
.support-head h1,
.support-head span {
  margin: 0;
}

.support-head p {
  color: var(--primary);
  font-weight: 900;
}

.support-head h1 {
  margin-top: 8px;
  color: var(--text-strong);
  font-size: 36px;
  line-height: 1.2;
}

.support-head span {
  display: block;
  margin-top: 10px;
  color: var(--text-muted);
}

.support-head button,
.support-form button {
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

.support-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.2fr);
  gap: 18px;
  margin-top: 22px;
}

.faq-panel,
.support-form {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 22px;
}

.faq-panel h2,
.support-form h2 {
  margin: 0 0 16px;
  color: var(--text-strong);
}

.faq-panel article {
  border-top: 1px solid var(--border);
  padding: 14px 0;
}

.faq-panel h3 {
  margin: 0 0 6px;
  color: var(--text-strong);
  font-size: 18px;
}

.faq-panel p {
  margin: 0;
  color: var(--text-muted);
}

.support-form {
  display: grid;
  gap: 14px;
}

.support-form label {
  display: grid;
  gap: 6px;
  color: var(--text-strong);
  font-weight: 800;
}

.support-form input,
.support-form select,
.support-form textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-strong);
  font: inherit;
  padding: 10px 12px;
}

.notice {
  border-radius: 8px;
  margin: 0;
  padding: 12px;
}

.notice.error {
  background: #fef2f2;
  color: var(--danger);
}

.notice.success {
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.support-form button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 820px) {
  .support-head,
  .support-layout {
    grid-template-columns: 1fr;
  }

  .support-head {
    align-items: start;
    flex-direction: column;
  }
}
</style>
