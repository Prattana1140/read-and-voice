<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api, API_BASE_URL } from "../utils/api";
import { getAuthHeaders } from "../utils/auth";
import { useI18n } from "../utils/i18n";
import { localizedTitle } from "../utils/localizedContent";

type LibraryBook = {
  library_id: number | null;
  id: number;
  title: string;
  title_th?: string;
  title_en?: string;
  author: string;
  description?: string;
  cover_image?: string;
  total_pages?: number;
  category_name?: string;
};

const router = useRouter();
const { locale } = useI18n();
const loading = ref(true);
const error = ref("");
const books = ref<LibraryBook[]>([]);
const search = ref("");
const pendingRemoveBook = ref<LibraryBook | null>(null);
const removingBook = ref(false);

const filteredBooks = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return books.value;

  return books.value.filter((book) => {
    return (
      (book.title || "").toLowerCase().includes(keyword) ||
      getBookTitle(book).toLowerCase().includes(keyword) ||
      book.author.toLowerCase().includes(keyword) ||
      (book.category_name || "").toLowerCase().includes(keyword)
    );
  });
});

const getBookTitle = (book: LibraryBook | null | undefined) =>
  localizedTitle(book, locale.value) || book?.title || "";

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

const requestRemoveFromLibrary = (book: LibraryBook) => {
  pendingRemoveBook.value = book;
};

const cancelRemoveFromLibrary = () => {
  if (removingBook.value) return;
  pendingRemoveBook.value = null;
};

const confirmRemoveFromLibrary = async () => {
  const book = pendingRemoveBook.value;
  if (!book || removingBook.value) return;

  try {
    removingBook.value = true;
    await api.delete(`/api/library/${book.id}`, {
      headers: getAuthHeaders(),
    });
    books.value = books.value.filter(
      (item) => String(item.id) !== String(book.id),
    );
    pendingRemoveBook.value = null;
  } catch (err: any) {
    alert(err.response?.data?.message || "ลบหนังสือไม่สำเร็จ");
  } finally {
    removingBook.value = false;
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
      <article v-for="book in filteredBooks" :key="book.library_id || `book-${book.id}`" class="book-card">
        <img :src="getCoverUrl(book.cover_image)" :alt="getBookTitle(book)" />
        <div class="book-info">
          <span>{{ book.category_name || "หนังสือ" }}</span>
          <h2>{{ getBookTitle(book) }}</h2>
          <p>{{ book.author }}</p>
          <div class="actions">
            <button type="button" @click="router.push(`/reader/${book.id}`)">
              อ่านต่อ
            </button>
            <button class="ghost" type="button" @click="requestRemoveFromLibrary(book)">
              ลบออก
            </button>
          </div>
        </div>
      </article>
    </section>

    <div
      v-if="pendingRemoveBook"
      class="confirm-backdrop"
      role="presentation"
      @click.self="cancelRemoveFromLibrary"
    >
      <section
        class="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-library-title"
        aria-describedby="remove-library-message"
        tabindex="-1"
        @keydown.esc="cancelRemoveFromLibrary"
      >
        <h2 id="remove-library-title">ลบออกจากชั้นหนังสือ</h2>
        <p id="remove-library-message">
          ต้องการลบ "{{ getBookTitle(pendingRemoveBook) }}" ออกจากชั้นใช่ไหม?
        </p>

        <div class="confirm-actions">
          <button
            class="confirm-primary"
            type="button"
            :disabled="removingBook"
            @click="confirmRemoveFromLibrary"
          >
            {{ removingBook ? "กำลังลบ..." : "ตกลง" }}
          </button>
          <button
            class="confirm-secondary"
            type="button"
            :disabled="removingBook"
            @click="cancelRemoveFromLibrary"
          >
            ยกเลิก
          </button>
        </div>
      </section>
    </div>
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
  font-size: 20px;
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

.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 6000;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.42);
  padding: 20px;
}

.confirm-dialog {
  width: min(520px, 100%);
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.24);
  color: var(--text);
  padding: 26px;
}

.confirm-dialog h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 26px;
}

.confirm-dialog p {
  margin: 12px 0 0;
  color: var(--text);
  line-height: 1.7;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.confirm-primary,
.confirm-secondary {
  min-height: 44px;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
  padding: 0 24px;
}

.confirm-primary {
  background: var(--primary);
  color: var(--on-primary, #ffffff);
}

.confirm-secondary {
  background: var(--surface-soft);
  color: var(--primary-strong);
}

.confirm-primary:disabled,
.confirm-secondary:disabled {
  cursor: wait;
  opacity: 0.72;
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

  .confirm-dialog {
    padding: 22px;
  }

  .confirm-actions {
    display: grid;
    grid-template-columns: 1fr;
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
