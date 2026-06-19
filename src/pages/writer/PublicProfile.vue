<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../../utils/api";
import { getUser } from "../../utils/auth";

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
  description?: string;
  cover_image?: string;
  category_name?: string;
  content_type?: string;
  access_type?: string;
  price?: number;
  is_pinned?: boolean;
};

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const errorMessage = ref("");
const profile = ref<WriterProfile | null>(null);
const featuredBook = ref<WriterBook | null>(null);
const books = ref<WriterBook[]>([]);
const followingId = ref<number | null>(null);
const isFollowingWriter = ref(false);
const followBusy = ref(false);

const pageSlug = computed(() => String(route.params.slug || ""));
const currentUserId = computed(() => Number(getUser()?.id || 0));
const isOwnProfile = computed(() => {
  return Number(profile.value?.user_id || 0) > 0 && Number(profile.value?.user_id || 0) === currentUserId.value;
});
const avatarPreview = computed(() => (profile.value?.avatar_url ? resolveAssetUrl(profile.value.avatar_url) : ""));
const bannerPreview = computed(() => (profile.value?.banner_url ? resolveAssetUrl(profile.value.banner_url) : ""));
const socialLinks = computed(() => {
  if (!profile.value) return [];

  return [
    { label: "X", url: profile.value.x_url },
  ].filter((item) => item.url);
});

function getBookCover(cover?: string) {
  return resolveAssetUrl(cover || "");
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
    featuredBook.value = data?.featured_book || null;
    books.value = Array.isArray(data?.books) ? data.books : [];
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
      return;
    }

    const { data } = await api.post("/account/following", payload);
    isFollowingWriter.value = true;
    followingId.value = Number(data?.id || 0) || null;
    if (profile.value) {
      profile.value.follower_count = Number(profile.value.follower_count || 0) + 1;
    }
  } catch {
    // keep current state
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
      <section class="writer-hero">
        <div class="hero-banner">
          <img v-if="bannerPreview" :src="bannerPreview" alt="แบนเนอร์นักเขียน" />
        </div>

        <div class="hero-card">
          <div class="avatar-block">
            <img v-if="avatarPreview" :src="avatarPreview" alt="รูปโปรไฟล์นักเขียน" class="avatar-image" />
            <div v-else class="avatar-fallback">{{ profile.pen_name.slice(0, 1).toUpperCase() }}</div>
          </div>

          <div class="hero-copy">
            <p class="eyebrow">Writer Page</p>
            <h1>{{ profile.pen_name }}</h1>
            <p class="tagline">{{ profile.tagline || "นักเขียนคนนี้ยังไม่ได้ใส่ tagline" }}</p>
            <div class="stats-row">
              <span>{{ profile.follower_count }} ผู้ติดตาม</span>
              <span>{{ profile.book_count }} เรื่องที่เผยแพร่</span>
              <span>{{ profile.total_words.toLocaleString() }} คำ</span>
            </div>
          </div>

          <div v-if="!isOwnProfile" class="hero-actions">
            <button type="button" :disabled="followBusy" @click="toggleFollow">
              {{ followBusy ? "กำลังอัปเดต..." : isFollowingWriter ? "ติดตามแล้ว" : "ติดตามนักเขียน" }}
            </button>
          </div>
        </div>
      </section>

      <section class="content-grid">
        <article class="panel bio-panel">
          <h2>เกี่ยวกับนักเขียน</h2>
          <p>{{ profile.bio || "ยังไม่มีข้อความแนะนำตัวจากนักเขียนคนนี้" }}</p>

          <div v-if="socialLinks.length" class="social-row">
            <a v-for="item in socialLinks" :key="item.label" :href="item.url" target="_blank" rel="noreferrer">
              {{ item.label }}
            </a>
          </div>
        </article>

        <article v-if="featuredBook" class="panel featured-panel">
          <p class="eyebrow">Featured Work</p>
          <div class="featured-card">
            <img :src="getBookCover(featuredBook.cover_image)" :alt="featuredBook.title" />
            <div>
              <h2>{{ featuredBook.title }}</h2>
              <p>{{ featuredBook.description || "ผลงานเด่นจากหน้านักเขียน" }}</p>
              <button type="button" @click="router.push(`/book/${featuredBook.id}`)">ดูรายละเอียดเรื่องนี้</button>
            </div>
          </div>
        </article>

        <article class="panel books-panel">
          <div class="panel-head">
            <h2>ผลงานทั้งหมด</h2>
            <span>{{ books.length }} เรื่อง</span>
          </div>

          <div v-if="!books.length" class="empty-box">ยังไม่มีผลงานที่เผยแพร่</div>

          <div v-else class="book-grid">
            <article v-for="book in books" :key="book.id" class="book-card" @click="router.push(`/book/${book.id}`)">
              <img :src="getBookCover(book.cover_image)" :alt="book.title" />
              <div>
                <strong>{{ book.title }}</strong>
                <p>{{ book.category_name || "นิยาย" }} | {{ book.content_type === "serial" ? "รายตอน" : "อีบุ๊ก" }}</p>
                <small>
                  {{
                    book.access_type === "subscription"
                      ? "อ่านได้ด้วยแพ็กเกจ"
                      : Number(book.price || 0) > 0
                        ? `${book.price} คอยน์`
                        : "อ่านฟรี"
                  }}
                </small>
              </div>
            </article>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.writer-public-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 var(--page-gutter, 20px) 56px;
}

.state-box,
.panel,
.hero-card {
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.state-box {
  margin-top: 24px;
  padding: 20px;
}

.error {
  color: #dc2626;
}

.writer-hero {
  margin-top: 24px;
}

.hero-banner {
  min-height: 220px;
  border-radius: 28px;
  background: linear-gradient(135deg, #10302e, #1e645d);
  overflow: hidden;
}

.hero-banner img {
  width: 100%;
  height: 220px;
  display: block;
  object-fit: cover;
}

.hero-card {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  margin-top: -54px;
  margin-inline: 24px;
  padding: 24px;
}

.avatar-block {
  display: grid;
  place-items: center;
}

.avatar-image,
.avatar-fallback {
  width: 108px;
  height: 108px;
  border-radius: 34px;
}

.avatar-image {
  object-fit: cover;
  border: 4px solid #fff;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #00a878, #20b8ad);
  color: #fff;
  font-size: 34px;
  font-weight: 900;
  border: 4px solid #fff;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
strong {
  color: var(--text-strong);
}

h1 {
  margin: 0;
  font-size: clamp(24px, 3.6vw, 34px);
}

.tagline,
.bio-panel p,
.featured-card p,
.book-card p,
.book-card small {
  color: var(--text-muted);
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.stats-row span {
  border-radius: 999px;
  background: #e8faf6;
  color: #0f766e;
  font-size: 13px;
  font-weight: 900;
  padding: 8px 12px;
}

button {
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 18px;
}

.content-grid {
  display: grid;
  gap: 18px;
  margin-top: 22px;
}

.panel {
  padding: 24px;
}

.social-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.social-row a {
  border-radius: 999px;
  background: #eefbf7;
  color: #0f766e;
  font-weight: 900;
  padding: 8px 12px;
  text-decoration: none;
}

.featured-card {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.featured-card img,
.book-card img {
  width: 100%;
  object-fit: cover;
  background: #edf1f1;
}

.featured-card img {
  height: 196px;
  border-radius: 16px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.book-card {
  display: grid;
  gap: 12px;
  cursor: pointer;
}

.book-card img {
  height: 240px;
  border-radius: 18px;
}

.book-card strong,
.book-card p,
.book-card small {
  display: block;
}

.empty-box {
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .hero-card,
  .featured-card,
  .book-grid {
    grid-template-columns: 1fr;
  }

  .hero-card {
    margin-inline: 0;
    margin-top: 16px;
    justify-items: start;
    padding: 20px;
  }

  .hero-card button,
  .featured-card button {
    width: 100%;
  }

  .panel {
    padding: 18px;
  }

  .book-card img {
    height: auto;
    aspect-ratio: 3 / 4;
  }
}
</style>
