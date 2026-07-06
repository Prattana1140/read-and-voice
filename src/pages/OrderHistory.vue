<script setup lang="ts">
import api, { API_BASE_URL } from "../utils/api";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

type OrderItem = { id: number; title: string; price: number; };
type Order = { id: number; created_at: string; payment_status: string; order_status: string; total_amount: number; items?: OrderItem[]; };
const router = useRouter();
const orders = ref<Order[]>([]);
const loading = ref(true);
const period = ref("7d");
const showSuccessfulOnly = ref(false);
const filteredOrders = computed(() => {
  const now = Date.now();
  const dayMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, 'all': 3650 };
  return orders.value.filter((order) => {
    if (showSuccessfulOnly.value && !String(order.payment_status || '').toLowerCase().includes('success')) return false;
    const days = dayMap[period.value] ?? 7;
    const orderTime = new Date(order.created_at).getTime();
    const diff = (now - orderTime) / (1000 * 60 * 60 * 24);
    return diff <= days;
  });
});
async function loadOrders() {
  loading.value = true;
  try {
    const token = localStorage.getItem('token') || '';
    if (!token) { alert('กรุณาเข้าสู่ระบบก่อน'); router.push({ name: 'Login' }); return; }
    const res = await api.get(`${API_BASE_URL}/api/orders/history`, { headers: { Authorization: `Bearer ${token}` } });
    orders.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('loadOrders error:', err);
    alert('โหลดประวัติการสั่งซื้อไม่สำเร็จ');
  } finally { loading.value = false; }
}
onMounted(loadOrders);
</script>

<template>
  <div class="history-page">
    <div class="container">
      <header class="history-header"><h1>ประวัติการสั่งซื้อของฉัน</h1></header>
      <section class="filter-bar">
        <label><span>ช่วงเวลา</span><select v-model="period"><option value="7d">7 วันล่าสุด</option><option value="30d">30 วันล่าสุด</option><option value="90d">90 วันล่าสุด</option><option value="all">ทั้งหมด</option></select></label>
        <label class="checkbox-row"><input v-model="showSuccessfulOnly" type="checkbox" /><span>แสดงเฉพาะรายการที่ชำระเงินสำเร็จ</span></label>
        <button type="button" @click="loadOrders">ค้นหา</button>
      </section>
      <div v-if="loading" class="state-box">กำลังโหลดประวัติการสั่งซื้อ...</div>
      <div v-else-if="!filteredOrders.length" class="empty-state"><h2>ขออภัยด้วยนะคะ</h2><p>ไม่พบรายการที่คุณค้นหา</p></div>
      <section v-else class="orders-list">
        <article v-for="order in filteredOrders" :key="order.id" class="order-card">
          <div class="order-head"><div><strong>คำสั่งซื้อ</strong><p>{{ new Date(order.created_at).toLocaleString('th-TH') }}</p></div><span>{{ order.total_amount }} บาท</span></div>
          <div class="status-row"><span>สถานะชำระเงิน: {{ order.payment_status }}</span><span>สถานะรายการ: {{ order.order_status }}</span></div>
          <div v-if="order.items?.length" class="order-items"><div v-for="item in order.items" :key="item.id" class="item-row"><span>{{ item.title }}</span><span>{{ item.price }} บาท</span></div></div>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped>
.history-page { min-height: 100vh; min-height: 100dvh; background: var(--bg); color: var(--text); padding: var(--page-block, 24px) var(--page-gutter, 24px); }
.container { width: min(100%, 1120px); margin: 0 auto; }
.history-header { display: flex; justify-content: center; margin-bottom: 24px; }
h1 { margin: 0; color: var(--text-strong); font-size: clamp(24px, 3.6vw, 34px); font-weight: 900; text-align: center; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; margin-bottom: 24px; }
label { display: grid; gap: 6px; }
.checkbox-row { display: inline-flex; align-items: center; gap: 8px; }
select,button { min-height: 42px; border-radius: 10px; font: inherit; }
select { border: 1px solid var(--border); background: var(--surface); color: var(--text-strong); padding: 0 12px; }
button { border: 0; background: #10b981; color: #ffffff; cursor: pointer; font-weight: 900; padding: 0 18px; }
.state-box,.empty-state,.order-card { border: 1px solid var(--border); border-radius: 20px; background: var(--surface); box-shadow: var(--shadow); }
.state-box,.empty-state { padding: 24px; }
.empty-state { display: grid; justify-items: center; gap: 8px; text-align: center; }
.empty-state h2,.empty-state p { margin: 0; }
.orders-list { display: grid; gap: 16px; }
.order-card { padding: 20px; }
.order-head,.status-row,.item-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.order-head strong { color: var(--text-strong); }
.order-head p,.status-row,.item-row { color: var(--text-muted); }
.order-head p { margin: 6px 0 0; }
.status-row { margin-top: 12px; flex-wrap: wrap; }
.order-items { display: grid; gap: 10px; margin-top: 16px; }
.item-row { border-top: 1px solid var(--border); padding-top: 12px; }
@media (max-width: 760px) { .filter-bar,.order-head,.status-row,.item-row { flex-direction: column; align-items: flex-start; } .filter-bar label,.filter-bar select,.filter-bar button { width: 100%; } .order-card { padding: 16px; } }
</style>
