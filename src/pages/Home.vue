<template>
  <div class="page">
    <section class="category-bar" :aria-label="t('home.categoriesLabel')">
      <button type="button" class="active" @click="goToStore">{{ t("home.all") }}</button>
      <button type="button" @click="goToShelf('BestSellers')">{{ t("home.bestSellers") }}</button>
      <button type="button" @click="goToShelf('NewReleases')">{{ t("home.newReleases") }}</button>
      <button type="button" @click="goToShelf('Promotions')">{{ t("home.promotions") }}</button>
      <button type="button" @click="goToShelf('FreeBooks')">{{ t("home.freeBooks") }}</button>
      <button type="button" @click="goToShelf('HallOfFame')">{{ t("home.hallOfFame") }}</button>
      <button type="button" @click="goToShelf('Recommended')">{{ t("home.recommended") }}</button>
    </section>

    <section class="hero-strip" :aria-label="t('home.bannerLabel')">
      <button
        v-if="bannerPages > 1"
        type="button"
        class="hero-arrow hero-arrow-left"
        :aria-label="t('home.prevBanner')"
        @click="goToPrevBanner"
      >
        &lt;
      </button>

      <button
        v-if="bannerPages > 1"
        type="button"
        class="hero-arrow hero-arrow-right"
        :aria-label="t('home.nextBanner')"
        @click="goToNextBanner"
      >
        &gt;
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
            <h1>{{ t("home.emptyTitle") }}</h1>
            <p>{{ t("home.emptySubtitle") }}</p>
          </div>
        </article>
      </div>

      <div v-if="bannerPages > 1" class="hero-dots" :aria-label="t('home.chooseBanner')">
        <button
          v-for="index in bannerPages"
          :key="index"
          type="button"
          :class="{ active: index - 1 === activeBannerIndex }"
          :aria-label="`${t('home.bannerIndex')} ${index}`"
          @click="setActiveBanner(index - 1)"
        ></button>
      </div>
    </section>

    <main class="storefront">
      <div v-if="homeSections.length === 0" class="empty-box">
        {{ t("home.noBooks") }}
      </div>

      <section
        v-if="categoryLinks.length"
        class="category-overview"
        :aria-label="t('home.categoriesTitle')"
      >
        <div class="section-head section-head--stacked">
          <div>
            <h2>{{ t("home.categoriesTitle") }}</h2>
          </div>
          <button
            v-if="categoryLinks.length > categoryPageSize"
            class="section-link-button view-all-action"
            type="button"
            @click="toggleCategoryExpanded"
          >
            {{ categoryExpanded ? t("home.showLess") : t("home.viewAll") }}
          </button>
        </div>
        <div class="category-carousel">
          <button
            v-if="!categoryExpanded && categoryLinks.length > categoryPageSize"
            class="category-arrow category-arrow--left"
            type="button"
            :aria-label="t('home.scrollLeft')"
            @click="scrollCategoryRail(-1)"
          >
            &lt;
          </button>
          <button
            v-if="!categoryExpanded && categoryLinks.length > categoryPageSize"
            class="category-arrow category-arrow--right"
            type="button"
            :aria-label="t('home.scrollRight')"
            @click="scrollCategoryRail(1)"
          >
            &gt;
          </button>
          <div
            class="category-chip-grid"
            :class="{ 'category-chip-grid--expanded': categoryExpanded }"
            data-category-rail
          >
            <router-link
              v-for="category in categoryLinks"
              :key="category.name"
              class="category-chip"
              :class="[`category-chip--${category.tone}`, `category-chip--art-${category.art}`]"
              :to="{ name: 'Store', query: { category: category.name } }"
            >
              <img
                class="category-art-image"
                :src="getCustomCategoryArtImage(category.art)"
                alt=""
                aria-hidden="true"
              />
              <strong>{{ category.name }}</strong>
            </router-link>
          </div>
        </div>
      </section>

      <section
        v-for="(section, sectionIndex) in homeSections"
        :key="section.title"
        class="shelf-section"
        :class="`shelf-section--${section.kind || 'mixed'}`"
      >
        <div class="section-head">
          <div>
            <span v-if="section.kicker" class="section-kicker">{{ section.kicker }}</span>
            <h2>{{ section.title }}</h2>
            <p v-if="section.description">{{ section.description }}</p>
          </div>
          <router-link class="section-link-button view-all-action" :to="getSectionAllLink(section)">
            {{ t("home.viewAll") }}
          </router-link>
        </div>

        <div class="shelf-rail-wrap">
          <button
            v-if="section.books.length > 4"
            class="shelf-arrow shelf-arrow--left"
            type="button"
            :aria-label="t('home.scrollLeft')"
            @click="scrollShelf(sectionIndex, -1)"
          >
            &lt;
          </button>
          <button
            v-if="section.books.length > 4"
            class="shelf-arrow shelf-arrow--right"
            type="button"
            :aria-label="t('home.scrollRight')"
            @click="scrollShelf(sectionIndex, 1)"
          >
            &gt;
          </button>
          <div class="book-grid book-rail" :data-shelf-index="sectionIndex">
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
                <span
                  class="content-badge"
                  :class="`content-badge--${getContentKind(book)}`"
                >
                  {{ getContentLabel(book) }}
                </span>
                <p>{{ book.title }}</p>
                <small
                  class="book-category"
                  :class="{ 'book-category--empty': !book.category_name }"
                >
                  {{ book.category_name || "-" }}
                </small>
                <small class="book-seller">{{ getSellerName(book) }}</small>
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
                    {{ addingFreeBookId === book.id ? t("home.adding") : formatBookPrice(book) }}
                  </button>
                </div>
              </div>
            </article>
          </div>
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
          :aria-label="t('common.close')"
          @click="closeSupportDialog"
        >
          x
        </button>
        <template v-if="supportDialogMode === 'select'">
          <h2 id="support-modal-title">{{ t("home.supportTitle") }}</h2>
          <p>{{ t("home.supportDescription") }}</p>
          <strong class="support-book-title">{{ supportDialogBook.title }}</strong>

          <div class="support-options">
            <button
              v-for="amount in supportAmountOptions"
              :key="amount"
              type="button"
              :class="{ active: selectedSupportAmount === amount }"
              @click="selectedSupportAmount = amount"
            >
              {{ amount }} {{ t("home.baht") }}
              <small v-if="amount === supportAmountOptions[0]">({{ t("home.normalPrice") }})</small>
            </button>
            <button
              type="button"
              class="custom"
              :class="{ active: selectedSupportAmount === customSupportAmount }"
              @click="selectCustomSupportAmount"
            >
              {{ t("home.customAmount") }}
            </button>
          </div>

          <p v-if="supportDialogMessage" class="support-message">
            {{ supportDialogMessage }}
          </p>

          <div class="support-actions">
            <button class="support-cancel" type="button" @click="closeSupportDialog">
              {{ t("common.cancel") }}
            </button>
            <button
              class="support-confirm"
              type="button"
              :disabled="addingToCart"
              @click="confirmSupport"
            >
              {{ addingToCart ? t("home.adding") : t("common.confirm") }}
            </button>
          </div>
        </template>

        <template v-else>
          <h2 id="support-modal-title" class="support-added-title">
            {{ t("home.addedToCart") }}
          </h2>
          <strong class="support-book-title">{{ supportDialogBook.title }}</strong>

          <div class="support-next-actions">
            <button class="support-outline-wide" type="button" @click="continueShopping">
              {{ t("home.continueShopping") }}
            </button>
            <button class="support-solid-wide" type="button" @click="goToCheckout">
              {{ t("home.checkout") }}
            </button>
          </div>

          <div class="support-divider"></div>

          <button class="support-coin-pay" type="button" @click="goToCheckout">
            {{ t("home.payWith") }}
            <span class="support-coin-dot" aria-hidden="true"></span>
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
import { useI18n } from "../utils/i18n";

type Book = {
  id: number;
  title: string;
  author: string;
  author_name?: string;
  cover_url?: string;
  cover_image_url?: string;
  cover_image?: string;
  category_name?: string;
  content_type?: string;
  access_type?: string;
  price?: number | string;
  coin_price?: number | string;
  review_count?: number | string;
  average_rating?: number | string;
  episode_count?: number | string;
  read_count?: number | string;
  view_count?: number | string;
  favorite_count?: number | string;
  like_count?: number | string;
};

type HomeSection = {
  title: string;
  to: string;
  books: Book[];
  kind?: "ebook" | "serial" | "mixed";
  kicker?: string;
  description?: string;
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

type CategoryResponseItem = {
  id?: number;
  name?: string;
  parent_id?: number | null;
  display_tone?: string | null;
  display_art?: string | null;
  show_on_home?: boolean | number | null;
  sort_order?: number | null;
};

type HomeCategoryButton = {
  name: string;
  tone?: string | null;
  art?: string | null;
};

const router = useRouter();
const { locale, t } = useI18n();
const homeBanners = ref<HomeBanner[]>([]);
const fallbackBannerBooks = ref<Book[]>([]);
const homeSectionItems = ref<HomeSection[]>([]);
const categorySourceBooks = ref<Book[]>([]);
const adminCategoryItems = ref<HomeCategoryButton[]>([]);
const activeBannerIndex = ref(0);
const supportDialogBook = ref<Book | null>(null);
const supportDialogMode = ref<"select" | "added">("select");
const supportDialogMessage = ref("");
const selectedSupportAmount = ref(99);
const customSupportAmount = ref(0);
const addingToCart = ref(false);
const addingFreeBookId = ref<number | null>(null);
const categoryExpanded = ref(false);
let carouselTimer: ReturnType<typeof window.setInterval> | undefined;

const bannerShiftPercent = 100 / 3;
const visibleBannerCount = 3;
const categoryPageSize = 8;
const customCategoryArtImages: Record<string, string> = {
  "travel-book": "/category-art/travel-book.png",
  "manga-reader": "/category-art/manga-reader.png",
  "mystery-book": "/category-art/mystery-book.png",
  "adventure-book": "/category-art/adventure-book.png",
  "teen-reader": "/category-art/teen-reader.png",
  "drama-mask": "/category-art/drama-mask.png",
  "chinese-girl": "/category-art/chinese-girl.png",
  "classic-writer": "/category-art/classic-writer.png",
  "romance-books": "/category-art/romance-books.png",
  "fantasy-wizard": "/category-art/fantasy-wizard.png",
  "category-art-set": "/category-art/category-art-set.png",
  "business-growth": "/category-art/business-growth.png",
  "finance-book": "/category-art/finance-book.png",
  "health-yoga": "/category-art/health-yoga.png",
  "wisdom-monk": "/category-art/wisdom-monk.png",
  "kids-rainbow": "/category-art/kids-rainbow.png",
  "audio-reader": "/category-art/audio-reader.png",
  "space-science": "/category-art/space-science.png",
  "horror-book": "/category-art/horror-book.png",
  "education-owl": "/category-art/education-owl.png",
  "education-graduate": "/category-art/education-graduate.png",
  "romance-family": "/category-art/romance-family.png",
  "poetry-writer": "/category-art/poetry-writer.png",
  "craft-book": "/category-art/craft-book.png",
  "law-book": "/category-art/law-book.png",
  "study-book": "/category-art/study-book.png",
  "wellness-garden": "/category-art/wellness-garden.png",
  "technology-circuit": "/category-art/technology-circuit.png",
  "math-formula": "/category-art/math-formula.png",
  "language-chat": "/category-art/language-chat.png",
  "marketing-megaphone": "/category-art/marketing-megaphone.png",
  "food-cafe": "/category-art/food-cafe.png",
  "beauty-flower": "/category-art/beauty-flower.png",
  "exercise-runner": "/category-art/exercise-runner.png",
  "geography-globe": "/category-art/geography-globe.png",
  "philosophy-lotus": "/category-art/philosophy-lotus.png",
};
const defaultCategoryArtImage = customCategoryArtImages["travel-book"];
const legacyCategoryArtMap: Record<string, string> = {
  story: "romance-family",
  romance: "romance-books",
  fantasy: "fantasy-wizard",
  mystery: "mystery-book",
  adventure: "adventure-book",
  teen: "teen-reader",
  drama: "drama-mask",
  chinese: "chinese-girl",
  foreign: "travel-book",
  manga: "manga-reader",
  comic: "manga-reader",
  classic: "classic-writer",
  knowledge: "education-owl",
  documentary: "classic-writer",
  history: "law-book",
  geography: "geography-globe",
  science: "space-science",
  technology: "technology-circuit",
  math: "education-graduate",
  language: "language-chat",
  computer: "technology-circuit",
  exam: "study-book",
  life: "business-growth",
  psychology: "health-yoga",
  inspiration: "business-growth",
  time: "business-growth",
  business: "finance-book",
  finance: "finance-book",
  marketing: "marketing-megaphone",
  accounting: "finance-book",
  wellness: "health-yoga",
  food: "food-cafe",
  exercise: "exercise-runner",
  beauty: "beauty-flower",
  travel: "travel-book",
  hobby: "craft-book",
  wisdom: "wisdom-monk",
  philosophy: "philosophy-lotus",
  kids: "kids-rainbow",
  picturebook: "kids-rainbow",
  audio: "audio-reader",
};

const fallbackCampaigns = computed(() => [
  {
    label: "MAY MY DAY",
    headline: t("home.fallbackHeadline1"),
    subtitle: t("home.fallbackSubtitle1"),
    badge: t("home.fallbackBadge1"),
    theme: "theme-blue",
  },
  {
    label: "Final Call",
    headline: t("home.fallbackHeadline2"),
    subtitle: t("home.fallbackSubtitle2"),
    badge: t("home.fallbackBadge2"),
    theme: "theme-coral",
  },
  {
    label: "New Release",
    headline: t("home.fallbackHeadline3"),
    subtitle: t("home.fallbackSubtitle3"),
    badge: t("home.fallbackBadge3"),
    theme: "theme-warm",
  },
  {
    label: "Recommended",
    headline: t("home.fallbackHeadline4"),
    subtitle: t("home.fallbackSubtitle4"),
    badge: t("home.recommended"),
    theme: "theme-green",
  },
]);

const sectionDefinitions = computed(() => [
  { title: t("home.newReleases"), to: "/new-releases", endpoint: "/new-releases", limit: 5 },
  { title: t("home.bestSellers"), to: "/best-sellers", endpoint: "/best-sellers", limit: 5 },
  { title: t("home.freeBooks"), to: "/free-books", endpoint: "/free-books", limit: 5 },
  { title: t("home.recommended"), to: "/recommended", endpoint: "/recommended", limit: 5 },
] as const);

const bannerItems = computed(() => {
  const adminBanners = homeBanners.value
    .filter((banner) => banner.image_url && banner.is_active !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((banner) => ({ ...banner, kind: "admin" as const }))
    .slice(0, 12);

  if (adminBanners.length > 0) return adminBanners;

  return fallbackBannerBooks.value
    .map((book, index, books) => {
      const campaign = fallbackCampaigns.value[index % fallbackCampaigns.value.length];
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

const getCategoryTone = (name: string, index: number) => {
  const keyword = name.toLowerCase();

  if (/หนังสือเสียง|อ่านออกเสียง|เสียง|audio|voice/.test(keyword)) return "audio";
  if (/นิยายรัก|รัก|โรแมนซ์|romance/.test(keyword)) return "romance";
  if (/แฟนตาซี|fantasy/.test(keyword)) return "fantasy";
  if (/สืบสวน|detective|mystery/.test(keyword)) return "mystery";
  if (/ผจญภัย|adventure/.test(keyword)) return "adventure";
  if (/วัยรุ่น|teen/.test(keyword)) return "teen";
  if (/ดราม่า|drama/.test(keyword)) return "drama";
  if (/จีน|เกาหลี|ญี่ปุ่น|โบราณ|chinese|korea|japan/.test(keyword)) return "chinese";
  if (/ต่างประเทศ|foreign|classic/.test(keyword)) return "foreign";
  if (/การ์ตูน|มังงะ|คอมิก|comic|manga/.test(keyword)) return "manga";
  if (/วิทยาศาสตร์|science/.test(keyword)) return "science";
  if (/เทคโนโลยี|คอมพิวเตอร์|computer|tech/.test(keyword)) return "technology";
  if (/ประวัติศาสตร์|history|ภูมิศาสตร์|geography/.test(keyword)) return "history";
  if (/ภาษา|language|อังกฤษ|ไทย/.test(keyword)) return "language";
  if (/สอบ|ติว|exam/.test(keyword)) return "exam";
  if (/การศึกษา|เรียน|คณิต|education|study/.test(keyword)) return "study";
  if (/การเงิน|บัญชี|ลงทุน|finance|account|invest/.test(keyword)) return "finance";
  if (/การตลาด|marketing/.test(keyword)) return "marketing";
  if (/ธุรกิจ|business/.test(keyword)) return "business";
  if (/อาหาร|food/.test(keyword)) return "food";
  if (/ท่องเที่ยว|travel/.test(keyword)) return "travel";
  if (/ความงาม|beauty/.test(keyword)) return "beauty";
  if (/สุขภาพ|ไลฟ์|ออกกำลังกาย|งานอดิเรก|health|wellness|exercise|hobby/.test(keyword)) return "wellness";
  if (/ศาสนา|ปรัชญา|ธรรมะ|ข้อคิด/.test(keyword)) return "wisdom";
  if (/เด็ก|เยาวชน|นิทาน|kid|children/.test(keyword)) return "kids";
  if (/จิตวิทยา|psychology/.test(keyword)) return "psychology";
  if (/พัฒนาตนเอง|แรงบันดาลใจ|สำเร็จ|เวลา|ทักษะ|self/.test(keyword)) return "life";
  if (/ความรู้|สารคดี/.test(keyword)) return "knowledge";
  if (/นิยาย|วรรณกรรม|แฟนตาซี|รัก|สืบสวน|ผจญภัย|ดราม่า|fiction|novel/.test(keyword)) return "story";

  return `accent-${(index % 4) + 1}`;
};

const getCategoryArt = (name: string) => {
  const keyword = name.toLowerCase();

  if (/หนังสือเสียง|อ่านออกเสียง|เสียง|audio|voice/.test(keyword)) return "audio";
  if (/นิยายรัก|รัก|โรแมนซ์|romance/.test(keyword)) return "romance";
  if (/การ์ตูนเด็ก/.test(keyword)) return "kids";
  if (/คอมิก|comic/.test(keyword)) return "comic";
  if (/การ์ตูน|มังงะ|manga/.test(keyword)) return "manga";
  if (/สืบสวน|detective/.test(keyword)) return "mystery";
  if (/แฟนตาซี|fantasy/.test(keyword)) return "fantasy";
  if (/ผจญภัย|adventure/.test(keyword)) return "adventure";
  if (/วัยรุ่น|teen/.test(keyword)) return "teen";
  if (/ดราม่า|drama/.test(keyword)) return "drama";
  if (/จีน|เกาหลี|ญี่ปุ่น|โบราณ/.test(keyword)) return "chinese";
  if (/ต่างประเทศ/.test(keyword)) return "foreign";
  if (/วรรณกรรม|คลาสสิก/.test(keyword)) return "classic";
  if (/สารคดี|documentary/.test(keyword)) return "documentary";
  if (/ประวัติศาสตร์|history/.test(keyword)) return "history";
  if (/ภูมิศาสตร์|geography/.test(keyword)) return "geography";
  if (/วิทยาศาสตร์|science/.test(keyword)) return "science";
  if (/เทคโนโลยี|technology/.test(keyword)) return "technology";
  if (/คอมพิวเตอร์|computer/.test(keyword)) return "computer";
  if (/คณิต|math/.test(keyword)) return "math";
  if (/ภาษา|อังกฤษ|ไทย|language/.test(keyword)) return "language";
  if (/สอบ|ติว|exam/.test(keyword)) return "exam";
  if (/การศึกษา|เรียน/.test(keyword)) return "study";
  if (/ลงทุน|การเงินส่วนบุคคล|การเงิน|finance|invest/.test(keyword)) return "finance";
  if (/การตลาด|marketing/.test(keyword)) return "marketing";
  if (/บัญชี|account/.test(keyword)) return "accounting";
  if (/ธุรกิจ|business/.test(keyword)) return "business";
  if (/อาหาร|food/.test(keyword)) return "food";
  if (/ออกกำลัง|exercise/.test(keyword)) return "exercise";
  if (/ความงาม|beauty/.test(keyword)) return "beauty";
  if (/ท่องเที่ยว|travel/.test(keyword)) return "travel";
  if (/งานอดิเรก|hobby/.test(keyword)) return "hobby";
  if (/สุขภาพ|ไลฟ์/.test(keyword)) return "wellness";
  if (/ปรัชญา|philosophy/.test(keyword)) return "philosophy";
  if (/ศาสนา|ธรรมะ|ข้อคิด/.test(keyword)) return "wisdom";
  if (/หนังสือภาพ/.test(keyword)) return "picturebook";
  if (/เด็ก|เยาวชน|นิทาน/.test(keyword)) return "kids";
  if (/จิตวิทยา|psychology/.test(keyword)) return "psychology";
  if (/แรงบันดาลใจ|สำเร็จ|inspiration/.test(keyword)) return "inspiration";
  if (/เวลา|time/.test(keyword)) return "time";
  if (/พัฒนาตนเอง|ทักษะชีวิต/.test(keyword)) return "life";
  if (/ความรู้/.test(keyword)) return "knowledge";
  return "story";
};

const getCustomCategoryArtImage = (art?: string | null) => {
  if (!art) return defaultCategoryArtImage;
  const imageKey = customCategoryArtImages[art] ? art : legacyCategoryArtMap[art];
  return imageKey ? customCategoryArtImages[imageKey] || defaultCategoryArtImage : defaultCategoryArtImage;
};

const visibleCategoryItems = computed<HomeCategoryButton[]>(() => adminCategoryItems.value);

const categoryLinks = computed(() =>
  visibleCategoryItems.value.map((category, index) => ({
    name: category.name,
    art: category.art || getCategoryArt(category.name),
    tone: category.tone || getCategoryTone(category.name, index),
  })),
);

const supportAmountOptions = computed(() => {
  const base = supportDialogBook.value ? getBaseSupportAmount(supportDialogBook.value) : 99;
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
  return `${t("home.review")} ${Math.round(getReviewPercent(book))} ${t("home.percent")}, ${formatRatingCount(book)}`;
};

const formatBookPrice = (book: Book) => {
  const price = Number(book.coin_price ?? book.price ?? 0);
  if (!Number.isFinite(price) || price <= 0 || book.access_type === "free") return t("home.free");
  return `฿ ${price.toLocaleString(locale.value === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 0 })}`;
};

const getContentKind = (book: Book) => {
  return book.content_type === "serial" ? "serial" : "ebook";
};

const getContentLabel = (book: Book) => {
  return getContentKind(book) === "serial" ? t("home.serial") : t("home.ebook");
};

const getSectionAllLink = (section: HomeSection) => {
  if (section.kind === "serial") return { name: "Serials" };
  if (section.kind === "ebook") return { name: "Store", query: { type: "ebook" } };
  return section.to;
};

const scrollShelf = (index: number, direction: -1 | 1) => {
  const rail = document.querySelector<HTMLElement>(`[data-shelf-index="${index}"]`);
  if (!rail) return;
  rail.scrollBy({ left: direction * Math.max(rail.clientWidth * 0.82, 320), behavior: "smooth" });
};

const scrollCategoryRail = (direction: -1 | 1) => {
  const rail = document.querySelector<HTMLElement>("[data-category-rail]");
  if (!rail) return;
  rail.scrollBy({
    left: direction * Math.max(rail.clientWidth * 0.92, 360),
    behavior: "smooth",
  });
};

const toggleCategoryExpanded = () => {
  categoryExpanded.value = !categoryExpanded.value;

  if (!categoryExpanded.value) {
    requestAnimationFrame(() => {
      const rail = document.querySelector<HTMLElement>("[data-category-rail]");
      rail?.scrollTo({ left: 0, behavior: "smooth" });
    });
  }
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
    window.alert(t("home.loginBeforeAdd"));
    router.push({ name: "Login", query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  addingFreeBookId.value = book.id;

  try {
    await api.post("/library", { book_id: book.id });
    const goLibrary = window.confirm(`${t("home.addedConfirmPrefix")} "${book.title}" ${t("home.addedConfirmSuffix")}`);
    if (goLibrary) router.push({ name: "MyLibrary" });
  } catch (error: any) {
    window.alert(error?.response?.data?.message || t("home.addLibraryFailed"));
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
  const value = window.prompt(t("home.customPrompt"), "99");
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
    await api.post("/cart", { book_id: supportDialogBook.value.id, quantity: 1 });
    supportDialogMode.value = "added";
  } catch (error: any) {
    if (error?.response?.status === 401) {
      closeSupportDialog();
      router.push({ name: "Login" });
      return;
    }
    supportDialogMessage.value = error?.response?.data?.message || t("home.addCartFailed");
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

const goToStore = () => router.push({ name: "Store" });
const goToShelf = (name: string) => router.push({ name });
const goToBook = (id: number) => router.push({ name: "BookDetail", params: { id } });

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
  activeBannerIndex.value = activeBannerIndex.value === 0 ? bannerPages.value - 1 : activeBannerIndex.value - 1;
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

async function fetchHomeCategories() {
  const { data } = await api.get<CategoryResponseItem[]>("/categories?scope=all");
  const seen = new Set<string>();

  adminCategoryItems.value = (Array.isArray(data) ? data : [])
    .slice()
    .filter((item) => item?.show_on_home !== false && item?.show_on_home !== 0)
    .sort((a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0) || Number(a?.id || 0) - Number(b?.id || 0))
    .map((item) => ({
      name: String(item?.name || "").trim(),
      tone: String(item?.display_tone || "").trim() || null,
      art: String(item?.display_art || "").trim() || null,
    }))
    .filter((category) => {
      const name = category.name;
      const key = name.toLocaleLowerCase(locale.value === "th" ? "th-TH" : "en-US");
      if (!name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function loadHomeContent() {
  const definitions = sectionDefinitions.value;
  const [, , recommendedBooks, ebookBooks, serialBooks, ...sectionBooks] = await Promise.all([
    fetchPageContent().catch(() => undefined),
    fetchHomeCategories().catch(() => undefined),
    fetchShelfBooks("/recommended").catch(() => []),
    fetchShelfBooks("/ebooks").catch(() => []),
    fetchShelfBooks("/serials").catch(() => []),
    ...definitions.map((section) => fetchShelfBooks(section.endpoint).catch(() => [])),
  ]);

  const normalizedEbooks = ebookBooks.map((book) => ({ ...book, content_type: book.content_type || "ebook" }));
  const normalizedSerials = serialBooks.map((book) => ({ ...book, content_type: "serial" }));
  const catalogBooks = [...normalizedEbooks, ...normalizedSerials].filter(
    (book, index, books) => books.findIndex((candidate) => candidate.id === book.id) === index,
  );

  categorySourceBooks.value = catalogBooks;
  fallbackBannerBooks.value = [...recommendedBooks, ...sectionBooks.flat(), ...catalogBooks].filter(
    (book, index, books) => books.findIndex((candidate) => candidate.id === book.id) === index,
  );

  homeSectionItems.value = definitions.map((section, index) => ({
    title: section.title,
    to: section.to,
    kind: "mixed",
    books: (sectionBooks[index].length ? sectionBooks[index] : catalogBooks)
      .map((book) => ({
        ...book,
        content_type: book.content_type || catalogBooks.find((candidate) => candidate.id === book.id)?.content_type || "ebook",
      }))
      .slice(0, section.limit),
  }));

  homeSectionItems.value.unshift(
    {
      title: t("home.ebookSection"),
      to: "/store",
      kind: "ebook",
      books: normalizedEbooks.slice(0, 10),
    },
    {
      title: t("home.serialSection"),
      to: "/serials",
      kind: "serial",
      books: normalizedSerials.slice(0, 10),
    },
  );
}

onMounted(() => {
  loadHomeContent().catch((error) => {
    console.error(t("home.loadFailed"), error);
  });
  startCarousel();
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onUnmounted(() => {
  stopCarousel();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});

watch(bannerPages, () => {
  activeBannerIndex.value = Math.min(activeBannerIndex.value, bannerPages.value - 1);
  startCarousel();
});

watch(locale, () => {
  loadHomeContent().catch((error) => {
    console.error(t("home.loadFailed"), error);
  });
});
</script>
<style scoped>
.page {
  min-height: 100%;
  padding-bottom: 56px;
  background: var(--bg);
}

.category-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  width: 100%;
  min-height: 46px;
  padding: 8px clamp(12px, 3vw, 48px);
  overflow-x: hidden;
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  border-bottom: 1px solid var(--border);
  scrollbar-width: none;
}

.category-bar::-webkit-scrollbar {
  display: none;
}

.category-bar button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
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

.promo-banner::before,
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
  flex: 0 0 calc(100% - 10px);
  align-items: center;
  min-height: clamp(180px, 21vw, 300px);
  padding: 14px 16px;
  background:
    radial-gradient(circle at 78% 22%, rgba(20, 184, 166, 0.12), transparent 24%),
    linear-gradient(135deg, #eefaf7 0%, #f8fffd 58%, #ffffff 100%);
}

.empty-banner .promo-copy {
  display: grid;
  gap: 12px;
  max-width: 720px;
  padding-inline: clamp(10px, 2vw, 28px);
}

.empty-banner .promo-copy span {
  color: #16423d;
  font-size: 15px;
  font-weight: 800;
}

.empty-banner .promo-copy h1 {
  margin: 0;
  color: #214844;
  font-size: clamp(26px, 3vw, 48px);
  font-weight: 900;
  line-height: 1.15;
}

.empty-banner .promo-copy p {
  margin: 0;
  color: #315a55;
  font-size: clamp(14px, 1.2vw, 18px);
  font-weight: 700;
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
    radial-gradient(
      circle at 18% 22%,
      rgba(255, 255, 255, 0.34),
      transparent 18%
    ),
    radial-gradient(
      circle at 88% 18%,
      rgba(255, 255, 255, 0.26),
      transparent 20%
    ),
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
  font-size: clamp(20px, 2.3vw, 34px);
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

.hero-arrow {
  position: absolute;
  top: 50%;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 999px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.62));
  color: var(--primary-strong);
  cursor: pointer;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  transform: translateY(-58%);
  box-shadow: 0 10px 28px rgba(15, 118, 110, 0.16);
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
  backdrop-filter: blur(10px);
}

.hero-arrow:hover {
  background: var(--primary);
  color: var(--on-primary);
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.24);
  transform: translateY(-58%) scale(1.04);
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

.hero-dots button:hover {
  background: color-mix(in srgb, var(--primary) 82%, white);
  transform: translateY(-1px);
}

.storefront {
  width: min(100% - calc(var(--page-gutter, 14px) * 3.2), 1280px);
  margin: 0 auto;
  padding-top: 22px;
}

.shelf-section {
  padding: 18px 0 12px;
}

.category-overview {
  position: relative;
  background: transparent;
  padding: 20px 0 10px;
}

.category-carousel {
  position: relative;
  background: transparent;
  margin-top: 14px;
}

.category-chip-grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(280px, calc((100% - 42px) / 4));
  grid-template-rows: repeat(2, minmax(112px, auto));
  grid-template-columns: none;
  gap: 16px 14px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  padding: 6px 58px 16px 24px;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.category-chip-grid--expanded {
  grid-auto-flow: row;
  grid-auto-columns: unset;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  grid-template-rows: none;
  overflow-x: visible;
  padding-bottom: 2px;
  padding-right: 2px;
  scroll-snap-type: none;
}

.category-chip-grid::-webkit-scrollbar {
  display: none;
}

.category-arrow {
  position: absolute;
  top: 50%;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 999px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.68));
  color: var(--primary-strong);
  cursor: pointer;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 12px 30px rgba(15, 118, 110, 0.16);
  transform: translateY(-50%);
  backdrop-filter: blur(10px);
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.category-arrow:hover {
  background: var(--primary);
  color: var(--on-primary);
  box-shadow: 0 16px 34px rgba(15, 118, 110, 0.24);
  transform: translateY(-50%) scale(1.04);
}

.category-arrow--left {
  left: 10px;
}

.category-arrow--right {
  right: 8px;
}

.category-chip {
  --chip-a: #0ea5a8;
  --chip-b: #f7c948;
  --chip-c: #dff8f4;
  --chip-d: #ffffff;
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-height: 112px;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--chip-a) 32%, white);
  border-radius: 22px;
  background:
    radial-gradient(circle at 7% 15%, rgba(255, 255, 255, 0.92) 0 2px, transparent 2.5px),
    radial-gradient(circle at 13% 72%, color-mix(in srgb, var(--chip-a) 18%, transparent) 0 4px, transparent 4.5px),
    radial-gradient(circle at 83% 18%, color-mix(in srgb, var(--chip-b) 82%, white) 0 4px, transparent 4.8px),
    radial-gradient(circle at 93% 72%, color-mix(in srgb, var(--chip-a) 24%, transparent) 0 28px, transparent 29px),
    linear-gradient(100deg, color-mix(in srgb, var(--chip-c) 82%, white) 0%, var(--chip-d) 46%, color-mix(in srgb, var(--chip-b) 34%, white) 100%);
  color: var(--text-strong);
  padding: 20px 128px 20px 24px;
  scroll-snap-align: start;
  text-decoration: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -10px 22px rgba(255, 255, 255, 0.5),
    0 16px 30px color-mix(in srgb, var(--chip-a) 18%, transparent);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.category-chip::before {
  content: "";
  position: absolute;
  inset: 8px 8px 8px auto;
  z-index: -1;
  width: 44%;
  height: auto;
  border-radius: 999px 18px 18px 999px;
  background:
    radial-gradient(circle at 22% 28%, rgba(255, 255, 255, 0.82) 0 10px, transparent 11px),
    radial-gradient(circle at 74% 76%, color-mix(in srgb, var(--chip-a) 22%, transparent) 0 18px, transparent 19px),
    linear-gradient(145deg, color-mix(in srgb, var(--chip-a) 18%, white), color-mix(in srgb, var(--chip-b) 36%, white));
  opacity: 0.9;
}

.category-chip::after {
  content: "";
  position: absolute;
  inset: auto 16px 12px 16px;
  z-index: -1;
  height: 24px;
  border-radius: 999px;
  background:
    radial-gradient(ellipse at 14% 50%, color-mix(in srgb, var(--chip-a) 30%, transparent) 0 12px, transparent 13px),
    radial-gradient(ellipse at 42% 72%, color-mix(in srgb, var(--chip-b) 44%, transparent) 0 15px, transparent 16px),
    radial-gradient(ellipse at 72% 42%, color-mix(in srgb, var(--chip-a) 20%, transparent) 0 18px, transparent 19px);
  filter: blur(0.1px);
}

.category-chip:hover,
.category-chip:focus-visible {
  border-color: color-mix(in srgb, var(--chip-a) 58%, var(--border));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    0 20px 42px color-mix(in srgb, var(--chip-a) 24%, transparent);
  transform: translateY(-4px);
}

.category-chip strong {
  display: block;
  position: relative;
  z-index: 2;
  overflow: hidden;
  color: color-mix(in srgb, var(--chip-a) 76%, #101828);
  font-size: clamp(16px, 1.16vw, 21px);
  font-weight: 900;
  line-height: 1.1;
  max-width: 100%;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}

.category-art {
  position: absolute;
  right: 4px;
  bottom: -2px;
  width: 120px;
  height: 118px;
  transform: scale(0.88);
  transform-origin: right bottom;
}

.category-art-image {
  position: absolute;
  right: 20px;
  bottom: 14px;
  z-index: 1;
  width: 82px;
  height: 82px;
  background: transparent;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
  filter: drop-shadow(0 15px 18px rgba(15, 23, 42, 0.16));
}

.category-art::before {
  content: "";
  position: absolute;
  right: 4px;
  bottom: 5px;
  width: 86px;
  height: 86px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 34% 22%, rgba(255, 255, 255, 0.7) 0 12px, transparent 13px),
    linear-gradient(145deg, color-mix(in srgb, var(--chip-b) 42%, white), color-mix(in srgb, var(--chip-a) 18%, white));
  opacity: 0.74;
}

.category-art__head,
.category-art__body,
.category-art__book,
.category-art__spark {
  position: absolute;
  display: block;
}

.category-art__head {
  top: 15px;
  left: 56px;
  width: 46px;
  height: 46px;
  border: 2px solid rgba(15, 23, 42, 0.1);
  border-radius: 48% 52% 46% 54%;
  background:
    radial-gradient(circle at 34% 45%, #163b37 0 2.4px, transparent 2.9px),
    radial-gradient(circle at 66% 45%, #163b37 0 2.4px, transparent 2.9px),
    radial-gradient(circle at 51% 69%, rgba(22, 59, 55, 0.72) 0 2.4px, transparent 3px),
    #ffe3c4;
  box-shadow:
    inset 8px -5px 0 rgba(255, 183, 117, 0.28),
    0 -12px 0 -3px color-mix(in srgb, var(--chip-a) 58%, #6b3f22),
    0 6px 10px rgba(15, 23, 42, 0.12);
}

.category-art__head::before,
.category-art__head::after {
  content: "";
  position: absolute;
  display: block;
}

.category-art__head::before {
  left: -6px;
  top: -8px;
  width: 54px;
  height: 24px;
  border-radius: 999px 999px 12px 12px;
  background: color-mix(in srgb, var(--chip-a) 68%, #5b341f);
  transform: rotate(-5deg);
}

.category-art__head::after {
  left: 11px;
  bottom: 9px;
  width: 18px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 138, 138, 0.34);
}

.category-art__body {
  top: 63px;
  left: 43px;
  width: 66px;
  height: 52px;
  border-radius: 22px 22px 12px 12px;
  background: linear-gradient(135deg, var(--chip-a), color-mix(in srgb, var(--chip-a) 64%, #0f172a));
  box-shadow:
    inset 0 13px 0 rgba(255, 255, 255, 0.18),
    0 8px 12px rgba(15, 23, 42, 0.14);
}

.category-art__book {
  right: 48px;
  bottom: 5px;
  width: 58px;
  height: 43px;
  border: 2px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px 8px 6px 6px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.52) 0 48%, rgba(15, 23, 42, 0.08) 48% 52%, rgba(255, 255, 255, 0.3) 52%),
    linear-gradient(135deg, #ffffff, color-mix(in srgb, var(--chip-b) 48%, white));
  transform: rotate(-5deg);
  box-shadow: 0 8px 12px rgba(15, 23, 42, 0.12);
}

.category-art__spark {
  width: 14px;
  height: 14px;
  background: var(--chip-b);
  clip-path: polygon(50% 0, 63% 36%, 100% 50%, 63% 64%, 50% 100%, 37% 64%, 0 50%, 37% 36%);
}

.category-art__spark--one {
  top: 8px;
  right: 6px;
}

.category-art__spark--two {
  top: 42px;
  left: 18px;
  width: 11px;
  height: 11px;
  opacity: 0.78;
}

.category-art--fantasy .category-art__head {
  border-radius: 50% 50% 44% 44%;
  box-shadow:
    inset 7px -4px 0 rgba(255, 183, 117, 0.28),
    0 -18px 0 -7px color-mix(in srgb, var(--chip-a) 80%, #1e1b4b);
}

.category-art--fantasy .category-art__spark--one,
.category-art--mystery .category-art__spark--one {
  width: 16px;
  height: 16px;
}

.category-art--mystery .category-art__head {
  box-shadow:
    inset 7px -4px 0 rgba(255, 183, 117, 0.28),
    0 -11px 0 -3px color-mix(in srgb, var(--chip-a) 72%, #111827);
}

.category-art--mystery .category-art__book {
  background:
    linear-gradient(90deg, transparent 0 44%, rgba(15, 23, 42, 0.18) 44% 50%, transparent 50%),
    linear-gradient(135deg, #fff, color-mix(in srgb, var(--chip-b) 44%, white));
}

.category-art--adventure .category-art__body {
  border-radius: 12px 18px 18px 10px;
  transform: rotate(-4deg);
}

.category-art--classic .category-art__book,
.category-art--study .category-art__book,
.category-art--knowledge .category-art__book {
  width: 54px;
  height: 40px;
  transform: rotate(0);
}

.category-art--manga .category-art__head {
  border-radius: 44% 56% 46% 54%;
  background:
    radial-gradient(circle at 35% 42%, #163b37 0 2px, transparent 2.4px),
    radial-gradient(circle at 65% 42%, #163b37 0 2px, transparent 2.4px),
    radial-gradient(circle at 50% 68%, rgba(22, 59, 55, 0.72) 0 2px, transparent 2.4px),
    linear-gradient(145deg, #ffe3c4 0 62%, color-mix(in srgb, var(--chip-b) 60%, #fff) 62%);
}

.category-art--business .category-art__body {
  background:
    linear-gradient(90deg, transparent 0 45%, rgba(255, 255, 255, 0.72) 45% 55%, transparent 55%),
    linear-gradient(135deg, var(--chip-a), color-mix(in srgb, var(--chip-a) 64%, #0f172a));
}

.category-art--business .category-art__spark--one,
.category-art--knowledge .category-art__spark--one,
.category-art--study .category-art__spark--one {
  border-radius: 2px;
  clip-path: none;
}

.category-art--wellness .category-art__spark {
  border-radius: 999px 999px 999px 0;
  clip-path: none;
  transform: rotate(-35deg);
}

.category-art--wisdom .category-art__book {
  border-radius: 999px 999px 7px 7px;
}

.category-art--kids .category-art__body {
  border-radius: 20px 16px 14px 18px;
  background: linear-gradient(135deg, var(--chip-b), var(--chip-a));
}

.category-art--audio .category-art__book {
  border-radius: 999px;
  width: 42px;
  height: 42px;
}

.category-art--audio .category-art__spark--one,
.category-art--audio .category-art__spark--two {
  width: 14px;
  height: 14px;
  border: 2px solid var(--chip-b);
  border-left-color: transparent;
  border-bottom-color: transparent;
  border-radius: 999px;
  background: transparent;
  clip-path: none;
}

.category-art--romance .category-art__spark,
.category-art--beauty .category-art__spark {
  border-radius: 50% 50% 50% 0;
  clip-path: none;
  transform: rotate(-45deg);
}

.category-art--teen .category-art__book,
.category-art--audio .category-art__book {
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 50%, #fff 0 34%, transparent 35%),
    linear-gradient(135deg, var(--chip-b), #ffffff);
}

.category-art--drama .category-art__book,
.category-art--comic .category-art__book {
  border-radius: 50% 50% 42% 42%;
  transform: rotate(5deg);
}

.category-art--chinese .category-art__spark--one {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #ef4444;
  clip-path: none;
  box-shadow: 0 10px 0 -5px #facc15;
}

.category-art--foreign .category-art__book,
.category-art--geography .category-art__book {
  border-radius: 999px;
  background:
    radial-gradient(circle at 36% 36%, color-mix(in srgb, var(--chip-a) 46%, white) 0 10px, transparent 11px),
    radial-gradient(circle at 64% 62%, color-mix(in srgb, var(--chip-b) 54%, white) 0 12px, transparent 13px),
    linear-gradient(135deg, #ffffff, #dff7ff);
}

.category-art--documentary .category-art__book,
.category-art--technology .category-art__book,
.category-art--computer .category-art__book {
  border-radius: 8px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--chip-a) 74%, #0f172a) 0 62%, #e5f7ff 62%),
    linear-gradient(135deg, #ffffff, var(--chip-b));
}

.category-art--history .category-art__book,
.category-art--philosophy .category-art__book {
  border-radius: 999px 999px 6px 6px;
  transform: rotate(0);
}

.category-art--science .category-art__spark--one {
  width: 20px;
  height: 20px;
  border: 2px solid var(--chip-a);
  border-radius: 999px;
  background: transparent;
  clip-path: none;
  box-shadow:
    inset 0 0 0 3px rgba(255, 255, 255, 0.55),
    0 0 0 1px var(--chip-b);
}

.category-art--math .category-art__spark--one,
.category-art--language .category-art__spark--one,
.category-art--exam .category-art__spark--one,
.category-art--accounting .category-art__spark--one {
  border-radius: 4px;
  clip-path: none;
  transform: rotate(0);
}

.category-art--psychology .category-art__head,
.category-art--inspiration .category-art__head,
.category-art--time .category-art__head {
  box-shadow:
    inset 8px -5px 0 rgba(255, 183, 117, 0.28),
    0 -9px 0 -3px color-mix(in srgb, var(--chip-b) 60%, #6b3f22),
    0 0 0 4px color-mix(in srgb, var(--chip-c) 64%, white);
}

.category-art--finance .category-art__spark,
.category-art--business .category-art__spark,
.category-art--marketing .category-art__spark {
  border-radius: 999px;
  clip-path: none;
}

.category-art--food .category-art__body {
  border-radius: 999px 999px 16px 16px;
}

.category-art--exercise .category-art__body {
  transform: rotate(-8deg);
}

.category-art--travel .category-art__book {
  border-radius: 8px 8px 16px 16px;
  transform: rotate(0);
}

.category-art--hobby .category-art__spark--one,
.category-art--picturebook .category-art__spark--one {
  border-radius: 999px 999px 999px 0;
  clip-path: none;
}

.category-chip--tech {
  --chip-a: #0891b2;
  --chip-b: #67e8f9;
  --chip-c: #e0f7ff;
}

.category-chip--story {
  --chip-a: #7c3aed;
  --chip-b: #d8b4fe;
  --chip-c: #f6efff;
  --chip-d: #fff8ff;
}

.category-chip--romance {
  --chip-a: #ec407a;
  --chip-b: #f9a8d4;
  --chip-c: #fff0f7;
  --chip-d: #fff8fc;
}

.category-chip--fantasy {
  --chip-a: #6d28d9;
  --chip-b: #c084fc;
  --chip-c: #f3e8ff;
  --chip-d: #fbf7ff;
}

.category-chip--mystery {
  --chip-a: #0f766e;
  --chip-b: #5eead4;
  --chip-c: #e6fffb;
  --chip-d: #f7fffe;
}

.category-chip--adventure {
  --chip-a: #3f8f2f;
  --chip-b: #a7f3d0;
  --chip-c: #eefbdd;
  --chip-d: #fbfff7;
}

.category-chip--teen {
  --chip-a: #2563eb;
  --chip-b: #bfdbfe;
  --chip-c: #eaf4ff;
  --chip-d: #f8fcff;
}

.category-chip--drama {
  --chip-a: #be185d;
  --chip-b: #f9a8d4;
  --chip-c: #fff0f8;
  --chip-d: #fff8fc;
}

.category-chip--chinese {
  --chip-a: #dc2626;
  --chip-b: #fbbf24;
  --chip-c: #fff0e5;
  --chip-d: #fffaf2;
}

.category-chip--foreign {
  --chip-a: #0284c7;
  --chip-b: #7dd3fc;
  --chip-c: #e8f8ff;
  --chip-d: #f8fcff;
}

.category-chip--manga {
  --chip-a: #f97316;
  --chip-b: #fdba74;
  --chip-c: #fff1df;
  --chip-d: #fffaf4;
}

.category-chip--wellness {
  --chip-a: #249c43;
  --chip-b: #b8e986;
  --chip-c: #effbdc;
  --chip-d: #fbfff6;
}

.category-chip--science {
  --chip-a: #0891b2;
  --chip-b: #67e8f9;
  --chip-c: #e6fbff;
  --chip-d: #f7feff;
}

.category-chip--technology {
  --chip-a: #0f5bd8;
  --chip-b: #7dd3fc;
  --chip-c: #eaf3ff;
  --chip-d: #f8fbff;
}

.category-chip--history {
  --chip-a: #92400e;
  --chip-b: #fcd34d;
  --chip-c: #fff2d7;
  --chip-d: #fffaf2;
}

.category-chip--language {
  --chip-a: #0d9488;
  --chip-b: #99f6e4;
  --chip-c: #e8fbf8;
  --chip-d: #f8fffd;
}

.category-chip--exam {
  --chip-a: #ca8a04;
  --chip-b: #fde047;
  --chip-c: #fff8cc;
  --chip-d: #fffdf0;
}

.category-chip--kids {
  --chip-a: #e47d13;
  --chip-b: #ffd166;
  --chip-c: #fff1c8;
  --chip-d: #fffaf0;
}

.category-chip--business {
  --chip-a: #d97706;
  --chip-b: #facc15;
  --chip-c: #fff4cf;
  --chip-d: #fffaf0;
}

.category-chip--finance {
  --chip-a: #b77900;
  --chip-b: #fde047;
  --chip-c: #fff7cc;
  --chip-d: #fffdf2;
}

.category-chip--marketing {
  --chip-a: #ea580c;
  --chip-b: #fb7185;
  --chip-c: #fff0df;
  --chip-d: #fff8f4;
}

.category-chip--life {
  --chip-a: #ea580c;
  --chip-b: #fdba74;
  --chip-c: #fff0dd;
  --chip-d: #fffaf4;
}

.category-chip--psychology {
  --chip-a: #8b5cf6;
  --chip-b: #ddd6fe;
  --chip-c: #f5f0ff;
  --chip-d: #fcfaff;
}

.category-chip--food {
  --chip-a: #f97316;
  --chip-b: #fed7aa;
  --chip-c: #fff3e4;
  --chip-d: #fffaf5;
}

.category-chip--travel {
  --chip-a: #0284c7;
  --chip-b: #7dd3fc;
  --chip-c: #e6faff;
  --chip-d: #f7feff;
}

.category-chip--beauty {
  --chip-a: #db2777;
  --chip-b: #fbcfe8;
  --chip-c: #fff0f7;
  --chip-d: #fff9fc;
}

.category-chip--study {
  --chip-a: #168a4b;
  --chip-b: #86efac;
  --chip-c: #eafbea;
  --chip-d: #f8fff8;
}

.category-chip--knowledge {
  --chip-a: #1d4ed8;
  --chip-b: #93c5fd;
  --chip-c: #eaf6ff;
  --chip-d: #f8fcff;
}

.category-chip--wisdom {
  --chip-a: #7e22ce;
  --chip-b: #d8b4fe;
  --chip-c: #f5edff;
  --chip-d: #fffaff;
}

.category-chip--audio {
  --chip-a: #4338ca;
  --chip-b: #a5b4fc;
  --chip-c: #edf0ff;
  --chip-d: #f9faff;
}

.category-chip--accent-1 {
  --chip-a: #ea580c;
  --chip-b: #fed7aa;
  --chip-c: #fff4e8;
}

.category-chip--accent-2 {
  --chip-a: #0f766e;
  --chip-b: #5eead4;
  --chip-c: #e7fbf7;
}

.category-chip--accent-3 {
  --chip-a: #db2777;
  --chip-b: #fbcfe8;
  --chip-c: #fff1f7;
}

.category-chip--accent-4 {
  --chip-a: #4f46e5;
  --chip-b: #c7d2fe;
  --chip-c: #f1f3ff;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  min-height: 28px;
}

.section-head--stacked {
  align-items: flex-end;
}

.section-head h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 900;
}

.section-head p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
}

.section-kicker {
  display: inline-flex;
  margin-bottom: 4px;
  color: var(--primary-strong);
  font-size: 11px;
  font-weight: 900;
}

.section-head a,
.section-link-button {
  color: var(--primary-strong);
  font-size: 13px;
  font-weight: 900;
  text-decoration: none;
}

.section-link-button {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 2px 0;
}

.section-head .view-all-action {
  flex: 0 0 auto;
  color: var(--primary-strong);
}

.empty-box,
.book-card {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: none;
}

.empty-box {
  display: grid;
  min-height: clamp(260px, 36vh, 460px);
  place-items: center;
  margin-top: 18px;
  border-radius: var(--radius);
  padding: 24px;
  color: var(--text-muted);
  font-weight: 800;
  text-align: center;
}

.shelf-rail-wrap {
  position: relative;
  margin-top: 10px;
}

.book-grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: clamp(180px, 16vw, 220px);
  grid-template-columns: none;
  gap: 14px;
  align-items: stretch;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  padding: 0 48px 10px 4px;
  scroll-behavior: smooth;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.book-grid::-webkit-scrollbar {
  display: none;
}

.shelf-arrow {
  position: absolute;
  top: 44%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 999px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.68));
  color: var(--primary-strong);
  cursor: pointer;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 12px 30px rgba(15, 118, 110, 0.16);
  transform: translateY(-50%);
  backdrop-filter: blur(10px);
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.shelf-arrow:hover {
  background: var(--primary);
  color: var(--on-primary);
  box-shadow: 0 16px 34px rgba(15, 118, 110, 0.24);
  transform: translateY(-50%) scale(1.04);
}

.shelf-arrow--left {
  left: 8px;
}

.shelf-arrow--right {
  right: 8px;
}

.hero-arrow,
.category-arrow,
.shelf-arrow {
  font-size: 0;
}

.hero-arrow::before,
.category-arrow::before,
.shelf-arrow::before {
  content: "";
  width: 11px;
  height: 11px;
  border-top: 2.5px solid currentColor;
  border-right: 2.5px solid currentColor;
  border-radius: 1.5px;
  transform: rotate(45deg) translate(-1px, 1px);
}

.hero-arrow-left::before,
.category-arrow--left::before,
.shelf-arrow--left::before {
  transform: rotate(-135deg) translate(-1px, 1px);
}

.hero-arrow:active,
.category-arrow:active,
.shelf-arrow:active {
  box-shadow: 0 8px 18px rgba(15, 118, 110, 0.18);
}

.book-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
  scroll-snap-align: start;
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
  aspect-ratio: 4 / 4.85;
  flex: 0 0 auto;
  height: auto;
  object-fit: cover;
  object-position: top center;
  background: var(--surface-soft);
}

.book-info {
  display: grid;
  grid-template-rows: 20px 44px 18px 18px minmax(30px, auto);
  align-content: stretch;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 158px;
  padding: 10px 12px 9px;
}

.content-badge {
  grid-row: 1;
  justify-self: start;
  align-self: start;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary-soft) 74%, white);
  color: var(--primary-strong);
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  padding: 4px 7px;
}

.content-badge--serial {
  background: #fff1c9;
  color: #a15c00;
}

.book-category {
  grid-row: 3;
  color: var(--primary-strong) !important;
  font-weight: 800;
}

.book-category--empty {
  visibility: hidden;
}

.book-info p {
  grid-row: 2;
  display: -webkit-box;
  min-height: 44px;
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 900;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.book-info small {
  display: -webkit-box;
  min-height: 18px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11.5px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.book-seller {
  grid-row: 4;
}

.book-meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #8b8f96;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
}

.book-card-footer {
  grid-row: 5;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  align-self: stretch;
  min-width: 0;
  min-height: 26px;
  margin-top: auto;
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
  min-height: 16px;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
}

.price-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 48px;
  min-height: 30px;
  border: 0;
  border-radius: 2px;
  background: #0abf6b;
  color: #ffffff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
  padding: 0 8px;
  text-align: center;
  white-space: nowrap;
  overflow-wrap: anywhere;
}

.price-pill:hover {
  background: #009c64;
}

@media (max-width: 1180px) {
  .book-grid {
    grid-auto-columns: clamp(158px, 22vw, 190px);
  }
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
  font-size: 12px;
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
  background: radial-gradient(
    circle at 35% 32%,
    #fff8c7 0%,
    #ffd44d 42%,
    #f59e0b 100%
  );
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.55);
}

@media (max-width: 900px) {
  .section-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .section-head h2 {
    font-size: 22px;
  }
}

@media (max-width: 640px) {
  .storefront {
    width: min(100% - 44px, 1280px);
    padding-top: 12px;
  }

  .shelf-section,
  .category-overview {
    padding-block: 8px 4px;
  }

  .category-carousel {
    margin-top: 8px;
  }

  .category-arrow {
    width: 34px;
    height: 34px;
    font-size: 18px;
    box-shadow: 0 8px 20px rgba(15, 118, 110, 0.14);
  }

  .category-arrow--left {
    left: 8px;
  }

  .category-arrow--right {
    right: 6px;
  }

  .category-chip-grid {
    grid-auto-flow: column;
    grid-auto-columns: clamp(136px, calc((100vw - 44px) / 2), 158px);
    grid-template-columns: none;
    grid-template-rows: repeat(2, minmax(68px, auto));
    gap: 6px;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    padding: 0 2px 6px;
    justify-content: start;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .category-chip-grid--expanded {
    grid-auto-columns: unset;
    grid-template-columns: 1fr;
    grid-template-rows: none;
    padding-left: 2px;
    padding-right: 2px;
  }

  .category-chip {
    width: 100%;
    min-width: 0;
    min-height: 68px;
    border-width: 1px;
    border-radius: 12px;
    padding: 9px 42px 9px 9px;
  }

  .category-chip strong {
    font-size: 11px;
    line-height: 1.1;
  }

  .category-art {
    right: -14px;
    bottom: -12px;
    width: 82px;
    height: 82px;
    transform: scale(0.52);
    transform-origin: right bottom;
  }

  .category-art-image {
    right: 5px;
    bottom: 8px;
    width: 38px;
    height: 38px;
  }


  .category-bar {
    justify-content: center;
    gap: 8px;
    padding-inline: 8px;
  }

  .category-bar button {
    flex: 1 1 calc(25% - 8px);
    min-width: 0;
    max-width: calc(25% - 8px);
    min-height: 38px;
    padding: 6px 2px;
    font-size: 12px;
    line-height: 1.15;
    white-space: normal;
  }

  .promo-banner {
    flex: 0 0 calc(100% - 10px);
    min-height: 118px;
    max-height: none;
    border-radius: 0;
  }

  .book-grid {
    grid-auto-columns: calc((100% - 14px) / 2.15);
    gap: 12px;
    margin-top: 8px;
    padding: 0 0 8px;
  }

  .book-card img {
    aspect-ratio: 5 / 6;
  }

  .book-info {
    grid-template-rows: 18px 42px 18px 18px minmax(28px, auto);
    gap: 5px;
    min-height: 148px;
    padding: 10px;
  }

  .content-badge {
    font-size: 11px;
    padding: 4px 7px;
  }

  .book-info p {
    display: -webkit-box;
    min-height: 42px;
    font-size: 14px;
    line-height: 1.45;
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }

  .book-info small {
    display: -webkit-box;
    min-height: 18px;
    font-size: 12px;
    line-height: 1.45;
    line-clamp: 1;
    -webkit-line-clamp: 1;
  }

  .book-card-footer {
    gap: 6px;
    min-height: 28px;
  }

  .heart-row {
    font-size: 12px;
  }

  .rating-box small {
    min-height: 0;
    font-size: 11px;
  }

  .price-pill {
    min-width: 46px;
    min-height: 28px;
    font-size: 12px;
    padding: 0 7px;
  }
}

@media (max-width: 420px) {
  .storefront {
    width: min(100% - 36px, 1280px);
  }

  .category-chip-grid {
    grid-auto-columns: clamp(128px, calc((100vw - 34px) / 2), 150px);
    grid-template-columns: none;
    grid-template-rows: repeat(2, minmax(64px, auto));
    width: 100%;
    max-width: 100%;
    gap: 6px;
    padding: 0 2px 6px;
    justify-content: start;
  }

  .category-chip-grid--expanded {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    padding-left: 2px;
    padding-right: 2px;
  }

  .category-chip {
    width: 100%;
    min-width: 0;
    min-height: 64px;
    padding: 8px 38px 8px 8px;
  }

  .category-chip strong {
    font-size: 10px;
    line-height: 1.1;
  }

  .category-art-image {
    right: 4px;
    bottom: 7px;
    width: 34px;
    height: 34px;
  }

  .category-arrow {
    width: 30px;
    height: 30px;
    font-size: 16px;
  }

  .category-bar {
    gap: 6px;
  }

  .category-bar button {
    flex-basis: calc(25% - 6px);
    max-width: calc(25% - 6px);
    min-height: 36px;
    font-size: 11px;
  }

  .book-grid {
    grid-auto-columns: calc((100% - 12px) / 2.05);
    gap: 12px;
    padding-right: 0;
  }

  .book-info {
    grid-template-rows: 17px 40px 17px 17px minmax(27px, auto);
    gap: 5px;
    min-height: 142px;
    padding: 9px;
  }

  .content-badge {
    font-size: 10px;
    padding: 4px 6px;
  }

  .book-info p {
    min-height: 40px;
    font-size: 13px;
    line-height: 1.45;
  }

  .book-info small {
    min-height: 17px;
    font-size: 11px;
  }

  .heart-row {
    font-size: 11px;
  }

  .rating-box small {
    font-size: 10px;
  }

  .price-pill {
    min-width: 44px;
    min-height: 26px;
    font-size: 11px;
    padding-inline: 6px;
  }

  .hero-track {
    gap: 4px;
    padding-inline: 4px;
  }

  .promo-banner {
    flex-basis: calc(100% - 8px);
    min-height: 104px;
    padding: 0;
  }
}
</style>
