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
  serial_status?: "ongoing" | "completed" | "hiatus" | string | null;
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
  title?: string;
  sections: CuratedSection[];
};

const route = useRoute();
const router = useRouter();

const books = ref<SerialBook[]>([]);
const progressBooks = ref<SerialBook[]>([]);
const adminCategoryItems = ref<SerialCategoryButton[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const statusMessage = ref("");
const actionBookId = ref<number | null>(null);
const search = ref(String(route.query.q || ""));
const accessFilter = ref("all");
const serialStatusFilter = ref("all");
const categoryFilter = ref(String(route.query.category || "all"));
const activeTab = ref(String(route.query.tab || "hot"));
const currentPage = ref(1);
const pageSize = 20;
const continuePageSize = 10;

const filteredBooks = computed(() => {
  const matchedBooks = filterBooks(books.value, search.value, {
    contentType: "serial",
    accessType: accessFilter.value,
    category: categoryFilter.value,
  }) as SerialBook[];

  if (serialStatusFilter.value === "all") return matchedBooks;
  return matchedBooks.filter((book) => (book.serial_status || "ongoing") === serialStatusFilter.value);
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

const visibleCategoryChips = computed(() => serialCategoryItems.value.slice(0, 14));

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

const serialStatusItems = [
  { key: "all", label: "ทุกสถานะ" },
  { key: "ongoing", label: "กำลังอัปเดต" },
  { key: "completed", label: "จบแล้ว" },
  { key: "hiatus", label: "พักเรื่อง" },
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
  Boolean(search.value.trim()) ||
  accessFilter.value !== "all" ||
  serialStatusFilter.value !== "all" ||
  categoryFilter.value !== "all",
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

const curatedGroups = computed<CuratedGroup[]>(() => {
  const orderedNames = serialCategoryItems.value.map((category) => category.name);
  const fallbackNames = categoryOptions.value.filter((name) => !orderedNames.includes(name));
  const availableNames = [...orderedNames, ...fallbackNames];
  const usedKeys = new Set<string>();
  const groups: CuratedGroup[] = [];

  const makeSection = (labelOrCandidates: string | string[], maybeCandidates?: string[]) => {
    const label = Array.isArray(labelOrCandidates) ? "" : labelOrCandidates;
    const candidates = Array.isArray(labelOrCandidates) ? labelOrCandidates : maybeCandidates || [];
    const name = findCategoryName(availableNames, candidates, usedKeys);
    if (!name) return null;

    const books = sortedBooks.value.filter((book) => book.category_name === name).slice(0, 6);
    if (!books.length) return null;

    usedKeys.add(normalizeCategoryKey(name));
    return { name: label || name, books };
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

  const girlLoveSections = [
    makeSection("นิยาย Girl Love Lovely Room", ["นิยาย Girl Love Lovely Room", "Girl Love Lovely Room", "GL Lovely", "Lovely Room"]),
    makeSection("นิยาย Girl Love Party Room", ["นิยาย Girl Love Party Room", "Girl Love Party Room", "GL Party", "Party Room"]),
    makeSection("นิยาย Girl Love", ["Girl Love", "เกิร์ลเลิฟ", "ยูริ", "Yuri", "GL"]),
  ].filter(Boolean) as CuratedSection[];

  if (girlLoveSections.length) {
    groups.push({ title: "Girl Love", sections: girlLoveSections });
  }

  const genreSections = [
    makeSection("แฟนตาซี/sci-fi/โลกโนเวล", ["แฟนตาซี", "sci-fi", "scifi", "ไซไฟ", "โลกโนเวล", "fantasy", "science fiction"]),
    makeSection("สืบสวน/ลึกลับ/สยองขวัญ", ["สืบสวน", "ลึกลับ", "สยองขวัญ", "mystery", "horror", "thriller"]),
    makeSection("สะท้อนสังคม/แนวทางเลือก/เยาวชน", ["สะท้อนสังคม", "แนวทางเลือก", "เยาวชน", "สังคม", "youth", "social"]),
  ].filter(Boolean) as CuratedSection[];

  if (genreSections.length) {
    groups.push({ sections: genreSections });
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

function getPrimaryActionLabel(book: SerialBook) {
  if (book.access_type === "subscription") return "อ่านด้วยแพ็กเกจ";
  if (book.access_type === "paid" || getPrice(book) > 0) return "ดูตอน/ซื้อ";
  return "อ่านเลย";
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

function handlePrimaryAction(book: SerialBook) {
  goToBook(book.id);
}

function goToMyLibrary() {
  router.push({ name: "MyLibrary" });
}

function goToWishlist() {
  router.push({ name: "WishList" });
}

function goToCart() {
  router.push({ name: "Cart" });
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

function scrollCuratedRow(event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement | null;
  const row = button?.closest(".curated-row");
  const rail = row?.querySelector<HTMLElement>(".curated-rail");
  if (!rail) return;

  rail.scrollBy({
    left: Math.max(rail.clientWidth * 0.85, 240),
    behavior: "smooth",
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
    const { data } = await api.get<CategoryResponseItem[]>("/categories?scope=serial&include_all=0");
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

watch([search, accessFilter, serialStatusFilter, categoryFilter, activeTab], () => {
  currentPage.value = 1;
});

watch([search, accessFilter, serialStatusFilter, activeTab], () => {
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
      <div class="serial-title-copy">
        <span class="serial-kicker">Read and Voice Serial</span>
        <h1>นิยายรายตอน</h1>
        <p>เลือกเรื่องจากชั้นรายตอน ค้นหาเร็ว กรองสถานะได้ และแตะอ่านต่อได้ทันทีทั้งบนมือถือ แท็บเล็ต และเดสก์ท็อป</p>
      </div>
    </header>

    <section class="search-panel" aria-label="ค้นหานิยายรายตอน">
      <div class="search-line">
        <input
          v-model="search"
          type="search"
          class="search-box"
          placeholder="ค้นหาชื่อเรื่อง ผู้เขียน หรือหมวดหมู่"
          aria-label="ค้นหานิยายรายตอน"
        />

        <div class="header-actions" aria-label="เมนูของฉัน">
          <button class="top-btn" type="button" @click="goToWishlist">Wishlist</button>
          <button class="top-btn" type="button" @click="goToCart">ตะกร้า</button>
          <button class="top-btn primary" type="button" @click="goToMyLibrary">ชั้น</button>
        </div>
      </div>

      <div class="filter-row">
        <label>
          <span>เรียงตาม</span>
          <select v-model="activeTab" aria-label="เรียงรายการรายตอน">
            <option v-for="tab in tabItems" :key="tab.key" :value="tab.key">
              {{ tab.label }}
            </option>
          </select>
        </label>
        <label>
          <span>สิทธิ์อ่าน</span>
          <select v-model="accessFilter" aria-label="กรองสิทธิ์อ่าน">
            <option value="all">ทุกสิทธิ์อ่าน</option>
            <option value="free">อ่านฟรี</option>
            <option value="paid">ซื้อรายเรื่อง</option>
            <option value="subscription">แพ็กเกจสมาชิก</option>
          </select>
        </label>
        <label>
          <span>สถานะ</span>
          <select v-model="serialStatusFilter" aria-label="กรองสถานะนิยายรายตอน">
            <option v-for="status in serialStatusItems" :key="status.key" :value="status.key">
              {{ status.label }}
            </option>
          </select>
        </label>
        <label class="category-filter" aria-label="กรองหมวดหมู่">
          <span>หมวด</span>
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
        </label>
      </div>

      <div class="category-chip-row" aria-label="หมวดนิยายรายตอนยอดนิยม">
        <button
          class="category-chip"
          :class="{ active: categoryFilter === 'all' }"
          type="button"
          @click="setCategory('all')"
        >
          ทั้งหมด
        </button>
        <button
          v-for="category in visibleCategoryChips"
          :key="category.name"
          class="category-chip"
          :class="{ active: categoryFilter === category.name }"
          type="button"
          @click="setCategory(category.name)"
        >
          {{ category.name }}
        </button>
      </div>
    </section>

    <p v-if="statusMessage" class="serial-toast" role="status" aria-live="polite">
      {{ statusMessage }}
    </p>

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
            <div class="serial-card-actions">
              <button
                class="serial-price-pill"
                type="button"
                :disabled="actionBookId === book.id"
                @click="handlePrimaryAction(book)"
              >
                {{ actionBookId === book.id ? "..." : getPrimaryActionLabel(book) }}
              </button>
            </div>
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
      <section class="curated-groups" aria-label="หมวดนิยายรายตอน">
        <section
          v-for="(group, groupIndex) in curatedGroups"
          :key="group.title || `group-${groupIndex}`"
          class="curated-group"
          :class="{ 'curated-group--standalone': !group.title }"
          :aria-label="group.title || 'หมวดนิยายรายตอน'"
        >
          <h2 v-if="group.title">{{ group.title }}</h2>

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
                <div class="curated-actions">
                  <button
                    type="button"
                    :disabled="actionBookId === book.id"
                    @click.stop="handlePrimaryAction(book)"
                  >
                    {{ actionBookId === book.id ? "..." : getPrimaryActionLabel(book) }}
                  </button>
                </div>
              </article>
            </div>
            <button
              class="row-scroll-button"
              type="button"
              :aria-label="`เลื่อนแถว ${section.name}`"
              @click="scrollCuratedRow"
            >
              &gt;
            </button>
          </section>
        </section>
      </section>
    </template>
  </main>
</template>

<style scoped>
.serial-page {
  width: min(100% - 40px, 1180px);
  max-width: 1180px;
  min-height: 100%;
  margin: 0 auto;
  padding: 26px 0 52px;
  background: var(--bg);
  color: var(--text-strong);
  overflow-x: hidden;
}

.serial-title {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 420px);
  align-items: end;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 18px;
  padding: 0;
}

.serial-title-copy {
  min-width: 0;
}

.serial-kicker {
  display: inline-flex;
  margin-bottom: 7px;
  color: var(--primary);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.serial-title h1 {
  margin: 0 0 6px;
  color: var(--text-strong);
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 900;
  line-height: 1.08;
}

.serial-title p {
  max-width: 720px;
  margin: 0;
  color: var(--text-muted);
  line-height: 1.55;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  width: auto;
}

.top-btn {
  min-width: 0;
  min-height: 40px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--text-strong);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  padding: 0 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-btn.primary {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--on-primary);
}

.search-panel {
  display: grid;
  gap: 14px;
  min-width: 0;
  margin-bottom: 26px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  padding: 14px;
}

.search-line {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  gap: 14px;
  align-items: center;
}

.search-box {
  min-width: 0;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-soft);
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
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.filter-row label {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.filter-row label > span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 900;
}

.filter-row select {
  min-width: 0;
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--text-strong);
  font-weight: 800;
  padding: 0 12px;
}

.category-filter {
  display: grid;
  gap: 5px;
}

.category-select {
  width: 100%;
}

.category-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

.category-chip-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  padding: 2px 0 4px;
  scrollbar-width: none;
}

.category-chip-row::-webkit-scrollbar {
  display: none;
}

.category-chip {
  flex: 0 0 auto;
  max-width: 180px;
  min-height: 34px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-strong);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  padding: 0 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-chip.active {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--on-primary);
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

.curated-groups {
  display: grid;
  gap: 44px;
}

.row-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
}

.curated-group > h2,
.row-heading h3 {
  margin: 0;
  color: #050505;
  font-weight: 900;
  letter-spacing: 0;
}

.curated-group > h2 {
  font-size: 28px;
  line-height: 1.15;
}

.row-heading h3 {
  min-width: 0;
  font-size: 20px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.row-heading button {
  justify-self: end;
  border: 0;
  background: transparent;
  color: #00a99d;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  padding: 0;
  white-space: nowrap;
}

.curated-rail {
  display: grid;
  grid-auto-flow: column;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
}

.curated-rail::-webkit-scrollbar {
  display: none;
}

.curated-group {
  display: grid;
  gap: 24px;
}

.curated-group--standalone {
  gap: 34px;
}

.curated-group--standalone .row-heading h3 {
  font-size: 28px;
}

.curated-row {
  position: relative;
  display: grid;
  gap: 12px;
}

.curated-rail {
  grid-auto-columns: minmax(0, calc((100% - 108px) / 7));
  gap: 18px;
  padding-right: 2px;
  scroll-snap-type: x proximity;
}

.curated-card {
  display: grid;
  align-content: start;
  min-width: 0;
  cursor: pointer;
}

.curated-card img {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
  background: var(--surface-soft);
  object-fit: cover;
}

.curated-card h4 {
  display: -webkit-box;
  min-height: 40px;
  margin: 9px 0 4px;
  overflow: hidden;
  color: #101010;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
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
  gap: 7px;
  color: #8b8f96;
  font-size: 11px;
}

.curated-meta span:nth-child(1)::before {
  content: "☷ ";
}

.curated-meta span:nth-child(2)::before {
  content: "◎ ";
}

.curated-meta span:nth-child(3)::before {
  content: "♥ ";
}

.curated-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin-top: 8px;
}

.curated-actions button,
.serial-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  border: 1px solid color-mix(in srgb, var(--primary) 32%, var(--border));
  border-radius: 4px;
  background: var(--surface);
  color: var(--primary-strong);
  cursor: pointer;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  padding: 0 8px;
}

.curated-actions button:first-child {
  min-width: 0;
  overflow: hidden;
  border-color: var(--primary);
  background: var(--primary);
  color: var(--on-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.serial-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 40;
  max-width: min(360px, calc(100vw - 32px));
  margin: 0;
  border: 1px solid color-mix(in srgb, var(--primary) 28%, var(--border));
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
  padding: 12px 14px;
}

.curated-actions button:disabled,
.serial-card-actions button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.curated-actions .icon-action {
  padding: 0;
}

.curated-actions .library-action,
.serial-library-btn {
  font-size: 10px;
}

.row-scroll-button {
  position: absolute;
  right: -12px;
  top: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: rgba(112, 118, 124, 0.74);
  color: #ffffff;
  cursor: pointer;
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  transform: translateY(-35%);
  transition:
    background 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.row-scroll-button:hover,
.row-scroll-button:focus-visible {
  background: var(--primary);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.2);
  outline: none;
  transform: translateY(-35%) scale(1.05);
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
  aspect-ratio: 3 / 4;
  border-radius: 6px;
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
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 18px;
  width: 100%;
}

.serial-list-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  background: transparent;
}

.serial-list-card img {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
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
  margin: 8px 0 7px;
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
  margin: 0 0 6px;
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
  margin: 0 0 2px;
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
  margin: 0;
  color: var(--text-muted);
  font-size: 10px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.serial-card-footer {
  display: grid;
  gap: 8px;
  margin-top: auto;
  padding: 8px 0 0;
}

.serial-card-actions {
  display: grid;
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
  width: 100%;
  min-height: 30px;
  border: 0;
  border-radius: 5px;
  background: #00b874;
  color: #ffffff;
  cursor: pointer;
  font-size: 11px;
  font-weight: 900;
  padding: 0 7px;
}

.serial-icon-btn {
  width: 26px;
  min-height: 24px;
  border-radius: 2px;
  padding: 0;
}

.serial-library-btn {
  width: 32px;
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

@media (max-width: 1100px) {
  .serial-list {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .curated-rail {
    grid-auto-columns: minmax(0, calc((100% - 90px) / 6));
  }
}

@media (max-width: 860px) {
  .serial-title {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .search-line {
    grid-template-columns: 1fr;
  }

  .filter-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .serial-list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
    width: min(100% - 20px, 1180px);
    padding: 18px 0 36px;
  }

  .serial-title {
    margin-bottom: 14px;
  }

  .serial-title h1 {
    font-size: 30px;
  }

  .serial-title p {
    font-size: 13px;
  }

  .search-panel {
    gap: 12px;
    padding: 10px;
  }

  .header-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
  }

  .top-btn {
    min-width: 0;
    width: 100%;
    padding: 0 8px;
  }

  .filter-row {
    grid-template-columns: 1fr;
  }

  .serial-list-card {
    min-width: 0;
  }

  .serial-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .curated-group > h2 {
    font-size: 18px;
  }

  .row-heading h3 {
    font-size: 13px;
  }

  .row-heading {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .row-heading button {
    justify-self: start;
  }

  .curated-group--standalone .row-heading h3 {
    font-size: 24px;
  }

  .curated-rail {
    grid-auto-columns: minmax(0, calc((100% - 16px) / 3));
    gap: 8px;
  }

  .serial-card-clickable h3,
  .curated-card h4 {
    min-height: 34px;
    font-size: 11px;
    line-height: 1.25;
  }

  .serial-card-clickable p,
  .serial-card-clickable small,
  .curated-card p,
  .curated-meta {
    font-size: 9px;
    line-height: 1.25;
  }

  .serial-card-badges {
    gap: 3px;
    margin: 6px 0 5px;
  }

  .serial-card-badges span {
    font-size: 8px;
    padding: 3px 4px;
  }

  .serial-price-pill,
  .curated-actions button {
    min-height: 24px;
    font-size: 9px;
    padding-inline: 4px;
  }

  .row-scroll-button {
    display: none;
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

