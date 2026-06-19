<template>
  <div class="book-detail-page">
    <div class="container">
      <p class="sr-status" aria-live="polite">{{ statusMessage }}</p>

      <div v-if="loading" class="state-box">กำลังโหลดข้อมูลหนังสือ...</div>

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
                <span>
                  {{
                    book.content_type === "serial"
                      ? `${episodes.length || book.episode_count || 0} ตอน`
                      : "แบบเล่ม"
                  }}
                </span>
                <span>{{ accessPresentation.label }}</span>
              </div>

              <h1>{{ book.title }}</h1>

              <p class="story-author">
                <button
                  type="button"
                  class="author-link"
                  :disabled="!getWriterPagePath()"
                  @click="
                    getWriterPagePath() && router.push(getWriterPagePath())
                  "
                >
                  {{ book.author || "ไม่ระบุผู้เขียน" }}
                </button>

                <button type="button" @click="toggleWriterFollow">
                  {{ isFollowingWriter ? "ติดตามแล้ว" : "ติดตาม" }}
                </button>
              </p>

              <p class="story-description">
                {{ book.description || "ยังไม่มีคำโปรยสำหรับเรื่องนี้" }}
              </p>

              <div class="story-stats">
                <span
                  >♡
                  {{ reviewSummary.review_count || reviews.length || 0 }}
                  คนที่กดหัวใจ</span
                >
                <span>👁 {{ displayReadCount }} คนอ่าน</span>
                <span
                  >☰
                  {{ episodes.length || book.episode_count || 1 }}
                  จำนวนตอน</span
                >
                <span>💬 {{ reviews.length }} ความคิดเห็น</span>
              </div>

              <div class="story-actions">
                <button
                  class="icon-action"
                  type="button"
                  @click="addToWishlist"
                >
                  ♡
                </button>
                <button
                  class="outline-action"
                  type="button"
                  @click="addToLibrary"
                >
                  เพิ่มเข้าชั้น
                </button>
                <button
                  class="primary-action"
                  type="button"
                  @click="handleReadAction"
                >
                  {{ canReadImmediately ? "อ่านเลย" : "ทดลองอ่าน" }}
                </button>
                <button
                  class="outline-action"
                  type="button"
                  @click="handleListenAction"
                >
                  อ่านให้ฟัง
                </button>

                <button
                  v-if="heroDecision === 'purchase'"
                  class="primary-action"
                  type="button"
                  :disabled="purchasingBook"
                  @click="purchaseBookNow('read')"
                >
                  {{
                    purchasingBook
                      ? "กำลังซื้อ..."
                      : `ซื้อ ${formatCoinAmount(book.price)} คอยน์`
                  }}
                </button>

                <button
                  v-if="heroDecision === 'subscribe'"
                  class="primary-action"
                  type="button"
                  @click="handleReadAction"
                >
                  {{ subscriptionActionLabel }}
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
            <p>
              {{ book.description || "เรื่องนี้ยังไม่มีคำแนะนำจากผู้เขียน" }}
            </p>
            <p v-if="previewNotice" class="preview-notice">
              {{ previewNotice }}
            </p>
          </section>

          <section
            v-if="book.content_type !== 'serial'"
            class="story-section info-grid"
          >
            <div>
              <h2>ข้อมูลนักเขียน</h2>
              <dl>
                <div>
                  <dt>นามปากกา</dt>
                  <dd>
                    <button
                      type="button"
                      class="author-link inline-author-link"
                      :disabled="!getWriterPagePath()"
                      @click="
                        getWriterPagePath() && router.push(getWriterPagePath())
                      "
                    >
                      {{ book.author || "ไม่ระบุ" }}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>นักเขียน</dt>
                  <dd>
                    <button
                      type="button"
                      class="author-link inline-author-link"
                      :disabled="!getWriterPagePath()"
                      @click="
                        getWriterPagePath() && router.push(getWriterPagePath())
                      "
                    >
                      {{ book.author || "ไม่ระบุ" }}
                    </button>
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h2>เผยแพร่</h2>
              <dl>
                <div>
                  <dt>ราคา/สิทธิ์อ่าน</dt>
                  <dd>{{ accessPresentation.priceLabel }}</dd>
                </div>
                <div>
                  <dt>รูปแบบ</dt>
                  <dd>แบบเล่ม</dd>
                </div>
              </dl>
            </div>
          </section>

          <section v-else class="story-section serial-prelude-section">
            <div class="serial-prelude-grid">
              <div class="serial-prelude-card">
                <h2>ข้อมูลนักเขียน</h2>
                <dl>
                  <div>
                    <dt>นามปากกา</dt>
                    <dd>
                      <span>{{ book.author || "ไม่ระบุ" }}</span>
                      <button
                        type="button"
                        class="follow-chip"
                        @click="toggleWriterFollow"
                      >
                        {{ isFollowingWriter ? "ติดตามแล้ว" : "ติดตาม" }}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>นักเขียน</dt>
                    <dd>
                      <span>{{ book.author || "ไม่ระบุ" }}</span>
                      <button
                        type="button"
                        class="follow-chip"
                        @click="toggleWriterFollow"
                      >
                        {{ isFollowingWriter ? "ติดตามแล้ว" : "ติดตาม" }}
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>

              <div class="serial-prelude-card">
                <h2>เผยแพร่</h2>
                <dl>
                  <div>
                    <dt>วันที่เผยแพร่</dt>
                    <dd>{{ formatPublishDate(book.created_at) }}</dd>
                  </div>
                  <div>
                    <dt>แก้ไขล่าสุด</dt>
                    <dd>
                      {{
                        formatPublishDate(book.updated_at || book.created_at)
                      }}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div class="ebook-promo-card">
              <div class="ebook-promo-cover">
                <img
                  :src="bookCover"
                  :alt="book.title"
                  @error="handleImgError"
                />
              </div>

              <div class="ebook-promo-copy">
                <p class="ebook-promo-eyebrow">ซื้อ e-book ได้ที่นี่</p>
                <h3>{{ book.title }}</h3>
                <p>
                  {{
                    book.description ||
                    "อ่านแบบอีบุ๊กหรือเก็บเข้าคลังเพื่อกลับมาอ่านต่อเมื่อสะดวก"
                  }}
                </p>

                <div class="ebook-promo-actions">
                  <button
                    v-if="heroDecision === 'purchase'"
                    class="primary-action"
                    type="button"
                    :disabled="purchasingBook"
                    @click="purchaseBookNow('read')"
                  >
                    {{
                      purchasingBook
                        ? "กำลังซื้อ..."
                        : `ซื้อเลย ${book.price || 0} คอยน์`
                    }}
                  </button>

                  <button
                    v-else-if="heroDecision === 'subscribe'"
                    class="primary-action"
                    type="button"
                    @click="handleReadAction"
                  >
                    {{ subscriptionActionLabel }}
                  </button>

                  <button
                    v-else
                    class="primary-action"
                    type="button"
                    @click="handleReadAction"
                  >
                    ทดลองอ่าน
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section
            v-if="book.content_type === 'serial'"
            class="story-section episode-table-section"
          >
            <div class="section-heading">
              <h2>ตอนทั้งหมด ({{ episodes.length }})</h2>

              <div class="episode-table-tools">
                <button
                  v-if="book.access_type === 'paid'"
                  type="button"
                  :disabled="buyingBook"
                  @click="addBookToCart(book.id)"
                >
                  {{ buyingBook ? "กำลังเพิ่ม..." : "ซื้อทุกตอน" }}
                </button>

                <button
                  type="button"
                  class="ghost-sort-btn"
                  @click="toggleEpisodeSort"
                >
                  {{ episodeSortLabel }}
                </button>
              </div>
            </div>

            <div class="episode-table">
              <article
                v-for="episode in displayedEpisodes"
                :key="episode.id"
                class="episode-row"
              >
                <span class="episode-number"
                  >#{{ episode.episode_number }}</span
                >

                <div class="episode-title-wrap">
                  <button
                    type="button"
                    class="episode-title"
                    @click="handleEpisodeReadAction(episode)"
                  >
                    {{ episode.title }}
                  </button>
                  <span class="episode-access">{{
                    getEpisodeAccessLabel(episode)
                  }}</span>
                </div>

                <span class="episode-meta episode-meta-stack">
                  <strong>{{ formatEpisodeWords(episode) }}</strong>
                  <small>{{ estimateEpisodePages(episode) }}</small>
                </span>

                <span class="episode-meta episode-meta-stack">
                  <strong>{{ formatPublishDate(episode.created_at) }}</strong>
                  <small>{{ formatPublishTime(episode.created_at) }}</small>
                </span>

                <span class="episode-meta episode-stat">
                  💬 {{ formatCompactCount(episode.comment_count) }}
                </span>

                <span class="episode-meta episode-stat">
                  👁
                  {{
                    formatCompactCount(episode.read_count || episode.view_count)
                  }}
                </span>

                <button
                  v-if="getEpisodePrimaryAction(episode) === 'purchase'"
                  class="episode-buy"
                  type="button"
                  :aria-label="
                    purchasingEpisodeId === episode.id
                      ? 'กำลังซื้อ'
                      : getEpisodeActionLabel(episode)
                  "
                  :disabled="purchasingEpisodeId === episode.id"
                  @click="purchaseEpisodeNow(episode)"
                >
                  {{
                    purchasingEpisodeId === episode.id
                      ? "กำลังซื้อ..."
                      : getEpisodeActionLabel(episode)
                  }}
                </button>

                <button
                  v-else-if="getEpisodePrimaryAction(episode) === 'subscribe'"
                  class="episode-buy"
                  type="button"
                  @click="router.push('/subscription-plans')"
                >
                  {{ getEpisodeActionLabel(episode) }}
                </button>

                <button
                  v-else
                  class="episode-buy"
                  :class="{ 'episode-buy--read': isEpisodeRead(episode) }"
                  type="button"
                  @click="handleEpisodeReadAction(episode)"
                >
                  {{ getEpisodeActionLabel(episode) }}
                </button>
              </article>

              <div v-if="!episodes.length" class="empty-content">
                ยังไม่มีตอนที่เผยแพร่
              </div>
            </div>
          </section>

          <section v-else class="story-section ebook-preview-section">
            <div class="section-heading">
              <h2>ตัวอย่างเนื้อหา</h2>
            </div>

            <div
              class="reader-box"
              :style="{ fontSize: fontSize + 'px', lineHeight: '1.9' }"
            >
              <p
                v-for="(paragraph, index) in previewParagraphs"
                :key="index"
                class="preview-paragraph"
              >
                {{ paragraph }}
              </p>

              <div v-if="!previewParagraphs.length" class="empty-content">
                ไม่พบเนื้อหาตัวอย่าง
              </div>
            </div>
          </section>

          <section class="story-section reviews-section">
            <div class="reviews-head">
              <div>
                <p class="reviews-eyebrow">
                  ความคิดเห็น ({{ reviews.length }})
                </p>
                <h3>{{ reviewSummaryText }}</h3>
              </div>

              <button
                v-if="!showReviewForm"
                class="small-btn"
                type="button"
                @click="startNewReview"
              >
                เขียนความคิดเห็น
              </button>
            </div>

            <form
              v-if="showReviewForm"
              class="review-form"
              @submit.prevent="submitReview"
            >
              <div class="sticker-row">
                <span
                  v-for="item in [
                    '🌸',
                    '💚',
                    '❤️',
                    '✨',
                    '📚',
                    '😊',
                    '🔥',
                    '🌙',
                  ]"
                  :key="item"
                >
                  {{ item }}
                </span>
              </div>

              <label>
                <span>คะแนน</span>
                <select v-model.number="reviewRating">
                  <option
                    v-for="score in [5, 4, 3, 2, 1]"
                    :key="score"
                    :value="score"
                  >
                    {{ score }} ดาว
                  </option>
                </select>
              </label>

              <label>
                <span>ความคิดเห็น</span>
                <textarea
                  v-model="reviewComment"
                  rows="4"
                  placeholder="เขียนความคิดเห็นของคุณ"
                />
              </label>

              <div class="review-actions">
                <button
                  class="btn primary"
                  type="submit"
                  :disabled="reviewSaving"
                >
                  {{
                    reviewSaving
                      ? "กำลังบันทึก..."
                      : editingReviewId
                        ? "บันทึกการแก้ไข"
                        : "ส่งความคิดเห็น"
                  }}
                </button>
                <button class="btn" type="button" @click="cancelReviewForm">
                  ยกเลิก
                </button>
              </div>
            </form>

            <p v-if="reviewError" class="review-error">{{ reviewError }}</p>

            <div v-if="reviewsLoading" class="review-state">
              กำลังโหลดความคิดเห็น...
            </div>
            <div v-else-if="reviews.length === 0" class="review-state">
              ยังไม่มีความคิดเห็น เป็นคนแรกที่คุยกับเรื่องนี้ได้เลย
            </div>

            <article
              v-for="review in reviews"
              :key="review.id"
              class="review-item"
            >
              <div class="review-meta">
                <strong>{{ review.user_name }}</strong>
                <span
                  >{{ "★".repeat(review.rating)
                  }}{{ "☆".repeat(5 - review.rating) }}</span
                >
              </div>

              <p>{{ review.comment }}</p>

              <div class="review-footer">
                <span>{{ formatReviewDate(review.created_at) }}</span>

                <div
                  v-if="review.can_edit || review.can_delete"
                  class="review-manage"
                >
                  <button
                    v-if="review.can_edit"
                    type="button"
                    @click="editReview(review)"
                  >
                    แก้ไข
                  </button>
                  <button
                    v-if="review.can_delete"
                    type="button"
                    @click="deleteReview(review.id)"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </article>
          </section>
        </main>
      </template>

      <div
        v-if="purchaseDialogMode"
        class="purchase-modal-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="
          purchaseDialogMode === 'confirm' ? 'ยืนยันการซื้อตอน' : 'ซื้อสำเร็จ'
        "
      >
        <section class="purchase-modal">
          <div
            v-if="purchaseDialogMode === 'confirm'"
            class="purchase-modal-icon"
          >
            <span class="coin-icon" aria-hidden="true"></span>
          </div>
          <div
            v-else
            class="purchase-modal-icon purchase-modal-icon--success"
            aria-hidden="true"
          >
            ✓
          </div>

          <h2>
            {{
              purchaseDialogMode === "confirm" ? "ซื้อตอนนี้" : "ซื้อสำเร็จแล้ว"
            }}
          </h2>

          <p class="purchase-modal-title">
            {{ pendingPurchaseEpisode?.title || purchasedEpisode?.title }}
          </p>

          <p
            v-if="purchaseDialogMode === 'confirm'"
            class="purchase-modal-price"
          >
            ชำระ {{ formatCoinAmount(pendingPurchaseEpisode?.price) }} คอยน์
          </p>

          <p v-else class="purchase-modal-price">
            ยอดคงเหลือ {{ formatCoinAmount(purchaseSuccessBalance) }} คอยน์
          </p>

          <p v-if="purchaseDialogError" class="purchase-modal-error">
            {{ purchaseDialogError }}
          </p>

          <div class="purchase-modal-actions">
            <button
              v-if="purchaseDialogNeedsTopup"
              class="purchase-confirm-btn"
              type="button"
              @click="goToCoinWallet"
            >
              เติมคอยน์
            </button>

            <button
              v-else-if="purchaseDialogMode === 'confirm'"
              class="purchase-confirm-btn"
              type="button"
              :disabled="purchasingEpisodeId === pendingPurchaseEpisode?.id"
              @click="confirmEpisodePurchase"
            >
              {{
                purchasingEpisodeId === pendingPurchaseEpisode?.id
                  ? "กำลังซื้อ..."
                  : "ยืนยันซื้อ"
              }}
            </button>

            <button
              v-else
              class="purchase-confirm-btn"
              type="button"
              @click="readPurchasedEpisode"
            >
              อ่านเลย
            </button>

            <button
              class="purchase-cancel-btn"
              type="button"
              @click="closePurchaseDialog"
            >
              ยกเลิก
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { API_BASE_URL } from "../utils/api";
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { getAuthHeaders, getUser } from "../utils/auth";
import api from "../utils/api";
import { announceAccessibilityMessage } from "../utils/accessibility";
import {
  canOpenBookNow,
  getBookAccessPresentation,
  getBookHeroDecision,
  normalizeBookAccessType,
} from "../utils/bookAccess";

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
  author_id?: number;
  created_by?: number;
  writer_page_slug?: string;
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
  has_read?: boolean | number;
  can_read?: boolean | number;
  has_access?: boolean | number;
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

const PREVIEW_LIMIT = 12;

const route = useRoute();
const router = useRouter();
const isAuthenticated = computed(() => Boolean(localStorage.getItem("token")));

const book = ref<Book | null>(null);
const episodes = ref<Episode[]>([]);
const loading = ref(true);
const error = ref("");
const statusMessage = ref("");
const previewNotice = ref("");
const followingId = ref<number | null>(null);
const isFollowingWriter = ref(false);
const episodeSortOrder = ref<"asc" | "desc">("asc");

const fontSize = ref(22);
const rate = ref(1);
const pitch = ref(1);
const volume = ref(1);

const voices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoice = ref("");

const sentences = ref<string[]>([]);
const currentIndex = ref(0);

const isSpeaking = ref(false);
const isPaused = ref(false);

const subscriptionInfo = ref<any>(null);
const buyingBook = ref(false);
const purchasingBook = ref(false);
const purchasingEpisodeId = ref<number | null>(null);
const purchaseDialogMode = ref<"" | "confirm" | "success">("");
const pendingPurchaseEpisode = ref<Episode | null>(null);
const purchasedEpisode = ref<Episode | null>(null);
const purchaseSuccessBalance = ref<number | null>(null);
const purchaseDialogError = ref("");
const purchaseDialogNeedsTopup = ref(false);

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

const notifyBookStatus = (message: string) => {
  statusMessage.value = message;
  announceAccessibilityMessage(message);
};

const alert = (message?: string) => {
  if (message) notifyBookStatus(String(message));
};

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

const readEpisodesKey = computed(() => {
  return book.value ? `read-voice-read-episodes-${book.value.id}` : "";
});

const handleImgError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
};

const isEpisodeFree = (episode: Episode) => {
  return (
    Number(episode.is_free) === 1 ||
    episode.access_type === "free" ||
    Number(episode.price) <= 0
  );
};

const isEpisodePaid = (episode: Episode) => {
  return (
    episode.access_type === "paid" ||
    (!isEpisodeFree(episode) && episode.access_type !== "subscription")
  );
};

const getStoredReadEpisodeIds = () => {
  if (!readEpisodesKey.value) return new Set<number>();

  try {
    const raw = localStorage.getItem(readEpisodesKey.value);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [],
    );
  } catch {
    return new Set<number>();
  }
};

const hasStoredReadEpisode = (episode: Episode) => {
  return getStoredReadEpisodeIds().has(Number(episode.id));
};

const canOpenEpisodeNow = (episode: Episode) => {
  return (
    isEpisodeFree(episode) ||
    Boolean(episode.can_read) ||
    Boolean(episode.has_access) ||
    Boolean(episode.has_read) ||
    (episode.access_type === "subscription" && hasActiveSubscription.value)
  );
};

const isEpisodeRead = (episode: Episode) => {
  return (
    Boolean(episode.has_read) ||
    (canOpenEpisodeNow(episode) && hasStoredReadEpisode(episode))
  );
};

const markEpisodeRead = (episode: Episode) => {
  episode.has_read = true;
  if (!readEpisodesKey.value) return;

  const ids = getStoredReadEpisodeIds();
  ids.add(Number(episode.id));
  localStorage.setItem(readEpisodesKey.value, JSON.stringify([...ids]));
};

const getEpisodePrimaryAction = (episode: Episode) => {
  if (episode.access_type === "subscription" && !hasActiveSubscription.value) {
    return "subscribe";
  }

  if (isEpisodePaid(episode) && !isEpisodeRead(episode)) {
    return "purchase";
  }

  return "read";
};

const getEpisodeAccessLabel = (episode: Episode) => {
  if (episode.access_type === "subscription") {
    return "อ่านได้ด้วยแพ็กเกจรายเดือน";
  }

  if (isEpisodeFree(episode)) {
    return "อ่านฟรี";
  }

  return `ใช้ ${episode.price || 0} คอยน์`;
};

const getEpisodeActionLabel = (episode: Episode) => {
  const action = getEpisodePrimaryAction(episode);

  if (action === "subscribe") {
    return "อ่านด้วยแพ็กเกจ";
  }

  if (action === "purchase") {
    return `ซื้อ ${formatCoinAmount(episode.price)} คอยน์`;
  }

  return isEpisodeRead(episode) ? "อ่านแล้ว" : "อ่านเลย";
};

const getWriterFollowPayload = () => {
  if (!book.value) return null;

  const targetId = Number(book.value.author_id || book.value.created_by || 0);
  const targetName = String(book.value.author || "นักเขียน").trim();

  if (!targetName) return null;

  return {
    target_type: "writer",
    target_id: targetId > 0 ? targetId : null,
    target_name: targetName,
  };
};

const getWriterPagePath = () => {
  if (!book.value) return "";

  const slug = String(book.value.writer_page_slug || "").trim();
  if (slug) return `/writers/${slug}`;

  const targetId = Number(book.value.author_id || book.value.created_by || 0);
  return targetId > 0 ? `/writers/user-${targetId}` : "";
};

const bookAccessType = computed(() => {
  return normalizeBookAccessType(book.value?.access_type);
});

const hasActiveSubscription = computed(() => {
  return Boolean(subscriptionInfo.value?.isActive);
});

const accessPresentation = computed(() => {
  return getBookAccessPresentation({
    accessType: bookAccessType.value,
    price: book.value?.price,
    hasActiveSubscription: hasActiveSubscription.value,
  });
});

const subscriptionActionLabel = computed(() => {
  return hasActiveSubscription.value ? "อ่านเลย" : "อ่านด้วยแพ็กเกจ";
});

const heroDecision = computed(() => {
  return getBookHeroDecision({
    accessType: bookAccessType.value,
    hasActiveSubscription: hasActiveSubscription.value,
  });
});

const canReadImmediately = computed(() => {
  return canOpenBookNow({
    accessType: bookAccessType.value,
    hasActiveSubscription: hasActiveSubscription.value,
  });
});

const reviewSummaryText = computed(() => {
  const count = reviewSummary.value.review_count;
  const average = Number(reviewSummary.value.average_rating || 0);

  if (!count) return "ยังไม่มีคะแนน";

  return `${average.toFixed(1)} / 5 จาก ${count} รีวิว`;
});

const previewParagraphs = computed(() => {
  if (!sentences.value.length) return [];

  return sentences.value
    .join(" ")
    .replace(/<PARA>/g, "\n\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
});

const displayedEpisodes = computed(() => {
  const list = [...episodes.value];
  list.sort((left, right) => {
    if (episodeSortOrder.value === "asc") {
      return (
        Number(left.episode_number || 0) - Number(right.episode_number || 0)
      );
    }

    return Number(right.episode_number || 0) - Number(left.episode_number || 0);
  });

  return list;
});

const firstEpisode = computed(() => {
  return displayedEpisodes.value[0] ?? episodes.value[0] ?? null;
});

const episodeSortLabel = computed(() => {
  return episodeSortOrder.value === "asc" ? "เก่าไปใหม่" : "ใหม่ไปเก่า";
});

const displayReadCount = computed(() => {
  const count = Number(book.value?.read_count || book.value?.view_count || 0);
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
});

const formatCoinAmount = (value?: number | null) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.ceil(amount).toLocaleString() : "0";
};

const getInitial = (value: string) => {
  return (
    String(value || "R")
      .trim()
      .charAt(0)
      .toUpperCase() || "R"
  );
};

const formatCompactCount = (value: number | string | undefined) => {
  const count = Number(value || 0);
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toLocaleString();
};

const formatEpisodeWords = (episode: Episode) => {
  const words = Number(episode.word_count || 0);
  if (!words) return "พร้อมอ่าน";
  return `${words.toLocaleString()} คำ`;
};

const estimateEpisodePages = (episode: Episode) => {
  const words = Number(episode.word_count || 0);
  if (!words) return "ไม่ระบุหน้า";
  const pages = Math.max(1, Math.round(words / 230));
  return `ประมาณ ${pages} หน้า`;
};

const formatPublishDate = (value?: string) => {
  if (!value) return "ไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatPublishTime = (value?: string) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
};

const toggleEpisodeSort = () => {
  episodeSortOrder.value = episodeSortOrder.value === "asc" ? "desc" : "asc";
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
    can_edit: review.can_edit ?? canEditReview(review),
    can_delete: review.can_delete ?? canDeleteReview(review),
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
      return s.match(/.{1,180}([,:]\s*|$)/g)?.map((x) => x.trim()) || [s];
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

    if (
      !Number.isNaN(parsed) &&
      parsed >= 0 &&
      parsed < sentences.value.length
    ) {
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

  if (!isAuthenticated.value) return;

  api
    .put("/account/preferences", {
      preferences: {
        reader: {
          font_size: fontSize.value,
        },
        tts: {
          rate: rate.value,
          pitch: pitch.value,
          volume: volume.value,
          voice: selectedVoice.value,
        },
      },
    })
    .catch(() => {});
};

const loadPreviewSettings = async () => {
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

  if (!isAuthenticated.value) return;

  try {
    const { data } = await api.get("/account/preferences");
    const reader = data?.preferences?.reader || {};
    const tts = data?.preferences?.tts || {};

    if (Number.isFinite(Number(reader.font_size)))
      fontSize.value = Number(reader.font_size);
    if (Number.isFinite(Number(tts.rate))) rate.value = Number(tts.rate);
    if (Number.isFinite(Number(tts.pitch))) pitch.value = Number(tts.pitch);
    if (Number.isFinite(Number(tts.volume))) volume.value = Number(tts.volume);
    if (typeof tts.voice === "string") selectedVoice.value = tts.voice;
  } catch {}
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

const fetchBook = async () => {
  loading.value = true;
  error.value = "";
  previewNotice.value = "";

  try {
    const id = Number(route.params.id);

    const bookRes = await axios.get(`${API_BASE_URL}/api/books/${id}`);
    book.value = bookRes.data;
    fetchReviews();

    if (book.value?.content_type === "serial") {
      const episodeRes = await axios.get(
        `${API_BASE_URL}/api/books/${id}/episodes`,
        {
          headers: getAuthHeaders(),
        },
      );
      episodes.value = Array.isArray(episodeRes.data) ? episodeRes.data : [];
      sentences.value = [];
      return;
    }

    const contentRes = await axios.get(
      `${API_BASE_URL}/api/books/${id}/content`,
      {
        headers: getAuthHeaders(),
      },
    );

    const rawData = contentRes.data;

    if (Array.isArray(rawData)) {
      const fullText = rawData.map((p: any) => p.content || "").join(" ");
      const hasPreview = rawData.some((p: any) => p.is_preview);

      if (hasPreview) {
        previewNotice.value =
          "ขณะนี้แสดงเฉพาะตัวอย่างเนื้อหา หากต้องการอ่านเต็มเล่มให้เข้าสู่ระบบหรือซื้อก่อน";
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

const loadWriterFollowStatus = async () => {
  try {
    const user = getUser();
    const followPayload = getWriterFollowPayload();

    followingId.value = null;
    isFollowingWriter.value = false;

    if (!user || !followPayload) return;

    const { data } = await api.get("/account/following");
    const items = Array.isArray(data?.items) ? data.items : [];
    const matched = items.find((item: any) => {
      if (String(item?.target_type) !== "writer") return false;
      if (
        followPayload.target_id &&
        Number(item?.target_id) === Number(followPayload.target_id)
      ) {
        return true;
      }
      return (
        String(item?.target_name || "").trim() === followPayload.target_name
      );
    });

    if (matched) {
      followingId.value = Number(matched.id);
      isFollowingWriter.value = true;
    }
  } catch {
    followingId.value = null;
    isFollowingWriter.value = false;
  }
};

const fetchReviews = async () => {
  if (!book.value?.id) return;

  reviewsLoading.value = true;
  reviewError.value = "";

  try {
    const { data } = await api.get(`/books/${book.value.id}/reviews`);
    const items = Array.isArray(data?.items) ? data.items : [];
    reviews.value = items.map((item: BookReview) => normalizeReview(item));
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

const openReaderPage = () => {
  if (!book.value) return;
  stopSpeech();

  router.push({
    name: "ReaderPage",
    params: { id: book.value.id },
  });
};

const openListenPage = (episode?: Episode | null) => {
  if (!book.value) return;
  stopSpeech();

  const query = episode ? { episode: String(episode.id) } : undefined;

  router.push({
    name: "ReaderListenPage",
    params: { id: book.value.id },
    query,
  });
};

const openEpisodeReader = (episode: Episode) => {
  if (!book.value) return;

  if (!canOpenEpisodeNow(episode)) {
    handleEpisodeReadAction(episode);
    return;
  }

  stopSpeech();
  markEpisodeRead(episode);

  router.push({
    name: "ReaderPage",
    params: { id: book.value.id },
    query: { episode: String(episode.id) },
  });
};

const handleEpisodeReadAction = (episode: Episode) => {
  const action = getEpisodePrimaryAction(episode);

  if (action === "subscribe") {
    router.push("/subscription-plans");
    return;
  }

  if (action === "purchase") {
    purchaseEpisodeNow(episode);
    return;
  }

  openEpisodeReader(episode);
};

const getPrimaryEpisode = () => {
  return book.value?.content_type === "serial" ? firstEpisode.value : null;
};

const openPrimaryReaderDestination = () => {
  const episode = getPrimaryEpisode();
  if (episode) {
    openEpisodeReader(episode);
    return;
  }

  openReaderPage();
};

const openPrimaryListenDestination = () => {
  const episode = getPrimaryEpisode();
  openListenPage(episode);
};

const handleReadAction = () => {
  if (!book.value) return;

  if (canReadImmediately.value) {
    openPrimaryReaderDestination();
    return;
  }

  if (heroDecision.value === "subscribe") {
    router.push("/subscription-plans");
    return;
  }

  purchaseBookNow("read");
};

const handleListenAction = () => {
  if (!book.value) return;

  if (canReadImmediately.value) {
    openPrimaryListenDestination();
    return;
  }

  if (heroDecision.value === "subscribe") {
    router.push("/subscription-plans");
    return;
  }

  purchaseBookNow("listen");
};

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

    const goLibrary = window.confirm(
      `${res.data.message || "เพิ่มเข้าชั้นหนังสือสำเร็จ"} ต้องการไปที่คลังหนังสือเลยไหม?`,
    );

    if (goLibrary) {
      router.push({ name: "MyLibrary" });
    }
  } catch (err: any) {
    const message =
      err?.response?.data?.message || "เพิ่มเข้าชั้นหนังสือไม่สำเร็จ";
    alert(message);

    if (
      err?.response?.status === 402 &&
      book.value?.access_type === "paid" &&
      window.confirm("ต้องการชำระด้วยคอยน์เพื่อเพิ่มหนังสือเข้าคลังไหม?")
    ) {
      purchaseBookNow("read");
    }

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

const toggleWriterFollow = async () => {
  const user = getUser();
  const followPayload = getWriterFollowPayload();

  if (!user) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    router.push({ name: "Login" });
    return;
  }

  if (!followPayload) {
    alert("ยังไม่พบข้อมูลนักเขียนสำหรับติดตาม");
    return;
  }

  try {
    if (isFollowingWriter.value && followingId.value) {
      await api.delete(`/account/following/${followingId.value}`);
      followingId.value = null;
      isFollowingWriter.value = false;
      alert("ยกเลิกติดตามนักเขียนแล้ว");
      return;
    }

    const { data } = await api.post("/account/following", followPayload);
    followingId.value = Number(data?.id || 0) || null;
    isFollowingWriter.value = true;
    alert("ติดตามนักเขียนแล้ว");
  } catch (error: any) {
    alert(error?.response?.data?.message || "อัปเดตการติดตามไม่สำเร็จ");
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

const ensureLoggedInForPurchase = () => {
  const user = getUser();
  if (user) return true;

  alert("กรุณาเข้าสู่ระบบก่อนซื้อ");
  router.push({ name: "Login" });
  return false;
};

const handlePurchaseError = (error: any) => {
  if (error?.response?.status === 402) {
    alert(error?.response?.data?.message || "คอยน์ไม่พอ กรุณาเติมคอยน์ก่อน");
    router.push("/coin-wallet");
    return;
  }

  alert(error?.response?.data?.message || "ซื้อไม่สำเร็จ");
};

const goToCoinWallet = () => {
  closePurchaseDialog();
  router.push({ name: "CoinWallet" });
};

const purchaseBookNow = async (target: "read" | "listen" = "read") => {
  if (!book.value || purchasingBook.value) return;
  if (!ensureLoggedInForPurchase()) return;

  purchasingBook.value = true;

  try {
    await api.post("/orders/purchase", {
      book_id: book.value.id,
      payment_method: "coin",
    });

    const goLibrary = window.confirm(
      "ซื้อสำเร็จ หนังสือถูกเพิ่มเข้าคลังแล้ว ต้องการไปที่คลังหนังสือเลยไหม?",
    );

    if (goLibrary) {
      router.push({ name: "MyLibrary" });
      return;
    }

    if (target === "listen") {
      alert("ซื้อสำเร็จ กำลังเปิดโหมดอ่านให้ฟัง");
      openPrimaryListenDestination();
      return;
    }

    alert("ซื้อสำเร็จ กำลังเปิดหน้าอ่าน");
    openPrimaryReaderDestination();
  } catch (error: any) {
    handlePurchaseError(error);
  } finally {
    purchasingBook.value = false;
  }
};

const closePurchaseDialog = () => {
  if (purchasingEpisodeId.value) return;
  purchaseDialogMode.value = "";
  pendingPurchaseEpisode.value = null;
  purchaseDialogError.value = "";
  purchaseDialogNeedsTopup.value = false;
};

const readPurchasedEpisode = () => {
  const episode = purchasedEpisode.value || pendingPurchaseEpisode.value;
  closePurchaseDialog();
  if (episode) {
    openEpisodeReader(episode);
  }
};

const purchaseEpisodeNow = async (episode: Episode, confirmed = false) => {
  if (!confirmed) {
    if (!ensureLoggedInForPurchase()) return;
    pendingPurchaseEpisode.value = episode;
    purchasedEpisode.value = null;
    purchaseSuccessBalance.value = null;
    purchaseDialogError.value = "";
    purchaseDialogNeedsTopup.value = false;
    purchaseDialogMode.value = "confirm";
    return;
  }

  if (purchasingEpisodeId.value) return;
  if (!ensureLoggedInForPurchase()) return;

  purchasingEpisodeId.value = episode.id;
  purchaseDialogError.value = "";
  purchaseDialogNeedsTopup.value = false;

  try {
    const { data } = await api.post("/orders/purchase", {
      episode_id: episode.id,
      payment_method: "coin",
    });

    episode.can_read = true;
    purchasedEpisode.value = episode;
    purchaseSuccessBalance.value =
      data?.balance === null || data?.balance === undefined
        ? null
        : Number(data.balance);
    purchaseDialogMode.value = "success";
  } catch (error: any) {
    if (error?.response?.status === 402) {
      purchaseDialogError.value =
        error?.response?.data?.message || "คอยน์ไม่พอ กรุณาเติมคอยน์ก่อน";
      purchaseDialogNeedsTopup.value = true;
      purchaseSuccessBalance.value = Number(
        error?.response?.data?.balance || 0,
      );
      return;
    }

    purchaseDialogNeedsTopup.value = false;
    purchaseDialogError.value =
      error?.response?.data?.message || "ซื้อไม่สำเร็จ";
  } finally {
    purchasingEpisodeId.value = null;
  }
};

const confirmEpisodePurchase = () => {
  if (!pendingPurchaseEpisode.value) return;
  purchaseEpisodeNow(pendingPurchaseEpisode.value, true);
};

watch([fontSize, rate, pitch, volume, selectedVoice], () => {
  savePreviewSettings();
});

watch(error, (message) => {
  if (message) announceAccessibilityMessage(message);
});

watch(reviewError, (message) => {
  if (message) announceAccessibilityMessage(message);
});

onMounted(async () => {
  await loadPreviewSettings();
  await fetchBook();
  await loadSubscriptionStatus();
  await loadWriterFollowStatus();
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
.sr-status {
  min-height: 24px;
  margin: 0 0 8px;
  color: #0f766e;
  font-weight: 700;
}

.book-detail-page {
  background: #f4f5f5;
  color: #202324;
  min-height: 100vh;
  padding: 0 0 72px;
}

.container {
  max-width: none;
  margin: 0 auto;
}

.state-box {
  width: min(100% - 32px, 960px);
  margin: 24px auto 0;
  background: var(--surface);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.state-box.error {
  color: #b00020;
}

.story-hero {
  background:
    linear-gradient(90deg, rgba(9, 15, 14, 0.96), rgba(14, 22, 20, 0.92)),
    radial-gradient(
      circle at 20% 20%,
      rgba(85, 198, 189, 0.22),
      transparent 30%
    );
  color: #ffffff;
}

.story-hero__inner {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 38px;
  width: min(100% - calc(var(--page-gutter, 20px) * 2), 1180px);
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
  font-size: clamp(24px, 3.2vw, 36px);
  font-weight: 900;
  line-height: 1.12;
}

.story-author {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
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

.story-author .author-link {
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 0;
  min-height: auto;
  padding: 0;
}

.story-author .author-link:disabled {
  opacity: 0.72;
  cursor: default;
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
  width: min(100% - calc(var(--page-gutter, 20px) * 2), 960px);
  margin: 0 auto;
}

.story-section {
  background: var(--surface);
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

.serial-prelude-section {
  display: grid;
  gap: 28px;
}

.serial-prelude-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
}

.serial-prelude-card h2 {
  margin-bottom: 18px;
}

.serial-prelude-card dl,
.info-grid dl {
  display: grid;
  gap: 14px;
  margin: 0;
}

.serial-prelude-card dl div,
.info-grid dl div {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
}

.serial-prelude-card dt,
.info-grid dt {
  color: #5c686c;
  font-weight: 900;
}

.serial-prelude-card dd,
.info-grid dd {
  margin: 0;
  color: #202324;
  font-weight: 800;
}

.serial-prelude-card dd {
  display: flex;
  align-items: center;
  gap: 12px;
}

.follow-chip {
  min-height: 38px;
  border: 1px solid #c8d1d2;
  border-radius: 999px;
  background: #ffffff;
  color: #202324;
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

.ebook-promo-card {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 22px;
  align-items: center;
  border-top: 1px solid #eef2f2;
  padding-top: 8px;
}

.ebook-promo-cover {
  width: 128px;
  height: 182px;
  overflow: hidden;
  border-radius: 12px;
  background: #edf1f1;
}

.ebook-promo-cover img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.ebook-promo-eyebrow {
  margin: 0 0 8px;
  color: #202324;
  font-size: 22px;
  font-weight: 900;
}

.ebook-promo-copy h3 {
  margin: 0;
  color: #202324;
  font-size: 22px;
  font-weight: 900;
}

.ebook-promo-copy p:last-of-type {
  margin: 10px 0 0;
  color: #4a5458;
  line-height: 1.8;
}

.ebook-promo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.inline-author-link {
  min-height: auto;
  border: 0;
  background: transparent;
  color: #118478;
  cursor: pointer;
  font-weight: 900;
  padding: 0;
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

.episode-table-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.section-heading button,
.episode-buy {
  background: #55c6bd;
  color: #ffffff;
}

.ghost-sort-btn {
  border: 0;
  background: transparent !important;
  color: #118478 !important;
  font-weight: 900;
  min-height: auto;
  padding: 0 !important;
}

.episode-table {
  border-top: 1px solid #e6ecec;
  min-width: 0;
  overflow-x: clip;
}

.episode-row {
  display: grid;
  grid-template-columns:
    56px
    minmax(0, 1.7fr)
    minmax(86px, 0.65fr)
    minmax(98px, 0.75fr)
    minmax(54px, 0.45fr)
    minmax(54px, 0.45fr)
    minmax(92px, auto);
  gap: 12px;
  align-items: center;
  min-height: 72px;
  border-bottom: 1px solid #e6ecec;
  min-width: 0;
}

.episode-number,
.episode-meta {
  color: #667477;
  font-size: 13px;
  font-weight: 800;
}

.episode-number {
  color: #18a699;
  font-size: 24px;
}

.episode-title-wrap {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.episode-title {
  border: 0;
  background: transparent;
  color: #202324;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  padding: 0;
  text-align: left;
}

.episode-title:hover {
  color: #118478;
}

.episode-access {
  color: #647174;
  font-size: 12px;
  font-weight: 800;
}

.episode-meta-stack {
  display: grid;
  gap: 2px;
}

.episode-meta-stack strong,
.episode-stat {
  color: #505b5f;
  font-size: 13px;
  font-weight: 900;
}

.episode-meta-stack small {
  color: #7a878b;
  font-size: 12px;
  font-weight: 700;
}

.episode-buy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  justify-self: end;
  max-width: 100%;
  min-height: 32px;
  padding: 0 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.episode-buy--read {
  background: #9aa3a6;
  color: #ffffff;
}

.reader-box {
  background: #fbfbfb;
  border: 1px solid #ececf3;
  border-radius: 16px;
  padding: 24px;
  min-height: auto;
  max-height: none;
  overflow: visible;
}

.preview-paragraph {
  margin: 0 0 1.15em;
  color: #374151;
  font-size: 15px;
  line-height: 1.95;
}

.preview-paragraph:last-child {
  margin-bottom: 0;
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

.empty-content {
  margin-top: 20px;
  color: #777;
}

.reviews-section {
  border-top: 0;
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
  color: var(--text-strong);
  font-size: 18px;
  margin: 0;
}

.review-form {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fbfbfb;
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
  border: 1px solid #e8ecec;
  border-radius: 8px;
  margin-top: 12px;
  padding: 16px;
}

.review-meta,
.review-footer {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.review-meta strong {
  color: var(--text-strong);
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

.sticker-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 26px;
}

.coin-icon {
  position: relative;
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 34% 28%, #fff7b2 0 12%, transparent 13%),
    radial-gradient(
      circle at 50% 50%,
      #ffd957 0 44%,
      #f6b51f 45% 68%,
      #c77700 69% 100%
    );
  border: 2px solid #ffe886;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.7),
    inset 0 -3px 0 rgba(130, 75, 0, 0.28),
    0 2px 4px rgba(86, 54, 0, 0.24);
}

.coin-icon::after {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 2px solid rgba(130, 76, 0, 0.5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.purchase-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.48);
}

.purchase-modal {
  width: min(100%, 390px);
  background: #ffffff;
  border: 1px solid #dfe7e8;
  border-radius: 16px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.26);
  padding: 26px 22px 22px;
  text-align: center;
}

.purchase-modal-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin: 0 auto 14px;
  border-radius: 999px;
  background: #e8fbf8;
}

.purchase-modal-icon .coin-icon {
  width: 32px;
  height: 32px;
}

.purchase-modal-icon--success {
  background: #22c55e;
  color: #ffffff;
  font-size: 30px;
  font-weight: 900;
}

.purchase-modal h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 22px;
  font-weight: 900;
}

.purchase-modal-title {
  margin: 0;
  color: #334155;
  font-size: 15px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.purchase-modal-price {
  margin: 12px 0 0;
  color: #0f766e;
  font-size: 18px;
  font-weight: 900;
}

.purchase-modal-error {
  margin: 14px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff1f2;
  color: #be123c;
  font-size: 13px;
  font-weight: 800;
}

.purchase-modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 20px;
}

.purchase-confirm-btn,
.purchase-cancel-btn {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
  min-height: 42px;
  padding: 0 14px;
}

.purchase-confirm-btn {
  background: #55c6bd;
  color: #ffffff;
}

.purchase-confirm-btn:disabled {
  cursor: wait;
  opacity: 0.72;
}

.purchase-cancel-btn {
  background: #eef2f3;
  color: #475569;
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
  .serial-prelude-grid,
  .episode-row {
    grid-template-columns: 1fr;
  }

  .ebook-promo-card {
    grid-template-columns: 96px 1fr;
  }

  .episode-row {
    gap: 6px;
    min-width: 0;
    padding: 12px 0;
  }

  .episode-buy {
    justify-self: start;
  }
}

@media (max-width: 560px) {
  .story-hero__inner {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .story-cover {
    width: 180px;
    height: 240px;
  }

  .story-main {
    width: 100%;
  }

  .story-main h1 {
    font-size: 28px;
  }

  .story-author,
  .story-stats,
  .story-actions {
    justify-content: center;
  }

  .story-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
    width: 100%;
  }

  .icon-action {
    width: 100%;
  }

  .serial-prelude-card dd,
  .ebook-promo-card {
    align-items: start;
  }

  .ebook-promo-card {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .serial-prelude-card dl div,
  .info-grid dl div {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .outline-action,
  .primary-action {
    padding: 0 12px;
  }

  .story-section {
    padding: 20px 14px;
  }

  .episode-table {
    width: 100%;
    overflow-x: hidden;
  }

  .episode-row {
    box-sizing: border-box;
    width: 100%;
    padding: 12px 10px;
  }

  .episode-title,
  .episode-title-wrap,
  .episode-meta,
  .episode-stat {
    min-width: 0;
    max-width: 100%;
  }

  .episode-buy {
    justify-self: end;
    width: fit-content;
    min-height: 38px;
    margin-top: 4px;
    padding: 0 12px;
    white-space: nowrap;
    line-height: 1.25;
    text-align: center;
  }
}

@media (max-width: 380px) {
  .episode-row {
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 8px;
  }

  .episode-number,
  .episode-title-wrap,
  .episode-meta-stack {
    grid-column: 1 / -1;
  }

  .episode-stat {
    justify-self: start;
  }

  .episode-buy {
    justify-self: end;
    max-width: 136px;
  }
}
</style>
