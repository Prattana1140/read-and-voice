<script setup lang="ts">
import { onMounted, ref } from "vue";
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
const message = ref("");
const errorMessage = ref("");
const pendingTopup = ref<PendingTopup>(null);

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
    errorMessage.value = error?.response?.data?.message || "โหลดกระเป๋าคอยน์ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function topup(packageId: string) {
  message.value = "";
  errorMessage.value = "";
  pendingTopup.value = null;

  try {
    const { data } = await api.post("/coins/topup", { package_id: packageId });
    message.value = data?.message || "สร้างรายการเติมคอยน์สำเร็จ";
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
    errorMessage.value = error?.response?.data?.message || "เติมคอยน์ไม่สำเร็จ";
  }
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH");
}

onMounted(loadWallet);
</script>

<template>
  <main class="wallet-page">
    <section class="hero">
      <div>
        <p class="eyebrow">คอยน์ Read and Voice</p>
        <h1>เติมคอยน์สำหรับซื้อหนังสือและรายตอน</h1>
        <p>ใช้คอยน์ซื้ออีบุ๊ก รายตอน และสมัครแพ็กเกจอ่านรายเดือนในระบบเดียว</p>
      </div>

      <div class="balance-card">
        <span>ยอดคอยน์</span>
        <strong>{{ balance }}</strong>
      </div>
    </section>

    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
    <section v-if="pendingTopup" class="alert info">
      <strong>รายการเติมคอยน์ #{{ pendingTopup.topup_id }}</strong>
      <p v-if="pendingTopup.payment_instructions">{{ pendingTopup.payment_instructions }}</p>
      <a v-if="pendingTopup.checkout_url" :href="pendingTopup.checkout_url">
        ไปหน้าชำระเงิน
      </a>
      <p>หลังชำระเงินแล้ว ระบบจะเติมคอยน์เมื่อรายการได้รับการยืนยัน</p>
    </section>

    <section v-if="loading" class="panel">กำลังโหลดกระเป๋าคอยน์...</section>

    <template v-else>
      <section class="package-grid">
        <article v-for="item in packages" :key="item.id" class="package-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.coins }} คอยน์</strong>
          <p>{{ item.price }} บาท</p>
          <button type="button" @click="topup(item.id)">เติมแพ็กนี้</button>
        </article>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>ประวัติคอยน์</h2>
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
              <small>เหลือ {{ tx.balance_after }}</small>
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
.package-card {
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

.hero p:not(.eyebrow) {
  color: var(--text-muted);
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
.package-grid {
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

.info {
  background: #eff6ff;
  color: #1d4ed8;
}

.info p {
  margin: 8px 0 0;
}

.info a {
  color: inherit;
  display: inline-block;
  font-weight: 900;
  margin-top: 8px;
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

.panel {
  padding: 20px;
}

.panel-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 12px;
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
  justify-content: space-between;
  gap: 14px;
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

@media (max-width: 720px) {
  .hero {
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
