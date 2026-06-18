<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api, API_BASE_URL } from "../utils/api";
import { getAuthHeaders } from "../utils/auth";

type LibraryBook = {
  library_id: number;
  id: number;
  title: string;
  author: string;
  description?: string;
  cover_image?: string;
  total_pages?: number;
  category_name?: string;
};

const router = useRouter();
const loading = ref(true);
const error = ref("");
const books = ref<LibraryBook[]>([]);
const search = ref("");

const filteredBooks = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return books.value;

  return books.value.filter((book) => {
    return (
      book.title.toLowerCase().includes(keyword) ||
      book.author.toLowerCase().includes(keyword) ||
      (book.category_name || "").toLowerCase().includes(keyword)
    );
  });
});

const getCoverUrl = (cover?: string) => {
  if (!cover) return "/no-cover.png";
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;
  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
};

const fetchLibrary = async () => {
  loading.value = true;
  error.value = "";

  try {
    const res = await api.get("/api/library/me", {
      headers: getAuthHeaders(),
    });
    books.value = Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    error.value =
      err.response?.data?.message || "โหลดชั้นหนังสือของฉันไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

const removeFromLibrary = async (bookId: number) => {
  const confirmed = window.confirm("ต้องการลบหนังสือออกจากชั้นใช่ไหม?");
  if (!confirmed) return;

  try {
    await api.delete(`/api/library/${bookId}`, {
      headers: getAuthHeaders(),
    });
    books.value = books.value.filter((book) => book.id !== bookId);
  } catch (err: any) {
    alert(err.response?.data?.message || "ลบหนังสือไม่สำเร็จ");
  }
};

onMounted(fetchLibrary);
</script>

<template>
  <main class="library-page">
    <section class="page-head">
      <div>
        <p class="eyebrow">My Library</p>
        <h1>ชั้นหนังสือของฉัน</h1>
        <p>กลับมาอ่านหรือฟังหนังสือที่คุณเก็บไว้ได้จากหน้านี้</p>
      </div>

      <button class="primary-btn" type="button" @click="router.push('/store')">
        ไปที่ร้านหนังสือ
      </button>
    </section>

    <section class="toolbar">
      <input
        v-model="search"
        type="search"
        placeholder="ค้นหาในชั้นหนังสือ"
      />
      <span>{{ filteredBooks.length }} รายการ</span>
    </section>

    <section v-if="loading" class="state-card">กำลังโหลดชั้นหนังสือ...</section>
    <section v-else-if="error" class="state-card error">{{ error }}</section>
    <section v-else-if="filteredBooks.length === 0" class="state-card">
      ยังไม่มีหนังสือในชั้น ลองเพิ่มหนังสือจากร้านหนังสือก่อนค่ะ
    </section>

    <section v-else class="book-grid">
      <article v-for="book in filteredBooks" :key="book.library_id" class="book-card">
        <img :src="getCoverUrl(book.cover_image)" :alt="book.title" />
        <div class="book-info">
          <span>{{ book.category_name || "หนังสือ" }}</span>
          <h2>{{ book.title }}</h2>
          <p>{{ book.author }}</p>
          <div class="actions">
            <button type="button" @click="router.push(`/reader/${book.id}`)">
              อ่านต่อ
            </button>
            <button class="ghost" type="button" @click="removeFromLibrary(book.id)">
              ลบออก
            </button>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.library-page {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 52px;
}

.page-head,
.toolbar,
.state-card,
.book-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1,
h2 {
  margin: 0;
  color: var(--text-strong);
}

.page-head p:not(.eyebrow),
.toolbar span,
.book-card p,
.book-card span {
  color: var(--text-muted);
}

.primary-btn,
.actions button {
  min-height: 40px;
  border: 1px solid #2ec4b6;
  border-radius: 8px;
  background: #2ec4b6;
  color: white;
  cursor: pointer;
  font-weight: 900;
  padding: 10px 14px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 14px;
}

.toolbar input {
  flex: 1;
  min-width: 0;
  min-height: 42px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-strong);
  outline: none;
  padding: 0 14px;
}

.state-card {
  margin-top: 18px;
  padding: 24px;
  color: var(--text-muted);
}

.state-card.error {
  color: var(--danger);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.book-card {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
}

.book-card img {
  width: 92px;
  height: 124px;
  border-radius: 8px;
  object-fit: cover;
  background: var(--surface-soft);
}

.book-info {
  min-width: 0;
}

.book-card h2 {
  margin-top: 6px;
  font-size: 18px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.actions .ghost {
  background: var(--surface-soft);
  color: var(--text-strong);
  border-color: var(--border);
}

@media (max-width: 680px) {
  .library-page {
    width: min(1180px, calc(100% - 40px));
    padding-top: 24px;
  }

  .page-head,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .primary-btn {
    width: 100%;
  }
}

@media (max-width: 420px) {
  .book-grid {
    grid-template-columns: 1fr;
  }

  .book-card {
    grid-template-columns: 68px minmax(0, 1fr);
    gap: 10px;
    padding: 10px;
  }

  .book-card img {
    width: 68px;
    height: 94px;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
