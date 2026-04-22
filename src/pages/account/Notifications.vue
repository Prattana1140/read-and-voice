<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";
import AccountSectionLayout from "../../components/account/AccountSectionLayout.vue";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  action_url?: string | null;
  is_read: number;
  created_at: string;
};

const router = useRouter();
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const items = ref<NotificationItem[]>([]);

const hasItems = computed(() => items.value.length > 0);
const unreadCount = computed(() => items.value.filter((item) => Number(item.is_read) !== 1).length);

async function loadItems() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/account/notifications");
    items.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดการแจ้งเตือนไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function markAsRead(item: NotificationItem) {
  if (Number(item.is_read) === 1) {
    if (item.action_url) router.push(item.action_url);
    return;
  }

  try {
    saving.value = true;
    await api.post(`/account/notifications/${item.id}/read`);
    item.is_read = 1;
    if (item.action_url) router.push(item.action_url);
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "อัปเดตการแจ้งเตือนไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

async function markAllRead() {
  try {
    saving.value = true;
    errorMessage.value = "";
    await api.post("/account/notifications/read-all");
    items.value = items.value.map((item) => ({ ...item, is_read: 1 }));
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "อ่านการแจ้งเตือนทั้งหมดไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

onMounted(loadItems);
</script>

<template>
  <AccountSectionLayout
    title="การแจ้งเตือน"
    description="ตอนใหม่จากนักเขียนที่คุณติดตามและกิจกรรมสำคัญของบัญชีจะอยู่ที่หน้านี้"
    :loading="loading"
    :error-message="errorMessage"
    :empty="!hasItems"
    empty-title="ยังไม่มีการแจ้งเตือน"
    empty-description="เมื่อคุณติดตามนักเขียนแล้วมีตอนใหม่ ระบบจะแจ้งไว้ที่หน้านี้"
    @back="router.push('/profile')"
  >
    <section class="toolbar">
      <strong>ยังไม่อ่าน {{ unreadCount }} รายการ</strong>
      <button type="button" :disabled="saving || unreadCount === 0" @click="markAllRead">
        อ่านทั้งหมดแล้ว
      </button>
    </section>

    <section class="notification-list">
      <article
        v-for="item in items"
        :key="item.id"
        class="notification-card"
        :class="{ unread: Number(item.is_read) !== 1 }"
      >
        <div class="notification-card__content">
          <strong>{{ item.title }}</strong>
          <p>{{ item.message }}</p>
          <small>{{ new Date(item.created_at).toLocaleString() }}</small>
        </div>
        <button type="button" :disabled="saving" @click="markAsRead(item)">
          {{ item.action_url ? "เปิด" : "ทำเครื่องหมายว่าอ่านแล้ว" }}
        </button>
      </article>
    </section>
  </AccountSectionLayout>
</template>

<style scoped>
.toolbar,
.notification-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 16px 18px;
}

.toolbar strong,
.notification-card strong {
  color: var(--text-strong);
}

.toolbar button,
.notification-card button {
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 14px;
}

.toolbar button:disabled,
.notification-card button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.notification-list {
  display: grid;
  gap: 14px;
}

.notification-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 18px;
}

.notification-card.unread {
  border-color: rgba(85, 198, 189, 0.44);
  background: rgba(85, 198, 189, 0.08);
}

.notification-card__content {
  display: grid;
  gap: 6px;
}

.notification-card p,
.notification-card small {
  margin: 0;
  color: var(--text-muted);
}

@media (max-width: 760px) {
  .toolbar,
  .notification-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
