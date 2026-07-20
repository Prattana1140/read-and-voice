<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../../utils/api";
import AccountSectionLayout from "../../components/account/AccountSectionLayout.vue";

type ReviewItem = {
  id: number;
  book_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  book_title: string;
  cover_image?: string | null;
};

const router = useRouter();
const loading = ref(true);
const refreshing = ref(false);
const deletingId = ref<number | null>(null);
const errorMessage = ref("");
const successMessage = ref("");
const searchTerm = ref("");
const ratingFilter = ref("all");
const items = ref<ReviewItem[]>([]);

const hasItems = computed(() => items.value.length > 0);

const filteredItems = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase();
  const rating = ratingFilter.value === "all" ? null : Number(ratingFilter.value);

  return items.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      item.book_title.toLowerCase().includes(keyword) ||
      String(item.comment || "").toLowerCase().includes(keyword);
    const matchesRating = rating === null || Number(item.rating) === rating;
    return matchesKeyword && matchesRating;
  });
});

const averageRating = computed(() => {
  if (!items.value.length) return 0;
  const total = items.value.reduce((sum, item) => sum + Number(item.rating || 0), 0);
  return total / items.value.length;
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
}

function starText(rating: number) {
  return "★".repeat(Math.max(1, Math.min(5, Number(rating) || 1)));
}

async function loadItems(options: { silent?: boolean } = {}) {
  try {
    if (options.silent) {
      refreshing.value = true;
    } else {
      loading.value = true;
    }

    errorMessage.value = "";
    const { data } = await api.get("/account/reviews");
    items.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error: any) {
    if (!options.silent) {
      errorMessage.value = error?.response?.data?.message || "โหลดรีวิวไม่สำเร็จ";
    }
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function openBook(item: ReviewItem) {
  router.push(`/book/${item.book_id}`);
}

async function deleteReview(item: ReviewItem) {
  const confirmed = window.confirm(`ลบรีวิวของ "${item.book_title}" ใช่ไหม`);
  if (!confirmed) return;

  try {
    deletingId.value = item.id;
    errorMessage.value = "";
    successMessage.value = "";
    await api.delete(`/reviews/${item.id}`);
    items.value = items.value.filter((review) => review.id !== item.id);
    successMessage.value = "ลบรีวิวแล้ว";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ลบรีวิวไม่สำเร็จ";
  } finally {
    deletingId.value = null;
  }
}

onMounted(loadItems);
</script>

<template>
  <AccountSectionLayout
    title="รีวิวของฉัน"
    description="รวมคะแนนและความคิดเห็นที่คุณเคยเขียนไว้ พร้อมกลับไปดูหนังสือหรือลบรีวิวที่ไม่ต้องการเก็บแล้ว"
    :loading="loading"
    :error-message="errorMessage"
    :empty="!hasItems"
    empty-title="ยังไม่มีรีวิว"
    empty-text="เมื่อคุณให้คะแนนหรือรีวิวหนังสือ รายการจะแสดงที่หน้านี้"
    @back="router.push('/profile')"
  >
    <section class="review-panel">
      <div class="review-summary">
        <div>
          <span>รีวิวทั้งหมด</span>
          <strong>{{ items.length }}</strong>
        </div>
        <div>
          <span>คะแนนเฉลี่ย</span>
          <strong>{{ averageRating.toFixed(1) }}</strong>
        </div>
        <button type="button" :disabled="refreshing" @click="loadItems({ silent: true })">
          {{ refreshing ? "กำลังอัปเดต..." : "รีเฟรช" }}
        </button>
      </div>

      <p v-if="successMessage" class="feedback success">{{ successMessage }}</p>
      <p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p>

      <div class="review-tools">
        <label>
          <span>ค้นหารีวิว</span>
          <input v-model="searchTerm" type="search" placeholder="ชื่อหนังสือหรือข้อความรีวิว" />
        </label>
        <label>
          <span>คะแนน</span>
          <select v-model="ratingFilter">
            <option value="all">ทุกคะแนน</option>
            <option value="5">5 ดาว</option>
            <option value="4">4 ดาว</option>
            <option value="3">3 ดาว</option>
            <option value="2">2 ดาว</option>
            <option value="1">1 ดาว</option>
          </select>
        </label>
      </div>

      <div v-if="filteredItems.length" class="review-list">
        <article v-for="item in filteredItems" :key="item.id" class="review-card">
          <button type="button" class="cover-button" @click="openBook(item)">
            <img :src="resolveAssetUrl(item.cover_image)" :alt="item.book_title" />
          </button>

          <div class="review-main">
            <div class="review-head">
              <button type="button" class="title-button" @click="openBook(item)">
                {{ item.book_title }}
              </button>
              <span class="stars" :aria-label="`${item.rating} ดาว`">{{ starText(item.rating) }}</span>
            </div>

            <p>{{ item.comment || "ไม่มีข้อความรีวิวเพิ่มเติม" }}</p>
            <small>อัปเดตล่าสุด {{ formatDate(item.updated_at || item.created_at) }}</small>
          </div>

          <div class="review-actions">
            <button type="button" class="secondary" @click="openBook(item)">ดูหนังสือ</button>
            <button
              type="button"
              class="danger"
              :disabled="deletingId === item.id"
              @click="deleteReview(item)"
            >
              {{ deletingId === item.id ? "กำลังลบ..." : "ลบรีวิว" }}
            </button>
          </div>
        </article>
      </div>

      <div v-else class="state-box">
        <strong>ไม่พบรีวิวที่ตรงกับตัวกรอง</strong>
        <span>ลองล้างคำค้นหาหรือเปลี่ยนคะแนนที่เลือก</span>
      </div>
    </section>
  </AccountSectionLayout>
</template>

<style scoped>
.review-panel {
  display: grid;
  gap: 16px;
}

.review-summary,
.review-tools,
.review-card,
.state-box {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.review-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  gap: 12px;
  align-items: center;
  padding: 16px;
}

.review-summary div {
  display: grid;
  gap: 4px;
}

.review-summary span,
label span,
.review-main small,
.state-box span {
  color: var(--text-muted);
}

.review-summary strong {
  color: var(--text-strong);
  font-size: 28px;
  font-weight: 900;
}

.review-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 12px;
  padding: 16px;
}

label {
  display: grid;
  gap: 7px;
}

input,
select {
  min-height: 42px;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  color: var(--text-strong);
  font: inherit;
  padding: 0 12px;
}

.feedback {
  margin: 0;
  border-radius: 12px;
  font-weight: 800;
  padding: 10px 12px;
}

.feedback.success {
  background: #ecfdf5;
  color: #047857;
}

.feedback.error {
  background: #fef2f2;
  color: #b91c1c;
}

.review-list {
  display: grid;
  gap: 12px;
}

.review-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
}

.cover-button {
  width: 72px;
  height: 98px;
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  background: var(--surface-soft);
  cursor: pointer;
  padding: 0;
}

.cover-button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.review-main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.title-button {
  border: 0;
  background: transparent;
  color: var(--text-strong);
  cursor: pointer;
  font: inherit;
  font-size: 19px;
  font-weight: 900;
  padding: 0;
  text-align: left;
}

.stars {
  color: #10b981;
  letter-spacing: 2px;
  white-space: nowrap;
}

.review-main p,
.review-main small,
.state-box strong,
.state-box span {
  margin: 0;
}

.review-main p {
  color: var(--text-muted);
  line-height: 1.7;
}

.review-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

button {
  min-height: 40px;
  border: 0;
  border-radius: 999px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  padding: 0 14px;
}

button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.secondary {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.danger {
  background: #fef2f2;
  color: #b91c1c;
}

.state-box {
  display: grid;
  gap: 6px;
  padding: 18px;
}

.state-box strong {
  color: var(--text-strong);
}

@media (max-width: 820px) {
  .review-summary,
  .review-tools,
  .review-card {
    grid-template-columns: 1fr;
  }

  .review-actions {
    justify-content: stretch;
  }

  .review-actions button,
  .review-summary button {
    width: 100%;
  }
}
</style>
