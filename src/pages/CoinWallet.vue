<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api from "../utils/api";

type CoinPackage = {
  id: string;
  coins: number;
  price: number;
  label: string;
};

type Transaction = {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  description?: string;
  created_at?: string;
};

type PendingTopup = {
  topup_id?: number;
  checkout_url?: string | null;
  payment_instructions?: string | null;
  payment_status?: string;
} | null;

const balance = ref(0);
const packages = ref<CoinPackage[]>([]);
const transactions = ref<Transaction[]>([]);
const loading = ref(true);
const creatingTopup = ref("");
const confirmingTopup = ref(false);
const message = ref("");
const errorMessage = ref("");
const pendingTopup = ref<PendingTopup>(null);
const transferReference = ref("");

const hasPendingManualTopup = computed(() => {
  return Boolean(pendingTopup.value?.topup_id && !pendingTopup.value?.checkout_url);
});

async function loadWallet() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [walletRes, packageRes, txRes] = await Promise.all([
      api.get("/coins/wallet"),
      api.get("/coins/packages"),
      api.get("/coins/transactions"),
    ]);

    balance.value = Number(walletRes.data?.balance || 0);
    packages.value = packageRes.data || [];
    transactions.value = txRes.data || [];
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดกระเป๋าเหรียญไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function topup(packageId: string) {
  message.value = "";
  errorMessage.value = "";
  pendingTopup.value = null;
  transferReference.value = "";
  creatingTopup.value = packageId;

  try {
    const { data } = await api.post("/coins/topup", { package_id: packageId });
    message.value = data?.message || "สร้างรายการเติมเหรียญสำเร็จ";

    if (data?.payment_status === "pending") {
      pendingTopup.value = {
        topup_id: data.topup_id,
        checkout_url: data.checkout_url || null,
        payment_instructions: data.payment_instructions || null,
        payment_status: data.payment_status,
      };
    }

    await loadWallet();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เติมเหรียญไม่สำเร็จ";
  } finally {
    creatingTopup.value = "";
  }
}

async function confirmManualTopup() {
  if (!pendingTopup.value?.topup_id || confirmingTopup.value) return;

  message.value = "";
  errorMessage.value = "";
  confirmingTopup.value = true;

  try {
    const { data } = await api.patch(`/coins/topups/${pendingTopup.value.topup_id}/confirm`, {
      provider_ref: transferReference.value,
    });
    message.value = data?.message || "แจ้งโอนแล้ว รอแอดมินอนุมัติ";
    transferReference.value = "";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "แจ้งโอนไม่สำเร็จ";
  } finally {
    confirmingTopup.value = false;
  }
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

onMounted(loadWallet);
</script>

<template>
  <main class="wallet-page">
    <section class="hero">
      <div>
        <p class="eyebrow">Read and Voice Coins</p>
        <h1>เติมเหรียญสำหรับซื้อหนังสือและรายตอน</h1>
        <p>
          วิธีที่ง่ายและไม่มีค่าระบบคือโอนผ่าน PromptPay แล้วแจ้งเลขอ้างอิง
          แอดมินจะตรวจสอบก่อนเติมเหรียญเข้ากระเป๋า
        </p>
      </div>

      <div class="balance-card">
        <span>ยอดเหรียญ</span>
        <strong>{{ balance }}</strong>
      </div>
    </section>

    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>

    <section v-if="pendingTopup" class="pending-panel">
      <div>
        <p class="eyebrow">รายการรอชำระเงิน</p>
        <h2>เติมเหรียญ #{{ pendingTopup.topup_id }}</h2>
        <p v-if="pendingTopup.payment_instructions" class="instruction">
          {{ pendingTopup.payment_instructions }}
        </p>
        <a v-if="pendingTopup.checkout_url" :href="pendingTopup.checkout_url">
          ไปหน้าชำระเงิน
        </a>
        <p class="hint">
          หลังชำระเงินแล้ว ระบบจะเพิ่มเหรียญเมื่อรายการได้รับการยืนยัน
        </p>
      </div>

      <form v-if="hasPendingManualTopup" class="confirm-box" @submit.prevent="confirmManualTopup">
        <label for="transfer-reference">เลขอ้างอิงหรือเวลาที่โอน</label>
        <input
          id="transfer-reference"
          v-model.trim="transferReference"
          type="text"
          placeholder="เช่น 202605081430 หรือ สลิปเวลา 14:30"
          required
        />
        <button type="submit" :disabled="confirmingTopup">
          {{ confirmingTopup ? "กำลังแจ้งโอน..." : "แจ้งโอนแล้ว" }}
        </button>
      </form>
    </section>

    <section v-if="loading" class="panel">กำลังโหลดกระเป๋าเหรียญ...</section>

    <template v-else>
      <section class="package-grid" aria-label="แพ็กเกจเติมเหรียญ">
        <article v-for="item in packages" :key="item.id" class="package-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.coins }} เหรียญ</strong>
          <p>{{ formatMoney(item.price) }}</p>
          <button type="button" :disabled="Boolean(creatingTopup)" @click="topup(item.id)">
            {{ creatingTopup === item.id ? "กำลังสร้างรายการ..." : "เติมแพ็กนี้" }}
          </button>
        </article>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>ประวัติเหรียญ</h2>
          <button type="button" @click="loadWallet">รีเฟรช</button>
        </div>

        <div v-if="transactions.length === 0" class="empty">ยังไม่มีรายการ</div>
        <div v-else class="tx-list">
          <article v-for="tx in transactions" :key="tx.id">
            <div>
              <strong>{{ tx.description || tx.type }}</strong>
              <span>{{ formatDate(tx.created_at) }}</span>
            </div>
            <div class="tx-amount" :class="{ plus: Number(tx.amount) > 0 }">
              {{ Number(tx.amount) > 0 ? "+" : "" }}{{ tx.amount }}
              <small>คงเหลือ {{ tx.balance_after }}</small>
            </div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.wallet-page {
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
}

.hero,
.panel,
.package-card,
.pending-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.hero {
  align-items: center;
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1fr) 220px;
  margin: 0 auto 20px;
  max-width: 1120px;
  padding: 28px;
}

.eyebrow {
  color: #0f766e;
  font-weight: 900;
  margin: 0 0 8px;
}

h1,
h2 {
  color: var(--text-strong);
  margin: 0;
}

.hero p:not(.eyebrow),
.hint,
.instruction {
  color: var(--text-muted);
  line-height: 1.7;
}

.balance-card {
  background: color-mix(in srgb, var(--text-strong) 92%, #111827);
  border-radius: 8px;
  color: white;
  padding: 20px;
}

.balance-card span,
.balance-card strong {
  display: block;
}

.balance-card strong {
  font-size: 44px;
}

.alert,
.panel,
.package-grid,
.pending-panel {
  margin: 0 auto 16px;
  max-width: 1120px;
}

.alert {
  border-radius: 8px;
  font-weight: 800;
  padding: 12px 14px;
}

.success {
  background: #ecfdf5;
  color: #047857;
}

.error {
  background: #fef2f2;
  color: #dc2626;
}

.pending-panel {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) 360px;
  padding: 20px;
}

.pending-panel a {
  color: #0f766e;
  display: inline-block;
  font-weight: 900;
  margin-top: 8px;
}

.confirm-box {
  align-content: start;
  display: grid;
  gap: 10px;
}

.confirm-box label {
  color: var(--text-strong);
  font-weight: 900;
}

.confirm-box input {
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-strong);
  font: inherit;
  min-height: 44px;
  padding: 0 12px;
}

.package-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.package-card {
  padding: 20px;
}

.package-card span,
.package-card strong,
.package-card p {
  display: block;
}

.package-card strong {
  font-size: 30px;
  margin-top: 8px;
}

.package-card p {
  color: var(--text-muted);
}

button {
  border: 0;
  border-radius: 8px;
  background: #14b8a6;
  color: white;
  cursor: pointer;
  font-weight: 900;
  padding: 11px 14px;
}

button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.panel {
  padding: 20px;
}

.panel-head {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 14px;
}

.tx-list {
  display: grid;
  gap: 10px;
}

.tx-list article {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  padding: 14px;
}

.tx-list span,
.tx-amount small {
  color: var(--text-muted);
  display: block;
}

.tx-amount {
  color: #dc2626;
  font-weight: 900;
  text-align: right;
}

.tx-amount.plus {
  color: #047857;
}

.empty {
  color: var(--text-muted);
}

@media (max-width: 760px) {
  .hero,
  .pending-panel {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .balance-card strong {
    font-size: 36px;
  }

  .package-grid {
    grid-template-columns: 1fr;
  }

  .panel-head,
  .tx-list article {
    align-items: flex-start;
    flex-direction: column;
  }

  .tx-amount {
    text-align: left;
  }
}
</style>
