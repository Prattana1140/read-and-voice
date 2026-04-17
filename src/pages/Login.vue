<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../utils/api";
import { saveAuth } from "../utils/auth";
import { redirectAfterLogin } from "../utils/loginRedirect";
import { loginWithSocialProvider } from "../utils/socialLogin";
import logoUrl from "../assets/Logo-transparent.png";

const router = useRouter();

const email = ref(localStorage.getItem("rememberedEmail") || "");
const password = ref("");
const rememberMe = ref(!!localStorage.getItem("rememberedEmail"));
const showPassword = ref(false);

const loading = ref(false);
const socialLoading = ref("");
const statusLoading = ref(true);
const error = ref("");
const oauthStatus = ref({});

const socialProviders = [
  {
    id: "facebook",
    label: "Facebook",
    icon: "f",
    className: "facebook",
  },
  {
    id: "line",
    label: "LINE",
    icon: "LINE",
    className: "line",
  },
];

const providerStatus = computed(() => {
  return socialProviders.reduce((statusMap, provider) => {
    statusMap[provider.id] = oauthStatus.value[provider.id] || {
      configured: false,
      callbackUrl: "",
      requiredEnv: [],
    };
    return statusMap;
  }, {});
});

const loadOAuthStatus = async () => {
  statusLoading.value = true;

  try {
    const res = await api.get("/api/auth/oauth/status");
    oauthStatus.value = (res.data.providers || []).reduce((statusMap, provider) => {
      statusMap[provider.provider] = provider;
      return statusMap;
    }, {});
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

    await redirectAfterLogin(router, user);
  } catch (err) {
    error.value =
      err?.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    loading.value = false;
  }
};

const socialLogin = async (provider) => {
  error.value = "";

  if (!providerStatus.value[provider]?.configured) {
    const required = providerStatus.value[provider]?.requiredEnv || [];
    error.value = required.length
      ? `ยังไม่ได้ตั้งค่า ${required.join(", ")} ใน backend/.env`
      : "ยังไม่ได้ตั้งค่า OAuth provider นี้";
    return;
  }

  socialLoading.value = provider;

  try {
    await loginWithSocialProvider(router, provider);
  } catch (err) {
    error.value =
      err?.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
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

onMounted(loadOAuthStatus);
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <div class="login-brand">
        <img :src="logoUrl" alt="Read and Voice Logo" class="brand-logo" />
      </div>

      <h1 class="login-title">เข้าสู่ระบบ</h1>

      <form class="login-form" @submit.prevent="handleLogin">
        <input
          v-model="email"
          type="email"
          placeholder="อีเมลของฉัน"
          class="login-input"
          autocomplete="email"
        />

        <div class="password-field">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="รหัสผ่าน"
            class="login-input"
            autocomplete="current-password"
          />
          <button
            type="button"
            class="toggle-password"
            :aria-label="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? "🙈" : "👁" }}
          </button>
        </div>

        <div class="login-options">
          <label class="remember-me">
            <input v-model="rememberMe" type="checkbox" />
            <span>จำและลงชื่อเข้าใช้</span>
          </label>

          <button type="button" class="forgot-link" @click="goToForgotPassword">
            ลืมรหัสผ่าน
          </button>
        </div>

        <button class="login-submit" type="submit" :disabled="loading || !!socialLoading">
          {{ loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ" }}
        </button>
      </form>

      <div class="social-divider">
        <span>เข้าสู่ระบบ / สมัครสมาชิก ผ่าน social network</span>
      </div>

      <div class="social-buttons">
        <button
          v-for="provider in socialProviders"
          :key="provider.id"
          class="social-btn"
          :class="provider.className"
          type="button"
          :disabled="loading || !!socialLoading || statusLoading"
          :aria-label="`เข้าสู่ระบบด้วย ${provider.label}`"
          @click="socialLogin(provider.id)"
        >
          <span class="social-icon" :class="provider.className">
            {{ provider.icon }}
          </span>
        </button>
      </div>

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

      <p v-if="error" class="login-error">{{ error }}</p>
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
  padding-right: 52px;
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
  font-size: 16px;
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

.login-submit:disabled {
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

.social-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.social-btn {
  width: 50px;
  height: 50px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.social-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.social-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.social-icon {
  font-weight: 900;
  line-height: 1;
}

.social-icon.facebook {
  color: #1877f2;
  font-size: 20px;
}

.social-icon.line {
  color: #06c755;
  font-size: 11px;
  letter-spacing: 0.3px;
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