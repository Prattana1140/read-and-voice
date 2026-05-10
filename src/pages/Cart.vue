<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../utils/api";

type CartItem = {
  id: number;
  book_id?: number | null;
  episode_id?: number | null;
  quantity?: number;
  title: string;
  book_title?: string;
  episode_number?: number;
  price?: number;
  access_type?: string;
};

const router = useRouter();
const cart = ref<CartItem[]>([]);
const balance = ref(0);
const loading = ref(true);
const checkingOut = ref(false);
const errorMessage = ref("");

const total = computed(() => {
  return cart.value.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 1);
  }, 0);
});

const hasEnoughCoins = computed(() => balance.value >= total.value);
const coinShortage = computed(() => Math.max(0, total.value - balance.value));

async function loadCart() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [cartRes, walletRes] = await Promise.all([
      api.get("/cart"),
      api.get("/coins/wallet"),
    ]);

    cart.value = Array.isArray(cartRes.data) ? cartRes.data : [];
    balance.value = Number(walletRes.data?.balance || 0);
  } catch (error: any) {
    if (error?.response?.status === 401) {
      router.push({ name: "Login" });
      return;
    }
    errorMessage.value = error?.response?.data?.message || "เนเธซเธฅเธ”เธ•เธฐเธเธฃเนเธฒเนเธกเนเธชเธณเน€เธฃเนเธ";
  } finally {
    loading.value = false;
  }
}

async function removeItem(id: number) {
  try {
    await api.delete(`/cart/${id}`);
    cart.value = cart.value.filter((item) => item.id !== id);
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เธฅเธเธฃเธฒเธขเธเธฒเธฃเนเธกเนเธชเธณเน€เธฃเนเธ";
  }
}

async function checkout() {
  if (!cart.value.length) return;

  if (!hasEnoughCoins.value) {
    const message = `เหรียญไม่พอ กรุณาเติมอีก ${coinShortage.value} เหรียญก่อนชำระเงิน`;
    errorMessage.value = message;
    window.alert(message);
    return;
  }

  checkingOut.value = true;
  errorMessage.value = "";

  try {
    await api.post("/orders/checkout", {
      payment_method: "coin",
    });

    window.alert("ซื้อสำเร็จ หนังสือถูกเพิ่มเข้าคลังหนังสือแล้ว");
    cart.value = [];
    await loadCart();
    router.push({ name: "MyLibrary" });
  } catch (error: any) {
    if (error?.response?.status === 402) {
      const currentBalance = Number(error?.response?.data?.balance ?? balance.value);
      balance.value = currentBalance;
      const message = error?.response?.data?.message || "เหรียญไม่พอ กรุณาเติมเหรียญก่อนซื้อ";
      errorMessage.value = message;
      window.alert(message);
      return;
    }
    errorMessage.value = error?.response?.data?.message || "ซื้อไม่สำเร็จ";
    window.alert(errorMessage.value);
  } finally {
    checkingOut.value = false;
  }
}
function itemKind(item: CartItem) {
  return item.episode_id ? "เธฃเธฒเธขเธ•เธญเธ" : "เธญเธตเธเธธเนเธ";
}

function goTopup() {
  router.push({ name: "CoinWallet" });
}

onMounted(loadCart);
</script>

<template>
  <main class="cart-page">
    <section class="header-card">
      <div>
        <p class="eyebrow">Checkout</p>
        <h1>เธ•เธฐเธเธฃเนเธฒเธเธญเธเธเธฑเธ</h1>
        <p>เธเธทเนเธญเธญเธตเธเธธเนเธเนเธฅเธฐเธฃเธฒเธขเธ•เธญเธเธ”เนเธงเธขเธเธญเธขเธเนเนเธเธเธฃเธฐเน€เธเนเธฒ เธ–เนเธฒเธขเธญเธ”เธเธญเธขเธเนเธเธญ เธฃเธฐเธเธเธเธฐเธเธทเนเธญเนเธซเนเธ—เธฑเธเธ—เธต</p>
      </div>

      <div class="wallet-pill">
        <span>เธขเธญเธ”เธเธญเธขเธเน</span>
        <strong>{{ balance }}</strong>
      </div>
    </section>

    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
    <p class="alert info">
      เธซเธฒเธเธเธญเธขเธเนเธกเธฒเธเธเธงเนเธฒเธซเธฃเธทเธญเน€เธ—เนเธฒเธเธฑเธเธขเธญเธ”เธฃเธงเธก เธเธธเธ“เธชเธฒเธกเธฒเธฃเธ–เธเธ”เธเธทเนเธญเนเธ”เนเธ—เธฑเธเธ—เธต เธ–เนเธฒเธเธญเธขเธเนเนเธกเนเธเธญเนเธซเนเน€เธ•เธดเธกเธเธญเธขเธเนเธเนเธญเธ
    </p>

    <section v-if="loading" class="state-card">เธเธณเธฅเธฑเธเนเธซเธฅเธ”เธ•เธฐเธเธฃเนเธฒ...</section>
    <section v-else-if="cart.length === 0" class="state-card empty">
      เธขเธฑเธเนเธกเนเธกเธตเธชเธดเธเธเนเธฒเนเธเธ•เธฐเธเธฃเนเธฒ
      <button type="button" @click="router.push('/store')">เนเธเน€เธฅเธทเธญเธเธซเธเธฑเธเธชเธทเธญ</button>
    </section>

    <section v-else class="cart-layout">
      <div class="cart-list">
        <article v-for="item in cart" :key="item.id" class="cart-item">
          <div>
            <span>{{ itemKind(item) }}</span>
            <h2>{{ item.title }}</h2>
            <p v-if="item.book_title && item.episode_id">
              {{ item.book_title }} เธ•เธญเธเธ—เธตเน {{ item.episode_number || "-" }}
            </p>
            <p>{{ item.access_type || "paid" }}</p>
          </div>

          <div class="item-side">
            <strong>{{ Number(item.price || 0) * Number(item.quantity || 1) }} เธเธญเธขเธเน</strong>
            <small>เธเธณเธเธงเธ {{ item.quantity || 1 }}</small>
            <button type="button" @click="removeItem(item.id)">เธฅเธ</button>
          </div>
        </article>
      </div>

      <aside class="summary-card">
        <h2>เธชเธฃเธธเธเธฃเธฒเธขเธเธฒเธฃ</h2>
        <p>เธเธณเธเธงเธเธชเธดเธเธเนเธฒ: {{ cart.length }}</p>
        <p class="total">เธฃเธงเธก {{ total }} เธเธญเธขเธเน</p>
        <p :class="hasEnoughCoins ? 'enough' : 'not-enough'">
          {{
            hasEnoughCoins
              ? "เธเธญเธขเธเนเน€เธเธตเธขเธเธเธญเธชเธณเธซเธฃเธฑเธเธเธณเธฃเธฐเน€เธเธดเธ"
              : `เธเธญเธขเธเนเนเธกเนเธเธญ เธ•เนเธญเธเน€เธ•เธดเธกเธญเธตเธ ${coinShortage} เธเธญเธขเธเน`
          }}
        </p>

        <button
          v-if="hasEnoughCoins"
          class="checkout-btn"
          type="button"
          :disabled="checkingOut"
          @click="checkout"
        >
          {{ checkingOut ? "เธเธณเธฅเธฑเธเธเธทเนเธญ..." : "เธเธณเธฃเธฐเธ”เนเธงเธขเธเธญเธขเธเน" }}
        </button>
        <button v-else class="topup-btn urgent" type="button" @click="checkout">
          ชำระด้วยคอยน์
        </button>
        <button v-if="hasEnoughCoins" class="topup-btn" type="button" @click="goTopup">
          เน€เธ•เธดเธกเธเธญเธขเธเนเน€เธเธดเนเธก
        </button>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.cart-page {
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
}

.header-card,
.state-card,
.cart-item,
.summary-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.header-card {
  align-items: center;
  display: flex;
  gap: 20px;
  justify-content: space-between;
  margin: 0 auto 18px;
  max-width: 1120px;
  padding: 24px;
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

.header-card p:not(.eyebrow),
.cart-item p,
.item-side small,
.summary-card p {
  color: var(--text-muted);
}

.wallet-pill {
  background: color-mix(in srgb, var(--text-strong) 92%, #111827);
  border-radius: 8px;
  color: white;
  min-width: 160px;
  padding: 16px;
}

.wallet-pill span,
.wallet-pill strong {
  display: block;
}

.wallet-pill strong {
  font-size: 34px;
}

.alert,
.state-card,
.cart-layout {
  margin: 0 auto 16px;
  max-width: 1120px;
}

.alert {
  border-radius: 8px;
  font-weight: 800;
  padding: 12px 14px;
}

.error {
  background: #fef2f2;
  color: #dc2626;
}

.info {
  background: #eff6ff;
  color: #1d4ed8;
}

.state-card {
  padding: 24px;
}

.empty {
  display: grid;
  gap: 14px;
  justify-items: start;
}

.cart-layout {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) 320px;
}

.cart-list {
  display: grid;
  gap: 12px;
}

.cart-item {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 18px;
}

.cart-item span {
  color: #0f766e;
  font-weight: 900;
}

.cart-item h2 {
  font-size: 20px;
  margin-top: 4px;
}

.item-side {
  display: grid;
  gap: 6px;
  justify-items: end;
  text-align: right;
}

.item-side strong,
.total {
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 900;
}

.summary-card {
  align-self: start;
  display: grid;
  gap: 12px;
  padding: 20px;
}

button {
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 900;
  padding: 11px 14px;
}

.checkout-btn {
  background: #14b8a6;
  color: white;
}

.topup-btn {
  background: #eef2ff;
  color: #3730a3;
}

.topup-btn.urgent {
  background: #dc2626;
  color: white;
}

.item-side button {
  background: #fee2e2;
  color: #b91c1c;
}

.enough {
  color: #047857 !important;
  font-weight: 800;
}

.not-enough {
  color: #dc2626 !important;
  font-weight: 800;
}

@media (max-width: 860px) {
  .header-card,
  .cart-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .cart-layout {
    grid-template-columns: 1fr;
  }

  .item-side {
    justify-items: start;
    text-align: left;
  }

  .header-card,
  .cart-item,
  .summary-card {
    padding: 18px;
  }

  .wallet-pill,
  .item-side,
  .item-side button,
  .checkout-btn,
  .topup-btn {
    width: 100%;
  }
}
</style>

