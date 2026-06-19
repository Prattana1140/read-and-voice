<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { API_BASE_URL, api } from "../../utils/api";

type BookApproval = {
  id: number;
  title: string;
  author?: string;
  description?: string;
  cover_image?: string;
  category_name?: string;
  content_type?: "ebook" | "serial";
  approval_status?: "pending" | "approved" | "rejected";
  approval_note?: string | null;
  requested_best_seller?: number;
  requested_new_release?: number;
  requested_promotion?: number;
  requested_free_book?: number;
  requested_hall_of_fame?: number;
  requested_recommended?: number;
  promo_discount_percent?: number;
  promo_start_at?: string | null;
  promo_end_at?: string | null;
  is_best_seller?: number;
  is_new_release?: number;
  is_promotion?: number;
  is_free_book?: number;
  is_hall_of_fame?: number;
  is_recommended?: number;
  created_at?: string;
};

const shelfOptions = [
  { key: "best_seller", requested: "requested_best_seller", approved: "is_best_seller", label: "ขายดี" },
  { key: "new_release", requested: "requested_new_release", approved: "is_new_release", label: "มาใหม่" },
  { key: "promotion", requested: "requested_promotion", approved: "is_promotion", label: "โปรโมชั่น" },
  { key: "free_book", requested: "requested_free_book", approved: "is_free_book", label: "ฟรีรายวัน" },
  { key: "hall_of_fame", requested: "requested_hall_of_fame", approved: "is_hall_of_fame", label: "ฮิตขึ้นหิ้ง" },
  { key: "recommended", requested: "requested_recommended", approved: "is_recommended", label: "แนะนำ" },
] as const;

const loading = ref(true);
const saving = ref(false);
const error = ref("");
const success = ref("");
const books = ref<BookApproval[]>([]);
const selectedBookId = ref<number | null>(null);
const approvalStatus = ref<"pending" | "approved" | "rejected">("approved");
const approvalNote = ref("");
const approvedPlacements = ref<Record<string, boolean>>({
  is_best_seller: false,
  is_new_release: false,
  is_promotion: false,
  is_free_book: false,
  is_hall_of_fame: false,
  is_recommended: false,
});
const promotionForm = ref({
  discount_percent: 0,
  start_at: "",
  end_at: "",
});

const selectedBook = computed(() => {
  return books.value.find((book) => book.id === selectedBookId.value) || null;
});

const getCoverUrl = (cover?: string) => {
  if (!cover) return "/no-cover.png";
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;
  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
};

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const syncSelectedBook = (book: BookApproval | null) => {
  if (!book) return;
  approvalStatus.value = book.approval_status || "pending";
  approvalNote.value = book.approval_note || "";
  approvedPlacements.value = {
    is_best_seller: Number(book.is_best_seller) === 1,
    is_new_release: Number(book.is_new_release) === 1,
    is_promotion: Number(book.is_promotion) === 1,
    is_free_book: Number(book.is_free_book) === 1,
    is_hall_of_fame: Number(book.is_hall_of_fame) === 1,
    is_recommended: Number(book.is_recommended) === 1,
  };
  promotionForm.value = {
    discount_percent: Number(book.promo_discount_percent || 0),
    start_at: toDateTimeLocal(book.promo_start_at),
    end_at: toDateTimeLocal(book.promo_end_at),
  };
};

const fetchPendingBooks = async () => {
  loading.value = true;
  error.value = "";

  try {
    const res = await api.get("/admin/books/pending");
    books.value = Array.isArray(res.data) ? res.data : [];
    if (!selectedBookId.value && books.value.length > 0) {
      selectedBookId.value = books.value[0].id;
      syncSelectedBook(books.value[0]);
    }
  } catch (err: any) {
    error.value =
      err?.response?.data?.message || "โหลดรายการหนังสือรออนุมัติไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

const selectBook = (book: BookApproval) => {
  selectedBookId.value = book.id;
  success.value = "";
  error.value = "";
  syncSelectedBook(book);
};

const applyRequestedToApproved = () => {
  const book = selectedBook.value;
  if (!book) return;

  approvedPlacements.value = {
    is_best_seller: Number(book.requested_best_seller) === 1,
    is_new_release: Number(book.requested_new_release) === 1,
    is_promotion: Number(book.requested_promotion) === 1,
    is_free_book: Number(book.requested_free_book) === 1,
    is_hall_of_fame: Number(book.requested_hall_of_fame) === 1,
    is_recommended: Number(book.requested_recommended) === 1,
  };
};

const saveApproval = async () => {
  if (!selectedBook.value || saving.value) return;

  saving.value = true;
  success.value = "";
  error.value = "";

  try {
    await api.put(`/admin/books/${selectedBook.value.id}/approval`, {
      approval_status: approvalStatus.value,
      approval_note: approvalNote.value || null,
      ...approvedPlacements.value,
      promo_discount_percent: approvedPlacements.value.is_promotion
        ? Number(promotionForm.value.discount_percent || 0)
        : 0,
      promo_start_at: approvedPlacements.value.is_promotion ? promotionForm.value.start_at || null : null,
      promo_end_at: approvedPlacements.value.is_promotion ? promotionForm.value.end_at || null : null,
    });

    success.value = "บันทึกการอนุมัติสำเร็จ";
    await fetchPendingBooks();
  } catch (err: any) {
    error.value = err?.response?.data?.message || "บันทึกการอนุมัติไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
};

onMounted(fetchPendingBooks);
</script>

<template>
  <main class="approvals-page">
    <section class="hero">
      <div>
        <p>Admin moderation</p>
        <h1>อนุมัติอีบุ๊ก / รายตอน</h1>
        <span>
          หน้านี้ใช้ตรวจงานอัปโหลดจากนักเขียน แล้วกำหนดว่าจะให้หนังสือไปอยู่ในเมนู
          ขายดี, มาใหม่, โปรโมชั่น, ฟรีรายวัน, ฮิตขึ้นหิ้ง หรือแนะนำหรือไม่
        </span>
      </div>
      <div class="hero-actions">
        <router-link to="/admin">← กลับ Dashboard</router-link>
        <button type="button" :disabled="loading" @click="fetchPendingBooks">
          รีเฟรช
        </button>
      </div>
    </section>

    <p v-if="error" class="message error">{{ error }}</p>
    <p v-if="success" class="message success">{{ success }}</p>

    <div class="layout">
      <section class="queue">
        <div class="section-head">
          <h2>คิวรออนุมัติ</h2>
          <span>{{ books.length }} รายการ</span>
        </div>

        <div v-if="loading" class="empty-box">กำลังโหลด...</div>
        <div v-else-if="books.length === 0" class="empty-box">
          ยังไม่มีหนังสือที่รออนุมัติ
        </div>

        <button
          v-for="book in books"
          v-else
          :key="book.id"
          class="queue-item"
          :class="{ active: book.id === selectedBookId }"
          @click="selectBook(book)"
        >
          <img :src="getCoverUrl(book.cover_image)" :alt="book.title" />
          <div>
            <strong>{{ book.title }}</strong>
            <span>{{ book.author || "ไม่ระบุผู้เขียน" }}</span>
            <small>{{ book.content_type === "serial" ? "รายตอน" : "e-book" }}</small>
          </div>
        </button>
      </section>

      <section class="approval-card">
        <div v-if="!selectedBook" class="empty-box">
          เลือกรายการทางซ้ายเพื่ออนุมัติ
        </div>

        <template v-else>
          <div class="book-head">
            <img :src="getCoverUrl(selectedBook.cover_image)" :alt="selectedBook.title" />
            <div>
              <p class="book-type">
                {{ selectedBook.content_type === "serial" ? "รายตอน" : "อีบุ๊ก" }}
              </p>
              <h2>{{ selectedBook.title }}</h2>
              <span>{{ selectedBook.author || "ไม่ระบุผู้เขียน" }}</span>
              <p class="description">{{ selectedBook.description || "ไม่มีคำอธิบาย" }}</p>
            </div>
          </div>

          <div class="form-grid">
            <label>
              <span>สถานะอนุมัติ</span>
              <select v-model="approvalStatus">
                <option value="approved">อนุมัติ</option>
                <option value="rejected">ตีกลับ</option>
                <option value="pending">รอตรวจต่อ</option>
              </select>
            </label>

            <label class="full">
              <span>หมายเหตุจากแอดมิน</span>
              <textarea v-model="approvalNote" rows="4" />
            </label>
          </div>

          <div class="placement-card">
            <div class="section-head">
              <h3>หมวดแสดงผลหน้าเมนู</h3>
              <button type="button" class="mini-btn" @click="applyRequestedToApproved">
                ใช้ค่าตามที่นักเขียนเสนอ
              </button>
            </div>

            <div class="placement-grid">
              <label
                v-for="option in shelfOptions"
                :key="option.key"
                class="placement-item"
              >
                <input v-model="approvedPlacements[option.approved]" type="checkbox" />
                <div>
                  <strong>{{ option.label }}</strong>
                  <small>
                    นักเขียนเสนอ:
                    {{
                      Number(selectedBook[option.requested]) === 1 ? "ต้องการ" : "ไม่ได้เสนอ"
                    }}
                  </small>
                </div>
              </label>
            </div>

            <div v-if="approvedPlacements.is_promotion" class="promotion-fields">
              <label>
                <span>Discount percent</span>
                <input
                  v-model.number="promotionForm.discount_percent"
                  type="number"
                  min="1"
                  max="95"
                  step="1"
                />
              </label>
              <label>
                <span>Starts at</span>
                <input v-model="promotionForm.start_at" type="datetime-local" />
              </label>
              <label>
                <span>Ends at</span>
                <input v-model="promotionForm.end_at" type="datetime-local" />
              </label>
              <small>
                ป้ายลดราคาจะแสดงเฉพาะเมื่อมีเปอร์เซ็นต์ส่วนลดจริง และอยู่ในช่วงวันที่กำหนด
              </small>
            </div>
          </div>

          <div class="actions">
            <button class="primary-btn" :disabled="saving" @click="saveApproval">
              {{ saving ? "กำลังบันทึก..." : "บันทึกการอนุมัติ" }}
            </button>
          </div>
        </template>
      </section>
    </div>
  </main>
</template>

<style scoped>
.approvals-page {
  width: min(1180px, calc(100% - calc(var(--page-gutter, 16px) * 2)));
  margin: 0 auto;
  padding: var(--page-block, 32px) 0 56px;
  display: grid;
  gap: 20px;
}

.hero,
.queue,
.approval-card {
  border: 1px solid rgba(20, 184, 166, 0.16);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px;
}

.hero p,
.hero h1,
.hero span {
  margin: 0;
}

.hero p {
  color: #0f766e;
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
}

.hero h1 {
  margin-top: 8px;
  color: var(--text-strong);
}

.hero span {
  display: block;
  margin-top: 10px;
  color: var(--text-muted);
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.hero-actions a,
.hero-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
  text-decoration: none;
}

.hero-actions a {
  background: #eef2f7;
  color: #0f172a;
}

.hero-actions button {
  background: #6557f5;
  color: #ffffff;
}

.hero-actions button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.message {
  margin: 0;
  border-radius: 10px;
  padding: 12px 14px;
  font-weight: 800;
}

.message.error {
  background: #fff1f3;
  color: #b42318;
}

.message.success {
  background: #e8faf6;
  color: #0b5f59;
}

.layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
}

.queue,
.approval-card {
  padding: 20px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.section-head h2,
.section-head h3 {
  margin: 0;
  color: var(--text-strong);
}

.section-head span {
  color: var(--text-muted);
  font-weight: 700;
}

.queue-item {
  width: 100%;
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  color: var(--text-strong);
  cursor: pointer;
  text-align: left;
  padding: 10px;
}

.queue-item + .queue-item {
  margin-top: 10px;
}

.queue-item.active {
  outline: 2px solid var(--primary);
}

.queue-item img,
.book-head img {
  border-radius: 10px;
  object-fit: cover;
  background: var(--surface-soft);
}

.queue-item img {
  width: 64px;
  height: 88px;
}

.queue-item div {
  display: grid;
  gap: 4px;
}

.queue-item span,
.queue-item small,
.description,
.book-head span {
  color: var(--text-muted);
}

.empty-box {
  display: grid;
  place-items: center;
  min-height: 180px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  color: var(--text-muted);
}

.book-head {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 18px;
  align-items: start;
}

.book-head img {
  width: 120px;
  height: 168px;
}

.book-type {
  margin: 0 0 8px;
  color: #0f766e;
  font-weight: 900;
}

.book-head h2 {
  margin: 0;
  color: var(--text-strong);
}

.description {
  margin: 12px 0 0;
  line-height: 1.7;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.full {
  grid-column: 1 / -1;
}

label {
  display: grid;
  gap: 8px;
  color: var(--text-strong);
  font-weight: 800;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-strong);
  font: inherit;
  padding: 12px 14px;
}

.placement-card {
  margin-top: 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 18px;
}

.placement-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.placement-item {
  display: flex;
  align-items: start;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  padding: 12px;
}

.placement-item input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
}

.placement-item div {
  display: grid;
  gap: 4px;
}

.placement-item small {
  color: var(--text-muted);
  font-weight: 700;
}

.promotion-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}

.promotion-fields small {
  grid-column: 1 / -1;
  color: var(--text-muted);
  font-weight: 700;
}

.actions {
  margin-top: 20px;
}

.primary-btn,
.mini-btn {
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 900;
}

.primary-btn {
  min-height: 46px;
  background: var(--primary);
  color: var(--on-primary);
  padding: 0 18px;
}

.mini-btn {
  min-height: 36px;
  background: #edf5f3;
  color: #0b5f59;
  padding: 0 14px;
}

@media (max-width: 900px) {
  .approvals-page {
    gap: 10px;
    padding: 10px 16px 24px;
  }

  .hero {
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .hero-actions a,
  .hero-actions button {
    flex: 1 1 130px;
  }

  .layout,
  .placement-grid,
  .promotion-fields,
  .form-grid,
  .book-head {
    grid-template-columns: 1fr;
  }

  .hero,
  .queue,
  .approval-card {
    border-radius: 10px;
    padding: 12px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .hero {
    gap: 9px;
  }

  .hero p,
  .book-type,
  label,
  .placement-item small,
  .promotion-fields small {
    font-size: 10px;
  }

  .hero h1 {
    margin-top: 3px;
    font-size: 18px;
    line-height: 1.2;
  }

  .hero span,
  .description,
  .queue-item span,
  .queue-item small {
    font-size: 10px;
    line-height: 1.35;
  }

  .hero-actions a,
  .hero-actions button,
  input,
  select,
  textarea,
  .primary-btn,
  .mini-btn {
    min-height: 32px;
    border-radius: 8px;
    font-size: 10px;
    padding: 0 9px;
  }

  textarea {
    padding: 8px 9px;
  }

  .section-head {
    margin-bottom: 9px;
  }

  .section-head h2,
  .section-head h3,
  .book-head h2 {
    font-size: 15px;
  }

  .queue-item {
    grid-template-columns: 42px 1fr;
    gap: 8px;
    border-radius: 8px;
    padding: 7px;
  }

  .queue-item + .queue-item {
    margin-top: 7px;
  }

  .queue-item img {
    width: 42px;
    height: 58px;
  }

  .book-head img {
    width: min(110px, 42vw);
    height: auto;
    aspect-ratio: 5 / 7;
  }

  .form-grid {
    gap: 9px;
    margin-top: 12px;
  }

  .placement-card {
    margin-top: 12px;
    border-radius: 8px;
    padding: 10px;
  }

  .placement-grid,
  .promotion-fields {
    gap: 8px;
  }

  .placement-item {
    gap: 7px;
    border-radius: 8px;
    padding: 8px;
  }

  .actions {
    margin-top: 12px;
  }

  .actions .primary-btn {
    width: 100%;
  }
}

@media (max-width: 420px) {
  .approvals-page {
    padding: 8px 18px 22px;
  }

  .hero h1 {
    font-size: 16px;
  }

  .hero-actions a,
  .hero-actions button,
  input,
  select,
  textarea,
  .primary-btn,
  .mini-btn {
    min-height: 29px;
    font-size: 9px;
  }
}
</style>
