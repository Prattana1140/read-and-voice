<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";

type Book = {
  id: number;
  title: string;
  author?: string;
  description?: string;
  category_name?: string;
  access_type?: string;
  price?: number;
  created_at?: string;
};

const router = useRouter();
const books = ref<Book[]>([]);
const loading = ref(true);
const errorMessage = ref("");

async function loadBooks() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/writer/books/mine");
    books.value = Array.isArray(data) ? data : [];
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดหนังสือของคุณไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

function editBook(bookId: number) {
  router.push(`/writer/books/${bookId}/edit`);
}

function uploadBook() {
  router.push("/writer/upload");
}

onMounted(loadBooks);
</script>

<template>
  <main class="writer-page">
    <section class="panel">
      <div class="header-row">
        <div>
          <p class="eyebrow">สตูดิโอนักเขียน</p>
          <h1>หนังสือของฉัน</h1>
          <p class="muted">
            จัดการหนังสือที่คุณอัปโหลด แก้ไขข้อมูล และเตรียมเนื้อหาสำหรับผู้อ่าน
          </p>
        </div>

        <button type="button" @click="uploadBook">อัปโหลดหนังสือ</button>
      </div>

      <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
      <p v-if="loading" class="state">กำลังโหลดหนังสือ...</p>

      <div v-else-if="books.length === 0" class="empty">
        <h2>ยังไม่มีหนังสือ</h2>
        <p>เริ่มจากอัปโหลดไฟล์หนังสือเล่มแรกของคุณ</p>
        <button type="button" @click="uploadBook">อัปโหลดเลย</button>
      </div>

      <div v-else class="book-list">
        <article v-for="book in books" :key="book.id" class="book-item">
          <div>
            <h2>{{ book.title }}</h2>
            <p>
              <span v-if="book.author">{{ book.author }}</span>
              <span v-if="book.category_name"> / {{ book.category_name }}</span>
            </p>
            <p class="meta">
              {{ book.access_type || "free" }}
              <span v-if="Number(book.price || 0) > 0"> · {{ book.price }} คอยน์</span>
            </p>
          </div>

          <button type="button" @click="editBook(book.id)">แก้ไข</button>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.writer-page {
  max-width: 1040px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 48px;
}

.panel,
.book-item,
.empty {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.panel {
  padding: 28px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1,
h2 {
  color: var(--text-strong);
  margin: 0;
}

h1 {
  font-size: clamp(24px, 3.6vw, 34px);
}

.muted,
.state,
.empty p,
.book-item p {
  color: var(--text-muted);
}

.alert {
  border-radius: 8px;
  font-weight: 800;
  margin: 16px 0 0;
  padding: 12px 14px;
}

.error {
  background: #fef2f2;
  color: #dc2626;
}

.state {
  margin-top: 22px;
}

.empty {
  margin-top: 20px;
  padding: 24px;
}

.book-list {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.book-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
}

.book-item h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.meta {
  font-weight: 800;
}

button {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  background: #14b8a6;
  color: white;
  cursor: pointer;
  font-weight: 900;
  padding: 10px 14px;
}

@media (max-width: 640px) {
  .header-row,
  .book-item {
    align-items: stretch;
    flex-direction: column;
  }

  .panel {
    padding: 18px;
  }

  button {
    width: 100%;
  }
}
</style>
