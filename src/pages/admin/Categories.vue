<script setup lang="ts">
import { onMounted, ref } from "vue";
import axios from "axios";

type Category = {
  id: number;
  name: string;
};

const categories = ref<Category[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await axios.get("http://localhost:3000/api/categories");
    categories.value = Array.isArray(res.data) ? res.data : [];
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="admin-page">
    <section class="panel">
      <p class="eyebrow">Admin</p>
      <h1>จัดการหมวดหมู่</h1>
      <p class="muted">ตอนนี้ backend รองรับการดึงหมวดหมู่แล้ว หน้านี้เตรียมพื้นที่สำหรับต่อยอดเพิ่ม/แก้/ลบหมวดหมู่</p>

      <p v-if="loading" class="muted">กำลังโหลด...</p>
      <div v-else class="category-list">
        <article v-for="category in categories" :key="category.id">
          <strong>{{ category.name }}</strong>
          <span>#{{ category.id }}</span>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1 {
  color: var(--text-strong);
}

.muted,
span {
  color: var(--text-muted);
}

.category-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

article {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 16px;
}

strong,
span {
  display: block;
}

strong {
  color: var(--text-strong);
}
</style>
