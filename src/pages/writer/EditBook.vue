<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, API_BASE_URL } from "../../utils/api";

type Book = {
  id: number;
  title: string;
  author: string;
  description?: string;
  cover_image?: string;
  category_name?: string;
  created_by?: number;
  is_published?: number;
};

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref("");
const book = ref<Book | null>(null);

const bookId = computed(() => Number(route.params.id));

const getCoverUrl = (cover?: string) => {
  if (!cover) return "/no-cover.png";
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;
  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
};

const fetchBook = async () => {
  loading.value = true;
  error.value = "";

  try {
    const res = await api.get(`/api/books/${bookId.value}`);
    book.value = res.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || "โหลดข้อมูลหนังสือไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

onMounted(fetchBook);
</script>

<template>
  <main class="writer-edit-page">
    <section class="panel">
      <button class="back-btn" type="button" @click="router.push('/writer/books')">
        กลับไปหนังสือของฉัน
      </button>

      <p class="eyebrow">นักเขียน</p>
      <h1>แก้ไขข้อมูลหนังสือของตัวเอง</h1>

      <p v-if="loading" class="muted">กำลังโหลดข้อมูล...</p>
      <p v-else-if="error" class="error">{{ error }}</p>

      <div v-else-if="book" class="book-editor">
        <img :src="getCoverUrl(book.cover_image)" :alt="book.title" />
        <div class="book-fields">
          <label>
            ชื่อหนังสือ
            <input :value="book.title" readonly />
          </label>
          <label>
            ผู้เขียน
            <input :value="book.author" readonly />
          </label>
          <label>
            หมวดหมู่
            <input :value="book.category_name || '-'" readonly />
          </label>
          <label>
            คำอธิบาย
            <textarea :value="book.description || '-'" readonly rows="5" />
          </label>
        </div>
      </div>

      <p class="muted note">
        หน้านี้เตรียมปลายทางสำหรับแก้ไขหนังสือของนักเขียนแล้ว ส่วนการบันทึกข้อมูลควรต่อ backend endpoint ที่ตรวจว่าเป็นเจ้าของหนังสือจริงก่อนเปิดให้แก้ไข
      </p>
    </section>
  </main>
</template>

<style scoped>
.writer-edit-page {
  width: min(980px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 52px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
}

.back-btn {
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-strong);
  cursor: pointer;
  font-weight: 900;
  padding: 8px 12px;
}

.eyebrow {
  margin: 18px 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1 {
  margin: 0 0 18px;
  color: var(--text-strong);
}

.muted,
.note {
  color: var(--text-muted);
}

.error {
  color: var(--danger);
  font-weight: 900;
}

.book-editor {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 20px;
}

.book-editor img {
  width: 180px;
  height: 250px;
  border-radius: 8px;
  object-fit: cover;
  background: var(--surface-soft);
}

.book-fields {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  color: var(--text-strong);
  font-weight: 900;
}

input,
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-strong);
  font: inherit;
  padding: 10px 12px;
}

.note {
  margin: 18px 0 0;
  line-height: 1.7;
}

@media (max-width: 720px) {
  .book-editor {
    grid-template-columns: 1fr;
  }

  .book-editor img {
    width: 140px;
    height: 200px;
  }
}
</style>
