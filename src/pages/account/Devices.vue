<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";
import AccountSectionLayout from "../../components/account/AccountSectionLayout.vue";

type DeviceItem = { id: number; device_name: string; platform: string | null; last_used_at: string | null; created_at: string; };
const router = useRouter();
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const items = ref<DeviceItem[]>([]);
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString("th-TH") : "-";
async function loadItems() { try { loading.value = true; errorMessage.value = ""; const { data } = await api.get("/account/devices"); items.value = Array.isArray(data?.items) ? data.items : []; } catch (error: any) { errorMessage.value = error?.response?.data?.message || "โหลดรายการอุปกรณ์ไม่สำเร็จ"; } finally { loading.value = false; } }
async function logoutAllDevices() { const confirmed = window.confirm("ต้องการออกจากระบบทุกอุปกรณ์ใช่ไหม"); if (!confirmed) return; try { saving.value = true; await api.post("/account/devices/logout-all"); await loadItems(); window.alert("ออกจากระบบทุกอุปกรณ์แล้ว"); } catch { window.alert("ยังไม่สามารถออกจากระบบทุกอุปกรณ์ได้"); } finally { saving.value = false; } }
onMounted(loadItems);
</script>

<template>
  <AccountSectionLayout title="อุปกรณ์ของฉัน" description="สำหรับมือถือหรือแท็บเล็ตที่ใช้งาน ควรออกจากระบบก่อนเปลี่ยนเครื่อง รีเซ็ตเครื่อง หรือลบแอป เพื่อให้การเข้าใช้งานครั้งถัดไปเป็นไปอย่างราบรื่น" :loading="loading" :error-message="errorMessage" :empty="items.length === 0" empty-title="ยังไม่พบอุปกรณ์ที่บันทึกไว้" empty-text="เมื่อมีการใช้งานอุปกรณ์ รายการจะถูกบันทึกที่หน้านี้" @back="router.push('/profile')">
    <section class="device-panel">
      <p>หากต้องการย้ายอุปกรณ์ แนะนำให้ออกจากระบบบนเครื่องเดิมก่อน แล้วค่อยเข้าสู่ระบบบนเครื่องใหม่ เพื่อป้องกันปัญหาการใช้งานซ้ำซ้อนในระบบ</p>
      <table>
        <thead><tr><th>Device Name</th><th>Login Date</th><th>Application</th><th>App Platform</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id"><td>{{ item.device_name }}</td><td>{{ formatDate(item.last_used_at || item.created_at) }}</td><td>Read and Voice</td><td>{{ item.platform || '-' }}</td></tr>
        </tbody>
      </table>
      <div class="actions"><button type="button" :disabled="saving" @click="logoutAllDevices">{{ saving ? 'กำลังดำเนินการ...' : 'Logout all devices' }}</button></div>
    </section>
  </AccountSectionLayout>
</template>

<style scoped>
.device-panel { display: grid; gap: 18px; border: 1px solid var(--border); border-radius: 20px; background: var(--surface); box-shadow: var(--shadow); padding: 22px; }
p { margin: 0; color: var(--text-muted); line-height: 1.8; }
table { width: 100%; border-collapse: collapse; }
th,td { border-top: 1px solid var(--border); padding: 14px 10px; text-align: left; }
th { color: var(--text-strong); font-size: 14px; }
td { color: var(--text-muted); }
.actions { display: flex; justify-content: center; }
button { min-width: 180px; min-height: 44px; border: 0; border-radius: 999px; background: #10b981; color: #ffffff; cursor: pointer; font-weight: 900; padding: 0 18px; }
@media (max-width: 760px) { .device-panel { overflow-x: auto; } table { min-width: 640px; } }
</style>
