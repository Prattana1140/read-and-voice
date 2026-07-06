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
  detail?: string | null;
};

const statusFilter = ref<PaymentStatus>("pending");
const typeFilter = ref<PaymentType | "all">("all");
const statusOptions: PaymentStatus[] = ["pending", "paid", "failed", "cancelled", "all"];
const typeOptions: Array<PaymentType | "all"> = ["all", "coin_topup", "order", "subscription"];
const route = useRoute();
const items = ref<PaymentItem[]>([]);
const loading = ref(true);
const savingKey = ref("");
const message = ref("");
const errorMessage = ref("");
const adminNotes = ref<Record<string, string>>({});

const visibleItems = computed(() => {
  if (typeFilter.value === "all") return items.value;
  return items.value.filter((item) => item.item_type === typeFilter.value);
});

const pendingCount = computed(() => {
  return items.value.filter((item) => item.payment_status === "pending").length;
});

const typeCounts = computed(() => {
  return items.value.reduce<Record<string, number>>((acc, item) => {
    acc[item.item_type] = (acc[item.item_type] || 0) + 1;
    return acc;
  }, {});
});

function itemKey(item: PaymentItem) {
  return `${item.item_type}:${item.id}`;
}

async function loadPayments() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/admin/payment-approvals", {
      params: { status: statusFilter.value },
    });
    items.value = Array.isArray(data?.items) ? data.items : [];
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

function canApprove(item: PaymentItem) {
  return item.payment_status !== "paid" && item.item_status !== "completed";
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
        <p>Admin payment approvals</p>
        <h1>อนุมัติรายการชำระเงินทั้งหมด</h1>
        <span>
          รวมรายการเติมเหรียญ คำสั่งซื้อหนังสือ/รายตอน และแพ็กเกจสมาชิกไว้ในหน้าเดียว
          โดยรายการที่รอตรวจสามารถกดอนุมัติ ไม่ผ่าน หรือยกเลิกได้จากที่นี่
        </span>
      </div>
      <div class="summary-card">
        <strong>{{ pendingCount }}</strong>
        <span>รายการรอตรวจ</span>
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

      <button type="button" @click="loadPayments">รีเฟรช</button>
    </section>

    <section v-if="loading" class="state-box">กำลังโหลดรายการ...</section>
    <section v-else-if="visibleItems.length === 0" class="state-box">
      ยังไม่มีรายการที่ตรงกับตัวกรองนี้
    </section>

    <section v-else class="payment-list" aria-label="รายการชำระเงิน">
      <article v-for="item in visibleItems" :key="itemKey(item)" class="payment-card">
        <div class="payment-main">
          <div>
            <p class="eyebrow">{{ typeLabel(item.item_type) }}</p>
            <h2>{{ item.title || item.package_id || typeLabel(item.item_type) }}</h2>
            <span>{{ item.name || item.email || `User ${item.user_id}` }}</span>
          </div>

          <div class="amount-box">
            <strong>{{ amountLabel(item) }}</strong>
            <span>{{ item.payment_status }} / {{ item.item_status || "-" }}</span>
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

        <p v-if="item.detail" class="detail">{{ item.detail }}</p>

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
            :disabled="savingKey === itemKey(item) || !canApprove(item)"
            @click="updatePayment(item, 'paid')"
          >
            อนุมัติ
          </button>
          <button
            type="button"
            :disabled="savingKey === itemKey(item) || !canApprove(item)"
            @click="updatePayment(item, 'failed')"
          >
            ไม่ผ่าน
          </button>
          <button
            type="button"
            class="ghost"
            :disabled="savingKey === itemKey(item) || !canApprove(item)"
            @click="updatePayment(item, 'cancelled')"
          >
            ยกเลิก
          </button>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.payments-page {
  display: grid;
  gap: 18px;
  margin: 0 auto;
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
  grid-template-columns: minmax(0, 1fr) 180px;
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
  font-size: 13px;
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

.payment-list {
  display: grid;
  gap: 12px;
}

.payment-card {
  display: grid;
  gap: 16px;
  padding: 18px;
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
  font-size: 24px;
}

dl {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
}

dt {
  font-size: 13px;
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
    font-size: 9px;
  }

  .hero h1,
  .payment-card h2 {
    margin: 3px 0;
    font-size: 18px;
    line-height: 1.2;
  }

  .hero span,
  .payment-card span,
  dd,
  .detail,
  label {
    font-size: 10px;
    line-height: 1.35;
  }

  .summary-card {
    padding: 9px;
  }

  .summary-card strong {
    font-size: 22px;
  }

  .message {
    border-radius: 8px;
    font-size: 10px;
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
    font-size: 10px;
    padding: 0 9px;
  }

  .state-box {
    padding: 14px;
    font-size: 10px;
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
    font-size: 17px;
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
    font-size: 8px;
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
    font-size: 16px;
  }

  select,
  input,
  button {
    min-height: 29px;
    font-size: 9px;
  }

  .mobile-tabs {
    gap: 4px;
  }

  .mobile-tabs button {
    min-height: 24px;
    font-size: 7.5px;
    padding: 2px 4px;
  }
}
</style>
