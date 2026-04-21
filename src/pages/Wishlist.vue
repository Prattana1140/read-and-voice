<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api, { API_BASE_URL } from "../utils/api";

type WishlistItem = {
  id: number;
  title: string;
  author?: string;
  cover?: string;
  cover_image?: string;
};

const router = useRouter();
const wishlist = ref<WishlistItem[]>([]);
const loading = ref(false);
const errorMessage = ref("");

function coverUrl(item: WishlistItem) {
  const cover = item.cover || item.cover_image || "";
  if (!cover) return "/no-cover.png";
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;
  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
}

async function loadWishlist() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/wishlist");
    wishlist.value = Array.isArray(data) ? data : [];
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดรายการที่อยากได้ไม่สำเร็จ";
    wishlist.value = JSON.parse(localStorage.getItem("wishlist") || "[]");
  } finally {
    loading.value = false;
  }
}

async function removeItem(id: number) {
  try {
    await api.delete(`/wishlist/${id}`);
    wishlist.value = wishlist.value.filter((book) => Number(book.id) !== Number(id));
    localStorage.setItem("wishlist", JSON.stringify(wishlist.value));
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "ลบรายการที่อยากได้ไม่สำเร็จ";
  }
}

onMounted(loadWishlist);
</script>

<template>
  <main class="wishlist-page">
    <h1>รายการที่อยากได้</h1>

    <div v-if="loading" class="state-box">กำลังโหลดข้อมูล...</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
    <div v-else-if="!wishlist.length" class="state-box">ยังไม่มีรายการ</div>

    <section v-else class="grid">
      <article v-for="item in wishlist" :key="item.id" class="book-card">
        <img :src="coverUrl(item)" :alt="item.title" class="cover" />
        <h3>{{ item.title }}</h3>
        <p>{{ item.author || "ไม่ระบุผู้แต่ง" }}</p>

        <div class="actions">
          <button type="button" @click="router.push(`/book/${item.id}`)">ดู</button>
          <button type="button" class="danger" @click="removeItem(item.id)">ลบ</button>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.wishlist-page {
  min-height: 70vh;
  background: var(--bg);
  color: var(--text-strong);
  padding: 32px;
}

.wishlist-page h1 {
  margin: 0 0 20px;
  text-align: center;
}

.state-box {
  width: min(720px, 100%);
  margin: 0 auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-muted);
  padding: 18px;
}

.state-box.error {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 18px;
  width: min(100%, 960px);
  margin: 0 auto;
}

.book-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 10px;
  transition:
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.book-card:hover {
  box-shadow: 0 12px 24px rgba(15, 118, 110, 0.12);
  transform: translateY(-3px);
}

.cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}

.book-card h3 {
  margin: 10px 0 4px;
  font-size: 16px;
}

.book-card p {
  color: var(--text-muted);
  margin: 0 0 10px;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  flex: 1;
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: #20b8ad;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
}

.actions button.danger {
  background: #ef4444;
}
</style>
