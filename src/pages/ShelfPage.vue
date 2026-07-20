<template>
  <div class="shelf-page">
    <nav class="shelf-tabs" aria-label="หมวดหนังสือ">
      <router-link
        v-for="tab in shelfTabs"
        :key="tab.to"
        :to="tab.to"
        :class="{ active: tab.name === route.name }"
      >
        {{ tab.label }}
      </router-link>
    </nav>

    <section v-if="shelf.mode === 'promo'" class="promo-strip" aria-label="โปรโมชันเด่น">
      <div
        v-for="item in promoHeroItems"
        :key="`promo-hero-${item.book.id}`"
        class="promo-strip-card"
        :class="item.theme"
        @click="goToBook(item.book.id)"
      >
        <div class="promo-strip-copy">
          <span>{{ item.label }}</span>
          <strong>{{ item.headline }}</strong>
          <small>{{ item.subtitle }}</small>
        </div>
        <div class="promo-strip-covers" aria-hidden="true">
          <img
            v-for="cover in item.covers"
            :key="cover"
            :src="resolveAssetUrl(cover)"
            alt=""
            @error="handleImgError"
          />
        </div>
        <em>{{ item.badge }}</em>
      </div>
    </section>

    <main class="shelf-content">
      <section class="shelf-toolbar">
        <div>
          <h2>{{ shelf.title }}</h2>
        </div>

        <div class="pager" aria-label="หน้า">
          <button type="button" disabled>‹</button>
          <span>หน้าที่ 1</span>
          <button type="button">›</button>
        </div>
      </section>

      <section class="search-row" aria-label="ค้นหาหนังสือ">
        <input
          v-model="search"
          type="search"
          placeholder="ค้นหาชื่อหนังสือหรือผู้เขียน"
        />
        <span>{{ displayBooks.length }} รายการ</span>
      </section>

      <div v-if="loading" class="state-box">กำลังโหลดหนังสือ...</div>
      <div v-else-if="displayBooks.length === 0" class="state-box">
        ยังไม่มีหนังสือในหมวดนี้
      </div>

      <div v-else-if="shelf.mode === 'free'" class="free-shelves">
        <section
          v-for="section in freeSections"
          :key="section.title"
          class="free-section"
        >
          <div class="free-section-head">
            <h3>{{ section.title }}</h3>
            <router-link class="view-all-action" to="/free-books">ดูทั้งหมด</router-link>
          </div>

          <div class="book-grid">
            <article
              v-for="book in section.books"
              :key="`${section.title}-${book.id}`"
              class="book-card"
              @click="goToBook(book.id)"
            >
              <div class="cover-wrap">
                <img
                  :src="getBookCover(book)"
                  :alt="getBookTitle(book)"
                  @error="handleImgError"
                />
              </div>

              <h3>{{ getBookTitle(book) }}</h3>
              <p>{{ book.author || "Read and Voice" }}</p>

              <div class="meta-line">
                <span>★★★★★</span>
                <small>{{ getRatingText(book) }}</small>
              </div>

              <strong class="price free-price">ฟรี</strong>
            </article>
          </div>
        </section>
      </div>

      <div v-else-if="shelf.mode === 'promo'" class="promo-shelves">
        <section
          v-for="section in promoSections"
          :key="section.title"
          class="promo-section"
        >
          <div class="promo-section-head">
            <div>
              <h3>{{ section.title }}</h3>
              <span>เหลืออีก {{ section.daysLeft }} วัน</span>
            </div>
            <router-link class="view-all-action" to="/promotions">ดูทั้งหมด</router-link>
          </div>

          <div class="promo-layout">
            <article
              v-if="section.feature"
              class="promo-feature"
              @click="goToBook(section.feature.id)"
            >
              <img
                :src="getBookCover(section.feature)"
                :alt="getBookTitle(section.feature)"
                @error="handleImgError"
              />
              <div>
                <span>ลดสูงสุด</span>
                <strong>{{ getDiscount(section.feature) }}%</strong>
                <p>{{ getBookTitle(section.feature) }}</p>
              </div>
            </article>

            <div class="promo-book-grid">
              <article
                v-for="book in section.books"
                :key="`${section.title}-${book.id}`"
                class="book-card promo-card"
                @click="goToBook(book.id)"
              >
                <div class="cover-wrap">
                  <img
                    :src="getBookCover(book)"
                    :alt="getBookTitle(book)"
                    @error="handleImgError"
                  />
                  <span v-if="getDiscount(book) > 0" class="discount-ribbon">-{{ getDiscount(book) }}%</span>
                </div>

                <h3>{{ getBookTitle(book) }}</h3>
                <p>{{ book.author || "Read and Voice" }}</p>

                <div class="meta-line">
                  <span>★★★★★</span>
                  <small>{{ getRatingText(book) }}</small>
                </div>

                <small class="countdown">◷ เหลืออีก {{ getPromoRemaining(book) }} วัน</small>

                <strong class="price">
                  {{ Number(book.price || 0) <= 0 ? "ฟรี" : `฿ ${book.price}` }}
                </strong>
              </article>
            </div>
          </div>
        </section>
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
              :alt="getBookTitle(book)"
              @error="handleImgError"
            />
            <span
              v-if="getRibbonText(book)"
              class="ribbon"
              :class="{ discount: isDiscountRibbon(book) }"
            >
              {{ getRibbonText(book) }}
            </span>
          </div>

          <h3>{{ getBookTitle(book) }}</h3>
          <p>{{ book.author || "Read and Voice" }}</p>

          <div class="meta-line">
            <span v-if="shelf.mode !== 'new'">★★★★★</span>
            <small>{{ getRatingText(book) }}</small>
          </div>

          <strong class="price">
            {{ Number(book.price || 0) <= 0 ? "ฟรี" : `฿ ${book.price}` }}
          </strong>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import api, { resolveAssetUrl } from "../utils/api";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "../utils/i18n";
import { localizedTitle } from "../utils/localizedContent";

type Book = {
  id: number;
  title: string;
  title_th?: string;
  title_en?: string;
  author: string;
  cover_url?: string;
  cover_image?: string;
  category_name?: string;
  price?: number;
  created_at?: string;
  total_pages?: number;
  average_rating?: number;
  review_count?: number;
  read_count?: number;
  promo_discount_percent?: number;
  active_promo_discount_percent?: number;
  promo_days_left?: number;
  promo_start_at?: string | null;
  promo_end_at?: string | null;
  is_best_seller?: number;
  is_new_release?: number;
  is_promotion?: number;
  is_free_book?: number;
  is_hall_of_fame?: number;
  is_recommended?: number;
};

type ShelfConfig = {
  title: string;
  badge: string;
  mode: "best" | "new" | "promo" | "free" | "classic" | "recommended";
  endpoint: string;
};

type ShelfResponse = {
  shelf: string;
  books: Book[];
  count: number;
};

const shelfTabs = [
  { label: "หน้าแรก", to: "/", name: "Home" },
  { label: "ขายดี", to: "/best-sellers", name: "BestSellers" },
  { label: "มาใหม่", to: "/new-releases", name: "NewReleases" },
  { label: "โปรโมชัน", to: "/promotions", name: "Promotions" },
  { label: "ฟรีกระจาย", to: "/free-books", name: "FreeBooks" },
  { label: "ฮิตขึ้นหิ้ง", to: "/hall-of-fame", name: "HallOfFame" },
  { label: "แนะนำ", to: "/recommended", name: "Recommended" },
];

const shelves: Record<string, ShelfConfig> = {
  BestSellers: {
    title: "ขายดี",
    badge: "ขายดี",
    mode: "best",
    endpoint: "/best-sellers",
  },
  NewReleases: {
    title: "มาใหม่",
    badge: "มาใหม่",
    mode: "new",
    endpoint: "/new-releases",
  },
  Promotions: {
    title: "โปรโมชัน",
    badge: "ลดราคา",
    mode: "promo",
    endpoint: "/promotions",
  },
  FreeBooks: {
    title: "ฟรีกระจาย",
    badge: "ฟรี",
    mode: "free",
    endpoint: "/free-books",
  },
  HallOfFame: {
    title: "ฮิตขึ้นหิ้ง",
    badge: "ขายดี",
    mode: "classic",
    endpoint: "/hall-of-fame",
  },
  Recommended: {
    title: "แนะนำ",
    badge: "แนะนำ",
    mode: "recommended",
    endpoint: "/recommended",
  },
};

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();
const books = ref<Book[]>([]);
const loading = ref(true);
const search = ref("");

const shelf = computed(() => shelves[String(route.name)] || shelves.Recommended);

const sortedBooks = computed(() => {
  const items = [...books.value];

  if (shelf.value.mode === "new") {
    return items.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );
  }

  if (shelf.value.mode === "free") {
    const free = items.filter((book) => Number(book.price || 0) <= 0);
    return free.length ? free : items;
  }

  if (shelf.value.mode === "promo") {
    return items.sort((a, b) => {
      const discountGap = getDiscount(b) - getDiscount(a);
      if (discountGap !== 0) return discountGap;
      return Number(a.promo_days_left || 0) - Number(b.promo_days_left || 0);
    });
  }

  if (shelf.value.mode === "classic") {
    return items.sort((a, b) => Number(b.total_pages || 0) - Number(a.total_pages || 0));
  }

  if (shelf.value.mode === "best") {
    return items.sort((a, b) => Number(b.read_count || 0) - Number(a.read_count || 0));
  }

  return items;
});

const displayBooks = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return sortedBooks.value;

  return sortedBooks.value.filter((book) => {
    return (
      (book.title || "").toLowerCase().includes(keyword) ||
      getBookTitle(book).toLowerCase().includes(keyword) ||
      book.author.toLowerCase().includes(keyword) ||
      (book.category_name || "").toLowerCase().includes(keyword)
    );
  });
});

const freeSourceBooks = computed(() => {
  const free = sortedBooks.value.filter((book) => Number(book.price || 0) <= 0);
  return free.length ? free : sortedBooks.value;
});

const freeSections = computed(() => {
  const items = freeSourceBooks.value;
  const fallbackItems = items.length ? items : displayBooks.value;

  return [
    {
      title: "ฟรีกระจาย",
      badge: "ขายดี",
      books: fallbackItems.slice(0, 5),
    },
    {
      title: "ฟรีในหมวดนิยายและวรรณกรรม",
      badge: "ฟรี",
      books: fallbackItems.slice(5, 10),
    },
    {
      title: "ฟรีในหมวดความรู้และพัฒนาตัวเอง",
      badge: "ฟรี",
      books: fallbackItems.slice(10, 15),
    },
  ].filter((section) => section.books.length > 0);
});

const promoCampaigns = [
  {
    label: "MAY MY DAY",
    headline: "อ่านให้ตาค้าง",
    subtitle: "หยิบเล่มที่ใช่ก่อนหมดโปร",
    badge: "45%",
    theme: "theme-blue",
  },
  {
    label: "Final Call",
    headline: "รับซื้อตอนนี้",
    subtitle: "โปรนี้เหลือเวลาอีกไม่นาน",
    badge: "LAST",
    theme: "theme-coral",
  },
  {
    label: "Hot Deal",
    headline: "ลดแรงประจำวัน",
    subtitle: "รวมเล่มเด่นที่นักอ่านกำลังตาม",
    badge: "SALE",
    theme: "theme-warm",
  },
];

const promoHeroItems = computed(() => {
  const items = sortedBooks.value.length ? sortedBooks.value : books.value;
  return items.slice(0, 6).map((book, index) => {
    const campaign = promoCampaigns[index % promoCampaigns.length];
    const covers = [book, items[index + 1], items[index + 2]]
      .filter(Boolean)
      .map((item) => item.cover_url || item.cover_image || "")
      .filter(Boolean);

    return {
      ...campaign,
      book,
      headline: index % 2 === 0 ? campaign.headline : getBookTitle(book),
      subtitle: book.author || campaign.subtitle,
      badge: getDiscount(book) > 0 ? `-${getDiscount(book)}%` : "",
      covers,
    };
  });
});

const promoSections = computed(() => {
  const items = sortedBooks.value.length ? sortedBooks.value : books.value;
  const chunks = [items.slice(0, 9), items.slice(9, 18), items.slice(18, 27)].filter(
    (chunk) => chunk.length > 0,
  );

  return chunks.map((chunk, index) => ({
    title:
      index === 0
        ? "โปรโมชันเด่นประจำสัปดาห์"
        : index === 1
          ? "ชุดลดราคาที่ผู้อ่านกดบ่อย"
          : "โปรโมชันเพิ่มเติม",
    daysLeft: Number(chunk[0]?.promo_days_left || 0),
    feature: chunk[0],
    books: chunk.slice(1),
  }));
});

const getBookCover = (book: Book) => resolveAssetUrl(book.cover_url || book.cover_image);

const getBookTitle = (book: Book | null | undefined) =>
  localizedTitle(book, locale.value) || book?.title || "";

const getRatingText = (book: Book) => {
  const reviewCount = Number(book.review_count || 0);
  const averageRating = Number(book.average_rating || 0);

  if (reviewCount <= 0) return "ยังไม่มีรีวิว";
  return `${averageRating.toFixed(1)} (${reviewCount} รีวิว)`;
};

const hasActiveDiscount = (book: Book) => {
  const discount = Number(book.active_promo_discount_percent ?? book.promo_discount_percent ?? 0);
  if (!Number.isFinite(discount) || discount <= 0) return false;

  const now = Date.now();
  const startAt = book.promo_start_at ? new Date(book.promo_start_at).getTime() : null;
  const endAt = book.promo_end_at ? new Date(book.promo_end_at).getTime() : null;
  if (startAt && Number.isFinite(startAt) && startAt > now) return false;
  if (endAt && Number.isFinite(endAt) && endAt < now) return false;
  return true;
};

const getDiscount = (book: Book) => {
  if (!hasActiveDiscount(book)) return 0;
  return Math.round(Number(book.active_promo_discount_percent ?? book.promo_discount_percent ?? 0));
};

const getPromoRemaining = (book: Book) => Number(book.promo_days_left || 0);

const getRibbonText = (book: Book) => {
  const discount = getDiscount(book);
  if (discount > 0) return `-${discount}%`;
  if (Number(book.is_best_seller || 0) === 1) return "Best Seller";
  return "";
};

const isDiscountRibbon = (book: Book) => getDiscount(book) > 0;

const handleImgError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
};

const goToBook = (id: number) => {
  router.push({ name: "BookDetail", params: { id } });
};

async function loadShelfBooks() {
  loading.value = true;

  try {
    const { data } = await api.get<ShelfResponse>(shelf.value.endpoint);
    books.value = Array.isArray(data?.books) ? data.books : [];
  } catch (error) {
    console.error("โหลดหนังสือไม่สำเร็จ", error);
    books.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.name,
  () => {
    search.value = "";
    void loadShelfBooks();
  },
  { immediate: true },
);
</script>

<style scoped>
.shelf-page {
  min-height: 100%;
  background: var(--bg);
  color: var(--text-strong);
  padding-bottom: 64px;
}

.shelf-tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 18px;
  min-height: 34px;
  background: color-mix(in srgb, var(--surface-soft) 72%, var(--bg));
  border-bottom: 1px solid #e6ecea;
  overflow-x: hidden;
  padding: 0 16px;
}

.shelf-tabs a {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: inset 0 0 0 transparent;
}

.shelf-tabs a:hover,
.shelf-tabs a.active {
  color: #008e72;
  box-shadow: inset 0 -2px 0 #00b894;
}

.promo-strip {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(520px, 1fr);
  width: 100%;
  overflow: hidden;
  background: var(--surface);
  border-bottom: 1px solid #e6ecea;
}

.promo-strip-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, 34%);
  align-items: stretch;
  min-height: 198px;
  overflow: hidden;
  border-right: 4px solid #ffffff;
  background: linear-gradient(105deg, #0676f9 0%, #0097ff 52%, #0063d8 100%);
  color: #ffffff;
  cursor: pointer;
  padding: 0;
}

.promo-strip-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.34), transparent 17%),
    radial-gradient(circle at 86% 18%, rgba(255, 255, 255, 0.24), transparent 22%),
    linear-gradient(135deg, rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.04));
}

.promo-strip-card.theme-coral {
  background: linear-gradient(105deg, #fb5f72 0%, #ff8973 45%, #ffd6c8 100%);
}

.promo-strip-card.theme-warm {
  background: linear-gradient(105deg, #d6a176 0%, #f5d3ad 48%, #bd704f 100%);
}

.promo-strip-copy {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: center;
  justify-items: start;
  min-width: 0;
  padding: clamp(18px, 2vw, 28px);
}

.promo-strip-card span {
  display: inline-flex;
  color: rgba(255, 255, 255, 0.94);
  font-size: 16px;
  font-weight: 900;
}

.promo-strip-card strong {
  display: -webkit-box;
  margin-top: 8px;
  overflow: hidden;
  color: #ffffff;
  font-size: clamp(22px, 2.7vw, 38px);
  font-weight: 900;
  line-height: 1.05;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.32),
    0 8px 18px rgba(0, 0, 0, 0.22);
}

.promo-strip-card small {
  display: -webkit-box;
  margin-top: 8px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.9);
  font-size: 15px;
  font-weight: 800;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.promo-strip-covers {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 16px 24px 16px 0;
}

.promo-strip-covers img {
  width: clamp(68px, 6.5vw, 112px);
  aspect-ratio: 3 / 4;
  flex: 0 0 auto;
  border: 3px solid rgba(255, 255, 255, 0.88);
  border-radius: 2px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.28);
}

.promo-strip-covers img + img {
  margin-left: -22%;
}

.promo-strip-covers img:first-child {
  transform: translateY(-5%) rotate(-2deg);
}

.promo-strip-covers img:nth-child(2) {
  transform: translateY(8%) rotate(3deg);
}

.promo-strip-covers img:nth-child(3) {
  transform: translateY(-1%) rotate(2deg);
}

.promo-strip-card em {
  position: absolute;
  right: 18px;
  bottom: 14px;
  z-index: 2;
  min-width: 64px;
  border-radius: 999px;
  background: #ffffff;
  color: #0f5ee8;
  font-size: clamp(16px, 1.9vw, 26px);
  font-style: normal;
  font-weight: 900;
  line-height: 1;
  padding: 9px 12px;
  text-align: center;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
}

.theme-coral em,
.theme-warm em {
  color: #e01b4f;
}

.shelf-content {
  width: min(100% - calc(var(--page-gutter, 14px) * 2), 1120px);
  margin: 0 auto;
  padding-top: 58px;
}

.shelf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid #8f9895;
  padding-bottom: 13px;
}

.shelf-toolbar h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 900;
}

.pager {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text-muted);
  font-size: 14px;
}

.pager button {
  display: inline-grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border: 1px solid #00aa78;
  border-radius: 4px;
  background: var(--surface);
  color: #00a676;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  padding: 0;
}

.pager button:disabled {
  border-color: #aeb5b2;
  color: #aeb5b2;
  cursor: default;
}

.search-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin: 14px 0 26px;
}

.search-row input {
  width: min(360px, 100%);
  min-height: 34px;
  border: 1px solid #dbe4e1;
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-strong);
  font-size: 15px;
  outline: none;
  padding: 0 10px;
}

.search-row input:focus {
  border-color: #00b894;
  box-shadow: 0 0 0 3px rgba(0, 184, 148, 0.14);
}

.search-row span {
  color: #008e72;
  font-size: 14px;
  font-weight: 800;
}

.state-box {
  border: 1px solid #dbe4e1;
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-muted);
  padding: 28px;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  column-gap: 24px;
  row-gap: 48px;
}

.free-shelves,
.promo-shelves {
  display: grid;
  gap: 42px;
}

.promo-section,
.free-section {
  display: grid;
  gap: 16px;
}

.promo-section-head,
.free-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #8f9895;
  padding-bottom: 8px;
}

.promo-section-head h3,
.free-section-head h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 23px;
  font-weight: 900;
}

.promo-section-head span,
.countdown {
  color: #e11d48;
  font-size: 14px;
  font-weight: 800;
}

.promo-section-head a,
.free-section-head a {
  color: #008e72;
  font-size: 15px;
  font-weight: 900;
  text-decoration: none;
}

.promo-section-head .view-all-action,
.free-section-head .view-all-action {
  color: var(--primary-strong);
}

.promo-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 28px;
  align-items: start;
}

.promo-feature {
  position: relative;
  min-height: 352px;
  overflow: hidden;
  border-radius: 4px;
  background: #0e5969;
  color: #ffffff;
  cursor: pointer;
}

.promo-feature img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 352px;
  object-fit: cover;
  opacity: 0.78;
}

.promo-feature div {
  position: absolute;
  inset: auto 0 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.74));
  padding: 60px 18px 18px;
}

.promo-feature span {
  display: block;
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
}

.promo-feature strong {
  display: block;
  color: #fffbeb;
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
}

.promo-feature p {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  font-size: 17px;
  font-weight: 900;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.promo-book-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  column-gap: 24px;
  row-gap: 36px;
}

@media (max-width: 1180px) {
  .book-grid,
  .promo-book-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.discount-ribbon {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 34px;
  background: #e50924;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  padding: 5px 4px;
  text-align: center;
}

.promo-card .cover-wrap::after {
  content: "โปรโมชัน";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(229, 9, 36, 0.18);
  color: #b91c1c;
  font-size: 13px;
  font-weight: 900;
  padding: 4px 6px;
  text-align: center;
}

.book-card {
  position: relative;
  min-width: 0;
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease;
}

.book-card:hover {
  filter: brightness(1.02);
  transform: translateY(-3px);
}

.cover-wrap {
  position: relative;
  overflow: hidden;
  border: 1px solid #d8dedc;
  background: #f6f7f7;
}

.cover-wrap img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4.35;
  object-fit: cover;
  object-position: top center;
}

.ribbon {
  position: absolute;
  top: 0;
  right: 0;
  width: 36px;
  min-height: 42px;
  background: #e50924;
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.1;
  padding: 5px 4px 8px;
  text-align: center;
}

.ribbon::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -10px;
  border-left: 18px solid transparent;
  border-right: 18px solid transparent;
  border-top: 10px solid #e50924;
}

.ribbon.movie {
  background: #00a96b;
}

.ribbon.movie::after {
  border-top-color: #00a96b;
}

.ribbon.award {
  background: #2441a8;
}

.ribbon.award::after {
  border-top-color: #2441a8;
}

.book-card h3 {
  display: -webkit-box;
  min-height: 50px;
  margin: 12px 0 5px;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 19px;
  font-weight: 900;
  line-height: 1.45;
  line-clamp: 2;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.book-card p {
  display: -webkit-box;
  min-height: 23px;
  margin: 0 0 4px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  line-clamp: 1;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.meta-line {
  display: grid;
  gap: 2px;
  margin-top: 5px;
}

.meta-line span {
  color: #ef3f7a;
  font-size: 12px;
  line-height: 1;
}

.meta-line small {
  color: #4b5563;
  font-size: 14px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.price {
  position: absolute;
  right: 0;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 55px;
  min-height: 26px;
  border-radius: 2px;
  background: #00b874;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  padding: 0 8px;
}

.free-price {
  background: #00b874;
}

@media (max-width: 980px) {
  .shelf-content {
    width: min(100% - 24px, 900px);
    padding-top: 36px;
  }

  .book-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    column-gap: 18px;
  }

  .promo-layout {
    grid-template-columns: 1fr;
  }

  .promo-feature,
  .promo-feature img {
    min-height: 240px;
  }
}

@media (max-width: 680px) {
  .shelf-content {
    width: min(100% - 40px, 900px);
    padding-top: 24px;
  }

  .shelf-tabs {
    gap: 5px 7px;
    padding: 5px 6px;
  }

  .shelf-tabs a {
    flex: 1 1 calc(25% - 10px);
    justify-content: center;
    min-width: 0;
    min-height: 30px;
    font-size: 13px;
    text-align: center;
    white-space: normal;
  }

  .shelf-toolbar,
  .search-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .book-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 7px;
    row-gap: 20px;
  }

  .promo-strip {
    grid-auto-columns: 100%;
    overflow-x: hidden;
  }

  .promo-book-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 7px;
  }

  .promo-section-head > div {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}

@media (max-width: 420px) {
  .shelf-tabs a {
    flex-basis: calc(25% - 7px);
    min-height: 28px;
    font-size: 12px;
  }

  .promo-strip-card {
    grid-template-columns: minmax(0, 1fr) 108px;
    min-height: 154px;
  }

  .promo-strip-card strong {
    font-size: 26px;
  }

  .promo-strip-copy {
    padding: 16px 12px;
  }

  .promo-strip-covers {
    padding-right: 12px;
  }

  .promo-strip-covers img {
    width: 62px;
  }

  .promo-strip-card em {
    right: 10px;
    bottom: 10px;
    min-width: 52px;
  }

  .book-grid,
  .promo-book-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 7px;
    row-gap: 18px;
  }

  .book-card h3 {
    min-height: 30px;
    margin-top: 7px;
    font-size: 12px;
    line-height: 1.25;
  }

  .book-card p,
  .meta-line small {
    min-height: 12px;
    font-size: 10px;
    line-height: 1.25;
  }

  .meta-line span {
    font-size: 10px;
  }

  .price {
    min-width: 40px;
    min-height: 20px;
    font-size: 10px;
    padding: 0 4px;
  }

  .promo-feature strong {
    font-size: 32px;
  }
}
</style>
