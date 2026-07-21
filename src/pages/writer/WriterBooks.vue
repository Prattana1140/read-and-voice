<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import api, { API_BASE_URL } from "../../utils/api";
import { useI18n } from "../../utils/i18n";
import { localizedTitle } from "../../utils/localizedContent";

type Book = {
  id: number;
  title: string;
  title_th?: string;
  title_en?: string;
  author?: string;
  description?: string;
  category_name?: string;
  access_type?: string;
  price?: number;
  created_at?: string;
};

type PosterRequest = {
  id: string;
  image_url: string;
  title?: string;
  link_url?: string;
  book_id?: number | null;
  status: "pending" | "approved" | "rejected";
  review_note?: string;
  created_at?: string;
  reviewed_at?: string;
};

type ImageValidationResult = {
  ok: boolean;
  message?: string;
  previewUrl?: string;
};

const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;
const PROMO_RATIO = 16 / 7;
const PROMO_RATIO_TEXT = "16:7";
const PROMO_MIN_WIDTH = 1200;
const PROMO_MIN_HEIGHT = 525;
const IMAGE_RATIO_TOLERANCE = 0.03;

const router = useRouter();
const { locale } = useI18n();
const books = ref<Book[]>([]);
const posterRequests = ref<PosterRequest[]>([]);
const loading = ref(true);
const posterLoading = ref(true);
const savingPoster = ref(false);
const errorMessage = ref("");
const posterMessage = ref("");
const posterTitle = ref("");
const posterLink = ref("");
const posterBookId = ref("");
const posterImageUrl = ref("");
const posterFile = ref<File | null>(null);
const posterFilePreview = ref("");

const posterPreview = computed(() => posterFilePreview.value || resolveImageUrl(posterImageUrl.value));
const posterPreviewTitle = computed(() => posterTitle.value.trim() || "แบนเนอร์โปรโมตหนังสือ");
const posterPreviewLink = computed(() => posterLink.value.trim() || getSelectedBookLink());

async function loadBooks() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/writer/books/mine");
    books.value = Array.isArray(data) ? data : [];
    if (!posterBookId.value && books.value[0]) {
      posterBookId.value = String(books.value[0].id);
      posterLink.value = `/book/${books.value[0].id}`;
    }
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดหนังสือของคุณไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function loadPosterRequests() {
  posterLoading.value = true;

  try {
    const { data } = await api.get("/page-content/writer-posters/mine");
    posterRequests.value = Array.isArray(data) ? data : [];
  } catch {
    posterRequests.value = [];
  } finally {
    posterLoading.value = false;
  }
}

function editBook(bookId: number) {
  router.push(`/writer/books/${bookId}/edit`);
}

function uploadBook() {
  router.push("/writer/upload");
}

function getBookTitle(book: Book) {
  return localizedTitle(book, locale.value) || book.title;
}

function getSelectedBookLink() {
  return posterBookId.value ? `/book/${posterBookId.value}` : "ยังไม่เลือกหนังสือ";
}

function syncPosterLink() {
  if (!posterLink.value.trim() && posterBookId.value) {
    posterLink.value = `/book/${posterBookId.value}`;
  }
}

function resolveImageUrl(url?: string | null) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/page-content/")) return raw;
  return `${API_BASE_URL}/${raw.replace(/^\/+/, "")}`;
}

function formatFileSizeMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function readImageDimensions(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("โหลดขนาดรูปภาพไม่สำเร็จ"));
    image.src = url;
  });
}

async function validatePromoImage(file: File | null): Promise<ImageValidationResult> {
  if (!file) return { ok: true };

  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "แบนเนอร์ต้องเป็นไฟล์รูปภาพเท่านั้น" };
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `ไฟล์มีขนาด ${formatFileSizeMb(file.size)} MB กรุณาเลือกไฟล์ไม่เกิน ${formatFileSizeMb(MAX_IMAGE_UPLOAD_BYTES)} MB`,
    };
  }

  const previewUrl = URL.createObjectURL(file);

  try {
    const { width, height } = await readImageDimensions(previewUrl);
    const ratioDelta = Math.abs(width / height - PROMO_RATIO) / PROMO_RATIO;

    if (width < PROMO_MIN_WIDTH || height < PROMO_MIN_HEIGHT) {
      URL.revokeObjectURL(previewUrl);
      return {
        ok: false,
        message: `รูปเล็กเกินไป (${width} x ${height} px) กรุณาใช้ภาพอย่างน้อย ${PROMO_MIN_WIDTH} x ${PROMO_MIN_HEIGHT} px`,
      };
    }

    if (ratioDelta > IMAGE_RATIO_TOLERANCE) {
      URL.revokeObjectURL(previewUrl);
      return {
        ok: false,
        message: `สัดส่วนรูปไม่พอดี (${width} x ${height} px) กรุณาใช้สัดส่วน ${PROMO_RATIO_TEXT} เพื่อให้ขึ้นหน้าแรกพอดี`,
      };
    }

    return { ok: true, previewUrl };
  } catch {
    URL.revokeObjectURL(previewUrl);
    return { ok: false, message: "อ่านขนาดรูปภาพไม่สำเร็จ กรุณาเลือกไฟล์ใหม่" };
  }
}

async function selectPosterFile(event: Event) {
  const target = event.target as HTMLInputElement;
  if (posterFilePreview.value) {
    URL.revokeObjectURL(posterFilePreview.value);
  }

  const file = target.files?.[0] || null;
  const result = await validatePromoImage(file);

  if (!result.ok) {
    target.value = "";
    posterFile.value = null;
    posterFilePreview.value = "";
    posterMessage.value = result.message || "ไฟล์รูปภาพไม่ถูกต้อง";
    return;
  }

  posterFile.value = file;
  posterFilePreview.value = result.previewUrl || "";
  posterMessage.value = file
    ? "เลือกไฟล์แบนเนอร์เรียบร้อย ตรวจสัดส่วนแล้วพอดีกับหน้าแรก"
    : "";
}

async function submitPosterRequest() {
  posterMessage.value = "";

  if (!posterFile.value && !posterImageUrl.value.trim()) {
    posterMessage.value = "กรุณาอัปโหลดรูปหรือใส่ลิงก์รูปภาพ";
    return;
  }

  savingPoster.value = true;

  try {
    const formData = new FormData();
    formData.append("title", posterTitle.value.trim());
    formData.append("link_url", posterLink.value.trim() || getSelectedBookLink());
    formData.append("book_id", posterBookId.value);

    if (posterFile.value) {
      formData.append("poster", posterFile.value);
    } else {
      formData.append("image_url", posterImageUrl.value.trim());
    }

    const { data } = await api.post("/page-content/writer-posters", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    posterTitle.value = "";
    posterImageUrl.value = "";
    posterFile.value = null;
    if (posterFilePreview.value) {
      URL.revokeObjectURL(posterFilePreview.value);
    }
    posterFilePreview.value = "";
    posterMessage.value = data?.message || "ส่งแบนเนอร์ให้แอดมินตรวจสอบสำเร็จ";
    await loadPosterRequests();
  } catch (error: any) {
    posterMessage.value =
      error?.response?.data?.message || "ส่งแบนเนอร์ให้แอดมินไม่สำเร็จ";
  } finally {
    savingPoster.value = false;
  }
}

function getPosterStatusText(status: PosterRequest["status"]) {
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "rejected") return "ไม่อนุมัติ";
  return "รอตรวจ";
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

onMounted(() => {
  loadBooks();
  loadPosterRequests();
});

onUnmounted(() => {
  if (posterFilePreview.value) {
    URL.revokeObjectURL(posterFilePreview.value);
  }
});
</script>

<template>
  <main class="writer-page">
    <section class="panel">
      <div class="header-row">
        <div>
          <p class="eyebrow">สตูดิโอนักเขียน</p>
          <h1>หนังสือของฉัน</h1>
          <p class="muted">
            จัดการหนังสือที่คุณอัปโหลด แก้ไขข้อมูล และส่งแบนเนอร์โปรโมตให้แอดมินตรวจ
          </p>
        </div>

        <button type="button" @click="uploadBook">อัปโหลดหนังสือ</button>
      </div>

      <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
      <p v-if="loading" class="state">กำลังโหลดหนังสือ...</p>

      <div v-else-if="books.length === 0" class="empty">
        <h2>ยังไม่มีหนังสือ</h2>
        <p>เริ่มจากอัปโหลดไฟล์หนังสือเล่มแรกของคุณ</p>
        <button type="button" @click="uploadBook">อัปโหลดเลย</button>
      </div>

      <div v-else class="book-list">
        <article v-for="book in books" :key="book.id" class="book-item">
          <div>
            <h2>{{ getBookTitle(book) }}</h2>
            <p>
              <span v-if="book.author">{{ book.author }}</span>
              <span v-if="book.category_name"> / {{ book.category_name }}</span>
            </p>
            <p class="meta">
              {{ book.access_type || "free" }}
              <span v-if="Number(book.price || 0) > 0"> · {{ book.price }} คอยน์</span>
            </p>
          </div>

          <button type="button" @click="editBook(book.id)">แก้ไข</button>
        </article>
      </div>
    </section>

    <section class="panel promo-panel">
      <div class="header-row">
        <div>
          <p class="eyebrow">โปรโมตหน้าแรก</p>
          <h1>ส่งแบนเนอร์ให้แอดมินตรวจ</h1>
          <p class="muted">
            ภาพที่ผ่านอนุมัติจะขึ้นใน slider หน้าแรก ขนาดที่พอดีคือ 1600 x 700 px หรือ 1200 x 525 px
          </p>
        </div>
      </div>

      <div class="promo-grid">
        <div class="promo-form">
          <label>
            หนังสือที่ต้องการโปรโมต
            <select v-model="posterBookId" @change="syncPosterLink">
              <option v-for="book in books" :key="book.id" :value="String(book.id)">
                {{ getBookTitle(book) }}
              </option>
            </select>
          </label>

          <label>
            ชื่อแบนเนอร์
            <input v-model="posterTitle" type="text" placeholder="ชื่อแคมเปญหรือชื่อหนังสือ" />
          </label>

          <label>
            ลิงก์ปลายทาง
            <input v-model="posterLink" type="text" placeholder="/book/1" />
          </label>

          <label>
            ลิงก์รูปภาพ
            <input v-model="posterImageUrl" type="url" placeholder="https://example.com/promo.jpg" />
            <small>สัดส่วน 16:7, ไฟล์ไม่เกิน 15 MB</small>
          </label>

          <label>
            อัปโหลดรูปภาพ
            <input type="file" accept="image/*" @change="selectPosterFile" />
            <small>ใช้ภาพ 1600 x 700 px หรือ 1200 x 525 px เพื่อไม่ให้โดนครอป</small>
          </label>

          <button type="button" :disabled="savingPoster" @click="submitPosterRequest">
            {{ savingPoster ? "กำลังส่ง..." : "ส่งให้แอดมินตรวจ" }}
          </button>

          <p v-if="posterMessage" class="alert info">{{ posterMessage }}</p>
        </div>

        <div class="promo-preview">
          <strong>ตัวอย่างก่อนส่ง</strong>
          <article v-if="posterPreview" class="banner-card">
            <img :src="posterPreview" :alt="posterPreviewTitle" />
            <div>
              <b>{{ posterPreviewTitle }}</b>
              <small>{{ posterPreviewLink }}</small>
            </div>
          </article>
          <div v-else class="banner-empty">เลือกรูปหรือใส่ลิงก์เพื่อดูตัวอย่าง</div>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="header-row">
        <div>
          <p class="eyebrow">สถานะแบนเนอร์</p>
          <h1>คำขอโปรโมตของฉัน</h1>
        </div>
      </div>

      <p v-if="posterLoading" class="state">กำลังโหลดคำขอ...</p>
      <div v-else-if="posterRequests.length === 0" class="empty compact">
        <h2>ยังไม่มีคำขอโปรโมต</h2>
        <p>ส่งแบนเนอร์ด้านบนเพื่อให้แอดมินตรวจได้ทันที</p>
      </div>

      <div v-else class="request-list">
        <article v-for="request in posterRequests" :key="request.id" class="request-item">
          <img :src="resolveImageUrl(request.image_url)" :alt="request.title || 'แบนเนอร์โปรโมต'" />
          <div>
            <strong>{{ request.title || "ยังไม่ได้ตั้งชื่อแบนเนอร์" }}</strong>
            <small>{{ request.link_url || "ยังไม่มีลิงก์" }}</small>
            <small>ส่งเมื่อ {{ formatDate(request.created_at) }}</small>
            <small v-if="request.review_note">หมายเหตุ: {{ request.review_note }}</small>
          </div>
          <span class="status" :class="`status--${request.status}`">
            {{ getPosterStatusText(request.status) }}
          </span>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.writer-page {
  display: grid;
  gap: 18px;
  max-width: 1040px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 48px;
}

.panel,
.book-item,
.empty,
.banner-card,
.banner-empty,
.request-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.panel {
  padding: 28px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1,
h2 {
  color: var(--text-strong);
  margin: 0;
}

h1 {
  font-size: clamp(24px, 3.6vw, 34px);
}

.muted,
.state,
.empty p,
.book-item p,
.promo-form small,
.request-item small {
  color: var(--text-muted);
}

.alert {
  border-radius: 8px;
  font-weight: 800;
  margin: 16px 0 0;
  padding: 12px 14px;
}

.error {
  background: #fef2f2;
  color: #dc2626;
}

.info {
  background: #e8faf6;
  color: #0b5f59;
}

.state {
  margin-top: 22px;
}

.empty {
  margin-top: 20px;
  padding: 24px;
}

.empty.compact {
  padding: 18px;
}

.book-list,
.request-list {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.book-item,
.request-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
}

.book-item h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.meta {
  font-weight: 800;
}

.promo-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 18px;
  margin-top: 20px;
}

.promo-form {
  display: grid;
  gap: 12px;
}

.promo-form label {
  display: grid;
  gap: 7px;
  color: #0b5f59;
  font-weight: 900;
}

.promo-form input,
.promo-form select {
  min-height: 40px;
  border: 1px solid rgba(20, 184, 166, 0.24);
  border-radius: 8px;
  color: var(--text-strong);
  font-size: 16px;
  padding: 0 11px;
}

.promo-form input[type="file"] {
  padding: 9px 11px;
}

button {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  background: #14b8a6;
  color: white;
  cursor: pointer;
  font-weight: 900;
  padding: 10px 14px;
}

button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.promo-preview {
  display: grid;
  align-content: start;
  gap: 10px;
}

.promo-preview > strong {
  color: var(--text-strong);
}

.banner-card,
.banner-empty {
  overflow: hidden;
}

.banner-card img,
.banner-empty {
  width: 100%;
  aspect-ratio: 16 / 7;
}

.banner-card img {
  display: block;
  object-fit: cover;
}

.banner-card div {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
}

.banner-card b,
.banner-card small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-empty {
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-weight: 800;
  text-align: center;
  padding: 18px;
}

.request-item {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) auto;
}

.request-item img {
  width: 180px;
  aspect-ratio: 16 / 7;
  border-radius: 6px;
  object-fit: cover;
}

.request-item div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.request-item strong,
.request-item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  border-radius: 999px;
  font-size: 14px;
  font-weight: 900;
  padding: 7px 10px;
  white-space: nowrap;
}

.status--pending {
  background: #fff3d8;
  color: #876000;
}

.status--approved {
  background: #dff8f3;
  color: #0b5f59;
}

.status--rejected {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 760px) {
  .header-row,
  .book-item,
  .promo-grid {
    align-items: stretch;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .panel {
    padding: 18px;
  }

  button {
    width: 100%;
  }

  .request-item {
    grid-template-columns: 1fr;
  }

  .request-item img {
    width: 100%;
  }
}
</style>
