<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { API_BASE_URL, resolveAssetUrl } from "../utils/api";
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

function handleImgError(event: Event) {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
}

async function addToWishlist(book: Book) {
  if (!localStorage.getItem("token")) {
    notifyStoreStatus("กรุณาเข้าสู่ระบบก่อนเพิ่มรายการที่อยากอ่าน");
    router.push({ name: "Login" });
    return;
  }

  try {
    const { data } = await api.post("/wishlist", { book_id: book.id });
    notifyStoreStatus(data?.message || "เพิ่มเข้ารายการที่อยากอ่านสำเร็จ");
  } catch (error: any) {
    notifyStoreStatus(error?.response?.data?.message || "เพิ่มเข้ารายการที่อยากอ่านไม่สำเร็จ");
  }
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
    notifyStoreStatus(error?.response?.data?.message || "เพิ่มลงตะกร้าไม่สำเร็จ");
  }
}

async function loadBooks() {
  loading.value = true;

  try {
    const { data } = await api.get("/books");
    books.value = Array.isArray(data) ? data : Array.isArray(data?.books) ? data.books : [];
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
          เลือกหนังสือที่ชอบ เพิ่มเข้าชั้นหนังสือ รายการที่อยากอ่าน หรือตะกร้าได้ทันที
        </p>
      </div>

      <div class="header-actions">
        <button class="top-btn" type="button" @click="goToWishlist">Wishlist</button>
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
          <option v-for="category in categoryOptions" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </div>

      <div v-if="search.trim()" class="suggestion-row" aria-label="หนังสือที่เกี่ยวข้อง">
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
          <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
          <div class="meta-row">
            <span>{{ getTypeLabel(book) }}</span>
            <span>{{ getAccessLabel(book) }}</span>
          </div>
          <h2>{{ book.title }}</h2>
          <p>{{ book.author || "ไม่ระบุผู้เขียน" }}</p>
          <small v-if="book.category_name">{{ book.category_name }}</small>
        </div>

        <div class="card-actions">
          <button class="mini-btn" type="button" @click="addToWishlist(book)">
            Wishlist
          </button>
          <button class="mini-btn primary" type="button" @click="addToCart(book)">
            ใส่ตะกร้า
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
.card-actions,
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.top-btn,
.mini-btn {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-strong);
  cursor: pointer;
  font-weight: 800;
}

.top-btn {
  padding: 12px 16px;
}

.top-btn.primary,
.mini-btn.primary {
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
  gap: 28px;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
}

.book-card {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  padding: 14px;
}

.book-clickable {
  cursor: pointer;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
}

.book-card img {
  aspect-ratio: 3 / 4;
  background: var(--surface-soft);
  border-radius: 8px;
  margin-bottom: 12px;
  object-fit: cover;
  width: 100%;
}

.meta-row {
  justify-content: space-between;
  margin-bottom: 10px;
}

.meta-row span {
  background: var(--surface-soft);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 900;
  padding: 5px 9px;
}

.book-card h2 {
  display: -webkit-box;
  color: var(--text-strong);
  font-size: 18px;
  line-height: 1.45;
  margin: 0 0 8px;
  min-height: 52px;
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
  line-height: 1.45;
  margin: 0 0 4px;
  min-height: 24px;
  overflow: hidden;
  line-clamp: 1;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.book-card small {
  color: var(--text-muted);
  min-height: 20px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.card-actions {
  flex-wrap: nowrap;
  margin-top: auto;
  padding-top: 14px;
}

.mini-btn {
  align-items: center;
  display: inline-flex;
  flex: 1;
  justify-content: center;
  min-height: 48px;
  padding: 10px 12px;
  text-align: center;
}

@media (max-width: 768px) {
  .store-header {
    flex-direction: column;
  }

  .store-header h1 {
    font-size: 30px;
  }

  .header-actions,
  .top-btn,
  .search-box,
  .filter-row select {
    width: 100%;
  }

  .book-grid {
    gap: 14px;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  .book-card {
    padding: 10px;
  }

  .book-card h2 {
    font-size: 15px;
    min-height: 42px;
  }

  .card-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .mini-btn {
    min-height: 44px;
  }
}

@media (max-width: 380px) {
  .book-grid {
    grid-template-columns: 1fr;
  }
}
</style>
