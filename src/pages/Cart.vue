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
    errorMessage.value = error?.response?.data?.message || "โหลดตะกร้าไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function removeItem(id: number) {
  try {
    await api.delete(`/cart/${id}`);
    cart.value = cart.value.filter((item) => item.id !== id);
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ลบสินค้าไม่สำเร็จ";
  }
}

async function checkout() {
  if (!cart.value.length) return;

  checkingOut.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.post("/orders/checkout", {
      payment_method: "coin",
    });

    alert(data?.message || "ซื้อสำเร็จ");
    cart.value = [];
    router.push({ name: "OrderHistory" });
  } catch (error: any) {
    if (error?.response?.status === 402) {
      errorMessage.value = "coin ไม่พอ กรุณาเติม coin ก่อนซื้อ";
      router.push({ name: "CoinWallet" });
      return;
    }
    errorMessage.value = error?.response?.data?.message || "ซื้อไม่สำเร็จ";
  } finally {
    checkingOut.value = false;
  }
}

function itemKind(item: CartItem) {
  return item.episode_id ? "รายตอน" : "อีบุ๊ก";
}

onMounted(loadCart);
</script>

<template>
  <main class="cart-page">
    <section class="header-card">
      <div>
        <p class="eyebrow">Checkout</p>
        <h1>ตะกร้าของฉัน</h1>
        <p>ซื้ออีบุ๊กและรายตอนด้วย coin ในกระเป๋า</p>
      </div>

      <div class="wallet-pill">
        <span>ยอด coin</span>
        <strong>{{ balance }}</strong>
      </div>
    </section>

    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>

    <section v-if="loading" class="state-card">กำลังโหลดตะกร้า...</section>
    <section v-else-if="cart.length === 0" class="state-card empty">
      ยังไม่มีสินค้าในตะกร้า
      <button type="button" @click="router.push('/store')">ไปเลือกหนังสือ</button>
    </section>

    <section v-else class="cart-layout">
      <div class="cart-list">
        <article v-for="item in cart" :key="item.id" class="cart-item">
          <div>
            <span>{{ itemKind(item) }}</span>
            <h2>{{ item.title }}</h2>
            <p v-if="item.book_title && item.episode_id">
              {{ item.book_title }} ตอนที่ {{ item.episode_number || "-" }}
            </p>
            <p>{{ item.access_type || "paid" }}</p>
          </div>

          <div class="item-side">
            <strong>{{ Number(item.price || 0) * Number(item.quantity || 1) }} coin</strong>
            <small>จำนวน {{ item.quantity || 1 }}</small>
            <button type="button" @click="removeItem(item.id)">ลบ</button>
          </div>
        </article>
      </div>

      <aside class="summary-card">
        <h2>สรุปรายการ</h2>
        <p>จำนวนสินค้า: {{ cart.length }}</p>
        <p class="total">รวม {{ total }} coin</p>
        <p :class="balance >= total ? 'enough' : 'not-enough'">
          {{ balance >= total ? "coin เพียงพอสำหรับชำระเงิน" : "coin ไม่พอสำหรับรายการนี้" }}
        </p>

        <button
          class="checkout-btn"
          type="button"
          :disabled="checkingOut"
          @click="checkout"
        >
          {{ checkingOut ? "กำลังซื้อ..." : "ชำระด้วย coin" }}
        </button>
        <button class="topup-btn" type="button" @click="router.push('/coin-wallet')">
          เติม coin
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
  justify-content: space-between;
  gap: 20px;
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
  justify-content: space-between;
  gap: 16px;
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
