<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";
import { logout } from "../../utils/auth";
import {
  DEVICES_CHANGED_EVENT,
  getClientDeviceId,
  registerCurrentDevice,
} from "../../utils/deviceRegistration";
import AccountSectionLayout from "../../components/account/AccountSectionLayout.vue";

type DeviceItem = {
  id: number;
  device_name: string;
  client_device_id?: string | null;
  platform: string | null;
  user_agent?: string | null;
  last_used_at: string | null;
  created_at: string;
};

const router = useRouter();
const loading = ref(true);
const refreshing = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const items = ref<DeviceItem[]>([]);
const editingId = ref<number | null>(null);
const editForm = reactive({ device_name: "" });
let refreshTimer: ReturnType<typeof window.setInterval> | undefined;

const currentDeviceId = getClientDeviceId();
const hasItems = computed(() => items.value.length > 0);

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
};

function isCurrentDevice(item: DeviceItem) {
  return item.client_device_id === currentDeviceId;
}

async function loadItems(options: { silent?: boolean } = {}) {
  try {
    if (options.silent) {
      refreshing.value = true;
    } else {
      loading.value = true;
    }

    errorMessage.value = "";
    const { data } = await api.get("/account/devices");
    items.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error: any) {
    if (!options.silent) {
      errorMessage.value = error?.response?.data?.message || "โหลดรายการอุปกรณ์ไม่สำเร็จ";
    }
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function startEditing(item: DeviceItem) {
  editingId.value = item.id;
  editForm.device_name = item.device_name;
  successMessage.value = "";
}

function cancelEditing() {
  editingId.value = null;
  editForm.device_name = "";
}

async function saveDevice(item: DeviceItem) {
  const deviceName = editForm.device_name.trim();
  if (!deviceName) {
    errorMessage.value = "กรุณาระบุชื่ออุปกรณ์";
    return;
  }

  try {
    saving.value = true;
    errorMessage.value = "";
    successMessage.value = "";
    await api.put(`/account/devices/${item.id}`, {
      device_name: deviceName,
      platform: item.platform,
    });
    successMessage.value = "อัปเดตชื่ออุปกรณ์แล้ว";
    cancelEditing();
    await loadItems({ silent: true });
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "อัปเดตอุปกรณ์ไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

async function removeDevice(item: DeviceItem) {
  const label = isCurrentDevice(item)
    ? "อุปกรณ์นี้คือเครื่องที่กำลังใช้งานอยู่ ต้องการลบรายการและออกจากระบบใช่ไหม"
    : `ลบรายการอุปกรณ์ "${item.device_name}" ใช่ไหม`;
  const confirmed = window.confirm(label);
  if (!confirmed) return;

  try {
    saving.value = true;
    errorMessage.value = "";
    successMessage.value = "";
    await api.delete(`/account/devices/${item.id}`);

    if (isCurrentDevice(item)) {
      logout();
      router.push("/login");
      return;
    }

    successMessage.value = "ลบรายการอุปกรณ์แล้ว";
    await loadItems({ silent: true });
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ลบอุปกรณ์ไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

async function logoutAllDevices() {
  const confirmed = window.confirm("ต้องการออกจากระบบทุกอุปกรณ์ใช่ไหม");
  if (!confirmed) return;

  try {
    saving.value = true;
    await api.post("/account/devices/logout-all");
    window.alert("ออกจากระบบทุกอุปกรณ์แล้ว กรุณาเข้าสู่ระบบใหม่");
    logout();
    router.push("/login");
  } catch {
    window.alert("ยังไม่สามารถออกจากระบบทุกอุปกรณ์ได้");
  } finally {
    saving.value = false;
  }
}

function handleRealtimeRefresh() {
  loadItems({ silent: true });
}

onMounted(async () => {
  await registerCurrentDevice();
  await loadItems();
  refreshTimer = window.setInterval(() => loadItems({ silent: true }), 15000);
  window.addEventListener("focus", handleRealtimeRefresh);
  window.addEventListener(DEVICES_CHANGED_EVENT, handleRealtimeRefresh);
});

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
  window.removeEventListener("focus", handleRealtimeRefresh);
  window.removeEventListener(DEVICES_CHANGED_EVENT, handleRealtimeRefresh);
});
</script>

<template>
  <AccountSectionLayout
    title="อุปกรณ์ของฉัน"
    description="รายการนี้บันทึกจากการเข้าสู่ระบบจริงของบัญชี และจะอัปเดตอัตโนมัติเมื่อมีการแก้ไขหรือล็อกอินจากเครื่องอื่น"
    :loading="loading"
    :error-message="errorMessage"
    :empty="!hasItems"
    empty-title="ยังไม่พบอุปกรณ์ที่บันทึกไว้"
    empty-text="เมื่อเข้าสู่ระบบจากอุปกรณ์นี้หรืออุปกรณ์อื่น รายการจะแสดงที่หน้านี้"
    @back="router.push('/profile')"
  >
    <section class="device-panel">
      <div class="panel-head">
        <p>{{ refreshing ? "กำลังอัปเดต..." : `${items.length} อุปกรณ์` }}</p>
        <button type="button" class="ghost" :disabled="refreshing" @click="loadItems({ silent: true })">
          รีเฟรช
        </button>
      </div>

      <p v-if="successMessage" class="feedback success">{{ successMessage }}</p>

      <div class="device-list">
        <article
          v-for="item in items"
          :key="item.id"
          class="device-card"
          :class="{ current: isCurrentDevice(item) }"
        >
          <div class="device-main">
            <span class="device-pill">{{ isCurrentDevice(item) ? "เครื่องนี้" : "อุปกรณ์" }}</span>

            <template v-if="editingId === item.id">
              <label>
                <span>ชื่ออุปกรณ์</span>
                <input v-model="editForm.device_name" type="text" maxlength="255" />
              </label>
            </template>

            <template v-else>
              <strong>{{ item.device_name }}</strong>
              <small>{{ item.platform || "-" }}</small>
            </template>
          </div>

          <div class="device-meta">
            <span>ใช้งานล่าสุด {{ formatDate(item.last_used_at || item.created_at) }}</span>
            <small v-if="item.user_agent">{{ item.user_agent }}</small>
          </div>

          <div class="device-actions">
            <template v-if="editingId === item.id">
              <button type="button" :disabled="saving" @click="saveDevice(item)">
                บันทึก
              </button>
              <button type="button" class="ghost" :disabled="saving" @click="cancelEditing">
                ยกเลิก
              </button>
            </template>
            <template v-else>
              <button type="button" class="ghost" @click="startEditing(item)">
                แก้ชื่อ
              </button>
              <button type="button" class="danger" :disabled="saving" @click="removeDevice(item)">
                {{ isCurrentDevice(item) ? "ลบรายการและออกจากระบบ" : "ลบรายการ" }}
              </button>
            </template>
          </div>
        </article>
      </div>

      <div class="actions">
        <button type="button" class="danger-outline" :disabled="saving" @click="logoutAllDevices">
          {{ saving ? "กำลังดำเนินการ..." : "ออกจากระบบทุกอุปกรณ์" }}
        </button>
      </div>
    </section>
  </AccountSectionLayout>
</template>

<style scoped>
.device-panel {
  display: grid;
  gap: 16px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 20px;
}

.panel-head,
.device-actions,
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-head {
  justify-content: space-between;
}

.panel-head p,
.feedback {
  margin: 0;
}

.panel-head p,
.device-meta,
.device-main small {
  color: var(--text-muted);
}

.feedback.success {
  color: #15803d;
  font-weight: 800;
}

.device-list {
  display: grid;
  gap: 12px;
}

.device-card {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-soft);
  padding: 14px;
}

.device-card.current {
  border-color: color-mix(in srgb, var(--primary) 42%, var(--border));
  background: color-mix(in srgb, var(--primary-soft) 72%, var(--surface));
}

.device-main {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.device-main strong {
  color: var(--text-strong);
  font-weight: 800;
}

.device-pill {
  width: fit-content;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: 13px;
  font-weight: 800;
  padding: 4px 9px;
}

.device-meta {
  display: grid;
  gap: 5px;
  min-width: 0;
  line-height: 1.45;
}

.device-meta small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

label {
  display: grid;
  gap: 7px;
}

input {
  min-height: 40px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-strong);
  font: inherit;
  padding: 0 12px;
}

button {
  min-height: 38px;
  border: 0;
  border-radius: 999px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  padding: 0 14px;
}

button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.ghost {
  background: var(--surface);
  color: var(--text-strong);
}

.danger {
  background: #fef2f2;
  color: #b91c1c;
}

.danger-outline {
  border: 1px solid #ef4444;
  background: var(--surface);
  color: #ef4444;
}

.actions {
  justify-content: center;
  padding-top: 4px;
}

@media (max-width: 900px) {
  .device-card {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .device-actions {
    flex-wrap: wrap;
  }
}
</style>
