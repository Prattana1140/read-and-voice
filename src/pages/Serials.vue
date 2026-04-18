<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api, { API_BASE_URL } from "../utils/api";

type Book = {
  id: number;
  title: string;
  author?: string;
  cover_url?: string;
  cover_image?: string;
  description?: string;
};

const router = useRouter();
const books = ref<Book[]>([]);
const loading = ref(true);

const mainStory = computed(() => books.value[0] || null);
const episodePreview = computed(() => {
  const title = mainStory.value?.title || "รายตอน";
  return Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    title: `${title} ตอนที่ ${index + 1}`,
    meta: index < 3 ? "อ่านฟรี" : "ใช้ coin / VIP",
  }));
});

const getBookCover = (book: Book) => {
  const cover = book.cover_url || book.cover_image;
  if (!cover) return "/no-cover.png";
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;
  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
};

const goToBook = (id: number) => {
  router.push({ name: "BookDetail", params: { id } });
};

onMounted(async () => {
  try {
    const { data } = await api.get("/books");
    books.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
});
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
          <span>เมื่อเพิ่มหนังสือรายตอนในระบบแล้ว รายการจะแสดงที่หน้านี้</span>
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
          "พื้นที่สำหรับคำโปรย เรื่องย่อ และข้อมูลสำคัญของนิยายรายตอน ผู้ดูแลระบบสามารถต่อยอดให้เชื่อมกับข้อมูลตอนจริงจาก backend ได้"
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
    </section>
  </main>
</template>

<style scoped>
.serial-page {
  min-height: 100vh;
  background: #f4f4f4;
  color: #111827;
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
  width: min(100% - 32px, 680px);
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
  background: #ffffff;
  color: #111827;
}

.story-body,
.episode-list {
  width: min(100% - 32px, 620px);
  margin: 34px auto 0;
  background: #ffffff;
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
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #111827;
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
  }
}
</style>
