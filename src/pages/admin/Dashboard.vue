<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { getAuthHeaders, getUser } from "../../utils/auth";

type Book = {
  id: number;
  title: string;
  author: string;
  description?: string;
  cover_image?: string;
  category_name?: string;
  total_pages?: number;
  is_published?: number;
  created_at?: string;
};

const router = useRouter();
const currentUser = getUser();

const loading = ref(true);
const error = ref("");
const books = ref<Book[]>([]);
const search = ref("");

const isSuperAdmin = computed(() => {
  return currentUser?.role === "superadmin";
});

const filteredBooks = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return books.value;

  return books.value.filter((book) => {
    return (
      (book.title || "").toLowerCase().includes(keyword) ||
      (book.author || "").toLowerCase().includes(keyword) ||
      (book.category_name || "").toLowerCase().includes(keyword)
    );
  });
});

const totalBooks = computed(() => books.value.length);

const totalPublished = computed(() => {
  return books.value.filter((book) => Number(book.is_published) === 1).length;
});

const getCoverUrl = (cover?: string) => {
  if (!cover) return "/no-cover.png";
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;
  return `http://localhost:3000/${cover.replace(/^\/+/, "")}`;
};

const fetchBooks = async () => {
  loading.value = true;
  error.value = "";

  try {
    const res = await axios.get("http://localhost:3000/api/books");
    books.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("fetchBooks error:", err);
    error.value = "โหลดข้อมูลหนังสือไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

const goToUpload = () => {
  router.push({ name: "UploadBook" });
};

const goToStore = () => {
  router.push({ name: "Store" });
};

const goToBook = (id: number) => {
  router.push({ name: "BookDetail", params: { id } });
};

const goToEdit = (id: number) => {
  router.push({ name: "AdminEditBook", params: { id } });
};

const goToAdminUsers = () => {
  router.push({ name: "AdminUsers" });
};

const deleteBook = async (id: number, title: string) => {
  const confirmed = window.confirm(`ต้องการลบหนังสือ "${title}" ใช่หรือไม่?`);
  if (!confirmed) return;

  try {
    await axios.delete(`http://localhost:3000/api/books/${id}`, {
      headers: getAuthHeaders(),
    });

    books.value = books.value.filter((book) => book.id !== id);
    alert("ลบหนังสือสำเร็จ");
  } catch (err) {
    console.error("deleteBook error:", err);
    alert("ลบหนังสือไม่สำเร็จ");
  }
};

onMounted(() => {
  fetchBooks();
});
</script>

<template>
  <div class="admin-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>
            จัดการหนังสือในระบบ ดูรายการทั้งหมด เพิ่ม แก้ไข และลบข้อมูลได้จากหน้านี้
          </p>
        </div>

        <div class="header-actions">
          <button class="top-btn" @click="goToStore">
            ← กลับหน้าร้านหนังสือ
          </button>

          <button
            v-if="isSuperAdmin"
            class="top-btn secondary"
            @click="goToAdminUsers"
          >
            จัดการผู้ใช้งาน
          </button>

          <button class="top-btn primary" @click="goToUpload">
            + เพิ่มหนังสือใหม่
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">หนังสือทั้งหมด</span>
          <strong class="stat-value">{{ totalBooks }}</strong>
        </div>

        <div class="stat-card">
          <span class="stat-label">เผยแพร่แล้ว</span>
          <strong class="stat-value">{{ totalPublished }}</strong>
        </div>
      </div>

      <div class="toolbar">
        <input
          v-model="search"
          type="text"
          class="search-input"
          placeholder="ค้นหาจากชื่อหนังสือ ผู้แต่ง หรือหมวดหมู่"
        />
      </div>

      <div v-if="loading" class="state-box">กำลังโหลดข้อมูล...</div>

      <div v-else-if="error" class="state-box error">
        {{ error }}
      </div>

      <div v-else-if="filteredBooks.length === 0" class="state-box empty">
        ไม่พบหนังสือในระบบ
      </div>

      <div v-else class="table-wrap">
        <table class="book-table">
          <thead>
            <tr>
              <th>ปก</th>
              <th>ชื่อหนังสือ</th>
              <th>ผู้แต่ง</th>
              <th>หมวดหมู่</th>
              <th>จำนวนหน้า</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="book in filteredBooks" :key="book.id">
              <td>
                <img
                  :src="getCoverUrl(book.cover_image)"
                  :alt="book.title"
                  class="cover-thumb"
                  @error="($event.target as HTMLImageElement).src = '/no-cover.png'"
                />
              </td>

              <td>
                <div class="title-cell">
                  <strong>{{ book.title }}</strong>
                  <small v-if="book.description">{{ book.description }}</small>
                </div>
              </td>

              <td>{{ book.author }}</td>
              <td>{{ book.category_name || "-" }}</td>
              <td>{{ book.total_pages || 0 }}</td>
              <td>
                <span
                  class="status-badge"
                  :class="{ active: Number(book.is_published) === 1 }"
                >
                  {{ Number(book.is_published) === 1 ? "เผยแพร่" : "ซ่อน" }}
                </span>
              </td>

              <td>
                <div class="action-buttons">
                  <button class="btn" @click="goToBook(book.id)">ดู</button>

                  <button class="btn edit" @click="goToEdit(book.id)">
                    แก้ไข
                  </button>

                  <button
                    class="btn danger"
                    @click="deleteBook(book.id, book.title)"
                  >
                    ลบ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f6f8fc;
  padding: 24px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 34px;
  color: #1f2430;
}

.page-header p {
  margin: 0;
  color: #667085;
  line-height: 1.7;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.top-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  background: #e8edf7;
  color: #1f2430;
  font-weight: 700;
  cursor: pointer;
}

.top-btn.primary {
  background: #6c63ff;
  color: white;
}

.top-btn.secondary {
  background: #fff4d6;
  color: #9a6700;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
}

.stat-label {
  display: block;
  color: #667085;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 34px;
  color: #1f2430;
}

.toolbar {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  max-width: 460px;
  padding: 14px 16px;
  border: 1px solid #d8dfeb;
  border-radius: 14px;
  outline: none;
  background: white;
}

.state-box {
  background: white;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.state-box.error {
  color: #b00020;
}

.state-box.empty {
  color: #667085;
  text-align: center;
}

.table-wrap {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
  overflow-x: auto;
}

.book-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.book-table thead {
  background: #f2f5fb;
}

.book-table th,
.book-table td {
  text-align: left;
  padding: 16px;
  border-bottom: 1px solid #edf1f7;
  vertical-align: top;
}

.cover-thumb {
  width: 70px;
  height: 96px;
  object-fit: cover;
  border-radius: 10px;
  background: #eceff5;
}

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-cell strong {
  color: #1f2430;
}

.title-cell small {
  color: #667085;
  line-height: 1.5;
}

.status-badge {
  display: inline-block;
  background: #eef1f7;
  color: #667085;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
}

.status-badge.active {
  background: #e7f8ed;
  color: #15803d;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 700;
  background: #edf1f7;
  color: #1f2430;
}

.btn.edit {
  background: #fff4d6;
  color: #9a6700;
}

.btn.danger {
  background: #ff5b6e;
  color: white;
}

@media (max-width: 768px) {
  .admin-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>