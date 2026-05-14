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
  price?: number | string;
  coin_price?: number | string;
  episode_count?: number;
  read_count?: number;
  view_count?: number;
  review_count?: number;
  favorite_count?: number;
  like_count?: number;
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
const activeTab = ref(String(route.query.tab || "hot"));
const currentPage = ref(1);
const pageSize = 8;

const filteredBooks = computed(() => {
  return filterBooks(books.value, search.value, {
    contentType: "serial",
    accessType: accessFilter.value,
    category: categoryFilter.value,
  }) as SerialBook[];
});

const categoryOptions = computed(() => uniqueBookCategories(books.value));

const tabItems = [
  { key: "love", label: "นิยายรัก" },
  { key: "hot", label: "ใหม่มาแรง" },
  { key: "popular", label: "เรื่องฮิต" },
  { key: "sold", label: "ขายดี" },
  { key: "new", label: "มาใหม่" },
  { key: "updated", label: "อัปเดต" },
  { key: "ending", label: "จบล่าสุด" },
  { key: "favorite", label: "ท็อปชาร์ต" },
];

const sortedBooks = computed(() => {
  const list = [...filteredBooks.value];

  if (activeTab.value === "new" || activeTab.value === "updated") {
    return list.reverse();
  }

  if (activeTab.value === "sold" || activeTab.value === "favorite") {
    return list.sort((a, b) => getLikeCount(b) - getLikeCount(a));
  }

  return list.sort((a, b) => getReadCount(b) - getReadCount(a));
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(sortedBooks.value.length / pageSize)),
);

const pagedBooks = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return sortedBooks.value.slice(start, start + pageSize);
});

const activeTabLabel = computed(
  () => tabItems.find((item) => item.key === activeTab.value)?.label || "นิยายรัก",
);

function getBookCover(book: SerialBook) {
  return resolveAssetUrl(book.cover_url || book.cover_image);
}

function getEpisodeCount(book: SerialBook) {
  return Number(book.episode_count || 0);
}

function getReadCount(book: SerialBook) {
  return Number(book.read_count || book.view_count || 0);
}

function getLikeCount(book: SerialBook) {
  return Number(book.favorite_count || book.like_count || book.review_count || 0);
}

function getPrice(book: SerialBook) {
  return Number(book.coin_price ?? book.price ?? 0);
}

function formatCompactCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return value.toLocaleString("th-TH");
}

function getAccessLabel(book: SerialBook) {
  if (book.access_type === "subscription") return "แพ็กเกจ";
  const price = getPrice(book);
  if (book.access_type === "paid" || price > 0) {
    return `${Math.ceil(price).toLocaleString("th-TH")} คอยน์`;
  }
  return "ฟรี";
}

function handleImgError(event: Event) {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
}

function goToBook(id: number) {
  router.push({ name: "BookDetail", params: { id } });
}

function selectTab(tab: string) {
  activeTab.value = tab;
  currentPage.value = 1;
}

function setPage(nextPage: number) {
  currentPage.value = Math.min(totalPages.value, Math.max(1, nextPage));
}

async function loadSerialBooks() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get<ShelfResponse>("/serials");
    books.value = Array.isArray(data?.books) ? data.books : [];
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดรายการรายตอนไม่สำเร็จ";
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

watch([search, accessFilter, categoryFilter, activeTab], () => {
  currentPage.value = 1;
});

onMounted(loadSerialBooks);
</script>

<template>
  <main class="serial-page">
    <header class="serial-title">
      <h1>นิยายรัก</h1>
    </header>

    <section class="serial-tabs" aria-label="หมวดนิยายรายตอน">
      <button
        v-for="tab in tabItems"
        :key="tab.key"
        type="button"
        :class="{ active: activeTab === tab.key }"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </section>

    <section class="serial-filter-bar" aria-label="ตัวกรองนิยายรายตอน">
      <select v-model="categoryFilter">
        <option value="all">หมวดรอง</option>
        <option v-for="category in categoryOptions" :key="category" :value="category">
          {{ category }}
        </option>
      </select>
      <button type="button" @click="accessFilter = accessFilter === 'free' ? 'all' : 'free'">
        {{ accessFilter === "free" ? "ฟรีเท่านั้น" : "แท็ก" }}
      </button>
      <button
        type="button"
        @click="search = ''; accessFilter = 'all'; categoryFilter = 'all'"
      >
        จบแล้ว
      </button>
    </section>

    <div v-if="loading" class="state-box">กำลังโหลดรายการรายตอน...</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
    <div v-else-if="filteredBooks.length === 0" class="state-box">
      ยังไม่มีนิยายรายตอนที่ตรงกับเงื่อนไขนี้
    </div>

    <template v-else>
      <section class="serial-list-head">
        <h2>{{ activeTabLabel }}</h2>
        <div class="pager">
          <button type="button" :disabled="currentPage <= 1" @click="setPage(currentPage - 1)">
            ‹
          </button>
          <span>หน้าที่ {{ currentPage }}</span>
          <button type="button" :disabled="currentPage >= totalPages" @click="setPage(currentPage + 1)">
            ›
          </button>
        </div>
      </section>

      <section class="serial-list" aria-label="รายการนิยายรายตอน">
        <article
          v-for="book in pagedBooks"
          :key="book.id"
          class="serial-list-card"
          role="button"
          tabindex="0"
          @click="goToBook(book.id)"
          @keydown.enter.prevent="goToBook(book.id)"
          @keydown.space.prevent="goToBook(book.id)"
        >
          <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
          <div class="serial-card-copy">
            <h3>{{ book.title }}</h3>
            <p>{{ book.author || "ไม่ระบุผู้เขียน" }}</p>
            <div class="serial-meta">
              <span>☷ {{ getEpisodeCount(book) }}</span>
              <span>◉ {{ formatCompactCount(getReadCount(book)) }}</span>
              <span>♥ {{ formatCompactCount(getLikeCount(book)) }}</span>
            </div>
            <div class="tag-row">
              <span>{{ book.category_name || "โรแมนติก" }}</span>
              <span>{{ getAccessLabel(book) }}</span>
              <span v-if="book.access_type === 'free'">ฟรี</span>
            </div>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.serial-page {
  width: min(100% - 28px, 1000px);
  min-height: 100%;
  margin: 0 auto;
  padding: 30px 0 64px;
  background: var(--bg);
  color: var(--text-strong);
}

.serial-title {
  text-align: center;
  padding: 0 0 48px;
}

.serial-title h1 {
  margin: 0;
  color: #000000;
  font-size: 30px;
  font-weight: 900;
}

.serial-tabs {
  display: flex;
  gap: 28px;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
  scrollbar-width: none;
}

.serial-tabs::-webkit-scrollbar {
  display: none;
}

.serial-tabs button {
  position: relative;
  flex: 0 0 auto;
  min-height: 42px;
  border: 0;
  background: transparent;
  color: #000000;
  cursor: pointer;
  font-size: 19px;
  font-weight: 900;
  padding: 0;
}

.serial-tabs button.active {
  color: #00bfae;
}

.serial-tabs button.active::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 3px;
  border-radius: 999px;
  background: #00d3bf;
}

.serial-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 0 54px;
}

.serial-filter-bar select,
.serial-filter-bar button {
  min-height: 36px;
  border: 0;
  border-radius: 999px;
  background: #eeeeee;
  color: #111827;
  cursor: pointer;
  font: inherit;
  padding: 0 14px;
}

.serial-list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.serial-list-head h2 {
  margin: 0;
  color: #000000;
  font-size: 30px;
  font-weight: 900;
}

.pager {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #8b8f96;
  font-weight: 800;
}

.pager button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #b7bcc4;
  border-radius: 3px;
  background: #ffffff;
  color: #00a99d;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.pager button:disabled {
  color: #aeb4bd;
  cursor: not-allowed;
  opacity: 0.72;
}

.serial-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 58px;
  row-gap: 30px;
  padding-top: 20px;
}

.serial-list-card {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  cursor: pointer;
}

.serial-list-card img {
  width: 140px;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  background: var(--surface-soft);
  object-fit: cover;
}

.serial-card-copy {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
}

.serial-card-copy h3 {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #000000;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.serial-card-copy p {
  margin: 0;
  color: #8b8f96;
  font-size: 14px;
  font-weight: 800;
}

.serial-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #8b8f96;
  font-size: 14px;
  font-weight: 800;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.tag-row span {
  border: 1px solid #e0e2e6;
  border-radius: 999px;
  color: #8b8f96;
  font-size: 13px;
  line-height: 1;
  padding: 8px 14px;
}

.state-box {
  margin: 20px auto;
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

@media (max-width: 860px) {
  .serial-title {
    padding-bottom: 28px;
  }

  .serial-tabs {
    gap: 20px;
  }

  .serial-list {
    grid-template-columns: 1fr;
    row-gap: 22px;
  }
}

@media (max-width: 520px) {
  .serial-page {
    width: min(100% - 20px, 1000px);
    padding-top: 22px;
  }

  .serial-tabs button {
    font-size: 16px;
  }

  .serial-filter-bar {
    padding-bottom: 34px;
  }

  .serial-list-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .serial-list-card {
    grid-template-columns: 112px minmax(0, 1fr);
  }

  .serial-list-card img {
    width: 112px;
  }
}
</style>
