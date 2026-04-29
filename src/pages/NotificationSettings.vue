<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();
const settings = ref([
  { key: 'writers', title: 'นักเขียนที่ติดตาม', detail: 'แจ้งเตือนเมื่อมีผลงานใหม่จากนักเขียนที่คุณติดตาม', enabled: true },
  { key: 'series', title: 'ตอนใหม่', detail: 'แจ้งเตือนเมื่อมีตอนใหม่ของเรื่องที่กำลังติดตาม', enabled: true },
  { key: 'promotions', title: 'โปรโมชัน', detail: 'แจ้งเตือนข่าวสารและส่วนลดที่เกี่ยวข้องกับการอ่าน', enabled: false },
  { key: 'system', title: 'การเปลี่ยนแปลงของระบบ', detail: 'แจ้งเตือนเรื่องความปลอดภัยและการเปลี่ยนแปลงสำคัญของบัญชี', enabled: true },
]);
function saveSettings() { localStorage.setItem('notification-settings', JSON.stringify(settings.value)); window.alert('บันทึกการตั้งค่าแล้ว'); }
</script>
<template><main class="settings-page"><section class="settings-card"><div class="settings-head"><h1>ตั้งค่าการแจ้งเตือน</h1><p>เลือกประเภทการแจ้งเตือนที่คุณต้องการรับจากระบบ</p></div><label v-for="item in settings" :key="item.key" class="setting-row"><input v-model="item.enabled" type="checkbox" /><div><strong>{{ item.title }}</strong><small>{{ item.detail }}</small></div></label><div class="actions"><button type="button" class="secondary" @click="router.back()">กลับหน้าก่อนหน้า</button><button type="button" @click="saveSettings">บันทึก</button></div></section></main></template>
<style scoped>
.settings-page {
  min-height: calc(100vh - 140px);
  min-height: calc(100dvh - 140px);
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: var(--page-block, 28px) var(--page-gutter, 20px) 40px;
}

.settings-card {
  width: min(720px, 100%);
  display: grid;
  gap: 18px;
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
}

.settings-head h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 32px;
  font-weight: 900;
}

.settings-head p {
  margin: 8px 0 0;
  color: var(--text-muted);
  line-height: 1.7;
}

.setting-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-soft);
  padding: 16px;
}

.setting-row input {
  margin-top: 4px;
}

.setting-row strong {
  display: block;
  color: var(--text-strong);
}

.setting-row small {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  line-height: 1.6;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  background: #10b981;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

button.secondary {
  background: var(--surface-soft);
  color: var(--text-strong);
}

@media (max-width: 560px) {
  .settings-page {
    place-items: start center;
  }

  .settings-card {
    border-radius: 16px;
    padding: 20px 14px;
  }

  .settings-head h1 {
    font-size: 24px;
  }

  .actions,
  .actions button {
    width: 100%;
  }
}
</style>
