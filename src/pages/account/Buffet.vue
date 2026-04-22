<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";
import AccountSectionLayout from "../../components/account/AccountSectionLayout.vue";

type BuffetItem = { id: number; title: string | null; description: string | null; status: string; payment_status: string | null; start_at: string | null; end_at: string | null; price: number | null; duration_days: number | null; };
const router = useRouter();
const loading = ref(true);
const errorMessage = ref("");
const items = ref<BuffetItem[]>([]);
const hasItems = computed(() => items.value.length > 0);
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString("th-TH") : "-";
async function loadItems() { try { loading.value = true; errorMessage.value = ""; const { data } = await api.get("/account/buffet"); items.value = Array.isArray(data?.items) ? data.items : []; } catch (error: any) { errorMessage.value = error?.response?.data?.message || "โหลดสถานะสมาชิกไม่สำเร็จ"; } finally { loading.value = false; } }
onMounted(loadItems);
</script>

<template>
  <AccountSectionLayout title="สถานะสมาชิก" description="สรุปแพ็กเกจสมาชิกที่คุณเคยสมัคร พร้อมช่วงเวลาใช้งานและสถานะการชำระเงิน" :loading="loading" :error-message="errorMessage" :empty="!hasItems" empty-title="ยังไม่มีสถานะสมาชิก" empty-text="เมื่อมีการสมัครแพ็กเกจ รายการจะแสดงที่หน้านี้" @back="router.push('/profile')">
    <section class="table-card">
      <h2>นิตยสาร</h2>
      <table>
        <thead><tr><th>ชื่อแพ็กเกจ</th><th>รายละเอียด</th><th>เริ่มใช้</th><th>สิ้นสุด</th><th>ราคา</th><th>สถานะ</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.title || 'แพ็กเกจสมาชิก' }}</td>
            <td>{{ item.description || '-' }}</td>
            <td>{{ formatDate(item.start_at) }}</td>
            <td>{{ formatDate(item.end_at) }}</td>
            <td>{{ item.price ?? 0 }} บาท</td>
            <td>{{ item.status || item.payment_status || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
    <section class="table-card secondary-card">
      <h2>บุฟเฟต์</h2>
      <table>
        <thead><tr><th>ชื่อแพ็กเกจ</th><th>คำอธิบาย</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="`buffet-${item.id}`">
            <td>{{ item.title || 'แพ็กเกจสมาชิก' }}</td>
            <td>{{ item.description || 'ไม่มีข้อมูลเพิ่มเติม' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </AccountSectionLayout>
</template>

<style scoped>
.table-card { display: grid; gap: 14px; border: 1px solid var(--border); border-radius: 20px; background: var(--surface); box-shadow: var(--shadow); padding: 22px; }
.secondary-card { margin-top: 16px; }
h2 { margin: 0; color: var(--text-strong); font-size: 26px; font-weight: 900; }
table { width: 100%; border-collapse: collapse; }
th,td { border-top: 1px solid var(--border); padding: 14px 10px; text-align: left; vertical-align: top; }
th { color: var(--text-strong); font-size: 14px; }
td { color: var(--text-muted); line-height: 1.6; }
@media (max-width: 760px) { .table-card { overflow-x: auto; } table { min-width: 720px; } }
</style>
