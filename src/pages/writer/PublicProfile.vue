<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../../utils/api";
import { getUser } from "../../utils/auth";
import { useI18n } from "../../utils/i18n";
import { localizedTitle } from "../../utils/localizedContent";

type WriterProfile = {
  user_id: number;
  pen_name: string;
  page_slug: string;
  tagline: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  x_url: string;
  follower_count: number;
  book_count: number;
  total_words: number;
};

type WriterBook = {
  id: number;
  title: string;
  title_th?: string;
  title_en?: string;
  subtitle?: string;
  description?: string;
  cover_image?: string;
  category_name?: string;
  content_type?: string;
  access_type?: string;
  price?: number;
  total_words?: number;
  estimated_reading_minutes?: number;
  created_at?: string;
  updated_at?: string;
  is_pinned?: boolean;
};

type WorkTab = "works" | "penname" | "collections" | "ebook" | "reading";

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();
const loading = ref(true);
const errorMessage = ref("");
const profile = ref<WriterProfile | null>(null);
const books = ref<WriterBook[]>([]);
const followingId = ref<number | null>(null);
const isFollowingWriter = ref(false);
const followBusy = ref(false);
const activeTab = ref<WorkTab>("works");
const activeCategory = ref("all");
const isMoreMenuOpen = ref(false);
const actionMessage = ref("");

const pageSlug = computed(() => String(route.params.slug || ""));
const publicProfilePath = computed(() => `/writers/${profile.value?.page_slug || pageSlug.value}`);
const currentUserId = computed(() => Number(getUser()?.id || 0));
const isOwnProfile = computed(() => {
  return Number(profile.value?.user_id || 0) > 0 && Number(profile.value?.user_id || 0) === currentUserId.value;
});
const avatarPreview = computed(() => (profile.value?.avatar_url ? resolveAssetUrl(profile.value.avatar_url) : ""));
const bannerPreview = computed(() => (profile.value?.banner_url ? resolveAssetUrl(profile.value.banner_url) : ""));
const latestBookCover = computed(() => {
  const latestBook = [...books.value]
    .filter((book) => book.cover_image)
    .sort((first, second) => getBookTime(second) - getBookTime(first))[0];

  return getBookCover(latestBook?.cover_image);
});
const bannerImage = computed(() => bannerPreview.value || latestBookCover.value);
const socialLinks = computed(() => {
  if (!profile.value) return [];

  return [
    { label: "X", url: profile.value.x_url },
  ].filter((item) => item.url);
});

const tabs = computed(() => [
  { key: "works" as const, label: "งานเขียน", count: books.value.length },
  { key: "penname" as const, label: "นามปากกา", count: profile.value ? 1 : 0 },
  { key: "collections" as const, label: "คอลเลคชั่น", count: collectionGroups.value.length },
  { key: "ebook" as const, label: "อีบุ๊ก", count: books.value.filter((book) => book.content_type !== "serial").length },
  { key: "reading" as const, label: "รีดดิ้งไลต์", count: readingBooks.value.length },
]);

const tabBooks = computed(() => {
  if (activeTab.value === "ebook") return books.value.filter((book) => book.content_type !== "serial");
  if (activeTab.value === "reading") return readingBooks.value;

  return books.value;
});

const categoryFilters = computed(() => {
  const categories = Array.from(
    new Set(tabBooks.value.map((book) => String(book.category_name || "").trim()).filter(Boolean)),
  );

  return [
    { key: "all", label: "ทั้งหมด", count: tabBooks.value.length },
    ...categories.map((category) => ({
      key: category,
      label: category,
      count: tabBooks.value.filter((book) => book.category_name === category).length,
    })),
  ];
});

const visibleBooks = computed(() => {
  if (activeCategory.value === "all") return tabBooks.value;
  return tabBooks.value.filter((book) => book.category_name === activeCategory.value);
});

const collectionGroups = computed(() => {
  const groups = new Map<string, WriterBook[]>();

  books.value.forEach((book) => {
    const category = String(book.category_name || "นิยาย").trim() || "นิยาย";
    groups.set(category, [...(groups.get(category) || []), book]);
  });

  return Array.from(groups.entries())
    .map(([name, items]) => ({
      name,
      count: items.length,
      books: items,
      cover: getBookCover(items.find((book) => book.cover_image)?.cover_image),
      words: items.reduce((sum, book) => sum + Number(book.total_words || 0), 0),
    }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name, "th"));
});

const readingBooks = computed(() => {
  return books.value
    .filter((book) => Number(book.estimated_reading_minutes || 0) > 0)
    .sort((first, second) => Number(second.estimated_reading_minutes || 0) - Number(first.estimated_reading_minutes || 0));
});

const showCategoryFilters = computed(() => ["works", "ebook", "reading"].includes(activeTab.value));

const totalReadingMinutes = computed(() =>
  books.value.reduce((sum, book) => sum + Number(book.estimated_reading_minutes || 0), 0),
);

watch(activeTab, () => {
  activeCategory.value = "all";
  isMoreMenuOpen.value = false;
});

watch(() => route.params.slug, () => {
  isMoreMenuOpen.value = false;
});

function formatCompact(value: number) {
  return Intl.NumberFormat("th-TH", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function getBookCover(cover?: string) {
  return resolveAssetUrl(cover || "");
}

function getBookTitle(book: WriterBook) {
  return localizedTitle(book, locale.value) || book.title;
}

function getBookTime(book: WriterBook) {
  const timestamp = Date.parse(String(book.updated_at || book.created_at || ""));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getBookTypeLabel(book: WriterBook) {
  return book.content_type === "serial" ? "รายตอน" : "อีบุ๊ก";
}

function getAccessLabel(book: WriterBook) {
  if (book.access_type === "subscription") return "แพ็กเกจ";
  if (Number(book.price || 0) > 0) return `${formatCompact(Number(book.price || 0))} คอยน์`;
  return "อ่านฟรี";
}

function openBook(book: WriterBook) {
  router.push(`/book/${book.id}`);
}

function showWorks() {
  activeTab.value = "works";
  activeCategory.value = "all";
  isMoreMenuOpen.value = false;
}

function setActionMessage(message: string) {
  actionMessage.value = message;
  window.setTimeout(() => {
    if (actionMessage.value === message) actionMessage.value = "";
  }, 2600);
}

function getProfileUrl() {
  const path = router.resolve(publicProfilePath.value).href;
  return `${window.location.origin}${path}`;
}

async function copyProfileLink() {
  const url = getProfileUrl();

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.setAttribute("readonly", "true");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setActionMessage("คัดลอกลิงก์หน้านักเขียนแล้ว");
  } catch {
    setActionMessage(url);
  } finally {
    isMoreMenuOpen.value = false;
  }
}

async function shareProfile() {
  const url = getProfileUrl();

  if (navigator.share && profile.value) {
    try {
      await navigator.share({
        title: profile.value.pen_name,
        text: profile.value.tagline || profile.value.bio || profile.value.pen_name,
        url,
      });
      isMoreMenuOpen.value = false;
      return;
    } catch {
      // Fall back to copying when the native share sheet is cancelled or unavailable.
    }
  }

  await copyProfileLink();
}

function goToOwnerAction(path: string) {
  isMoreMenuOpen.value = false;
  router.push(path);
}

function getFollowPayload() {
  if (!profile.value) return null;

  return {
    target_type: "writer",
    target_id: profile.value.user_id,
    target_name: profile.value.pen_name,
  };
}

async function loadFollowStatus() {
  try {
    const user = getUser();
    const followPayload = getFollowPayload();

    followingId.value = null;
    isFollowingWriter.value = false;

    if (!user || !followPayload || isOwnProfile.value) return;

    const { data } = await api.get("/account/following");
    const items = Array.isArray(data?.items) ? data.items : [];
    const matched = items.find((item: any) => {
      if (String(item?.target_type) !== "writer") return false;
      if (Number(item?.target_id || 0) === Number(followPayload.target_id || 0)) return true;
      return String(item?.target_name || "").trim() === followPayload.target_name;
    });

    if (matched) {
      followingId.value = Number(matched.id);
      isFollowingWriter.value = true;
    }
  } catch {
    followingId.value = null;
    isFollowingWriter.value = false;
  }
}

async function loadPage() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get(`/writers/${pageSlug.value}`);
    profile.value = data?.profile || null;
    books.value = Array.isArray(data?.books) ? data.books : [];
    activeTab.value = "works";
    activeCategory.value = "all";
    await loadFollowStatus();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดหน้านักเขียนไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function toggleFollow() {
  const user = getUser();
  const payload = getFollowPayload();

  if (!user) {
    router.push("/login");
    return;
  }

  if (!payload || followBusy.value || isOwnProfile.value) {
    return;
  }

  try {
    followBusy.value = true;

    if (isFollowingWriter.value && followingId.value) {
      await api.delete(`/account/following/${followingId.value}`);
      isFollowingWriter.value = false;
      followingId.value = null;
      if (profile.value) {
        profile.value.follower_count = Math.max(0, Number(profile.value.follower_count || 0) - 1);
      }
      window.dispatchEvent(new CustomEvent("read-and-voice-following-changed"));
      setActionMessage("ยกเลิกติดตามนักเขียนแล้ว");
      return;
    }

    const { data } = await api.post("/account/following", payload);
    isFollowingWriter.value = true;
    followingId.value = Number(data?.id || 0) || null;
    if (profile.value) {
      profile.value.follower_count = Number(profile.value.follower_count || 0) + 1;
    }
    window.dispatchEvent(new CustomEvent("read-and-voice-following-changed"));
    setActionMessage("ติดตามนักเขียนแล้ว");
  } catch {
    // Keep the visible state unchanged when the follow request fails.
  } finally {
    followBusy.value = false;
  }
}

onMounted(loadPage);
watch(() => route.params.slug, loadPage);
</script>

<template>
  <main class="writer-public-page">
    <div v-if="loading" class="state-box">กำลังโหลดหน้านักเขียน...</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>

    <template v-else-if="profile">
      <div v-if="actionMessage" class="state-box success">{{ actionMessage }}</div>
      <section class="writer-shell">
        <div class="writer-cover" :class="{ empty: !bannerImage }">
          <img v-if="bannerImage" class="cover-image" :src="bannerImage" alt="แบนเนอร์นักเขียน" />
          <div v-else class="cover-fallback">
            <span>นิยาย</span>
            <strong>{{ profile.pen_name }}</strong>
          </div>
        </div>

        <section class="profile-panel">
          <div class="avatar-wrap">
            <img v-if="avatarPreview" :src="avatarPreview" alt="รูปโปรไฟล์นักเขียน" class="avatar-image" />
            <div v-else class="avatar-fallback">{{ profile.pen_name.slice(0, 1).toUpperCase() }}</div>
          </div>

          <div class="profile-copy">
            <h1>{{ profile.pen_name }}</h1>
            <a v-if="socialLinks.length" class="social-link" :href="socialLinks[0].url" target="_blank" rel="noreferrer">
              {{ socialLinks[0].url }}
            </a>

            <div class="stats-line" aria-label="สถิตินักเขียน">
              <span>งานเขียน {{ formatCompact(profile.book_count) }} เรื่อง</span>
              <span>เพิ่มเข้าชั้น {{ formatCompact(totalReadingMinutes) }} ครั้ง</span>
              <span>ติดตาม {{ formatCompact(profile.follower_count) }} คน</span>
              <span>คำ {{ formatCompact(profile.total_words) }}</span>
            </div>
          </div>

          <div class="profile-actions">
            <div class="more-menu">
              <button
                type="button"
                class="round-button"
                :aria-expanded="isMoreMenuOpen"
                aria-label="เมนูเพิ่มเติม"
                @click="isMoreMenuOpen = !isMoreMenuOpen"
              >
                ...
              </button>
              <div v-if="isMoreMenuOpen" class="more-menu-panel" role="menu">
                <button type="button" role="menuitem" @click="shareProfile">แชร์หน้า</button>
                <button type="button" role="menuitem" @click="copyProfileLink">คัดลอกลิงก์</button>
                <button type="button" role="menuitem" @click="showWorks">ดูผลงานทั้งหมด</button>
                <button
                  v-if="isOwnProfile"
                  type="button"
                  role="menuitem"
                  @click="goToOwnerAction('/writer/profile')"
                >
                  แก้ไขหน้า
                </button>
                <button
                  v-if="isOwnProfile"
                  type="button"
                  role="menuitem"
                  @click="goToOwnerAction('/writer/upload')"
                >
                  เพิ่มผลงาน
                </button>
                <button
                  v-if="isOwnProfile"
                  type="button"
                  role="menuitem"
                  @click="goToOwnerAction('/writer/books')"
                >
                  จัดการผลงาน
                </button>
              </div>
            </div>
            <button v-if="isOwnProfile" type="button" class="outline-button" @click="router.push('/writer/profile')">
              แก้ไขหน้า
            </button>
            <button v-if="isOwnProfile" type="button" class="outline-button" @click="router.push('/writer/upload')">
              เพิ่มผลงาน
            </button>
            <button v-if="isOwnProfile" type="button" class="outline-button" @click="router.push('/writer/books')">
              จัดการผลงาน
            </button>
            <button v-else type="button" class="outline-button" :disabled="followBusy" @click="toggleFollow">
              {{ followBusy ? "กำลังอัปเดต..." : isFollowingWriter ? "ติดตามแล้ว" : "ติดตาม" }}
            </button>
          </div>
        </section>

        <section class="bio-panel">
          <p class="tagline">{{ profile.tagline || "นักเขียนคนนี้ยังไม่ได้ใส่ tagline" }}</p>
          <p class="bio-text">{{ profile.bio || "ยังไม่มีข้อความแนะนำตัวจากนักเขียนคนนี้" }}</p>
        </section>
      </section>

      <section class="works-shell">
        <nav class="primary-tabs" role="tablist" aria-label="หมวดผลงานนักเขียน">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.key"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </nav>

        <div v-if="showCategoryFilters" class="filter-row">
          <button
            v-for="filter in categoryFilters"
            :key="filter.key"
            type="button"
            :class="{ active: activeCategory === filter.key }"
            @click="activeCategory = filter.key"
          >
            {{ filter.label }}({{ filter.count }})
          </button>
        </div>

        <section v-if="activeTab === 'penname'" class="penname-panel">
          <div class="penname-card">
            <div class="avatar-wrap">
              <img v-if="avatarPreview" :src="avatarPreview" alt="รูปโปรไฟล์นักเขียน" class="avatar-image" />
              <div v-else class="avatar-fallback">{{ profile.pen_name.slice(0, 1).toUpperCase() }}</div>
            </div>
            <div>
              <p>นามปากกา</p>
              <h2>{{ profile.pen_name }}</h2>
              <span>{{ profile.tagline || profile.bio || "ยังไม่มีข้อความแนะนำตัวจากนักเขียนคนนี้" }}</span>
            </div>
          </div>

          <div class="penname-stats">
            <strong>{{ formatCompact(profile.book_count) }}<span>งานเขียน</span></strong>
            <strong>{{ formatCompact(profile.total_words) }}<span>คำทั้งหมด</span></strong>
            <strong>{{ formatCompact(profile.follower_count) }}<span>ผู้ติดตาม</span></strong>
          </div>
        </section>

        <section v-else-if="activeTab === 'collections'" class="collection-grid">
          <button
            v-for="collection in collectionGroups"
            :key="collection.name"
            type="button"
            class="collection-card"
            @click="activeTab = 'works'; activeCategory = collection.name"
          >
            <img v-if="collection.cover" :src="collection.cover" :alt="collection.name" />
            <span v-else>{{ collection.name.slice(0, 1).toUpperCase() }}</span>
            <strong>{{ collection.name }}</strong>
            <small>{{ collection.count }} เรื่อง · {{ formatCompact(collection.words) }} คำ</small>
          </button>

          <div v-if="!collectionGroups.length" class="empty-box">ยังไม่มีคอลเลคชั่นจากผลงาน</div>
        </section>

        <div v-else-if="!visibleBooks.length" class="empty-box">ยังไม่มีผลงานในหมวดนี้</div>

        <div v-else class="work-grid">
          <article v-for="book in visibleBooks" :key="book.id" class="work-card" @click="openBook(book)">
            <img class="work-cover" :src="getBookCover(book.cover_image)" :alt="getBookTitle(book)" />
            <div class="work-copy">
              <h2>{{ getBookTitle(book) }}</h2>
              <p>{{ book.description || book.subtitle || "ดูรายละเอียดและเริ่มอ่านเรื่องนี้" }}</p>
              <div class="work-stats">
                <span>{{ getBookTypeLabel(book) }}</span>
                <span v-if="book.total_words">{{ formatCompact(Number(book.total_words || 0)) }} คำ</span>
                <span v-if="book.estimated_reading_minutes">{{ formatCompact(Number(book.estimated_reading_minutes || 0)) }} นาที</span>
                <span>{{ getAccessLabel(book) }}</span>
              </div>
              <div class="chips">
                <small>{{ book.category_name || "นิยาย" }}</small>
                <small v-if="book.is_pinned">แนะนำ</small>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.writer-public-page {
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: 0 0 48px;
  background: #f5f6f7;
}

.state-box {
  margin: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  padding: 18px;
}

.state-box.error {
  color: #dc2626;
}

.state-box.success {
  color: #0f766e;
}

.writer-shell,
.works-shell {
  border: 1px solid #e5e7eb;
  background: #fff;
}

.writer-cover {
  height: 330px;
  overflow: hidden;
  background: #d8ddd9;
}

.cover-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.cover-fallback {
  height: 100%;
  display: grid;
  align-content: center;
  gap: 10px;
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.16) 0 45%, rgba(255, 255, 255, 0.18) 45% 55%, rgba(15, 23, 42, 0.12) 55%),
    linear-gradient(135deg, #d8ddd9, #f2f7f3);
  color: #23332f;
  padding: 42px;
}

.cover-fallback span {
  font-size: 22px;
  font-weight: 900;
}

.cover-fallback strong {
  max-width: 560px;
  font-size: clamp(40px, 8vw, 88px);
  line-height: 0.95;
}

.profile-panel {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
  min-height: 132px;
  padding: 28px 30px 16px;
}

.avatar-image,
.avatar-fallback {
  width: 72px;
  height: 72px;
  border-radius: 50%;
}

.avatar-image {
  object-fit: cover;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  background: #14b8a6;
  color: #fff;
  font-size: 30px;
  font-weight: 900;
}

.profile-copy {
  min-width: 0;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: #111827;
  font-size: 32px;
  font-weight: 900;
  line-height: 1.1;
}

.social-link {
  display: inline-block;
  max-width: min(520px, 100%);
  margin-top: 8px;
  overflow: hidden;
  color: #2563eb;
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
}

.stats-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 9px;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
}

.stats-line span::before {
  content: "•";
  color: #0f172a;
  margin-right: 5px;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.more-menu {
  position: relative;
}

.more-menu-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  display: grid;
  min-width: 190px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.14);
}

.more-menu-panel button {
  appearance: none;
  min-height: 40px;
  border: 0;
  border-bottom: 1px solid #eef2f7;
  background: #fff;
  color: #111827;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 850;
  padding: 0 14px;
  text-align: left;
}

.more-menu-panel button:last-child {
  border-bottom: 0;
}

.more-menu-panel button:hover,
.more-menu-panel button:focus-visible {
  background: #f8fafc;
}

.round-button,
.outline-button {
  appearance: none;
  min-height: 36px;
  border: 1px solid #111827;
  background: #fff;
  color: #111827;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 900;
}

.round-button {
  width: 36px;
  border-radius: 50%;
  padding: 0;
  line-height: 1;
}

.outline-button {
  border-radius: 999px;
  padding: 0 18px;
}

.outline-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.bio-panel {
  display: grid;
  place-items: center;
  min-height: 260px;
  padding: 28px 11%;
  text-align: center;
}

.tagline,
.bio-text {
  max-width: 680px;
  color: #4f46e5;
  font-size: 17px;
  font-weight: 900;
  line-height: 1.9;
}

.bio-text {
  margin-top: 16px;
}

.works-shell {
  margin-top: 14px;
}

.primary-tabs {
  display: flex;
  gap: 30px;
  overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 22px;
}

.primary-tabs button {
  appearance: none;
  position: relative;
  min-height: 52px;
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: #111827;
  cursor: pointer;
  font: inherit;
  font-size: 16px;
  font-weight: 900;
  padding: 0;
}

.primary-tabs button.active {
  color: #00a99d;
}

.primary-tabs button.active::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 999px 999px 0 0;
  background: #00c7b5;
}

.filter-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 14px 22px 8px;
}

.filter-row button {
  appearance: none;
  min-height: 32px;
  flex: 0 0 auto;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #111827;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  padding: 0 13px;
}

.filter-row button.active {
  border-color: #111827;
  background: #111827;
  color: #fff;
}

.empty-box {
  color: #64748b;
  padding: 22px;
}

.penname-panel {
  display: grid;
  gap: 18px;
  padding: 28px 34px 34px;
}

.penname-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}

.penname-card p,
.penname-card h2,
.penname-card span {
  margin: 0;
}

.penname-card p {
  color: #00a99d;
  font-size: 13px;
  font-weight: 900;
}

.penname-card h2 {
  margin-top: 3px;
  color: #111827;
  font-size: 28px;
}

.penname-card span {
  display: block;
  margin-top: 7px;
  color: #475569;
  font-size: 15px;
  font-weight: 750;
  line-height: 1.6;
}

.penname-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.penname-stats strong {
  display: grid;
  gap: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #111827;
  font-size: 22px;
  padding: 14px;
}

.penname-stats span {
  color: #64748b;
  font-size: 13px;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 24px 34px 34px;
}

.collection-card {
  appearance: none;
  display: grid;
  grid-template-rows: 120px auto auto;
  gap: 9px;
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  cursor: pointer;
  padding: 10px;
  text-align: left;
}

.collection-card img,
.collection-card > span {
  width: 100%;
  height: 120px;
  border-radius: 5px;
}

.collection-card img {
  object-fit: cover;
}

.collection-card > span {
  display: grid;
  place-items: center;
  background: #e6fffb;
  color: #0f766e;
  font-size: 32px;
  font-weight: 900;
}

.collection-card strong {
  overflow: hidden;
  color: #111827;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collection-card small {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.work-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 34px 42px;
  padding: 28px 38px 40px;
}

.work-card {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 18px;
  min-width: 0;
  cursor: pointer;
}

.work-cover {
  width: 150px;
  min-width: 150px;
  max-width: 150px;
  height: 212px;
  max-height: 212px;
  display: block;
  border-radius: 6px;
  object-fit: cover;
  object-position: center;
  background: #e5e7eb;
}

.work-copy {
  min-width: 0;
}

.work-copy h2 {
  display: -webkit-box;
  overflow: hidden;
  color: #111827;
  font-size: 17px;
  font-weight: 900;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.work-copy p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 7px;
  color: #475569;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.work-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
  font-weight: 850;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.chips small {
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #64748b;
  font-size: 13px;
  font-weight: 850;
  padding: 4px 9px;
}

@media (max-width: 760px) {
  .writer-public-page {
    width: 100%;
  }

  .writer-cover {
    height: 220px;
  }

  .profile-panel {
    grid-template-columns: 70px minmax(0, 1fr);
    padding: 18px 16px;
  }

  .profile-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  h1 {
    font-size: 26px;
  }

  .bio-panel {
    min-height: 200px;
    padding: 24px 20px;
  }

  .tagline,
  .bio-text {
    font-size: 15px;
  }

  .primary-tabs {
    gap: 22px;
    padding: 0 16px;
  }

  .work-grid {
    grid-template-columns: 1fr;
    gap: 22px;
    padding: 20px 18px 28px;
  }

  .work-card {
    grid-template-columns: 138px minmax(0, 1fr);
  }

  .work-cover {
    width: 138px;
    min-width: 138px;
    max-width: 138px;
    height: 196px;
    max-height: 196px;
  }

  .collection-grid,
  .penname-panel {
    padding: 20px 18px 28px;
  }

  .collection-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 420px) {
  .writer-cover {
    height: 170px;
  }

  .profile-panel,
  .work-card {
    grid-template-columns: 1fr;
  }

  .penname-card,
  .penname-stats,
  .collection-grid {
    grid-template-columns: 1fr;
  }

  .avatar-wrap {
    justify-self: center;
  }

  .profile-copy {
    text-align: center;
  }

  .stats-line,
  .profile-actions {
    justify-content: center;
  }

  .work-cover {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    height: auto;
    max-height: none;
    aspect-ratio: 5 / 7;
  }
}
</style>
