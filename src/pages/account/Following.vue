<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";
import AccountSectionLayout from "../../components/account/AccountSectionLayout.vue";

type FollowItem = {
  id: number;
  target_type: string;
  target_id: number | null;
  target_name: string;
  created_at: string;
};

const router = useRouter();
const loading = ref(true);
const refreshing = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const items = ref<FollowItem[]>([]);
let refreshTimer: ReturnType<typeof window.setInterval> | undefined;
const FOLLOWING_CHANGED_EVENT = "read-and-voice-following-changed";

const hasItems = computed(() => items.value.length > 0);

function getTypeLabel(type: string) {
  if (type === "writer") return "นักเขียน";
  if (type === "book") return "หนังสือ";
  if (type === "category") return "หมวดหมู่";
  return type || "รายการ";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
}

function getFollowPath(item: FollowItem) {
  if (item.target_type === "writer" && item.target_id) {
    return `/writers/user-${item.target_id}`;
  }

  if (item.target_type === "book" && item.target_id) {
    return `/book/${item.target_id}`;
  }

  return "";
}

async function loadItems(options: { silent?: boolean } = {}) {
  try {
    if (options.silent) {
      refreshing.value = true;
    } else {
      loading.value = true;
    }

    errorMessage.value = "";
    const { data } = await api.get("/account/following");
    items.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error: any) {
    if (!options.silent) {
      errorMessage.value =
        error?.response?.data?.message || "โหลดรายการที่ติดตามไม่สำเร็จ";
    }
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function removeFollow(item: FollowItem) {
  const confirmed = window.confirm(`เลิกติดตาม "${item.target_name}" ใช่ไหม`);
  if (!confirmed) return;

  try {
    errorMessage.value = "";
    successMessage.value = "";
    await api.delete(`/account/following/${item.id}`);
    successMessage.value = "ลบรายการติดตามแล้ว";
    await loadItems({ silent: true });
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ลบรายการติดตามไม่สำเร็จ";
  }
}

function openFollow(item: FollowItem) {
  const path = getFollowPath(item);
  if (path) router.push(path);
}

function handleWindowFocus() {
  loadItems({ silent: true });
}

onMounted(() => {
  loadItems();
  refreshTimer = window.setInterval(() => loadItems({ silent: true }), 15000);
  window.addEventListener("focus", handleWindowFocus);
  window.addEventListener(FOLLOWING_CHANGED_EVENT, handleWindowFocus);
});

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
  window.removeEventListener("focus", handleWindowFocus);
  window.removeEventListener(FOLLOWING_CHANGED_EVENT, handleWindowFocus);
});
</script>

<template>
  <AccountSectionLayout
    title="รายการที่ติดตาม"
    description="รายการนี้มาจากปุ่มติดตามบนหน้าหนังสือและหน้านักเขียน ระบบจะอัปเดตให้เองเมื่อมีการเปลี่ยนแปลง"
    :loading="loading"
    :error-message="errorMessage"
    :empty="!hasItems"
    empty-title="ยังไม่มีรายการที่ติดตาม"
    empty-text="กดติดตามจากหน้าหนังสือหรือหน้านักเขียน แล้วรายการจะแสดงที่นี่"
    @back="router.push('/profile')"
  >
    <section class="follow-panel">
      <div class="panel-head">
        <p>{{ refreshing ? "กำลังอัปเดต..." : `${items.length} รายการ` }}</p>
        <button type="button" class="ghost" @click="loadItems({ silent: true })">
          รีเฟรช
        </button>
      </div>

      <p v-if="successMessage" class="feedback success">{{ successMessage }}</p>

      <section class="card-grid">
        <article v-for="item in items" :key="item.id" class="item-card">
          <button type="button" class="item-main" @click="openFollow(item)">
            <span class="pill">{{ getTypeLabel(item.target_type) }}</span>
            <strong>{{ item.target_name }}</strong>
            <small>ติดตามเมื่อ {{ formatDate(item.created_at) }}</small>
          </button>

          <button type="button" class="danger" @click="removeFollow(item)">
            เลิกติดตาม
          </button>
        </article>
      </section>
    </section>
  </AccountSectionLayout>
</template>

<style scoped>
.follow-panel,
.item-card {
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.follow-panel {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-head p,
.feedback {
  margin: 0;
}

.panel-head p,
small {
  color: var(--text-muted);
}

.feedback.success {
  color: #15803d;
  font-weight: 800;
}

.card-grid {
  display: grid;
  gap: 14px;
}

.item-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 16px;
}

.item-main {
  display: grid;
  gap: 8px;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.item-main strong {
  color: var(--text-strong);
  font-weight: 800;
}

.pill {
  width: fit-content;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: 13px;
  font-weight: 800;
  padding: 5px 10px;
}

button {
  min-height: 40px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  padding: 0 16px;
}

.ghost {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.danger {
  background: #fef2f2;
  color: #b91c1c;
}

@media (max-width: 760px) {
  .item-card {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}
</style>
