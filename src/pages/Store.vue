<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";
import { announceAccessibilityMessage } from "../utils/accessibility";
import { filterBooks, uniqueBookCategories } from "../utils/bookSearch";

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

const router = useRouter();
const route = useRoute();

const books = ref<Book[]>([]);
const loading = ref(true);
const search = ref(String(route.query.q || ""));
const contentFilter = ref(String(route.query.type || "all"));
const accessFilter = ref(String(route.query.access || "all"));
const categoryFilter = ref(String(route.query.category || "all"));
const statusMessage = ref("");

const filteredBooks = computed(() => {
  return filterBooks(books.value, search.value, {
    contentType: contentFilter.value,
    accessType: accessFilter.value,
    category: categoryFilter.value,
  }) as Book[];
});

const categoryOptions = computed(() => uniqueBookCategories(books.value));
const suggestedBooks = computed(() => filteredBooks.value.slice(0, 8));

function notifyStoreStatus(message: string) {
  statusMessage.value = message;
  announceAccessibilityMessage(message);
}

function getBookCover(book: Book) {
  return resolveAssetUrl(book.cover_url || book.cover_image);
}

function getAccessLabel(book: Book) {
  if (book.access_type === "subscription") return "แพ็กเกจ";
  const price = Number(book.coin_price ?? book.price ?? 0);
  return price > 0 ? `${price} เหรียญ` : "อ่านฟรี";
}

function getTypeLabel(book: Book) {
  return book.content_type === "serial" ? "รายตอน" : "อีบุ๊ก";
}

function getBookPrice(book: Book) {
  return Number(book.coin_price ?? book.price ?? 0);
}

function formatBookPrice(book: Book) {
  const price = getBookPrice(book);
  if (!Number.isFinite(price) || price <= 0 || book.access_type === "free") {
    return "ฟรี";
  }
  return `${price.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function getFilledHearts(book: Book) {
  const average = Number(book.average_rating || 0);
  if (Number.isFinite(average) && average > 0) {
    return Math.max(1, Math.min(5, Math.round(average)));
  }

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
    notifyStoreStatus("กรุณาเข้าสู่ระบบก่อน");
    router.push({ name: "Login" });
    return;
  }

  try {
    await api.post("/cart", { book_id: book.id });
    notifyStoreStatus("เพิ่มลงตะกร้าแล้ว");
  } catch (error: any) {
    notifyStoreStatus(
      error?.response?.data?.message || "เพิ่มลงตะกร้าไม่สำเร็จ",
    );
  }
}

async function loadBooks() {
  loading.value = true;

  try {
    const { data } = await api.get("/books");
    books.value = Array.isArray(data)
      ? data
      : Array.isArray(data?.books)
        ? data.books
        : [];
  } catch (error) {
    console.error("load store books error:", error);
    notifyStoreStatus("โหลดหนังสือไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
}

function goToBook(id: number) {
  notifyStoreStatus("เปิดรายละเอียดหนังสือ");
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
  () => route.query.q,
  (keyword) => {
    search.value = String(keyword || "");
  },
);

onMounted(loadBooks);
</script>

<template>
  <main class="store-page">
    <header class="store-header">
      <div>
        <h1>ร้านหนังสือ</h1>
        <p>
          เลือกหนังสือที่ชอบ เพิ่มเข้าชั้นหนังสือ รายการที่อยากอ่าน
          หรือตะกร้าได้ทันที
        </p>
      </div>

      <div class="header-actions">
        <button class="top-btn" type="button" @click="goToWishlist">
          Wishlist
        </button>
        <button class="top-btn" type="button" @click="goToCart">ตะกร้า</button>
        <button class="top-btn primary" type="button" @click="goToMyLibrary">
          ชั้นหนังสือของฉัน
        </button>
      </div>
    </header>

    <section class="search-panel" aria-label="ค้นหาและกรองหนังสือ">
      <input
        v-model="search"
        type="search"
        placeholder="ค้นหาชื่อหนังสือ ผู้เขียน หรือหมวดหมู่"
        class="search-box"
        aria-label="ค้นหาหนังสือ"
      />

      <div class="filter-row">
        <select v-model="contentFilter" aria-label="กรองตามรูปแบบหนังสือ">
          <option value="all">ทุกรูปแบบ</option>
          <option value="ebook">อีบุ๊ก</option>
          <option value="serial">รายตอน</option>
        </select>
        <select v-model="accessFilter" aria-label="กรองตามสิทธิ์อ่าน">
          <option value="all">ทุกสิทธิ์อ่าน</option>
          <option value="free">อ่านฟรี</option>
          <option value="paid">ใช้เหรียญ</option>
          <option value="subscription">แพ็กเกจ</option>
        </select>
        <select v-model="categoryFilter" aria-label="กรองตามหมวดหมู่">
          <option value="all">ทุกหมวดหมู่</option>
          <option
            v-for="category in categoryOptions"
            :key="category"
            :value="category"
          >
            {{ category }}
          </option>
        </select>
      </div>

      <div
        v-if="search.trim()"
        class="suggestion-row"
        aria-label="หนังสือที่เกี่ยวข้อง"
      >
        <button
          v-for="book in suggestedBooks"
          :key="book.id"
          type="button"
          @click="goToBook(book.id)"
        >
          {{ book.title }}
        </button>
      </div>
    </section>

    <p class="sr-status" aria-live="polite">{{ statusMessage }}</p>

    <section v-if="loading" class="empty-state">กำลังโหลดหนังสือ...</section>
    <section v-else-if="filteredBooks.length === 0" class="empty-state">
      ไม่พบหนังสือที่ตรงกับการค้นหา
    </section>

    <section v-else class="book-grid" aria-label="รายการหนังสือ">
      <article v-for="book in filteredBooks" :key="book.id" class="book-card">
        <div
          class="book-clickable"
          tabindex="0"
          role="button"
          :aria-label="`เปิดรายละเอียดหนังสือ ${book.title}`"
          @click="goToBook(book.id)"
          @keydown.enter.prevent="goToBook(book.id)"
          @keydown.space.prevent="goToBook(book.id)"
        >
          <img
            :src="getBookCover(book)"
            :alt="book.title"
            @error="handleImgError"
          />
          <div class="meta-row">
            <span>{{ getTypeLabel(book) }}</span>
            <span>{{ getAccessLabel(book) }}</span>
          </div>
          <h2>{{ book.title }}</h2>
          <p>{{ book.author || "ไม่ระบุผู้เขียน" }}</p>
          <small v-if="book.category_name">{{ book.category_name }}</small>
        </div>

        <div class="book-card-footer">
          <div class="rating-box" aria-label="คะแนนและจำนวนรีวิว">
            <span class="heart-row" aria-hidden="true">
              <span
                v-for="index in 5"
                :key="index"
                :class="{ active: index <= getFilledHearts(book) }"
              >
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
  font-size: 36px;
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
    padding: 20px 10px 36px;
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

  .book-grid {
    gap: 8px;
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
    font-size: 10px;
    line-height: 1.3;
    margin: 0 4px 4px;
    min-height: 0;
    line-clamp: unset;
    -webkit-line-clamp: unset;
  }

  .book-card p,
  .book-card small {
    display: block;
    font-size: 8px;
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
    padding: 16px 8px 28px;
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
    font-size: 9px;
    margin-inline: 3px;
  }

  .book-card p,
  .book-card small {
    font-size: 7px;
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
