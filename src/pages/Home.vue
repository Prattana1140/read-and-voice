<template>
  <div class="page">
    <section class="category-bar" aria-label="หมวดหนังสือ">
      <button type="button" class="active" @click="goToStore">ทั้งหมด</button>
      <button type="button" @click="goToShelf('BestSellers')">ขายดี</button>
      <button type="button" @click="goToShelf('NewReleases')">มาใหม่</button>
      <button type="button" @click="goToShelf('Promotions')">โปรโมชั่น</button>
      <button type="button" @click="goToShelf('FreeBooks')">ฟรีกระจาย</button>
      <button type="button" @click="goToShelf('HallOfFame')">ฮิตขึ้นหิ้ง</button>
      <button type="button" @click="goToShelf('Recommended')">แนะนำ</button>
    </section>

    <section
      class="hero-strip"
      aria-label="แบนเนอร์แนะนำ"
      @mouseenter="pauseCarousel"
      @mouseleave="startCarousel"
    >
      <div
        class="hero-track"
        :style="{ transform: `translateX(-${activeBannerIndex * bannerShiftPercent}%)` }"
      >
        <article
          v-for="(book, index) in bannerBooks"
          :key="book.id"
          class="promo-banner"
          :class="`tone-${(index % 6) + 1}`"
          @click="goToBook(book.id)"
        >
          <div class="promo-copy">
            <span>{{ bannerLabels[index % bannerLabels.length] }}</span>
            <h1>{{ book.title }}</h1>
            <p>{{ book.author }}</p>
          </div>
          <img
            :src="getBookCover(book)"
            :alt="book.title"
            @error="handleImgError"
          />
        </article>

        <article v-if="bannerBooks.length === 0" class="promo-banner tone-1 empty-banner">
          <div class="promo-copy">
            <span>Read and Voice</span>
            <h1>อ่านและฟัง E-Book ได้ทุกที่</h1>
            <p>เพิ่มหนังสือเล่มแรกเพื่อเริ่มต้นพื้นที่อ่านหนังสือของคุณ</p>
          </div>
        </article>
      </div>

      <div v-if="bannerPages > 1" class="hero-dots" aria-label="เลือกแบนเนอร์">
        <button
          v-for="index in bannerPages"
          :key="index"
          type="button"
          :class="{ active: index - 1 === activeBannerIndex }"
          :aria-label="`แบนเนอร์ชุดที่ ${index}`"
          @click="setActiveBanner(index - 1)"
        ></button>
      </div>
    </section>

    <main class="storefront">
      <section class="quick-actions">
        <button class="quick-card read" @click="goToStore">อ่านหนังสือ</button>
        <button class="quick-card library" @click="goToMyLibrary">ชั้นหนังสือของฉัน</button>
        <button class="quick-card coin" @click="goToCoinWallet">เติม coin</button>
      </section>

      <div v-if="books.length === 0" class="empty-box">
        ยังไม่มีหนังสือแสดงผล
      </div>

      <section
        v-for="section in homeSections"
        v-else
        :key="section.title"
        class="shelf-section"
      >
        <div class="section-head">
          <h2>{{ section.title }}</h2>
          <router-link :to="section.to">ดูทั้งหมด</router-link>
        </div>

        <div class="book-grid">
          <article
            v-for="book in section.books"
            :key="`${section.title}-${book.id}`"
            class="book-card"
            @click="goToBook(book.id)"
          >
            <img
              :src="getBookCover(book)"
              :alt="book.title"
              @error="handleImgError"
            />
            <div class="book-info">
              <p>{{ book.title }}</p>
              <small>{{ book.author }}</small>
              <strong>อ่านเลย</strong>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { API_BASE_URL } from "../utils/api";
import { computed, ref, onMounted, onUnmounted } from "vue";
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
const activeBannerIndex = ref(0);
let carouselTimer: ReturnType<typeof window.setInterval> | undefined;

const bannerLabels = ["อ่านและฟัง", "ขายดี", "มาใหม่", "โปรโมชั่น", "ฟรีกระจาย", "แนะนำ"];
const bannerShiftPercent = 16.6667;
const visibleBannerCount = 6;

const bannerBooks = computed(() => books.value.slice(0, 12));
const bannerPages = computed(() =>
  Math.max(1, bannerBooks.value.length - visibleBannerCount + 1),
);

const homeSections = computed(() => {
  const sectionBooks = books.value;
  return [
    {
      title: "มาใหม่",
      to: "/store",
      books: sectionBooks.slice(0, 5),
    },
    {
      title: "ขายดี",
      to: "/best-sellers",
      books: sectionBooks.slice(5, 10),
    },
    {
      title: "ฟรีกระจาย",
      to: "/free-books",
      books: sectionBooks.slice(10, 15),
    },
    {
      title: "แนะนำ",
      to: "/recommended",
      books: sectionBooks.slice(15, 20),
    },
  ].filter((section) => section.books.length > 0);
});

const getBookCover = (book: Book) => {
  const cover = book.cover_url || book.cover_image;

  if (!cover) {
    return "/no-cover.png";
  }

  if (cover.startsWith("http://") || cover.startsWith("https://")) {
    return cover;
  }

  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
};

const handleImgError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
};

const goToStore = () => {
  router.push({ name: "Store" });
};

const goToShelf = (name: string) => {
  router.push({ name });
};

const goToMyLibrary = () => {
  router.push({ name: "MyLibrary" });
};

const goToCoinWallet = () => {
  router.push({ name: "CoinWallet" });
};

const goToBook = (id: number) => {
  router.push({ name: "BookDetail", params: { id } });
};

const stopCarousel = () => {
  if (carouselTimer) {
    window.clearInterval(carouselTimer);
    carouselTimer = undefined;
  }
};

const startCarousel = () => {
  stopCarousel();
  if (bannerPages.value <= 1) return;

  carouselTimer = window.setInterval(() => {
    activeBannerIndex.value =
      (activeBannerIndex.value + 1) % bannerPages.value;
  }, 4200);
};

const pauseCarousel = () => {
  stopCarousel();
};

const setActiveBanner = (index: number) => {
  activeBannerIndex.value = Math.min(Math.max(index, 0), bannerPages.value - 1);
  startCarousel();
};

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/books`);
    const data = await res.json();
    books.value = Array.isArray(data) ? data.slice(0, 24) : [];
    activeBannerIndex.value = 0;
    startCarousel();
  } catch (error) {
    console.error("โหลดข้อมูลหนังสือไม่สำเร็จ:", error);
  }
});

onUnmounted(() => {
  stopCarousel();
});
</script>

<style scoped>
.page {
  min-height: 100%;
  padding-bottom: 56px;
  background:
    radial-gradient(circle at top, color-mix(in srgb, var(--primary-soft) 58%, transparent), transparent 42%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, var(--bg)) 0%, var(--bg) 100%);
}

.category-bar {
  display: flex;
  justify-content: center;
  gap: 14px;
  width: 100%;
  min-height: 46px;
  padding: 8px clamp(12px, 3vw, 48px);
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
  font-size: 14px;
  font-weight: 900;
  padding: 8px 10px;
}

.category-bar button.active,
.category-bar button:hover {
  background: transparent;
  color: var(--primary-strong);
  box-shadow: inset 0 -3px 0 var(--primary);
}

.hero-strip {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface) 90%, var(--bg));
  border-bottom: 1px solid var(--border);
  padding: 10px 0 24px;
}

.hero-track {
  display: flex;
  width: 100%;
  transition: transform 0.55s ease;
  will-change: transform;
}

.promo-banner {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px;
  align-items: center;
  flex: 0 0 calc(100% / 6);
  min-height: 120px;
  overflow: hidden;
  border: 4px solid color-mix(in srgb, var(--surface) 92%, transparent);
  border-radius: 8px;
  background:
    radial-gradient(circle at 82% 28%, rgba(255, 255, 255, 0.62), transparent 28%),
    linear-gradient(130deg, #b6f3e7, #fff7c8 52%, #ffcad4);
  color: #163b37;
  cursor: pointer;
  padding: 14px;
}

.promo-banner::before {
  content: "";
  position: absolute;
  inset: auto -20% -58% 34%;
  z-index: -1;
  height: 78%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.34);
  transform: rotate(-12deg);
}

.promo-banner.tone-2 {
  background:
    radial-gradient(circle at 76% 24%, rgba(255, 255, 255, 0.66), transparent 26%),
    linear-gradient(135deg, #bde9ff, #d8f7ff 48%, #ffe5a8);
}

.promo-banner.tone-3 {
  background:
    radial-gradient(circle at 76% 24%, rgba(255, 255, 255, 0.62), transparent 26%),
    linear-gradient(135deg, #b5f7bc, #f0ffd9 48%, #fff2a8);
}

.promo-banner.tone-4 {
  background:
    radial-gradient(circle at 78% 26%, rgba(255, 255, 255, 0.64), transparent 28%),
    linear-gradient(135deg, #d7f7ff, #d9ffe8 48%, #ffd9ea);
}

.promo-banner.tone-5 {
  background:
    radial-gradient(circle at 78% 26%, rgba(255, 255, 255, 0.64), transparent 28%),
    linear-gradient(135deg, #e3f1ff, #fff0c9 48%, #d7ffe3);
}

.promo-banner.tone-6 {
  background:
    radial-gradient(circle at 78% 26%, rgba(255, 255, 255, 0.64), transparent 28%),
    linear-gradient(135deg, #ccfff4, #f5fdd1 48%, #e8dcff);
}

.promo-copy {
  position: relative;
  z-index: 1;
  max-width: 100%;
  min-width: 0;
}

.promo-copy span {
  display: inline-flex;
  margin-bottom: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #078367;
  font-size: 11px;
  font-weight: 900;
  padding: 4px 8px;
}

.promo-copy h1 {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #0b2f2b;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.promo-copy p {
  display: -webkit-box;
  margin: 7px 0 0;
  overflow: hidden;
  color: rgba(11, 47, 43, 0.72);
  font-size: 12px;
  font-weight: 800;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.promo-banner img {
  position: relative;
  z-index: 1;
  justify-self: end;
  width: 64px;
  aspect-ratio: 3 / 4;
  border-radius: 4px;
  object-fit: cover;
  box-shadow: 0 8px 16px rgba(8, 47, 43, 0.18);
}

.hero-dots {
  position: absolute;
  bottom: 7px;
  left: 50%;
  display: flex;
  gap: 9px;
  transform: translateX(-50%);
}

.hero-dots button {
  width: 7px;
  height: 7px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 88%, var(--surface));
  cursor: pointer;
  padding: 0;
  transition:
    background 0.18s ease,
    transform 0.18s ease,
    width 0.18s ease;
}

.hero-dots button.active {
  width: 18px;
  background: var(--primary);
}

.storefront {
  width: min(100% - 28px, 760px);
  margin: 0 auto;
  padding-top: 22px;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 22px;
}

.quick-card {
  min-height: 46px;
  border: 0;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  font-size: 15px;
  font-weight: 900;
  padding: 8px 12px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.2s ease,
    filter 0.2s ease,
    box-shadow 0.2s ease;
}

.quick-card.read {
  background: linear-gradient(135deg, color-mix(in srgb, var(--secondary) 92%, white), var(--secondary));
}

.quick-card.library {
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 92%, white), var(--primary-strong));
}

.quick-card.coin {
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary-strong) 72%, #1f7a8c), #1f7a8c);
}

.quick-card:hover {
  filter: brightness(1.04);
  transform: translateY(-1px);
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.12);
}

.shelf-section {
  padding: 18px 0 12px;
}

.hero-dots button:hover {
  background: color-mix(in srgb, var(--primary) 82%, white);
  transform: translateY(-1px);
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
  max-width: 1120px;
  margin-inline: auto;
  padding: clamp(28px, 4vw, 54px) 20px 0;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  min-height: 28px;
}

.section-head h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 900;
}

.section-head a {
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
  text-decoration: none;
}

.empty-box,
.book-card {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: none;
}

.empty-box {
  margin-top: 18px;
  border-radius: var(--radius);
  padding: 24px;
  color: var(--text-muted);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.book-card {
  overflow: hidden;
  border-radius: 2px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.book-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}

.book-card img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  height: auto;
  object-fit: cover;
  background: var(--surface-soft);
}

.book-info {
  padding: 8px 7px 9px;
}

.book-info p {
  display: -webkit-box;
  margin: 0 0 5px;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 900;
  line-height: 1.35;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.book-info small {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
}

.book-info strong {
  display: inline-flex;
  margin-top: 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 90%, white);
  color: var(--on-primary);
  font-size: 11px;
  padding: 3px 7px;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .category-bar,
  .action-row,
  .section {
    padding-left: 10px;
    padding-right: 10px;
  }

  .hero-strip {
    padding-top: 8px;
  }

  .promo-banner {
    grid-template-columns: minmax(0, 1fr) 112px;
    min-height: 220px;
    padding: 20px;
  }

  .promo-copy h1 {
    font-size: 24px;
  }

  .promo-copy p {
    font-size: 14px;
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
