<script setup lang="ts">
import { API_BASE_URL } from "../utils/api";
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { getAuthHeaders, getUser } from "../utils/auth";

type Category = {
  id: number;
  name: string;
};

const router = useRouter();

const title = ref("");
const author = ref("");
const description = ref("");
const categoryId = ref("");
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const categories = ref<Category[]>([]);

const loading = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

const API_BASE = `${API_BASE_URL}/api`;

const fetchCategories = async () => {
  try {
    const res = await axios.get(`${API_BASE}/categories`);
    categories.value = Array.isArray(res.data) ? res.data : [];

    if (categories.value.length > 0 && !categoryId.value) {
      categoryId.value = String(categories.value[0].id);
    }
  } catch (error) {
    console.error("fetchCategories error:", error);
    errorMessage.value = "โหลดหมวดหมู่ไม่สำเร็จ";
  }
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;

  if (!files || files.length === 0) {
    selectedFile.value = null;
    return;
  }

  const file = files[0];
  const lowerName = file.name.toLowerCase();
  const isValid =
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".json");

  if (!isValid) {
    selectedFile.value = null;
    errorMessage.value = "รองรับเฉพาะไฟล์ .txt .pdf และ .json";
    target.value = "";
    return;
  }

  errorMessage.value = "";
  selectedFile.value = file;
};

const resetForm = () => {
  title.value = "";
  author.value = "";
  description.value = "";
  selectedFile.value = null;

  if (categories.value.length > 0) {
    categoryId.value = String(categories.value[0].id);
  } else {
    categoryId.value = "";
  }

  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const uploadBook = async () => {
  successMessage.value = "";
  errorMessage.value = "";

  if (loading.value) return;

  const user = getUser();
  const token = localStorage.getItem("token");

  if (!user || !token) {
    errorMessage.value = "กรุณาเข้าสู่ระบบก่อน";
    router.push("/login");
    return;
  }

  if (user.role !== "admin" && user.role !== "superadmin") {
    errorMessage.value = "เฉพาะ admin เท่านั้น";
    return;
  }

  if (
    !title.value.trim() ||
    !author.value.trim() ||
    !selectedFile.value ||
    !categoryId.value
  ) {
    errorMessage.value =
      "กรุณากรอกชื่อหนังสือ ผู้แต่ง เลือกหมวดหมู่ และเลือกไฟล์";
    return;
  }

  try {
    loading.value = true;

    const formData = new FormData();
    formData.append("title", title.value.trim());
    formData.append("author", author.value.trim());
    formData.append("description", description.value.trim());
    formData.append("category_id", categoryId.value);
    formData.append("book_file", selectedFile.value);

    const res = await axios.post(`${API_BASE}/books/upload`, formData, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "multipart/form-data",
      },
      timeout: 30 * 60 * 1000,
    });

    successMessage.value =
      res.data?.message || "อัปโหลดและประมวลผลหนังสือสำเร็จ";

    const uploadedBookId = res.data?.book_id;
    resetForm();

    if (uploadedBookId) {
      setTimeout(() => {
        router.push(`/book/${uploadedBookId}`);
      }, 800);
    }
  } catch (error: any) {
    console.error("uploadBook error:", error);
    console.error("backend error:", error?.response?.data);

    if (error.code === "ECONNABORTED") {
      errorMessage.value = "การอัปโหลดใช้เวลานานเกินไป หรือ backend ไม่ตอบกลับ";
    } else if (error?.response?.status === 401) {
      errorMessage.value = "กรุณาเข้าสู่ระบบใหม่";
    } else if (error?.response?.status === 403) {
      errorMessage.value = "คุณไม่มีสิทธิ์อัปโหลดหนังสือ";
    } else {
      errorMessage.value =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "อัปโหลดหรือประมวลผลหนังสือไม่สำเร็จ";
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  const user = getUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    errorMessage.value = "เฉพาะ admin เท่านั้น";
  }

  fetchCategories();
});
</script>

<template>
  <div class="upload-page">
    <div class="upload-card">
      <h1>อัปโหลดหนังสือ</h1>
      <p class="subtitle">รองรับไฟล์ .txt .pdf และ .json</p>

      <div class="form-group">
        <label>ชื่อหนังสือ</label>
        <input v-model="title" type="text" placeholder="กรอกชื่อหนังสือ" />
      </div>

      <div class="form-group">
        <label>ผู้แต่ง</label>
        <input v-model="author" type="text" placeholder="กรอกชื่อผู้แต่ง" />
      </div>

      <div class="form-group">
        <label>คำอธิบาย</label>
        <textarea
          v-model="description"
          rows="4"
          placeholder="กรอกรายละเอียดหนังสือ"
        />
      </div>

      <div class="form-group">
        <label>หมวดหมู่</label>
        <select v-model="categoryId">
          <option value="" disabled>-- เลือกหมวดหมู่ --</option>
          <option
            v-for="category in categories"
            :key="category.id"
            :value="String(category.id)"
          >
            {{ category.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>เลือกไฟล์หนังสือ</label>
        <input
          ref="fileInput"
          type="file"
          accept=".txt,.pdf,.json"
          @change="handleFileChange"
        />
        <p v-if="selectedFile" class="file-name">
          ไฟล์ที่เลือก: {{ selectedFile.name }}
        </p>
      </div>

      <button class="upload-btn" @click="uploadBook" :disabled="loading">
        {{ loading ? "กำลังอัปโหลด..." : "อัปโหลดหนังสือ" }}
      </button>

      <p v-if="successMessage" class="success">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.upload-page {
  min-height: 100vh;
  background: #f7f8fc;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 20px;
}

.upload-card {
  width: 100%;
  max-width: 700px;
  background: white;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

h1 {
  margin: 0 0 8px;
  color: #222;
}

.subtitle {
  margin: 0 0 24px;
  color: #666;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  border: 1px solid #d8dce7;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  box-sizing: border-box;
  background: white;
}

.file-name {
  margin-top: 8px;
  color: #555;
}

.upload-btn {
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 14px;
  background: #6c63ff;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.upload-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.success {
  margin-top: 16px;
  color: #15803d;
  font-weight: 600;
}

.error {
  margin-top: 16px;
  color: #b00020;
  font-weight: 600;
}
</style>
