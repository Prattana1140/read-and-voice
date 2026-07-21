<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import api, { API_BASE_URL } from "../../utils/api";

type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "completed" | "all";
type PaymentType = "coin_topup" | "order" | "subscription";

type PaymentItem = {
  item_type: PaymentType;
  id: number;
  user_id: number;
  name?: string;
  email?: string;
  package_id?: string | number | null;
  coins?: number | null;
  amount?: number | null;
  payment_status: string;
  item_status?: string;
  provider_ref?: string | null;
  payer_name?: string | null;
  transfer_amount?: number | null;
  transfer_date?: string | null;
  transfer_time?: string | null;
  slip_image_url?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
  title?: string | null;
  detail?: string | { type?: string; data?: number[] } | null;
};

type PaymentSummary = {
  total: number;
  pending: number;
  paid: number;
  failed: number;
  cancelled: number;
  by_type?: Record<string, { total: number; pending: number; paid: number; failed: number; cancelled: number }>;
};

const statusFilter = ref<PaymentStatus>("pending");
const typeFilter = ref<PaymentType | "all">("all");
const statusOptions: PaymentStatus[] = ["pending", "paid", "failed", "cancelled", "all"];
const typeOptions: Array<PaymentType | "all"> = ["all", "coin_topup", "order", "subscription"];
const route = useRoute();
const items = ref<PaymentItem[]>([]);
const summary = ref<PaymentSummary>({
  total: 0,
  pending: 0,
  paid: 0,
  failed: 0,
  cancelled: 0,
});
const loading = ref(true);
const savingKey = ref("");
const message = ref("");
const errorMessage = ref("");
const adminNotes = ref<Record<string, string>>({});

const visibleItems = computed(() => {
  if (typeFilter.value === "all") return items.value;
  return items.value.filter((item) => item.item_type === typeFilter.value);
});

const effectivePaymentSummary = computed(() => mergePaymentSummary(summary.value, items.value));

const pendingCount = computed(() => {
  return effectivePaymentSummary.value.pending;
});

const typeCounts = computed(() => {
  return {
    coin_topup: Number(effectivePaymentSummary.value.by_type?.coin_topup?.total || 0),
    order: Number(effectivePaymentSummary.value.by_type?.order?.total || 0),
    subscription: Number(effectivePaymentSummary.value.by_type?.subscription?.total || 0),
  };
});

const visibleCount = computed(() => visibleItems.value.length);
const currentFilterLabel = computed(() => {
  return `${statusLabel(statusFilter.value)} / ${typeFilterLabel(typeFilter.value)}`;
});

function itemKey(item: PaymentItem) {
  return `${item.item_type}:${item.id}`;
}

function emptyPaymentSummary(): PaymentSummary {
  return {
    total: 0,
    pending: 0,
    paid: 0,
    failed: 0,
    cancelled: 0,
    by_type: {},
  };
}

function normalizePaymentStatus(status?: string | null): Exclude<PaymentStatus, "all" | "completed"> | "" {
  const value = String(status || "").trim().toLowerCase();
  if (value === "pending" || value === "paid" || value === "failed" || value === "cancelled") {
    return value;
  }
  return "";
}

function summarizePayments(source: PaymentItem[]): PaymentSummary {
  const result = emptyPaymentSummary();
  source.forEach((item) => {
    const status = normalizePaymentStatus(item.payment_status);
    const type = item.item_type;
    if (!result.by_type?.[type]) {
      result.by_type = {
        ...(result.by_type || {}),
        [type]: { total: 0, pending: 0, paid: 0, failed: 0, cancelled: 0 },
      };
    }

    result.total += 1;
    result.by_type[type].total += 1;
    if (!status) return;
    result[status] += 1;
    result.by_type[type][status] += 1;
  });
  return result;
}

function mergePaymentSummary(remoteSummary: any, visibleSource: PaymentItem[]): PaymentSummary {
  const visibleSummary = summarizePayments(visibleSource);
  const merged: PaymentSummary = {
    total: Number(remoteSummary?.total || 0),
    pending: Number(remoteSummary?.pending || 0),
    paid: Number(remoteSummary?.paid || 0),
    failed: Number(remoteSummary?.failed || 0),
    cancelled: Number(remoteSummary?.cancelled || 0),
    by_type: { ...(remoteSummary?.by_type || {}) },
  };

  (["pending", "paid", "failed", "cancelled"] as const).forEach((status) => {
    merged[status] = Math.max(merged[status], visibleSummary[status]);
  });
  (["coin_topup", "order", "subscription"] as const).forEach((type) => {
    const emptyTypeSummary = { total: 0, pending: 0, paid: 0, failed: 0, cancelled: 0 };
    const remoteType = merged.by_type?.[type] || emptyTypeSummary;
    const visibleType = visibleSummary.by_type?.[type] || emptyTypeSummary;
    merged.by_type = {
      ...(merged.by_type || {}),
      [type]: {
        total: Math.max(Number(remoteType.total || 0), Number(visibleType.total || 0)),
        pending: Math.max(Number(remoteType.pending || 0), Number(visibleType.pending || 0)),
        paid: Math.max(Number(remoteType.paid || 0), Number(visibleType.paid || 0)),
        failed: Math.max(Number(remoteType.failed || 0), Number(visibleType.failed || 0)),
        cancelled: Math.max(Number(remoteType.cancelled || 0), Number(visibleType.cancelled || 0)),
      },
    };
  });
  merged.total = Math.max(
    merged.total,
    visibleSummary.total,
    merged.pending + merged.paid + merged.failed + merged.cancelled,
  );
  return merged;
}

async function loadPayments() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/admin/payment-approvals", {
      params: { status: statusFilter.value },
    });
    items.value = Array.isArray(data?.items) ? data.items : [];
    summary.value = mergePaymentSummary(data?.summary, items.value);
    adminNotes.value = Object.fromEntries(
      items.value.map((item) => [itemKey(item), item.provider_ref || ""]),
    );
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดรายการชำระเงินไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function updatePayment(item: PaymentItem, status: "paid" | "failed" | "cancelled") {
  const key = itemKey(item);
  if (savingKey.value) return;

  savingKey.value = key;
  message.value = "";
  errorMessage.value = "";

  try {
    const { data } = await api.patch(`/admin/payment-approvals/${item.item_type}/${item.id}`, {
      status,
      provider_ref: adminNotes.value[key] || item.provider_ref || null,
    });
    message.value =
      data?.message ||
      (status === "paid" ? "อนุมัติรายการชำระเงินสำเร็จ" : "อัปเดตรายการชำระเงินสำเร็จ");
    await loadPayments();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "อัปเดตรายการชำระเงินไม่สำเร็จ";
  } finally {
    savingKey.value = "";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH");
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function typeLabel(type: PaymentType) {
  if (type === "coin_topup") return "เติมเหรียญ";
  if (type === "order") return "ซื้อหนังสือ/รายตอน";
  return "แพ็กเกจสมาชิก";
}

function statusLabel(status: PaymentStatus) {
  if (status === "pending") return "รอตรวจ";
  if (status === "paid") return "อนุมัติแล้ว";
  if (status === "failed") return "ไม่ผ่าน";
  if (status === "cancelled") return "ยกเลิก";
  if (status === "completed") return "เสร็จแล้ว";
  return "ทั้งหมด";
}

function typeFilterLabel(type: PaymentType | "all") {
  if (type === "all") return "ทุกประเภท";
  return typeLabel(type);
}

function setStatusFilter(status: PaymentStatus) {
  if (statusFilter.value === status) return;
  statusFilter.value = status;
  loadPayments();
}

function setTypeFilter(type: PaymentType | "all") {
  typeFilter.value = type;
}

function applyRouteTypeFilter() {
  const type = route.query.type;
  if (
    type === "coin_topup" ||
    type === "order" ||
    type === "subscription" ||
    type === "all"
  ) {
    typeFilter.value = type;
  }
}

function amountLabel(item: PaymentItem) {
  if (item.item_type === "coin_topup") return `${Number(item.coins || 0)} เหรียญ`;
  return formatMoney(item.amount);
}

function isProcessed(item: PaymentItem) {
  return item.payment_status === "paid" || item.item_status === "completed";
}

function canUpdatePayment(item: PaymentItem, status: "paid" | "failed" | "cancelled") {
  if (isProcessed(item)) return false;
  if (status === "paid" && item.item_type === "coin_topup") return hasCompleteTransferEvidence(item);
  return true;
}

function hasCompleteTransferEvidence(item: PaymentItem) {
  if (item.item_type !== "coin_topup") return true;
  return Boolean(
    item.payer_name &&
      Number(item.transfer_amount || 0) > 0 &&
      item.transfer_date &&
      item.transfer_time &&
      item.provider_ref &&
      item.slip_image_url,
  );
}

function itemTitle(item: PaymentItem) {
  if (item.item_type === "coin_topup") return `เติม ${Number(item.coins || 0).toLocaleString("th-TH")} เหรียญ`;
  return item.title || item.package_id || typeLabel(item.item_type);
}

function itemStatusLabel(item: PaymentItem) {
  if (item.item_type === "coin_topup" && item.payment_status === "pending") {
    return hasCompleteTransferEvidence(item) ? "แจ้งโอนแล้ว / รอตรวจสลิป" : "รอผู้ใช้แจ้งโอน";
  }
  return `${statusLabel(item.payment_status as PaymentStatus)} / ${statusLabel((item.item_status || item.payment_status) as PaymentStatus)}`;
}

function paymentCardStatusClass(item: PaymentItem) {
  if (item.payment_status === "paid" || item.item_status === "completed") return "payment-card--paid";
  if (item.payment_status === "failed") return "payment-card--failed";
  if (item.payment_status === "cancelled" || item.item_status === "cancelled") return "payment-card--cancelled";
  if (item.item_type === "coin_topup" && item.payment_status === "pending" && !hasCompleteTransferEvidence(item)) {
    return "payment-card--waiting-transfer";
  }
  return "payment-card--pending";
}

function textFromMaybeBuffer(value?: PaymentItem["detail"]) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.type === "Buffer" && Array.isArray(value.data)) {
    return String.fromCharCode(...value.data);
  }
  return "";
}

function itemDetailLabel(item: PaymentItem) {
  const text = textFromMaybeBuffer(item.detail).trim();
  const countMatch = text.match(/^(\d+)\s+item\(s\)$/i);
  if (countMatch) return `${Number(countMatch[1]).toLocaleString("th-TH")} รายการ`;
  return text;
}

function approveDisabledReason(item: PaymentItem) {
  if (savingKey.value === itemKey(item)) return "กำลังบันทึก";
  if (item.payment_status === "paid" || item.item_status === "completed") return "รายการนี้อนุมัติแล้ว";
  if (item.item_type === "coin_topup" && !hasCompleteTransferEvidence(item)) {
    return "ยังอนุมัติไม่ได้ เพราะผู้ใช้ยังแจ้งข้อมูลโอนเงินและแนบสลิปไม่ครบ";
  }
  return "";
}

function resolveImageUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

onMounted(() => {
  applyRouteTypeFilter();
  loadPayments();
});
</script>

<template>
  <main class="payments-page">
    <section class="hero">
      <div>
        <p>อนุมัติการชำระเงิน</p>
        <h1>อนุมัติรายการชำระเงินทั้งหมด</h1>
        <span>
          รวมรายการเติมเหรียญ คำสั่งซื้อหนังสือ/รายตอน และแพ็กเกจสมาชิกไว้ในหน้าเดียว
          โดยรายการที่รอตรวจสามารถกดอนุมัติ ไม่ผ่าน หรือยกเลิกได้จากที่นี่
        </span>
      </div>
      <div class="summary-grid">
        <div class="summary-card total">
          <strong>{{ effectivePaymentSummary.total }}</strong>
          <span>ทั้งหมด</span>
        </div>
        <div class="summary-card">
          <strong>{{ pendingCount }}</strong>
          <span>รอตรวจ</span>
        </div>
        <div class="summary-card paid">
          <strong>{{ effectivePaymentSummary.paid }}</strong>
          <span>อนุมัติแล้ว</span>
        </div>
      </div>
    </section>

    <p v-if="message" class="message success">{{ message }}</p>
    <p v-if="errorMessage" class="message error">{{ errorMessage }}</p>

    <section class="toolbar">
      <label>
        <span>สถานะ</span>
        <select class="status-select" v-model="statusFilter" @change="loadPayments">
          <option value="pending">รอตรวจ</option>
          <option value="paid">อนุมัติแล้ว</option>
          <option value="failed">ไม่ผ่าน</option>
          <option value="cancelled">ยกเลิก</option>
          <option value="all">ทั้งหมด</option>
        </select>
        <div class="mobile-tabs" aria-label="กรองสถานะรายการชำระเงิน">
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

      <label>
        <span>ประเภท</span>
        <select class="type-select" v-model="typeFilter">
          <option value="all">ทุกประเภท</option>
          <option value="coin_topup">เติมเหรียญ ({{ typeCounts.coin_topup || 0 }})</option>
          <option value="order">คำสั่งซื้อ ({{ typeCounts.order || 0 }})</option>
          <option value="subscription">สมาชิก ({{ typeCounts.subscription || 0 }})</option>
        </select>
        <div class="mobile-tabs" aria-label="กรองประเภทรายการชำระเงิน">
          <button
            v-for="type in typeOptions"
            :key="type"
            type="button"
            :class="{ active: typeFilter === type }"
            @click="setTypeFilter(type)"
          >
            {{ typeFilterLabel(type) }}
          </button>
        </div>
      </label>

      <div class="toolbar-meta">
        <span>กำลังแสดง: {{ currentFilterLabel }}</span>
        <strong>{{ visibleCount }} รายการ</strong>
      </div>

      <button type="button" @click="loadPayments">รีเฟรช</button>
    </section>

    <section v-if="loading" class="state-box empty-state">
      <strong>กำลังโหลดรายการชำระเงิน...</strong>
      <span>ระบบกำลังตรวจสอบรายการตามสถานะและประเภทที่เลือก</span>
    </section>
    <section v-else-if="visibleItems.length === 0" class="state-box empty-state">
      <strong>ไม่มีรายการชำระเงินที่ตรงกับตัวกรองนี้</strong>
      <span>เมื่อมีรายการใหม่ หรือมีรายการตรงกับสถานะและประเภทที่เลือก รายการจะแสดงที่นี่</span>
      <button type="button" @click="loadPayments">รีเฟรช</button>
    </section>

    <section v-else class="payment-list" aria-label="รายการชำระเงิน">
      <article v-for="item in visibleItems" :key="itemKey(item)" :class="['payment-card', paymentCardStatusClass(item)]">
        <div class="payment-main">
          <div>
            <p class="eyebrow">{{ typeLabel(item.item_type) }}</p>
            <h2>{{ itemTitle(item) }}</h2>
            <span>{{ item.name || item.email || `User ${item.user_id}` }}</span>
          </div>

          <div class="amount-box">
            <strong>{{ amountLabel(item) }}</strong>
            <span class="status-badge">{{ itemStatusLabel(item) }}</span>
          </div>
        </div>

        <dl>
          <div>
            <dt>อีเมล</dt>
            <dd>{{ item.email || "-" }}</dd>
          </div>
          <div>
            <dt>ยอดเงิน</dt>
            <dd>{{ formatMoney(item.amount) }}</dd>
          </div>
          <div>
            <dt>อ้างอิง/วิธีชำระ</dt>
            <dd>{{ item.provider_ref || "ยังไม่ได้แจ้ง" }}</dd>
          </div>
          <div v-if="item.item_type === 'coin_topup'">
            <dt>ชื่อผู้โอน</dt>
            <dd>{{ item.payer_name || "ยังไม่ได้แจ้ง" }}</dd>
          </div>
          <div v-if="item.item_type === 'coin_topup'">
            <dt>ยอดที่แจ้งโอน</dt>
            <dd>{{ item.transfer_amount ? formatMoney(item.transfer_amount) : "ยังไม่ได้แจ้ง" }}</dd>
          </div>
          <div v-if="item.item_type === 'coin_topup'">
            <dt>วัน/เวลาโอน</dt>
            <dd>
              <span v-if="item.transfer_date || item.transfer_time">
                {{ item.transfer_date || "-" }} {{ item.transfer_time || "" }}
              </span>
              <span v-else>ยังไม่ได้แจ้ง</span>
            </dd>
          </div>
          <div v-if="item.item_type === 'coin_topup'">
            <dt>สลิป</dt>
            <dd>
              <a v-if="item.slip_image_url" :href="resolveImageUrl(item.slip_image_url)" target="_blank" rel="noreferrer">
                เปิดดูสลิป
              </a>
              <span v-else>ยังไม่มีสลิป</span>
            </dd>
          </div>
          <div>
            <dt>สร้างเมื่อ</dt>
            <dd>{{ formatDate(item.created_at) }}</dd>
          </div>
        </dl>

        <p v-if="itemDetailLabel(item)" class="detail">{{ itemDetailLabel(item) }}</p>

        <p v-if="false && item.item_type === 'coin_topup' && !hasCompleteTransferEvidence(item)" class="transfer-warning">
          รายการนี้ยังเป็นรายการที่ผู้ใช้สร้างไว้ แต่ยังไม่ได้แจ้งข้อมูลโอนเงินและแนบสลิปครบถ้วน จึงยังไม่ควรอนุมัติ
        </p>

        <label class="note-field">
          <span>เลขอ้างอิง/หมายเหตุแอดมิน</span>
          <input
            v-model.trim="adminNotes[itemKey(item)]"
            type="text"
            placeholder="เช่น เลขสลิป หมายเหตุการตรวจสอบ หรือรหัสจาก gateway"
          />
        </label>

        <div class="actions">
          <button
            type="button"
            class="primary"
            :disabled="savingKey === itemKey(item) || !canUpdatePayment(item, 'paid')"
            :title="approveDisabledReason(item)"
            @click="updatePayment(item, 'paid')"
          >
            อนุมัติ
          </button>
          <button
            type="button"
            class="danger"
            :disabled="savingKey === itemKey(item) || !canUpdatePayment(item, 'failed')"
            @click="updatePayment(item, 'failed')"
          >
            ไม่ผ่าน
          </button>
          <button
            type="button"
            class="ghost"
            :disabled="savingKey === itemKey(item) || !canUpdatePayment(item, 'cancelled')"
            @click="updatePayment(item, 'cancelled')"
          >
            ยกเลิก
          </button>
        </div>

        <p v-if="false" class="processed-note">รายการนี้ดำเนินการเสร็จแล้ว</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.payments-page {
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
.payment-card {
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
.eyebrow,
.detail {
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
.payment-card h2 {
  color: var(--text-strong);
  margin: 6px 0;
}

.hero span,
.payment-card span,
dd,
dt,
.detail {
  color: var(--text-muted);
}

.transfer-warning {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  color: #9a3412;
  font-weight: 800;
  margin: 0;
  padding: 10px 12px;
}

.processed-note {
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  color: #0f766e;
  font-weight: 900;
  margin: 0;
  padding: 10px 12px;
}

.summary-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, 120px);
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

.summary-card.paid {
  background: #eff6ff;
  color: #2563eb;
}

.summary-card strong,
.summary-card span {
  display: block;
}

.summary-card strong {
  font-size: 32px;
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

button.danger {
  background: #dc2626;
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
  max-width: 560px;
  color: var(--text-muted);
  line-height: 1.7;
}

.empty-state button {
  margin-top: 2px;
  background: var(--primary);
  color: var(--on-primary);
}

.payment-list {
  display: grid;
  gap: 12px;
}

.payment-card {
  --status-color: #94a3b8;
  --status-text: #1f2937;
  --status-pill-bg: #f8fafc;
  display: grid;
  gap: 16px;
  padding: 18px;
  border-left: 6px solid var(--status-color);
}

.payment-card--paid {
  --status-color: #10b981;
  --status-text: #064e3b;
  --status-pill-bg: #ecfdf5;
}

.payment-card--pending {
  --status-color: #06b6d4;
  --status-text: #164e63;
  --status-pill-bg: #f0f9ff;
}

.payment-card--waiting-transfer {
  --status-color: #f59e0b;
  --status-text: #78350f;
  --status-pill-bg: #fffbeb;
}

.payment-card--failed {
  --status-color: #ef4444;
  --status-text: #7f1d1d;
  --status-pill-bg: #fff1f2;
}

.payment-card--cancelled {
  --status-color: #64748b;
  --status-text: #1f2937;
  --status-pill-bg: #f8fafc;
}

:global(:root[data-theme="dark"]) .payment-card--paid {
  --status-text: #bbf7d0;
  --status-pill-bg: rgba(16, 185, 129, 0.12);
}

:global(:root[data-theme="dark"]) .payment-card--pending {
  --status-text: #a5f3fc;
  --status-pill-bg: rgba(6, 182, 212, 0.12);
}

:global(:root[data-theme="dark"]) .payment-card--waiting-transfer {
  --status-text: #fde68a;
  --status-pill-bg: rgba(245, 158, 11, 0.14);
}

:global(:root[data-theme="dark"]) .payment-card--failed {
  --status-text: #fecaca;
  --status-pill-bg: rgba(239, 68, 68, 0.14);
}

:global(:root[data-theme="dark"]) .payment-card--cancelled {
  --status-text: #e5e7eb;
  --status-pill-bg: rgba(148, 163, 184, 0.14);
}

:global(:root[data-accessibility="enabled"][data-contrast="high"]) .payment-card {
  --status-text: var(--text-strong);
  --status-pill-bg: var(--surface-soft);
}

.payment-main {
  align-items: start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.amount-box {
  text-align: right;
}

.amount-box strong,
.amount-box span {
  display: block;
}

.amount-box strong {
  color: var(--text-strong);
  font-size: 26px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
  border: 0;
  border-radius: 999px;
  background: var(--status-pill-bg);
  color: var(--status-text);
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
  padding: 6px 10px;
  text-align: center;
}

.status-badge::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--status-color);
  flex: 0 0 auto;
}

.amount-box .status-badge {
  display: inline-flex;
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

.note-field input {
  width: 100%;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 760px) {
  .payments-page {
    gap: 10px;
    padding: 10px 16px 24px;
  }

  .hero,
  .payment-main,
  .toolbar {
    align-items: stretch;
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero,
  .toolbar,
  .payment-card,
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
  .payment-card h2 {
    margin: 3px 0;
    font-size: 20px;
    line-height: 1.2;
  }

  .hero span,
  .payment-card span,
  dd,
  .detail,
  label {
    font-size: 12px;
    line-height: 1.35;
  }

  .summary-card {
    padding: 9px;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

  .payment-list {
    gap: 8px;
  }

  .payment-card {
    gap: 10px;
    padding: 11px;
  }

  .payment-main {
    gap: 8px;
  }

  .amount-box {
    text-align: left;
  }

  .amount-box strong {
    font-size: 19px;
  }

  dl {
    gap: 7px;
    grid-template-columns: 1fr;
  }

  dd {
    margin-top: 2px;
  }

  .actions {
    gap: 7px;
  }

  .actions button,
  select {
    width: 100%;
  }

  .status-select,
  .type-select {
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
  .payments-page {
    padding: 8px 18px 22px;
  }

  .hero h1,
  .payment-card h2 {
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
    font-size: 9.5px;
    padding: 2px 4px;
  }
}
</style>
