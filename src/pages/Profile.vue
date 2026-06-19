<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";
import { getUser, saveAuth } from "../utils/auth";
import { useI18n } from "../utils/i18n";

type ProfileForm = {
  username: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  birth_date: string;
  visual_impairment_status: string;
  uses_screen_reader: boolean;
  assistive_technology: string;
  preferred_reading_mode: string;
  province: string;
  bio: string;
  avatar_url: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileResponse = {
  id: number;
  name: string;
  email: string;
  role?: string;
  status?: string;
  created_at?: string;
  avatar_url?: string;
  username?: string;
  phone?: string;
  gender?: string;
  birth_date?: string | null;
  age?: number | null;
  age_verified?: boolean;
  visual_impairment_status?: string;
  uses_screen_reader?: boolean;
  assistive_technology?: string;
  preferred_reading_mode?: string;
  province?: string;
  bio?: string;
};

type BuffetItem = {
  id: number;
  title: string | null;
  status: string | null;
  payment_status: string | null;
  end_at: string | null;
};

const router = useRouter();
const { t } = useI18n();
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const errorMessage = ref("");
const isEditOpen = ref(false);
const selectedAvatarFile = ref<File | null>(null);
const selectedAvatarPreview = ref("");
const removeAvatar = ref(false);
const profileMeta = ref<ProfileResponse | null>(null);
const isMembershipActive = ref(false);
const membershipBadgeLabel = ref("สมาชิกพิเศษ");

const form = reactive<ProfileForm>({
  username: "",
  name: "",
  email: "",
  phone: "",
  gender: "prefer_not_to_say",
  birth_date: "",
  visual_impairment_status: "not_specified",
  uses_screen_reader: false,
  assistive_technology: "",
  preferred_reading_mode: "both",
  province: "",
  bio: "",
  avatar_url: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const accountCards = [
  { title: "รายการที่อยากได้", text: "หนังสือที่คุณบันทึกไว้เพื่อกลับมาอ่านหรือซื้อภายหลัง", to: "/wishlist" },
  { title: "ชั้นหนังสือของฉัน", text: "หนังสือที่ซื้อแล้วหรือมีสิทธิ์อ่าน", to: "/my-library" },
  { title: "ตะกร้า", text: "รายการหนังสือและตอนที่รอชำระด้วยคอยน์", to: "/cart" },
  { title: "ประวัติคำสั่งซื้อ", text: "ดูรายการซื้อและสถานะการชำระเงินที่ผ่านมา", to: "/orders/history" },
  { title: "กระเป๋าคอยน์", text: "เติมคอยน์และดูประวัติธุรกรรม", to: "/coin-wallet" },
  { title: "สมาชิกพิเศษ", text: "สมัครหรือดูสถานะแพ็กเกจรายเดือน", to: "/subscription-plans" },
  { title: "การแจ้งเตือน", text: "ดูตอนใหม่จากนักเขียนที่คุณติดตามและอัปเดตสำคัญ", to: "/account/notifications" },
  { title: "รายการที่ติดตาม", text: "ดูหนังสือ ผู้เขียน หรือหมวดที่ติดตาม", to: "/account/following" },
  { title: "โค้ดของขวัญ", text: "ตรวจสอบโค้ดของขวัญที่ได้รับ", to: "/account/gift-codes" },
  { title: "Buffet ของฉัน", text: "ดูประวัติและสถานะ subscription", to: "/account/buffet" },
  { title: "อุปกรณ์ของฉัน", text: "ดูอุปกรณ์ที่ผูกกับบัญชี", to: "/account/devices" },
  { title: "สิทธิพิเศษ", text: "ดู benefits และสิทธิประโยชน์", to: "/account/benefits" },
  { title: "รีวิวของฉัน", text: "ดูรีวิวและคะแนนที่เคยให้", to: "/account/reviews" },
  { title: "ยืนยันอายุ", text: "ส่งคำขอยืนยันอายุสำหรับเนื้อหาที่จำกัด", to: "/account/age-verification" },
];

const currentUser = computed(() => getUser());
const displayName = computed(() => form.name || currentUser.value?.name || "Read and Voice User");
const roleLabel = computed(() => {
  const role = String(profileMeta.value?.role || currentUser.value?.role || "user")
    .trim()
    .toLowerCase();

  if (role === "superadmin") return t("account.role.superadmin");
  if (role === "admin") return t("account.role.admin");
  if (role === "writer") return t("account.role.writer");
  return t("account.role.user");
});
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
const calculatedAge = computed(() => {
  if (!form.birth_date) return null;

  const birth = new Date(`${form.birth_date}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
});
const accessibilitySummary = computed(() => {
  if (form.uses_screen_reader) return "เปิดโหมดช่วยอ่านจากการใช้โปรแกรมอ่านหน้าจอ";
  if (["blind", "low_vision", "other"].includes(form.visual_impairment_status)) {
    return "เหมาะกับโหมดช่วยอ่านและการเข้าถึง";
  }
  return "ยังไม่ได้เปิดโหมดช่วยอ่านอัตโนมัติ";
});

function toDateInputValue(value?: string | null) {
  if (!value) return "";

  const raw = String(value);
  const dateOnly = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return dateOnly;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function syncForm(data?: Partial<ProfileResponse> | null) {
  form.username = data?.username || currentUser.value?.username || "";
  form.name = data?.name || currentUser.value?.name || "";
  form.email = data?.email || currentUser.value?.email || "";
  form.phone = data?.phone || "";
  form.gender = data?.gender || currentUser.value?.gender || "prefer_not_to_say";
  form.birth_date = toDateInputValue(data?.birth_date || currentUser.value?.birth_date || "");
  form.visual_impairment_status =
    data?.visual_impairment_status ||
    currentUser.value?.visual_impairment_status ||
    "not_specified";
  form.uses_screen_reader = Boolean(
    data?.uses_screen_reader || currentUser.value?.uses_screen_reader,
  );
  form.assistive_technology =
    data?.assistive_technology || currentUser.value?.assistive_technology || "";
  form.preferred_reading_mode =
    data?.preferred_reading_mode || currentUser.value?.preferred_reading_mode || "both";
  form.province = data?.province || currentUser.value?.province || "";
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

async function loadMembershipStatus() {
  try {
    const { data } = await api.get("/account/buffet");
    const items = Array.isArray(data?.items) ? (data.items as BuffetItem[]) : [];
    const activeItem = items.find(
      (item) => item.status === "active" || item.payment_status === "paid",
    );

    isMembershipActive.value = Boolean(activeItem);
    membershipBadgeLabel.value = activeItem?.title?.trim() || "สมาชิกพิเศษ";
  } catch {
    isMembershipActive.value = false;
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

function validateProfileForm(name: string, email: string) {
  if (!name || !email) {
    return "กรุณากรอกชื่อและอีเมล";
  }

  if (form.username.trim() && !/^[A-Za-z0-9._@-]{4,32}$/.test(form.username.trim())) {
    return "ยูสเซอร์เนมต้องมี 4-32 ตัวอักษร และใช้ได้เฉพาะ A-Z, a-z, 0-9, ., _, @, -";
  }

  if (form.birth_date) {
    if (calculatedAge.value === null || calculatedAge.value < 0) {
      return "กรุณาเลือกวันเกิดที่ถูกต้อง";
    }

    if (calculatedAge.value > 120) {
      return "กรุณาตรวจสอบวันเกิดอีกครั้ง";
    }
  }

  if (form.currentPassword || form.newPassword || form.confirmPassword) {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      return "ถ้าต้องการเปลี่ยนรหัสผ่าน กรุณากรอกทั้งรหัสผ่านปัจจุบัน รหัสผ่านใหม่ และยืนยันรหัสผ่าน";
    }

    if (form.newPassword.length < 6) {
      return "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร";
    }

    if (form.newPassword !== form.confirmPassword) {
      return "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน";
    }
  }

  return "";
}

async function saveProfile() {
  try {
    saving.value = true;
    message.value = "";
    errorMessage.value = "";

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    const validationMessage = validateProfileForm(name, email);
    if (validationMessage) {
      errorMessage.value = validationMessage;
      return;
    }

    const payload = new FormData();
    payload.append("name", name);
    payload.append("email", email);
    payload.append("username", form.username.trim());
    payload.append("phone", form.phone.trim());
    payload.append("gender", form.gender);
    payload.append("birth_date", form.birth_date);
    payload.append("visual_impairment_status", form.visual_impairment_status);
    payload.append("uses_screen_reader", form.uses_screen_reader ? "true" : "false");
    payload.append("assistive_technology", form.assistive_technology.trim());
    payload.append("preferred_reading_mode", form.preferred_reading_mode);
    payload.append("province", form.province.trim());
    payload.append(
      "accessibility_mode",
      form.uses_screen_reader ||
        ["blind", "low_vision", "other"].includes(form.visual_impairment_status)
        ? "true"
        : "false",
    );
    payload.append("bio", form.bio.trim());
    payload.append("avatar_url", form.avatar_url.trim());
    payload.append("remove_avatar", removeAvatar.value ? "true" : "false");

    if (form.currentPassword) {
      payload.append("currentPassword", form.currentPassword);
    }

    if (form.newPassword) {
      payload.append("newPassword", form.newPassword);
    }

    if (form.confirmPassword) {
      payload.append("confirmPassword", form.confirmPassword);
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
        username: profile?.username || "",
        phone: profile?.phone || "",
        gender: profile?.gender || "",
        birth_date: profile?.birth_date || null,
        age_verified: profile?.age_verified || false,
        visual_impairment_status: profile?.visual_impairment_status || "not_specified",
        uses_screen_reader: profile?.uses_screen_reader || false,
        assistive_technology: profile?.assistive_technology || "",
        preferred_reading_mode: profile?.preferred_reading_mode || "both",
        province: profile?.province || "",
        bio: profile?.bio || "",
        created_at: profile?.created_at || user.created_at,
      });
    }

    form.currentPassword = "";
    form.newPassword = "";
    form.confirmPassword = "";
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

onMounted(() => {
  loadProfile();
  loadMembershipStatus();
});
onUnmounted(resetAvatarSelection);
</script>

<template>
  <main class="profile-page">
    <section class="profile-hero">
      <div class="avatar-shell" :class="{ 'avatar-shell--member': isMembershipActive }">
        <img v-if="profilePreviewUrl" :src="profilePreviewUrl" alt="รูปโปรไฟล์" class="avatar-image" />
        <div v-else class="avatar" aria-hidden="true">
          {{ displayName.slice(0, 1).toUpperCase() }}
        </div>
      </div>
      <div class="hero-copy">
        <h1>{{ displayName }}</h1>
        <span>{{ form.email || "กำลังโหลดอีเมล..." }}</span>
        <div class="hero-meta">
          <strong class="role-pill">{{ roleLabel }}</strong>
          <strong v-if="isMembershipActive" class="membership-pill">
            {{ membershipBadgeLabel }}
          </strong>
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
          <div
            class="avatar-preview-card"
            :class="{ 'avatar-preview-card--member': isMembershipActive }"
          >
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
            <span>หรือใส่ลิงก์รูปภาพ</span>
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

        <div class="form-main">
          <section class="form-section">
            <div class="section-heading">
              <h3>ข้อมูลบัญชี</h3>
              <p>ข้อมูลส่วนนี้ใช้แสดงในระบบและใช้ติดต่อกลับเมื่อจำเป็น</p>
            </div>

            <div class="field-grid">
              <label>
                <span>ยูสเซอร์เนม</span>
                <input v-model="form.username" type="text" autocomplete="username" placeholder="readvoice_user" />
                <small>4-32 chars [A-Z, a-z, 0-9, ., _, @, -]</small>
              </label>

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
                <span>เพศ</span>
                <select v-model="form.gender">
                  <option value="prefer_not_to_say">ไม่เปิดเผย</option>
                  <option value="female">หญิง</option>
                  <option value="male">ชาย</option>
                  <option value="other">อื่น ๆ</option>
                </select>
              </label>

              <label>
                <span>จังหวัด</span>
                <input v-model="form.province" type="text" autocomplete="address-level1" placeholder="จังหวัดที่อาศัยอยู่" />
              </label>

              <label>
                <span>สถานะบัญชี</span>
                <input :value="profileMeta?.status || 'active'" type="text" disabled />
              </label>

              <label class="full-span">
                <span>แนะนำตัว</span>
                <textarea
                  v-model="form.bio"
                  rows="4"
                  maxlength="2000"
                  placeholder="บอกสั้น ๆ ว่าคุณชอบอ่านหรือฟังแนวไหน"
                />
              </label>
            </div>
          </section>

          <section class="form-section">
            <div class="section-heading">
              <h3>ข้อมูลอายุและการเข้าถึง</h3>
              <p>ใช้ช่วยยืนยันอายุและปรับประสบการณ์อ่าน/ฟังให้เหมาะกับผู้ใช้งาน</p>
            </div>

            <div class="field-grid">
              <label>
                <span>วันเกิด</span>
                <input v-model="form.birth_date" type="date" autocomplete="bday" />
              </label>

              <div class="age-card">
                <span>อายุปัจจุบัน</span>
                <strong>{{ calculatedAge !== null ? `${calculatedAge} ปี` : "ยังไม่ได้ระบุ" }}</strong>
              </div>

              <label>
                <span>สถานะการมองเห็น</span>
                <select v-model="form.visual_impairment_status">
                  <option value="not_specified">ยังไม่ได้ระบุ</option>
                  <option value="none">ไม่ได้เป็นผู้พิการทางสายตา</option>
                  <option value="blind">ตาบอด</option>
                  <option value="low_vision">สายตาเลือนราง</option>
                  <option value="other">มีข้อจำกัดด้านการมองเห็นอื่น ๆ</option>
                  <option value="prefer_not_to_say">ไม่ประสงค์ระบุ</option>
                </select>
              </label>

              <label>
                <span>รูปแบบการอ่านที่ต้องการ</span>
                <select v-model="form.preferred_reading_mode">
                  <option value="both">อ่านและฟัง</option>
                  <option value="ebook">อ่านเป็นหลัก</option>
                  <option value="audio">ฟังเป็นหลัก</option>
                  <option value="not_sure">ยังไม่แน่ใจ</option>
                </select>
              </label>

              <label class="checkbox-card full-span">
                <input v-model="form.uses_screen_reader" type="checkbox" />
                <span>
                  ใช้โปรแกรมอ่านหน้าจอหรือเทคโนโลยีช่วยอ่าน
                  <small>{{ accessibilitySummary }}</small>
                </span>
              </label>

              <label class="full-span">
                <span>เครื่องมือช่วยอ่านที่ใช้</span>
                <input
                  v-model="form.assistive_technology"
                  type="text"
                  placeholder="เช่น TalkBack, VoiceOver, NVDA"
                />
              </label>
            </div>
          </section>

          <section class="password-panel">
            <div class="section-heading">
              <h3>เปลี่ยนรหัสผ่าน</h3>
              <p>กรอกเฉพาะเมื่อต้องการเปลี่ยนรหัสผ่าน รหัสใหม่ควรมีอย่างน้อย 6 ตัวอักษร</p>
            </div>

            <div class="password-grid">
              <label>
                <span>รหัสผ่านปัจจุบัน</span>
                <input v-model="form.currentPassword" type="password" autocomplete="current-password" />
              </label>

              <label>
                <span>รหัสผ่านใหม่</span>
                <input v-model="form.newPassword" type="password" autocomplete="new-password" />
              </label>

              <label>
                <span>ยืนยันรหัสผ่านใหม่</span>
                <input v-model="form.confirmPassword" type="password" autocomplete="new-password" />
              </label>
            </div>
          </section>
        </div>

        <div class="field-grid old-profile-fields" aria-hidden="true">
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
  position: relative;
  display: grid;
  place-items: center;
}
.avatar-shell--member {
  width: 100px;
  height: 100px;
  border: 4px solid transparent;
  border-radius: 34px;
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    conic-gradient(from 210deg, #14b8a6, #99f6e4, #ffd166, #f59e0b, #14b8a6)
      border-box;
  box-shadow:
    0 12px 28px rgba(20, 184, 166, 0.24),
    0 0 30px rgba(245, 158, 11, 0.18);
}
.avatar-shell--member::after,
.avatar-preview-card--member::after {
  content: "";
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 18px;
  height: 18px;
  border: 3px solid var(--surface);
  border-radius: 999px;
  background: linear-gradient(135deg, #ffd166, #f59e0b);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
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
  font-size: 28px;
  font-weight: 900;
}

.avatar-image {
  object-fit: cover;
  border: 1px solid rgba(15, 118, 110, 0.12);
}
.avatar-shell--member .avatar,
.avatar-shell--member .avatar-image {
  border: 3px solid #fff;
  box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.08);
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
  font-size: clamp(24px, 3.6vw, 34px);
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
.membership-pill {
  border-radius: 999px;
  padding: 7px 12px;
  background: linear-gradient(135deg, #14b8a6, #0f766e 58%, #f59e0b);
  color: #fff;
  box-shadow: 0 8px 18px rgba(15, 118, 110, 0.18);
  font-size: 13px;
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
.form-main,
.form-section,
.field-grid,
.password-panel {
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
  position: relative;
  display: grid;
  place-items: center;
}
.avatar-preview-card--member {
  width: 202px;
  height: 202px;
  border: 5px solid transparent;
  border-radius: 40px;
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    conic-gradient(from 210deg, #14b8a6, #99f6e4, #ffd166, #f59e0b, #14b8a6)
      border-box;
  box-shadow:
    0 14px 30px rgba(20, 184, 166, 0.22),
    0 0 32px rgba(245, 158, 11, 0.16);
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
  font-size: 30px;
  font-weight: 900;
}

.field-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-section,
.password-panel {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  padding: 16px;
}

.section-heading {
  display: grid;
  gap: 4px;
}

.section-heading h3,
.section-heading p {
  margin: 0;
}

.section-heading h3 {
  color: var(--text-strong);
  font-size: 18px;
}

.section-heading p {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.password-panel {
  background: linear-gradient(135deg, rgba(232, 250, 246, 0.9), rgba(255, 251, 235, 0.85));
  border-color: rgba(15, 118, 110, 0.18);
}

.password-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.age-card {
  min-height: 72px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 12px;
  background: linear-gradient(135deg, #ecfeff, #f8fafc);
  display: grid;
  align-content: center;
  gap: 4px;
  padding: 12px 14px;
}

.age-card span,
.profile-form small {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
}

.age-card strong {
  color: var(--primary-strong, var(--primary));
  font-size: 22px;
}

.checkbox-card {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 12px 14px;
}

.checkbox-card input {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  accent-color: var(--primary);
}

.checkbox-card span {
  display: grid;
  gap: 3px;
}

.old-profile-fields {
  display: none !important;
}

.profile-form label,
.upload-field {
  display: grid;
  gap: 8px;
  color: var(--text-strong);
  font-weight: 900;
}

.profile-form .checkbox-card {
  display: flex;
  align-items: center;
}

.profile-form input,
.profile-form textarea,
.profile-form select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 12px 14px;
  font: inherit;
}

.profile-form input,
.profile-form select {
  min-height: 48px;
}

.profile-form .checkbox-card input {
  width: 18px;
  min-height: auto;
  padding: 0;
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
  grid-column: 2 / -1;
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

  .form-actions {
    grid-column: auto;
  }
}

@media (max-width: 860px) {
  .profile-hero,
  .field-grid,
  .password-grid,
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

@media (max-width: 640px) {
  .profile-page {
    padding: 10px 10px 28px;
  }

  .profile-hero,
  .edit-panel {
    border-radius: 12px;
    padding: 12px 10px;
  }

  .profile-hero {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 10px;
  }

  .profile-hero > button {
    grid-column: 1 / -1;
    width: 100%;
  }

  .avatar,
  .avatar-image,
  .avatar-shell--member {
    width: 56px;
    height: 56px;
    border-radius: 18px;
  }

  h1 {
    font-size: 23px;
    line-height: 1.12;
  }

  .hero-meta,
  .edit-header p,
  .section-heading p,
  .profile-form small {
    font-size: 11px;
    line-height: 1.35;
  }

  .profile-form {
    gap: 9px;
    margin-top: 10px;
  }

  .avatar-editor,
  .form-main,
  .form-section,
  .field-grid,
  .password-grid,
  .password-panel {
    gap: 7px;
  }

  .avatar-editor,
  .form-section,
  .password-panel {
    border-radius: 10px;
    padding: 9px;
  }

  .avatar-editor {
    grid-template-columns: 66px minmax(0, 1fr);
    align-items: center;
  }

  .avatar-preview-card--member,
  .avatar-preview {
    width: 58px;
    height: 58px;
    border-radius: 16px;
  }

  .field-grid,
  .password-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .full-span,
  .checkbox-card {
    grid-column: 1 / -1;
  }

  .profile-form label,
  .profile-form .checkbox-card {
    gap: 4px;
    font-size: 11px;
    line-height: 1.25;
  }

  .profile-form input,
  .profile-form textarea,
  .profile-form select {
    min-height: 36px;
    border-radius: 8px;
    padding: 7px 8px;
    font-size: 12px;
  }

  .profile-form textarea {
    min-height: 58px;
  }

  .form-actions button {
    min-height: 38px;
    border-radius: 8px;
    font-size: 13px;
  }
}
</style>
