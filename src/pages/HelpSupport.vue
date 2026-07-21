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
const pageUrl = ref(typeof window !== "undefined" ? window.location.href : "");
const stepsToReproduce = ref("");
const expectedResult = ref("");
const actualResult = ref("");
const attachmentFile = ref<File | null>(null);
const attachmentPreview = ref("");
const saving = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");

const title = computed(() => {
  if (mode.value === "report") return "แจ้งปัญหาการใช้งาน";
  if (mode.value === "contact") return "ติดต่อทีม Read and Voice";
  return "ศูนย์ช่วยเหลือ";
});

const intro = computed(() => {
  if (mode.value === "report") {
    return "บอกปัญหาที่พบพร้อมขั้นตอนและรูปประกอบ เพื่อให้ทีมงานตรวจสอบได้เร็วขึ้น";
  }
  if (mode.value === "contact") {
    return "ส่งคำถาม ข้อเสนอแนะ หรือเรื่องที่ต้องการให้ทีมงานช่วยดูแล";
  }
  return "ค้นหาคำตอบเบื้องต้น หรือส่งคำขอให้ทีมงานจากแบบฟอร์มด้านล่าง";
});

const detailTips = [
  "ระบุหน้าหรือเมนูที่พบปัญหา เช่น ชั้นหนังสือ, เติมเหรียญ, อ่านหนังสือ",
  "เขียนขั้นตอนที่ทำก่อนเกิดปัญหาแบบเรียงลำดับ",
  "บอกสิ่งที่คาดหวังและสิ่งที่เกิดขึ้นจริงให้ต่างกันชัดเจน",
  "แนบรูปหน้าจอเมื่อมีข้อความ error หรือหน้าจอแสดงผลผิด",
];

const faqs = [
  {
    question: "ซื้อหนังสือแล้วอ่านได้ที่ไหน",
    answer: "ไปที่ชั้นหนังสือของฉัน หลังจากระบบยืนยันรายการซื้อสำเร็จ",
  },
  {
    question: "เติมเหรียญแล้วไม่ขึ้นต้องทำอย่างไร",
    answer: "เปิดหน้ากระเป๋าเหรียญแล้วกดรีเฟรช หากยังไม่ขึ้นให้แจ้งเลขอ้างอิงหรือแนบสลิปผ่านฟอร์มนี้",
  },
  {
    question: "ควรแนบข้อมูลอะไรเมื่อแจ้งปัญหา",
    answer: "แนบหน้าที่พบปัญหา ขั้นตอนที่ทำ ผลลัพธ์ที่คาดหวัง ผลลัพธ์จริง และรูปหน้าจอถ้ามี",
  },
];

function saveLocalTicket(payload: Record<string, unknown>) {
  const key = "read_voice_support_requests";
  const current = JSON.parse(localStorage.getItem(key) || "[]");
  current.unshift(payload);
  localStorage.setItem(key, JSON.stringify(current.slice(0, 20)));
}

function onAttachmentChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] || null;

  errorMessage.value = "";
  attachmentFile.value = null;
  attachmentPreview.value = "";

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    errorMessage.value = "กรุณาแนบไฟล์รูปภาพเท่านั้น";
    input.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = "รูปภาพแนบต้องมีขนาดไม่เกิน 5MB";
    input.value = "";
    return;
  }

  attachmentFile.value = file;
  attachmentPreview.value = URL.createObjectURL(file);
}

function removeAttachment() {
  if (attachmentPreview.value) URL.revokeObjectURL(attachmentPreview.value);
  attachmentFile.value = null;
  attachmentPreview.value = "";
}

function buildPayload() {
  return {
    name: name.value.trim(),
    email: email.value.trim(),
    subject: subject.value.trim(),
    message: message.value.trim(),
    category: category.value,
    path: window.location.pathname,
    page_url: pageUrl.value.trim(),
    steps_to_reproduce: stepsToReproduce.value.trim(),
    expected_result: expectedResult.value.trim(),
    actual_result: actualResult.value.trim(),
    browser_info: navigator.userAgent,
    created_at: new Date().toISOString(),
    authenticated: isAuthenticated(),
  };
}

function buildFormData(payload: ReturnType<typeof buildPayload>) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, String(value || ""));
  });
  if (attachmentFile.value) {
    formData.append("attachment", attachmentFile.value);
  }
  return formData;
}

function resetRequestFields() {
  subject.value = "";
  message.value = "";
  stepsToReproduce.value = "";
  expectedResult.value = "";
  actualResult.value = "";
  removeAttachment();
}

async function submitSupportRequest() {
  errorMessage.value = "";
  statusMessage.value = "";

  if (!name.value.trim() || !email.value.trim() || !subject.value.trim() || !message.value.trim()) {
    errorMessage.value = "กรุณากรอกชื่อ อีเมล หัวข้อ และรายละเอียดให้ครบ";
    return;
  }

  const payload = buildPayload();

  try {
    saving.value = true;
    await api.post("/support/tickets", buildFormData(payload));
    statusMessage.value = "ส่งคำขอถึงทีมงานแล้ว ทีมงานจะตรวจสอบและติดต่อกลับตามข้อมูลที่ให้ไว้";
    resetRequestFields();
  } catch {
    saveLocalTicket({ ...payload, attachment_name: attachmentFile.value?.name || "" });
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

        <div class="tips-box">
          <h2>ข้อมูลที่ช่วยให้แก้ปัญหาเร็วขึ้น</h2>
          <ul>
            <li v-for="tip in detailTips" :key="tip">{{ tip }}</li>
          </ul>
        </div>
      </aside>

      <form class="support-form" @submit.prevent="submitSupportRequest">
        <div>
          <h2>{{ mode === "report" ? "รายละเอียดปัญหา" : "ส่งข้อความถึงทีมงาน" }}</h2>
          <p>ข้อมูลเหล่านี้จะแสดงในหน้าแอดมิน เพื่อให้ทั้งสองฝ่ายเห็นเรื่องเดียวกันและติดตามง่ายขึ้น</p>
        </div>

        <label>
          ประเภทเรื่อง
          <select v-model="category">
            <option value="general">คำถามทั่วไป</option>
            <option value="payment">การชำระเงินหรือเหรียญ</option>
            <option value="book">หนังสือหรือการอ่าน</option>
            <option value="accessibility">การช่วยการเข้าถึง</option>
            <option value="problem">แจ้งปัญหา</option>
            <option value="suggestion">ข้อเสนอแนะ</option>
          </select>
        </label>

        <div class="field-grid">
          <label>
            ชื่อ
            <input v-model="name" type="text" autocomplete="name" />
          </label>

          <label>
            อีเมลสำหรับติดต่อกลับ
            <input v-model="email" type="email" autocomplete="email" />
          </label>
        </div>

        <label>
          หัวข้อ
          <input v-model="subject" type="text" placeholder="เช่น อ่านเสียงของหนังสือไม่ตรง / เติมเหรียญแล้วยังไม่ขึ้น" />
        </label>

        <label>
          หน้าหรือลิงก์ที่พบปัญหา
          <input v-model="pageUrl" type="text" placeholder="เช่น /reader/12 หรือ URL ของหน้าที่พบปัญหา" />
        </label>

        <label>
          รายละเอียดหลัก
          <textarea v-model="message" rows="5" placeholder="เล่าว่าเกิดอะไรขึ้น กระทบการใช้งานอย่างไร และต้องการให้ทีมงานช่วยอะไร" />
        </label>

        <div class="field-grid">
          <label>
            ขั้นตอนที่ทำก่อนพบปัญหา
            <textarea v-model="stepsToReproduce" rows="4" placeholder="1. เปิดหน้า... 2. กดปุ่ม... 3. พบว่า..." />
          </label>

          <label>
            สิ่งที่เกิดขึ้นจริง
            <textarea v-model="actualResult" rows="4" placeholder="เช่น ระบบไม่เล่นเสียง / ปุ่มกดไม่ได้ / มีข้อความ error" />
          </label>
        </div>

        <label>
          สิ่งที่คาดหวัง
          <textarea v-model="expectedResult" rows="3" placeholder="เช่น ต้องการให้เสียงเล่นต่อเนื่อง หรือรายการเติมเหรียญขึ้นเป็นอนุมัติแล้ว" />
        </label>

        <label class="attachment-field">
          แนบรูปภาพประกอบ
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onAttachmentChange" />
          <span>รองรับ PNG, JPG, WEBP, GIF ขนาดไม่เกิน 5MB</span>
        </label>

        <div v-if="attachmentPreview" class="attachment-preview">
          <img :src="attachmentPreview" alt="ตัวอย่างรูปภาพแนบ" />
          <button type="button" @click="removeAttachment">ลบรูปแนบ</button>
        </div>

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
.support-head span,
.support-form h2,
.support-form p {
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

.support-head span,
.support-form p,
.attachment-field span {
  display: block;
  margin-top: 10px;
  color: var(--text-muted);
}

.support-head button,
.support-form > button,
.attachment-preview button {
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
  color: var(--text-strong);
}

.faq-panel h2 {
  margin: 0 0 16px;
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

.faq-panel p,
.tips-box li {
  margin: 0;
  color: var(--text-muted);
}

.tips-box {
  border-top: 1px solid var(--border);
  margin-top: 8px;
  padding-top: 16px;
}

.tips-box ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
}

.support-form {
  display: grid;
  gap: 14px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
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

.support-form textarea {
  resize: vertical;
}

.attachment-field {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 14px;
}

.attachment-field span {
  margin-top: 0;
  font-weight: 700;
}

.attachment-preview {
  align-items: start;
  display: grid;
  gap: 10px;
}

.attachment-preview img {
  max-height: 260px;
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  object-fit: contain;
}

.attachment-preview button {
  justify-self: start;
  background: #fef2f2;
  color: #b42318;
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
  .support-layout,
  .field-grid {
    grid-template-columns: 1fr;
  }

  .support-head {
    align-items: start;
    flex-direction: column;
  }
}
</style>
