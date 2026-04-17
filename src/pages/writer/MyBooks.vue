<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import axios from "axios";

type Book = {
  id: number;
  title: string;
  author: string;
  category_name?: string;
  created_by?: number;
};

const books = ref<Book[]>([]);
const loading = ref(true);

const user = computed(() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
});

const myBooks = computed(() => {
  const userId = Number(user.value?.id || 0);
  return books.value.filter((book) => !book.created_by || Number(book.created_by) === userId);
});

onMounted(async () => {
  try {
    const res = await axios.get("http://localhost:3000/api/books");
    books.value = Array.isArray(res.data) ? res.data : [];
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="writer-page">
    <section class="panel">
      <p class="eyebrow">นักเขียน</p>
      <h1>จัดการหนังสือของตัวเอง</h1>
      <p class="muted">รายการนี้แสดงหนังสือที่ผูกกับผู้เขียน หากข้อมูลเดิมยังไม่มี created_by ระบบจะแสดงไว้ให้ตรวจสอบก่อน</p>

      <p v-if="loading" class="muted">กำลังโหลด...</p>
      <div v-else class="book-list">
        <article v-for="book in myBooks" :key="book.id" class="book-item">
          <div>
            <h2>{{ book.title }}</h2>
            <p>{{ book.author }} <span v-if="book.category_name">/ {{ book.category_name }}</span></p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.writer-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.panel,
.book-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.panel {
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1,
h2 {
  color: var(--text-strong);
}

.muted,
.book-item p {
  color: var(--text-muted);
}

.book-list {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.book-item {
  padding: 16px;
}

.book-item h2 {
  margin: 0 0 6px;
  font-size: 18px;
}
</style>
