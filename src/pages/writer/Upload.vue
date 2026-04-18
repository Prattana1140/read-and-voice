<script setup lang="ts">
import { API_BASE_URL } from "../../utils/api";
import { ref } from "vue";
import axios from "axios";
import { getAuthHeaders } from "../../utils/auth";

type UploadMode = "ebook" | "serial";

const mode = ref<UploadMode>("ebook");
const title = ref("");
const author = ref("");
const description = ref("");
const coverImage = ref("");
const price = ref(0);
const accessType = ref<"paid" | "free">("paid");
const previewPageLimit = ref(1);
const previewCharLimit = ref(1500);
const bookFile = ref<File | null>(null);

const serialBookId = ref<number | null>(null);
const episodeNumber = ref(1);
const episodeTitle = ref("");
const episodeContent = ref("");
const episodePrice = ref(0);
const episodeIsFree = ref(true);
const episodePreviewLimit = ref(1500);

const loading = ref(false);
const message = ref("");
const error = ref("");

const resetStatus = () => {
  message.value = "";
  error.value = "";
};

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  bookFile.value = target.files?.[0] || null;
};

const uploadEbook = async () => {
  resetStatus();

  if (!title.value || !author.value || !bookFile.value) {
    error.value = "กรุณากรอกชื่อหนังสือ ผู้แต่ง และเลือกไฟล์เล่มเต็ม";
    return;
  }

  loading.value = true;

  try {
    const formData = new FormData();
    formData.append("title", title.value);
    formData.append("author", author.value);
    formData.append("description", description.value);
    formData.append("cover_image", coverImage.value);
    formData.append("price", String(price.value || 0));
    formData.append("access_type", accessType.value);
    formData.append("preview_page_limit", String(previewPageLimit.value || 1));
    formData.append("preview_char_limit", String(previewCharLimit.value || 1500));
    formData.append("book_file", bookFile.value);

    const res = await axios.post(`${API_BASE_URL}/api/books/upload`, formData, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "multipart/form-data",
      },
      timeout: 30 * 60 * 1000,
    });

    message.value = `อัปโหลดเล่มเต็มสำเร็จ: Book #${res.data.book_id}`;
    bookFile.value = null;
  } catch (err: any) {
    error.value =
      err.response?.data?.message ||
      err.response?.data?.error ||
      "อัปโหลดเล่มเต็มไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

const createSerialBook = async () => {
  resetStatus();

  if (!title.value || !author.value) {
    error.value = "กรุณากรอกชื่อเรื่องและผู้แต่งก่อนสร้างเรื่องรายตอน";
    return;
  }

  loading.value = true;

  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/books/serial`,
      {
        title: title.value,
        author: author.value,
        description: description.value,
        cover_image: coverImage.value,
        price: price.value || 0,
        access_type: accessType.value,
      },
      { headers: getAuthHeaders() }
    );

    serialBookId.value = Number(res.data.book_id);
    message.value = `สร้างเรื่องรายตอนสำเร็จ: Book #${serialBookId.value}`;
  } catch (err: any) {
    error.value = err.response?.data?.message || "สร้างเรื่องรายตอนไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

const addEpisode = async () => {
  resetStatus();

  if (!serialBookId.value) {
    error.value = "กรุณาสร้างเรื่องรายตอนก่อนเพิ่มตอน";
    return;
  }

  if (!episodeTitle.value || !episodeContent.value) {
    error.value = "กรุณากรอกชื่อตอนและเนื้อหาตอน";
    return;
  }

  loading.value = true;

  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/books/${serialBookId.value}/episodes`,
      {
        episode_number: episodeNumber.value,
        title: episodeTitle.value,
        content: episodeContent.value,
        price: episodeIsFree.value ? 0 : episodePrice.value || 0,
        is_free: episodeIsFree.value,
        preview_char_limit: episodePreviewLimit.value || 1500,
      },
      { headers: getAuthHeaders() }
    );

    message.value = `เพิ่มตอนสำเร็จ: Episode #${res.data.episode_id}`;
    episodeNumber.value += 1;
    episodeTitle.value = "";
    episodeContent.value = "";
    episodePrice.value = 0;
    episodeIsFree.value = true;
  } catch (err: any) {
    error.value = err.response?.data?.message || "เพิ่มตอนไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="writer-page">
    <section class="panel">
      <p class="eyebrow">นักเขียน</p>
      <h1>เพิ่มผลงาน</h1>
      <p class="muted">เลือกอัปโหลดเป็นเล่มเต็ม หรือสร้างเรื่องแบบรายตอน</p>

      <div class="mode-tabs">
        <button :class="{ active: mode === 'ebook' }" @click="mode = 'ebook'">
          อีบุ๊กทั้งเล่ม
        </button>
        <button :class="{ active: mode === 'serial' }" @click="mode = 'serial'">
          รายตอน
        </button>
      </div>

      <div class="form-grid">
        <label>
          <span>ชื่อเรื่อง</span>
          <input v-model="title" type="text" />
        </label>
        <label>
          <span>ผู้แต่ง</span>
          <input v-model="author" type="text" />
        </label>
        <label>
          <span>สถานะการอ่าน</span>
          <select v-model="accessType">
            <option value="paid">เสียเงิน</option>
            <option value="free">อ่านฟรีทั้งเรื่อง</option>
          </select>
        </label>
        <label>
          <span>ราคาเล่ม/เรื่อง</span>
          <input v-model.number="price" min="0" type="number" />
        </label>
        <label class="full">
          <span>คำอธิบาย</span>
          <textarea v-model="description" rows="4" />
        </label>
        <label class="full">
          <span>Cover image URL</span>
          <input v-model="coverImage" type="text" />
        </label>
      </div>

      <div v-if="mode === 'ebook'" class="sub-panel">
        <h2>อัปโหลดอีบุ๊กทั้งเล่ม</h2>
        <div class="form-grid">
          <label>
            <span>ตัวอย่างกี่หน้า</span>
            <input v-model.number="previewPageLimit" min="1" type="number" />
          </label>
          <label>
            <span>ตัวอย่างกี่ตัวอักษร</span>
            <input v-model.number="previewCharLimit" min="1" type="number" />
          </label>
          <label class="full">
            <span>ไฟล์หนังสือ</span>
            <input type="file" accept=".pdf,.txt,.json" @change="onFileChange" />
          </label>
        </div>
        <button class="primary-btn" :disabled="loading" @click="uploadEbook">
          {{ loading ? "กำลังอัปโหลด..." : "อัปโหลดเล่มเต็ม" }}
        </button>
      </div>

      <div v-else class="sub-panel">
        <h2>สร้างเรื่องรายตอน</h2>
        <button class="primary-btn" :disabled="loading" @click="createSerialBook">
          {{ serialBookId ? `ใช้เรื่อง #${serialBookId}` : "สร้างเรื่องรายตอน" }}
        </button>

        <div class="episode-form" :class="{ disabled: !serialBookId }">
          <h3>เพิ่มตอน</h3>
          <div class="form-grid">
            <label>
              <span>ตอนที่</span>
              <input v-model.number="episodeNumber" min="1" type="number" />
            </label>
            <label>
              <span>ชื่อตอน</span>
              <input v-model="episodeTitle" type="text" />
            </label>
            <label>
              <span>อ่านฟรี</span>
              <select v-model="episodeIsFree">
                <option :value="true">ฟรี</option>
                <option :value="false">ต้องซื้อ</option>
              </select>
            </label>
            <label>
              <span>ราคาตอน</span>
              <input v-model.number="episodePrice" :disabled="episodeIsFree" min="0" type="number" />
            </label>
            <label class="full">
              <span>ตัวอย่างกี่ตัวอักษร</span>
              <input v-model.number="episodePreviewLimit" min="1" type="number" />
            </label>
            <label class="full">
              <span>เนื้อหาตอน</span>
              <textarea v-model="episodeContent" rows="10" />
            </label>
          </div>
          <button class="primary-btn" :disabled="loading || !serialBookId" @click="addEpisode">
            เพิ่มตอน
          </button>
        </div>
      </div>

      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.writer-page {
  max-width: 1040px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.panel,
.sub-panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
}

.sub-panel {
  margin-top: 20px;
  background: var(--surface-soft);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1,
h2,
h3 {
  margin: 0 0 10px;
  color: var(--text-strong);
}

.muted {
  color: var(--text-muted);
}

.mode-tabs {
  display: flex;
  gap: 10px;
  margin: 22px 0;
}

.mode-tabs button {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-strong);
  cursor: pointer;
  font-weight: 900;
  padding: 10px 14px;
}

.mode-tabs button.active {
  background: var(--primary);
  color: var(--on-primary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 20px 0;
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
select,
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-strong);
  padding: 12px 14px;
}

.episode-form {
  margin-top: 24px;
}

.episode-form.disabled {
  opacity: 0.75;
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
