<script setup lang="ts">
import { API_BASE_URL } from "../../utils/api";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

type StoredUser = {
  id?: number;
  name?: string;
};

type Book = {
  id: number;
  title: string;
  author?: string;
  category_name?: string;
  cover_image?: string;
  is_published?: number;
  created_by?: number;
  total_pages?: number;
};

const router = useRouter();
const loading = ref(true);
const books = ref<Book[]>([]);

const user = computed<StoredUser>(() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
});

const myBooks = computed(() => {
  if (!user.value.id) return books.value;
  const owned = books.value.filter((book) => Number(book.created_by) === Number(user.value.id));
  return owned.length ? owned : books.value;
});

const publishedBooks = computed(() => {
  return myBooks.value.filter((book) => Number(book.is_published) === 1);
});

const draftBooks = computed(() => {
  return myBooks.value.filter((book) => Number(book.is_published) !== 1);
});

const bestBook = computed(() => {
  return publishedBooks.value[0]?.title || "ยังไม่มีข้อมูล";
});

const getCoverUrl = (cover?: string) => {
  if (!cover) return "/no-cover.png";
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;
  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
};

const fetchBooks = async () => {
  loading.value = true;

  try {
    const res = await axios.get(`${API_BASE_URL}/api/books`);
    books.value = Array.isArray(res.data) ? res.data : [];
  } finally {
    loading.value = false;
  }
};

onMounted(fetchBooks);
</script>

<template>
  <main class="writer-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">แดชบอร์ดนักเขียน</p>
        <h1>แดชบอร์ดนักเขียน</h1>
        <p>ติดตามผลงาน หนังสือที่กำลังตรวจ และหนังสือที่เผยแพร่แล้ว</p>
      </div>

      <button type="button" class="primary-btn" @click="router.push('/writer/upload')">
        อัปโหลดหนังสือใหม่
      </button>
    </section>

    <section class="stats-grid">
      <article>
        <span>หนังสือทั้งหมด</span>
        <strong>{{ myBooks.length }}</strong>
      </article>
      <article>
        <span>เผยแพร่แล้ว</span>
        <strong>{{ publishedBooks.length }}</strong>
      </article>
      <article>
        <span>ร่าง / รอตรวจ</span>
        <strong>{{ draftBooks.length }}</strong>
      </article>
      <article>
        <span>ขายดีที่สุด</span>
        <strong class="small-value">{{ bestBook }}</strong>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>หนังสือของฉัน</h2>
          <button type="button" class="link-btn view-all-action" @click="router.push('/writer/books')">
            ดูทั้งหมด
          </button>
        </div>

        <div v-if="loading" class="state-box">กำลังโหลดข้อมูล...</div>
        <div v-else-if="myBooks.length === 0" class="state-box">ยังไม่มีหนังสือในบัญชีนี้</div>

        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ปก</th>
                <th>ชื่อ</th>
                <th>หมวดหมู่</th>
                <th>สถานะ</th>
                <th>ยอดอ่าน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="book in myBooks.slice(0, 6)" :key="book.id">
                <td>
                  <img :src="getCoverUrl(book.cover_image)" :alt="book.title" />
                </td>
                <td>
                  <strong>{{ book.title }}</strong>
                  <small>{{ book.author || "ไม่ระบุผู้เขียน" }}</small>
                </td>
                <td>{{ book.category_name || "-" }}</td>
                <td>
                  <span class="badge" :class="{ active: Number(book.is_published) === 1 }">
                    {{ Number(book.is_published) === 1 ? "published" : "pending" }}
                  </span>
                </td>
                <td>{{ book.total_pages || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <aside class="panel side-panel">
        <h2>ทางลัดนักเขียน</h2>
        <button type="button" @click="router.push('/writer/upload')">อัปโหลดหนังสือ</button>
        <button type="button" @click="router.push('/writer/books')">หนังสือของฉัน</button>
        <button type="button" @click="router.push('/writer/stats')">สถิติหนังสือ</button>
        <button type="button" @click="router.push('/writer/profile')">หน้าสาธารณะนักเขียน</button>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.writer-page {
  width: min(1240px, calc(100% - calc(var(--page-gutter, 16px) * 2)));
  margin: 0 auto;
  padding: var(--page-block, 32px) 0 52px;
}

.page-header,
.panel,
.stats-grid article {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1,
h2 {
  margin: 0;
  color: var(--text-strong);
}

.page-header p:not(.eyebrow),
.stats-grid span,
small,
.state-box {
  color: var(--text-muted);
}

.primary-btn,
.link-btn,
.side-panel button {
  min-height: 40px;
  border: 1px solid #2ec4b6;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 900;
  padding: 10px 14px;
}

.primary-btn {
  background: #2ec4b6;
  color: white;
}

.link-btn,
.side-panel button {
  background: #f2fffc;
  color: #0b5f59;
}

.panel-head .view-all-action {
  min-height: 28px;
  border: 0;
  background: transparent;
  color: var(--primary-strong);
  font-size: 13px;
  padding: 2px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.stats-grid article {
  padding: 18px;
}

.stats-grid span,
.stats-grid strong {
  display: block;
}

.stats-grid strong {
  margin-top: 8px;
  color: var(--text-strong);
  font-size: 34px;
}

.small-value {
  font-size: 18px !important;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 16px;
  margin-top: 18px;
}

.panel {
  padding: 20px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid var(--border);
  padding: 12px;
  text-align: left;
  vertical-align: middle;
}

th {
  color: var(--text-muted);
  font-size: 13px;
}

td img {
  width: 48px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
}

td strong,
td small {
  display: block;
}

.badge {
  display: inline-flex;
  border-radius: 999px;
  background: #fff3d8;
  color: #876000;
  font-size: 12px;
  font-weight: 900;
  padding: 6px 9px;
}

.badge.active {
  background: #dff8f3;
  color: #0b5f59;
}

.side-panel {
  display: grid;
  align-content: start;
  gap: 12px;
}

@media (max-width: 900px) {
  .page-header,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .primary-btn {
    width: 100%;
  }

  .page-header,
  .panel,
  .stats-grid article {
    padding: 16px;
  }

  .panel-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
