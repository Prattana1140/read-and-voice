<script setup lang="ts">
import { computed, ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

type StoredUser = {
  id?: number;
  name?: string;
  role?: string;
};

const router = useRouter();
const user = computed<StoredUser>(() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
});

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
    error.value = "Please fill in title, author, and choose a file.";
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
    formData.append("created_by", String(user.value.id || ""));
    formData.append("book_file", bookFile.value);

    const res = await axios.post(
      "http://localhost:3000/api/books/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    message.value = `Uploaded successfully. Book #${res.data.book_id} with ${res.data.total_pages} page chunks (${res.data.parse_method}).`;
    title.value = "";
    author.value = "";
    description.value = "";
    coverImage.value = "";
    bookFile.value = null;
  } catch (err: any) {
    error.value =
      err.response?.data?.error ||
      err.response?.data?.message ||
      "Upload failed.";
  } finally {
    loading.value = false;
  }
};

const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  router.push("/login");
};
</script>

<template>
  <div class="writer-page">
    <section class="hero-card">
      <div>
        <h1>Writer Dashboard</h1>
        <p>Welcome {{ user.name || "writer" }}</p>
        <p>Role: {{ user.role || "unknown" }}</p>
      </div>

      <button class="ghost-btn" @click="logout">Logout</button>
    </section>

    <section class="upload-card">
      <h2>Upload book file</h2>
      <p class="hint">
        PDF, TXT, and JSON are supported. Scanned PDFs need OCR tooling installed on this machine.
      </p>

      <div class="form-grid">
        <label class="field">
          <span>Title</span>
          <input v-model="title" type="text" placeholder="Book title" />
        </label>

        <label class="field">
          <span>Author</span>
          <input v-model="author" type="text" placeholder="Author name" />
        </label>

        <label class="field field-full">
          <span>Description</span>
          <textarea
            v-model="description"
            rows="4"
            placeholder="Short description"
          />
        </label>

        <label class="field field-full">
          <span>Cover image URL</span>
          <input
            v-model="coverImage"
            type="text"
            placeholder="https://example.com/cover.jpg"
          />
        </label>

        <label class="field field-full">
          <span>Book file</span>
          <input type="file" accept=".pdf,.txt,.json" @change="onFileChange" />
        </label>
      </div>

      <button class="primary-btn" :disabled="loading" @click="uploadBook">
        {{ loading ? "Uploading..." : "Upload book" }}
      </button>

      <p v-if="message" class="success-text">{{ message }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.writer-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  gap: 20px;
}

.hero-card,
.upload-card {
  background: white;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.field {
  display: grid;
  gap: 8px;
}

.field-full {
  grid-column: 1 / -1;
}

.field input,
.field textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d7dce8;
  border-radius: 12px;
  box-sizing: border-box;
  font: inherit;
}

.primary-btn,
.ghost-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 18px;
  cursor: pointer;
  font-weight: 700;
}

.primary-btn {
  background: #276ef1;
  color: white;
}

.ghost-btn {
  background: #eef2fb;
  color: #1d2a44;
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.hint,
.success-text,
.error-text {
  margin-top: 12px;
}

.success-text {
  color: #087443;
}

.error-text {
  color: #b00020;
}

@media (max-width: 700px) {
  .hero-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
