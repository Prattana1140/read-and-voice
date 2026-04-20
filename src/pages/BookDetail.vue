<template>
  <div class="book-detail-page">
    <div class="container">
      <div v-if="loading" class="state-box">
        กำลังโหลดข้อมูลหนังสือ...
      </div>

      <div v-else-if="error" class="state-box error">
        {{ error }}
      </div>

      <template v-else-if="book">
        <section class="story-hero">
          <div class="story-hero__inner">
            <figure class="story-cover">
              <img :src="bookCover" :alt="book.title" @error="handleImgError" />
            </figure>

            <div class="story-main">
              <div class="story-tags">
                <span>{{ book.category_name || "นิยาย" }}</span>
                <span>{{ book.content_type === "serial" ? `${episodes.length || book.episode_count || 0} ตอน` : "แบบเล่ม" }}</span>
                <span>{{ bookAccessLabel }}</span>
              </div>

              <h1>{{ book.title }}</h1>
              <p class="story-author">
                {{ book.author || "ไม่ระบุผู้เขียน" }}
                <button type="button">ติดตาม</button>
              </p>

              <p class="story-description">
                {{ book.description || "ยังไม่มีคำโปรยสำหรับเรื่องนี้" }}
              </p>

              <div class="story-stats">
                <span>♡ {{ reviewSummary.review_count || 0 }} รีวิว</span>
                <span>👁 {{ displayReadCount }}</span>
                <span>☰ {{ episodes.length || book.episode_count || 1 }} ตอน</span>
                <span>💬 {{ reviews.length }}</span>
              </div>

              <div class="story-actions">
                <button class="icon-action" type="button" @click="addToWishlist">♡</button>
                <button class="outline-action" type="button" @click="addToLibrary">เพิ่มเข้าชั้น</button>
                <button
                  v-if="book.content_type === 'serial' && firstEpisode"
                  class="primary-action"
                  type="button"
                  @click="openEpisodeReader(firstEpisode)"
                >
                  อ่านเลย
                </button>
                <button v-else class="primary-action" type="button" @click="openReaderPage">
                  อ่านเลย
                </button>
                <button
                  v-if="bookAccessType === 'paid'"
                  class="outline-action"
                  type="button"
                  :disabled="purchasingBook"
                  @click="purchaseBookNow"
                >
                  {{ purchasingBook ? "กำลังซื้อ..." : bookPriceLabel }}
                </button>
                <button
                  v-if="bookAccessType === 'subscription' && !hasActiveSubscription"
                  class="outline-action"
                  type="button"
                  @click="router.push('/subscription-plans')"
                >
                  สมัครรายเดือน
                </button>
              </div>
            </div>
          </div>
        </section>

        <main class="story-content-shell">
          <section class="story-section character-section">
            <h2>แนะนำตัวละคร</h2>
            <div class="character-list">
              <article>
                <span>{{ getInitial(book.author || book.title) }}</span>
                <strong>{{ book.author || "นักเขียน" }}</strong>
              </article>
              <article>
                <span>{{ getInitial(book.title) }}</span>
                <strong>{{ book.title }}</strong>
              </article>
            </div>
          </section>

          <section class="story-section note-section">
            <h2>แนะนำเรื่อง</h2>
            <p>{{ book.description || "เรื่องนี้ยังไม่มีคำแนะนำจากผู้เขียน" }}</p>
            <p v-if="previewNotice" class="preview-notice">{{ previewNotice }}</p>
          </section>

          <section class="story-section info-grid">
            <div>
              <h2>ข้อมูลนักเขียน</h2>
              <dl>
                <div>
                  <dt>นามปากกา</dt>
                  <dd>{{ book.author || "ไม่ระบุ" }}</dd>
                </div>
                <div>
                  <dt>นักเขียน</dt>
                  <dd>{{ book.author || "ไม่ระบุ" }}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h2>เผยแพร่</h2>
              <dl>
                <div>
                  <dt>ราคา/สิทธิ์อ่าน</dt>
                  <dd>{{ bookPriceLabel }}</dd>
                </div>
                <div>
                  <dt>รูปแบบ</dt>
                  <dd>{{ book.content_type === "serial" ? "รายตอน" : "แบบเล่ม" }}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section v-if="book.content_type === 'serial'" class="story-section episode-table-section">
            <div class="section-heading">
              <h2>ตอนทั้งหมด ({{ episodes.length }})</h2>
              <button
                v-if="book.access_type === 'paid'"
                type="button"
                :disabled="buyingBook"
                @click="addBookToCart(book.id)"
              >
                {{ buyingBook ? "กำลังเพิ่ม..." : "ซื้อทุกตอน" }}
              </button>
            </div>

            <div class="episode-table">
              <article v-for="episode in episodes" :key="episode.id" class="episode-row">
                <span class="episode-number">#{{ episode.episode_number }}</span>
                <button type="button" class="episode-title" @click="openEpisodeReader(episode)">
                  {{ episode.title }}
                </button>
                <span class="episode-meta">{{ getEpisodeAccessLabel(episode) }}</span>
                <span class="episode-meta">{{ formatEpisodeMeta(episode) }}</span>
                <button
                  v-if="isEpisodePaid(episode)"
                  class="episode-buy"
                  type="button"
                  :disabled="purchasingEpisodeId === episode.id"
                  @click="purchaseEpisodeNow(episode)"
                >
                  {{ purchasingEpisodeId === episode.id ? "กำลังซื้อ..." : "ซื้อและอ่าน" }}
                </button>
                <button v-else class="episode-buy" type="button" @click="openEpisodeReader(episode)">
                  อ่าน
                </button>
              </article>
              <div v-if="!episodes.length" class="empty-content">ยังไม่มีตอนที่เผยแพร่</div>
            </div>
          </section>

          <section v-else class="story-section ebook-preview-section">
            <div class="section-heading">
              <h2>ตัวอย่างเนื้อหา</h2>
              <button type="button" @click="openReaderPage">เปิดอ่านแบบเต็มจอ</button>
            </div>
            <div class="reader-box" :style="{ fontSize: fontSize + 'px', lineHeight: '1.9' }">
              <span
                v-for="(sentence, index) in sentences"
                :key="index"
                class="sentence"
                :class="{ active: index === currentIndex }"
                @click="selectSentence(index)"
              >
                {{ sentence }}
              </span>
              <div v-if="!sentences.length" class="empty-content">ไม่พบเนื้อหาตัวอย่าง</div>
            </div>
          </section>

          <section class="story-section reviews-section">
            <div class="reviews-head">
              <div>
                <p class="reviews-eyebrow">ความคิดเห็น ({{ reviews.length }})</p>
                <h3>{{ reviewSummaryText }}</h3>
              </div>
              <button v-if="!showReviewForm" class="small-btn" type="button" @click="startNewReview">
                เขียนความคิดเห็น
              </button>
            </div>

            <form v-if="showReviewForm" class="review-form" @submit.prevent="submitReview">
              <div class="sticker-row">
                <span v-for="item in ['🌸', '💚', '❤️', '✨', '📚', '😊', '🔥', '🌙']" :key="item">{{ item }}</span>
              </div>
              <label>
                <span>คะแนน</span>
                <select v-model.number="reviewRating">
                  <option v-for="score in [5, 4, 3, 2, 1]" :key="score" :value="score">{{ score }} ดาว</option>
                </select>
              </label>
              <label>
                <span>ความคิดเห็น</span>
                <textarea v-model="reviewComment" rows="4" placeholder="เขียนความคิดเห็นของคุณ" />
              </label>
              <div class="review-actions">
                <button class="btn primary" type="submit" :disabled="reviewSaving">
                  {{ reviewSaving ? "กำลังบันทึก..." : editingReviewId ? "บันทึกการแก้ไข" : "ส่งความคิดเห็น" }}
                </button>
                <button class="btn" type="button" @click="cancelReviewForm">ยกเลิก</button>
              </div>
            </form>

            <p v-if="reviewError" class="review-error">{{ reviewError }}</p>
            <div v-if="reviewsLoading" class="review-state">กำลังโหลดความคิดเห็น...</div>
            <div v-else-if="reviews.length === 0" class="review-state">
              ยังไม่มีความคิดเห็น เป็นคนแรกที่คุยกับเรื่องนี้ได้เลย
            </div>

            <article v-for="review in reviews" :key="review.id" class="review-item">
              <div class="review-meta">
                <strong>{{ review.user_name }}</strong>
                <span>{{ "★".repeat(review.rating) }}{{ "☆".repeat(5 - review.rating) }}</span>
              </div>
              <p>{{ review.comment }}</p>
              <div class="review-footer">
                <span>{{ formatReviewDate(review.created_at) }}</span>
                <div v-if="review.can_edit || review.can_delete" class="review-manage">
                  <button v-if="review.can_edit" type="button" @click="editReview(review)">แก้ไข</button>
                  <button v-if="review.can_delete" type="button" @click="deleteReview(review.id)">ลบ</button>
                </div>
              </div>
            </article>
          </section>
        </main>
      </template>

      <div v-if="false" class="book-layout">
        <!-- =========================
             SIDEBAR: ปก + ข้อมูลหลัก + ปุ่มลัด + TTS ตัวอย่าง
             ========================= -->
        <aside class="book-sidebar">
          <div class="cover-box">
            <img
              :src="bookCover"
              :alt="book.title"
              class="cover-image"
              @error="handleImgError"
            />
          </div>

          <h1 class="book-title">{{ book.title }}</h1>
          <p class="book-author">ผู้แต่ง: {{ book.author || "ไม่ระบุ" }}</p>

          <p v-if="book.category_name" class="book-meta">
            หมวดหมู่: {{ book.category_name }}
          </p>

          <p v-if="book.description" class="book-description">
            {{ book.description }}
          </p>

          <div class="access-card" :class="`access-${bookAccessType}`">
            <span class="access-badge">{{ bookAccessLabel }}</span>
            <strong>{{ bookPriceLabel }}</strong>
            <p>{{ bookAccessHint }}</p>
          </div>

          <!-- ปุ่มลัด -->
          <div class="quick-actions">
            <button class="btn reader-btn" @click="openReaderPage">
              {{ primaryReaderLabel }}
            </button>

            <button class="btn primary library-btn" @click="addToLibrary">
              เพิ่มเข้าชั้นหนังสือ
            </button>

            <button class="btn wishlist-btn" @click="addToWishlist">
              เพิ่ม Wishlist
            </button>

            <button class="btn cart-btn" @click="addWholeBookToCart">
              {{ bookAccessType === "paid" ? "เพิ่มลงตะกร้า" : "เก็บไว้ในตะกร้า" }}
            </button>

            <button
              v-if="bookAccessType === 'paid'"
              class="btn buy-now-btn"
              :disabled="purchasingBook"
              @click="purchaseBookNow"
            >
              {{ purchasingBook ? "กำลังซื้อ..." : "ซื้อและอ่านทันที" }}
            </button>

            <button
              v-if="bookAccessType === 'paid'"
              class="btn coin-btn"
              @click="router.push('/coin-wallet')"
            >
              เติม coin
            </button>

            <button
              v-if="bookAccessType === 'subscription' && !hasActiveSubscription"
              class="btn subscribe-btn"
              @click="router.push('/subscription-plans')"
            >
              สมัครรายเดือน
            </button>
          </div>

        </aside>

        <!-- =========================
             CONTENT AREA
             ========================= -->
        <main class="book-content">
          <div class="content-header">
            <h2>
              {{ book.content_type === "serial" ? "รายการตอน" : "ตัวอย่างเนื้อหา" }}
            </h2>

            <div class="top-right-actions">
              <button class="small-btn" @click="goToWishlist">Wishlist</button>
              <button class="small-btn" @click="goToCart">ตะกร้า</button>
            </div>
          </div>

          <!-- =========================
               กรณีเป็นนิยายรายตอน / serial
               ========================= -->
          <div v-if="book.content_type === 'serial'" class="episode-list">
            <!-- กล่องซื้อทั้งเรื่อง / สมัครรายเดือน -->
            <div class="purchase-actions">
              <button
                v-if="book.access_type === 'paid'"
                class="btn primary"
                :disabled="buyingBook"
                @click="addBookToCart(book.id)"
              >
                {{ buyingBook ? "กำลังเพิ่ม..." : `ซื้ออีบุ๊ก ${book.price || 0} coin` }}
              </button>

              <router-link
                v-if="book.access_type === 'subscription'"
                class="subscribe-link"
                to="/subscription-plans"
              >
                สมัครรายเดือนเพื่ออ่าน
              </router-link>
            </div>

            <article
              v-for="episode in episodes"
              :key="episode.id"
              class="episode-item"
            >
              <div>
                <strong>ตอนที่ {{ episode.episode_number }}: {{ episode.title }}</strong>
                <p>{{ getEpisodeAccessLabel(episode) }}</p>
              </div>

              <div class="episode-actions">
                <button class="small-btn" @click="openEpisodeReader(episode)">
                  {{ isEpisodeFree(episode) ? "อ่านตอนนี้" : "ดูสถานะตอน" }}
                </button>

                <button
                  v-if="isEpisodePaid(episode)"
                  class="small-btn"
                  :disabled="buyingEpisodeId === episode.id"
                  @click="addEpisodeToCart(episode)"
                >
                  {{
                    buyingEpisodeId === episode.id
                      ? "กำลังเพิ่ม..."
                    : "เพิ่มตอนลงตะกร้า"
                  }}
                </button>

                <button
                  v-if="isEpisodePaid(episode)"
                  class="small-btn buy-now-small"
                  :disabled="purchasingEpisodeId === episode.id"
                  @click="purchaseEpisodeNow(episode)"
                >
                  {{ purchasingEpisodeId === episode.id ? "กำลังซื้อ..." : "ซื้อและอ่าน" }}
                </button>

                <router-link
                  v-if="episode.access_type === 'subscription'"
                  class="subscribe-link small-link"
                  to="/subscription-plans"
                >
                  สมัครรายเดือน
                </router-link>
              </div>
            </article>

            <div v-if="!episodes.length" class="empty-content">
              ยังไม่มีตอนที่เผยแพร่
            </div>
          </div>

          <!-- =========================
               กรณีเป็น ebook เต็มเล่ม
               ========================= -->
          <div
            v-else
            class="reader-box"
            :style="{ fontSize: fontSize + 'px', lineHeight: '1.9' }"
          >
            <span
              v-for="(sentence, index) in sentences"
              :key="index"
              class="sentence"
              :class="{ active: index === currentIndex }"
              @click="selectSentence(index)"
            >
              {{ sentence }}
            </span>

            <div v-if="!sentences.length" class="empty-content">
              ไม่พบเนื้อหาสำหรับอ่านออกเสียง
            </div>
          </div>

          <p v-if="previewNotice" class="preview-notice">{{ previewNotice }}</p>

          <div v-if="book.content_type !== 'serial'" class="preview-footer">
            <button
              class="btn reader-btn preview-reader-btn"
              @click="openReaderPage"
            >
              เปิดอ่านเต็มเล่มใน Reader
            </button>
          </div>

          <section class="reviews-section">
            <div class="reviews-head">
              <div>
                <p class="reviews-eyebrow">รีวิวจากผู้อ่าน</p>
                <h3>{{ reviewSummaryText }}</h3>
              </div>
              <button
                v-if="!showReviewForm"
                class="small-btn"
                type="button"
                @click="startNewReview"
              >
                เขียนรีวิว
              </button>
            </div>

            <form v-if="showReviewForm" class="review-form" @submit.prevent="submitReview">
              <label>
                <span>คะแนน</span>
                <select v-model.number="reviewRating">
                  <option v-for="score in [5, 4, 3, 2, 1]" :key="score" :value="score">
                    {{ score }} ดาว
                  </option>
                </select>
              </label>

              <label>
                <span>ความคิดเห็น</span>
                <textarea
                  v-model="reviewComment"
                  rows="4"
                  placeholder="เล่าว่าหนังสือเล่มนี้เป็นอย่างไร"
                />
              </label>

              <div class="review-actions">
                <button class="btn primary" type="submit" :disabled="reviewSaving">
                  {{ reviewSaving ? "กำลังบันทึก..." : editingReviewId ? "บันทึกการแก้ไข" : "ส่งรีวิว" }}
                </button>
                <button class="btn" type="button" @click="cancelReviewForm">
                  ยกเลิก
                </button>
              </div>
            </form>

            <p v-if="reviewError" class="review-error">{{ reviewError }}</p>

            <div v-if="reviewsLoading" class="review-state">กำลังโหลดรีวิว...</div>
            <div v-else-if="reviews.length === 0" class="review-state">
              ยังไม่มีรีวิว เป็นคนแรกที่แบ่งปันความคิดเห็นได้เลย
            </div>

            <article v-for="review in reviews" :key="review.id" class="review-item">
              <div class="review-meta">
                <strong>{{ review.user_name }}</strong>
                <span>{{ "★".repeat(review.rating) }}{{ "☆".repeat(5 - review.rating) }}</span>
              </div>
              <p>{{ review.comment }}</p>
              <div class="review-footer">
                <span>{{ formatReviewDate(review.created_at) }}</span>
                <div v-if="review.can_edit || review.can_delete" class="review-manage">
                  <button v-if="review.can_edit" type="button" @click="editReview(review)">แก้ไข</button>
                  <button v-if="review.can_delete" type="button" @click="deleteReview(review.id)">ลบ</button>
                </div>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// =========================
// ส่วน import
// ใช้สำหรับดึง dependency ที่จำเป็นเข้ามา
// =========================
import { API_BASE_URL } from "../utils/api";
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { getAuthHeaders, getUser } from "../utils/auth";
import api from "../utils/api";

// =========================
// Type สำหรับข้อมูลหนังสือ
// ใช้ช่วยให้ TypeScript รู้ shape ของข้อมูล
// =========================
type Book = {
  id: number;
  title: string;
  author: string;
  description?: string;
  cover?: string;
  cover_url?: string;
  cover_image?: string;
  content?: string;
  full_text?: string;
  category_name?: string;
  price?: number;
  content_type?: "ebook" | "serial";
  access_type?: "paid" | "free" | "subscription";
  episode_count?: number;
  view_count?: number;
  read_count?: number;
  created_at?: string;
  updated_at?: string;
};

type Episode = {
  id: number;
  book_id: number;
  episode_number: number;
  title: string;
  price: number;
  is_free?: number;
  access_type?: "paid" | "free" | "subscription";
  view_count?: number;
  read_count?: number;
  comment_count?: number;
  word_count?: number;
  created_at?: string;
  updated_at?: string;
};

type BookReview = {
  id: number;
  user_id: number;
  book_id: number;
  rating: number;
  comment: string;
  created_at: string;
  updated_at?: string;
  user_name: string;
  user_role?: string;
  can_edit?: boolean;
  can_delete?: boolean;
};

// จำกัดจำนวนประโยคตัวอย่างในหน้า detail
const PREVIEW_LIMIT = 12;

// =========================
// route / router
// ใช้อ่าน id จาก URL และสั่งเปลี่ยนหน้า
// =========================
const route = useRoute();
const router = useRouter();

// =========================
// state หลักของหน้า
// =========================
const book = ref<Book | null>(null);
const episodes = ref<Episode[]>([]);
const loading = ref(true);
const error = ref("");
const previewNotice = ref("");

// state ฝั่ง reader preview
const fontSize = ref(22);
const rate = ref(1);
const pitch = ref(1);
const volume = ref(1);

// state voice
const voices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoice = ref("");

// state ประโยคสำหรับ TTS preview
const sentences = ref<string[]>([]);
const currentIndex = ref(0);

// state สถานะเสียง
const isSpeaking = ref(false);
const isPaused = ref(false);

// state subscription/cart
const subscriptionInfo = ref<any>(null);
const buyingBook = ref(false);
const buyingEpisodeId = ref<number | null>(null);
const purchasingBook = ref(false);
const purchasingEpisodeId = ref<number | null>(null);

// state รีวิว
const reviews = ref<BookReview[]>([]);
const reviewsLoading = ref(false);
const reviewSaving = ref(false);
const reviewError = ref("");
const showReviewForm = ref(false);
const editingReviewId = ref<number | null>(null);
const reviewRating = ref(5);
const reviewComment = ref("");
const reviewSummary = ref({
  review_count: 0,
  average_rating: 0,
});

// =========================
// computed
// ใช้คำนวณข้อมูลจาก state
// =========================
const selectedVoiceObject = computed(() => {
  return voices.value.find((v) => v.name === selectedVoice.value) || null;
});

const bookCover = computed(() => {
  const cover =
    book.value?.cover_url || book.value?.cover || book.value?.cover_image || "";

  if (!cover) return "/no-cover.png";
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;

  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
});

const progressKey = computed(() => {
  return book.value ? `book-preview-progress-${book.value.id}` : "";
});

// =========================
// helper functions
// =========================
const handleImgError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
};

const isEpisodeFree = (episode: Episode) => {
  return Number(episode.is_free) === 1 || episode.access_type === "free" || Number(episode.price) <= 0;
};

const isEpisodePaid = (episode: Episode) => {
  return episode.access_type === "paid" || (!isEpisodeFree(episode) && episode.access_type !== "subscription");
};

const getEpisodeAccessLabel = (episode: Episode) => {
  if (episode.access_type === "subscription") {
    return "อ่านได้ด้วยแพ็กเกจรายเดือน";
  }

  if (isEpisodeFree(episode)) {
    return "อ่านฟรี";
  }

  return `ใช้ ${episode.price || 0} coin`;
};

const bookAccessType = computed(() => {
  return book.value?.access_type || "free";
});

const hasActiveSubscription = computed(() => {
  return Boolean(subscriptionInfo.value?.isActive);
});

const bookAccessLabel = computed(() => {
  if (bookAccessType.value === "subscription") return "อ่านด้วยรายเดือน";
  if (bookAccessType.value === "paid") return "ใช้ coin";
  return "อ่านฟรี";
});

const bookPriceLabel = computed(() => {
  if (bookAccessType.value === "subscription") {
    return hasActiveSubscription.value ? "แพ็กเกจกำลังใช้งาน" : "ต้องมีแพ็กเกจ";
  }

  if (bookAccessType.value === "paid") {
    return `${book.value?.price || 0} coin`;
  }

  return "0 coin";
});

const bookAccessHint = computed(() => {
  if (bookAccessType.value === "subscription") {
    return hasActiveSubscription.value
      ? "บัญชีนี้มีแพ็กเกจรายเดือน สามารถเปิดอ่านได้"
      : "สมัครแพ็กเกจรายเดือนก่อนเพื่ออ่านเนื้อหานี้";
  }

  if (bookAccessType.value === "paid") {
    return "เติม coin ให้พอ แล้วเพิ่มลงตะกร้าหรือซื้อเพื่อปลดล็อก";
  }

  return "เปิดอ่านและฟังเสียงได้ทันที";
});

const primaryReaderLabel = computed(() => {
  if (bookAccessType.value === "free") return "อ่านฟรีใน Reader";
  if (bookAccessType.value === "subscription" && hasActiveSubscription.value) {
    return "อ่านด้วยแพ็กเกจใน Reader";
  }

  return "ตรวจสิทธิ์/อ่านใน Reader";
});

const reviewSummaryText = computed(() => {
  const count = reviewSummary.value.review_count;
  const average = Number(reviewSummary.value.average_rating || 0);

  if (!count) return "ยังไม่มีคะแนน";

  return `${average.toFixed(1)} / 5 จาก ${count} รีวิว`;
});

const firstEpisode = computed(() => {
  return episodes.value[0] || null;
});

const displayReadCount = computed(() => {
  const count = Number(book.value?.read_count || book.value?.view_count || 0);
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
});

const getInitial = (value: string) => {
  return String(value || "R").trim().charAt(0).toUpperCase() || "R";
};

const formatEpisodeMeta = (episode: Episode) => {
  const words = Number(episode.word_count || 0);
  const reads = Number(episode.read_count || episode.view_count || 0);
  const comments = Number(episode.comment_count || 0);
  const parts = [];

  if (words) parts.push(`${words.toLocaleString()} คำ`);
  if (comments) parts.push(`${comments} ความคิดเห็น`);
  if (reads) parts.push(`${reads.toLocaleString()} อ่าน`);

  return parts.join(" · ") || "พร้อมอ่าน";
};

const canDeleteReview = (review: BookReview) => {
  const user = getUser();
  if (!user) return false;

  return (
    Number(review.user_id) === Number(user.id) ||
    user.role === "admin" ||
    user.role === "superadmin"
  );
};

const canEditReview = (review: BookReview) => {
  const user = getUser();
  return Boolean(user && Number(review.user_id) === Number(user.id));
};

const normalizeReview = (review: BookReview): BookReview => {
  return {
    ...review,
    rating: Number(review.rating || 0),
    can_edit: canEditReview(review),
    can_delete: canDeleteReview(review),
  };
};

const loadVoices = () => {
  const list = window.speechSynthesis.getVoices();
  voices.value = list;

  const thaiVoice = list.find((v) => v.lang?.toLowerCase().includes("th"));

  if (thaiVoice && !selectedVoice.value) {
    selectedVoice.value = thaiVoice.name;
  }

  if (!selectedVoice.value && list.length > 0) {
    selectedVoice.value = list[0].name;
  }
};

const normalizeContent = (raw: unknown): string => {
  if (!raw) return "";

  if (typeof raw === "string") {
    const trimmed = raw.trim();

    try {
      const parsed = JSON.parse(trimmed);
      return normalizeContent(parsed);
    } catch {
      return trimmed;
    }
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeContent(item)).join("\n");
  }

  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;

    if (typeof obj.content === "string") return obj.content;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.full_text === "string") return obj.full_text;

    if (Array.isArray(obj.chapters)) {
      return obj.chapters
        .map((ch) => {
          if (typeof ch === "string") return ch;

          if (typeof ch === "object" && ch !== null) {
            const chapter = ch as Record<string, unknown>;
            if (typeof chapter.content === "string") return chapter.content;
            if (typeof chapter.text === "string") return chapter.text;
          }

          return "";
        })
        .join("\n");
    }

    return Object.values(obj)
      .map((v) => normalizeContent(v))
      .join("\n");
  }

  return String(raw);
};

const splitSentences = (text: string): string[] => {
  if (!text) return [];

  const cleaned = text
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, " <PARA> ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(/(?<=[.!?…。！？])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .flatMap((s) => {
      if (s.length <= 220) return [s];
      return s.match(/.{1,180}([,;:]\s*|$)/g)?.map((x) => x.trim()) || [s];
    });
};

const saveProgress = () => {
  if (!progressKey.value) return;
  localStorage.setItem(progressKey.value, String(currentIndex.value));
};

const loadProgress = () => {
  if (!progressKey.value) return;

  const saved = localStorage.getItem(progressKey.value);
  if (saved !== null) {
    const parsed = Number(saved);

    if (!Number.isNaN(parsed) && parsed >= 0 && parsed < sentences.value.length) {
      currentIndex.value = parsed;
    }
  }
};

const savePreviewSettings = () => {
  localStorage.setItem("book-detail-font-size", String(fontSize.value));
  localStorage.setItem("book-detail-rate", String(rate.value));
  localStorage.setItem("book-detail-pitch", String(pitch.value));
  localStorage.setItem("book-detail-volume", String(volume.value));
  localStorage.setItem("book-detail-voice", selectedVoice.value);
};

const loadPreviewSettings = () => {
  const savedFont = localStorage.getItem("book-detail-font-size");
  const savedRate = localStorage.getItem("book-detail-rate");
  const savedPitch = localStorage.getItem("book-detail-pitch");
  const savedVolume = localStorage.getItem("book-detail-volume");
  const savedVoice = localStorage.getItem("book-detail-voice");

  if (savedFont !== null) fontSize.value = Number(savedFont) || 22;
  if (savedRate !== null) rate.value = Number(savedRate) || 1;
  if (savedPitch !== null) pitch.value = Number(savedPitch) || 1;
  if (savedVolume !== null) volume.value = Number(savedVolume) || 1;
  if (savedVoice !== null) selectedVoice.value = savedVoice;
};

const scrollToCurrent = async () => {
  await nextTick();

  const el = document.querySelector(".sentence.active");
  if (el) {
    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
};

// =========================
// API load data
// =========================
const fetchBook = async () => {
  loading.value = true;
  error.value = "";
  previewNotice.value = "";

  try {
    const id = Number(route.params.id);

    const bookRes = await axios.get(`${API_BASE_URL}/api/books/${id}`);
    book.value = bookRes.data;
    fetchReviews();

    // ถ้าเป็น serial ให้โหลดเฉพาะรายการตอน
    if (book.value?.content_type === "serial") {
      const episodeRes = await axios.get(`${API_BASE_URL}/api/books/${id}/episodes`);
      episodes.value = Array.isArray(episodeRes.data) ? episodeRes.data : [];
      sentences.value = [];
      return;
    }

    // ถ้าเป็น ebook ให้โหลด content preview
    const contentRes = await axios.get(`${API_BASE_URL}/api/books/${id}/content`, {
      headers: getAuthHeaders(),
    });

    const rawData = contentRes.data;

    if (Array.isArray(rawData)) {
      const fullText = rawData.map((p: any) => p.content || "").join(" ");
      const hasPreview = rawData.some((p: any) => p.is_preview);

      if (hasPreview) {
        previewNotice.value = "ขณะนี้แสดงเฉพาะตัวอย่างเนื้อหา หากต้องการอ่านเต็มเล่มให้เข้าสู่ระบบหรือซื้อก่อน";
      }

      const normalized = normalizeContent(fullText);
      const allSentences = splitSentences(normalized);
      sentences.value = allSentences.slice(0, PREVIEW_LIMIT);
    } else if (rawData?.content) {
      const normalized = normalizeContent(rawData.content);
      const allSentences = splitSentences(normalized);
      sentences.value = allSentences.slice(0, PREVIEW_LIMIT);

      if (rawData?.is_preview) {
        previewNotice.value = "ขณะนี้แสดงเฉพาะตัวอย่างเนื้อหา";
      }
    } else {
      sentences.value = [];
    }

    loadProgress();
  } catch (err) {
    console.error("fetchBook error:", err);
    error.value = "โหลดหนังสือไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

const loadSubscriptionStatus = async () => {
  try {
    const { data } = await api.get("/subscriptions/me");
    subscriptionInfo.value = data;
  } catch {
    subscriptionInfo.value = null;
  }
};

const fetchReviews = async () => {
  if (!book.value?.id) return;

  reviewsLoading.value = true;
  reviewError.value = "";

  try {
    const { data } = await api.get(`/books/${book.value.id}/reviews`);
    reviews.value = Array.isArray(data?.items) ? data.items : [];
    reviewSummary.value = {
      review_count: Number(data?.summary?.review_count || 0),
      average_rating: Number(data?.summary?.average_rating || 0),
    };
  } catch (err: any) {
    reviewError.value = err?.response?.data?.message || "โหลดรีวิวไม่สำเร็จ";
  } finally {
    reviewsLoading.value = false;
  }
};

const startNewReview = () => {
  const user = getUser();
  if (!user) {
    alert("กรุณาเข้าสู่ระบบก่อนเขียนรีวิว");
    router.push({ name: "Login" });
    return;
  }

  editingReviewId.value = null;
  reviewRating.value = 5;
  reviewComment.value = "";
  reviewError.value = "";
  showReviewForm.value = true;
};

const cancelReviewForm = () => {
  showReviewForm.value = false;
  editingReviewId.value = null;
  reviewRating.value = 5;
  reviewComment.value = "";
  reviewError.value = "";
};

const submitReview = async () => {
  if (!book.value?.id || reviewSaving.value) return;

  const user = getUser();
  if (!user) {
    alert("กรุณาเข้าสู่ระบบก่อนเขียนรีวิว");
    router.push({ name: "Login" });
    return;
  }

  const comment = reviewComment.value.trim();
  if (!comment) {
    reviewError.value = "กรุณาเขียนความคิดเห็น";
    return;
  }

  reviewSaving.value = true;
  reviewError.value = "";

  try {
    const payload = {
      rating: reviewRating.value,
      comment,
    };

    if (editingReviewId.value) {
      await api.put(`/reviews/${editingReviewId.value}`, payload);
    } else {
      await api.post(`/books/${book.value.id}/reviews`, payload);
    }

    cancelReviewForm();
    await fetchReviews();
  } catch (err: any) {
    reviewError.value = err?.response?.data?.message || "บันทึกรีวิวไม่สำเร็จ";
  } finally {
    reviewSaving.value = false;
  }
};

const editReview = (review: BookReview) => {
  editingReviewId.value = review.id;
  reviewRating.value = review.rating;
  reviewComment.value = review.comment || "";
  reviewError.value = "";
  showReviewForm.value = true;
};

const deleteReview = async (reviewId: number) => {
  const confirmed = window.confirm("ต้องการลบรีวิวนี้ใช่ไหม?");
  if (!confirmed) return;

  try {
    await api.delete(`/reviews/${reviewId}`);
    await fetchReviews();
  } catch (err: any) {
    reviewError.value = err?.response?.data?.message || "ลบรีวิวไม่สำเร็จ";
  }
};

const formatReviewDate = (value: string) => {
  if (!value) return "";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

// =========================
// TTS functions
// =========================
const stopSpeech = () => {
  window.speechSynthesis.cancel();
  isSpeaking.value = false;
  isPaused.value = false;
};

const speakFrom = (index: number) => {
  if (!sentences.value.length) return;
  if (index < 0 || index >= sentences.value.length) return;

  stopSpeech();

  currentIndex.value = index;
  saveProgress();

  const text = sentences.value[index];
  const utter = new SpeechSynthesisUtterance(text);

  utter.lang = selectedVoiceObject.value?.lang || "th-TH";
  utter.voice = selectedVoiceObject.value || null;
  utter.rate = rate.value;
  utter.pitch = pitch.value;
  utter.volume = volume.value;

  utter.onstart = () => {
    isSpeaking.value = true;
    isPaused.value = false;
    scrollToCurrent();
  };

  utter.onend = () => {
    saveProgress();

    const nextIndex = currentIndex.value + 1;
    if (nextIndex < sentences.value.length) {
      speakFrom(nextIndex);
    } else {
      isSpeaking.value = false;
      isPaused.value = false;
    }
  };

  utter.onerror = (e) => {
    console.error("TTS error:", e);
    isSpeaking.value = false;
    isPaused.value = false;
  };

  window.speechSynthesis.speak(utter);
};

const playBook = () => {
  if (!sentences.value.length) return;
  speakFrom(currentIndex.value);
};

const pauseBook = () => {
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    isPaused.value = true;
    isSpeaking.value = false;
    saveProgress();
  }
};

const resumeBook = () => {
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    isPaused.value = false;
    isSpeaking.value = true;
    scrollToCurrent();
  } else {
    playBook();
  }
};

const restartBook = () => {
  currentIndex.value = 0;
  saveProgress();
  playBook();
};

const nextSentence = () => {
  if (currentIndex.value < sentences.value.length - 1) {
    speakFrom(currentIndex.value + 1);
  }
};

const prevSentence = () => {
  if (currentIndex.value > 0) {
    speakFrom(currentIndex.value - 1);
  }
};

const replayCurrent = () => {
  if (!sentences.value.length) return;
  speakFrom(currentIndex.value);
};

const selectSentence = (index: number) => {
  speakFrom(index);
};

// =========================
// navigation
// =========================
const openReaderPage = () => {
  if (!book.value) return;
  stopSpeech();

  router.push({
    name: "ReaderPage",
    params: { id: book.value.id },
  });
};

const openEpisodeReader = (episode: Episode) => {
  if (!book.value) return;
  stopSpeech();

  router.push({
    name: "ReaderPage",
    params: { id: book.value.id },
    query: { episode: String(episode.id) },
  });
};

const goToWishlist = () => {
  router.push({ name: "WishList" });
};

const goToCart = () => {
  router.push({ name: "Cart" });
};

// =========================
// actions: library / wishlist / cart
// =========================
const addToLibrary = async () => {
  try {
    const user = getUser();
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อน");
      router.push({ name: "Login" });
      return;
    }

    if (!book.value) return;

    const res = await axios.post(
      `${API_BASE_URL}/api/library`,
      { book_id: book.value.id },
      { headers: getAuthHeaders() },
    );

    alert(res.data.message || "เพิ่มเข้าชั้นหนังสือสำเร็จ");
  } catch (err: any) {
    alert(err?.response?.data?.message || "เพิ่มเข้าชั้นหนังสือไม่สำเร็จ");
    console.error("addToLibrary error:", err);
  }
};

const addToWishlist = () => {
  if (!book.value) return;

  const user = getUser();
  if (!user) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    router.push({ name: "Login" });
    return;
  }

  api
    .post("/wishlist", { book_id: book.value.id })
    .then((res) => {
      alert(res.data?.message || "เพิ่มรายการที่อยากได้สำเร็จ");
    })
    .catch((error) => {
      alert(error?.response?.data?.message || "เพิ่มรายการที่อยากได้ไม่สำเร็จ");
    });
};

const addWholeBookToCart = async () => {
  if (!book.value) return;

  if (bookAccessType.value === "free") {
    openReaderPage();
    return;
  }

  if (bookAccessType.value === "subscription" && !hasActiveSubscription.value) {
    router.push("/subscription-plans");
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    router.push({ name: "Login" });
    return;
  }

  try {
    await axios.post(
      `${API_BASE_URL}/api/cart`,
      { book_id: book.value.id },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    alert("เพิ่มลงตะกร้าแล้ว");
  } catch (err: any) {
    alert(err?.response?.data?.message || "เพิ่มลงตะกร้าไม่สำเร็จ");
    console.error("addWholeBookToCart error:", err);
  }
};

const addBookToCart = async (bookId: number) => {
  try {
    if (bookAccessType.value === "free") {
      openReaderPage();
      return;
    }

    buyingBook.value = true;
    await api.post("/cart", { book_id: bookId, quantity: 1 });
    alert("เพิ่มอีบุ๊กลงตะกร้าแล้ว");
  } catch (error: any) {
    alert(error?.response?.data?.message || "เพิ่มอีบุ๊กลงตะกร้าไม่สำเร็จ");
  } finally {
    buyingBook.value = false;
  }
};

const addEpisodeToCart = async (episode: Episode) => {
  try {
    buyingEpisodeId.value = episode.id;
    await api.post("/cart", { episode_id: episode.id, quantity: 1 });
    alert("เพิ่มตอนลงตะกร้าแล้ว");
  } catch (error: any) {
    alert(error?.response?.data?.message || "เพิ่มตอนลงตะกร้าไม่สำเร็จ");
  } finally {
    buyingEpisodeId.value = null;
  }
};

const ensureLoggedInForPurchase = () => {
  const user = getUser();
  if (user) return true;

  alert("กรุณาเข้าสู่ระบบก่อนซื้อ");
  router.push({ name: "Login" });
  return false;
};

const handlePurchaseError = (error: any) => {
  if (error?.response?.status === 402) {
    alert(error?.response?.data?.message || "coin ไม่พอ กรุณาเติม coin ก่อน");
    router.push("/coin-wallet");
    return;
  }

  alert(error?.response?.data?.message || "ซื้อไม่สำเร็จ");
};

const purchaseBookNow = async () => {
  if (!book.value || purchasingBook.value) return;
  if (!ensureLoggedInForPurchase()) return;

  purchasingBook.value = true;

  try {
    await api.post("/orders/purchase", {
      book_id: book.value.id,
      payment_method: "coin",
    });

    alert("ซื้อสำเร็จ กำลังเปิด Reader");
    openReaderPage();
  } catch (error: any) {
    handlePurchaseError(error);
  } finally {
    purchasingBook.value = false;
  }
};

const purchaseEpisodeNow = async (episode: Episode) => {
  if (purchasingEpisodeId.value) return;
  if (!ensureLoggedInForPurchase()) return;

  purchasingEpisodeId.value = episode.id;

  try {
    await api.post("/orders/purchase", {
      episode_id: episode.id,
      payment_method: "coin",
    });

    alert("ซื้อตอนสำเร็จ กำลังเปิด Reader");
    openEpisodeReader(episode);
  } catch (error: any) {
    handlePurchaseError(error);
  } finally {
    purchasingEpisodeId.value = null;
  }
};

// =========================
// watchers
// =========================
watch([fontSize, rate, pitch, volume, selectedVoice], () => {
  savePreviewSettings();
});

// =========================
// lifecycle
// =========================
onMounted(async () => {
  loadPreviewSettings();
  await fetchBook();
  await loadSubscriptionStatus();
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  scrollToCurrent();
});

onBeforeUnmount(() => {
  saveProgress();
  savePreviewSettings();
  stopSpeech();
  window.speechSynthesis.onvoiceschanged = null;
});
</script>

<style scoped>
.book-detail-page {
  min-height: 100vh;
  background: #f7f8fc;
  padding: 24px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.state-box {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.state-box.error {
  color: #b00020;
}

.book-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
}

.book-sidebar,
.book-content {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.cover-box {
  width: 100%;
  height: 420px;
  border-radius: 16px;
  overflow: hidden;
  background: #ececf3;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.book-title {
  font-size: 28px;
  margin-bottom: 8px;
  color: #222;
}

.book-author {
  color: #555;
  margin-bottom: 8px;
}

.book-meta {
  color: #667085;
  margin-bottom: 12px;
  font-weight: 600;
}

.book-description {
  margin: 0 0 20px;
  color: #475467;
  line-height: 1.6;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.quick-actions {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}

.access-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  margin: 0 0 18px;
  padding: 14px;
}

.access-card strong {
  color: #111827;
  display: block;
  font-size: 24px;
  margin-top: 8px;
}

.access-card p {
  color: #667085;
  line-height: 1.5;
  margin: 8px 0 0;
}

.access-badge {
  border-radius: 8px;
  display: inline-flex;
  font-size: 13px;
  font-weight: 900;
  padding: 6px 10px;
}

.access-free .access-badge {
  background: #ecfdf5;
  color: #047857;
}

.access-paid .access-badge {
  background: #fff7ed;
  color: #c2410c;
}

.access-subscription .access-badge {
  background: #eef2ff;
  color: #3730a3;
}

.tts-panel h3 {
  margin-bottom: 8px;
}

.tts-note {
  margin: 0 0 16px;
  color: #667085;
  line-height: 1.5;
  font-size: 14px;
}

.control-group {
  margin-bottom: 16px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #333;
}

.input,
select,
input[type="range"] {
  width: 100%;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.btn {
  border: none;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  background: #eceef7;
  font-weight: 600;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn.primary {
  background: #6c63ff;
  color: white;
}

.btn.danger {
  background: #ff5b6e;
  color: white;
}

.reader-btn {
  width: 100%;
  background: #222b45;
  color: white;
}

.preview-reader-btn {
  max-width: 320px;
}

.library-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.wishlist-btn {
  width: 100%;
  background: #fff1f4;
  color: #c23b61;
}

.cart-btn {
  width: 100%;
  background: #eef6ff;
  color: #2f63d8;
}

.buy-now-btn {
  width: 100%;
  background: #111827;
  color: #ffffff;
}

.buy-now-small {
  background: #111827;
  color: #ffffff;
}

.coin-btn {
  width: 100%;
  background: #ecfdf5;
  color: #047857;
}

.subscribe-btn {
  width: 100%;
  background: #eef2ff;
  color: #3730a3;
}

.status-box {
  margin-top: 12px;
  background: #f6f7fb;
  border-radius: 14px;
  padding: 14px;
  color: #444;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.book-content h2 {
  margin: 0;
}

.top-right-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.small-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  background: #edf1f7;
  color: #1f2430;
  font-weight: 700;
  cursor: pointer;
}

.reader-box {
  background: #fcfcff;
  border: 1px solid #ececf3;
  border-radius: 16px;
  padding: 24px;
  min-height: 500px;
  max-height: 75vh;
  overflow-y: auto;
  color: #222;
}

.episode-list {
  display: grid;
  gap: 12px;
}

.episode-item {
  align-items: center;
  background: #fcfcff;
  border: 1px solid #ececf3;
  border-radius: 8px;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 16px;
}

.episode-item p {
  color: #667085;
  margin: 6px 0 0;
}

.episode-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.purchase-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.subscribe-link {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  background: #eef6ff;
  color: #2f63d8;
  text-decoration: none;
  font-weight: 700;
}

.small-link {
  padding: 8px 10px;
  border-radius: 10px;
}

.preview-notice {
  background: #fff8e6;
  border: 1px solid #ffe3a3;
  border-radius: 8px;
  color: #7a4d00;
  font-weight: 700;
  margin: 16px 0 0;
  padding: 12px 14px;
}

.sentence {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 8px;
  transition: all 0.2s ease;
  margin-right: 4px;
}

.sentence:hover {
  background: #eef1ff;
}

.sentence.active {
  background: #fff1a8;
}

.empty-content {
  margin-top: 20px;
  color: #777;
}

.preview-footer {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.reviews-section {
  border-top: 1px solid #e5e7eb;
  margin-top: 28px;
  padding-top: 22px;
}

.reviews-head {
  align-items: center;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  margin-bottom: 16px;
}

.reviews-eyebrow {
  color: #008e68;
  font-size: 13px;
  font-weight: 900;
  margin: 0 0 4px;
}

.reviews-head h3 {
  color: #111827;
  font-size: 18px;
  margin: 0;
}

.review-form {
  border: 1px solid #e5e7eb;
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
}

.review-form label {
  display: grid;
  gap: 6px;
  font-weight: 800;
}

.review-form select,
.review-form textarea {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font: inherit;
  padding: 10px 12px;
}

.review-actions,
.review-manage {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.review-error {
  color: #b91c1c;
  font-weight: 800;
}

.review-state {
  color: #6b7280;
  padding: 14px 0;
}

.review-item {
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 0;
}

.review-meta,
.review-footer {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.review-meta strong {
  color: #111827;
}

.review-meta span {
  color: #f59e0b;
  letter-spacing: 1px;
}

.review-item p {
  color: #374151;
  line-height: 1.8;
  margin: 10px 0;
}

.review-footer {
  color: #6b7280;
  font-size: 13px;
}

.review-manage button {
  border: 0;
  background: transparent;
  color: #008e68;
  cursor: pointer;
  font-weight: 800;
  padding: 4px 0;
}

@media (max-width: 960px) {
  .book-layout {
    grid-template-columns: 1fr;
  }

  .cover-box {
    height: 320px;
  }

  .content-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .preview-footer {
    justify-content: stretch;
  }

  .preview-reader-btn {
    max-width: none;
    width: 100%;
  }

  .episode-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .episode-actions {
    justify-content: flex-start;
  }
}
/* Reference-style layout override */
.book-detail-page {
  background: #ffffff;
  padding: 0 0 72px;
}

.container {
  max-width: none;
}

.book-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

.book-sidebar,
.book-content {
  width: min(100% - 32px, 720px);
  margin-inline: auto;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.book-sidebar {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  column-gap: 24px;
  align-items: start;
  padding: 28px 0 34px;
}

.cover-box {
  grid-row: span 8;
  width: 190px;
  height: 260px;
  margin: 0;
  border-radius: 0;
  background: #f3f4f6;
  box-shadow: 0 1px 3px rgba(17, 24, 39, 0.12);
}

.cover-image {
  object-fit: cover;
}

.book-title {
  margin: 0 0 8px;
  color: #111827;
  font-size: 21px;
  font-weight: 900;
  line-height: 1.35;
}

.book-author,
.book-meta {
  margin: 0 0 6px;
  color: #008e68;
  font-size: 13px;
  font-weight: 600;
}

.book-description {
  margin: 8px 0 10px;
  color: #374151;
  font-size: 13px;
  line-height: 1.7;
  line-clamp: 4;
  -webkit-line-clamp: 4;
}

.access-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 10px;
  align-items: center;
  width: fit-content;
  min-width: 210px;
  margin: 4px 0 12px;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

.access-card strong {
  margin: 0;
  color: #00a96b;
  font-size: 16px;
}

.access-card p {
  grid-column: 1 / -1;
  margin: 0;
  color: #6b7280;
  font-size: 12px;
}

.access-badge {
  border: 1px solid #00a96b;
  border-radius: 999px;
  background: #ffffff !important;
  color: #009b72 !important;
  font-size: 12px;
  padding: 5px 12px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 16px;
}

.btn,
.small-btn,
.subscribe-link {
  border-radius: 999px;
  min-height: 34px;
  padding: 0 16px;
  font-size: 13px;
}

.btn:hover,
.small-btn:hover,
.subscribe-link:hover {
  box-shadow: 0 8px 16px rgba(0, 169, 107, 0.16);
}

.reader-btn,
.btn.primary,
.library-btn {
  width: auto;
  background: #00b36b;
  color: #ffffff;
}

.wishlist-btn,
.cart-btn,
.buy-now-btn,
.coin-btn,
.subscribe-btn {
  width: auto;
  border: 1px solid #00a96b;
  background: #ffffff;
  color: #008e68;
}

.tts-panel {
  grid-column: 1 / -1;
  margin-top: 20px;
  border-top: 1px solid #e5e7eb;
  padding-top: 18px;
}

.tts-panel h3 {
  color: #111827;
  font-size: 17px;
}

.content-header {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-bottom: 26px;
  background: #e50914;
  color: #ffffff;
  padding: 12px max(16px, calc((100vw - 720px) / 2));
}

.content-header h2 {
  font-size: 15px;
  font-weight: 900;
}

.top-right-actions {
  display: none;
}

.reader-box,
.episode-list {
  background: #ffffff;
  border: 0;
  border-radius: 0;
  padding: 0;
  min-height: auto;
  max-height: none;
  overflow: visible;
}

.sentence {
  display: inline;
  border-radius: 3px;
  color: #374151;
  font-size: 15px;
  line-height: 2;
}

.sentence.active {
  background: #fff3b0;
}

.episode-list {
  gap: 12px;
}

.episode-item {
  border: 1px solid #e5e7eb;
  border-radius: 0;
  background: #ffffff;
  padding: 14px 16px;
}

.episode-item strong {
  color: #111827;
  font-size: 14px;
}

.episode-item p {
  font-size: 12px;
}

.preview-notice {
  border-radius: 0;
}

.preview-footer {
  justify-content: flex-start;
  border-top: 1px solid #e5e7eb;
  margin-top: 28px;
  padding-top: 18px;
}

@media (max-width: 760px) {
  .book-sidebar {
    grid-template-columns: 1fr;
  }

  .cover-box {
    grid-row: auto;
    justify-self: center;
    margin-bottom: 18px;
  }

  .book-title,
  .book-author,
  .book-meta,
  .book-description {
    text-align: center;
  }

  .access-card,
  .quick-actions {
    justify-content: center;
    margin-inline: auto;
  }
}

/* ReadAWrite-inspired story detail layout */
.book-detail-page {
  background: #f4f5f5;
  color: #202324;
  padding: 0 0 72px;
}

.container {
  max-width: none;
}

.story-hero {
  background:
    linear-gradient(90deg, rgba(9, 15, 14, 0.96), rgba(14, 22, 20, 0.92)),
    radial-gradient(circle at 20% 20%, rgba(85, 198, 189, 0.22), transparent 30%);
  color: #ffffff;
}

.story-hero__inner {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 38px;
  width: min(100% - 40px, 1180px);
  min-height: 380px;
  margin: 0 auto;
  padding: 44px 0 34px;
}

.story-cover {
  width: 330px;
  height: 330px;
  margin: 0;
  overflow: hidden;
  background: #111827;
}

.story-cover img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.story-main {
  align-self: center;
}

.story-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.story-tags span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border-radius: 999px;
  background: rgba(85, 198, 189, 0.18);
  color: #9ff0e7;
  font-size: 13px;
  font-weight: 900;
  padding: 0 12px;
}

.story-main h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(30px, 4vw, 48px);
  font-weight: 900;
  line-height: 1.12;
}

.story-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 14px 0 0;
  color: rgba(255, 255, 255, 0.88);
  font-weight: 800;
}

.story-author button {
  min-height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 999px;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  padding: 0 14px;
}

.story-description {
  max-width: 720px;
  margin: 18px 0 0;
  color: rgba(255, 255, 255, 0.86);
  font-size: 15px;
  line-height: 1.8;
}

.story-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 28px;
  color: rgba(255, 255, 255, 0.74);
  font-size: 13px;
  font-weight: 800;
}

.story-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

.icon-action,
.outline-action,
.primary-action,
.section-heading button,
.episode-buy {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
  min-height: 40px;
  padding: 0 22px;
}

.icon-action {
  width: 44px;
  border: 1px solid rgba(255, 255, 255, 0.38);
  background: transparent;
  color: #ffffff;
  padding: 0;
}

.outline-action {
  border: 1px solid rgba(85, 198, 189, 0.7);
  background: rgba(255, 255, 255, 0.04);
  color: #b8fff7;
}

.primary-action {
  min-width: 138px;
  background: #55c6bd;
  color: #ffffff;
}

.story-content-shell {
  width: min(100% - 40px, 960px);
  margin: 0 auto;
}

.story-section {
  background: #ffffff;
  border: 1px solid #e8ecec;
  margin-top: 18px;
  padding: 28px 34px;
}

.story-section h2 {
  margin: 0 0 20px;
  color: #202324;
  font-size: 28px;
  font-weight: 900;
}

.character-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 28px;
}

.character-list article {
  display: grid;
  justify-items: center;
  gap: 8px;
}

.character-list span {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: #dff7f4;
  color: #118478;
  font-size: 28px;
  font-weight: 900;
}

.character-list strong {
  color: #384044;
  font-size: 14px;
}

.note-section {
  text-align: center;
}

.note-section p {
  max-width: 720px;
  margin: 0 auto;
  color: #3c4448;
  font-size: 16px;
  line-height: 1.9;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
}

.info-grid dl {
  display: grid;
  gap: 14px;
  margin: 0;
}

.info-grid dl div {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
}

.info-grid dt {
  color: #5c686c;
  font-weight: 900;
}

.info-grid dd {
  margin: 0;
  color: #202324;
  font-weight: 800;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.section-heading h2 {
  margin: 0;
}

.section-heading button,
.episode-buy {
  background: #55c6bd;
  color: #ffffff;
}

.episode-table {
  border-top: 1px solid #e6ecec;
}

.episode-row {
  display: grid;
  grid-template-columns: 56px minmax(180px, 1fr) 130px minmax(150px, 210px) 120px;
  gap: 12px;
  align-items: center;
  min-height: 54px;
  border-bottom: 1px solid #e6ecec;
}

.episode-number,
.episode-meta {
  color: #667477;
  font-size: 13px;
  font-weight: 800;
}

.episode-title {
  border: 0;
  background: transparent;
  color: #202324;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
  padding: 0;
  text-align: left;
}

.episode-title:hover {
  color: #118478;
}

.episode-buy {
  justify-self: end;
  min-height: 32px;
  padding: 0 14px;
}

.ebook-preview-section .reader-box {
  max-height: 360px;
  overflow: hidden;
  background: #fbfbfb;
}

.sticker-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 26px;
}

.reviews-section {
  border-top: 0;
}

.review-form {
  border-radius: 8px;
  background: #fbfbfb;
}

.review-item {
  border: 1px solid #e8ecec;
  border-radius: 8px;
  margin-top: 12px;
  padding: 16px;
}

@media (max-width: 900px) {
  .story-hero__inner {
    grid-template-columns: 150px 1fr;
    gap: 18px;
    width: min(100% - 28px, 760px);
    min-height: 0;
    padding: 28px 0;
  }

  .story-cover {
    width: 150px;
    height: 210px;
  }

  .story-content-shell {
    width: min(100% - 24px, 760px);
  }

  .story-section {
    padding: 22px 18px;
  }

  .info-grid,
  .episode-row {
    grid-template-columns: 1fr;
  }

  .episode-row {
    gap: 6px;
    padding: 12px 0;
  }

  .episode-buy {
    justify-self: start;
  }
}

@media (max-width: 560px) {
  .story-hero__inner {
    grid-template-columns: 1fr;
  }

  .story-cover {
    width: 180px;
    height: 240px;
  }

  .story-main h1 {
    font-size: 28px;
  }

  .story-actions {
    display: grid;
    grid-template-columns: 44px 1fr 1fr;
  }

  .outline-action,
  .primary-action {
    padding: 0 12px;
  }
}
</style>
