<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api from "../../utils/api";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed" | "all";

type SupportTicket = {
  id: number;
  user_id?: number | null;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  path?: string | null;
  status: string;
  admin_note?: string | null;
  created_at?: string | null;
  handled_at?: string | null;
  handled_by_name?: string | null;
};

const statusFilter = ref<TicketStatus>("open");
const statusOptions: TicketStatus[] = ["open", "in_progress", "resolved", "closed", "all"];
const items = ref<SupportTicket[]>([]);
const notes = ref<Record<number, string>>({});
const loading = ref(true);
const savingId = ref<number | null>(null);
const message = ref("");
const errorMessage = ref("");

const openCount = computed(() => items.value.filter((item) => item.status === "open").length);

async function loadItems() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/support/tickets", {
      params: { status: statusFilter.value },
    });
    items.value = Array.isArray(data?.items) ? data.items : [];
    notes.value = Object.fromEntries(items.value.map((item) => [item.id, item.admin_note || ""]));
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดรายการ support ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function updateTicket(item: SupportTicket, status: Exclude<TicketStatus, "all">) {
  savingId.value = item.id;
  message.value = "";
  errorMessage.value = "";

  try {
    await api.patch(`/support/tickets/${item.id}`, {
      status,
      admin_note: notes.value[item.id] || "",
    });
    message.value = "อัปเดต ticket แล้ว";
    await loadItems();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "อัปเดต ticket ไม่สำเร็จ";
  } finally {
    savingId.value = null;
  }
}

function openReplyEmail(item: SupportTicket) {
  const subject = `Re: ${item.subject}`;
  const body = [
    `สวัสดีคุณ ${item.name}`,
    "",
    "ทีมงาน Read and Voice ได้รับข้อความของคุณแล้ว",
    "",
    "รายละเอียดที่คุณแจ้ง:",
    item.message,
    "",
    "คำตอบจากทีมงาน:",
    notes.value[item.id] || "",
    "",
    "Read and Voice",
  ].join("\n");

  window.location.href = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function statusLabel(status: string) {
  if (status === "open") return "เปิดใหม่";
  if (status === "in_progress") return "กำลังดูแล";
  if (status === "resolved") return "แก้แล้ว";
  if (status === "closed") return "ปิดแล้ว";
  if (status === "all") return "ทั้งหมด";
  return status;
}

function setStatusFilter(status: TicketStatus) {
  if (statusFilter.value === status) return;
  statusFilter.value = status;
  loadItems();
}

function categoryLabel(category: string) {
  if (category === "payment") return "การชำระเงิน";
  if (category === "book") return "หนังสือ/การอ่าน";
  if (category === "accessibility") return "การเข้าถึง";
  if (category === "problem") return "แจ้งปัญหา";
  return "ทั่วไป";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH");
}

onMounted(loadItems);
</script>

<template>
  <main class="tickets-page">
    <section class="hero">
      <div>
        <p>Support tickets</p>
        <h1>คำขอช่วยเหลือจากผู้ใช้</h1>
        <span>รวมข้อความจากหน้า support/contact/report เพื่อให้แอดมินติดตามและตอบกลับได้</span>
      </div>
      <div class="summary-card">
        <strong>{{ openCount }}</strong>
        <span>เปิดใหม่</span>
      </div>
    </section>

    <p v-if="message" class="message success">{{ message }}</p>
    <p v-if="errorMessage" class="message error">{{ errorMessage }}</p>

    <section class="toolbar">
      <label>
        <span>สถานะ</span>
        <select class="status-select" v-model="statusFilter" @change="loadItems">
          <option value="open">เปิดใหม่</option>
          <option value="in_progress">กำลังดูแล</option>
          <option value="resolved">แก้แล้ว</option>
          <option value="closed">ปิดแล้ว</option>
          <option value="all">ทั้งหมด</option>
        </select>
        <div class="status-tabs" aria-label="กรองสถานะคำขอ">
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

    <section v-else class="ticket-list">
      <article v-for="item in items" :key="item.id" class="ticket-card">
        <div class="ticket-main">
          <div>
            <p class="eyebrow">{{ categoryLabel(item.category) }} · {{ statusLabel(item.status) }}</p>
            <h2>{{ item.subject }}</h2>
            <span>{{ item.name }} · {{ item.email }}</span>
          </div>
          <div class="date-box">
            <strong>{{ formatDate(item.created_at) }}</strong>
            <span>{{ item.path || "-" }}</span>
          </div>
        </div>

        <p class="ticket-message">{{ item.message }}</p>

        <dl>
          <div>
            <dt>User ID</dt>
            <dd>{{ item.user_id || "-" }}</dd>
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
          <span>บันทึก/คำตอบแอดมิน</span>
          <textarea
            v-model.trim="notes[item.id]"
            rows="4"
            placeholder="สรุปสิ่งที่ตรวจสอบ หรือข้อความตอบกลับผู้ใช้"
          />
        </label>

        <div class="actions">
          <button type="button" class="primary" :disabled="savingId === item.id" @click="updateTicket(item, 'in_progress')">
            กำลังดูแล
          </button>
          <button type="button" :disabled="savingId === item.id" @click="openReplyEmail(item)">
            เปิดอีเมลตอบกลับ
          </button>
          <button type="button" :disabled="savingId === item.id" @click="updateTicket(item, 'resolved')">
            แก้แล้ว
          </button>
          <button type="button" class="ghost" :disabled="savingId === item.id" @click="updateTicket(item, 'closed')">
            ปิด ticket
          </button>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.tickets-page {
  display: grid;
  gap: 18px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 56px;
  width: min(1180px, 100%);
}

.hero,
.toolbar,
.state-box,
.ticket-card {
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
.eyebrow,
.ticket-message {
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
.ticket-card h2 {
  color: var(--text-strong);
  margin: 6px 0;
}

.hero span,
.ticket-card span,
dd,
dt,
.ticket-message {
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
textarea {
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-strong);
  font: inherit;
  padding: 10px 12px;
}

select {
  min-height: 42px;
}

.status-tabs {
  display: none;
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

.state-box {
  color: var(--text-muted);
  padding: 24px;
  text-align: center;
}

.ticket-list {
  display: grid;
  gap: 12px;
}

.ticket-card {
  display: grid;
  gap: 16px;
  padding: 18px;
}

.ticket-main {
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

.ticket-message {
  background: var(--surface-soft);
  border-radius: 8px;
  line-height: 1.7;
  padding: 12px;
  white-space: pre-wrap;
}

dl {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.note-field textarea {
  width: 100%;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 760px) {
  .tickets-page {
    gap: 10px;
    padding: 10px 16px 24px;
  }

  .hero,
  .ticket-main,
  .toolbar {
    align-items: stretch;
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero,
  .toolbar,
  .ticket-card,
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
  .ticket-card h2 {
    margin: 3px 0;
    font-size: 20px;
    line-height: 1.2;
  }

  .hero span,
  .ticket-card span,
  dd,
  .ticket-message,
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
  textarea,
  button {
    border-radius: 7px;
    font-size: 12px;
  }

  select,
  button {
    min-height: 32px;
    padding: 0 9px;
  }

  textarea {
    padding: 8px 9px;
  }

  .state-box {
    padding: 14px;
    font-size: 12px;
  }

  .ticket-list {
    gap: 8px;
  }

  .ticket-card {
    gap: 10px;
    padding: 11px;
  }

  .ticket-main {
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

  .ticket-message {
    border-radius: 7px;
    padding: 8px;
  }

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

  .status-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
    width: 100%;
  }

  .status-tabs button {
    width: 100%;
    min-height: 27px;
    border-radius: 999px;
    padding: 2px 5px;
    background: var(--surface-soft);
    color: var(--text-strong);
    font-size: 10px;
    line-height: 1.15;
  }

  .status-tabs button.active {
    background: #14b8a6;
    color: #ffffff;
  }
}

@media (max-width: 420px) {
  .tickets-page {
    padding: 8px 18px 22px;
  }

  .hero h1,
  .ticket-card h2 {
    font-size: 18px;
  }

  select,
  textarea,
  button {
    font-size: 11px;
  }

  select,
  button {
    min-height: 29px;
  }

  .status-tabs {
    gap: 4px;
  }

  .status-tabs button {
    min-height: 24px;
    font-size: 9.5px;
    padding: 2px 4px;
  }
}
</style>
