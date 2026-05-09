<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api from "../../utils/api";

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
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
  title?: string | null;
  detail?: string | null;
};

const statusFilter = ref<PaymentStatus>("pending");
const typeFilter = ref<PaymentType | "all">("all");
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

function amountLabel(item: PaymentItem) {
  if (item.item_type === "coin_topup") return `${Number(item.coins || 0)} เหรียญ`;
  return formatMoney(item.amount);
}

function canApprove(item: PaymentItem) {
  return item.payment_status !== "paid" && item.item_status !== "completed";
}

onMounted(loadPayments);
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
        <select v-model="statusFilter" @change="loadPayments">
          <option value="pending">รอตรวจ</option>
          <option value="paid">อนุมัติแล้ว</option>
          <option value="failed">ไม่ผ่าน</option>
          <option value="cancelled">ยกเลิก</option>
          <option value="all">ทั้งหมด</option>
        </select>
      </label>

      <label>
        <span>ประเภท</span>
        <select v-model="typeFilter">
          <option value="all">ทุกประเภท</option>
          <option value="coin_topup">เติมเหรียญ ({{ typeCounts.coin_topup || 0 }})</option>
          <option value="order">คำสั่งซื้อ ({{ typeCounts.order || 0 }})</option>
          <option value="subscription">สมาชิก ({{ typeCounts.subscription || 0 }})</option>
        </select>
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
            <p class="eyebrow">#{{ item.id }} · {{ typeLabel(item.item_type) }}</p>
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
  font-size: 40px;
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
  .hero,
  .payment-main,
  .toolbar {
    align-items: stretch;
    display: grid;
    grid-template-columns: 1fr;
  }

  .amount-box {
    text-align: left;
  }

  dl {
    grid-template-columns: 1fr;
  }

  .actions button,
  select {
    width: 100%;
  }
}
</style>
