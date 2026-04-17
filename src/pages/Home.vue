<template>
  <div class="page">
    <section class="hero">
      <div class="banner">
        <div class="banner-content">
          <p class="eyebrow">Read and Voice</p>
          <h1>อ่าน E-Book ได้ทุกที่ พร้อมระบบอ่านออกเสียง</h1>
          <p>
            เลือกหนังสือที่ชอบ เพิ่มเข้าชั้นหนังสือ และกลับมาอ่านหรือฟังต่อได้ทันที
          </p>

          <div class="banner-actions">
            <button class="banner-btn primary" @click="goToStore">
              เข้าร้านหนังสือ
            </button>
            <button class="banner-btn secondary" @click="goToMyLibrary">
              ชั้นหนังสือของฉัน
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="action-row">
      <button class="action read" @click="goToStore">
        เลือกอ่านหนังสือ
      </button>
      <button class="action library" @click="goToMyLibrary">
        ชั้นหนังสือของฉัน
      </button>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>หนังสือแนะนำ</h2>
        <router-link to="/store">ดูทั้งหมด</router-link>
      </div>

      <div v-if="books.length === 0" class="empty-box">
        ยังไม่มีหนังสือแสดงผล
      </div>

      <div v-else class="book-grid">
        <article
          class="book-card"
          v-for="book in books"
          :key="book.id"
          @click="goToBook(book.id)"
        >
          <img
            :src="getBookCover(book)"
            :alt="book.title"
            @error="handleImgError"
          />
          <p>{{ book.title }}</p>
          <small>{{ book.author }}</small>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

type Book = {
  id: number;
  title: string;
  author: string;
  cover_url?: string;
  cover_image?: string;
};

const router = useRouter();
const books = ref<Book[]>([]);

const getBookCover = (book: Book) => {
  const cover = book.cover_url || book.cover_image;

  if (!cover) {
    return "/no-cover.png";
  }

  if (cover.startsWith("http://") || cover.startsWith("https://")) {
    return cover;
  }

  return `http://localhost:3000/${cover.replace(/^\/+/, "")}`;
};

const handleImgError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = "/no-cover.png";
};

const goToStore = () => {
  router.push({ name: "Store" });
};

const goToMyLibrary = () => {
  router.push({ name: "MyLibrary" });
};

const goToBook = (id: number) => {
  router.push({ name: "BookDetail", params: { id } });
};

onMounted(async () => {
  try {
    const res = await fetch("http://localhost:3000/api/books");
    const data = await res.json();
    books.value = Array.isArray(data) ? data.slice(0, 8) : [];
  } catch (error) {
    console.error("โหลดข้อมูลหนังสือไม่สำเร็จ:", error);
  }
});
</script>

<style scoped>
.page {
  min-height: 100%;
  padding-bottom: clamp(28px, 4vw, 56px);
  background:
    linear-gradient(120deg, rgba(20, 184, 166, 0.18), rgba(255, 255, 255, 0) 32%),
    linear-gradient(245deg, rgba(255, 183, 3, 0.2), rgba(255, 255, 255, 0) 42%),
    linear-gradient(180deg, rgba(72, 149, 239, 0.12), rgba(244, 114, 182, 0.1) 58%, var(--bg));
}

.hero {
  width: 100%;
  margin: 0;
  padding: clamp(14px, 2.4vw, 34px) clamp(12px, 3vw, 48px) 0;
}

.banner {
  min-height: clamp(320px, 42vh, 520px);
  border-radius: var(--radius);
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 38%),
    linear-gradient(135deg, #04a7c8 0%, #2f80ed 42%, #f15bb5 72%, #ffb703 100%);
  color: var(--on-primary);
  display: flex;
  align-items: center;
  width: 100%;
  padding: clamp(26px, 5vw, 72px);
  box-shadow: var(--shadow);
}

.banner-content {
  max-width: min(760px, 100%);
}

.eyebrow {
  margin: 0 0 10px;
  font-weight: 900;
  letter-spacing: 0;
}

.banner h1 {
  margin: 0 0 14px;
  color: var(--on-primary);
  font-size: clamp(28px, 3.4vw, 56px);
  line-height: 1.2;
  font-weight: 900;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.banner p {
  margin: 0 0 24px;
  font-size: clamp(16px, 1.2vw, 20px);
  line-height: 1.7;
  max-width: 820px;
}

.banner-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.banner-btn,
.action {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 800;
}

.banner-btn {
  padding: 14px 18px;
  font-size: 15px;
  min-height: 48px;
}

.banner-btn.primary {
  background: var(--surface);
  color: var(--primary-strong);
}

.banner-btn.secondary {
  background: rgba(255, 255, 255, 0.16);
  color: var(--on-primary);
  border: 1px solid rgba(255, 255, 255, 0.34);
}

.action-row {
  width: 100%;
  margin: clamp(14px, 2vw, 24px) 0;
  padding: 0 clamp(12px, 3vw, 48px);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(12px, 1.6vw, 22px);
}

.action {
  min-height: clamp(76px, 9vw, 112px);
  color: var(--on-primary);
  font-size: clamp(18px, 2vw, 28px);
  display: grid;
  place-items: center;
  box-shadow: var(--shadow);
  text-align: center;
  padding: 12px;
}

.action.read {
  background: linear-gradient(135deg, #536dfe, #00b4d8);
}

.action.library {
  background: linear-gradient(135deg, #00a896, #ffb703);
}

.section {
  width: 100%;
  margin: 0;
  padding: clamp(10px, 1.4vw, 18px) clamp(12px, 3vw, 48px);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
}

.section-head h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 28px;
}

.section-head a {
  color: var(--primary-strong);
  font-weight: 800;
  text-decoration: none;
}

.empty-box,
.book-card {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.empty-box {
  margin-top: 18px;
  border-radius: var(--radius);
  padding: 24px;
  color: var(--text-muted);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: clamp(14px, 2vw, 28px);
  margin-top: 18px;
}

.book-card {
  border-radius: var(--radius);
  padding: 14px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.book-card:hover {
  transform: translateY(-4px);
}

.book-card img {
  width: 100%;
  aspect-ratio: 3 / 4;
  height: auto;
  object-fit: cover;
  border-radius: 8px;
  display: block;
  background: var(--surface-soft);
}

.book-card p {
  margin: 12px 0 6px;
  color: var(--text-strong);
  font-weight: 800;
}

.book-card small {
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .action-row {
    grid-template-columns: 1fr;
  }

  .banner {
    padding: 28px;
  }

  .banner h1 {
    font-size: 30px;
  }
}

@media (max-width: 640px) {
  .book-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  .hero,
  .action-row,
  .section {
    padding-left: 10px;
    padding-right: 10px;
  }

  .banner {
    min-height: 300px;
    padding: 22px;
  }

  .banner-actions,
  .banner-btn {
    width: 100%;
  }

  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .section-head h2 {
    font-size: 24px;
  }
}
</style>
