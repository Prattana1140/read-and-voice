<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";
import { filterBooks, uniqueBookCategories, type SearchableBook } from "../utils/bookSearch";
import { useI18n } from "../utils/i18n";
import { localizedTitle } from "../utils/localizedContent";

type Book = SearchableBook & {
  average_rating?: number | string;
  review_count?: number | string;
};

type CategoryItem = {
  id: number | string;
  name: string;
  parent_id?: number | null;
  sort_order?: number | null;
};

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();

const books = ref<Book[]>([]);
const categoryItems = ref<CategoryItem[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const query = ref(String(route.query.q || ""));
const contentType = ref(String(route.query.type || "all"));
const accessType = ref(String(route.query.access || "all"));
const category = ref(String(route.query.category || "all"));

const categories = computed(() => {
  if (categoryItems.value.length) return categoryItems.value;

  return uniqueBookCategories(books.value).map((name, index) => ({
    id: `book-${index}-${name}`,
    name,
    parent_id: null,
  }));
});

function getCategoryChildren(parentName: string) {
  const parent = categoryItems.value.find((item) => item.name === parentName);
  if (!parent || typeof parent.id !== "number") return [];

  return categoryItems.value.filter((item) => item.parent_id === parent.id);
}

const effectiveCategory = computed(() => {
  if (category.value === "all") return "all";

  const children = getCategoryChildren(category.value);
  if (!children.length) return category.value;

  return [category.value, ...children.map((item) => item.name)];
});

const results = computed(() =>
  filterBooks(books.value, query.value, {
    contentType: contentType.value,
    accessType: accessType.value,
    category: effectiveCategory.value,
  }) as Book[],
);

function syncRouteQuery() {
  router.replace({
    name: "Search",
    query: {
      ...(query.value.trim() ? { q: query.value.trim() } : {}),
      ...(contentType.value !== "all" ? { type: contentType.value } : {}),
      ...(accessType.value !== "all" ? { access: accessType.value } : {}),
      ...(category.value !== "all" ? { category: category.value } : {}),
    },
  });
}

function openBook(book: Book) {
  router.push({ name: "BookDetail", params: { id: book.id } });
}

function getCover(book: Book) {
  return resolveAssetUrl(book.cover_url || book.cover_image);
}

function getBookTitle(book: Book) {
  return localizedTitle(book, locale.value) || book.title || "";
}

function getAuthor(book: Book) {
  return book.author || book.author_name || "ไม่ระบุผู้เขียน";
}

function getAccessLabel(book: Book) {
  if (book.access_type === "subscription") return "แพ็กเกจ";
  const price = Number(book.price ?? 0);
  return price > 0 ? `${price.toLocaleString("th-TH")} เหรียญ` : "อ่านฟรี";
}

function onImgError(event: Event) {
  const image = event.target as HTMLImageElement;
  if (!image.src.endsWith("/no-cover.png")) image.src = "/no-cover.png";
}

function normalizeCategories(data: unknown): CategoryItem[] {
  const items = (Array.isArray(data) ? data : Array.isArray((data as any)?.categories) ? (data as any).categories : []) as any[];

  return items
    .map<CategoryItem>((item: any, index: number) => ({
      id: Number.isFinite(Number(item?.id)) ? Number(item.id) : `category-${index}`,
      name: String(item?.name || "").trim(),
      parent_id: item?.parent_id == null ? null : Number(item.parent_id),
      sort_order: item?.sort_order == null ? null : Number(item.sort_order),
    }))
    .filter((item: CategoryItem) => item.name)
    .sort((a: CategoryItem, b: CategoryItem) => {
      const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      if ((a.parent_id || 0) !== (b.parent_id || 0)) return Number(a.parent_id || 0) - Number(b.parent_id || 0);
      return a.name.localeCompare(b.name, "th");
    });
}

async function loadSearchData() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const [booksResponse, categoriesResponse] = await Promise.all([
      api.get("/books"),
      api.get("/categories").catch((error) => {
        console.warn("load search categories error:", error);
        return { data: [] };
      }),
    ]);
    const bookData = booksResponse.data;
    books.value = Array.isArray(bookData)
      ? bookData
      : Array.isArray(bookData?.books)
        ? bookData.books
        : [];
    categoryItems.value = normalizeCategories(categoriesResponse.data);
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดผลการค้นหาไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.query,
  (nextQuery) => {
    query.value = String(nextQuery.q || "");
    contentType.value = String(nextQuery.type || "all");
    accessType.value = String(nextQuery.access || "all");
    category.value = String(nextQuery.category || "all");
  },
);

onMounted(loadSearchData);
</script>

<template>
  <main class="search-page">
    <section class="search-hero">
      <div>
        <p>ค้นหาหนังสือ</p>
        <h1>ค้นหา e-book และนิยายรายตอน</h1>
      </div>

      <form class="search-box" @submit.prevent="syncRouteQuery">
        <input
          v-model="query"
          type="search"
          autocomplete="off"
          placeholder="ชื่อหนังสือ ผู้เขียน หมวดหมู่ หรือคำสำคัญ"
          aria-label="คำค้นหา"
        />
        <button type="submit">ค้นหา</button>
      </form>
    </section>

    <section class="filters" aria-label="ตัวกรองผลการค้นหา">
      <select v-model="contentType" @change="syncRouteQuery">
        <option value="all">ทุกรูปแบบ</option>
        <option value="ebook">E-book</option>
        <option value="serial">นิยายรายตอน</option>
      </select>
      <select v-model="accessType" @change="syncRouteQuery">
        <option value="all">ทุกสิทธิ์อ่าน</option>
        <option value="free">อ่านฟรี</option>
        <option value="paid">ใช้เหรียญ</option>
        <option value="subscription">แพ็กเกจ</option>
      </select>
      <select v-model="category" @change="syncRouteQuery">
        <option value="all">ทุกหมวดหมู่</option>
        <option v-for="item in categories" :key="item.id" :value="item.name">
          {{ item.parent_id ? "- " : "" }}{{ item.name }}
        </option>
      </select>
    </section>

    <section class="result-summary" aria-live="polite">
      <span v-if="loading">กำลังโหลดผลการค้นหา...</span>
      <span v-else-if="errorMessage">{{ errorMessage }}</span>
      <span v-else>พบ {{ results.length.toLocaleString("th-TH") }} รายการ</span>
    </section>

    <section v-if="!loading && !errorMessage && results.length" class="result-grid">
      <article
        v-for="book in results"
        :key="book.id"
        class="book-card"
        tabindex="0"
        role="button"
        @click="openBook(book)"
        @keydown.enter.prevent="openBook(book)"
        @keydown.space.prevent="openBook(book)"
      >
        <img :src="getCover(book)" :alt="getBookTitle(book) || 'book cover'" @error="onImgError" />
        <div>
          <span>{{ book.content_type === "serial" ? "รายตอน" : "E-book" }}</span>
          <h2>{{ getBookTitle(book) || "ไม่มีชื่อหนังสือ" }}</h2>
          <p>{{ getAuthor(book) }}</p>
          <small>{{ book.category_name || "ไม่ระบุหมวดหมู่" }} · {{ getAccessLabel(book) }}</small>
        </div>
      </article>
    </section>

    <section v-else-if="!loading && !errorMessage" class="empty-state">
      <h2>ไม่พบผลลัพธ์ที่ตรงกัน</h2>
      <p>ลองใช้คำค้นที่สั้นลง หรือเปลี่ยนตัวกรองด้านบน</p>
      <button type="button" @click="router.push('/store')">ไปหน้าร้านหนังสือ</button>
    </section>
  </main>
</template>

<style scoped>
.search-page {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: var(--page-block) var(--page-gutter) 56px;
}

.search-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(320px, 1.1fr);
  gap: 24px;
  align-items: end;
  border-bottom: 1px solid var(--border);
  padding-bottom: 24px;
}

.search-hero p,
.search-hero h1 {
  margin: 0;
}

.search-hero p {
  color: var(--primary);
  font-weight: 900;
}

.search-hero h1 {
  margin-top: 8px;
  color: var(--text-strong);
  font-size: 36px;
  line-height: 1.2;
}

.search-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.search-box input,
.filters select {
  min-height: 46px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-strong);
  font: inherit;
  padding: 0 14px;
}

.search-box button,
.empty-state button {
  min-height: 46px;
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 18px;
}

.filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.result-summary {
  color: var(--text-muted);
  font-weight: 800;
  margin: 22px 0 14px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.book-card {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  cursor: pointer;
  padding: 12px;
}

.book-card img {
  width: 84px;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
  object-fit: cover;
  object-position: top center;
  background: var(--surface-soft);
}

.book-card span {
  color: var(--primary);
  font-size: 14px;
  font-weight: 900;
}

.book-card h2 {
  margin: 4px 0;
  color: var(--text-strong);
  font-size: 19px;
  line-height: 1.35;
}

.book-card p,
.book-card small,
.empty-state p {
  margin: 0;
  color: var(--text-muted);
}

.empty-state {
  display: grid;
  justify-items: start;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 26px;
}

.empty-state h2 {
  margin: 0;
  color: var(--text-strong);
}

@media (max-width: 760px) {
  .search-page {
    padding-right: 22px;
    padding-left: 22px;
  }

  .search-hero,
  .filters {
    grid-template-columns: 1fr;
  }

  .search-box {
    grid-template-columns: 1fr;
  }

  .filters {
    gap: 7px;
    margin-top: 12px;
  }

  .search-box input,
  .search-box button,
  .filters select {
    min-height: 36px;
    border-radius: 6px;
    font-size: 14px;
    padding-inline: 10px;
  }

  .result-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
  }

  .book-card {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
    overflow: hidden;
    border: 0;
    background: transparent;
    padding: 0;
  }

  .book-card img {
    width: 100%;
    border-radius: 6px;
  }

  .book-card span {
    font-size: 10px;
  }

  .book-card h2 {
    display: -webkit-box;
    min-height: 30px;
    margin: 2px 0;
    overflow: hidden;
    font-size: 12px;
    line-height: 1.25;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .book-card p,
  .book-card small {
    display: -webkit-box;
    overflow: hidden;
    font-size: 10px;
    line-height: 1.25;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }
}
</style>
