<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../utils/api";
import { useI18n } from "../utils/i18n";
const router = useRouter();
const { t } = useI18n();
const saving = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");
const settings = ref([
  { key: 'writers', titleKey: 'settings.notification.writersTitle', detailKey: 'settings.notification.writersDetail', enabled: true },
  { key: 'series', titleKey: 'settings.notification.seriesTitle', detailKey: 'settings.notification.seriesDetail', enabled: true },
  { key: 'promotions', titleKey: 'settings.notification.promotionsTitle', detailKey: 'settings.notification.promotionsDetail', enabled: false },
  { key: 'system', titleKey: 'settings.notification.systemTitle', detailKey: 'settings.notification.systemDetail', enabled: true },
]);
const settingTitle = (item: (typeof settings.value)[number]) => t(item.titleKey as any);
const settingDetail = (item: (typeof settings.value)[number]) => t(item.detailKey as any);
async function loadSettings() {
  try {
    errorMessage.value = "";
    const { data } = await api.get("/account/notification-settings");
    const remote = data?.settings || {};
    settings.value = settings.value.map((item) => ({
      ...item,
      enabled: Boolean(remote[item.key] ?? item.enabled),
    }));
  } catch (error: any) {
    const saved = JSON.parse(localStorage.getItem('notification-settings') || '[]');
    if (Array.isArray(saved) && saved.length) {
      settings.value = settings.value.map((item) => {
        const savedItem = saved.find((entry: any) => entry?.key === item.key);
        return savedItem ? { ...item, enabled: Boolean(savedItem.enabled) } : item;
      });
    }
    errorMessage.value =
      error?.response?.data?.message || t("settings.notification.errorLoad");
  }
}

async function saveSettings() {
  saving.value = true;
  statusMessage.value = "";
  errorMessage.value = "";
  const payload = settings.value.reduce<Record<string, boolean>>((map, item) => {
    map[item.key] = Boolean(item.enabled);
    return map;
  }, {});

  try {
    const { data } = await api.put("/account/notification-settings", { settings: payload });
    localStorage.setItem('notification-settings', JSON.stringify(settings.value));
    statusMessage.value = data?.message || t("settings.notification.saved");
  } catch (error: any) {
    localStorage.setItem('notification-settings', JSON.stringify(settings.value));
    errorMessage.value =
      error?.response?.data?.message ||
      t("settings.notification.errorSave");
  } finally {
    saving.value = false;
  }
}

onMounted(loadSettings);
</script>
<template><main class="settings-page"><section class="settings-card"><div class="settings-head"><h1>{{ t("settings.notification.title") }}</h1><p>{{ t("settings.notification.detail") }}</p></div><p v-if="statusMessage" class="notice success">{{ statusMessage }}</p><p v-if="errorMessage" class="notice error">{{ errorMessage }}</p><label v-for="item in settings" :key="item.key" class="setting-row"><input v-model="item.enabled" type="checkbox" /><div><strong>{{ settingTitle(item) }}</strong><small>{{ settingDetail(item) }}</small></div></label><div class="actions"><button type="button" class="secondary" @click="router.back()">{{ t("common.back") }}</button><button type="button" :disabled="saving" @click="saveSettings">{{ saving ? t("common.saving") : t("common.save") }}</button></div></section></main></template>
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
  font-size: 34px;
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

.notice {
  margin: 0;
  border-radius: 12px;
  font-weight: 800;
  line-height: 1.6;
  padding: 10px 12px;
}

.notice.success {
  background: #ecfdf5;
  color: #047857;
}

.notice.error {
  background: #fef2f2;
  color: #b91c1c;
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

button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
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
    font-size: 26px;
  }

  .actions,
  .actions button {
    width: 100%;
  }
}
</style>
