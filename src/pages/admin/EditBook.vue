<script setup lang="ts">
import api, { API_BASE_URL } from "../../utils/api";
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const error = ref("");
const categories = ref<{ id: number; name: string; parent_id?: number | null; sort_order?: number | null }[]>([]);

const form = ref({
  title: "",
  author: "",
  description: "",
  category_id: "",
  cover_image: "",
  is_published: 1,
});

const fetchBook = async () => {
  loading.value = true;
  error.value = "";

  try {
    const id = route.params.id;
    const res = await api.get(`${API_BASE_URL}/api/books/${id}`);
    const book = res.data;

    form.value = {
      title: book.title || "",
      author: book.author || "",
      description: book.description || "",
      category_id: book.category_id ? String(book.category_id) : "",
      cover_image: book.cover_image || "",
      is_published: Number(book.is_published ?? 1),
    };
  } catch (err) {
    console.error("fetchBook error:", err);
    error.value = "โหลดข้อมูลหนังสือไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

const fetchCategories = async () => {
  try {
    const res = await api.get(`${API_BASE_URL}/api/categories`);
    const items = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.categories)
        ? res.data.categories
        : [];

    categories.value = items
      .map((item: any) => ({
        id: Number(item.id),
        name: String(item.name || "").trim(),
        parent_id: item.parent_id == null ? null : Number(item.parent_id),
        sort_order: item.sort_order == null ? null : Number(item.sort_order),
      }))
      .filter((item: any) => Number.isFinite(item.id) && item.name)
      .sort((a: any, b: any) => {
        const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        if ((a.parent_id || 0) !== (b.parent_id || 0)) {
          return Number(a.parent_id || 0) - Number(b.parent_id || 0);
        }
        return a.name.localeCompare(b.name, "th");
      });
  } catch (err) {
    console.error("fetchCategories error:", err);
    categories.value = [];
  }
};

const saveBook = async () => {
  try {
    saving.value = true;
    const id = route.params.id;

    await api.put(`${API_BASE_URL}/api/books/${id}`, {
      ...form.value,
      category_id: form.value.category_id || null,
      is_published: Number(form.value.is_published),
    });

    alert("บันทึกสำเร็จ");
    router.push({ name: "AdminDashboard" });
  } catch (err) {
    console.error("saveBook error:", err);
    alert("บันทึกไม่สำเร็จ");
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  fetchCategories();
  fetchBook();
});
</script>

<template>
  <div class="edit-page">
    <div class="container">
      <div class="header">
        <h1>แก้ไขหนังสือ</h1>
        <button class="back-btn" @click="router.push({ name: 'AdminDashboard' })">
          ← กลับหน้าแอดมิน
        </button>
      </div>

      <div v-if="loading" class="state-box">กำลังโหลดข้อมูล...</div>
      <div v-else-if="error" class="state-box error">{{ error }}</div>

      <div v-else class="form-card">
        <div class="form-group">
          <label>ชื่อหนังสือ</label>
          <input v-model="form.title" type="text" />
        </div>

        <div class="form-group">
          <label>ผู้แต่ง</label>
          <input v-model="form.author" type="text" />
        </div>

        <div class="form-group">
          <label>คำอธิบาย</label>
          <textarea v-model="form.description" rows="5"></textarea>
        </div>

        <div class="form-group">
          <label>หมวดหมู่</label>
          <select v-model="form.category_id">
            <option value="">ไม่ระบุหมวดหมู่</option>
            <option v-for="category in categories" :key="category.id" :value="String(category.id)">
              {{ category.parent_id ? "- " : "" }}{{ category.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>รูปปก (cover_image)</label>
          <input v-model="form.cover_image" type="text" />
        </div>

        <div class="form-group">
          <label>สถานะ</label>
          <select v-model="form.is_published">
            <option :value="1">เผยแพร่</option>
            <option :value="0">ซ่อน</option>
          </select>
        </div>

        <div class="form-actions">
          <button class="save-btn" @click="saveBook" :disabled="saving">
            {{ saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f6f8fc;
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  color: #1f2430;
}

.back-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  background: #e9edf7;
  font-weight: 700;
  cursor: pointer;
}

.state-box,
.form-card {
  background: var(--surface);
  border-radius: 18px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.state-box.error {
  color: #b00020;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1f2430;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  border: 1px solid #d9dfec;
  border-radius: 12px;
  padding: 12px 14px;
  outline: none;
  font-size: 16px;
  box-sizing: border-box;
}

.form-actions {
  margin-top: 24px;
}

.save-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 18px;
  background: #6c63ff;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 640px) {
  .edit-page {
    padding: 8px 18px 22px;
  }

  .header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 10px;
  }

  .header h1 {
    font-size: 18px;
    line-height: 1.2;
  }

  .back-btn,
  .save-btn {
    width: 100%;
  }

  .back-btn,
  .save-btn {
    min-height: 30px;
    border-radius: 8px;
    font-size: 10px;
    padding: 6px 9px;
  }

  .state-box,
  .form-card {
    border-radius: 10px;
    padding: 10px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .state-box {
    font-size: 10px;
  }

  .form-group {
    margin-bottom: 10px;
  }

  .form-group label {
    margin-bottom: 5px;
    font-size: 10px;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    border-radius: 8px;
    padding: 8px 9px;
    font-size: 10px;
  }

  .form-actions {
    margin-top: 12px;
  }
}

@media (max-width: 420px) {
  .edit-page {
    padding: 7px 20px 20px;
  }

  .header h1 {
    font-size: 16px;
  }

  .back-btn,
  .save-btn {
    min-height: 28px;
    font-size: 9px;
  }
}
</style>
