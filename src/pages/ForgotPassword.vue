<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../utils/api";

const route = useRoute();
const router = useRouter();

const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const previewResetUrl = ref("");

const resetToken = computed(() => String(route.query.token || "").trim());
const isResetMode = computed(() => resetToken.value.length > 0);

async function submitRequest() {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  previewResetUrl.value = "";

  try {
    const { data } = await api.post("/auth/forgot-password", {
      email: email.value,
    });

    successMessage.value =
      data?.message ||
      "สร้างคำขอรีเซ็ตรหัสผ่านสำเร็จ";
    previewResetUrl.value = String(data?.reset_url || "");
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "ไม่สามารถสร้างคำขอรีเซ็ตรหัสผ่านได้";
  } finally {
    loading.value = false;
  }
}

async function submitReset() {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = "รหัสผ่านไม่ตรงกัน";
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const { data } = await api.post("/auth/reset-password", {
      token: resetToken.value,
      password: password.value,
    });

    successMessage.value =
      data?.message || "รีเซ็ตรหัสผ่านสำเร็จ";

    window.setTimeout(() => {
      router.push("/login");
    }, 1200);
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "ไม่สามารถรีเซ็ตรหัสผ่านได้";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="forgot-page">
    <section class="forgot-card">
      <p class="eyebrow">กู้คืนบัญชี</p>
      <h1>{{ isResetMode ? "ตั้งรหัสผ่านใหม่" : "ลืมรหัสผ่าน" }}</h1>
      <p class="intro">
        {{
          isResetMode
            ? "ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ หลังบันทึกแล้วระบบจะพากลับไปหน้าเข้าสู่ระบบ"
            : "กรอกอีเมลของบัญชี ระบบจะสร้างคำขอรีเซ็ตรหัสผ่านให้ทีมงานตรวจสอบและส่งลิงก์ให้คุณ"
        }}
      </p>

      <form v-if="!isResetMode" class="forgot-form" @submit.prevent="submitRequest">
        <label>
          <span>อีเมล</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
          />
        </label>

        <button type="submit" :disabled="loading">
          {{ loading ? "กำลังส่งคำขอ..." : "ส่งคำขอรีเซ็ตรหัสผ่าน" }}
        </button>
      </form>

      <form v-else class="forgot-form" @submit.prevent="submitReset">
        <label>
          <span>รหัสผ่านใหม่</span>
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="6"
            placeholder="อย่างน้อย 6 ตัวอักษร"
            required
          />
        </label>

        <label>
          <span>ยืนยันรหัสผ่าน</span>
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            minlength="6"
            placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
            required
          />
        </label>

        <button type="submit" :disabled="loading">
          {{ loading ? "กำลังบันทึก..." : "รีเซ็ตรหัสผ่าน" }}
        </button>
      </form>

      <div v-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
      <div v-if="successMessage" class="state-box success">
        <strong>{{ successMessage }}</strong>
        <a
          v-if="previewResetUrl"
          class="preview-link"
          :href="previewResetUrl"
        >
          เปิดลิงก์รีเซ็ต
        </a>
      </div>

      <div class="actions">
        <button type="button" class="ghost" @click="router.push('/login')">
          กลับหน้าเข้าสู่ระบบ
        </button>
        <button
          v-if="isResetMode"
          type="button"
          class="ghost"
          @click="router.push('/forgot-password')"
        >
          สร้างลิงก์รีเซ็ตอีกครั้ง
        </button>
        <button
          v-else
          type="button"
          class="ghost"
          @click="router.push('/register')"
        >
          สมัครสมาชิก
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.forgot-page {
  min-height: calc(100vh - 140px);
  min-height: calc(100dvh - 140px);
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top left, rgba(0, 168, 120, 0.12), transparent 32%),
    var(--bg);
  padding: var(--page-block, 32px) var(--page-gutter, 18px);
}

.forgot-card {
  width: min(520px, 100%);
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 30px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong, var(--primary));
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 34px;
}

.intro {
  color: var(--text-muted);
  line-height: 1.7;
}

.forgot-form,
label {
  display: grid;
  gap: 10px;
}

label span {
  color: var(--text-strong);
  font-weight: 900;
}

input {
  min-height: 50px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 0 14px;
  font-size: 16px;
}

button {
  min-height: 46px;
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
  opacity: 0.7;
}

.state-box {
  display: grid;
  gap: 8px;
  border-radius: 14px;
  line-height: 1.7;
  margin-top: 16px;
  padding: 16px;
}

.state-box.success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.state-box.error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.preview-link {
  color: inherit;
  font-weight: 800;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 22px;
}

.ghost {
  background: #e8faf6;
  color: #0f766e;
}

@media (max-width: 560px) {
  .forgot-page {
    place-items: start center;
    min-height: calc(100dvh - 92px);
    padding-block: 10px 18px;
  }

  .forgot-card {
    width: min(100%, 320px);
    border-radius: 12px;
    padding: 12px 10px;
  }

  .eyebrow {
    margin-bottom: 4px;
    font-size: 10px;
  }

  h1 {
    font-size: 21px;
    line-height: 1.15;
  }

  .intro,
  .state-box {
    font-size: 12px;
    line-height: 1.45;
  }

  .forgot-form,
  label {
    gap: 6px;
  }

  label span {
    font-size: 12px;
  }

  input,
  button {
    min-height: 38px;
    border-radius: 8px;
    font-size: 13px;
    padding-inline: 9px;
  }

  .state-box {
    margin-top: 10px;
    padding: 10px;
  }

  .actions,
  .actions button {
    width: 100%;
  }

  .actions {
    gap: 7px;
    margin-top: 12px;
  }
}
</style>
