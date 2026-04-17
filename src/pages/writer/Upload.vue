<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";

type StoredUser = {
  id?: number;
  name?: string;
  role?: string;
};

const user: StoredUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
})();

const title = ref("");
const author = ref("");
const description = ref("");
const coverImage = ref("");
const bookFile = ref<File | null>(null);
const loading = ref(false);
const message = ref("");
const error = ref("");

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  bookFile.value = target.files?.[0] || null;
};

const uploadBook = async () => {
  if (!title.value || !author.value || !bookFile.value) {
    error.value = "กรุณากรอกชื่อหนังสือ ผู้แต่ง และเลือกไฟล์";
    message.value = "";
    return;
  }

  loading.value = true;
  error.value = "";
  message.value = "";

  try {
    const formData = new FormData();
    formData.append("title", title.value);
    formData.append("author", author.value);
    formData.append("description", description.value);
    formData.append("cover_image", coverImage.value);
    formData.append("created_by", String(user.id || ""));
    formData.append("book_file", bookFile.value);

    const res = await axios.post("http://localhost:3000/api/books/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    message.value = `อัปโหลดสำเร็จ: Book #${res.data.book_id}`;
    title.value = "";
    author.value = "";
    description.value = "";
    coverImage.value = "";
    bookFile.value = null;
  } catch (err: any) {
    error.value = err.response?.data?.message || err.response?.data?.error || "อัปโหลดไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="writer-page">
    <section class="panel">
      <p class="eyebrow">นักเขียน</p>
      <h1>อัปโหลดหนังสือของตัวเอง</h1>
      <p class="muted">หน้านี้ใช้สำหรับนักเขียนเพิ่มผลงานของตัวเองเข้าสู่ระบบ</p>

      <div class="form-grid">
        <label>
          <span>ชื่อหนังสือ</span>
          <input v-model="title" type="text" />
        </label>
        <label>
          <span>ผู้แต่ง</span>
          <input v-model="author" type="text" />
        </label>
        <label class="full">
          <span>คำอธิบาย</span>
          <textarea v-model="description" rows="4" />
        </label>
        <label class="full">
          <span>Cover image URL</span>
          <input v-model="coverImage" type="text" />
        </label>
        <label class="full">
          <span>ไฟล์หนังสือ</span>
          <input type="file" accept=".pdf,.txt,.json" @change="onFileChange" />
        </label>
      </div>

      <button class="primary-btn" :disabled="loading" @click="uploadBook">
        {{ loading ? "กำลังอัปโหลด..." : "อัปโหลดหนังสือ" }}
      </button>
      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.writer-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1 {
  margin: 0 0 10px;
  color: var(--text-strong);
}

.muted {
  color: var(--text-muted);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 24px 0;
}

label {
  display: grid;
  gap: 8px;
  color: var(--text-strong);
  font-weight: 800;
}

.full {
  grid-column: 1 / -1;
}

input,
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 12px 14px;
}

.primary-btn {
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 12px 18px;
}

.primary-btn:disabled {
  opacity: 0.65;
}

.success {
  color: var(--primary-strong);
  font-weight: 800;
}

.error {
  color: var(--danger);
  font-weight: 800;
}

@media (max-width: 700px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
