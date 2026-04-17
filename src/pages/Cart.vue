<script setup>
import { API_BASE_URL } from "../utils/api";
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

const router = useRouter();
const cart = ref([]);
const loading = ref(true);
const checkingOut = ref(false);

const total = computed(() =>
  cart.value.reduce((sum, item) => sum + Number(item.price || 0), 0),
);

const getToken = () => localStorage.getItem("token") || "";

const getHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const loadCart = async () => {
  loading.value = true;

  try {
    const token = getToken();

    if (!token) {
      alert("กรุณาเข้าสู่ระบบก่อน");
      router.push({ name: "Login" });
      return;
    }

    const res = await axios.get(`${API_BASE_URL}/api/cart`, {
      headers: getHeaders(),
    });

    cart.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("loadCart error:", err);
    alert("โหลดตะกร้าไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const removeItem = async (id) => {
  try {
    await axios.delete(`${API_BASE_URL}/api/cart/${id}`, {
      headers: getHeaders(),
    });

    cart.value = cart.value.filter((item) => item.id !== id);
  } catch (err) {
    console.error("removeItem error:", err);
    alert("ลบสินค้าไม่สำเร็จ");
  }
};

const checkout = async () => {
  if (!cart.value.length) {
    alert("ไม่มีสินค้าในตะกร้า");
    return;
  }

  try {
    checkingOut.value = true;

    const res = await axios.post(
      `${API_BASE_URL}/api/orders/checkout`,
      { payment_method: "mock" },
      { headers: getHeaders() },
    );

    alert(res.data.message || "สั่งซื้อสำเร็จ");
    cart.value = [];
    router.push({ name: "OrderHistory" });
  } catch (err) {
    console.error("checkout error:", err);
    alert(err?.response?.data?.message || "สั่งซื้อไม่สำเร็จ");
  } finally {
    checkingOut.value = false;
  }
};

const goToStore = () => {
  router.push({ name: "Store" });
};

const goToHistory = () => {
  router.push({ name: "OrderHistory" });
};

onMounted(loadCart);
</script>

<template>
  <div class="cart-page">
    <div class="container">
      <div class="header">
        <div>
          <h1>ตะกร้าของฉัน</h1>
          <p>ตรวจสอบรายการก่อนสั่งซื้อ</p>
        </div>

        <div class="header-actions">
          <button class="btn" @click="goToStore">กลับร้านหนังสือ</button>
          <button class="btn primary" @click="goToHistory">
            ประวัติคำสั่งซื้อ
          </button>
        </div>
      </div>

      <div v-if="loading" class="state-box">กำลังโหลดตะกร้า...</div>

      <div v-else-if="!cart.length" class="state-box empty">
        ยังไม่มีสินค้าในตะกร้า
      </div>

      <div v-else class="cart-layout">
        <div class="cart-list">
          <div v-for="item in cart" :key="item.id" class="cart-item">
            <div class="item-info">
              <h3>{{ item.title }}</h3>
              <p>{{ item.price }} บาท</p>
            </div>

            <button class="btn danger" @click="removeItem(item.id)">ลบ</button>
          </div>
        </div>

        <div class="summary-box">
          <h2>สรุปรายการ</h2>
          <p>จำนวนสินค้า: {{ cart.length }}</p>
          <p class="total">รวมทั้งหมด: {{ total }} บาท</p>

          <button class="checkout-btn" @click="checkout" :disabled="checkingOut">
            {{ checkingOut ? "กำลังสั่งซื้อ..." : "ซื้อเลย" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  min-height: 100%;
  background: var(--bg);
  padding: 28px 20px 44px;
}

.container {
  max-width: var(--content-width);
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 8px;
  color: var(--text-strong);
}

.header p {
  margin: 0;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.state-box,
.cart-item,
.summary-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.state-box {
  padding: 24px;
}

.empty {
  text-align: center;
  color: var(--text-muted);
}

.cart-layout {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr;
  gap: 20px;
}

.cart-list {
  display: grid;
  gap: 14px;
}

.cart-item {
  padding: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-info h3 {
  margin: 0 0 8px;
  color: var(--text-strong);
}

.item-info p {
  margin: 0;
  color: var(--text-muted);
}

.summary-box {
  padding: 20px;
  height: fit-content;
}

.summary-box h2 {
  color: var(--text-strong);
}

.total {
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 900;
  margin-top: 12px;
}

.btn,
.checkout-btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 800;
}

.btn {
  padding: 11px 14px;
  background: var(--surface-soft);
  color: var(--text-strong);
}

.btn.primary,
.checkout-btn {
  background: var(--primary);
  color: var(--on-primary);
}

.btn.danger {
  background: var(--danger);
  color: white;
}

.checkout-btn {
  width: 100%;
  margin-top: 16px;
  padding: 14px;
  font-size: 16px;
}

.checkout-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .cart-layout {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
  }
}
</style>
