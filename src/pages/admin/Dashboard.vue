<script setup lang="ts">
import api, { API_BASE_URL } from "../../utils/api";
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getAuthHeaders, getUser } from "../../utils/auth";
import { useI18n } from "../../utils/i18n";
import { localizedTitle } from "../../utils/localizedContent";

type Book = {
  id: number;
  title: string;
  title_th?: string;
  title_en?: string;
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
const { locale } = useI18n();

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
      getBookTitle(book).toLowerCase().includes(keyword) ||
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
  return `${API_BASE_URL}/${cover.replace(/^\/+/, "")}`;
};

const fetchBooks = async () => {
  loading.value = true;
  error.value = "";

  try {
    const res = await api.get(`${API_BASE_URL}/api/books`);
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
  router.push({ name: "SuperAdminUsers" });
};

const goToApprovals = () => {
  router.push({ name: "AdminApprovals" });
};

const getBookTitle = (book: Book | null | undefined) =>
  localizedTitle(book, locale.value) || book?.title || "";

const goToCoinTopups = () => {
  router.push({ name: "AdminPayments" });
};

const goToSystemData = () => {
  router.push({ name: "AdminSystemData" });
};

const goToPasswordResets = () => {
  router.push({ name: "AdminPasswordResets" });
};

const goToSupportTickets = () => {
  router.push({ name: "AdminSupportTickets" });
};

const deleteBook = async (id: number, title: string) => {
  const confirmed = window.confirm(`ต้องการลบหนังสือ "${title}" ใช่หรือไม่?`);
  if (!confirmed) return;

  try {
    await api.delete(`${API_BASE_URL}/api/books/${id}`, {
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
            จัดการหนังสือในระบบ ดูรายการทั้งหมด เพิ่ม แก้ไข
            และลบข้อมูลได้จากหน้านี้
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

          <button class="top-btn secondary" @click="goToApprovals">
            อนุมัติหนังสือ
          </button>
          <button class="top-btn secondary" @click="goToCoinTopups">
            อนุมัติชำระเงิน
          </button>
          <button class="top-btn secondary" @click="goToSystemData">
            System Data
          </button>
          <button class="top-btn secondary" @click="goToPasswordResets">
            รีเซ็ตรหัสผ่าน
          </button>
          <button class="top-btn secondary" @click="goToSupportTickets">
            Support Tickets
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
                  :alt="getBookTitle(book)"
                  class="cover-thumb"
                  @error="
                    ($event.target as HTMLImageElement).src = '/no-cover.png'
                  "
                />
              </td>

              <td>
                <div class="title-cell">
                  <strong>{{ getBookTitle(book) }}</strong>
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
                    @click="deleteBook(book.id, getBookTitle(book))"
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
  --admin-page-bg: var(--bg);
  --admin-card-bg: var(--surface);
  --admin-card-soft: var(--surface-soft);
  --admin-table-head: color-mix(in srgb, var(--surface-soft) 72%, var(--surface) 28%);
  --admin-border: var(--border);
  --admin-action-bg: color-mix(in srgb, var(--primary-soft) 58%, var(--surface) 42%);
  --admin-action-text: var(--accent-strong);
  --admin-secondary-bg: color-mix(in srgb, #f6c955 24%, var(--surface) 76%);
  --admin-secondary-text: color-mix(in srgb, #8a5a00 76%, var(--text-strong) 24%);
  --admin-primary-bg: var(--secondary);
  --admin-primary-text: #ffffff;
  --admin-danger-bg: #ff5b6e;
  --admin-danger-text: #ffffff;
  --admin-success-bg: color-mix(in srgb, #22c55e 14%, var(--surface) 86%);
  --admin-success-text: color-mix(in srgb, #15803d 82%, var(--text-strong) 18%);

  min-height: 100vh;
  min-height: 100dvh;
  background: var(--admin-page-bg);
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
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
  font-size: 36px;
  color: var(--text-strong);
}

.page-header p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.top-btn {
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 12px 16px;
  background: var(--admin-action-bg);
  color: var(--admin-action-text);
  font-weight: 700;
  cursor: pointer;
}

.top-btn.primary {
  background: var(--admin-primary-bg);
  color: var(--admin-primary-text);
}

.top-btn.secondary {
  background: var(--admin-secondary-bg);
  color: var(--admin-secondary-text);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  border: 1px solid var(--border);
  background: var(--admin-card-bg);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.stat-label {
  display: block;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 36px;
  color: var(--text-strong);
}

.toolbar {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  max-width: 460px;
  padding: 14px 16px;
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  outline: none;
  background: var(--input-bg);
  color: var(--text-strong);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.state-box {
  border: 1px solid var(--border);
  background: var(--admin-card-bg);
  border-radius: 18px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.state-box.error {
  color: #b00020;
}

.state-box.empty {
  color: var(--text-muted);
  text-align: center;
}

.table-wrap {
  border: 1px solid var(--border);
  background: var(--admin-card-bg);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow);
  overflow-x: auto;
}

.book-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.book-table thead {
  background: var(--admin-table-head);
}

.book-table th,
.book-table td {
  text-align: left;
  padding: 16px;
  border-bottom: 1px solid var(--admin-border);
  vertical-align: top;
  color: var(--text);
}

.book-table th {
  color: var(--text-strong);
}

.cover-thumb {
  width: 70px;
  height: 96px;
  object-fit: cover;
  border-radius: 10px;
  background: var(--surface-soft);
}

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-cell strong {
  color: var(--text-strong);
}

.title-cell small {
  color: var(--text-muted);
  line-height: 1.5;
}

.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-soft);
  color: var(--text-muted);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 18px;
  font-weight: 700;
  min-width: 80px;
}

.status-badge.active {
  background: var(--admin-success-bg);
  color: var(--admin-success-text);
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 700;
  background: var(--admin-action-bg);
  color: var(--admin-action-text);
}

.btn.edit {
  background: var(--admin-secondary-bg);
  color: var(--admin-secondary-text);
}

.btn.danger {
  background: var(--admin-danger-bg);
  color: var(--admin-danger-text);
}

@media (max-width: 768px) {
  .admin-page {
    padding: 8px 16px 20px;
  }

  .container {
    width: 100%;
  }

  .page-header {
    flex-direction: column;
    gap: 7px;
    margin-bottom: 9px;
  }

  .page-header h1 {
    margin-bottom: 3px;
    font-size: 22px;
    line-height: 1.15;
  }

  .page-header p {
    max-width: 34rem;
    font-size: 11.5px;
    line-height: 1.35;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    margin-bottom: 8px;
  }

  .header-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    width: 100%;
  }

  .top-btn,
  .search-input {
    width: 100%;
  }

  .top-btn {
    min-height: 29px;
    border-radius: 8px;
    font-size: 11px;
    line-height: 1.2;
    padding: 4px 7px;
  }

  .stat-card,
  .state-box {
    border-radius: 10px;
    padding: 8px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .stat-label {
    margin-bottom: 2px;
    font-size: 11px;
  }

  .stat-value {
    font-size: 20px;
    line-height: 1;
  }

  .toolbar {
    margin-bottom: 8px;
  }

  .search-input {
    max-width: none;
    min-height: 32px;
    border-radius: 9px;
    font-size: 12px;
    padding: 6px 9px;
  }

  .table-wrap {
    border-radius: 14px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .book-table {
    min-width: 0;
    table-layout: fixed;
  }

  .book-table th,
  .book-table td {
    overflow-wrap: anywhere;
    padding: 5px 4px;
    font-size: 9px;
    line-height: 1.25;
    word-break: break-word;
  }

  .book-table th {
    font-size: 8.5px;
    line-height: 1.15;
  }

  .cover-thumb {
    width: 24px;
    height: 32px;
    border-radius: 6px;
  }

  .title-cell {
    gap: 3px;
  }

  .title-cell strong {
    display: -webkit-box;
    overflow: hidden;
    font-size: 9px;
    line-height: 1.25;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .title-cell small {
    display: none;
  }

  .status-badge {
    min-width: 0;
    border-radius: 7px;
    font-size: 8.5px;
    padding: 3px 4px;
  }

  .action-buttons {
    gap: 5px;
  }

  .btn {
    min-height: 19px;
    border-radius: 7px;
    font-size: 8.5px;
    line-height: 1.15;
    padding: 2px 3px;
  }
}

@media (max-width: 420px) {
  .admin-page {
    padding: 7px 18px 18px;
  }

  .page-header h1 {
    font-size: 20px;
  }

  .page-header p {
    font-size: 10.5px;
    line-height: 1.3;
  }

  .header-actions {
    gap: 5px;
  }

  .top-btn {
    min-height: 27px;
    border-radius: 7px;
    font-size: 10px;
    padding: 3px 5px;
  }

  .stats-grid {
    gap: 6px;
  }

  .stat-card,
  .state-box {
    padding: 7px;
  }

  .stat-value {
    font-size: 19px;
  }

  .book-table {
    min-width: 0;
    table-layout: fixed;
  }
}
</style>
