<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
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
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const items = ref<FollowItem[]>([]);

const form = reactive({
  target_type: "book",
  target_name: "",
});

const hasItems = computed(() => items.value.length > 0);

async function loadItems() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/account/following");
    items.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดรายการที่ติดตามไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function addFollow() {
  try {
    saving.value = true;
    errorMessage.value = "";
    successMessage.value = "";
    await api.post("/account/following", {
      target_type: form.target_type,
      target_name: form.target_name.trim(),
    });
    form.target_name = "";
    successMessage.value = "เพิ่มรายการติดตามแล้ว";
    await loadItems();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เพิ่มรายการติดตามไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

async function removeFollow(id: number) {
  try {
    errorMessage.value = "";
    successMessage.value = "";
    await api.delete(`/account/following/${id}`);
    successMessage.value = "ลบรายการติดตามแล้ว";
    await loadItems();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ลบรายการติดตามไม่สำเร็จ";
  }
}

onMounted(loadItems);
</script>

<template>
  <AccountSectionLayout
    title="รายการที่ติดตาม"
    description="ติดตามหนังสือ ผู้เขียน หรือหมวดหมู่ที่สนใจเพื่อกลับมาดูอัปเดตได้เร็วขึ้น"
    :loading="loading"
    :error-message="errorMessage"
    :empty="!hasItems"
    empty-title="ยังไม่มีรายการที่ติดตาม"
    empty-text="เพิ่มรายการแรกของคุณจากฟอร์มด้านล่างได้เลย"
    @back="router.push('/profile')"
  >
    <section class="panel form-panel">
      <form class="follow-form" @submit.prevent="addFollow">
        <label>
          <span>ประเภท</span>
          <select v-model="form.target_type">
            <option value="book">หนังสือ</option>
            <option value="author">ผู้เขียน</option>
            <option value="category">หมวดหมู่</option>
          </select>
        </label>

        <label class="stretch">
          <span>ชื่อรายการ</span>
          <input v-model="form.target_name" type="text" required placeholder="เช่น นิยายแฟนตาซี" />
        </label>

        <button type="submit" :disabled="saving">
          {{ saving ? "กำลังบันทึก..." : "เพิ่มรายการติดตาม" }}
        </button>
      </form>

      <p v-if="successMessage" class="feedback success">{{ successMessage }}</p>
    </section>

    <section class="card-grid">
      <article v-for="item in items" :key="item.id" class="item-card">
        <div>
          <span class="pill">{{ item.target_type }}</span>
          <strong>{{ item.target_name }}</strong>
          <small>ติดตามเมื่อ {{ new Date(item.created_at).toLocaleString() }}</small>
        </div>

        <button type="button" class="ghost danger" @click="removeFollow(item.id)">เลิกติดตาม</button>
      </article>
    </section>
  </AccountSectionLayout>
</template>

<style scoped>
.panel,
.item-card {
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.form-panel {
  padding: 18px;
}

.follow-form {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

label {
  display: grid;
  gap: 8px;
}

.stretch {
  min-width: 0;
}

label span,
.item-card strong {
  color: var(--text-strong);
  font-weight: 900;
}

input,
select,
button {
  min-height: 46px;
  border-radius: 12px;
  font: inherit;
}

input,
select {
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 0 14px;
}

button {
  border: 0;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
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

.feedback {
  margin: 12px 0 0;
  font-weight: 800;
}

.feedback.success {
  color: #15803d;
}

.card-grid {
  display: grid;
  gap: 14px;
}

.item-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 18px;
}

.item-card > div {
  display: grid;
  gap: 8px;
}

.pill {
  width: fit-content;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
  padding: 6px 10px;
  text-transform: uppercase;
}

small {
  color: var(--text-muted);
}

@media (max-width: 760px) {
  .follow-form,
  .item-card {
    grid-template-columns: 1fr;
  }

  .item-card {
    align-items: stretch;
  }
}
</style>
