<template>
  <div class="store-page">
    <div class="store-header">
      <div>
        <h1>ร้านหนังสือ</h1>
        <p>
          เลือกหนังสือที่ชอบ เพิ่มเข้าชั้นหนังสือ เพิ่ม Wishlist หรือใส่ตะกร้าได้ทันที
        </p>
      </div>

      <div class="header-actions">
        <button class="top-btn" @click="goToWishlist">Wishlist</button>
        <button class="top-btn" @click="goToCart">ตะกร้า</button>
        <button class="top-btn primary" @click="goToMyLibrary">
          ชั้นหนังสือของฉัน
        </button>
      </div>
    </div>

    <input
      v-model="search"
      type="text"
      placeholder="ค้นหาชื่อหนังสือหรือผู้เขียน"
      class="search-box"
      aria-label="ค้นหาหนังสือหรือผู้เขียน"
    />

    <p class="sr-status" aria-live="polite">{{ statusMessage }}</p>

    <div v-if="filteredBooks.length === 0" class="empty-state">
      ยังไม่มีหนังสือแสดงผล
    </div>

    <div v-else class="book-grid">
      <article v-for="book in filteredBooks" :key="book.id" class="book-card">
        <div class="book-clickable" tabindex="0" role="button" :aria-label="`เปิดรายละเอียดหนังสือ ${book.title}`" @click="goToBook(book.id)" @keydown.enter.prevent="goToBook(book.id)" @keydown.space.prevent="goToBook(book.id)">
          <img
            :src="getBookCover(book)"
            :alt="book.title"
            @error="handleImgError"
          />
          <h3>{{ book.title }}</h3>
          <p>{{ book.author }}</p>
          <small v-if="book.category_name">{{ book.category_name }}</small>
        </div>

        <div class="card-actions">
          <button class="mini-btn" @click="addToWishlist(book)">
            เพิ่ม Wishlist
          </button>
          <button class="mini-btn primary" @click="addToCart(book.id)">
            ใส่ตะกร้า
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import api, { API_BASE_URL, resolveAssetUrl } from "../utils/api";
import { ref, onMounted, computed, watch } from "vue";
import axios from "axios";
import { useRoute, useRouter } from "vue-router";
import { announceAccessibilityMessage } from "../utils/accessibility";

type Book = {
  id: number;
  title: string;
  author: string;
  cover_url?: string;
  cover_image?: string;
  category_name?: string;
  price?: number;
  access_type?: string;
};

const router = useRouter();
const route = useRoute();

const books = ref<Book[]>([]);
const search = ref(String(route.query.q || ""));
const statusMessage = ref("");

const notifyStoreStatus = (message: string) => {
  statusMessage.value = message;
  announceAccessibilityMessage(message);
};

const alert = (message?: string) => {
  if (message) notifyStoreStatus(String(message));
};

const getBookCover = (book: Book) =>
  resolveAssetUrl(book.cover_url || book.cover_image);

const handleImgError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
};

const getWishlist = () => {
  return JSON.parse(localStorage.getItem("wishlist") || "[]");
};

const addToWishlist = async (book: Book) => {
  const token = localStorage.getItem("token");

  if (token) {
    try {
      const { data } = await api.post("/wishlist", { book_id: book.id });
      alert(data?.message || "เพิ่มเข้า Wishlist สำเร็จ");
      return;
    } catch (error: any) {
      alert(error?.response?.data?.message || "เพิ่มเข้า Wishlist ไม่สำเร็จ");
      return;
    }
  }

  const wishlist = getWishlist();

  const exists = wishlist.some(
    (item: Book) => Number(item.id) === Number(book.id),
  );

  if (exists) {
    alert("หนังสือเล่มนี้อยู่ใน Wishlist แล้ว");
    return;
  }

  wishlist.push({
    id: book.id,
    title: book.title,
    author: book.author,
    cover: getBookCover(book),
  });

  localStorage.setItem("wishlist", JSON.stringify(wishlist));
  alert("เพิ่มเข้า Wishlist สำเร็จ");
};

const addToCart = async (bookId: number) => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    router.push({ name: "Login" });
    return;
  }

  try {
    await axios.post(
      `${API_BASE_URL}/api/cart`,
      { book_id: bookId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    alert("เพิ่มลงตะกร้าแล้ว");
  } catch (err: any) {
    alert(err?.response?.data?.message || "เพิ่มไม่สำเร็จ");
  }
};

onMounted(async () => {
  try {
    const { data } = await api.get("/ebooks");
    books.value = Array.isArray(data?.books) ? data.books : [];
  } catch (error) {
    console.error("โหลดหนังสือไม่สำเร็จ", error);
  }
});

watch(
  () => route.query.q,
  (keyword) => {
    search.value = String(keyword || "");
  },
);

const filteredBooks = computed(() => {
  if (!search.value.trim()) return books.value;

  return books.value.filter((book) => {
    const title = book.title?.toLowerCase() || "";
    const author = book.author?.toLowerCase() || "";
    const keyword = search.value.toLowerCase();

    return title.includes(keyword) || author.includes(keyword);
  });
});

const goToBook = (id: number) => {
  notifyStoreStatus("เปิดรายละเอียดหนังสือ");
  router.push({ name: "BookDetail", params: { id } });
};

const goToMyLibrary = () => {
  router.push({ name: "MyLibrary" });
};

const goToWishlist = () => {
  router.push({ name: "WishList" });
};

const goToCart = () => {
  router.push({ name: "Cart" });
};
</script>

<style scoped>
.store-page {
  max-width: var(--content-width);
  min-height: 100%;
  margin: 0 auto;
  padding: var(--page-block, 28px) var(--page-gutter, 20px) 44px;
  background: var(--bg);
}

.store-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.store-header h1 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 36px;
}

.store-header p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.top-btn,
.mini-btn {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-strong);
  cursor: pointer;
  font-weight: 800;
}

.top-btn {
  padding: 12px 16px;
}

.top-btn.primary,
.mini-btn.primary {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--on-primary);
}

.search-box {
  width: 100%;
  max-width: 420px;
  margin-bottom: 24px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-strong);
  font-size: 16px;
  outline: none;
}

.search-box:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
}

.empty-state,
.book-card {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.sr-status {
  min-height: 24px;
  margin: -10px 0 16px;
  color: var(--primary-strong);
  font-weight: 700;
}

.empty-state {
  padding: 24px;
  border-radius: 8px;
  color: var(--text-muted);
  text-align: center;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: 20px;
}

.book-card {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 14px;
}

.book-clickable {
  cursor: pointer;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
}

.book-card img {
  width: 100%;
  height: 280px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 12px;
  background: var(--surface-soft);
}

.book-card h3 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 18px;
  min-height: 52px;
}

.book-card p {
  margin: 0 0 4px;
  color: var(--text);
  min-height: 24px;
}

.book-card small {
  color: var(--text-muted);
  min-height: 20px;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 14px;
  flex-wrap: nowrap;
}

.mini-btn {
  flex: 1;
  min-height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px 12px;
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
  .search-box {
    width: 100%;
  }

  .book-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
  }

  .book-card {
    padding: 10px;
  }

  .book-card img {
    height: auto;
    aspect-ratio: 3 / 4;
  }

  .book-card h3 {
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
