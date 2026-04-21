<script setup>
import { API_BASE_URL } from "../utils/api";
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

const router = useRouter();
const orders = ref([]);
const loading = ref(true);

const getToken = () => localStorage.getItem("token") || "";

const loadOrders = async () => {
  loading.value = true;

  try {
    const token = getToken();

    if (!token) {
      alert("กรุณาเข้าสู่ระบบก่อน");
      router.push({ name: "Login" });
      return;
    }

    const res = await axios.get(`${API_BASE_URL}/api/orders/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    orders.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("loadOrders error:", err);
    alert("โหลดประวัติคำสั่งซื้อไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const goToStore = () => {
  router.push({ name: "Store" });
};

const goToCart = () => {
  router.push({ name: "Cart" });
};

onMounted(loadOrders);
</script>

<template>
  <div class="history-page">
    <div class="container">
      <div class="header">
        <div>
          <h1>ประวัติคำสั่งซื้อ</h1>
          <p>รายการหนังสือที่คุณสั่งซื้อแล้ว</p>
        </div>

        <div class="header-actions">
          <button class="btn" @click="goToStore">← กลับร้านหนังสือ</button>
          <button class="btn primary" @click="goToCart">กลับตะกร้า</button>
        </div>
      </div>

      <div v-if="loading" class="state-box">กำลังโหลดประวัติ...</div>

      <div v-else-if="!orders.length" class="state-box empty">
        ยังไม่มีประวัติคำสั่งซื้อ
      </div>

      <div v-else class="orders-list">
        <div v-for="order in orders" :key="order.id" class="order-card">
          <div class="order-top">
            <div>
              <h3>คำสั่งซื้อ #{{ order.id }}</h3>
              <p>
                {{ order.created_at }} | {{ order.payment_status }} |
                {{ order.order_status }}
              </p>
            </div>

            <div class="amount">{{ order.total_amount }} บาท</div>
          </div>

          <div class="items">
            <div v-for="item in order.items" :key="item.id" class="item-row">
              <span>{{ item.title }}</span>
              <span>{{ item.price }} บาท</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  padding: 24px;
}

.container {
  max-width: 1200px;
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

.state-box {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 24px;
  border-radius: 18px;
  box-shadow: var(--shadow);
}

.empty {
  text-align: center;
  color: var(--text-muted);
}

.orders-list {
  display: grid;
  gap: 16px;
}

.order-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.order-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.order-top h3 {
  margin: 0 0 6px;
}

.order-top p {
  margin: 0;
  color: var(--text-muted);
}

.amount {
  font-size: 20px;
  font-weight: 800;
}

.items {
  display: grid;
  gap: 8px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--border);
  padding-top: 10px;
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 11px 14px;
  background: var(--surface-soft);
  color: var(--text-strong);
  font-weight: 700;
  cursor: pointer;
}

.btn.primary {
  background: #6c63ff;
  color: white;
}

@media (max-width: 900px) {
  .header,
  .order-top,
  .item-row {
    flex-direction: column;
  }
}
</style>
