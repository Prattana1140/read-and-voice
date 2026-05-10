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
  average_rating?: number;
};

type ShelfResponse = {
  books: SerialBook[];
  count?: number;
};

type SerialSection = {
  title: string;
  books: SerialBook[];
};

const route = useRoute();
const router = useRouter();

const books = ref<SerialBook[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const search = ref(String(route.query.q || ""));
const accessFilter = ref("all");
const categoryFilter = ref("all");

const filteredBooks = computed(() => {
  return filterBooks(books.value, search.value, {
    contentType: "serial",
    accessType: accessFilter.value,
    category: categoryFilter.value,
  }) as SerialBook[];
});

const categoryOptions = computed(() => uniqueBookCategories(books.value));

const heroBooks = computed(() => filteredBooks.value.slice(0, 5));

const continueBooks = computed(() => {
  return [...filteredBooks.value]
    .sort((a, b) => {
      const readDiff = getReadCount(b) - getReadCount(a);
      if (readDiff !== 0) return readDiff;
      return getEpisodeCount(b) - getEpisodeCount(a);
    })
    .slice(0, 6);
});

const categorySections = computed<SerialSection[]>(() => {
  const groups = new Map<string, SerialBook[]>();

  for (const book of filteredBooks.value) {
    const category = book.category_name || "นิยายรายตอน";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)?.push(book);
  }

  return [...groups.entries()].map(([title, items]) => ({
    title,
    books: items.slice(0, 8),
  }));
});

function getBookCover(book: SerialBook) {
  return resolveAssetUrl(book.cover_url || book.cover_image);
}

function getEpisodeCount(book: SerialBook) {
  return Number(book.episode_count || 0);
}

function getReadCount(book: SerialBook) {
  return Number(book.read_count || book.view_count || 0);
}

function getPrice(book: SerialBook) {
  return Number(book.coin_price ?? book.price ?? 0);
}

function formatCompactCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return value.toLocaleString("th-TH");
}

function getAccessLabel(book: SerialBook) {
  if (book.access_type === "subscription") return "แพ็กเกจ";
  const price = getPrice(book);
  if (book.access_type === "paid" || price > 0) return `${Math.ceil(price).toLocaleString("th-TH")} คอยน์`;
  return "ฟรี";
}

function getBookMeta(book: SerialBook) {
  return `${getEpisodeCount(book)} ตอน • ${formatCompactCount(getReadCount(book))} อ่าน • ${Number(book.review_count || 0).toLocaleString("th-TH")} รีวิว`;
}

function handleImgError(event: Event) {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
}

function goToBook(id: number) {
  router.push({ name: "BookDetail", params: { id } });
}

function goToCoinWallet() {
  router.push({ name: "CoinWallet" });
}

async function loadSerialBooks() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get<ShelfResponse>("/serials");
    books.value = Array.isArray(data?.books) ? data.books : [];
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดรายการรายตอนไม่สำเร็จ";
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
    <section v-if="heroBooks.length" class="hero-strip" aria-label="นิยายรายตอนแนะนำ">
      <button
        v-for="(book, index) in heroBooks"
        :key="book.id"
        class="hero-tile"
        :class="{ wide: index > 0 && index < heroBooks.length - 1 }"
        type="button"
        @click="goToBook(book.id)"
      >
        <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
        <span>{{ book.title }}</span>
      </button>
    </section>

    <div class="coin-row">
      <button class="coin-btn" type="button" @click="goToCoinWallet">
        <span aria-hidden="true">M</span>
        เติมคอยน์
      </button>
    </div>

    <section class="filter-panel" aria-label="ค้นหาและกรองนิยายรายตอน">
      <div>
        <h1>รายตอน</h1>
        <p>{{ filteredBooks.length.toLocaleString("th-TH") }} เรื่องจากข้อมูลจริงในระบบ</p>
      </div>

      <input
        v-model="search"
        type="search"
        placeholder="ค้นหาชื่อเรื่อง ผู้เขียน หรือหมวดหมู่"
        aria-label="ค้นหานิยายรายตอน"
      />

      <select v-model="accessFilter" aria-label="กรองตามสิทธิ์อ่าน">
        <option value="all">ทุกสิทธิ์อ่าน</option>
        <option value="free">ฟรี</option>
        <option value="paid">ใช้คอยน์</option>
        <option value="subscription">แพ็กเกจ</option>
      </select>

      <select v-model="categoryFilter" aria-label="กรองตามหมวดหมู่">
        <option value="all">ทุกหมวดหมู่</option>
        <option v-for="category in categoryOptions" :key="category" :value="category">
          {{ category }}
        </option>
      </select>
    </section>

    <div v-if="loading" class="state-box">กำลังโหลดรายการรายตอน...</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
    <div v-else-if="filteredBooks.length === 0" class="state-box">
      ยังไม่มีนิยายรายตอนที่ตรงกับเงื่อนไขนี้
    </div>

    <template v-else>
      <section class="continue-section">
        <div class="section-head">
          <h2>อ่านต่อ</h2>
          <button type="button" @click="categoryFilter = 'all'">ดูทั้งหมด</button>
        </div>

        <div class="continue-rail" aria-label="รายการอ่านต่อ">
          <article
            v-for="book in continueBooks"
            :key="book.id"
            class="continue-card"
            role="button"
            tabindex="0"
            @click="goToBook(book.id)"
            @keydown.enter.prevent="goToBook(book.id)"
            @keydown.space.prevent="goToBook(book.id)"
          >
            <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
            <div>
              <h3>{{ book.title }}</h3>
              <p>{{ getEpisodeCount(book) }} ตอนล่าสุด • {{ getAccessLabel(book) }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="serial-group">
        <div class="section-head">
          <h2>Love Novel</h2>
          <button type="button" @click="categoryFilter = 'all'">ดูทั้งหมด</button>
        </div>

        <div class="book-row" aria-label="นิยายรายตอนทั้งหมด">
          <article
            v-for="book in filteredBooks.slice(0, 8)"
            :key="book.id"
            class="book-card"
            role="button"
            tabindex="0"
            @click="goToBook(book.id)"
            @keydown.enter.prevent="goToBook(book.id)"
            @keydown.space.prevent="goToBook(book.id)"
          >
            <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
            <h3>{{ book.title }}</h3>
            <p>{{ book.author || "ไม่ระบุผู้เขียน" }}</p>
            <small>{{ getBookMeta(book) }}</small>
          </article>
        </div>
      </section>

      <section
        v-for="section in categorySections"
        :key="section.title"
        class="serial-group"
      >
        <div class="section-head">
          <h2>{{ section.title }}</h2>
          <button type="button" @click="categoryFilter = section.title">ดูทั้งหมด</button>
        </div>

        <div class="book-row" :aria-label="section.title">
          <article
            v-for="book in section.books"
            :key="book.id"
            class="book-card"
            role="button"
            tabindex="0"
            @click="goToBook(book.id)"
            @keydown.enter.prevent="goToBook(book.id)"
            @keydown.space.prevent="goToBook(book.id)"
          >
            <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
            <h3>{{ book.title }}</h3>
            <p>{{ book.author || "ไม่ระบุผู้เขียน" }}</p>
            <small>{{ getBookMeta(book) }}</small>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.serial-page {
  background: var(--bg);
  color: var(--text-strong);
  min-height: 100%;
  padding: 14px 0 56px;
}

.hero-strip {
  display: grid;
  grid-template-columns: minmax(150px, 190px) repeat(3, minmax(260px, 1fr)) minmax(150px, 190px);
  gap: 10px;
  overflow-x: auto;
  padding: 0 12px 10px;
  scrollbar-width: thin;
}

.hero-tile {
  position: relative;
  display: block;
  min-width: 150px;
  height: 230px;
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  background: var(--surface-soft);
  cursor: pointer;
  padding: 0;
}

.hero-tile.wide {
  min-width: 360px;
}

.hero-tile img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.hero-tile.wide img {
  object-fit: cover;
}

.hero-tile span {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  color: #ffffff;
  display: -webkit-box;
  font-weight: 900;
  line-height: 1.3;
  overflow: hidden;
  text-align: left;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.coin-row {
  display: flex;
  justify-content: center;
  border-bottom: 1px solid var(--border);
  padding: 8px 12px;
}

.coin-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  background: #ff8a00;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  min-height: 36px;
  padding: 0 18px;
}

.coin-btn span {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffd36a;
  color: #b45309;
  font-size: 11px;
}

.filter-panel,
.continue-section,
.serial-group {
  width: min(100% - 28px, 900px);
  margin: 0 auto;
}

.filter-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 260px) minmax(130px, 160px) minmax(130px, 180px);
  gap: 10px;
  align-items: end;
  padding: 22px 0 10px;
}

.filter-panel h1,
.filter-panel p,
.section-head h2 {
  margin: 0;
}

.filter-panel h1 {
  font-size: 30px;
}

.filter-panel p {
  color: var(--text-muted);
  font-weight: 800;
}

.filter-panel input,
.filter-panel select {
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-strong);
  padding: 0 12px;
}

.state-box {
  width: min(100% - 28px, 900px);
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

.continue-section {
  padding: 12px 0 30px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.section-head h2 {
  font-size: 28px;
}

.section-head button {
  border: 0;
  background: transparent;
  color: #00a99d;
  cursor: pointer;
  font-weight: 900;
}

.continue-rail,
.book-row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 185px;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: thin;
}

.continue-card {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  min-height: 58px;
  border: 0;
  border-radius: 8px;
  background: var(--surface-soft);
  cursor: pointer;
  padding: 6px;
}

.continue-card img {
  width: 52px;
  aspect-ratio: 1 / 1;
  border-radius: 5px;
  object-fit: cover;
}

.continue-card h3,
.continue-card p,
.book-card h3,
.book-card p,
.book-card small {
  margin: 0;
  min-width: 0;
}

.continue-card h3 {
  display: -webkit-box;
  color: var(--text-strong);
  font-size: 13px;
  line-height: 1.35;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.continue-card p {
  display: -webkit-box;
  color: #ff4f87;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.serial-group {
  padding: 12px 0 22px;
}

.serial-group .section-head h2 {
  font-size: 22px;
}

.book-row {
  grid-auto-columns: 135px;
}

.book-card {
  cursor: pointer;
  min-width: 0;
}

.book-card img {
  width: 100%;
  aspect-ratio: 1 / 1.18;
  display: block;
  border-radius: 6px;
  background: var(--surface-soft);
  object-fit: cover;
}

.book-card h3 {
  display: -webkit-box;
  color: var(--text-strong);
  font-size: 13px;
  line-height: 1.38;
  margin-top: 8px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.book-card p {
  display: -webkit-box;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
  margin-top: 6px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.book-card small {
  display: -webkit-box;
  color: #7a7f87;
  font-size: 11px;
  line-height: 1.35;
  margin-top: 4px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

@media (max-width: 920px) {
  .hero-strip {
    grid-template-columns: unset;
    grid-auto-flow: column;
    grid-auto-columns: 78vw;
  }

  .hero-tile,
  .hero-tile.wide {
    min-width: 78vw;
    height: 210px;
  }

  .filter-panel {
    grid-template-columns: 1fr 1fr;
  }

  .filter-panel > div,
  .filter-panel input {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .serial-page {
    padding-top: 8px;
  }

  .hero-tile,
  .hero-tile.wide {
    height: 168px;
  }

  .filter-panel {
    grid-template-columns: 1fr;
  }

  .filter-panel h1 {
    font-size: 26px;
  }

  .continue-rail {
    grid-auto-columns: 170px;
  }

  .book-row {
    grid-auto-columns: 118px;
  }
}
</style>
