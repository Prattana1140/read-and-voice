<template>
  <div class="shelf-page">
    <section class="shelf-hero">
      <div>
        <p class="eyebrow">Read and Voice</p>
        <h1>{{ shelf.title }}</h1>
        <p>{{ shelf.description }}</p>
      </div>

      <div class="hero-books" aria-label="หนังสือเด่น">
        <img
          v-for="book in heroBooks"
          :key="book.id"
          :src="getBookCover(book)"
          :alt="book.title"
          @error="handleImgError"
        />
      </div>
    </section>

    <section class="toolbar">
      <div>
        <strong>{{ displayBooks.length }}</strong>
        <span> รายการ</span>
      </div>

      <input
        v-model="search"
        type="search"
        placeholder="ค้นหาชื่อหนังสือหรือผู้เขียน"
      />
    </section>

    <div v-if="loading" class="state-box">กำลังโหลดหนังสือ...</div>
    <div v-else-if="displayBooks.length === 0" class="state-box">
      ยังไม่มีหนังสือในหมวดนี้
    </div>

    <section v-else class="book-grid">
      <article
        v-for="book in displayBooks"
        :key="book.id"
        class="book-card"
        @click="goToBook(book.id)"
      >
        <div class="cover-wrap">
          <img
            :src="getBookCover(book)"
            :alt="book.title"
            @error="handleImgError"
          />
          <span v-if="shelf.badge" class="badge">{{ shelf.badge }}</span>
        </div>

        <h2>{{ book.title }}</h2>
        <p>{{ book.author }}</p>
        <small v-if="book.category_name">{{ book.category_name }}</small>

        <button type="button">
          {{ Number(book.price || 0) === 0 ? "อ่านฟรี" : "ดูรายละเอียด" }}
        </button>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { API_BASE_URL } from "../utils/api";
import axios from "axios";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

type Book = {
  id: number;
  title: string;
  author: string;
  cover_url?: string;
  cover_image?: string;
  category_name?: string;
  price?: number;
  created_at?: string;
  total_pages?: number;
};

type ShelfConfig = {
  title: string;
  description: string;
  badge?: string;
  mode: "best" | "new" | "promo" | "free" | "classic" | "recommended";
};

const shelves: Record<string, ShelfConfig> = {
  BestSellers: {
    title: "ขายดี",
    description: "รวมหนังสือที่ผู้อ่านเปิดดูและหยิบเข้าชั้นบ่อยที่สุด",
    badge: "ฮิต",
    mode: "best",
  },
  NewReleases: {
    title: "มาใหม่",
    description: "หนังสือล่าสุดที่เพิ่งเพิ่มเข้าสู่ระบบ Read and Voice",
    badge: "ใหม่",
    mode: "new",
  },
  Promotions: {
    title: "โปรโมชั่น",
    description: "คัดหนังสือน่าสนใจสำหรับช่วงโปรโมชันและแคมเปญพิเศษ",
    badge: "โปร",
    mode: "promo",
  },
  FreeBooks: {
    title: "ฟรีกระจาย",
    description: "รวมหนังสือราคา 0 บาทหรือหนังสือที่เปิดให้อ่านฟรี",
    badge: "ฟรี",
    mode: "free",
  },
  HallOfFame: {
    title: "ฮิตขึ้นหิ้ง",
    description: "หนังสือเด่นที่เหมาะเก็บเข้าชั้นและกลับมาอ่านซ้ำ",
    badge: "ขึ้นหิ้ง",
    mode: "classic",
  },
  Recommended: {
    title: "แนะนำ",
    description: "รายการหนังสือที่ระบบคัดมาให้เริ่มอ่านและฟังได้ทันที",
    badge: "แนะนำ",
    mode: "recommended",
  },
};

const route = useRoute();
const router = useRouter();
const books = ref<Book[]>([]);
const loading = ref(true);
const search = ref("");

const shelf = computed(() => {
  return shelves[String(route.name)] || shelves.Recommended;
});

const sortedBooks = computed(() => {
  const items = [...books.value];

  if (shelf.value.mode === "new") {
    return items.sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }

  if (shelf.value.mode === "free") {
    const free = items.filter((book) => Number(book.price || 0) === 0);
    return free.length ? free : items;
  }

  if (shelf.value.mode === "classic") {
    return items.sort((a, b) => Number(b.total_pages || 0) - Number(a.total_pages || 0));
  }

  if (shelf.value.mode === "promo") {
    return items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }

  if (shelf.value.mode === "best") {
    return items.sort((a, b) => Number(b.id) - Number(a.id));
  }

  return items;
});

const displayBooks = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return sortedBooks.value;

  return sortedBooks.value.filter((book) => {
    return (
      book.title.toLowerCase().includes(keyword) ||
      book.author.toLowerCase().includes(keyword) ||
      (book.category_name || "").toLowerCase().includes(keyword)
    );
  });
});

const heroBooks = computed(() => displayBooks.value.slice(0, 4));

const getBookCover = (book: Book) => {
  const cover = book.cover_url || book.cover_image;

  if (!cover) return "/no-cover.png";
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;

  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
};

const handleImgError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
};

const goToBook = (id: number) => {
  router.push({ name: "BookDetail", params: { id } });
};

onMounted(async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/books`);
    books.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("โหลดหนังสือไม่สำเร็จ", error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.shelf-page {
  max-width: 1120px;
  min-height: 100%;
  margin: 0 auto;
  padding: 32px 20px 56px;
}

.shelf-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.72fr);
  gap: 24px;
  align-items: center;
  min-height: 260px;
  border-radius: 22px;
  background:
    radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.72), transparent 24%),
    linear-gradient(135deg, #d8fff6, #fff6ce 58%, #ffd8df);
  box-shadow: var(--shadow);
  padding: clamp(26px, 5vw, 56px);
}

.eyebrow {
  margin: 0 0 10px;
  color: #078367;
  font-weight: 900;
}

.shelf-hero h1 {
  margin: 0;
  color: #0b2f2b;
  font-size: clamp(36px, 5vw, 72px);
  line-height: 1;
}

.shelf-hero p {
  max-width: 620px;
  margin: 16px 0 0;
  color: rgba(11, 47, 43, 0.76);
  font-size: 18px;
  line-height: 1.7;
}

.hero-books {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 190px;
}

.hero-books img {
  width: 112px;
  aspect-ratio: 3 / 4;
  margin-left: -28px;
  border: 4px solid rgba(255, 255, 255, 0.82);
  border-radius: 10px;
  object-fit: cover;
  box-shadow: 0 18px 30px rgba(8, 47, 43, 0.22);
}

.hero-books img:nth-child(2n) {
  transform: translateY(18px) rotate(3deg);
}

.hero-books img:nth-child(2n + 1) {
  transform: translateY(-10px) rotate(-3deg);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin: 30px 0 20px;
}

.toolbar strong {
  color: var(--primary-strong);
}

.toolbar input {
  width: min(420px, 100%);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-strong);
  padding: 12px 16px;
}

.state-box {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  color: var(--text-muted);
  padding: 28px;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 22px;
}

.book-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  cursor: pointer;
  overflow: hidden;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.book-card:hover {
  transform: translateY(-4px);
}

.cover-wrap {
  position: relative;
}

.cover-wrap img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  background: var(--surface-soft);
}

.badge {
  position: absolute;
  top: 0;
  right: 10px;
  background: #ef233c;
  color: white;
  font-size: 12px;
  font-weight: 900;
  padding: 7px 8px;
}

.book-card h2 {
  display: -webkit-box;
  min-height: 44px;
  margin: 12px 12px 5px;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 16px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.book-card p,
.book-card small {
  display: block;
  margin: 0 12px 5px;
  color: var(--text-muted);
}

.book-card button {
  float: right;
  min-width: 76px;
  border: 0;
  border-radius: 4px;
  background: #00b36f;
  color: white;
  cursor: pointer;
  font-weight: 900;
  margin: 8px 12px 12px;
  padding: 8px 10px;
}

@media (max-width: 960px) {
  .book-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .shelf-hero {
    grid-template-columns: 1fr;
  }

  .hero-books {
    justify-content: center;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .book-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
