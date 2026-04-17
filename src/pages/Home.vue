<template>
  <div class="page">
    <section class="category-bar" aria-label="หมวดหนังสือ">
      <button type="button" class="active">ทั้งหมด</button>
      <button type="button">นิยาย</button>
      <button type="button">ความรู้</button>
      <button type="button">เสียงอ่าน</button>
      <button type="button">มาใหม่</button>
      <button type="button">แนะนำ</button>
    </section>

    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">READ AND VOICE</p>
        <h1>อ่านและฟัง E-Book ได้ทุกที่</h1>
        <p>
          เลือกหนังสือที่ชอบ เก็บไว้ในชั้นหนังสือ แล้วกลับมาอ่านหรือฟังเสียงต่อได้ทันที
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

      <div class="hero-stage" aria-label="หนังสือแนะนำ">
        <article
          v-for="book in featuredBooks"
          :key="book.id"
          class="feature-card"
          @click="goToBook(book.id)"
        >
          <img
            :src="getBookCover(book)"
            :alt="book.title"
            @error="handleImgError"
          />
          <div>
            <span>แนะนำ</span>
            <h2>{{ book.title }}</h2>
            <p>{{ book.author }}</p>
          </div>
        </article>

        <div v-if="featuredBooks.length === 0" class="feature-empty">
          <h2>พื้นที่อ่านหนังสือของคุณ</h2>
          <p>เพิ่มหนังสือเล่มแรกเพื่อเริ่มต้นชั้นหนังสือและระบบอ่านออกเสียง</p>
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
          v-for="book in recommendedBooks"
          :key="book.id"
          class="book-card"
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

    <section v-if="newBooks.length > 0" class="section compact-section">
      <div class="section-head">
        <h2>มาใหม่</h2>
        <router-link to="/store">ดูทั้งหมด</router-link>
      </div>

      <div class="book-row">
        <article
          v-for="book in newBooks"
          :key="book.id"
          class="row-card"
          @click="goToBook(book.id)"
        >
          <img
            :src="getBookCover(book)"
            :alt="book.title"
            @error="handleImgError"
          />
          <div>
            <h3>{{ book.title }}</h3>
            <p>{{ book.author }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
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

const featuredBooks = computed(() => books.value.slice(0, 3));
const recommendedBooks = computed(() => books.value.slice(0, 8));
const newBooks = computed(() => books.value.slice(4, 12));

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
    books.value = Array.isArray(data) ? data.slice(0, 12) : [];
  } catch (error) {
    console.error("โหลดข้อมูลหนังสือไม่สำเร็จ:", error);
  }
});
</script>

<style scoped>
.page {
  min-height: 100%;
  padding-bottom: clamp(28px, 4vw, 56px);
  background: var(--bg);
}

.category-bar {
  display: flex;
  gap: 8px;
  width: 100%;
  min-height: 54px;
  padding: 10px clamp(12px, 3vw, 48px);
  overflow-x: auto;
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  border-bottom: 1px solid var(--border);
  scrollbar-width: thin;
}

.category-bar button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-weight: 900;
  padding: 9px 12px;
}

.category-bar button.active,
.category-bar button:hover {
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.hero {
  display: grid;
  grid-template-columns: minmax(280px, 0.86fr) minmax(0, 1.14fr);
  align-items: stretch;
  gap: clamp(14px, 2vw, 26px);
  width: 100%;
  margin: 0;
  padding: clamp(18px, 2.4vw, 34px) clamp(12px, 3vw, 48px) 0;
}

.hero-copy,
.hero-stage {
  min-height: clamp(320px, 42vh, 500px);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: clamp(26px, 5vw, 72px);
}

.hero-stage {
  display: grid;
  grid-template-columns: repeat(3, minmax(170px, 1fr));
  gap: 12px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 12px;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--primary-strong);
  font-weight: 900;
  letter-spacing: 0;
}

.hero-copy h1 {
  margin: 0 0 14px;
  color: var(--text-strong);
  font-size: clamp(28px, 3.4vw, 56px);
  line-height: 1.2;
  font-weight: 900;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.hero-copy p {
  margin: 0 0 24px;
  max-width: 680px;
  color: var(--text);
  font-size: clamp(16px, 1.2vw, 20px);
  line-height: 1.7;
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
  font-weight: 900;
}

.banner-btn {
  min-height: 48px;
  padding: 14px 18px;
  font-size: 15px;
}

.banner-btn.primary {
  background: var(--primary);
  color: var(--on-primary);
}

.banner-btn.secondary {
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-strong);
}

.feature-card {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: var(--surface-soft);
  cursor: pointer;
  border: 1px solid var(--border);
}

.feature-card img {
  width: 100%;
  height: 100%;
  min-height: 210px;
  object-fit: cover;
  background: var(--surface-soft);
}

.feature-card div {
  padding: 16px;
}

.feature-card span {
  display: inline-flex;
  margin-bottom: 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary-soft) 92%, white);
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
  padding: 5px 8px;
}

.feature-card h2,
.feature-card p {
  margin: 0;
}

.feature-card h2 {
  color: var(--text-strong);
  font-size: clamp(18px, 1.6vw, 26px);
  line-height: 1.25;
}

.feature-card p {
  margin-top: 6px;
  color: var(--text-muted);
  font-weight: 700;
}

.feature-empty {
  display: grid;
  grid-column: 1 / -1;
  min-height: 100%;
  place-content: center;
  color: var(--text-strong);
  text-align: center;
  padding: 24px;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(12px, 1.6vw, 22px);
  width: 100%;
  margin: clamp(14px, 2vw, 24px) 0;
  padding: 0 clamp(12px, 3vw, 48px);
}

.action {
  display: grid;
  min-height: clamp(76px, 9vw, 112px);
  place-items: center;
  padding: 12px;
  color: white;
  font-size: clamp(18px, 2vw, 28px);
  text-align: center;
  box-shadow: var(--shadow);
}

.action.read {
  background: var(--secondary);
  color: var(--on-primary);
}

.action.library {
  background: var(--primary);
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
  font-weight: 900;
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
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: clamp(14px, 2vw, 28px);
  margin-top: 18px;
}

.book-card {
  overflow: hidden;
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.book-card:hover {
  transform: translateY(-4px);
}

.book-card img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  height: auto;
  object-fit: cover;
  background: var(--surface-soft);
}

.book-card p {
  margin: 12px 12px 6px;
  color: var(--text-strong);
  font-weight: 900;
}

.book-card small {
  display: block;
  margin: 0 12px 14px;
  color: var(--text-muted);
}

.compact-section {
  padding-top: 6px;
}

.book-row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(260px, 1fr);
  gap: 14px;
  margin-top: 18px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: thin;
}

.row-card {
  display: grid;
  grid-template-columns: 82px 1fr;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  cursor: pointer;
  padding: 10px;
}

.row-card img {
  width: 82px;
  aspect-ratio: 3 / 4;
  border-radius: 8px;
  object-fit: cover;
  background: var(--surface-soft);
}

.row-card h3 {
  margin: 0 0 6px;
  color: var(--text-strong);
  font-size: 16px;
  line-height: 1.35;
}

.row-card p {
  margin: 0;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .action-row {
    grid-template-columns: 1fr;
  }

  .hero-stage {
    min-height: 300px;
  }
}

@media (max-width: 640px) {
  .book-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .category-bar,
  .hero,
  .action-row,
  .section {
    padding-left: 10px;
    padding-right: 10px;
  }

  .hero-copy {
    min-height: 290px;
    padding: 22px;
  }

  .hero-stage {
    grid-template-columns: minmax(240px, 1fr);
    grid-auto-flow: column;
    grid-auto-columns: minmax(240px, 82vw);
    overflow-x: auto;
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
