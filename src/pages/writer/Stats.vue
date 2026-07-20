<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api from "../../utils/api";
import { useI18n } from "../../utils/i18n";
import { localizedTitle } from "../../utils/localizedContent";

type WriterStatsSummary = {
  total_books?: number;
  published_books?: number;
  pending_books?: number;
  serial_books?: number;
  ebook_books?: number;
  total_units?: number;
  total_sentences?: number;
  total_words?: number;
  total_characters?: number;
  book_views?: number;
  episode_views?: number;
  review_count?: number;
  average_rating?: number;
  library_count?: number;
  paid_items?: number;
  gross_sales?: number;
};

type WriterBookStats = {
  id: number;
  title: string;
  title_th?: string;
  title_en?: string;
  content_type?: string;
  lifecycle_status?: string;
  approval_status?: string;
  is_published?: number;
  total_units?: number;
  total_sentences?: number;
  total_words?: number;
  views?: number;
  reviews?: number;
  average_rating?: number;
  paid_items?: number;
  gross_sales?: number;
  updated_at?: string;
};

const loading = ref(true);
const { locale } = useI18n();
const error = ref("");
const summary = ref<WriterStatsSummary>({});
const books = ref<WriterBookStats[]>([]);

const numberFormat = new Intl.NumberFormat("th-TH");
const moneyFormat = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const totalReads = computed(() => {
  return Number(summary.value.book_views || 0) + Number(summary.value.episode_views || 0);
});

const cards = computed(() => [
  { label: "หนังสือทั้งหมด", value: summary.value.total_books || 0 },
  { label: "เผยแพร่แล้ว", value: summary.value.published_books || 0 },
  { label: "รอตรวจ", value: summary.value.pending_books || 0 },
  { label: "ยอดอ่านรวม", value: totalReads.value },
  { label: "รีวิว", value: summary.value.review_count || 0 },
  { label: "คะแนนเฉลี่ย", value: Number(summary.value.average_rating || 0).toFixed(2) },
  { label: "เพิ่มเข้าชั้น", value: summary.value.library_count || 0 },
  { label: "ขายแล้ว", value: summary.value.paid_items || 0 },
  { label: "ยอดขายรวม", value: `${moneyFormat.format(Number(summary.value.gross_sales || 0))} coin` },
  { label: "หน่วยเนื้อหา", value: summary.value.total_units || 0 },
  { label: "จำนวนคำ", value: summary.value.total_words || 0 },
]);

function formatNumber(value: unknown) {
  const numeric = Number(value || 0);
  return numberFormat.format(Number.isFinite(numeric) ? numeric : 0);
}

function formatStatus(book: WriterBookStats) {
  if (Number(book.is_published) === 1 || book.lifecycle_status === "published") return "เผยแพร่แล้ว";
  if (book.approval_status === "rejected") return "ถูกปฏิเสธ";
  return "รอตรวจ/ฉบับร่าง";
}

function getBookTitle(book: WriterBookStats) {
  return localizedTitle(book, locale.value) || book.title;
}

async function loadStats() {
  loading.value = true;
  error.value = "";

  try {
    const { data } = await api.get("/writer/books/stats");
    summary.value = data?.summary || {};
    books.value = Array.isArray(data?.books) ? data.books : [];
  } catch (err: any) {
    error.value = err?.response?.data?.message || "โหลดสถิตินักเขียนไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

onMounted(loadStats);
</script>

<template>
  <main class="writer-stats-page">
    <section class="page-head">
      <div>
        <p class="eyebrow">Writer Analytics</p>
        <h1>สถิตินักเขียน</h1>
        <p>ดูภาพรวมผลงาน ยอดอ่าน รีวิว การเพิ่มเข้าชั้น และยอดขายจากหนังสือของคุณเท่านั้น</p>
      </div>
      <button type="button" :disabled="loading" @click="loadStats">
        {{ loading ? "กำลังโหลด..." : "รีเฟรช" }}
      </button>
    </section>

    <p v-if="error" class="notice error">{{ error }}</p>
    <section v-if="loading" class="state-box">กำลังโหลดสถิติ...</section>

    <template v-else>
      <section class="stats-grid">
        <article v-for="card in cards" :key="card.label">
          <strong>{{ typeof card.value === "number" ? formatNumber(card.value) : card.value }}</strong>
          <span>{{ card.label }}</span>
        </article>
      </section>

      <section class="content-grid">
        <article class="panel">
          <h2>สัดส่วนผลงาน</h2>
          <div class="split-row">
            <span>อีบุ๊ก</span>
            <strong>{{ formatNumber(summary.ebook_books) }}</strong>
          </div>
          <div class="split-row">
            <span>รายตอน</span>
            <strong>{{ formatNumber(summary.serial_books) }}</strong>
          </div>
          <div class="split-row">
            <span>ประโยคสำหรับ TTS</span>
            <strong>{{ formatNumber(summary.total_sentences) }}</strong>
          </div>
          <div class="split-row">
            <span>ตัวอักษรรวม</span>
            <strong>{{ formatNumber(summary.total_characters) }}</strong>
          </div>
        </article>

        <article class="panel">
          <h2>ผลงานที่มี engagement สูง</h2>
          <div v-if="!books.length" class="empty">ยังไม่มีข้อมูลสถิติของผลงาน</div>
          <div v-for="book in books" :key="book.id" class="book-row">
            <div>
              <strong>{{ getBookTitle(book) }}</strong>
              <span>{{ book.content_type || "ebook" }} · {{ formatStatus(book) }}</span>
            </div>
            <div class="book-metrics">
              <span>{{ formatNumber(book.views) }} อ่าน</span>
              <span>{{ formatNumber(book.reviews) }} รีวิว</span>
              <span>{{ formatNumber(book.paid_items) }} ขาย</span>
            </div>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.writer-stats-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 56px;
}

.page-head,
.panel,
.state-box {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1,
h2,
strong {
  color: var(--text-strong);
}

h1,
h2,
p {
  margin: 0;
}

.page-head p:last-child,
span,
.empty {
  color: var(--text-muted);
}

button {
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 900;
  padding: 0 16px;
}

button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.notice {
  margin: 16px 0 0;
  border-radius: 8px;
  padding: 12px 14px;
  font-weight: 800;
}

.notice.error {
  background: #fee2e2;
  color: #991b1b;
}

.state-box {
  margin-top: 16px;
  padding: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.stats-grid article {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 18px;
}

.stats-grid strong {
  display: block;
  font-size: 30px;
}

.stats-grid span {
  display: block;
  margin-top: 4px;
  font-weight: 800;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 16px;
  margin-top: 16px;
}

.panel {
  padding: 22px;
}

.split-row,
.book-row,
.book-metrics {
  display: flex;
  gap: 12px;
}

.split-row,
.book-row {
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border);
  padding: 14px 0;
}

.split-row:first-of-type,
.book-row:first-of-type {
  margin-top: 12px;
}

.book-row {
  align-items: flex-start;
}

.book-row > div:first-child {
  display: grid;
  gap: 4px;
}

.book-metrics {
  flex-wrap: wrap;
  justify-content: flex-end;
  font-size: 15px;
  font-weight: 800;
}

.empty {
  margin-top: 12px;
}

@media (max-width: 900px) {
  .stats-grid,
  .content-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .page-head,
  .book-row {
    align-items: stretch;
    flex-direction: column;
  }

  .stats-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
