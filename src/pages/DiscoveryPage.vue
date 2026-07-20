<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";
import type { SearchableBook } from "../utils/bookSearch";
import { useI18n } from "../utils/i18n";
import { localizedTitle } from "../utils/localizedContent";

type DiscoveryKind = "category" | "tag" | "publisher" | "author";
type Book = SearchableBook & {
  publisher_name?: string;
  publisher?: string;
  tags?: string[] | string;
  tag_names?: string[] | string;
};

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();

const books = ref<Book[]>([]);
const loading = ref(false);
const errorMessage = ref("");

const kind = computed<DiscoveryKind>(() => {
  const name = String(route.name || "");
  if (name.includes("Tag")) return "tag";
  if (name.includes("Publisher")) return "publisher";
  if (name.includes("Author")) return "author";
  return "category";
});

const rawTerm = computed(() => String(route.params.name || route.query.q || "").trim());
const decodedTerm = computed(() => decodeURIComponent(rawTerm.value));

const pageTitle = computed(() => {
  const labels: Record<DiscoveryKind, string> = {
    category: "หมวดหมู่",
    tag: "แท็ก",
    publisher: "สำนักพิมพ์",
    author: "ผู้เขียน",
  };

  return decodedTerm.value
    ? `${labels[kind.value]}: ${decodedTerm.value}`
    : `สำรวจตาม${labels[kind.value]}`;
});

const options = computed(() => {
  const values = new Set<string>();
  books.value.forEach((book) => {
    getValuesForKind(book, kind.value).forEach((value) => {
      if (value) values.add(value);
    });
  });
  return [...values].sort((a, b) => a.localeCompare(b, "th"));
});

const filteredBooks = computed(() => {
  if (!decodedTerm.value) return [];
  const target = normalize(decodedTerm.value);
  return books.value.filter((book) =>
    getValuesForKind(book, kind.value).some((value) => normalize(value) === target),
  );
});

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function splitValues(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getValuesForKind(book: Book, nextKind: DiscoveryKind) {
  if (nextKind === "category") return [book.category_name].filter(Boolean).map(String);
  if (nextKind === "publisher") return [book.publisher_name || book.publisher].filter(Boolean).map(String);
  if (nextKind === "author") return [book.author || book.author_name].filter(Boolean).map(String);
  return [...splitValues(book.tags), ...splitValues(book.tag_names)];
}

function openOption(option: string) {
  const routeName: Record<DiscoveryKind, string> = {
    category: "CategoryDetail",
    tag: "TagDetail",
    publisher: "PublisherDetail",
    author: "AuthorDetail",
  };

  router.push({ name: routeName[kind.value], params: { name: option } });
}

function openBook(book: Book) {
  router.push({ name: "BookDetail", params: { id: book.id } });
}

function getCover(book: Book) {
  return resolveAssetUrl(book.cover_url || book.cover_image);
}

function getBookTitle(book: Book) {
  return localizedTitle(book, locale.value) || book.title || "";
}

function onImgError(event: Event) {
  const image = event.target as HTMLImageElement;
  if (!image.src.endsWith("/no-cover.png")) image.src = "/no-cover.png";
}

async function loadBooks() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/books");
    books.value = Array.isArray(data)
      ? data
      : Array.isArray(data?.books)
        ? data.books
        : [];
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดรายการไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

watch(() => route.fullPath, () => window.scrollTo({ top: 0, behavior: "smooth" }));
onMounted(loadBooks);
</script>

<template>
  <main class="discovery-page">
    <section class="discovery-head">
      <div>
        <p>Discovery</p>
        <h1>{{ pageTitle }}</h1>
      </div>
      <button type="button" @click="router.push('/search')">ค้นหาแบบละเอียด</button>
    </section>

    <section v-if="loading" class="state">กำลังโหลดข้อมูล...</section>
    <section v-else-if="errorMessage" class="state error">{{ errorMessage }}</section>

    <template v-else>
      <section v-if="!decodedTerm" class="option-grid" aria-label="รายการสำหรับสำรวจ">
        <button v-for="option in options" :key="option" type="button" @click="openOption(option)">
          {{ option }}
        </button>
        <div v-if="!options.length" class="state">ยังไม่มีข้อมูลสำหรับหน้านี้</div>
      </section>

      <section v-else-if="filteredBooks.length" class="book-grid">
        <article
          v-for="book in filteredBooks"
          :key="book.id"
          class="book-card"
          tabindex="0"
          role="button"
          @click="openBook(book)"
          @keydown.enter.prevent="openBook(book)"
          @keydown.space.prevent="openBook(book)"
        >
          <img :src="getCover(book)" :alt="getBookTitle(book) || 'book cover'" @error="onImgError" />
          <div>
            <span>{{ book.category_name || "หนังสือ" }}</span>
            <h2>{{ getBookTitle(book) || "ไม่มีชื่อหนังสือ" }}</h2>
            <p>{{ book.author || book.author_name || "ไม่ระบุผู้เขียน" }}</p>
          </div>
        </article>
      </section>

      <section v-else class="state">
        ไม่พบหนังสือในรายการนี้
        <button type="button" @click="router.push('/store')">ไปหน้าร้านหนังสือ</button>
      </section>
    </template>
  </main>
</template>

<style scoped>
.discovery-page {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: var(--page-block) var(--page-gutter) 56px;
}

.discovery-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 18px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 22px;
}

.discovery-head p,
.discovery-head h1 {
  margin: 0;
}

.discovery-head p {
  color: var(--primary);
  font-weight: 900;
}

.discovery-head h1 {
  margin-top: 8px;
  color: var(--text-strong);
  font-size: 34px;
  line-height: 1.2;
}

.discovery-head button,
.option-grid button,
.state button {
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
  margin-top: 22px;
}

.option-grid button {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-strong);
  text-align: left;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.book-card {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  cursor: pointer;
  padding: 12px;
}

.book-card img {
  width: 84px;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
  object-fit: cover;
}

.book-card span {
  color: var(--primary);
  font-size: 14px;
  font-weight: 900;
}

.book-card h2 {
  margin: 4px 0;
  color: var(--text-strong);
  font-size: 19px;
  line-height: 1.35;
}

.book-card p {
  margin: 0;
  color: var(--text-muted);
}

.state {
  display: grid;
  gap: 12px;
  justify-items: start;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-muted);
  margin-top: 22px;
  padding: 22px;
}

.state.error {
  border-color: #fecaca;
  color: var(--danger);
}

@media (max-width: 720px) {
  .discovery-head {
    align-items: start;
    flex-direction: column;
  }
}
</style>
