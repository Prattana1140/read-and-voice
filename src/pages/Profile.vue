<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../utils/api";
import { getUser, saveAuth } from "../utils/auth";

type ProfileForm = {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
};

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const errorMessage = ref("");
const isEditOpen = ref(false);

const form = reactive<ProfileForm>({
  name: "",
  email: "",
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
const roleLabel = computed(() => currentUser.value?.role || "user");

async function loadProfile() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/profile/me");
    form.name = data?.name || currentUser.value?.name || "";
    form.email = data?.email || currentUser.value?.email || "";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดโปรไฟล์ไม่สำเร็จ";
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
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      currentPassword: form.currentPassword || undefined,
      newPassword: form.newPassword || undefined,
    };

    if (!payload.name || !payload.email) {
      errorMessage.value = "กรุณากรอกชื่อและอีเมล";
      return;
    }

    const { data } = await api.put("/profile/me", payload);
    const user = currentUser.value;
    const token = localStorage.getItem("token");

    if (token && user) {
      saveAuth(token, {
        ...user,
        name: payload.name,
        email: payload.email,
      });
    }

    form.currentPassword = "";
    form.newPassword = "";
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
</script>

<template>
  <main class="profile-page">
    <section class="profile-hero">
      <div class="avatar" aria-hidden="true">
        {{ displayName.slice(0, 1).toUpperCase() }}
      </div>
      <div>
        <p class="eyebrow">Read and Voice Account</p>
        <h1>{{ displayName }}</h1>
        <span>{{ form.email || "กำลังโหลดอีเมล..." }}</span>
        <strong class="role-pill">{{ roleLabel }}</strong>
      </div>
      <button type="button" @click="isEditOpen = !isEditOpen">
        {{ isEditOpen ? "ปิดฟอร์ม" : "แก้ไขโปรไฟล์" }}
      </button>
    </section>

    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>

    <section v-if="isEditOpen" class="edit-panel">
      <h2>แก้ไขข้อมูลบัญชี</h2>
      <form class="profile-form" @submit.prevent="saveProfile">
        <label>
          <span>ชื่อที่แสดง</span>
          <input v-model="form.name" type="text" autocomplete="name" />
        </label>
        <label>
          <span>อีเมล</span>
          <input v-model="form.email" type="email" autocomplete="email" />
        </label>
        <label>
          <span>รหัสผ่านปัจจุบัน</span>
          <input v-model="form.currentPassword" type="password" autocomplete="current-password" />
        </label>
        <label>
          <span>รหัสผ่านใหม่</span>
          <input v-model="form.newPassword" type="password" autocomplete="new-password" />
        </label>
        <button type="submit" :disabled="saving">
          {{ saving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์" }}
        </button>
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
  padding: 32px 20px 56px;
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
  grid-template-columns: 84px 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 26px;
}

.avatar {
  width: 76px;
  height: 76px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #00a878, #20b8ad);
  color: #fff;
  font-size: 34px;
  font-weight: 900;
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

.role-pill {
  display: inline-block;
  border-radius: 999px;
  background: #e8faf6;
  color: #0f766e;
  margin-top: 10px;
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

.edit-panel h2 {
  margin: 0 0 16px;
  color: var(--text-strong);
}

.profile-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.profile-form label {
  display: grid;
  gap: 8px;
  color: var(--text-strong);
  font-weight: 900;
}

.profile-form input {
  min-height: 48px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 0 14px;
}

.profile-form button {
  align-self: end;
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

@media (max-width: 860px) {
  .profile-hero {
    grid-template-columns: 1fr;
  }

  .account-grid,
  .profile-form {
    grid-template-columns: 1fr;
  }
}
</style>
