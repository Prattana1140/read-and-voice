<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../utils/api";
import { useI18n } from "../utils/i18n";
import { localizedTitle } from "../utils/localizedContent";

type CartItem = {
  id: number;
  book_id?: number | null;
  episode_id?: number | null;
  quantity?: number;
  title: string;
  title_th?: string;
  title_en?: string;
  book_title?: string;
  book_title_th?: string;
  book_title_en?: string;
  episode_number?: number;
  price?: number;
  access_type?: string;
};

const router = useRouter();
const { locale, t } = useI18n();
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
    errorMessage.value = error?.response?.data?.message || t("cart.loadFailed");
  } finally {
    loading.value = false;
  }
}

async function removeItem(id: number) {
  try {
    await api.delete(`/cart/${id}`);
    cart.value = cart.value.filter((item) => item.id !== id);
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || t("cart.removeFailed");
  }
}

async function checkout() {
  if (!cart.value.length) return;

  if (!hasEnoughCoins.value) {
    const message = `${t("cart.notEnoughAlert")} ${coinShortage.value} ${t("cart.notEnoughAlertSuffix")}`;
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

    window.alert(t("cart.success"));
    cart.value = [];
    await loadCart();
    router.push({ name: "MyLibrary" });
  } catch (error: any) {
    if (error?.response?.status === 402) {
      const currentBalance = Number(error?.response?.data?.balance ?? balance.value);
      balance.value = currentBalance;
      const message = error?.response?.data?.message || t("cart.notEnoughGeneric");
      errorMessage.value = message;
      window.alert(message);
      return;
    }
    errorMessage.value = error?.response?.data?.message || t("cart.checkoutFailed");
    window.alert(errorMessage.value);
  } finally {
    checkingOut.value = false;
  }
}
function itemKind(item: CartItem) {
  return item.episode_id ? t("cart.episode") : t("cart.ebook");
}

function itemTitle(item: CartItem) {
  return localizedTitle(item, locale.value) || item.title;
}

function parentBookTitle(item: CartItem) {
  return localizedTitle(
    {
      title: item.book_title,
      title_th: item.book_title_th || item.book_title,
      title_en: item.book_title_en,
    },
    locale.value,
  ) || item.book_title || "";
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
        <h1>{{ t("cart.title") }}</h1>
        <p>{{ t("cart.subtitle") }}</p>
      </div>

      <div class="wallet-pill">
        <span>{{ t("cart.wallet") }}</span>
        <strong>{{ balance }}</strong>
      </div>
    </section>

    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
    <p class="alert info">{{ t("cart.info") }}</p>

    <section v-if="loading" class="state-card">{{ t("cart.loading") }}</section>
    <section v-else-if="cart.length === 0" class="state-card empty">
      {{ t("cart.empty") }}
      <button type="button" @click="router.push('/store')">{{ t("cart.browse") }}</button>
    </section>

    <section v-else class="cart-layout">
      <div class="cart-list">
        <article v-for="item in cart" :key="item.id" class="cart-item">
          <div>
            <span>{{ itemKind(item) }}</span>
            <h2>{{ itemTitle(item) }}</h2>
            <p v-if="item.book_title && item.episode_id">
              {{ parentBookTitle(item) }} {{ t("cart.episodeNumber") }} {{ item.episode_number || "-" }}
            </p>
            <p>{{ item.access_type || "paid" }}</p>
          </div>

          <div class="item-side">
            <strong>{{ Number(item.price || 0) * Number(item.quantity || 1) }} {{ t("cart.coins") }}</strong>
            <small>{{ t("cart.quantity") }} {{ item.quantity || 1 }}</small>
            <button type="button" @click="removeItem(item.id)">{{ t("common.delete") }}</button>
          </div>
        </article>
      </div>

      <aside class="summary-card">
        <h2>{{ t("cart.summary") }}</h2>
        <p>{{ t("cart.itemCount") }}: {{ cart.length }}</p>
        <p class="total">{{ t("cart.total") }} {{ total }} {{ t("cart.coins") }}</p>
        <p :class="hasEnoughCoins ? 'enough' : 'not-enough'">
          {{
            hasEnoughCoins
              ? t("cart.enough")
              : `${t("cart.notEnoughPrefix")} ${coinShortage} ${t("cart.coins")}`
          }}
        </p>

        <button
          v-if="hasEnoughCoins"
          class="checkout-btn"
          type="button"
          :disabled="checkingOut"
          @click="checkout"
        >
          {{ checkingOut ? t("cart.checkingOut") : t("cart.checkout") }}
        </button>
        <button v-else class="topup-btn urgent" type="button" @click="checkout">
          {{ t("cart.checkout") }}
        </button>
        <button v-if="hasEnoughCoins" class="topup-btn" type="button" @click="goTopup">
          {{ t("cart.topupMore") }}
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
  font-size: 36px;
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
  font-size: 22px;
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
  font-size: 26px;
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
