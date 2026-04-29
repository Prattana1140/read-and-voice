<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../../utils/api";

type WriterProfile = {
  user_id: number;
  pen_name: string;
  page_slug: string;
  tagline: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  facebook_url: string;
  x_url: string;
  pinned_book_id: number | null;
};

type WriterBook = {
  id: number;
  title: string;
  cover_image?: string;
};

const router = useRouter();
const loading = ref(true);
const saving = ref(false);
const message = ref("");
const errorMessage = ref("");
const books = ref<WriterBook[]>([]);

const form = reactive<WriterProfile>({
  user_id: 0,
  pen_name: "",
  page_slug: "",
  tagline: "",
  bio: "",
  avatar_url: "",
  banner_url: "",
  facebook_url: "",
  x_url: "",
  pinned_book_id: null,
});

const publicPath = computed(() => `/writers/${form.page_slug || `user-${form.user_id || "me"}`}`);
const avatarPreview = computed(() => (form.avatar_url ? resolveAssetUrl(form.avatar_url) : ""));
const bannerPreview = computed(() => (form.banner_url ? resolveAssetUrl(form.banner_url) : ""));

function syncProfile(profile?: Partial<WriterProfile> | null) {
  form.user_id = Number(profile?.user_id || 0);
  form.pen_name = profile?.pen_name || "";
  form.page_slug = profile?.page_slug || "";
  form.tagline = profile?.tagline || "";
  form.bio = profile?.bio || "";
  form.avatar_url = profile?.avatar_url || "";
  form.banner_url = profile?.banner_url || "";
  form.facebook_url = profile?.facebook_url || "";
  form.x_url = profile?.x_url || "";
  form.pinned_book_id = profile?.pinned_book_id ?? null;
}

async function loadProfile() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/writers/me/profile");
    syncProfile(data?.profile || null);
    books.value = Array.isArray(data?.books) ? data.books : [];
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดข้อมูลหน้าโปรไฟล์นักเขียนไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  try {
    saving.value = true;
    message.value = "";
    errorMessage.value = "";

    const payload = {
      pen_name: form.pen_name.trim(),
      page_slug: form.page_slug.trim(),
      tagline: form.tagline.trim(),
      bio: form.bio.trim(),
      avatar_url: form.avatar_url.trim(),
      banner_url: form.banner_url.trim(),
      facebook_url: form.facebook_url.trim(),
      x_url: form.x_url.trim(),
      pinned_book_id: form.pinned_book_id || null,
    };

    const { data } = await api.put("/writers/me/profile", payload);
    syncProfile(data?.profile || null);
    books.value = Array.isArray(data?.books) ? data.books : [];
    message.value = data?.message || "บันทึกข้อมูลหน้าโปรไฟล์นักเขียนสำเร็จ";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "บันทึกข้อมูลหน้าโปรไฟล์นักเขียนไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

onMounted(loadProfile);
</script>

<template>
  <main class="writer-profile-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">Writer Identity</p>
        <h1>ตั้งค่าหน้าสาธารณะของนักเขียน</h1>
        <p class="muted">
          กำหนด pen name, slug, รูปโปรไฟล์, แบนเนอร์ และลิงก์โซเชียล เพื่อให้ผู้อ่านรู้จักและติดตามคุณได้ง่ายขึ้น
        </p>
      </div>
      <div class="hero-actions">
        <button type="button" class="ghost-button" @click="router.push(publicPath)">ดูหน้าสาธารณะ</button>
        <button type="button" @click="router.push('/writer')">กลับแดชบอร์ด</button>
      </div>
    </section>

    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>

    <section v-if="loading" class="panel state-box">กำลังโหลดข้อมูล...</section>

    <section v-else class="editor-grid">
      <article class="panel preview-panel">
        <div class="banner-frame">
          <img v-if="bannerPreview" :src="bannerPreview" alt="ตัวอย่างแบนเนอร์" />
          <div v-else class="banner-placeholder">ตัวอย่างแบนเนอร์</div>
        </div>
        <div class="profile-row">
          <div class="avatar-frame">
            <img v-if="avatarPreview" :src="avatarPreview" alt="ตัวอย่างรูปโปรไฟล์" />
            <div v-else>{{ (form.pen_name || "W").slice(0, 1).toUpperCase() }}</div>
          </div>
          <div>
            <strong>{{ form.pen_name || "ตั้งค่า pen name ของคุณ" }}</strong>
            <p>{{ form.tagline || "คำโปรยสั้น ๆ ของนักเขียนจะแสดงตรงนี้" }}</p>
            <small>{{ publicPath }}</small>
          </div>
        </div>
      </article>

      <article class="panel">
        <form class="settings-form" @submit.prevent="saveProfile">
          <label>
            <span>Pen name</span>
            <input v-model="form.pen_name" type="text" maxlength="120" placeholder="ชื่อนักเขียนที่อยากให้ผู้อ่านเห็น" />
          </label>

          <label>
            <span>Slug หน้าสาธารณะ</span>
            <input v-model="form.page_slug" type="text" maxlength="160" placeholder="my-writer-page" />
          </label>

          <label class="full-span">
            <span>Tagline</span>
            <input v-model="form.tagline" type="text" maxlength="255" placeholder="ประโยคสั้น ๆ ใต้ชื่อของคุณ" />
          </label>

          <label class="full-span">
            <span>Bio</span>
            <textarea v-model="form.bio" rows="6" maxlength="4000" placeholder="เล่าให้ผู้อ่านรู้จักตัวคุณหรือแนวงานเขียนของคุณ" />
          </label>

          <label class="full-span">
            <span>ลิงก์รูปโปรไฟล์</span>
            <input v-model="form.avatar_url" type="url" placeholder="https://example.com/avatar.jpg" />
          </label>

          <label class="full-span">
            <span>ลิงก์รูปแบนเนอร์</span>
            <input v-model="form.banner_url" type="url" placeholder="https://example.com/banner.jpg" />
          </label>

          <label>
            <span>ลิงก์ Facebook</span>
            <input v-model="form.facebook_url" type="url" placeholder="https://facebook.com/yourpage" />
          </label>

          <label>
            <span>ลิงก์ X / Twitter</span>
            <input v-model="form.x_url" type="url" placeholder="https://x.com/yourhandle" />
          </label>

          <label class="full-span">
            <span>ผลงานเด่นบนหน้าโปรไฟล์</span>
            <select v-model="form.pinned_book_id">
              <option :value="null">ยังไม่เลือก</option>
              <option v-for="book in books" :key="book.id" :value="book.id">
                {{ book.title }}
              </option>
            </select>
          </label>

          <div class="form-actions full-span">
            <button type="submit" :disabled="saving">
              {{ saving ? "กำลังบันทึก..." : "บันทึกข้อมูลหน้าสาธารณะ" }}
            </button>
          </div>
        </form>
      </article>
    </section>
  </main>
</template>

<style scoped>
.writer-profile-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 56px;
}

.hero-card,
.panel {
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 26px;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
strong,
label span {
  color: var(--text-strong);
}

h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 42px);
}

.muted,
.profile-row p,
.profile-row small {
  color: var(--text-muted);
}

.hero-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

button {
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

.ghost-button {
  background: #e6fffb;
  color: #0f766e;
}

.alert {
  border-radius: 14px;
  font-weight: 800;
  margin-top: 18px;
  padding: 14px;
}

.success {
  background: #f0fdf4;
  color: #15803d;
}

.error {
  background: #fef2f2;
  color: #dc2626;
}

.editor-grid {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 18px;
  margin-top: 20px;
}

.preview-panel,
.settings-form {
  display: grid;
  gap: 16px;
}

.panel {
  padding: 22px;
}

.banner-frame {
  overflow: hidden;
  border-radius: 20px;
  min-height: 180px;
  background: linear-gradient(135deg, #dff7f4, #edfdf9);
}

.banner-frame img {
  width: 100%;
  height: 180px;
  display: block;
  object-fit: cover;
}

.banner-placeholder {
  display: grid;
  place-items: center;
  min-height: 180px;
  color: #0f766e;
  font-weight: 900;
}

.profile-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.avatar-frame,
.avatar-frame img {
  width: 92px;
  height: 92px;
  border-radius: 28px;
}

.avatar-frame {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #00a878, #20b8ad);
  color: #fff;
  font-size: 38px;
  font-weight: 900;
  overflow: hidden;
}

.avatar-frame img {
  display: block;
  object-fit: cover;
}

.settings-form {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

label {
  display: grid;
  gap: 8px;
  font-weight: 900;
}

input,
textarea,
select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 12px 14px;
  font: inherit;
  font-size: 16px;
}

textarea {
  resize: vertical;
}

.full-span {
  grid-column: 1 / -1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.state-box {
  margin-top: 20px;
}

@media (max-width: 920px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .hero-card,
  .settings-form {
    grid-template-columns: 1fr;
  }

  .hero-card {
    flex-direction: column;
  }

  .hero-actions,
  .form-actions {
    justify-content: stretch;
  }

  .hero-actions button,
  .form-actions button {
    width: 100%;
  }

  .hero-card,
  .panel {
    border-radius: 18px;
    padding: 18px;
  }

  .profile-row {
    grid-template-columns: 74px minmax(0, 1fr);
  }

  .avatar-frame,
  .avatar-frame img {
    width: 74px;
    height: 74px;
    border-radius: 22px;
  }
}
</style>
