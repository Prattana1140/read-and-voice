<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../utils/api";
import { saveAuth } from "../utils/auth";
import { announceAccessibilityMessage } from "../utils/accessibility";
import { redirectAfterLogin } from "../utils/loginRedirect";
import { loginWithSocialProvider } from "../utils/socialLogin";
import logoUrl from "../assets/Logo-transparent.png";

const router = useRouter();
const route = useRoute();
const wasLoggedOut = route.query.loggedOut === "1";

const email = ref(wasLoggedOut ? "" : localStorage.getItem("rememberedEmail") || "");
const password = ref("");
const rememberMe = ref(wasLoggedOut ? false : !!localStorage.getItem("rememberedEmail"));
const showPassword = ref(false);

const loading = ref(false);
const socialLoading = ref("");
const statusLoading = ref(true);
const error = ref("");
const oauthStatus = ref<Record<string, { configured: boolean }>>({});

const thaidReady = computed(() => !!oauthStatus.value.thaid?.configured);

const loadOAuthStatus = async () => {
  statusLoading.value = true;

  try {
    const res = await api.get("/api/auth/oauth/status");
    oauthStatus.value = (res.data.providers || []).reduce(
      (statusMap: Record<string, { configured: boolean }>, provider: any) => {
        statusMap[provider.provider] = provider;
        return statusMap;
      },
      {},
    );
  } catch {
    oauthStatus.value = {};
  } finally {
    statusLoading.value = false;
  }
};

const handleLogin = async () => {
  error.value = "";

  if (!email.value.trim() || !password.value.trim()) {
    error.value = "กรุณากรอกอีเมลและรหัสผ่าน";
    return;
  }

  loading.value = true;

  try {
    const res = await api.post("/api/auth/login", {
      email: email.value,
      password: password.value,
    });

    const { token, user } = res.data;
    saveAuth(token, user);

    if (rememberMe.value) {
      localStorage.setItem("rememberedEmail", email.value);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    announceAccessibilityMessage("เข้าสู่ระบบสำเร็จ");
    await redirectAfterLogin(router, user);
  } catch (err: any) {
    error.value =
      err?.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    loading.value = false;
  }
};

const socialLogin = async () => {
  error.value = "";

  if (!thaidReady.value) {
    error.value = "ระบบ ThaiD ยังไม่ได้ตั้งค่า endpoint และ credentials";
    return;
  }

  socialLoading.value = "thaid";

  try {
    await loginWithSocialProvider(router, "thaid");
  } catch (err: any) {
    error.value =
      err?.response?.data?.message || "เริ่มต้นการเข้าสู่ระบบด้วย ThaiD ไม่สำเร็จ";
    socialLoading.value = "";
  }
};

const goToRegister = () => {
  router.push("/register");
};

const goToForgotPassword = () => {
  router.push("/forgot-password");
};

const goToTerms = () => {
  router.push("/terms");
};

const goToPrivacyPolicy = () => {
  router.push("/privacy-policy");
};

onMounted(() => {
  if (wasLoggedOut) {
    email.value = "";
    password.value = "";
    rememberMe.value = false;
    localStorage.removeItem("rememberedEmail");
    router.replace({ name: "Login" });
  }

  loadOAuthStatus();
});

watch(error, (message) => {
  if (message) announceAccessibilityMessage(message);
});
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <div class="login-brand">
        <img :src="logoUrl" alt="Read and Voice Logo" class="brand-logo" />
      </div>

      <h1 class="login-title">เข้าสู่ระบบ</h1>

      <form
        class="login-form"
        :autocomplete="wasLoggedOut ? 'off' : 'on'"
        @submit.prevent="handleLogin"
      >
        <label class="sr-only" for="login-email">อีเมล</label>
        <input
          id="login-email"
          v-model="email"
          type="email"
          placeholder="อีเมลของฉัน"
          class="login-input"
          :autocomplete="wasLoggedOut ? 'off' : 'email'"
          aria-describedby="login-status"
        />

        <div class="password-field">
          <label class="sr-only" for="login-password">รหัสผ่าน</label>
          <input
            id="login-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="รหัสผ่าน"
            class="login-input"
            :autocomplete="wasLoggedOut ? 'new-password' : 'current-password'"
            aria-describedby="login-status"
          />
          <button
            type="button"
            class="toggle-password"
            :aria-label="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? "ซ่อน" : "แสดง" }}
          </button>
        </div>

        <div class="login-options">
          <label class="remember-me">
            <input v-model="rememberMe" type="checkbox" />
            <span>จดจำอีเมลนี้</span>
          </label>

          <button type="button" class="forgot-link" @click="goToForgotPassword">
            ลืมรหัสผ่าน
          </button>
        </div>

        <button class="login-submit" type="submit" :disabled="loading || !!socialLoading">
          {{ loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วยอีเมล" }}
        </button>
      </form>

      <div class="social-divider">
        <span>หรือ</span>
      </div>

      <button
        class="thaid-submit"
        type="button"
        :disabled="loading || !!socialLoading || statusLoading"
        @click="socialLogin"
      >
        <strong>{{ socialLoading === "thaid" ? "กำลังเชื่อมต่อ ThaiD..." : "เข้าสู่ระบบด้วย ThaiD" }}</strong>
        <small>
          {{ statusLoading
            ? "กำลังตรวจสอบสถานะการเชื่อมต่อ"
            : thaidReady
              ? "พร้อมใช้งานเมื่อระบบเชื่อมต่อ ThaiD จริง"
              : "ยังไม่ได้ตั้งค่า endpoint และ credentials ของ ThaiD" }}
        </small>
      </button>

      <p class="login-policy">
        เมื่อคุณสมัครสมาชิกถือว่ายอมรับ
        <button type="button" class="policy-link" @click="goToTerms">
          ข้อตกลงในการใช้งาน
        </button>
        และ
        <button type="button" class="policy-link" @click="goToPrivacyPolicy">
          นโยบายความเป็นส่วนตัว
        </button>
      </p>

      <p class="register-text">
        ยังไม่มีบัญชี?
        <button type="button" @click="goToRegister">สมัครสมาชิก</button>
      </p>

      <p id="login-status" v-if="error" class="login-error" aria-live="assertive">{{ error }}</p>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: calc(100vh - 140px);
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: 32px 24px;
  box-sizing: border-box;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  padding: 0;
}

.login-card {
  width: min(460px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow);
  padding: 30px 26px 24px;
  display: grid;
  gap: 16px;
}

.login-brand {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 4px;
}

.brand-logo {
  width: min(150px, 52%);
  height: auto;
  object-fit: contain;
  display: block;
}

.login-title {
  margin: 0;
  text-align: center;
  color: var(--text-strong);
  font-size: 36px;
  font-weight: 900;
  line-height: 1.1;
}

.login-form {
  display: grid;
  gap: 14px;
}

.login-input {
  width: 100%;
  min-height: 54px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 0 16px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
  font-size: 15px;
}

.login-input::placeholder {
  color: var(--text-muted);
}

.login-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
}

.password-field {
  position: relative;
}

.password-field .login-input {
  padding-right: 74px;
}

.toggle-password {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  padding: 0;
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}

.remember-me {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  cursor: pointer;
}

.remember-me input {
  accent-color: var(--primary);
}

.forgot-link {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-weight: 700;
  padding: 0;
}

.login-submit {
  min-height: 52px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 900;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.login-submit:hover:not(:disabled) {
  opacity: 0.95;
}

.login-submit:disabled,
.thaid-submit:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.social-divider {
  position: relative;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  margin-top: 2px;
}

.social-divider::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  border-top: 1px solid var(--border);
  z-index: 0;
}

.social-divider span {
  position: relative;
  z-index: 1;
  background: var(--surface);
  padding: 0 10px;
}

.thaid-submit {
  min-height: 72px;
  border-radius: 18px;
  border: 2px solid #111827;
  background: linear-gradient(180deg, #ffd60a 0%, #ffca0a 100%);
  color: #111827;
  text-align: left;
  padding: 14px 16px;
  display: grid;
  gap: 4px;
  cursor: pointer;
}

.thaid-submit strong {
  font-size: 18px;
  font-weight: 900;
}

.thaid-submit small {
  font-size: 12px;
  line-height: 1.5;
}

.login-policy {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.8;
}

.policy-link {
  border: 0;
  background: transparent;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
  padding: 0 2px;
}

.register-text {
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  margin: 0;
}

.register-text button {
  border: 0;
  background: transparent;
  color: var(--primary-strong, var(--primary));
  font-weight: 900;
  cursor: pointer;
  padding: 0 0 0 4px;
}

.login-error {
  margin: 0;
  text-align: center;
  color: var(--danger);
  font-weight: 800;
  font-size: 14px;
}

@media (max-width: 480px) {
  .login-card {
    width: 100%;
    padding: 24px 18px 20px;
    border-radius: 18px;
  }

  .brand-logo {
    width: min(130px, 58%);
  }

  .login-title {
    font-size: 30px;
  }

  .login-options {
    font-size: 12px;
  }
}
</style>
