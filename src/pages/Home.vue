<template>
  <div class="page">
    <section class="category-bar" aria-label="หมวดหนังสือ">
      <button type="button" class="active" @click="goToStore">ทั้งหมด</button>
      <button type="button" @click="goToShelf('BestSellers')">ขายดี</button>
      <button type="button" @click="goToShelf('NewReleases')">ออกใหม่</button>
      <button type="button" @click="goToShelf('Promotions')">โปรโมชัน</button>
      <button type="button" @click="goToShelf('FreeBooks')">อ่านฟรี</button>
      <button type="button" @click="goToShelf('HallOfFame')">ขึ้นหิ้ง</button>
      <button type="button" @click="goToShelf('Recommended')">แนะนำ</button>
    </section>

    <section
      class="hero-strip"
      aria-label="แบนเนอร์แนะนำ"
    >
      <button
        v-if="bannerPages > 1"
        type="button"
        class="hero-arrow hero-arrow-left"
        aria-label="แบนเนอร์ก่อนหน้า"
        @click="goToPrevBanner"
      >
        ‹
      </button>

      <button
        v-if="bannerPages > 1"
        type="button"
        class="hero-arrow hero-arrow-right"
        aria-label="แบนเนอร์ถัดไป"
        @click="goToNextBanner"
      >
        ›
      </button>

      <div
        class="hero-track"
        :style="{
          transform: `translateX(-${activeBannerIndex * bannerShiftPercent}%)`,
        }"
      >
        <article
          v-for="banner in bannerItems"
          :key="banner.id"
          class="promo-banner"
          :class="[banner.kind === 'fallback' ? banner.theme : '']"
          @click="goToBanner(banner)"
        >
          <img
            v-if="banner.kind === 'admin'"
            class="promo-banner-image"
            :src="resolveAssetUrl(banner.image_url)"
            :alt="banner.title || 'Promotion banner'"
            @error="handleImgError"
          />
          <div v-else class="fallback-promo">
            <div class="fallback-copy">
              <span>Read and Voice</span>
              <strong>{{ banner.label }}</strong>
              <h1>{{ banner.headline }}</h1>
              <p>{{ banner.subtitle }}</p>
            </div>
            <div class="fallback-covers" aria-hidden="true">
              <img
                v-for="cover in banner.covers || []"
                :key="cover"
                :src="resolveAssetUrl(cover)"
                alt=""
                @error="handleImgError"
              />
            </div>
            <div class="fallback-badge">{{ banner.badge }}</div>
          </div>
        </article>

        <article
          v-if="bannerItems.length === 0"
          class="promo-banner tone-1 empty-banner"
        >
          <div class="promo-copy">
            <span>Read and Voice</span>
            <h1>อ่านและฟังอีบุ๊กได้ทุกที่</h1>
            <p>เลือกหนังสือเล่มแรกเพื่อเริ่มต้นการอ่านของคุณ</p>
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
      <div v-if="homeSections.length === 0" class="empty-box">
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
              <small>{{ getSellerName(book) }}</small>
              <div class="book-card-footer">
                <div class="rating-box" :aria-label="getReviewLabel(book)">
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
                <button
                  class="price-pill"
                  type="button"
                  :disabled="addingFreeBookId === book.id"
                  @click.stop="openSupportDialog(book)"
                >
                  {{ addingFreeBookId === book.id ? "กำลังเพิ่ม..." : formatBookPrice(book) }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div
      v-if="supportDialogBook"
      class="support-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
      @click.self="closeSupportDialog"
    >
      <section class="support-modal">
        <button
          class="support-close"
          type="button"
          aria-label="ปิด"
          @click="closeSupportDialog"
        >
          ×
        </button>
        <template v-if="supportDialogMode === 'select'">
          <h2 id="support-modal-title">ให้กำลังใจนักเขียน</h2>
          <p>
            คุณสามารถให้กำลังใจนักเขียนได้ โดยให้ทิปเพิ่มจากราคาปกติ
          </p>
          <strong class="support-book-title">{{ supportDialogBook.title }}</strong>

          <div class="support-options">
            <button
              v-for="amount in supportAmountOptions"
              :key="amount"
              type="button"
              :class="{ active: selectedSupportAmount === amount }"
              @click="selectedSupportAmount = amount"
            >
              {{ amount }} บาท
              <small v-if="amount === supportAmountOptions[0]">(ราคาปกติ)</small>
            </button>
            <button
              type="button"
              class="custom"
              :class="{ active: selectedSupportAmount === customSupportAmount }"
              @click="selectCustomSupportAmount"
            >
              กำหนดเอง
            </button>
          </div>

          <p v-if="supportDialogMessage" class="support-message">
            {{ supportDialogMessage }}
          </p>

          <div class="support-actions">
            <button class="support-cancel" type="button" @click="closeSupportDialog">
              ยกเลิก
            </button>
            <button
              class="support-confirm"
              type="button"
              :disabled="addingToCart"
              @click="confirmSupport"
            >
              {{ addingToCart ? "กำลังเพิ่ม..." : "ยืนยัน" }}
            </button>
          </div>
        </template>

        <template v-else>
          <h2 id="support-modal-title" class="support-added-title">
            เพิ่มหนังสือลงตะกร้าแล้ว
          </h2>
          <strong class="support-book-title">{{ supportDialogBook.title }}</strong>

          <div class="support-next-actions">
            <button class="support-outline-wide" type="button" @click="continueShopping">
              เลือกซื้อหนังสือเล่มอื่นต่อ
            </button>
            <button class="support-solid-wide" type="button" @click="goToCheckout">
              ชำระเงิน
            </button>
          </div>

          <div class="support-divider"></div>

          <button class="support-coin-pay" type="button" @click="goToCheckout">
            ชำระเงินด้วย <span class="support-coin-dot" aria-hidden="true"></span>
            Read coin
          </button>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import api, { resolveAssetUrl } from "../utils/api";
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { getUser, isAuthenticated } from "../utils/auth";

type Book = {
  id: number;
  title: string;
  author: string;
  author_name?: string;
  cover_url?: string;
  cover_image_url?: string;
  cover_image?: string;
  access_type?: string;
  price?: number | string;
  coin_price?: number | string;
  review_count?: number | string;
  average_rating?: number | string;
};

type HomeSection = {
  title: string;
  to: string;
  books: Book[];
};

type ShelfResponse = {
  shelf: string;
  books: Book[];
  count: number;
};

type HomeBanner = {
  id: string;
  image_url: string;
  kind?: "admin" | "fallback";
  title?: string;
  link_url?: string;
  sort_order?: number;
  is_active?: boolean;
  label?: string;
  headline?: string;
  subtitle?: string;
  badge?: string;
  theme?: string;
  covers?: string[];
};

type PageContentResponse = {
  homeBanners?: HomeBanner[];
};

const router = useRouter();
const homeBanners = ref<HomeBanner[]>([]);
const fallbackBannerBooks = ref<Book[]>([]);
const homeSectionItems = ref<HomeSection[]>([]);
const activeBannerIndex = ref(0);
const supportDialogBook = ref<Book | null>(null);
const supportDialogMode = ref<"select" | "added">("select");
const supportDialogMessage = ref("");
const selectedSupportAmount = ref(99);
const customSupportAmount = ref(0);
const addingToCart = ref(false);
const addingFreeBookId = ref<number | null>(null);
let carouselTimer: ReturnType<typeof window.setInterval> | undefined;

const bannerLabels = [
  "อ่านและฟัง",
  "ขายดี",
  "ออกใหม่",
  "โปรโมชัน",
  "อ่านฟรี",
  "แนะนำ",
];
const bannerShiftPercent = 100 / 3;
const visibleBannerCount = 3;
const fallbackCampaigns = [
  {
    label: "MAY MY DAY",
    headline: "อ่านให้ตาค้าง",
    subtitle: "รวมเรื่องน่าอ่านที่หยิบแล้ววางไม่ลง",
    badge: "ลดสูงสุด 45%",
    theme: "theme-blue",
  },
  {
    label: "Final Call",
    headline: "รับซื้อตอนนี้",
    subtitle: "โปรโมชันก่อนหมดสิทธิ์สำหรับนักอ่านตัวจริง",
    badge: "ถึง 7 พ.ค.",
    theme: "theme-coral",
  },
  {
    label: "New Release",
    headline: "บังเอิญเกิดใหม่",
    subtitle: "นิยายมาใหม่พร้อมให้ตามอ่านต่อเนื่อง",
    badge: "มาแรง",
    theme: "theme-warm",
  },
  {
    label: "Recommended",
    headline: "เล่มเด็ดประจำวัน",
    subtitle: "คัดจากชั้นหนังสือยอดนิยมของนักอ่าน",
    badge: "แนะนำ",
    theme: "theme-green",
  },
];

const sectionDefinitions = [
  {
    title: "ออกใหม่",
    to: "/new-releases",
    endpoint: "/new-releases",
    limit: 5,
  },
  { title: "ขายดี", to: "/best-sellers", endpoint: "/best-sellers", limit: 5 },
  { title: "อ่านฟรี", to: "/free-books", endpoint: "/free-books", limit: 5 },
  { title: "แนะนำ", to: "/recommended", endpoint: "/recommended", limit: 5 },
] as const;

const bannerItems = computed(() => {
  const adminBanners = homeBanners.value
    .filter((banner) => banner.image_url && banner.is_active !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((banner) => ({ ...banner, kind: "admin" as const }))
    .slice(0, 12);

  if (adminBanners.length > 0) return adminBanners;

  return fallbackBannerBooks.value
    .map((book, index, books) => {
      const campaign = fallbackCampaigns[index % fallbackCampaigns.length];
      const covers = [book, books[index + 1], books[index + 2]]
        .filter(Boolean)
        .map((item) => item.cover_url || item.cover_image_url || item.cover_image || "")
        .filter(Boolean);

      return {
        id: `book-${book.id}`,
        kind: "fallback" as const,
        image_url: book.cover_url || book.cover_image_url || book.cover_image || "",
        title: book.title,
        link_url: `/book/${book.id}`,
        is_active: true,
        label: campaign.label,
        headline: index % 2 === 0 ? campaign.headline : book.title,
        subtitle: book.author || campaign.subtitle,
        badge: campaign.badge,
        theme: campaign.theme,
        covers,
      };
    })
    .filter((banner) => banner.image_url)
    .slice(0, 12);
});
const bannerPages = computed(() =>
  Math.max(1, bannerItems.value.length - visibleBannerCount + 1),
);

const homeSections = computed(() =>
  homeSectionItems.value.filter((section) => section.books.length > 0),
);

const supportAmountOptions = computed(() => {
  const base = supportDialogBook.value
    ? getBaseSupportAmount(supportDialogBook.value)
    : 99;
  return [base, base * 3, base * 5];
});

const getBookCover = (book: Book) => {
  return resolveAssetUrl(book.cover_url || book.cover_image_url || book.cover_image);
};

const getSellerName = (book: Book) => {
  return book.author || book.author_name || "Read and Voice";
};

const getReviewPercent = (book: Book) => {
  const rating = Number(book.average_rating || 0);
  if (!Number.isFinite(rating) || rating <= 0) return 0;
  return Math.min(100, Math.max(0, (rating / 5) * 100));
};

const getFilledHearts = (book: Book) => {
  return Math.max(0, Math.min(5, Math.round(getReviewPercent(book) / 20)));
};

const formatRatingCount = (book: Book) => {
  const count = Number(book.review_count || 0);
  return `${Number.isFinite(count) ? count : 0} Rating`;
};

const getReviewLabel = (book: Book) => {
  return `รีวิว ${Math.round(getReviewPercent(book))} เปอร์เซ็นต์, ${formatRatingCount(book)}`;
};

const formatBookPrice = (book: Book) => {
  const price = Number(book.coin_price ?? book.price ?? 0);
  if (!Number.isFinite(price) || price <= 0 || book.access_type === "free") return "ฟรี";
  return `฿ ${price.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
};

const isFreeBook = (book: Book) => {
  const price = Number(book.coin_price ?? book.price ?? 0);
  return book.access_type === "free" || !Number.isFinite(price) || price <= 0;
};

const getBaseSupportAmount = (book: Book) => {
  const price = Number(book.coin_price ?? book.price ?? 99);
  return Number.isFinite(price) && price > 0 ? Math.round(price) : 99;
};

const openSupportDialog = (book: Book) => {
  if (isFreeBook(book)) {
    addFreeBookToLibrary(book);
    return;
  }

  supportDialogBook.value = book;
  supportDialogMode.value = "select";
  supportDialogMessage.value = "";
  selectedSupportAmount.value = getBaseSupportAmount(book);
  customSupportAmount.value = 0;
};

const addFreeBookToLibrary = async (book: Book) => {
  if (addingFreeBookId.value === book.id) return;

  const user = getUser();
  if (!user && !isAuthenticated()) {
    router.push({ name: "Login", query: { redirect: router.currentRoute.value.fullPath } });
    return;
    window.alert("กรุณาเข้าสู่ระบบก่อนเพิ่มหนังสือเข้าคลัง");
    router.push({ name: "Login", query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  addingFreeBookId.value = book.id;

  try {
    await api.post("/library", { book_id: book.id });
    const goLibrary = window.confirm(`เพิ่ม "${book.title}" เข้าคลังหนังสือแล้ว ต้องการไปที่คลังเลยไหม?`);

    if (goLibrary) {
      router.push({ name: "MyLibrary" });
    }
  } catch (error: any) {
    window.alert(error?.response?.data?.message || "เพิ่มหนังสือเข้าคลังไม่สำเร็จ");
  } finally {
    addingFreeBookId.value = null;
  }
};

const closeSupportDialog = () => {
  supportDialogBook.value = null;
  supportDialogMode.value = "select";
  supportDialogMessage.value = "";
  customSupportAmount.value = 0;
  addingToCart.value = false;
};

const selectCustomSupportAmount = () => {
  const value = window.prompt("ระบุจำนวนเงินที่ต้องการให้กำลังใจ", "99");
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return;
  customSupportAmount.value = Math.round(amount);
  selectedSupportAmount.value = customSupportAmount.value;
};

const confirmSupport = async () => {
  if (!supportDialogBook.value || addingToCart.value) return;

  addingToCart.value = true;
  supportDialogMessage.value = "";

  try {
    await api.post("/cart", {
      book_id: supportDialogBook.value.id,
      quantity: 1,
    });
    supportDialogMode.value = "added";
  } catch (error: any) {
    if (error?.response?.status === 401) {
      closeSupportDialog();
      router.push({ name: "Login" });
      return;
    }

    supportDialogMessage.value =
      error?.response?.data?.message || "เพิ่มหนังสือลงตะกร้าไม่สำเร็จ";
  } finally {
    addingToCart.value = false;
  }
};

const continueShopping = () => {
  closeSupportDialog();
  router.push({ name: "Store" });
};

const goToCheckout = () => {
  closeSupportDialog();
  router.push({ name: "Cart" });
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

const goToBook = (id: number) => {
  router.push({ name: "BookDetail", params: { id } });
};

const goToBanner = (banner: HomeBanner) => {
  const link = String(banner.link_url || "").trim();
  if (!link) return;

  if (link.startsWith("http://") || link.startsWith("https://")) {
    window.location.href = link;
    return;
  }

  router.push(link.startsWith("/") ? link : `/${link}`);
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
    activeBannerIndex.value = (activeBannerIndex.value + 1) % bannerPages.value;
  }, 4200);
};

const setActiveBanner = (index: number) => {
  activeBannerIndex.value = Math.min(Math.max(index, 0), bannerPages.value - 1);
  startCarousel();
};

const goToPrevBanner = () => {
  activeBannerIndex.value =
    activeBannerIndex.value === 0
      ? bannerPages.value - 1
      : activeBannerIndex.value - 1;
  startCarousel();
};

const goToNextBanner = () => {
  activeBannerIndex.value = (activeBannerIndex.value + 1) % bannerPages.value;
  startCarousel();
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    stopCarousel();
    return;
  }

  startCarousel();
};

async function fetchShelfBooks(endpoint: string) {
  const { data } = await api.get<ShelfResponse>(endpoint);
  return Array.isArray(data?.books) ? data.books : [];
}

async function fetchPageContent() {
  const { data } = await api.get<PageContentResponse>("/page-content");
  homeBanners.value = Array.isArray(data?.homeBanners) ? data.homeBanners : [];
}

async function loadHomeContent() {
  const [, recommendedBooks, allBooks, ...sectionBooks] = await Promise.all([
    fetchPageContent().catch(() => undefined),
    fetchShelfBooks("/recommended").catch(() => []),
    fetchShelfBooks("/ebooks").catch(() => []),
    ...sectionDefinitions.map((section) =>
      fetchShelfBooks(section.endpoint).catch(() => []),
    ),
  ]);

  fallbackBannerBooks.value = [
    ...recommendedBooks,
    ...sectionBooks.flat(),
    ...allBooks,
  ].filter(
    (book, index, books) =>
      books.findIndex((candidate) => candidate.id === book.id) === index,
  );

  homeSectionItems.value = sectionDefinitions.map((section, index) => ({
    title: section.title,
    to: section.to,
    books: (sectionBooks[index].length ? sectionBooks[index] : allBooks).slice(
      0,
      section.limit,
    ),
  }));

  if (allBooks.length > 0) {
    homeSectionItems.value.unshift({
      title: "หนังสือทั้งหมด",
      to: "/store",
      books: allBooks,
    });
  }
  activeBannerIndex.value = 0;
}

onMounted(async () => {
  try {
    await loadHomeContent();
    startCarousel();
    document.addEventListener("visibilitychange", handleVisibilityChange);
  } catch (error) {
    console.error("โหลดข้อมูลหนังสือไม่สำเร็จ:", error);
  }
});

onUnmounted(() => {
  stopCarousel();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});

watch(bannerPages, () => {
  activeBannerIndex.value = Math.min(activeBannerIndex.value, bannerPages.value - 1);
  startCarousel();
});
</script>

<style scoped>
.page {
  min-height: 100%;
  padding-bottom: 56px;
  background:
    radial-gradient(
      circle at top,
      color-mix(in srgb, var(--primary-soft) 58%, transparent),
      transparent 42%
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 94%, var(--bg)) 0%,
      var(--bg) 100%
    );
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
  background: color-mix(in srgb, var(--surface) 94%, var(--bg));
  border-bottom: 1px solid var(--border);
  padding: 4px 0 24px;
}

.hero-track {
  display: flex;
  width: 100%;
  transition: transform 0.55s ease;
  will-change: transform;
  gap: 5px;
  padding: 0 5px;
}

.promo-banner {
  position: relative;
  isolation: isolate;
  display: block;
  flex: 0 0 calc((100% - 10px) / 3);
  aspect-ratio: 16 / 7;
  min-height: 150px;
  max-height: 300px;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: #eef7f4;
  color: #163b37;
  cursor: pointer;
  box-shadow: none;
  padding: 0;
}

.promo-banner::before {
  content: none;
}

.promo-banner::after {
  content: none;
}

.promo-banner-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.empty-banner {
  display: grid;
  align-items: center;
  padding: 14px 16px;
}

.fallback-promo {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(145px, 34%);
  align-items: stretch;
  width: 100%;
  height: 100%;
  min-height: 150px;
  overflow: hidden;
  color: #ffffff;
}

.fallback-promo::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 22%, rgba(255, 255, 255, 0.34), transparent 18%),
    radial-gradient(circle at 88% 18%, rgba(255, 255, 255, 0.26), transparent 20%),
    linear-gradient(135deg, rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.04));
}

.fallback-copy {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: center;
  justify-items: start;
  min-width: 0;
  padding: clamp(14px, 2vw, 24px);
}

.fallback-copy span {
  color: rgba(255, 255, 255, 0.94);
  font-size: 13px;
  font-weight: 900;
}

.fallback-copy strong {
  margin-top: 8px;
  color: #ffe66d;
  font-size: clamp(18px, 2.2vw, 38px);
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.22);
}

.fallback-copy h1 {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: #ffffff;
  font-size: clamp(22px, 2.6vw, 46px);
  font-weight: 900;
  line-height: 1.06;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.34),
    0 8px 18px rgba(0, 0, 0, 0.24);
}

.fallback-copy p {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.88);
  font-size: clamp(11px, 1vw, 15px);
  font-weight: 800;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.fallback-covers {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 12px clamp(12px, 1.4vw, 22px) 12px 0;
}

.fallback-covers img {
  width: clamp(58px, 7vw, 118px);
  aspect-ratio: 3 / 4;
  flex: 0 0 auto;
  border: 3px solid rgba(255, 255, 255, 0.88);
  border-radius: 2px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.26);
}

.fallback-covers img + img {
  margin-left: -20%;
  transform: translateY(10%);
}

.fallback-covers img:first-child {
  transform: translateY(-4%) rotate(-2deg);
}

.fallback-covers img:nth-child(2) {
  transform: translateY(8%) rotate(3deg);
}

.fallback-covers img:nth-child(3) {
  transform: translateY(-2%) rotate(2deg);
}

.fallback-badge {
  position: absolute;
  right: 18px;
  bottom: 14px;
  z-index: 2;
  min-width: 76px;
  border-radius: 999px;
  background: #ffffff;
  color: #0f5ee8;
  font-size: clamp(15px, 1.8vw, 30px);
  font-weight: 900;
  line-height: 1;
  padding: 9px 12px;
  text-align: center;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
}

.theme-blue .fallback-promo {
  background: linear-gradient(105deg, #0676f9 0%, #0097ff 52%, #0063d8 100%);
}

.theme-coral .fallback-promo {
  background: linear-gradient(105deg, #fb6978 0%, #ff8a76 45%, #ffd4c5 100%);
}

.theme-warm .fallback-promo {
  background: linear-gradient(105deg, #d7b18d 0%, #f4d7bd 46%, #b77957 100%);
}

.theme-green .fallback-promo {
  background: linear-gradient(105deg, #0a9f86 0%, #3fc891 48%, #f2cd5d 100%);
}

.theme-coral .fallback-badge,
.theme-warm .fallback-badge {
  color: #e01b4f;
}

.promo-banner.tone-2 {
  background: #eef7f4;
}

.promo-banner.tone-3 {
  background: #eef7f4;
}

.promo-banner.tone-4 {
  background: #eef7f4;
}

.promo-banner.tone-5 {
  background: #eef7f4;
}

.promo-banner.tone-6 {
  background: #eef7f4;
}

.promo-copy {
  position: relative;
  z-index: 1;
  max-width: 100%;
  min-width: 0;
}

.promo-copy span {
  display: inline-flex;
  margin-bottom: 6px;
  border-radius: 999px;
  background: rgba(0, 111, 88, 0.72);
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  padding: 3px 8px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.38);
}

.promo-copy h1 {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #ffffff;
  font-size: 17px;
  font-weight: 900;
  line-height: 1.28;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.72),
    0 5px 14px rgba(0, 0, 0, 0.42);
}

.promo-copy p {
  display: -webkit-box;
  margin: 6px 0 0;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.88);
  font-size: 11px;
  font-weight: 800;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.68),
    0 4px 12px rgba(0, 0, 0, 0.38);
}

.hero-arrow {
  position: absolute;
  top: 50%;
  z-index: 3;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  color: rgba(15, 23, 42, 0.26);
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  transform: translateY(-58%);
  transition:
    background 0.18s ease,
    color 0.18s ease;
  backdrop-filter: blur(6px);
}

.hero-arrow:hover {
  background: rgba(255, 255, 255, 0.74);
  color: rgba(15, 23, 42, 0.58);
}

.hero-arrow-left {
  left: 12px;
}

.hero-arrow-right {
  right: 12px;
}

.hero-dots {
  position: absolute;
  bottom: 7px;
  left: 50%;
  display: flex;
  gap: 8px;
  transform: translateX(-50%);
}

.hero-dots button {
  width: 8px;
  height: 8px;
  min-height: 0;
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
  width: 8px;
  background: var(--primary);
}

.storefront {
  width: min(100% - calc(var(--page-gutter, 14px) * 2), 1280px);
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
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--secondary) 92%, white),
    var(--secondary)
  );
}

.quick-card.library {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary) 92%, white),
    var(--primary-strong)
  );
}

.quick-card.coin {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary-strong) 72%, #1f7a8c),
    #1f7a8c
  );
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
  max-width: 1280px;
  margin-inline: auto;
  padding: clamp(28px, 4vw, 54px) var(--page-gutter, 20px) 0;
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
  gap: 18px;
  margin-top: 10px;
  align-items: stretch;
}

.book-card {
  display: flex;
  flex-direction: column;
  height: 100%;
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
  flex: 0 0 auto;
  height: auto;
  object-fit: cover;
  background: var(--surface-soft);
}

.book-info {
  display: grid;
  grid-template-rows: minmax(42px, auto) 17px auto;
  align-content: start;
  gap: 5px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 10px 9px;
}

.book-info p {
  display: -webkit-box;
  min-height: 42px;
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 900;
  line-height: 1.45;
  line-clamp: 2;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.book-info small {
  display: -webkit-box;
  min-height: 18px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
  line-clamp: 1;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.book-card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  margin-top: 2px;
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
  font-size: 14px;
  line-height: 1;
}

.heart-row span.active {
  color: #ec4899;
}

.rating-box small {
  min-height: 14px;
  color: #475569;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

.price-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 60px;
  min-height: 30px;
  border: 0;
  border-radius: 2px;
  background: #0abf6b;
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  padding: 0 9px;
  text-align: center;
  white-space: nowrap;
  overflow-wrap: anywhere;
}

.price-pill:hover {
  background: #009c64;
}

.support-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.42);
  padding: 18px;
}

.support-modal {
  position: relative;
  width: min(100%, 430px);
  border: 1px solid rgba(15, 118, 110, 0.14);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.24);
  color: #0f172a;
  padding: 28px 28px 22px;
  text-align: center;
}

.support-close {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 32px;
  line-height: 1;
}

.support-close:hover {
  background: #e8f8f6;
  color: #0f766e;
}

.support-modal h2 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
  font-weight: 900;
}

.support-modal p {
  width: min(100%, 290px);
  margin: 18px auto 8px;
  color: #475569;
  font-size: 13px;
  line-height: 1.55;
}

.support-book-title {
  display: -webkit-box;
  margin: 0 auto 16px;
  max-width: 310px;
  overflow: hidden;
  color: #0f766e;
  font-size: 13px;
  line-height: 1.35;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.support-added-title {
  margin-bottom: 18px;
  font-size: 16px;
}

.support-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: min(100%, 250px);
  margin: 0 auto 26px;
}

.support-options button {
  display: grid;
  place-items: center;
  min-height: 48px;
  border: 1px solid #cbd5e1;
  border-radius: 0;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  padding: 8px;
}

.support-options button small {
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.1;
}

.support-options button.active {
  border-color: #11b99a;
  box-shadow: 0 0 0 2px rgba(17, 185, 154, 0.12);
  color: #0f766e;
}

.support-message {
  width: min(100%, 260px);
  margin: -12px auto 16px;
  color: #dc2626;
  font-size: 12px;
  font-weight: 800;
}

.support-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.support-actions button {
  min-width: 86px;
  min-height: 34px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
  padding: 0 18px;
}

.support-cancel {
  border: 1px solid #11b99a;
  background: #ffffff;
  color: #0f766e;
}

.support-confirm {
  border: 1px solid #11b99a;
  background: #11b99a;
  color: #ffffff;
}

.support-confirm:disabled {
  cursor: wait;
  opacity: 0.7;
}

.support-confirm:hover {
  background: #0f9f87;
}

.support-next-actions {
  display: grid;
  gap: 12px;
  width: min(100%, 240px);
  margin: 0 auto;
}

.support-outline-wide,
.support-solid-wide,
.support-coin-pay {
  min-height: 34px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  padding: 0 18px;
}

.support-outline-wide {
  border: 1px solid #11b99a;
  background: #ffffff;
  color: #0f766e;
}

.support-solid-wide {
  border: 1px solid #11b99a;
  background: #11b99a;
  color: #ffffff;
}

.support-divider {
  width: min(100%, 240px);
  height: 1px;
  margin: 20px auto 16px;
  background: #e2e8f0;
}

.support-coin-pay {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 240px;
  border: 0;
  background: #ff8a12;
  color: #ffffff;
}

.support-coin-dot {
  width: 15px;
  height: 15px;
  border-radius: 999px;
  background: radial-gradient(circle at 35% 32%, #fff8c7 0%, #ffd44d 42%, #f59e0b 100%);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.55);
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
  .category-bar {
    justify-content: flex-start;
  }

  .promo-banner {
    flex: 0 0 86%;
    min-height: 118px;
    max-height: none;
    border-radius: 0;
  }

  .book-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin-top: 8px;
  }

  .book-info {
    grid-template-rows: minmax(30px, auto) 13px auto;
    gap: 4px;
    padding: 6px 4px;
  }

  .book-info p {
    min-height: 30px;
    font-size: 9px;
    line-height: 1.35;
  }

  .book-info small {
    min-height: 13px;
    font-size: 8px;
  }

  .book-card-footer {
    gap: 3px;
  }

  .heart-row {
    font-size: 9px;
  }

  .rating-box small {
    min-height: 10px;
    font-size: 7px;
  }

  .price-pill {
    min-width: 36px;
    min-height: 20px;
    font-size: 8px;
    padding: 0 4px;
  }

  .category-bar,
  .action-row,
  .section {
    padding-left: 10px;
    padding-right: 10px;
  }

  .hero-strip {
    padding-top: 4px;
  }

  .promo-banner {
    padding: 0;
  }

  .hero-arrow {
    width: 32px;
    height: 32px;
    font-size: 22px;
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
    font-size: 22px;
  }
}

@media (max-width: 420px) {
  .book-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
  }

  .book-info {
    padding: 4px 3px 5px;
  }

  .book-info p {
    font-size: 8px;
  }

  .book-info small {
    font-size: 7px;
  }

  .heart-row {
    font-size: 8px;
  }

  .rating-box small {
    font-size: 6px;
  }

  .price-pill {
    min-width: 32px;
    font-size: 7px;
  }

  .hero-track {
    gap: 4px;
    padding-inline: 4px;
  }

  .promo-banner {
    flex-basis: 88%;
    min-height: 104px;
    padding: 0;
  }

  .promo-banner::after {
    content: none;
  }

  .promo-copy h1 {
    font-size: 19px;
  }

  .promo-copy p {
    font-size: 12px;
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }

  .hero {
    padding-inline: var(--page-gutter, 12px);
  }

  .hero-copy {
    min-height: auto;
  }

  .action {
    min-height: 70px;
    font-size: 17px;
  }

  .row-card {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .row-card img {
    width: 72px;
  }
}
</style>
