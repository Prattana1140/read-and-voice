<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api from "../../utils/api";

type ResetStatus = "pending" | "link_created" | "temporary_password_created" | "resolved" | "rejected" | "all";

type ResetRequest = {
  id: number;
  user_id: number;
  email: string;
  name?: string | null;
  role?: string | null;
  status: string;
  delivery_method?: string | null;
  admin_note?: string | null;
  requested_at?: string | null;
  handled_at?: string | null;
  handled_by_name?: string | null;
};

const statusFilter = ref<ResetStatus>("pending");
const statusOptions: ResetStatus[] = ["pending", "link_created", "temporary_password_created", "resolved", "rejected", "all"];
const items = ref<ResetRequest[]>([]);
const loading = ref(true);
const savingId = ref<number | null>(null);
const message = ref("");
const errorMessage = ref("");
const generatedLinks = ref<Record<number, string>>({});
const temporaryPasswords = ref<Record<number, string>>({});
const notes = ref<Record<number, string>>({});

const pendingCount = computed(() => items.value.filter((item) => item.status === "pending").length);

async function loadItems() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/admin/password-resets", {
      params: { status: statusFilter.value },
    });
    items.value = Array.isArray(data?.items) ? data.items : [];
    notes.value = Object.fromEntries(items.value.map((item) => [item.id, item.admin_note || ""]));
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดคำขอรีเซ็ตรหัสผ่านไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function createLink(item: ResetRequest) {
  savingId.value = item.id;
  message.value = "";
  errorMessage.value = "";

  try {
    const { data } = await api.post(`/admin/password-resets/${item.id}/link`, {
      note: notes.value[item.id] || "สร้างลิงก์และส่งให้ผู้ใช้เอง",
    });
    generatedLinks.value[item.id] = String(data?.reset_url || "");
    message.value = "สร้างลิงก์แล้ว ให้คัดลอกและส่งให้ผู้ใช้ภายใน 1 ชั่วโมง";
    await copyText(generatedLinks.value[item.id], false);
    await loadItems();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "สร้างลิงก์รีเซ็ตไม่สำเร็จ";
  } finally {
    savingId.value = null;
  }
}

async function createTemporaryPassword(item: ResetRequest) {
  const confirmed = window.confirm(
    "ต้องการสร้างรหัสผ่านชั่วคราวใช่ไหม? รหัสผ่านเดิมของผู้ใช้จะถูกเปลี่ยนทันที",
  );
  if (!confirmed) return;

  savingId.value = item.id;
  message.value = "";
  errorMessage.value = "";

  try {
    const { data } = await api.post(`/admin/password-resets/${item.id}/temporary-password`, {
      note: notes.value[item.id] || "สร้างรหัสผ่านชั่วคราวและส่งให้ผู้ใช้เอง",
    });
    temporaryPasswords.value[item.id] = String(data?.temporary_password || "");
    message.value = "สร้างรหัสผ่านชั่วคราวแล้ว ให้ส่งรหัสนี้ให้ผู้ใช้และแนะนำให้เปลี่ยนรหัสหลังเข้าสู่ระบบ";
    await copyText(temporaryPasswords.value[item.id], false);
    await loadItems();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "สร้างรหัสผ่านชั่วคราวไม่สำเร็จ";
  } finally {
    savingId.value = null;
  }
}

async function updateStatus(item: ResetRequest, status: "resolved" | "rejected" | "pending") {
  savingId.value = item.id;
  message.value = "";
  errorMessage.value = "";

  try {
    await api.patch(`/admin/password-resets/${item.id}`, {
      status,
      note: notes.value[item.id] || "",
    });
    message.value = "อัปเดตสถานะคำขอแล้ว";
    await loadItems();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "อัปเดตสถานะไม่สำเร็จ";
  } finally {
    savingId.value = null;
  }
}

async function copyText(text: string, showMessage = true) {
  if (!text) return;

  await navigator.clipboard.writeText(text);
  if (showMessage) {
    message.value = "คัดลอกลิงก์แล้ว";
  }
}

function buildResetEmailBody(item: ResetRequest, resetUrl: string) {
  return [
    `สวัสดี${item.name ? `คุณ ${item.name}` : ""}`,
    "",
    "คุณได้ส่งคำขอรีเซ็ตรหัสผ่านสำหรับ Read and Voice",
    "กรุณาเปิดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:",
    resetUrl,
    "",
    "ลิงก์นี้ใช้งานได้ภายใน 1 ชั่วโมง หากคุณไม่ได้เป็นผู้ขอรีเซ็ต กรุณาแจ้งทีมงาน",
    "",
    "Read and Voice",
  ].join("\n");
}

function buildTemporaryPasswordEmailBody(item: ResetRequest, temporaryPassword: string) {
  return [
    `สวัสดี${item.name ? `คุณ ${item.name}` : ""}`,
    "",
    "ทีมงาน Read and Voice ได้สร้างรหัสผ่านชั่วคราวให้ตามคำขอรีเซ็ตรหัสผ่านของคุณ",
    "",
    `อีเมลเข้าสู่ระบบ: ${item.email}`,
    `รหัสผ่านชั่วคราว: ${temporaryPassword}`,
    "",
    "หลังเข้าสู่ระบบแล้ว กรุณาเปลี่ยนรหัสผ่านใหม่ทันที และอย่าส่งต่อรหัสนี้ให้ผู้อื่น",
    "",
    "Read and Voice",
  ].join("\n");
}

function openEmailDraft(item: ResetRequest) {
  const resetUrl = generatedLinks.value[item.id];
  if (!resetUrl) {
    message.value = "กรุณาสร้างลิงก์รีเซ็ตก่อน";
    return;
  }

  const subject = "ลิงก์รีเซ็ตรหัสผ่าน Read and Voice";
  const body = buildResetEmailBody(item, resetUrl);
  window.location.href = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function openTemporaryPasswordEmailDraft(item: ResetRequest) {
  const temporaryPassword = temporaryPasswords.value[item.id];
  if (!temporaryPassword) {
    message.value = "กรุณาสร้างรหัสผ่านชั่วคราวก่อน";
    return;
  }

  const subject = "รหัสผ่านชั่วคราว Read and Voice";
  const body = buildTemporaryPasswordEmailBody(item, temporaryPassword);
  window.location.href = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH");
}

function statusLabel(status: string) {
  if (status === "pending") return "รอดำเนินการ";
  if (status === "email_sent") return "ส่งอีเมลแล้ว";
  if (status === "link_created") return "สร้างลิงก์แล้ว";
  if (status === "temporary_password_created") return "สร้างรหัสชั่วคราวแล้ว";
  if (status === "resolved") return "เสร็จแล้ว";
  if (status === "rejected") return "ปฏิเสธ";
  return status;
}

function setStatusFilter(status: ResetStatus) {
  if (statusFilter.value === status) return;
  statusFilter.value = status;
  loadItems();
}

onMounted(loadItems);
</script>

<template>
  <main class="reset-page">
    <section class="hero">
      <div>
        <p>Password reset requests</p>
        <h1>คำขอรีเซ็ตรหัสผ่าน</h1>
        <span>
          ใช้หน้านี้เมื่อต้องช่วยผู้ใช้รีเซ็ตรหัสผ่านโดยไม่ต้องมีระบบส่งอีเมลจริง
          กดสร้างลิงก์แล้วส่งให้ผู้ใช้ผ่านช่องทางที่ยืนยันตัวตนได้
        </span>
      </div>
      <div class="summary-card">
        <strong>{{ pendingCount }}</strong>
        <span>รอดำเนินการ</span>
      </div>
    </section>

    <p v-if="message" class="message success">{{ message }}</p>
    <p v-if="errorMessage" class="message error">{{ errorMessage }}</p>

    <section class="toolbar">
      <label>
        <span>สถานะ</span>
        <select class="status-select" v-model="statusFilter" @change="loadItems">
          <option value="pending">รอดำเนินการ</option>
          <option value="link_created">สร้างลิงก์แล้ว</option>
          <option value="temporary_password_created">สร้างรหัสชั่วคราวแล้ว</option>
          <option value="resolved">เสร็จแล้ว</option>
          <option value="rejected">ปฏิเสธ</option>
          <option value="all">ทั้งหมด</option>
        </select>
        <div class="mobile-tabs" aria-label="กรองสถานะคำขอรีเซ็ตรหัสผ่าน">
          <button
            v-for="status in statusOptions"
            :key="status"
            type="button"
            :class="{ active: statusFilter === status }"
            @click="setStatusFilter(status)"
          >
            {{ statusLabel(status) }}
          </button>
        </div>
      </label>

      <button type="button" @click="loadItems">รีเฟรช</button>
    </section>

    <section v-if="loading" class="state-box">กำลังโหลดคำขอ...</section>
    <section v-else-if="items.length === 0" class="state-box">ยังไม่มีคำขอในสถานะนี้</section>

    <section v-else class="request-list">
      <article v-for="item in items" :key="item.id" class="request-card">
        <div class="request-main">
          <div>
            <p class="eyebrow">{{ statusLabel(item.status) }}</p>
            <h2>{{ item.name || "ผู้ใช้" }}</h2>
            <span>{{ item.email }}</span>
          </div>
          <div class="date-box">
            <strong>{{ formatDate(item.requested_at) }}</strong>
            <span>{{ item.delivery_method || "admin_manual" }}</span>
          </div>
        </div>

        <dl>
          <div>
            <dt>User ID</dt>
            <dd>{{ item.user_id }}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{{ item.role || "-" }}</dd>
          </div>
          <div>
            <dt>จัดการเมื่อ</dt>
            <dd>{{ formatDate(item.handled_at) }}</dd>
          </div>
          <div>
            <dt>แอดมิน</dt>
            <dd>{{ item.handled_by_name || "-" }}</dd>
          </div>
        </dl>

        <label class="note-field">
          <span>หมายเหตุแอดมิน</span>
          <input
            v-model.trim="notes[item.id]"
            type="text"
            placeholder="เช่น ยืนยันผ่าน LINE แล้ว ส่งลิงก์ให้ทาง inbox"
          />
        </label>

        <div v-if="generatedLinks[item.id]" class="link-box">
          <input :value="generatedLinks[item.id]" readonly />
          <button type="button" @click="copyText(generatedLinks[item.id])">คัดลอก</button>
          <button type="button" class="primary" @click="openEmailDraft(item)">เปิดอีเมล</button>
        </div>

        <div v-if="temporaryPasswords[item.id]" class="link-box">
          <input :value="temporaryPasswords[item.id]" readonly />
          <button type="button" @click="copyText(temporaryPasswords[item.id])">คัดลอก</button>
          <button type="button" class="primary" @click="openTemporaryPasswordEmailDraft(item)">เปิดอีเมล</button>
        </div>

        <div class="actions">
          <button
            type="button"
            class="primary"
            :disabled="savingId === item.id"
            @click="createLink(item)"
          >
            สร้างลิงก์รีเซ็ต
          </button>
          <button
            type="button"
            :disabled="savingId === item.id"
            @click="createTemporaryPassword(item)"
          >
            สร้างรหัสชั่วคราว
          </button>
          <button
            type="button"
            :disabled="savingId === item.id"
            @click="updateStatus(item, 'resolved')"
          >
            ส่งให้ผู้ใช้แล้ว
          </button>
          <button
            type="button"
            class="ghost"
            :disabled="savingId === item.id"
            @click="updateStatus(item, 'rejected')"
          >
            ปฏิเสธ
          </button>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.reset-page {
  display: grid;
  gap: 18px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 56px;
  width: min(1180px, 100%);
}

.hero,
.toolbar,
.state-box,
.request-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.hero {
  align-items: center;
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) 180px;
  padding: 24px;
}

.hero p,
.hero h1,
.hero span,
.eyebrow {
  margin: 0;
}

.hero p,
.eyebrow {
  color: #0f766e;
  font-size: 15px;
  font-weight: 900;
  text-transform: uppercase;
}

.hero h1,
.request-card h2 {
  color: var(--text-strong);
  margin: 6px 0;
}

.hero span,
.request-card span,
dd,
dt {
  color: var(--text-muted);
}

.summary-card {
  background: #ecfdf5;
  border-radius: 8px;
  color: #047857;
  padding: 16px;
  text-align: center;
}

.summary-card strong,
.summary-card span {
  display: block;
}

.summary-card strong {
  font-size: 32px;
}

.message {
  border-radius: 8px;
  font-weight: 800;
  margin: 0;
  padding: 12px 14px;
}

.message.success {
  background: #ecfdf5;
  color: #047857;
}

.message.error {
  background: #fef2f2;
  color: #dc2626;
}

.toolbar {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  padding: 16px;
}

label {
  display: grid;
  gap: 8px;
  font-weight: 900;
}

select,
input {
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-strong);
  font: inherit;
  min-height: 42px;
  padding: 0 12px;
}

button {
  background: var(--surface-soft);
  border: 0;
  border-radius: 8px;
  color: var(--text-strong);
  cursor: pointer;
  font-weight: 900;
  min-height: 42px;
  padding: 0 14px;
}

button.primary {
  background: #14b8a6;
  color: white;
}

button.ghost {
  background: #fef2f2;
  color: #b42318;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.mobile-tabs {
  display: none;
}

.state-box {
  color: var(--text-muted);
  padding: 24px;
  text-align: center;
}

.request-list {
  display: grid;
  gap: 12px;
}

.request-card {
  display: grid;
  gap: 16px;
  padding: 18px;
}

.request-main {
  align-items: start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.date-box {
  text-align: right;
}

.date-box strong,
.date-box span {
  display: block;
}

.date-box strong {
  color: var(--text-strong);
}

dl {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
}

dt {
  font-size: 15px;
  font-weight: 900;
}

dd {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
}

.note-field input,
.link-box input {
  width: 100%;
}

.link-box,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.link-box input {
  flex: 1 1 420px;
}

@media (max-width: 760px) {
  .reset-page {
    gap: 10px;
    padding: 10px 16px 24px;
  }

  .hero,
  .request-main,
  .toolbar {
    align-items: stretch;
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero,
  .toolbar,
  .request-card,
  .state-box {
    border-radius: 10px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .hero {
    gap: 9px;
    padding: 12px;
  }

  .hero p,
  .eyebrow,
  dt {
    font-size: 11px;
  }

  .hero h1,
  .request-card h2 {
    margin: 3px 0;
    font-size: 20px;
    line-height: 1.2;
  }

  .hero span,
  .request-card span,
  dd,
  label {
    font-size: 12px;
    line-height: 1.35;
  }

  .summary-card {
    padding: 9px;
  }

  .summary-card strong {
    font-size: 24px;
  }

  .message {
    border-radius: 8px;
    font-size: 12px;
    padding: 8px 9px;
  }

  .toolbar {
    gap: 8px;
    padding: 10px;
  }

  label {
    gap: 5px;
  }

  select,
  input,
  button {
    min-height: 32px;
    border-radius: 7px;
    font-size: 12px;
    padding: 0 9px;
  }

  .state-box {
    padding: 14px;
    font-size: 12px;
  }

  .request-list {
    gap: 8px;
  }

  .request-card {
    gap: 10px;
    padding: 11px;
  }

  .request-main {
    gap: 8px;
  }

  .date-box {
    text-align: left;
  }

  dl {
    gap: 7px;
    grid-template-columns: 1fr;
  }

  dd {
    margin-top: 2px;
  }

  .link-box,
  .actions {
    gap: 7px;
  }

  .actions button,
  select {
    width: 100%;
  }

  .status-select {
    display: none;
  }

  .mobile-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
    width: 100%;
  }

  .mobile-tabs button {
    width: 100%;
    min-height: 27px;
    border-radius: 999px;
    padding: 2px 5px;
    background: var(--surface-soft);
    color: var(--text-strong);
    font-size: 10px;
    line-height: 1.15;
  }

  .mobile-tabs button.active {
    background: #14b8a6;
    color: #ffffff;
  }
}

@media (max-width: 420px) {
  .reset-page {
    padding: 8px 18px 22px;
  }

  .hero h1,
  .request-card h2 {
    font-size: 18px;
  }

  select,
  input,
  button {
    min-height: 29px;
    font-size: 11px;
  }

  .mobile-tabs {
    gap: 4px;
  }

  .mobile-tabs button {
    min-height: 24px;
    font-size: 9px;
    padding: 2px 3px;
  }
}
</style>
