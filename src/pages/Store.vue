<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";
import { announceAccessibilityMessage } from "../utils/accessibility";
import { filterBooks, uniqueBookCategories } from "../utils/bookSearch";
import { useI18n } from "../utils/i18n";

type Book = {
  id: number;
  title: string;
  author: string;
  cover_url?: string;
  cover_image?: string;
  category_name?: string;
  price?: number;
  coin_price?: number;
  access_type?: string;
  content_type?: string;
  description?: string;
  average_rating?: number | string;
  review_count?: number | string;
};

type Category = {
  id: number | string;
  name: string;
  parent_id?: number | null;
  sort_order?: number | null;
};

const router = useRouter();
const route = useRoute();
const { locale } = useI18n();

const books = ref<Book[]>([]);
const categoryItems = ref<Category[]>([]);
const loading = ref(true);
const search = ref(String(route.query.q || ""));
const contentFilter = ref(String(route.query.type || "all"));
const accessFilter = ref(String(route.query.access || "all"));
const categoryFilter = ref(String(route.query.category || "all"));
const statusMessage = ref("");

const copy = {
  th: {
    title: "ร้านหนังสือ",
    subtitle: "เลือกหนังสือที่ชอบ เพิ่มเข้าชั้นหนังสือ รายการที่อยากอ่าน หรือตะกร้าได้ทันที",
    cart: "ตะกร้า",
    library: "ชั้นหนังสือของฉัน",
    searchPanel: "ค้นหาและกรองหนังสือ",
    searchPlaceholder: "ค้นหาชื่อหนังสือ ผู้เขียน หรือหมวดหมู่",
    searchLabel: "ค้นหาหนังสือ",
    contentFilter: "กรองตามรูปแบบหนังสือ",
    allTypes: "ทุกรูปแบบ",
    ebook: "อีบุ๊ก",
    serial: "รายตอน",
    accessFilter: "กรองตามสิทธิ์อ่าน",
    allAccess: "ทุกสิทธิ์อ่าน",
    freeRead: "อ่านฟรี",
    paid: "ใช้เหรียญ",
    subscription: "แพ็กเกจ",
    categoryFilter: "กรองตามหมวดหมู่",
    allCategories: "ทุกหมวดหมู่",
    allInCategory: "ทั้งหมดในหมวดนี้",
    subcategoriesOf: "หมวดย่อยของ",
    suggestions: "หนังสือที่เกี่ยวข้อง",
    loading: "กำลังโหลดหนังสือ...",
    empty: "ไม่พบหนังสือที่ตรงกับการค้นหา",
    list: "รายการหนังสือ",
    openDetails: "เปิดรายละเอียดหนังสือ",
    unknownAuthor: "ไม่ระบุผู้เขียน",
    rating: "คะแนนและจำนวนรีวิว",
    package: "แพ็กเกจ",
    coins: "เหรียญ",
    free: "ฟรี",
    loginFirst: "กรุณาเข้าสู่ระบบก่อน",
    addedCart: "เพิ่มลงตะกร้าแล้ว",
    addCartFailed: "เพิ่มลงตะกร้าไม่สำเร็จ",
    loadFailed: "โหลดหนังสือไม่สำเร็จ",
    openBook: "เปิดรายละเอียดหนังสือ",
  },
  en: {
    title: "Book store",
    subtitle: "Choose books you like and add them to your library, wishlist, or cart instantly.",
    cart: "Cart",
    library: "My library",
    searchPanel: "Search and filter books",
    searchPlaceholder: "Search by book title, author, or category",
    searchLabel: "Search books",
    contentFilter: "Filter by book format",
    allTypes: "All formats",
    ebook: "Ebook",
    serial: "Serial",
    accessFilter: "Filter by access",
    allAccess: "All access types",
    freeRead: "Free read",
    paid: "Coins",
    subscription: "Package",
    categoryFilter: "Filter by category",
    allCategories: "All categories",
    allInCategory: "All in this category",
    subcategoriesOf: "Subcategories of",
    suggestions: "Related books",
    loading: "Loading books...",
    empty: "No books match your search",
    list: "Book list",
    openDetails: "Open book details",
    unknownAuthor: "Unknown author",
    rating: "Rating and review count",
    package: "Package",
    coins: "coins",
    free: "Free",
    loginFirst: "Please log in first",
    addedCart: "Added to cart",
    addCartFailed: "Could not add to cart",
    loadFailed: "Could not load books",
    openBook: "Open book details",
  },
};

const text = () => copy[locale.value];
const numberLocale = computed(() => (locale.value === "th" ? "th-TH" : "en-US"));

const mainBookCategories = computed<Category[]>(() => {
  const parentCategories = categoryItems.value.filter((category) => !category.parent_id);
  if (parentCategories.length) return parentCategories;

  return uniqueBookCategories(books.value).map((name, index) => ({
    id: `book-${index}-${name}`,
    name,
    parent_id: null,
  }));
});

const mainCategoryNames = computed(() => mainBookCategories.value.map((category) => category.name));

function getCategoryByName(name: string) {
  return categoryItems.value.find((category) => category.name === name) || null;
}

function getCategoryChildren(parentName: string) {
  const parent = getCategoryByName(parentName);
  if (!parent || typeof parent.id !== "number") return [];

  return categoryItems.value.filter((category) => category.parent_id === parent.id);
}

const selectedMainCategory = computed(() => {
  if (categoryFilter.value === "all") return "all";
  if (mainCategoryNames.value.includes(categoryFilter.value)) return categoryFilter.value;

  const current = getCategoryByName(categoryFilter.value);
  const parent = current?.parent_id
    ? categoryItems.value.find((category) => category.id === current.parent_id)
    : null;

  return parent?.name || categoryFilter.value;
});

const displayedMainBookCategories = computed<Category[]>(() => {
  const categories = [...mainBookCategories.value];

  if (
    categoryFilter.value !== "all" &&
    selectedMainCategory.value !== "all" &&
    !categories.some((category) => category.name === selectedMainCategory.value)
  ) {
    categories.unshift({
      id: `selected-${selectedMainCategory.value}`,
      name: selectedMainCategory.value,
      parent_id: null,
      sort_order: -1,
    });
  }

  return categories;
});

const categorySelectOptions = computed<Category[]>(() => {
  const seen = new Set<string>();
  const options: Category[] = [];

  for (const category of displayedMainBookCategories.value) {
    if (!seen.has(category.name)) {
      seen.add(category.name);
      options.push(category);
    }

    for (const child of getCategoryChildren(category.name)) {
      if (!seen.has(child.name)) {
        seen.add(child.name);
        options.push(child);
      }
    }
  }

  for (const category of categoryItems.value) {
    if (!seen.has(category.name)) {
      seen.add(category.name);
      options.push(category);
    }
  }

  return options;
});

const effectiveCategoryFilter = computed(() => {
  if (categoryFilter.value === "all") return "all";

  const children = getCategoryChildren(categoryFilter.value);
  if (children.length) {
    return [categoryFilter.value, ...children.map((subcategory) => subcategory.name)];
  }

  return categoryFilter.value;
});

const filteredBooks = computed(() => {
  return filterBooks(books.value, search.value, {
    contentType: contentFilter.value,
    accessType: accessFilter.value,
    category: effectiveCategoryFilter.value,
  }) as Book[];
});

const suggestedBooks = computed(() => filteredBooks.value.slice(0, 8));

function notifyStoreStatus(message: string) {
  statusMessage.value = message;
  announceAccessibilityMessage(message);
}

function setCategoryFilter(category: string) {
  categoryFilter.value = category;
  router.replace({
    query: {
      ...route.query,
      category: category === "all" ? undefined : category,
    },
  });
}

function getBookCover(book: Book) {
  return resolveAssetUrl(book.cover_url || book.cover_image);
}

function getAccessLabel(book: Book) {
  if (book.access_type === "subscription") return text().package;
  const price = Number(book.coin_price ?? book.price ?? 0);
  return price > 0 ? `${price.toLocaleString(numberLocale.value)} ${text().coins}` : text().freeRead;
}

function getTypeLabel(book: Book) {
  return book.content_type === "serial" ? text().serial : text().ebook;
}

function getBookPrice(book: Book) {
  return Number(book.coin_price ?? book.price ?? 0);
}

function formatBookPrice(book: Book) {
  const price = getBookPrice(book);
  if (!Number.isFinite(price) || price <= 0 || book.access_type === "free") return text().free;
  return `${price.toLocaleString(numberLocale.value, { maximumFractionDigits: 0 })}`;
}

function getFilledHearts(book: Book) {
  const average = Number(book.average_rating || 0);
  if (Number.isFinite(average) && average > 0) return Math.max(1, Math.min(5, Math.round(average)));
  return 0;
}

function formatRatingCount(book: Book) {
  const count = Number(book.review_count ?? 0);
  return `${Number.isFinite(count) ? count : 0} Rating`;
}

function handleImgError(event: Event) {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
}

async function addToCart(book: Book) {
  if (!localStorage.getItem("token")) {
    notifyStoreStatus(text().loginFirst);
    router.push({ name: "Login" });
    return;
  }

  try {
    await api.post("/cart", { book_id: book.id });
    notifyStoreStatus(text().addedCart);
  } catch (error: any) {
    notifyStoreStatus(error?.response?.data?.message || text().addCartFailed);
  }
}

function normalizeCategories(data: unknown): Category[] {
  const items = (Array.isArray(data) ? data : Array.isArray((data as any)?.categories) ? (data as any).categories : []) as any[];

  return items
    .map<Category>((item: any, index: number) => ({
      id: Number.isFinite(Number(item?.id)) ? Number(item.id) : `category-${index}`,
      name: String(item?.name || "").trim(),
      parent_id: item?.parent_id == null ? null : Number(item.parent_id),
      sort_order: item?.sort_order == null ? null : Number(item.sort_order),
    }))
    .filter((category: Category) => category.name)
    .sort((a: Category, b: Category) => {
      const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, "th");
    });
}

async function loadStoreData() {
  loading.value = true;

  try {
    const [booksResponse, categoriesResponse] = await Promise.all([
      api.get("/books"),
      api.get("/categories").catch((error) => {
        console.warn("load store categories error:", error);
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
  } catch (error) {
    console.error("load store books error:", error);
    notifyStoreStatus(text().loadFailed);
  } finally {
    loading.value = false;
  }
}

function goToBook(id: number) {
  notifyStoreStatus(text().openBook);
  router.push({ name: "BookDetail", params: { id } });
}

function goToMyLibrary() {
  router.push({ name: "MyLibrary" });
}

function goToWishlist() {
  router.push({ name: "WishList" });
}

function goToCart() {
  router.push({ name: "Cart" });
}

watch(
  () => route.query,
  (query) => {
    search.value = String(query.q || "");
    contentFilter.value = String(query.type || "all");
    accessFilter.value = String(query.access || "all");
    categoryFilter.value = String(query.category || "all");
  },
);

onMounted(loadStoreData);
</script>

<template>
  <main class="store-page">
    <header class="store-header">
      <div>
        <h1>{{ text().title }}</h1>
        <p>{{ text().subtitle }}</p>
      </div>

      <div class="header-actions">
        <button class="top-btn" type="button" @click="goToWishlist">
          Wishlist
        </button>
        <button class="top-btn" type="button" @click="goToCart">{{ text().cart }}</button>
        <button class="top-btn primary" type="button" @click="goToMyLibrary">
          {{ text().library }}
        </button>
      </div>
    </header>

    <section class="search-panel" :aria-label="text().searchPanel">
      <input
        v-model="search"
        type="search"
        :placeholder="text().searchPlaceholder"
        class="search-box"
        :aria-label="text().searchLabel"
      />

      <div class="filter-row">
        <select v-model="contentFilter" :aria-label="text().contentFilter">
          <option value="all">{{ text().allTypes }}</option>
          <option value="ebook">{{ text().ebook }}</option>
          <option value="serial">{{ text().serial }}</option>
        </select>
        <select v-model="accessFilter" :aria-label="text().accessFilter">
          <option value="all">{{ text().allAccess }}</option>
          <option value="free">{{ text().freeRead }}</option>
          <option value="paid">{{ text().paid }}</option>
          <option value="subscription">{{ text().subscription }}</option>
        </select>
      </div>

      <div class="category-filter" :aria-label="text().categoryFilter">
        <select
          class="category-select"
          :value="categoryFilter"
          :aria-label="text().categoryFilter"
          @change="setCategoryFilter(($event.target as HTMLSelectElement).value)"
        >
          <option value="all">{{ text().allCategories }}</option>
          <option
            v-for="category in categorySelectOptions"
            :key="category.id"
            :value="category.name"
          >
            {{ category.parent_id ? `- ${category.name}` : category.name }}
          </option>
        </select>
      </div>

      <div v-if="search.trim()" class="suggestion-row" :aria-label="text().suggestions">
        <button v-for="book in suggestedBooks" :key="book.id" type="button" @click="goToBook(book.id)">
          {{ book.title }}
        </button>
      </div>
    </section>

    <p class="sr-status" aria-live="polite">{{ statusMessage }}</p>

    <section v-if="loading" class="empty-state">{{ text().loading }}</section>
    <section v-else-if="filteredBooks.length === 0" class="empty-state">
      {{ text().empty }}
    </section>

    <section v-else class="book-grid" :aria-label="text().list">
      <article v-for="book in filteredBooks" :key="book.id" class="book-card">
        <div
          class="book-clickable"
          tabindex="0"
          role="button"
          :aria-label="`${text().openDetails} ${book.title}`"
          @click="goToBook(book.id)"
          @keydown.enter.prevent="goToBook(book.id)"
          @keydown.space.prevent="goToBook(book.id)"
        >
          <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
          <div class="meta-row">
            <span>{{ getTypeLabel(book) }}</span>
            <span>{{ getAccessLabel(book) }}</span>
          </div>
          <h2>{{ book.title }}</h2>
          <p>{{ book.author || text().unknownAuthor }}</p>
          <small v-if="book.category_name">{{ book.category_name }}</small>
        </div>

        <div class="book-card-footer">
          <div class="rating-box" :aria-label="text().rating">
            <span class="heart-row" aria-hidden="true">
              <span v-for="index in 5" :key="index" :class="{ active: index <= getFilledHearts(book) }">
                ♥
              </span>
            </span>
            <small>{{ formatRatingCount(book) }}</small>
          </div>

          <button class="price-pill" type="button" @click="addToCart(book)">
            <span aria-hidden="true">฿</span>
            {{ formatBookPrice(book) }}
          </button>
        </div>
      </article>
    </section>
  </main>
</template>
<style scoped>
.store-page {
  background: var(--bg);
  margin: 0 auto;
  max-width: var(--content-width);
  min-height: 100%;
  padding: var(--page-block, 28px) var(--page-gutter, 20px) 44px;
  overflow-x: hidden;
}

.store-header {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 24px;
}

.store-header h1 {
  color: var(--text-strong);
  font-size: 30px;
  margin: 0 0 8px;
}

.store-header p {
  color: var(--text-muted);
  line-height: 1.7;
  margin: 0;
}

.header-actions,
.filter-row,
.suggestion-row,
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.header-actions {
  width: auto;
}

.top-btn {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-strong);
  cursor: pointer;
  font-weight: 800;
  padding: 12px 16px;
}

.top-btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--on-primary);
}

.search-panel {
  display: grid;
  gap: 12px;
  margin-bottom: 24px;
}

.search-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-strong);
  font-size: 16px;
  max-width: 520px;
  outline: none;
  padding: 12px 16px;
  width: 100%;
}

.search-box:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
}

.filter-row select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-strong);
  font-weight: 800;
  min-height: 42px;
  padding: 0 12px;
}

.category-filter {
  display: grid;
  gap: 10px;
}

.category-select {
  width: min(100%, 240px);
  min-height: 40px;
  border: 1px solid color-mix(in srgb, var(--primary) 34%, var(--border));
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-strong);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  outline: none;
  padding: 0 38px 0 14px;
}

.category-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

.suggestion-row button {
  background: var(--surface);
  border: 1px solid color-mix(in srgb, var(--primary) 34%, var(--border));
  border-radius: 999px;
  color: var(--primary-strong);
  cursor: pointer;
  font-weight: 900;
  min-height: 34px;
  padding: 0 12px;
}

.sr-status {
  color: var(--primary-strong);
  font-weight: 700;
  margin: -10px 0 16px;
  min-height: 24px;
}

.empty-state,
.book-card {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.empty-state {
  border-radius: 8px;
  color: var(--text-muted);
  padding: 24px;
  text-align: center;
}

.book-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  width: 100%;
}

.book-card {
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 0;
}

.book-clickable {
  cursor: pointer;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  padding: 0;
}

.book-card img {
  aspect-ratio: 3 / 4;
  background: var(--surface-soft);
  border-radius: 0;
  margin-bottom: 0;
  object-fit: cover;
  width: 100%;
}

.meta-row {
  justify-content: space-between;
  margin: 8px 8px 7px;
}

.meta-row span {
  background: var(--surface-soft);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 900;
  padding: 4px 7px;
}

.book-card h2 {
  display: -webkit-box;
  color: var(--text-strong);
  font-size: 13px;
  line-height: 1.45;
  margin: 0 8px 6px;
  min-height: 38px;
  overflow: hidden;
  line-clamp: 2;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.book-card p {
  display: -webkit-box;
  color: var(--text);
  font-size: 11px;
  line-height: 1.45;
  margin: 0 8px 2px;
  min-height: 16px;
  overflow: hidden;
  line-clamp: 1;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.book-card small {
  color: var(--text-muted);
  font-size: 10px;
  min-height: 14px;
  margin: 0 8px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.book-card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding: 8px;
}

.rating-box {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.heart-row {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  color: #d1d5db;
  font-size: 11px;
  line-height: 1;
}

.heart-row span.active {
  color: #ec4899;
}

.rating-box small {
  color: var(--text-muted);
  font-size: 9px;
  line-height: 1.1;
  margin: 0;
  min-height: 0;
}

.price-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 46px;
  min-height: 24px;
  border: 0;
  border-radius: 2px;
  background: #00b874;
  color: #ffffff;
  cursor: pointer;
  font-size: 10px;
  font-weight: 900;
  padding: 0 7px;
}

@media (max-width: 768px) {
  .store-page {
    padding: 20px 22px 36px;
  }

  .store-header {
    flex-direction: column;
  }

  .store-header h1 {
    font-size: 30px;
  }

  .header-actions {
    width: 100%;
    gap: 8px;
  }

  .top-btn {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
  }

  .search-box,
  .filter-row select {
    width: 100%;
  }

  .category-filter {
    gap: 6px;
  }

  .category-select {
    width: 100%;
    min-height: 34px;
    font-size: 11px;
    padding: 0 30px 0 10px;
  }

  .suggestion-row button {
    min-height: 28px;
    font-size: 11px;
    padding: 0 9px;
  }

  .book-grid {
    gap: 7px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .book-card {
    padding: 0;
  }

  .meta-row {
    margin: 5px 4px 4px;
  }

  .meta-row span {
    font-size: 8px;
    padding: 3px 4px;
  }

  .book-card h2 {
    display: block;
    font-size: 9px;
    line-height: 1.3;
    margin: 0 4px 4px;
    min-height: 0;
    line-clamp: unset;
    -webkit-line-clamp: unset;
  }

  .book-card p,
  .book-card small {
    display: block;
    font-size: 7px;
    line-height: 1.25;
    margin-inline: 4px;
    min-height: 0;
    line-clamp: unset;
    -webkit-line-clamp: unset;
  }

  .book-card-footer {
    gap: 4px;
    padding: 5px 4px;
  }

  .heart-row {
    font-size: 8px;
  }

  .rating-box small {
    font-size: 7px;
  }

  .price-pill {
    min-width: 34px;
    min-height: 20px;
    font-size: 8px;
    padding: 0 4px;
  }
}

@media (max-width: 420px) {
  .store-page {
    padding: 16px 18px 28px;
  }

  .category-select {
    min-height: 32px;
    font-size: 10px;
  }

  .suggestion-row button {
    min-height: 26px;
    font-size: 10px;
    padding-inline: 8px;
  }

  .book-grid {
    gap: 6px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .meta-row {
    margin: 4px 3px 3px;
  }

  .meta-row span {
    font-size: 7px;
    padding: 2px 3px;
  }

  .book-card h2 {
    font-size: 8px;
    margin-inline: 3px;
  }

  .book-card p,
  .book-card small {
    font-size: 6px;
    margin-inline: 3px;
  }

  .book-card-footer {
    padding: 4px 3px;
  }

  .heart-row {
    font-size: 7px;
  }

  .rating-box small {
    font-size: 6px;
  }

  .price-pill {
    min-width: 30px;
    min-height: 18px;
    font-size: 7px;
    padding: 0 3px;
  }
}
</style>
