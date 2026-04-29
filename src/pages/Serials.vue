<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";

type Book = {
  id: number;
  title: string;
  author?: string;
  cover_url?: string;
  cover_image?: string;
  description?: string;
};

type Episode = {
  id: number;
  title: string;
  episode_number?: number;
  access_type?: string;
  price?: number;
};

type ShelfResponse = {
  books: Book[];
};

const router = useRouter();
const books = ref<Book[]>([]);
const episodes = ref<Episode[]>([]);
const loading = ref(true);

const mainStory = computed(() => books.value[0] || null);
const episodePreview = computed(() =>
  episodes.value.map((episode) => ({
    id: episode.id,
    title: `ตอนที่ ${episode.episode_number || episode.id} ${episode.title}`,
    meta:
      episode.access_type === "free"
        ? "อ่านฟรี"
        : episode.access_type === "subscription"
          ? "สมาชิกอ่านได้"
          : `${Number(episode.price || 0)} คอยน์`,
  })),
);

const getBookCover = (book: Book) =>
  resolveAssetUrl(book.cover_url || book.cover_image);

const goToBook = (id: number) => {
  router.push({ name: "BookDetail", params: { id } });
};

async function loadEpisodes(bookId?: number | null) {
  if (!bookId) {
    episodes.value = [];
    return;
  }

  try {
    const { data } = await api.get(`/books/${bookId}/episodes`);
    episodes.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("โหลดรายการตอนไม่สำเร็จ", error);
    episodes.value = [];
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get<ShelfResponse>("/serials");
    books.value = Array.isArray(data?.books) ? data.books : [];
  } catch (error) {
    console.error("โหลดนิยายรายตอนไม่สำเร็จ", error);
    books.value = [];
  } finally {
    loading.value = false;
  }
});

watch(
  mainStory,
  (book) => {
    void loadEpisodes(book?.id);
  },
  { immediate: true },
);
</script>

<template>
  <main class="serial-page">
    <section v-if="mainStory" class="serial-hero">
      <div class="hero-inner">
        <img :src="getBookCover(mainStory)" :alt="mainStory.title" />

        <div class="hero-copy">
          <p>Read and Voice รายตอน</p>
          <h1>{{ mainStory.title }}</h1>
          <span>โดย {{ mainStory.author || "Read and Voice" }}</span>

          <div class="hero-actions">
            <button type="button" @click="goToBook(mainStory.id)">อ่านเรื่องนี้</button>
            <button type="button" class="ghost" @click="goToBook(mainStory.id)">
              ดูรายละเอียด
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="serial-hero empty">
      <div class="hero-inner">
        <div class="hero-copy">
          <p>Read and Voice รายตอน</p>
          <h1>{{ loading ? "กำลังโหลดรายตอน..." : "ยังไม่มีรายตอน" }}</h1>
          <span>เมื่อมีหนังสือรายตอนในระบบ รายการจะแสดงที่หน้านี้</span>
        </div>
      </div>
    </section>

    <section class="story-body">
      <h2>แนะนำเรื่อง</h2>
      <img
        v-if="mainStory"
        class="story-cover"
        :src="getBookCover(mainStory)"
        :alt="mainStory.title"
      />
      <p>
        {{
          mainStory?.description ||
          "พื้นที่นี้ใช้แสดงคำโปรยและข้อมูลสรุปของนิยายรายตอนจากระบบหลังบ้านโดยตรง"
        }}
      </p>
    </section>

    <section class="episode-list">
      <h2>รายการตอน</h2>
      <button
        v-for="episode in episodePreview"
        :key="episode.id"
        type="button"
        @click="mainStory && goToBook(mainStory.id)"
      >
        <span>{{ episode.title }}</span>
        <small>{{ episode.meta }}</small>
      </button>
      <p v-if="!episodePreview.length && !loading" class="episode-empty">
        เรื่องนี้ยังไม่มีตอนที่เผยแพร่
      </p>
    </section>
  </main>
</template>

<style scoped>
.serial-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text-strong);
  padding-bottom: 72px;
}

.serial-hero {
  background: #050505;
  color: #ffffff;
}

.hero-inner {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 24px;
  align-items: center;
  width: min(100% - calc(var(--page-gutter, 16px) * 2), 680px);
  min-height: 250px;
  margin: 0 auto;
  padding: 28px 0;
}

.serial-hero.empty .hero-inner {
  grid-template-columns: minmax(0, 1fr);
}

.hero-inner img {
  width: 180px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}

.hero-copy p,
.hero-copy h1,
.hero-copy span {
  margin: 0;
}

.hero-copy p {
  color: #2dd4bf;
  font-weight: 900;
}

.hero-copy h1 {
  margin-top: 10px;
  font-size: 32px;
}

.hero-copy span {
  display: block;
  margin-top: 8px;
  color: #d1d5db;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
}

.hero-actions button {
  min-height: 38px;
  border: 0;
  border-radius: 999px;
  background: #20c7b4;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  padding: 0 22px;
}

.hero-actions button.ghost {
  background: var(--surface);
  color: var(--text-strong);
}

.story-body,
.episode-list {
  width: min(100% - calc(var(--page-gutter, 16px) * 2), 620px);
  margin: 34px auto 0;
  background: var(--surface);
  padding: 24px;
}

.story-body {
  text-align: center;
}

.story-body h2,
.episode-list h2 {
  margin: 0 0 18px;
}

.story-cover {
  width: 190px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}

.story-body p {
  color: #374151;
  line-height: 2;
}

.episode-list {
  display: grid;
  gap: 10px;
}

.episode-list button {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  min-height: 50px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-strong);
  cursor: pointer;
  padding: 0 14px;
  text-align: left;
  transition:
    border-color 0.18s ease,
    transform 0.18s ease;
}

.episode-list button:hover {
  border-color: #20c7b4;
  transform: translateY(-2px);
}

.episode-list button:active {
  transform: translateY(0) scale(0.99);
}

.episode-list span {
  font-weight: 900;
}

.episode-list small {
  color: #0f766e;
  font-weight: 900;
}

.episode-empty {
  margin: 0;
  color: var(--text-muted);
}

@media (max-width: 680px) {
  .hero-inner {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-inner img {
    justify-self: center;
  }

  .hero-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .hero-actions button {
    flex: 1 1 150px;
  }

  .story-body,
  .episode-list {
    padding: 18px 14px;
  }

  .episode-list button {
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    padding: 12px 14px;
  }
}
</style>
