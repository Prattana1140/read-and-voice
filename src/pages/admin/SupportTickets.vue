<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api, { resolveAssetUrl } from "../../utils/api";

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
  page_url?: string | null;
  steps_to_reproduce?: string | null;
  expected_result?: string | null;
  actual_result?: string | null;
  attachment_url?: string | null;
  browser_info?: string | null;
  status: string;
  admin_note?: string | null;
  created_at?: string | null;
  handled_at?: string | null;
  handled_by_name?: string | null;
};

type TicketSummary = {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
};

const statusFilter = ref<TicketStatus>("open");
const statusOptions: TicketStatus[] = ["open", "in_progress", "resolved", "closed", "all"];
const items = ref<SupportTicket[]>([]);
const summary = ref<TicketSummary>({
  total: 0,
  open: 0,
  in_progress: 0,
  resolved: 0,
  closed: 0,
});
const notes = ref<Record<number, string>>({});
const loading = ref(true);
const savingId = ref<number | null>(null);
const message = ref("");
const errorMessage = ref("");

const effectiveSummary = computed(() => mergeSummary(summary.value, items.value));
const openCount = computed(() => effectiveSummary.value.open);
const activeCount = computed(() => effectiveSummary.value.in_progress);
const visibleCount = computed(() => items.value.length);
const currentFilterLabel = computed(() => statusLabel(statusFilter.value));

function emptySummary(): TicketSummary {
  return {
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };
}

function normalizeTicketStatus(status?: string | null): Exclude<TicketStatus, "all"> | "" {
  const value = String(status || "").trim().toLowerCase();
  if (value === "open" || value === "in_progress" || value === "resolved" || value === "closed") {
    return value;
  }
  return "";
}

function summarizeTickets(source: SupportTicket[]): TicketSummary {
  const result = emptySummary();
  source.forEach((item) => {
    const status = normalizeTicketStatus(item.status);
    if (!status) return;
    result[status] += 1;
    result.total += 1;
  });
  return result;
}

function mergeSummary(remoteSummary: any, visibleItems: SupportTicket[]): TicketSummary {
  const visibleSummary = summarizeTickets(visibleItems);
  const merged = {
    total: Number(remoteSummary?.total || 0),
    open: Number(remoteSummary?.open || 0),
    in_progress: Number(remoteSummary?.in_progress || 0),
    resolved: Number(remoteSummary?.resolved || 0),
    closed: Number(remoteSummary?.closed || 0),
  };

  (["open", "in_progress", "resolved", "closed"] as const).forEach((status) => {
    merged[status] = Math.max(merged[status], visibleSummary[status]);
  });
  merged.total = Math.max(
    merged.total,
    visibleSummary.total,
    merged.open + merged.in_progress + merged.resolved + merged.closed,
  );
  return merged;
}

async function loadItems() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/support/tickets", {
      params: { status: statusFilter.value },
    });
    items.value = Array.isArray(data?.items) ? data.items : [];
    summary.value = mergeSummary(data?.summary, items.value);
    notes.value = Object.fromEntries(items.value.map((item) => [item.id, item.admin_note || ""]));
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดรายการคำขอช่วยเหลือไม่สำเร็จ";
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
    message.value = `อัปเดตสถานะเป็น "${statusLabel(status)}" แล้ว`;
    await loadItems();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "อัปเดตคำขอช่วยเหลือไม่สำเร็จ";
  } finally {
    savingId.value = null;
  }
}

function openReplyEmail(item: SupportTicket) {
  const subject = `Re: ${item.subject}`;
  const extraDetails = detailRows(item)
    .map((row) => `${row.label}: ${row.value}`)
    .join("\n");
  const body = [
    `สวัสดีคุณ ${item.name}`,
    "",
    "ทีมงาน Read and Voice ได้รับข้อความของคุณแล้ว",
    "",
    "รายละเอียดที่คุณแจ้ง:",
    item.message,
    extraDetails ? `\nข้อมูลประกอบ:\n${extraDetails}` : "",
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
  if (status === "resolved") return "ตอบกลับแล้ว";
  if (status === "closed") return "ปิดแล้ว";
  if (status === "all") return "ทั้งหมด";
  return status;
}

function statusClass(status: string) {
  return {
    "status-open": status === "open",
    "status-progress": status === "in_progress",
    "status-resolved": status === "resolved",
    "status-closed": status === "closed",
  };
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

function sourceLabel(path?: string | null) {
  if (!path) return "ไม่ระบุช่องทาง";
  if (path.includes("/report")) return "รายงานปัญหา";
  if (path.includes("/contact")) return "ติดต่อเรา";
  if (path.includes("/support")) return "ศูนย์ช่วยเหลือ";
  return "แบบฟอร์มในเว็บไซต์";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayValue(value?: string | number | null) {
  const text = String(value ?? "").trim();
  return text || "ยังไม่ได้แจ้ง";
}

function detailRows(item: SupportTicket) {
  return [
    { label: "หน้าหรือลิงก์ที่พบปัญหา", value: displayValue(item.page_url || item.path || "") },
    { label: "ขั้นตอนที่ผู้ใช้ทำ", value: displayValue(item.steps_to_reproduce || "") },
    { label: "สิ่งที่คาดหวัง", value: displayValue(item.expected_result || "") },
    { label: "สิ่งที่เกิดขึ้นจริง", value: displayValue(item.actual_result || "") },
  ];
}

function attachmentUrl(item: SupportTicket) {
  return item.attachment_url ? resolveAssetUrl(item.attachment_url) : "";
}

function canSetStatus(item: SupportTicket, status: Exclude<TicketStatus, "all">) {
  return item.status !== status && savingId.value !== item.id;
}

function canMarkResolved(item: SupportTicket) {
  return canSetStatus(item, "resolved") && Boolean((notes.value[item.id] || "").trim());
}

function closeTicket(item: SupportTicket) {
  const confirmed = window.confirm("ต้องการปิดคำขอนี้ใช่ไหม?");
  if (!confirmed) return;
  updateTicket(item, "closed");
}

onMounted(loadItems);
</script>

<template>
  <main class="tickets-page">
    <section class="hero">
      <div>
        <p>คำขอช่วยเหลือ</p>
        <h1>ศูนย์ดูแลผู้ใช้</h1>
        <span>รวมคำขอจากหน้าติดต่อเรา รายงานปัญหา และศูนย์ช่วยเหลือ เพื่อให้แอดมินติดตามและตอบกลับได้</span>
      </div>
      <div class="summary-grid">
        <div class="summary-card total">
          <strong>{{ effectiveSummary.total }}</strong>
          <span>ทั้งหมด</span>
        </div>
        <div class="summary-card">
          <strong>{{ openCount }}</strong>
          <span>เปิดใหม่</span>
        </div>
        <div class="summary-card progress">
          <strong>{{ activeCount }}</strong>
          <span>กำลังดูแล</span>
        </div>
      </div>
    </section>

    <p v-if="message" class="message success">{{ message }}</p>
    <p v-if="errorMessage" class="message error">{{ errorMessage }}</p>

    <section class="toolbar">
      <label>
        <span>กรองตามสถานะ</span>
        <select class="status-select" v-model="statusFilter" @change="loadItems">
          <option value="open">เปิดใหม่</option>
          <option value="in_progress">กำลังดูแล</option>
          <option value="resolved">ตอบกลับแล้ว</option>
          <option value="closed">ปิดแล้ว</option>
          <option value="all">ทั้งหมด</option>
        </select>
        <div class="status-tabs" aria-label="กรองสถานะคำขอ">
          <button
            v-for="status in statusOptions"
            :key="status"
            type="button"
            :class="[{ active: statusFilter === status }, statusClass(status)]"
            @click="setStatusFilter(status)"
          >
            {{ statusLabel(status) }}
          </button>
        </div>
      </label>

      <div class="toolbar-meta">
        <span>กำลังแสดง: {{ currentFilterLabel }}</span>
        <strong>{{ visibleCount }} รายการ</strong>
      </div>

      <button type="button" class="refresh-btn" @click="loadItems">รีเฟรช</button>
    </section>

    <section v-if="loading" class="state-box empty-state">
      <strong>กำลังโหลดคำขอช่วยเหลือ...</strong>
      <span>ระบบกำลังตรวจสอบคำขอจากผู้ใช้ตามสถานะที่เลือก</span>
    </section>
    <section v-else-if="items.length === 0" class="state-box empty-state">
      <strong>ไม่มีคำขอช่วยเหลือในสถานะนี้</strong>
      <span>เมื่อมีผู้ใช้ส่งคำขอ หรือมีรายการตรงกับตัวกรอง รายการจะแสดงที่นี่</span>
      <button type="button" @click="loadItems">รีเฟรช</button>
    </section>

    <section v-else class="ticket-list">
      <article v-for="item in items" :key="item.id" class="ticket-card" :class="statusClass(item.status)">
        <div class="ticket-main">
          <div>
            <div class="ticket-badges">
              <span class="category-badge">{{ categoryLabel(item.category) }}</span>
              <span class="status-badge" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
              <span class="source-badge">{{ sourceLabel(item.path) }}</span>
            </div>
            <h2>{{ item.subject }}</h2>
            <span>{{ item.name }} · {{ item.email }}</span>
          </div>
          <div class="date-box">
            <span>สร้างเมื่อ</span>
            <strong>{{ formatDate(item.created_at) }}</strong>
          </div>
        </div>

        <p class="ticket-message">{{ item.message }}</p>

        <section class="request-details" aria-label="รายละเอียดคำขอจากผู้ใช้">
          <div class="detail-grid">
            <article v-for="row in detailRows(item)" :key="row.label">
              <span>{{ row.label }}</span>
              <p>{{ row.value }}</p>
            </article>
          </div>

          <div class="attachment-box">
            <span>รูปภาพแนบจากผู้ใช้</span>
            <a v-if="item.attachment_url" :href="attachmentUrl(item)" target="_blank" rel="noreferrer">
              <img :src="attachmentUrl(item)" alt="รูปภาพแนบจากคำขอช่วยเหลือ" />
              <strong>เปิดรูปขนาดเต็ม</strong>
            </a>
            <div v-else class="attachment-empty">
              <strong>ไม่มีรูปภาพแนบ</strong>
              <p>ถ้าต้องใช้ภาพประกอบ ให้ตอบกลับขอรูปหน้าจอเพิ่มเติมจากผู้ใช้</p>
            </div>
          </div>

          <details class="browser-details">
            <summary>ข้อมูลเครื่อง/เบราว์เซอร์</summary>
            <p>{{ displayValue(item.browser_info) }}</p>
          </details>
        </section>

        <dl>
          <div>
            <dt>รหัสผู้ใช้</dt>
            <dd>{{ item.user_id || "-" }}</dd>
          </div>
          <div>
            <dt>อัปเดตล่าสุด</dt>
            <dd>{{ formatDate(item.handled_at) }}</dd>
          </div>
          <div>
            <dt>ผู้ดูแล</dt>
            <dd>{{ item.handled_by_name || "ยังไม่มีผู้ดูแล" }}</dd>
          </div>
        </dl>

        <label class="note-field">
          <span>ข้อความตอบกลับถึงผู้ใช้ / บันทึกแอดมิน</span>
          <textarea
            v-model.trim="notes[item.id]"
            rows="4"
            placeholder="สรุปสิ่งที่ตรวจสอบ วิธีแก้ไข หรือข้อความตอบกลับผู้ใช้"
          />
        </label>

        <div class="actions">
          <button
            type="button"
            class="primary"
            :disabled="!canSetStatus(item, 'in_progress')"
            @click="updateTicket(item, 'in_progress')"
          >
            รับเรื่อง
          </button>
          <button type="button" :disabled="savingId === item.id" @click="openReplyEmail(item)">
            เปิดอีเมลตอบกลับ
          </button>
          <button
            type="button"
            class="resolved-action"
            :disabled="!canMarkResolved(item)"
            title="กรอกข้อความตอบกลับหรือบันทึกแอดมินก่อนทำเครื่องหมายว่าตอบแล้ว"
            @click="updateTicket(item, 'resolved')"
          >
            ทำเครื่องหมายว่าตอบแล้ว
          </button>
          <button
            type="button"
            class="ghost"
            :disabled="!canSetStatus(item, 'closed')"
            @click="closeTicket(item)"
          >
            ปิดคำขอ
          </button>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.tickets-page {
  display: grid;
  align-content: start;
  gap: 18px;
  margin: 0 auto;
  min-height: calc(100vh - 180px);
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
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 24px;
}

.hero p,
.hero h1,
.hero span,
.ticket-card h2,
.ticket-message {
  margin: 0;
}

.hero p {
  color: var(--primary);
  font-size: 14px;
  font-weight: 900;
}

.hero h1,
.ticket-card h2 {
  color: var(--text-strong);
}

.hero h1 {
  font-size: 30px;
  margin: 5px 0;
}

.hero span,
.ticket-card span,
dd,
dt,
.ticket-message {
  color: var(--text-muted);
}

.summary-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, 132px);
}

.summary-card {
  background: #ecfdf5;
  border-radius: 8px;
  color: #047857;
  padding: 16px;
  text-align: center;
}

.summary-card.total {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.summary-card.progress {
  background: #eff6ff;
  color: #2563eb;
}

.summary-card strong,
.summary-card span {
  display: block;
}

.summary-card strong {
  font-size: 30px;
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

.toolbar-meta {
  display: grid;
  gap: 3px;
  margin-left: auto;
  text-align: right;
}

.toolbar-meta span {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 800;
}

.toolbar-meta strong {
  color: var(--text-strong);
  font-size: 16px;
}

label {
  display: grid;
  gap: 8px;
  font-weight: 900;
}

select,
textarea {
  background: var(--surface);
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

button.resolved-action {
  background: #dcfce7;
  color: #166534;
}

button.ghost {
  background: #fef2f2;
  color: #b42318;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.state-box {
  color: var(--text-muted);
  padding: 24px;
  text-align: center;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  min-height: 180px;
  padding: 30px 18px;
}

.empty-state strong {
  color: var(--text-strong);
  font-size: 20px;
}

.empty-state span {
  max-width: 520px;
  color: var(--text-muted);
  line-height: 1.7;
}

.empty-state button {
  margin-top: 2px;
  background: var(--primary);
  color: var(--on-primary);
}

.ticket-list {
  display: grid;
  gap: 12px;
}

.ticket-card {
  border-left-width: 5px;
  display: grid;
  gap: 16px;
  padding: 18px;
}

.ticket-card.status-open {
  border-left-color: #f59e0b;
}

.ticket-card.status-progress {
  border-left-color: #2563eb;
}

.ticket-card.status-resolved {
  border-left-color: #16a34a;
}

.ticket-card.status-closed {
  border-left-color: #94a3b8;
}

.ticket-main {
  align-items: start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.ticket-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 7px;
}

.category-badge,
.source-badge,
.status-badge {
  align-items: center;
  border-radius: 999px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  min-height: 26px;
  padding: 0 9px;
}

.category-badge {
  background: #f0fdfa;
  color: #0f766e;
}

.source-badge {
  background: var(--surface-soft);
  color: var(--text-muted);
}

.status-badge.status-open {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-progress {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-badge.status-resolved {
  background: #dcfce7;
  color: #166534;
}

.status-badge.status-closed {
  background: #f1f5f9;
  color: #475569;
}

.date-box {
  min-width: 180px;
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

.request-details {
  border: 1px solid var(--border);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  padding: 12px;
}

.detail-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-grid article {
  background: var(--surface-soft);
  border-radius: 8px;
  padding: 10px;
}

.detail-grid span,
.attachment-box > span,
.browser-details summary {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 900;
}

.detail-grid p,
.browser-details p {
  color: var(--text-muted);
  line-height: 1.65;
  margin: 5px 0 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.attachment-box {
  display: grid;
  gap: 8px;
}

.attachment-box a {
  align-items: start;
  color: var(--primary);
  display: inline-grid;
  gap: 7px;
  justify-items: start;
  text-decoration: none;
}

.attachment-empty {
  background: var(--surface-soft);
  border: 1px dashed var(--border);
  border-radius: 8px;
  display: grid;
  gap: 4px;
  min-height: 96px;
  padding: 14px;
}

.attachment-empty strong {
  color: var(--text-strong);
}

.attachment-empty p {
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

.attachment-box img {
  max-height: 220px;
  max-width: min(360px, 100%);
  border: 1px solid var(--border);
  border-radius: 8px;
  object-fit: contain;
}

.browser-details {
  color: var(--text-muted);
}

dl {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}

dt {
  font-size: 14px;
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

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .toolbar-meta {
    margin-left: 0;
    text-align: left;
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

  .empty-state {
    min-height: 150px;
    padding: 18px 12px;
  }

  .empty-state strong {
    font-size: 15px;
  }

  .empty-state span {
    font-size: 12px;
    line-height: 1.35;
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
    min-width: 0;
    text-align: left;
  }

  dl {
    gap: 7px;
    grid-template-columns: 1fr;
  }

  .detail-grid {
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

  .status-tabs button.active.status-open {
    background: #fef3c7;
    color: #92400e;
  }

  .status-tabs button.active.status-progress {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .status-tabs button.active.status-resolved {
    background: #dcfce7;
    color: #166534;
  }

  .status-tabs button.active.status-closed {
    background: #e2e8f0;
    color: #334155;
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
