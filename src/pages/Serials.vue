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
  content_type?: string;
  current_page?: number;
  progress_percent?: number | string;
  last_read_at?: string | null;
};

type ShelfResponse = {
  books: SerialBook[];
  count?: number;
};

type CategoryResponseItem = {
  id: number;
  name?: string;
  display_tone?: string | null;
  display_art?: string | null;
  show_on_home?: boolean | number | null;
  sort_order?: number | null;
};

type SerialCategoryButton = {
  name: string;
  tone?: string | null;
  art?: string | null;
};

type CuratedSection = {
  name: string;
  books: SerialBook[];
};

type CuratedGroup = {
  title: string;
  sections: CuratedSection[];
};

const route = useRoute();
const router = useRouter();

const books = ref<SerialBook[]>([]);
const progressBooks = ref<SerialBook[]>([]);
const adminCategoryItems = ref<SerialCategoryButton[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const search = ref(String(route.query.q || ""));
const accessFilter = ref("all");
const categoryFilter = ref(String(route.query.category || "all"));
const activeTab = ref(String(route.query.tab || "hot"));
const currentPage = ref(1);
const pageSize = 20;
const continuePageSize = 10;

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

const serialCategoryItems = computed<SerialCategoryButton[]>(() => {
  const fallbackByName = new Map(
    fallbackCategoryItems.value.map((category) => [normalizeCategoryKey(category.name), category]),
  );
  const adminItems = adminCategoryItems.value.filter((category) =>
    fallbackByName.has(normalizeCategoryKey(category.name)),
  );

  if (!adminItems.length) return fallbackCategoryItems.value;

  const adminKeys = new Set(adminItems.map((category) => normalizeCategoryKey(category.name)));
  return [
    ...adminItems,
    ...fallbackCategoryItems.value.filter((category) => !adminKeys.has(normalizeCategoryKey(category.name))),
  ];
});

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

const hasActiveFilters = computed(() =>
  Boolean(search.value.trim()) || accessFilter.value !== "all" || categoryFilter.value !== "all",
);

const continueAllView = computed(() => route.query.view === "continue");
const continueAllBooks = computed(() => {
  const source = progressBooks.value.length ? progressBooks.value : sortedBooks.value;
  return source.filter((book) => book.content_type === "serial" || !book.content_type);
});
const continueAllTotalPages = computed(() =>
  Math.max(1, Math.ceil(continueAllBooks.value.length / continuePageSize)),
);
const pagedContinueAllBooks = computed(() => {
  const start = (currentPage.value - 1) * continuePageSize;
  return continueAllBooks.value.slice(start, start + continuePageSize);
});
const continueBooks = computed(() => continueAllBooks.value.slice(0, 4));

const curatedGroups = computed<CuratedGroup[]>(() => {
  const orderedNames = serialCategoryItems.value.map((category) => category.name);
  const fallbackNames = categoryOptions.value.filter((name) => !orderedNames.includes(name));
  const availableNames = [...orderedNames, ...fallbackNames];
  const usedKeys = new Set<string>();
  const groups: CuratedGroup[] = [];

  const makeSection = (candidates: string[]) => {
    const name = findCategoryName(availableNames, candidates, usedKeys);
    if (!name) return null;

    const books = sortedBooks.value.filter((book) => book.category_name === name).slice(0, 6);
    if (!books.length) return null;

    usedKeys.add(normalizeCategoryKey(name));
    return { name, books };
  };

  const loveSections = [
    makeSection(["นิยายรัก", "love novel", "love"]),
    makeSection(["นิยายโรมานซ์", "โรมานซ์", "romance"]),
    makeSection(["นิยายรักวัยรุ่น", "รักวัยรุ่น", "วัยรุ่น"]),
    makeSection(["นิยายรักวัยวุ่น", "รักวัยวุ่น", "วัยวุ่น"]),
    makeSection(["นิยายรักโรแมนติก", "รักโรแมนติก", "โรแมนติก"]),
  ].filter(Boolean) as CuratedSection[];

  if (loveSections.length) {
    groups.push({ title: "Love Novel", sections: loveSections });
  }

  const boyLoveSections = [
    makeSection(["นิยาย Boy Love Lovely Room", "Boy Love Lovely Room", "Lovely Room"]),
    makeSection(["นิยาย Boy Love Parry Room", "นิยาย Boy Love Party Room", "Boy Love Parry Room", "Boy Love Party Room", "Parry Room", "Party Room"]),
    makeSection(["Boy Love", "บอยเลิฟ", "วาย", "BL"]),
  ].filter(Boolean) as CuratedSection[];

  if (boyLoveSections.length) {
    groups.push({ title: "Boy Love", sections: boyLoveSections });
  }

  const remainingSections = availableNames
    .filter((name) => !usedKeys.has(normalizeCategoryKey(name)))
    .map((name) => ({
      name,
      books: sortedBooks.value.filter((book) => book.category_name === name).slice(0, 6),
    }))
    .filter((section) => section.books.length > 0)
    .slice(0, 6);

  if (remainingSections.length) {
    groups.push({ title: groups.length ? "หมวดอื่น ๆ" : "Love Novel", sections: remainingSections });
  }

  return groups.length
    ? groups
    : [{ title: "Love Novel", sections: [{ name: "นิยายรายตอน", books: sortedBooks.value.slice(0, 6) }] }];
});

function normalizeCategoryKey(value: string) {
  return value.trim().toLocaleLowerCase("th-TH");
}

function findCategoryName(names: string[], candidates: string[], usedKeys: Set<string>) {
  const candidateKeys = candidates.map(normalizeCategoryKey);
  const exactMatch = names.find((name) => {
    const key = normalizeCategoryKey(name);
    return !usedKeys.has(key) && candidateKeys.includes(key);
  });

  if (exactMatch) return exactMatch;

  return names.find((name) => {
    const key = normalizeCategoryKey(name);
    return !usedKeys.has(key) && candidateKeys.some((candidate) => key.includes(candidate) || candidate.includes(key));
  });
}

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

function setCategory(category: string) {
  categoryFilter.value = category;
  currentPage.value = 1;
  router.replace({
    name: "Serials",
    query: {
      ...route.query,
      view: undefined,
      category: category === "all" ? undefined : category,
    },
  });
}

function setPage(nextPage: number) {
  const pageLimit = continueAllView.value ? continueAllTotalPages.value : totalPages.value;
  currentPage.value = Math.min(pageLimit, Math.max(1, nextPage));
}

function viewCategory(name: string) {
  setCategory(name);
}

function viewContinueAll() {
  currentPage.value = 1;
  router.replace({
    name: "Serials",
    query: {
      ...route.query,
      view: "continue",
      category: undefined,
    },
  });
}

function getContinueEpisodeText(book: SerialBook) {
  const currentPage = Number(book.current_page || 0);
  if (currentPage > 0) return `ตอน : บทที่ ${currentPage} อ่านต่อได้เลย`;
  return `ตอน : ตอนที่ ${Math.max(1, getEpisodeCount(book))} อ่านต่อได้เลย`;
}

async function loadSerialBooks() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get<ShelfResponse>("/serials");
    books.value = Array.isArray(data?.books)
      ? data.books.map((book) => ({ ...book, content_type: book.content_type || "serial" }))
      : [];
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดรายการรายตอนไม่สำเร็จ";
    books.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadSerialCategories() {
  try {
    const { data } = await api.get<CategoryResponseItem[]>("/categories");
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
        const key = normalizeCategoryKey(category.name);
        if (!category.name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch {
    adminCategoryItems.value = [];
  }
}

async function loadProgressBooks() {
  try {
    const { data } = await api.get<ShelfResponse>("/progress");
    progressBooks.value = Array.isArray(data?.books)
      ? data.books.map((book) => ({ ...book, content_type: book.content_type || "serial" }))
      : [];
  } catch {
    progressBooks.value = [];
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

watch([search, accessFilter, activeTab], () => {
  if (!continueAllView.value) return;

  router.replace({
    name: "Serials",
    query: {
      ...route.query,
      view: undefined,
    },
  });
});

onMounted(() => {
  loadSerialBooks();
  loadSerialCategories();
  loadProgressBooks();
});
</script>

<template>
  <main class="serial-page">
    <header class="serial-title">
      <div>
        <h1>นิยายรายตอน</h1>
        <p>เลือกอ่านเรื่องที่อัปเดตต่อเนื่อง พร้อมค้นหาและตัวกรองแบบเดียวกับหน้าหนังสือ</p>
      </div>
    </header>

    <section class="search-panel" aria-label="ค้นหานิยายรายตอน">
      <input
        v-model="search"
        type="search"
        class="search-box"
        placeholder="ค้นหาชื่อเรื่อง ผู้เขียน หรือหมวดหมู่"
        aria-label="ค้นหานิยายรายตอน"
      />

      <div class="filter-row">
        <select v-model="activeTab" aria-label="เรียงรายการรายตอน">
          <option v-for="tab in tabItems" :key="tab.key" :value="tab.key">
            {{ tab.label }}
          </option>
        </select>
        <select v-model="accessFilter" aria-label="กรองสิทธิ์อ่าน">
          <option value="all">ทุกสิทธิ์อ่าน</option>
          <option value="free">อ่านฟรี</option>
          <option value="paid">ซื้อรายเรื่อง</option>
          <option value="subscription">แพ็กเกจสมาชิก</option>
        </select>
      </div>

      <div class="category-filter" aria-label="กรองหมวดหมู่">
        <select
          class="category-select"
          :value="categoryFilter"
          aria-label="กรองหมวดหมู่"
          @change="setCategory(($event.target as HTMLSelectElement).value)"
        >
          <option value="all">ทุกหมวดหมู่</option>
          <option v-for="category in serialCategoryItems" :key="category.name" :value="category.name">
            {{ category.name }}
          </option>
        </select>
      </div>
    </section>

    <div v-if="loading" class="state-box">กำลังโหลดรายการรายตอน...</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
    <div v-else-if="filteredBooks.length === 0" class="state-box">
      ยังไม่มีนิยายรายตอนที่ตรงกับเงื่อนไขนี้
    </div>

    <template v-else-if="continueAllView">
      <section class="continue-all-page" aria-label="อ่านต่อทั้งหมด">
        <h2>อ่านต่อ</h2>

        <div v-if="continueAllBooks.length" class="continue-all-grid">
          <article
            v-for="book in pagedContinueAllBooks"
            :key="book.id"
            class="continue-all-card"
            role="button"
            tabindex="0"
            @click="goToBook(book.id)"
            @keydown.enter.prevent="goToBook(book.id)"
            @keydown.space.prevent="goToBook(book.id)"
          >
            <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
            <div class="continue-all-copy">
              <h3>{{ book.title }}</h3>
              <p>{{ book.author || "ไม่ระบุผู้เขียน" }}</p>
              <span>{{ getContinueEpisodeText(book) }}</span>
            </div>
          </article>
        </div>

        <div v-else class="state-box">ยังไม่มีรายการอ่านค้างไว้</div>

        <div v-if="continueAllBooks.length" class="pager continue-pager">
          <button type="button" :disabled="currentPage <= 1" @click="setPage(currentPage - 1)">
            &lt;
          </button>
          <span>หน้าที่ {{ currentPage }}</span>
          <button type="button" :disabled="currentPage >= continueAllTotalPages" @click="setPage(currentPage + 1)">
            &gt;
          </button>
        </div>
      </section>
    </template>

    <template v-else-if="hasActiveFilters">
      <section class="serial-list" aria-label="รายการนิยายรายตอน">
        <article
          v-for="book in pagedBooks"
          :key="book.id"
          class="serial-list-card"
        >
          <div
            class="serial-card-clickable"
            role="button"
            tabindex="0"
            @click="goToBook(book.id)"
            @keydown.enter.prevent="goToBook(book.id)"
            @keydown.space.prevent="goToBook(book.id)"
          >
            <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
            <div class="serial-card-badges">
              <span>รายตอน</span>
              <span>{{ getAccessLabel(book) }}</span>
            </div>
            <h3>{{ book.title }}</h3>
            <p>{{ book.author || "ไม่ระบุผู้เขียน" }}</p>
            <small v-if="book.category_name">{{ book.category_name }}</small>
          </div>

          <div class="serial-card-footer">
            <div class="serial-stat">
              <strong>{{ getEpisodeCount(book) }} ตอน</strong>
              <span>{{ formatCompactCount(getReadCount(book)) }} อ่าน</span>
            </div>
            <button class="serial-price-pill" type="button" @click="goToBook(book.id)">
              {{ getAccessLabel(book) }}
            </button>
          </div>
        </article>
      </section>

      <div v-if="totalPages > 1" class="pager">
        <button type="button" :disabled="currentPage <= 1" @click="setPage(currentPage - 1)">
          &lt;
        </button>
        <span>หน้าที่ {{ currentPage }}</span>
        <button type="button" :disabled="currentPage >= totalPages" @click="setPage(currentPage + 1)">
          &gt;
        </button>
      </div>
    </template>

    <template v-else>
      <section v-if="continueBooks.length" class="continue-section" aria-label="อ่านต่อ">
        <div class="section-heading">
          <h2>อ่านต่อ <span aria-hidden="true">?</span></h2>
          <button type="button" @click="viewContinueAll">ดูทั้งหมด</button>
        </div>

        <div class="rail-status" aria-hidden="true"><span></span></div>

        <div class="continue-rail">
          <article
            v-for="book in continueBooks"
            :key="book.id"
            class="continue-card"
            role="button"
            tabindex="0"
            @click="goToBook(book.id)"
            @keydown.enter.prevent="goToBook(book.id)"
            @keydown.space.prevent="goToBook(book.id)"
          >
            <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
            <div>
              <strong>{{ book.title }}</strong>
              <span>{{ getContinueEpisodeText(book) }}</span>
            </div>
          </article>
        </div>
      </section>

      <section class="curated-groups" aria-label="หมวดนิยายรายตอน">
        <section
          v-for="group in curatedGroups"
          :key="group.title"
          class="curated-group"
          :aria-label="group.title"
        >
          <h2>{{ group.title }}</h2>

          <section
            v-for="section in group.sections"
            :key="section.name"
            class="curated-row"
            :aria-label="section.name"
          >
            <div class="row-heading">
              <h3>{{ section.name }}</h3>
              <button type="button" @click="viewCategory(section.name)">ดูทั้งหมด</button>
            </div>

            <div class="curated-rail">
              <article
                v-for="book in section.books"
                :key="book.id"
                class="curated-card"
                role="button"
                tabindex="0"
                @click="goToBook(book.id)"
                @keydown.enter.prevent="goToBook(book.id)"
                @keydown.space.prevent="goToBook(book.id)"
              >
                <img :src="getBookCover(book)" :alt="book.title" @error="handleImgError" />
                <h4>{{ book.title }}</h4>
                <p>{{ book.author || "ไม่ระบุผู้เขียน" }}</p>
                <div class="curated-meta">
                  <span>{{ getEpisodeCount(book) }} ตอน</span>
                  <span>{{ formatCompactCount(getReadCount(book)) }}</span>
                  <span>{{ formatCompactCount(getLikeCount(book)) }}</span>
                </div>
              </article>
            </div>
          </section>
        </section>
      </section>
    </template>
  </main>
</template>

<style scoped>
.serial-page {
  width: min(100% - 48px, 1180px);
  max-width: 1180px;
  min-height: 100%;
  margin: 0 auto;
  padding: var(--page-block, 28px) 0 44px;
  background: var(--bg);
  color: var(--text-strong);
  overflow-x: hidden;
}

.serial-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding: 0;
}

.serial-title h1 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 36px;
  font-weight: 900;
}

.serial-title p {
  max-width: 680px;
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}

.search-panel {
  display: grid;
  gap: 12px;
  margin-bottom: 24px;
}

.search-box {
  width: 100%;
  max-width: 520px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-strong);
  font-size: 16px;
  outline: none;
  padding: 12px 16px;
}

.search-box:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-row select {
  min-height: 42px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-strong);
  font-weight: 800;
  padding: 0 12px;
}

.category-filter {
  display: grid;
  gap: 10px;
}

.category-select {
  width: min(100%, 240px);
  min-height: 40px;
  border: 1px solid color-mix(in srgb, var(--primary) 34%, var(--border));
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-strong);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  outline: none;
  padding: 0 38px 0 14px;
}

.category-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
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

.continue-pager {
  justify-content: center;
  margin: 0;
  padding: 4px 0 0;
}

.continue-section,
.curated-groups {
  display: grid;
  gap: 24px;
}

.continue-section {
  position: relative;
  margin: 18px 0 52px;
}

.rail-status {
  position: absolute;
  top: 33px;
  right: 0;
  z-index: 2;
  height: 8px;
  pointer-events: none;
}

.rail-status span {
  display: block;
  width: 30px;
  height: 7px;
  border: 2px solid #00c2b2;
  border-radius: 999px;
  background: #0b1117;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.section-heading,
.row-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-heading h2,
.curated-group > h2,
.row-heading h3 {
  margin: 0;
  color: #050505;
  font-weight: 900;
  letter-spacing: 0;
}

.section-heading h2 {
  font-size: 26px;
}

.section-heading h2 span {
  display: inline-grid;
  width: 12px;
  height: 12px;
  place-items: center;
  border-radius: 999px;
  background: #8b949e;
  color: #ffffff;
  font-size: 8px;
  vertical-align: middle;
}

.curated-group > h2 {
  font-size: 28px;
}

.row-heading h3 {
  font-size: 18px;
}

.section-heading button,
.row-heading button {
  border: 0;
  background: transparent;
  color: #00a99d;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  padding: 0;
}

.continue-rail,
.curated-rail {
  display: grid;
  grid-auto-flow: column;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
}

.continue-rail::-webkit-scrollbar,
.curated-rail::-webkit-scrollbar {
  display: none;
}

.continue-rail {
  grid-auto-columns: calc((100% - 72px) / 4);
  gap: 24px;
}

.continue-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  min-height: 72px;
  overflow: hidden;
  border-radius: 8px;
  background: #f3f3f3;
  cursor: pointer;
}

.continue-card img {
  width: 72px;
  height: 72px;
  object-fit: cover;
}

.continue-card div {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 0 14px;
}

.continue-card strong,
.continue-card span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.continue-card strong {
  color: #050505;
  font-size: 15px;
  font-weight: 800;
}

.continue-card span {
  color: #ff2d68;
  font-size: 13px;
}

.curated-groups {
  gap: 48px;
}

.curated-group {
  display: grid;
  gap: 18px;
}

.curated-row {
  display: grid;
  gap: 12px;
}

.curated-rail {
  grid-auto-columns: minmax(0, calc((100% - 120px) / 6));
  gap: 24px;
}

.curated-card {
  display: grid;
  align-content: start;
  min-width: 0;
  cursor: pointer;
}

.curated-card img {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  background: var(--surface-soft);
  object-fit: cover;
}

.curated-card h4 {
  display: -webkit-box;
  min-height: 44px;
  margin: 10px 0 4px;
  overflow: hidden;
  color: #101010;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.4;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.curated-card p {
  overflow: hidden;
  margin: 0 0 6px;
  color: #8b8f96;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.curated-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #8b8f96;
  font-size: 11px;
}

.continue-all-page {
  display: grid;
  gap: 32px;
  padding-top: 22px;
}

.continue-all-page h2 {
  margin: 0;
  color: #050505;
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 0;
}

.continue-all-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 72px;
  row-gap: 40px;
}

.continue-all-card {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
  cursor: pointer;
}

.continue-all-card img {
  width: 130px;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  background: var(--surface-soft);
  object-fit: cover;
}

.continue-all-copy {
  display: grid;
  align-content: start;
  min-width: 0;
  padding-top: 2px;
}

.continue-all-copy h3 {
  display: -webkit-box;
  min-height: 46px;
  margin: 0 0 42px;
  overflow: hidden;
  color: #050505;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.continue-all-copy p {
  overflow: hidden;
  margin: 0 0 12px;
  color: #8b8f96;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.continue-all-copy span {
  color: #ff2d68;
  font-size: 14px;
  line-height: 1.5;
}

.serial-list {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 22px;
  width: 100%;
}

.serial-list-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 2px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.serial-list-card img {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 0;
  background: var(--surface-soft);
  object-fit: cover;
}

.serial-card-clickable {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  cursor: pointer;
}

.serial-card-badges {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 8px 7px;
}

.serial-card-badges span {
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 900;
  max-width: 50%;
  padding: 4px 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.serial-card-clickable h3 {
  display: -webkit-box;
  min-height: 38px;
  margin: 0 8px 6px;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 900;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.serial-card-clickable p {
  display: -webkit-box;
  min-height: 16px;
  margin: 0 8px 2px;
  overflow: hidden;
  color: var(--text);
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

.serial-card-clickable small {
  min-height: 14px;
  margin: 0 8px;
  color: var(--text-muted);
  font-size: 10px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.serial-card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding: 8px;
}

.serial-stat {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.serial-stat strong {
  color: var(--text-strong);
  font-size: 12px;
  line-height: 1.1;
}

.serial-stat span {
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.2;
}

.serial-price-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  min-height: 24px;
  border: 0;
  border-radius: 2px;
  background: #00b874;
  color: #ffffff;
  cursor: pointer;
  font-size: 10px;
  font-weight: 900;
  padding: 0 7px;
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
    display: block;
  }
  .serial-list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .continue-rail {
    grid-auto-columns: calc((100% - 48px) / 3);
  }

  .curated-rail {
    grid-auto-columns: minmax(0, calc((100% - 48px) / 3));
    gap: 24px;
  }

  .continue-all-grid {
    column-gap: 28px;
  }

  .continue-all-card {
    grid-template-columns: 116px minmax(0, 1fr);
  }

  .continue-all-card img {
    width: 116px;
  }
}

@media (max-width: 520px) {
  .serial-page {
    padding: 20px 10px 36px;
  }
  .serial-list-card {
    min-width: 0;
  }

  .serial-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-heading h2 {
    font-size: 18px;
  }

  .curated-group > h2 {
    font-size: 18px;
  }

  .row-heading h3 {
    font-size: 13px;
  }

  .continue-rail {
    grid-auto-columns: minmax(168px, calc(50% - 8px));
    gap: 16px;
  }

  .curated-rail {
    grid-auto-columns: minmax(96px, calc(33.333% - 10px));
  }

  .curated-card h4 {
    font-size: 14px;
    min-height: 40px;
  }

  .curated-card p,
  .curated-meta {
    font-size: 12px;
  }

  .continue-all-page h2 {
    font-size: 30px;
  }

  .continue-all-grid {
    grid-template-columns: 1fr;
    row-gap: 28px;
  }

  .continue-all-card {
    grid-template-columns: 104px minmax(0, 1fr);
    gap: 14px;
  }

  .continue-all-card img {
    width: 104px;
  }

  .continue-all-copy h3 {
    min-height: 42px;
    margin-bottom: 28px;
    font-size: 16px;
  }

  .continue-all-copy p,
  .continue-all-copy span {
    font-size: 13px;
  }
}
</style>
