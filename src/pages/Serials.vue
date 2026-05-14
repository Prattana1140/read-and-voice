<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";
import { filterBooks, uniqueBookCategories } from "../utils/bookSearch";

type SerialBook = {
  id: number;
  title: string;
  author?: string;
  cover_url?: string;
  cover_image?: string;
  description?: string;
  category_name?: string;
  access_type?: "free" | "paid" | "subscription";
  price?: number | string;
  coin_price?: number | string;
  episode_count?: number;
  read_count?: number;
  view_count?: number;
  review_count?: number;
  favorite_count?: number;
  like_count?: number;
  average_rating?: number;
};

type ShelfResponse = {
  books: SerialBook[];
  count?: number;
};

type SerialCategoryButton = {
  name: string;
  tone?: string | null;
  art?: string | null;
};

const route = useRoute();
const router = useRouter();

const books = ref<SerialBook[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const search = ref(String(route.query.q || ""));
const accessFilter = ref("all");
const categoryFilter = ref(String(route.query.category || "all"));
const activeTab = ref(String(route.query.tab || "hot"));
const categoryExpanded = ref(false);
const currentPage = ref(1);
const pageSize = 8;
const categoryPageSize = 8;

const filteredBooks = computed(() => {
  return filterBooks(books.value, search.value, {
    contentType: "serial",
    accessType: accessFilter.value,
    category: categoryFilter.value,
  }) as SerialBook[];
});

const categoryOptions = computed(() => uniqueBookCategories(books.value));

const fallbackCategoryItems = computed<SerialCategoryButton[]>(() =>
  categoryOptions.value.map((name) => ({ name, tone: null, art: null })),
);

const serialCategoryItems = computed<SerialCategoryButton[]>(() =>
  fallbackCategoryItems.value,
);

const tabItems = [
  { key: "love", label: "นิยายรัก" },
  { key: "hot", label: "ใหม่มาแรง" },
  { key: "popular", label: "เรื่องฮิต" },
  { key: "sold", label: "ขายดี" },
  { key: "new", label: "มาใหม่" },
  { key: "updated", label: "อัปเดต" },
  { key: "ending", label: "จบล่าสุด" },
  { key: "favorite", label: "ท็อปชาร์ต" },
];

const sortedBooks = computed(() => {
  const list = [...filteredBooks.value];

  if (activeTab.value === "new" || activeTab.value === "updated") {
    return list.reverse();
  }

  if (activeTab.value === "sold" || activeTab.value === "favorite") {
    return list.sort((a, b) => getLikeCount(b) - getLikeCount(a));
  }

  return list.sort((a, b) => getReadCount(b) - getReadCount(a));
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(sortedBooks.value.length / pageSize)),
);

const pagedBooks = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return sortedBooks.value.slice(start, start + pageSize);
});

const activeTabLabel = computed(
  () => tabItems.find((item) => item.key === activeTab.value)?.label || "นิยายรัก",
);

const getCategoryTone = (name: string, index: number) => {
  const keyword = name.toLowerCase();
  if (/เสียง|audio|voice/.test(keyword)) return "audio";
  if (/รัก|โรแมนซ์/.test(keyword)) return "romance";
  if (/แฟนตาซี/.test(keyword)) return "fantasy";
  if (/สืบสวน/.test(keyword)) return "mystery";
  if (/ผจญภัย/.test(keyword)) return "adventure";
  if (/วัยรุ่น/.test(keyword)) return "teen";
  if (/ดราม่า/.test(keyword)) return "drama";
  if (/จีน|โบราณ|เกาหลี|ญี่ปุ่น/.test(keyword)) return "chinese";
  if (/การ์ตูน|มังงะ|คอมิก/.test(keyword)) return "manga";
  if (/เทคโนโลยี|คอมพิวเตอร์/.test(keyword)) return "technology";
  if (/การศึกษา|เรียน|ภาษา/.test(keyword)) return "study";
  if (/ธุรกิจ|การเงิน|ลงทุน/.test(keyword)) return "business";
  if (/สุขภาพ|อาหาร|ท่องเที่ยว|ความงาม/.test(keyword)) return "wellness";
  if (/เด็ก|เยาวชน|นิทาน/.test(keyword)) return "kids";
  if (/ศาสนา|ปรัชญา|ธรรมะ/.test(keyword)) return "wisdom";
  return `accent-${(index % 4) + 1}`;
};

const getCategoryArt = (name: string) => {
  const keyword = name.toLowerCase();
  if (/เสียง|audio|voice/.test(keyword)) return "audio";
  if (/รัก|โรแมนซ์/.test(keyword)) return "romance";
  if (/แฟนตาซี/.test(keyword)) return "fantasy";
  if (/สืบสวน/.test(keyword)) return "mystery";
  if (/ผจญภัย/.test(keyword)) return "adventure";
  if (/วัยรุ่น/.test(keyword)) return "teen";
  if (/ดราม่า/.test(keyword)) return "drama";
  if (/จีน|โบราณ|เกาหลี|ญี่ปุ่น/.test(keyword)) return "chinese";
  if (/การ์ตูน|มังงะ|คอมิก/.test(keyword)) return "manga";
  if (/เทคโนโลยี|คอมพิวเตอร์/.test(keyword)) return "technology";
  if (/การศึกษา|เรียน|ภาษา/.test(keyword)) return "study";
  if (/ธุรกิจ|การเงิน|ลงทุน/.test(keyword)) return "business";
  if (/สุขภาพ|อาหาร|ท่องเที่ยว|ความงาม/.test(keyword)) return "wellness";
  if (/เด็ก|เยาวชน|นิทาน/.test(keyword)) return "kids";
  if (/ศาสนา|ปรัชญา|ธรรมะ/.test(keyword)) return "wisdom";
  return "story";
};

const serialCategoryLinks = computed(() =>
  serialCategoryItems.value.map((category, index) => ({
    name: category.name,
    art: category.art || getCategoryArt(category.name),
    tone: category.tone || getCategoryTone(category.name, index),
  })),
);

function getBookCover(book: SerialBook) {
  return resolveAssetUrl(book.cover_url || book.cover_image);
}

function getEpisodeCount(book: SerialBook) {
  return Number(book.episode_count || 0);
}

function getReadCount(book: SerialBook) {
  return Number(book.read_count || book.view_count || 0);
}

function getLikeCount(book: SerialBook) {
  return Number(book.favorite_count || book.like_count || book.review_count || 0);
}

function getPrice(book: SerialBook) {
  return Number(book.coin_price ?? book.price ?? 0);
}

function formatCompactCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return value.toLocaleString("th-TH");
}

function getAccessLabel(book: SerialBook) {
  if (book.access_type === "subscription") return "แพ็กเกจ";
  const price = getPrice(book);
  if (book.access_type === "paid" || price > 0) {
    return `${Math.ceil(price).toLocaleString("th-TH")} คอยน์`;
  }
  return "ฟรี";
}

function handleImgError(event: Event) {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
}

function goToBook(id: number) {
  router.push({ name: "BookDetail", params: { id } });
}

function selectTab(tab: string) {
  activeTab.value = tab;
  currentPage.value = 1;
}

function setCategory(category: string) {
  categoryFilter.value = category;
  currentPage.value = 1;
  router.replace({
    name: "Serials",
    query: {
      ...route.query,
      category: category === "all" ? undefined : category,
    },
  });
}

function toggleCategoryExpanded() {
  categoryExpanded.value = !categoryExpanded.value;

  if (!categoryExpanded.value) {
    requestAnimationFrame(() => {
      const rail = document.querySelector<HTMLElement>("[data-serial-category-rail]");
      rail?.scrollTo({ left: 0, behavior: "smooth" });
    });
  }
}

function scrollCategoryRail(direction: -1 | 1) {
  const rail = document.querySelector<HTMLElement>("[data-serial-category-rail]");
  if (!rail) return;
  rail.scrollBy({
    left: direction * Math.max(rail.clientWidth * 0.92, 360),
    behavior: "smooth",
  });
}

function setPage(nextPage: number) {
  currentPage.value = Math.min(totalPages.value, Math.max(1, nextPage));
}

async function loadSerialBooks() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get<ShelfResponse>("/serials");
    books.value = Array.isArray(data?.books) ? data.books : [];
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดรายการรายตอนไม่สำเร็จ";
    books.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.query.q,
  (keyword) => {
    search.value = String(keyword || "");
  },
);

watch(
  () => route.query.category,
  (category) => {
    categoryFilter.value = String(category || "all");
  },
);

watch([search, accessFilter, categoryFilter, activeTab], () => {
  currentPage.value = 1;
});

onMounted(loadSerialBooks);
</script>

<template>
  <main class="serial-page">
    <header class="serial-title">
      <h1>นิยายรัก</h1>
    </header>

    <section v-if="serialCategoryLinks.length" class="serial-category-overview" aria-label="หมวดหมู่รายตอน">
      <div class="serial-section-head">
        <div>
          <span>เลือกอ่านตามหมวด</span>
          <h2>หมวดหมู่หนังสือ</h2>
        </div>
        <button
          v-if="serialCategoryLinks.length > categoryPageSize"
          type="button"
          class="serial-view-all"
          @click="toggleCategoryExpanded"
        >
          {{ categoryExpanded ? "ย่อกลับ" : "ดูทั้งหมด" }}
        </button>
      </div>

      <div class="serial-category-carousel">
        <button
          v-if="!categoryExpanded && serialCategoryLinks.length > categoryPageSize"
          class="serial-category-arrow serial-category-arrow--left"
          type="button"
          aria-label="เลื่อนไปทางซ้าย"
          @click="scrollCategoryRail(-1)"
        ></button>
        <button
          v-if="!categoryExpanded && serialCategoryLinks.length > categoryPageSize"
          class="serial-category-arrow serial-category-arrow--right"
          type="button"
          aria-label="เลื่อนไปทางขวา"
          @click="scrollCategoryRail(1)"
        ></button>

        <div
          class="serial-category-grid"
          :class="{ 'serial-category-grid--expanded': categoryExpanded }"
          data-serial-category-rail
        >
          <button
            v-for="category in serialCategoryLinks"
            :key="category.name"
            type="button"
            class="serial-category-chip"
            :class="[
              `serial-category-chip--${category.tone}`,
              `serial-category-chip--art-${category.art}`,
              { active: categoryFilter === category.name },
            ]"
            @click="setCategory(category.name)"
          >
            <span class="serial-category-art" :class="`serial-category-art--${category.art}`" aria-hidden="true">
              <span class="serial-category-art__spark serial-category-art__spark--one"></span>
              <span class="serial-category-art__spark serial-category-art__spark--two"></span>
              <span class="serial-category-art__head"></span>
              <span class="serial-category-art__body"></span>
              <span class="serial-category-art__book"></span>
            </span>
            <strong>{{ category.name }}</strong>
          </button>
        </div>
      </div>
    </section>
    <section class="serial-tabs" aria-label="หมวดนิยายรายตอน">
      <button
        v-for="tab in tabItems"
        :key="tab.key"
        type="button"
        :class="{ active: activeTab === tab.key }"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </section>

    <section class="serial-filter-bar" aria-label="ตัวกรองนิยายรายตอน">
      <button type="button" @click="accessFilter = accessFilter === 'free' ? 'all' : 'free'">
        {{ accessFilter === "free" ? "ฟรีเท่านั้น" : "แท็ก" }}
      </button>
      <button
        type="button"
        @click="search = ''; accessFilter = 'all'; categoryFilter = 'all'"
      >
        ล้างตัวกรอง
      </button>
    </section>

    <div v-if="loading" class="state-box">กำลังโหลดรายการรายตอน...</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
    <div v-else-if="filteredBooks.length === 0" class="state-box">
      ยังไม่มีนิยายรายตอนที่ตรงกับเงื่อนไขนี้
    </div>

    <template v-else>
      <section class="serial-list-head">
        <h2>{{ activeTabLabel }}</h2>
        <div class="pager">
          <button type="button" :disabled="currentPage <= 1" @click="setPage(currentPage - 1)">
            &lt;
          </button>
          <span>หน้าที่ {{ currentPage }}</span>
          <button type="button" :disabled="currentPage >= totalPages" @click="setPage(currentPage + 1)">
            &gt;
          </button>
        </div>
      </section>

      <section class="serial-list" aria-label="รายการนิยายรายตอน">
        <article
          v-for="book in pagedBooks"
          :key="book.id"
          class="serial-list-card"
          role="button"
          tabindex="0"
          @click="goToBook(book.id)"
          @keydown.enter.prevent="goToBook(book.id)"
          @keydown.space.prevent="goToBook(book.id)"
        >
          <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
          <div class="serial-card-copy">
            <h3>{{ book.title }}</h3>
            <p>{{ book.author || "ไม่ระบุผู้เขียน" }}</p>
            <div class="serial-meta">
              <span>ตอน {{ getEpisodeCount(book) }}</span>
              <span>อ่าน {{ formatCompactCount(getReadCount(book)) }}</span>
              <span>ถูกใจ {{ formatCompactCount(getLikeCount(book)) }}</span>
            </div>
            <div class="tag-row">
              <span>{{ book.category_name || "โรแมนติก" }}</span>
              <span>{{ getAccessLabel(book) }}</span>
              <span v-if="book.access_type === 'free'">ฟรี</span>
            </div>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.serial-page {
  width: min(100% - 28px, 1000px);
  min-height: 100%;
  margin: 0 auto;
  padding: 30px 0 64px;
  background: var(--bg);
  color: var(--text-strong);
}

.serial-title {
  text-align: center;
  padding: 0 0 48px;
}

.serial-title h1 {
  margin: 0;
  color: #000000;
  font-size: 30px;
  font-weight: 900;
}

.serial-category-overview {
  margin-bottom: 30px;
}

.serial-section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 12px;
}

.serial-section-head span,
.serial-view-all {
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
}

.serial-section-head h2 {
  margin: 3px 0 0;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 900;
}

.serial-view-all {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 2px 0;
}

.serial-category-carousel {
  position: relative;
}

.serial-category-grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(280px, calc((100% - 42px) / 4));
  grid-template-rows: repeat(2, minmax(112px, auto));
  gap: 16px 14px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  padding: 6px 58px 16px 6px;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.serial-category-grid--expanded {
  grid-auto-flow: row;
  grid-auto-columns: unset;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  grid-template-rows: none;
  overflow-x: visible;
  padding-right: 2px;
  scroll-snap-type: none;
}

.serial-category-grid::-webkit-scrollbar {
  display: none;
}

.serial-category-arrow {
  position: absolute;
  top: 50%;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.68));
  color: var(--primary-strong);
  cursor: pointer;
  box-shadow: 0 12px 30px rgba(15, 118, 110, 0.16);
  transform: translateY(-50%);
}

.serial-category-arrow::before {
  content: "";
  width: 11px;
  height: 11px;
  border-top: 2.5px solid currentColor;
  border-right: 2.5px solid currentColor;
  border-radius: 1.5px;
  transform: rotate(45deg) translate(-1px, 1px);
}

.serial-category-arrow--left {
  left: 8px;
}

.serial-category-arrow--right {
  right: 8px;
}

.serial-category-arrow--left::before {
  transform: rotate(-135deg) translate(-1px, 1px);
}

.serial-category-chip {
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
    radial-gradient(circle at 83% 18%, color-mix(in srgb, var(--chip-b) 82%, white) 0 4px, transparent 4.8px),
    linear-gradient(100deg, color-mix(in srgb, var(--chip-c) 82%, white) 0%, var(--chip-d) 46%, color-mix(in srgb, var(--chip-b) 34%, white) 100%);
  color: color-mix(in srgb, var(--chip-a) 76%, #101828);
  cursor: pointer;
  padding: 20px 128px 20px 24px;
  scroll-snap-align: start;
  text-align: left;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 16px 30px color-mix(in srgb, var(--chip-a) 18%, transparent);
}

.serial-category-chip.active {
  border-color: color-mix(in srgb, var(--chip-a) 70%, white);
  box-shadow:
    inset 0 0 0 2px rgba(255, 255, 255, 0.78),
    0 18px 34px color-mix(in srgb, var(--chip-a) 24%, transparent);
}

.serial-category-chip::before {
  content: "";
  position: absolute;
  inset: 8px 8px 8px auto;
  z-index: -1;
  width: 44%;
  border-radius: 999px 18px 18px 999px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--chip-a) 18%, white), color-mix(in srgb, var(--chip-b) 36%, white));
}

.serial-category-chip strong {
  display: block;
  position: relative;
  z-index: 2;
  overflow: hidden;
  font-size: clamp(16px, 1.16vw, 21px);
  font-weight: 900;
  line-height: 1.1;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.serial-category-art {
  position: absolute;
  right: 4px;
  bottom: -2px;
  width: 120px;
  height: 118px;
  transform: scale(0.88);
  transform-origin: right bottom;
}

.serial-category-art::before {
  content: "";
  position: absolute;
  right: 4px;
  bottom: 5px;
  width: 86px;
  height: 86px;
  border-radius: 999px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--chip-b) 42%, white), color-mix(in srgb, var(--chip-a) 18%, white));
  opacity: 0.74;
}

.serial-category-art__head,
.serial-category-art__body,
.serial-category-art__book,
.serial-category-art__spark {
  position: absolute;
  display: block;
}

.serial-category-art__head {
  top: 15px;
  left: 56px;
  width: 46px;
  height: 46px;
  border: 2px solid rgba(15, 23, 42, 0.1);
  border-radius: 48% 52% 46% 54%;
  background:
    radial-gradient(circle at 34% 45%, #163b37 0 2.4px, transparent 2.9px),
    radial-gradient(circle at 66% 45%, #163b37 0 2.4px, transparent 2.9px),
    #ffe3c4;
  box-shadow: 0 -12px 0 -3px color-mix(in srgb, var(--chip-a) 58%, #6b3f22);
}

.serial-category-art__body {
  top: 63px;
  left: 43px;
  width: 66px;
  height: 52px;
  border-radius: 22px 22px 12px 12px;
  background: linear-gradient(135deg, var(--chip-a), color-mix(in srgb, var(--chip-a) 64%, #0f172a));
}

.serial-category-art__book {
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
}

.serial-category-art__spark {
  width: 14px;
  height: 14px;
  background: var(--chip-b);
  clip-path: polygon(50% 0, 63% 36%, 100% 50%, 63% 64%, 50% 100%, 37% 64%, 0 50%, 37% 36%);
}

.serial-category-art__spark--one {
  top: 8px;
  right: 6px;
}

.serial-category-art__spark--two {
  top: 42px;
  left: 18px;
  width: 11px;
  height: 11px;
  opacity: 0.78;
}

.serial-category-chip--romance,
.serial-category-chip--manga,
.serial-category-chip--drama {
  --chip-a: #ec407a;
  --chip-b: #f9a8d4;
  --chip-c: #fff0f7;
  --chip-d: #fff8fc;
}

.serial-category-chip--fantasy,
.serial-category-chip--story,
.serial-category-chip--wisdom {
  --chip-a: #7c3aed;
  --chip-b: #d8b4fe;
  --chip-c: #f6efff;
  --chip-d: #fff8ff;
}

.serial-category-chip--mystery,
.serial-category-chip--study,
.serial-category-chip--wellness,
.serial-category-chip--kids {
  --chip-a: #168a4b;
  --chip-b: #86efac;
  --chip-c: #eafbea;
  --chip-d: #f8fff8;
}

.serial-category-chip--technology,
.serial-category-chip--audio,
.serial-category-chip--teen {
  --chip-a: #1d4ed8;
  --chip-b: #93c5fd;
  --chip-c: #eaf6ff;
  --chip-d: #f8fcff;
}

.serial-category-chip--chinese,
.serial-category-chip--business {
  --chip-a: #d97706;
  --chip-b: #facc15;
  --chip-c: #fff4cf;
  --chip-d: #fffaf0;
}

.serial-tabs {
  display: flex;
  gap: 28px;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
  scrollbar-width: none;
}

.serial-tabs::-webkit-scrollbar {
  display: none;
}

.serial-tabs button {
  position: relative;
  flex: 0 0 auto;
  min-height: 42px;
  border: 0;
  background: transparent;
  color: #000000;
  cursor: pointer;
  font-size: 19px;
  font-weight: 900;
  padding: 0;
}

.serial-tabs button.active {
  color: #00bfae;
}

.serial-tabs button.active::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 3px;
  border-radius: 999px;
  background: #00d3bf;
}

.serial-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 0 54px;
}

.serial-filter-bar button {
  min-height: 36px;
  border: 0;
  border-radius: 999px;
  background: #eeeeee;
  color: #111827;
  cursor: pointer;
  font: inherit;
  padding: 0 14px;
}

.serial-list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.serial-list-head h2 {
  margin: 0;
  color: #000000;
  font-size: 30px;
  font-weight: 900;
}

.pager {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #8b8f96;
  font-weight: 800;
}

.pager button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #b7bcc4;
  border-radius: 3px;
  background: #ffffff;
  color: #00a99d;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.pager button:disabled {
  color: #aeb4bd;
  cursor: not-allowed;
  opacity: 0.72;
}

.serial-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 58px;
  row-gap: 30px;
  padding-top: 20px;
}

.serial-list-card {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  cursor: pointer;
}

.serial-list-card img {
  width: 140px;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  background: var(--surface-soft);
  object-fit: cover;
}

.serial-card-copy {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
}

.serial-card-copy h3 {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #000000;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.serial-card-copy p {
  margin: 0;
  color: #8b8f96;
  font-size: 14px;
  font-weight: 800;
}

.serial-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #8b8f96;
  font-size: 14px;
  font-weight: 800;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.tag-row span {
  border: 1px solid #e0e2e6;
  border-radius: 999px;
  color: #8b8f96;
  font-size: 13px;
  line-height: 1;
  padding: 8px 14px;
}

.state-box {
  margin: 20px auto;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  padding: 22px;
  text-align: center;
}

.state-box.error {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #be123c;
}

@media (max-width: 860px) {
  .serial-title {
    padding-bottom: 28px;
  }

  .serial-section-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .serial-category-grid {
    grid-auto-columns: minmax(260px, calc(100% - 38px));
    grid-template-rows: repeat(2, minmax(104px, auto));
    gap: 10px;
    padding-right: 38px;
  }

  .serial-category-grid--expanded {
    grid-template-columns: 1fr;
    padding-right: 2px;
  }

  .serial-category-chip {
    min-height: 104px;
    border-radius: 18px;
    padding: 16px 92px 16px 15px;
  }

  .serial-category-chip strong {
    font-size: 14px;
    line-height: 1.1;
  }

  .serial-category-art {
    right: 2px;
    bottom: -4px;
    width: 108px;
    height: 106px;
    transform: scale(0.72);
  }

  .serial-tabs {
    gap: 20px;
  }

  .serial-list {
    grid-template-columns: 1fr;
    row-gap: 22px;
  }
}

@media (max-width: 520px) {
  .serial-page {
    width: min(100% - 20px, 1000px);
    padding-top: 22px;
  }

  .serial-tabs button {
    font-size: 16px;
  }

  .serial-filter-bar {
    padding-bottom: 34px;
  }

  .serial-category-grid {
    grid-auto-columns: minmax(250px, calc(100% - 30px));
    grid-template-rows: repeat(2, minmax(96px, auto));
    gap: 8px;
    padding-right: 30px;
  }

  .serial-category-grid--expanded {
    grid-template-columns: 1fr;
    padding-right: 2px;
  }

  .serial-category-chip {
    min-height: 96px;
    padding: 14px 76px 14px 12px;
  }

  .serial-category-chip strong {
    font-size: 12px;
  }

  .serial-list-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .serial-list-card {
    grid-template-columns: 112px minmax(0, 1fr);
  }

  .serial-list-card img {
    width: 112px;
  }
}
</style>
