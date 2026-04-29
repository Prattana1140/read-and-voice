<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";
import { getUser, saveAuth } from "../utils/auth";

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  bio: string;
  avatar_url: string;
  currentPassword: string;
  newPassword: string;
};

type ProfileResponse = {
  id: number;
  name: string;
  email: string;
  role?: string;
  status?: string;
  created_at?: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
};

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const errorMessage = ref("");
const isEditOpen = ref(false);
const selectedAvatarFile = ref<File | null>(null);
const selectedAvatarPreview = ref("");
const removeAvatar = ref(false);
const profileMeta = ref<ProfileResponse | null>(null);

const form = reactive<ProfileForm>({
  name: "",
  email: "",
  phone: "",
  bio: "",
  avatar_url: "",
  currentPassword: "",
  newPassword: "",
});

const accountCards = [
  { title: "รายการที่อยากได้", text: "หนังสือที่คุณบันทึกไว้เพื่อกลับมาอ่านหรือซื้อภายหลัง", to: "/wishlist" },
  { title: "ชั้นหนังสือของฉัน", text: "หนังสือที่ซื้อแล้วหรือมีสิทธิ์อ่าน", to: "/my-library" },
  { title: "ตะกร้า", text: "รายการหนังสือและตอนที่รอชำระด้วย coin", to: "/cart" },
  { title: "ประวัติคำสั่งซื้อ", text: "ดูรายการซื้อและสถานะการชำระเงินที่ผ่านมา", to: "/orders/history" },
  { title: "กระเป๋า Coin", text: "เติม coin และดูประวัติธุรกรรม", to: "/coin-wallet" },
  { title: "สมาชิก VIP", text: "สมัครหรือดูสถานะแพ็กเกจรายเดือน", to: "/subscription-plans" },
  { title: "การแจ้งเตือน", text: "ดูตอนใหม่จากนักเขียนที่คุณติดตามและอัปเดตสำคัญ", to: "/account/notifications" },
  { title: "รายการที่ติดตาม", text: "ดูหนังสือ ผู้เขียน หรือหมวดที่ติดตาม", to: "/account/following" },
  { title: "Gift Code", text: "ตรวจสอบ gift code ที่ได้รับ", to: "/account/gift-codes" },
  { title: "Buffet ของฉัน", text: "ดูประวัติและสถานะ subscription", to: "/account/buffet" },
  { title: "อุปกรณ์ของฉัน", text: "ดูอุปกรณ์ที่ผูกกับบัญชี", to: "/account/devices" },
  { title: "สิทธิพิเศษ", text: "ดู benefits และสิทธิประโยชน์", to: "/account/benefits" },
  { title: "รีวิวของฉัน", text: "ดูรีวิวและคะแนนที่เคยให้", to: "/account/reviews" },
  { title: "ยืนยันอายุ", text: "ส่งคำขอยืนยันอายุสำหรับเนื้อหาที่จำกัด", to: "/account/age-verification" },
];

const currentUser = computed(() => getUser());
const displayName = computed(() => form.name || currentUser.value?.name || "Read and Voice User");
const roleLabel = computed(() => profileMeta.value?.role || currentUser.value?.role || "user");
const memberSince = computed(() => {
  const raw = profileMeta.value?.created_at;
  if (!raw) return "ยังไม่มีข้อมูล";

  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? raw
    : new Intl.DateTimeFormat("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
});
const profilePreviewUrl = computed(() => {
  if (removeAvatar.value) return "";
  if (selectedAvatarPreview.value) return selectedAvatarPreview.value;
  if (form.avatar_url.trim()) return resolveAssetUrl(form.avatar_url.trim());
  return "";
});

function syncForm(data?: Partial<ProfileResponse> | null) {
  form.name = data?.name || currentUser.value?.name || "";
  form.email = data?.email || currentUser.value?.email || "";
  form.phone = data?.phone || "";
  form.bio = data?.bio || "";
  form.avatar_url = data?.avatar_url || currentUser.value?.avatar_url || "";
}

function resetAvatarSelection() {
  if (selectedAvatarPreview.value.startsWith("blob:")) {
    URL.revokeObjectURL(selectedAvatarPreview.value);
  }
  selectedAvatarFile.value = null;
  selectedAvatarPreview.value = "";
}

async function loadProfile() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/profile/me");
    profileMeta.value = data || null;
    syncForm(data);
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดโปรไฟล์ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] || null;

  resetAvatarSelection();

  if (!file) {
    return;
  }

  selectedAvatarFile.value = file;
  selectedAvatarPreview.value = URL.createObjectURL(file);
  removeAvatar.value = false;
}

function clearAvatar() {
  removeAvatar.value = true;
  form.avatar_url = "";
  resetAvatarSelection();
}

function useAvatarUrlInput() {
  removeAvatar.value = false;
  resetAvatarSelection();
}

async function saveProfile() {
  try {
    saving.value = true;
    message.value = "";
    errorMessage.value = "";

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !email) {
      errorMessage.value = "กรุณากรอกชื่อและอีเมล";
      return;
    }

    const payload = new FormData();
    payload.append("name", name);
    payload.append("email", email);
    payload.append("phone", form.phone.trim());
    payload.append("bio", form.bio.trim());
    payload.append("avatar_url", form.avatar_url.trim());
    payload.append("remove_avatar", removeAvatar.value ? "true" : "false");

    if (form.currentPassword) {
      payload.append("currentPassword", form.currentPassword);
    }

    if (form.newPassword) {
      payload.append("newPassword", form.newPassword);
    }

    if (selectedAvatarFile.value) {
      payload.append("avatar", selectedAvatarFile.value);
    }

    const { data } = await api.put("/profile/me", payload, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const profile = data?.profile || null;
    profileMeta.value = profile;
    syncForm(profile);

    const user = currentUser.value;
    const token = localStorage.getItem("token");

    if (token && user) {
      saveAuth(token, {
        ...user,
        name: profile?.name || name,
        email: profile?.email || email,
        avatar_url: profile?.avatar_url || "",
        phone: profile?.phone || "",
        bio: profile?.bio || "",
        created_at: profile?.created_at || user.created_at,
      });
    }

    form.currentPassword = "";
    form.newPassword = "";
    removeAvatar.value = false;
    resetAvatarSelection();
    isEditOpen.value = false;
    message.value = data?.message || "บันทึกโปรไฟล์สำเร็จ";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "บันทึกโปรไฟล์ไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

function goTo(path: string) {
  router.push(path);
}

onMounted(loadProfile);
onUnmounted(resetAvatarSelection);
</script>

<template>
  <main class="profile-page">
    <section class="profile-hero">
      <div class="avatar-shell">
        <img v-if="profilePreviewUrl" :src="profilePreviewUrl" alt="รูปโปรไฟล์" class="avatar-image" />
        <div v-else class="avatar" aria-hidden="true">
          {{ displayName.slice(0, 1).toUpperCase() }}
        </div>
      </div>
      <div class="hero-copy">
        <p class="eyebrow">Read and Voice Account</p>
        <h1>{{ displayName }}</h1>
        <span>{{ form.email || "กำลังโหลดอีเมล..." }}</span>
        <div class="hero-meta">
          <strong class="role-pill">{{ roleLabel }}</strong>
          <small>สมาชิกตั้งแต่ {{ memberSince }}</small>
        </div>
      </div>
      <button type="button" @click="isEditOpen = !isEditOpen">
        {{ isEditOpen ? "ปิดฟอร์ม" : "แก้ไขโปรไฟล์" }}
      </button>
    </section>

    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>

    <section v-if="isEditOpen" class="edit-panel">
      <div class="edit-header">
        <div>
          <h2>แก้ไขข้อมูลบัญชี</h2>
          <p>อัปเดตชื่อ รูปโปรไฟล์ ช่องทางติดต่อ และข้อความแนะนำตัวได้ในหน้าเดียว</p>
        </div>
      </div>

      <form class="profile-form" @submit.prevent="saveProfile">
        <div class="avatar-editor">
          <div class="avatar-preview-card">
            <img v-if="profilePreviewUrl" :src="profilePreviewUrl" alt="ตัวอย่างรูปโปรไฟล์" class="avatar-preview" />
            <div v-else class="avatar-preview fallback-avatar">
              {{ displayName.slice(0, 1).toUpperCase() }}
            </div>
          </div>

          <label class="upload-field">
            <span>อัปโหลดรูปโปรไฟล์</span>
            <input type="file" accept="image/*" @change="handleAvatarChange" />
          </label>

          <label class="full-span">
            <span>หรือใส่ URL รูปภาพ</span>
            <input
              v-model="form.avatar_url"
              type="url"
              inputmode="url"
              placeholder="https://example.com/avatar.jpg"
              @input="useAvatarUrlInput"
            />
          </label>

          <button type="button" class="ghost-button" @click="clearAvatar">
            ลบรูปโปรไฟล์
          </button>
        </div>

        <div class="field-grid">
          <label>
            <span>ชื่อที่แสดง</span>
            <input v-model="form.name" type="text" autocomplete="name" />
          </label>

          <label>
            <span>อีเมล</span>
            <input v-model="form.email" type="email" autocomplete="email" />
          </label>

          <label>
            <span>เบอร์โทร</span>
            <input v-model="form.phone" type="tel" autocomplete="tel" placeholder="08x-xxx-xxxx" />
          </label>

          <label>
            <span>สถานะบัญชี</span>
            <input :value="profileMeta?.status || 'active'" type="text" disabled />
          </label>

          <label class="full-span">
            <span>แนะนำตัว</span>
            <textarea
              v-model="form.bio"
              rows="5"
              maxlength="2000"
              placeholder="บอกคนอื่นสั้น ๆ ว่าคุณชอบอ่านอะไร หรืออยากให้โปรไฟล์ดูเป็นแบบไหน"
            />
          </label>

          <label>
            <span>รหัสผ่านปัจจุบัน</span>
            <input v-model="form.currentPassword" type="password" autocomplete="current-password" />
          </label>

          <label>
            <span>รหัสผ่านใหม่</span>
            <input v-model="form.newPassword" type="password" autocomplete="new-password" />
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" :disabled="saving">
            {{ saving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์" }}
          </button>
        </div>
      </form>
    </section>

    <section class="account-grid" :class="{ loading }">
      <article v-for="card in accountCards" :key="card.to" class="account-card" @click="goTo(card.to)">
        <strong>{{ card.title }}</strong>
        <span>{{ card.text }}</span>
      </article>
    </section>
  </main>
</template>

<style scoped>
.profile-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 56px;
}

.profile-hero,
.edit-panel,
.account-card {
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.profile-hero {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  gap: 20px;
  align-items: center;
  padding: 26px;
}

.avatar-shell {
  display: grid;
  place-items: center;
}

.avatar,
.avatar-image {
  width: 84px;
  height: 84px;
  border-radius: 28px;
}

.avatar {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #00a878, #20b8ad);
  color: #fff;
  font-size: 36px;
  font-weight: 900;
}

.avatar-image {
  object-fit: cover;
  border: 1px solid rgba(15, 118, 110, 0.12);
}

.hero-copy {
  min-width: 0;
}

.eyebrow,
h1 {
  margin: 0;
}

.eyebrow {
  color: var(--primary-strong, var(--primary));
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  color: var(--text-strong);
  font-size: clamp(28px, 5vw, 44px);
}

.profile-hero span {
  display: block;
  color: var(--text-muted);
  margin-top: 4px;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  margin-top: 12px;
}

.hero-meta small {
  color: var(--text-muted);
  font-size: 13px;
}

.role-pill {
  display: inline-block;
  border-radius: 999px;
  background: #e8faf6;
  color: #0f766e;
  padding: 6px 10px;
  text-transform: lowercase;
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

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.ghost-button {
  background: #e6fffb;
  color: #0f766e;
}

.alert {
  border-radius: 14px;
  font-weight: 800;
  margin: 18px 0 0;
  padding: 14px;
}

.alert.success {
  background: #f0fdf4;
  color: #15803d;
}

.alert.error {
  background: #fef2f2;
  color: #dc2626;
}

.edit-panel {
  margin-top: 20px;
  padding: 24px;
}

.edit-header h2,
.edit-header p {
  margin: 0;
}

.edit-header h2 {
  color: var(--text-strong);
}

.edit-header p {
  color: var(--text-muted);
  margin-top: 6px;
}

.profile-form {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;
}

.avatar-editor,
.field-grid {
  display: grid;
  gap: 14px;
}

.avatar-editor {
  align-content: start;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(232, 250, 246, 0.9), rgba(255, 255, 255, 0.95));
  border: 1px solid rgba(15, 118, 110, 0.12);
}

.avatar-preview-card {
  display: grid;
  place-items: center;
}

.avatar-preview {
  width: 180px;
  height: 180px;
  border-radius: 32px;
  object-fit: cover;
  background: var(--surface-soft);
  border: 1px solid var(--border);
}

.fallback-avatar {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #00a878, #20b8ad);
  color: #fff;
  font-size: 56px;
  font-weight: 900;
}

.field-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-form label,
.upload-field {
  display: grid;
  gap: 8px;
  color: var(--text-strong);
  font-weight: 900;
}

.profile-form input,
.profile-form textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 12px 14px;
  font: inherit;
}

.profile-form input {
  min-height: 48px;
}

.profile-form textarea {
  min-height: 132px;
  resize: vertical;
}

.profile-form input:disabled {
  opacity: 0.75;
}

.full-span {
  grid-column: 1 / -1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.account-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 22px;
}

.account-grid.loading {
  opacity: 0.72;
}

.account-card {
  cursor: pointer;
  display: grid;
  gap: 8px;
  min-height: 124px;
  padding: 18px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.account-card:hover {
  border-color: var(--primary);
  box-shadow: 0 16px 34px rgba(15, 118, 110, 0.12);
  transform: translateY(-3px);
}

.account-card strong {
  color: var(--text-strong);
  font-size: 18px;
}

.account-card span {
  color: var(--text-muted);
  line-height: 1.55;
}

@media (max-width: 920px) {
  .profile-form {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .profile-hero,
  .field-grid,
  .account-grid {
    grid-template-columns: 1fr;
  }

  .profile-hero {
    justify-items: start;
  }

  .form-actions {
    justify-content: stretch;
  }

  .form-actions button {
    width: 100%;
  }

  .profile-hero,
  .edit-panel {
    border-radius: 16px;
    padding: 18px;
  }

  .avatar-preview {
    width: min(180px, 58vw);
    height: min(180px, 58vw);
  }
}
</style>
