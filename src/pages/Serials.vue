<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";
import { filterBooks, uniqueBookCategories } from "../utils/bookSearch";

type SerialBook = {
  id: number;
  title: string;
  author?: string;
  cover_url?: string;
  cover_image?: string;
  description?: string;
  category_name?: string;
  access_type?: "free" | "paid" | "subscription";
  price?: number;
  episode_count?: number;
  read_count?: number;
  review_count?: number;
  average_rating?: number;
};

type ShelfResponse = {
  books: SerialBook[];
  count?: number;
};

const route = useRoute();
const router = useRouter();
const books = ref<SerialBook[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const search = ref(String(route.query.q || ""));
const accessFilter = ref("all");
const categoryFilter = ref("all");

const featuredBook = computed(() => filteredBooks.value[0] || books.value[0] || null);

const filteredBooks = computed(() => {
  return filterBooks(books.value, search.value, {
    contentType: "serial",
    accessType: accessFilter.value,
    category: categoryFilter.value,
  }) as SerialBook[];
});
const categoryOptions = computed(() => uniqueBookCategories(books.value));

const getBookCover = (book: SerialBook) => {
  return resolveAssetUrl(book.cover_url || book.cover_image);
};

const getAccessLabel = (book: SerialBook) => {
  if (book.access_type === "subscription") return "อ่านด้วยแพ็กเกจ";
  if (book.access_type === "paid") return `${Math.ceil(Number(book.price || 0)).toLocaleString()} คอยน์`;
  return "อ่านฟรี";
};

const goToBook = (id: number) => {
  router.push({ name: "BookDetail", params: { id } });
};

async function loadSerialBooks() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get<ShelfResponse>("/serials");
    books.value = Array.isArray(data?.books) ? data.books : [];
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดรายการหนังสือรายตอนไม่สำเร็จ";
    books.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.query.q,
  (keyword) => {
    search.value = String(keyword || "");
  },
);

onMounted(loadSerialBooks);
</script>

<template>
  <main class="serial-page">
    <section class="serial-hero">
      <div class="hero-copy">
        <p>Read and Voice รายตอน</p>
        <h1>หนังสือระบบรายตอน</h1>
        <span>รวมเรื่องที่ผู้เขียนเผยแพร่เป็นตอน เลือกเรื่องแล้วเข้าไปดูรายการตอนทั้งหมดได้ทันที</span>
      </div>

      <article v-if="featuredBook" class="featured-card" @click="goToBook(featuredBook.id)">
        <img :src="getBookCover(featuredBook)" :alt="featuredBook.title" />
        <div>
          <small>เรื่องเด่น</small>
          <strong>{{ featuredBook.title }}</strong>
          <span>{{ featuredBook.episode_count || 0 }} ตอน | {{ getAccessLabel(featuredBook) }}</span>
        </div>
      </article>
    </section>

    <section class="serial-toolbar">
      <div>
        <h2>รายการหนังสือรายตอน</h2>
        <p>{{ filteredBooks.length }} เรื่อง</p>
      </div>
      <input
        v-model="search"
        type="search"
        placeholder="ค้นหาชื่อเรื่อง ผู้เขียน หรือหมวดหมู่"
        aria-label="ค้นหาหนังสือรายตอน"
      />
      <div class="filter-row">
        <select v-model="accessFilter" aria-label="กรองตามสิทธิ์อ่าน">
          <option value="all">ทุกสิทธิ์อ่าน</option>
          <option value="free">อ่านฟรี</option>
          <option value="paid">ใช้คอยน์</option>
          <option value="subscription">แพ็กเกจ</option>
        </select>
        <select v-model="categoryFilter" aria-label="กรองตามหมวดหมู่">
          <option value="all">ทุกหมวดหมู่</option>
          <option v-for="category in categoryOptions" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </div>
    </section>

    <div v-if="loading" class="state-box">กำลังโหลดรายการรายตอน...</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
    <div v-else-if="filteredBooks.length === 0" class="state-box">
      ยังไม่มีหนังสือรายตอนในระบบ
    </div>

    <section v-else class="serial-grid" aria-label="รายการหนังสือรายตอน">
      <article
        v-for="book in filteredBooks"
        :key="book.id"
        class="serial-card"
        role="button"
        tabindex="0"
        :aria-label="`เปิดรายการตอนของ ${book.title}`"
        @click="goToBook(book.id)"
        @keydown.enter.prevent="goToBook(book.id)"
        @keydown.space.prevent="goToBook(book.id)"
      >
        <img :src="getBookCover(book)" :alt="book.title" />
        <div class="serial-card-copy">
          <div class="serial-card-meta">
            <span>{{ book.category_name || "รายตอน" }}</span>
            <span>{{ book.episode_count || 0 }} ตอน</span>
          </div>
          <h3>{{ book.title }}</h3>
          <p>{{ book.author || "ไม่ระบุผู้เขียน" }}</p>
          <small>{{ book.description || "เข้าไปดูรายละเอียดและรายการตอนทั้งหมดของเรื่องนี้" }}</small>
          <div class="serial-card-footer">
            <strong>{{ getAccessLabel(book) }}</strong>
            <button type="button" @click.stop="goToBook(book.id)">ดูรายการตอน</button>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.serial-page {
  width: min(100% - calc(var(--page-gutter, 18px) * 2), 1120px);
  min-height: 100%;
  margin: 0 auto;
  padding: var(--page-block, 28px) 0 56px;
  color: var(--text-strong);
}

.serial-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
  gap: 22px;
  align-items: stretch;
  border-radius: 0;
  background: #111827;
  color: #ffffff;
  padding: 28px;
}

.hero-copy {
  display: grid;
  align-content: center;
  gap: 10px;
}

.hero-copy p,
.hero-copy h1,
.hero-copy span {
  margin: 0;
}

.hero-copy p {
  color: #5eead4;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0;
}

.hero-copy h1 {
  font-size: clamp(28px, 4vw, 44px);
  letter-spacing: 0;
}

.hero-copy span {
  max-width: 620px;
  color: #d1d5db;
  line-height: 1.8;
}

.featured-card {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  padding: 14px;
}

.featured-card img {
  width: 96px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  background: #e5e7eb;
}

.featured-card div {
  min-width: 0;
}

.featured-card small,
.featured-card span {
  display: block;
  color: #cbd5e1;
  font-weight: 800;
}

.featured-card strong {
  display: block;
  margin: 6px 0;
  overflow-wrap: anywhere;
  font-size: 20px;
}

.serial-toolbar {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  margin: 30px 0 18px;
}

.serial-toolbar h2,
.serial-toolbar p {
  margin: 0;
}

.serial-toolbar p {
  color: var(--text-muted);
  font-weight: 800;
}

.serial-toolbar input {
  width: min(100%, 360px);
  min-height: 44px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-strong);
  padding: 0 14px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.filter-row select {
  min-height: 42px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-strong);
  font-weight: 800;
  padding: 0 12px;
}

.state-box {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  padding: 22px;
  text-align: center;
}

.state-box.error {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #be123c;
}

.serial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.serial-card {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  min-width: 0;
  padding: 14px;
  transition:
    border-color 0.18s ease,
    transform 0.18s ease;
}

.serial-card:hover,
.serial-card:focus-visible {
  border-color: #20c7b4;
  transform: translateY(-2px);
}

.serial-card img {
  width: 92px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  background: #e5e7eb;
}

.serial-card-copy {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.serial-card-meta,
.serial-card-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.serial-card-meta span {
  color: #0f766e;
  font-size: 12px;
  font-weight: 900;
}

.serial-card h3,
.serial-card p,
.serial-card small {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.serial-card h3 {
  color: var(--text-strong);
  font-size: 17px;
}

.serial-card p,
.serial-card small {
  color: var(--text-muted);
}

.serial-card small {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.55;
}

.serial-card-footer {
  margin-top: 4px;
}

.serial-card-footer strong {
  color: #0f766e;
  font-size: 13px;
}

.serial-card-footer button {
  border: 0;
  background: #55c6bd;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  min-height: 34px;
  padding: 0 12px;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .serial-hero,
  .serial-toolbar {
    grid-template-columns: 1fr;
  }

  .serial-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .serial-toolbar input {
    width: 100%;
  }

  .filter-row {
    justify-content: stretch;
  }

  .filter-row select {
    flex: 1 1 150px;
  }
}

@media (max-width: 420px) {
  .serial-hero {
    padding: 20px;
  }

  .featured-card,
  .serial-card {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .featured-card img,
  .serial-card img {
    width: 72px;
  }

  .serial-card-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
