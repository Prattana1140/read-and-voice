<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../utils/api";
import { saveAuth } from "../utils/auth";
import { announceAccessibilityMessage } from "../utils/accessibility";
import { registerCurrentDevice } from "../utils/deviceRegistration";
import { redirectAfterLogin } from "../utils/loginRedirect";
import {
  loginWithSocialProvider,
  type SocialProvider,
} from "../utils/socialLogin";
import logoUrl from "../assets/Logo-transparent.png";

const router = useRouter();
const route = useRoute();
const wasLoggedOut = route.query.loggedOut === "1";

const email = ref(wasLoggedOut ? "" : localStorage.getItem("rememberedEmail") || "");
const password = ref("");
const rememberMe = ref(wasLoggedOut ? false : !!localStorage.getItem("rememberedEmail"));
const showPassword = ref(false);

const loading = ref(false);
const socialLoading = ref<SocialProvider | "">("");
const statusLoading = ref(true);
const error = ref("");
const oauthStatus = ref<Record<string, { configured: boolean }>>({});

const lineReady = computed(() => !!oauthStatus.value.line?.configured);
const hasSocialLogin = computed(() => lineReady.value);

const socialProviderLabel: Record<SocialProvider, string> = {
  line: "LINE",
};

const isSocialProviderReady = (provider: SocialProvider) => {
  if (provider === "line") return lineReady.value;
  return false;
};

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
    await registerCurrentDevice();

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

const socialLogin = async (provider: SocialProvider) => {
  error.value = "";

  const providerName = socialProviderLabel[provider];

  if (!isSocialProviderReady(provider)) {
    error.value = `ระบบ ${providerName} ยังไม่ได้ตั้งค่า endpoint และ credentials`;
    return;
  }

  socialLoading.value = provider;

  try {
    await loginWithSocialProvider(router, provider);
  } catch (err: any) {
    error.value =
      err?.response?.data?.message ||
      `เริ่มต้นการเข้าสู่ระบบด้วย ${providerName} ไม่สำเร็จ`;
  } finally {
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

      <div v-if="hasSocialLogin" class="social-divider">
        <span>หรือ</span>
      </div>

      <div v-if="hasSocialLogin" class="social-login-list">
        <button
          v-if="lineReady"
          class="social-submit line-submit"
          type="button"
          :disabled="loading || !!socialLoading || statusLoading"
          @click="socialLogin('line')"
        >
          <span class="social-icon line-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M12 4C7.6 4 4 6.9 4 10.5c0 2.5 1.7 4.7 4.2 5.8l-.5 2.7c-.1.6.5 1 1 .7l3.4-2.1c4.4-.1 7.9-3 7.9-6.6C20 7.2 16.4 4 12 4Z"
              />
              <path
                class="line-letter"
                d="M8 9v3.2h2.1M11.3 9v3.2M13.4 12.2V9l2.1 3.2V9M17.8 9h-2v3.2h2M15.8 10.6h1.7"
              />
            </svg>
          </span>
          <strong>
            {{
              socialLoading === "line"
                ? "กำลังเชื่อมต่อ LINE..."
                : "เข้าสู่ระบบด้วย LINE"
            }}
          </strong>
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

      <p id="login-status" v-if="error" class="login-error" aria-live="assertive">{{ error }}</p>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: calc(100vh - 140px);
  min-height: calc(100dvh - 140px);
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
  max-width: 100%;
  box-sizing: border-box;
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
  font-size: 32px;
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
  font-size: 18px;
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
  font-size: 16px;
  font-weight: 800;
  min-height: 34px;
  border-radius: 999px;
  padding: 0 8px;
  line-height: 1;
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 16px;
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
  width: 100%;
  min-height: 52px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 900;
  font-size: 18px;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.login-submit:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.login-submit:disabled,
.social-submit:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.social-divider {
  position: relative;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
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

.social-login-list {
  display: grid;
  gap: 10px;
}

.social-submit {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 12px;
  color: #ffffff;
  display: grid;
  grid-template-columns: 42px 1fr 42px;
  align-items: center;
  padding: 0 14px;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  box-sizing: border-box;
}

.social-submit:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.social-submit strong {
  grid-column: 2;
  text-align: center;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
  min-width: 0;
}

.social-icon {
  grid-column: 1;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #ffffff;
  display: grid;
  place-items: center;
  justify-self: start;
  line-height: 1;
  font-weight: 900;
  flex: 0 0 auto;
}

.social-icon svg {
  width: 22px;
  height: 22px;
  display: block;
  fill: currentColor;
}

.line-submit {
  background: #06c755;
}

.line-icon {
  color: #06c755;
}

.line-letter {
  fill: none;
  stroke: #ffffff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 0.8;
}

.login-policy {
  margin: 0;
  text-align: center;
  font-size: 14px;
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
  font-size: 16px;
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
  font-size: 16px;
}

@media (max-width: 640px) {
  .login-page {
    width: 100%;
    overflow-x: hidden;
    min-height: calc(100dvh - 70px);
    place-items: start center;
    padding: 10px max(10px, env(safe-area-inset-right)) 18px max(10px, env(safe-area-inset-left));
  }

  .login-card {
    width: min(100%, 310px);
    max-width: calc(100vw - 48px);
    overflow: hidden;
    padding: 18px 14px 16px;
    border-radius: 16px;
    gap: 10px;
    box-shadow: 0 10px 28px rgba(16, 24, 40, 0.08);
  }

  .login-brand {
    margin-bottom: 0;
  }

  .brand-logo {
    width: min(86px, 30vw);
  }

  .login-title {
    font-size: 25px;
    line-height: 1.12;
  }

  .login-form {
    gap: 9px;
    min-width: 0;
  }

  .login-input {
    min-width: 0;
    min-height: 44px;
    border-radius: 11px;
    font-size: 16px;
    padding-inline: 12px;
  }

  .password-field .login-input {
    padding-right: 62px;
  }

  .toggle-password {
    right: 8px;
    background: var(--primary-soft);
    color: var(--primary-strong, var(--primary));
    min-height: 28px;
    font-size: 13px;
    padding-inline: 8px;
  }

  .login-options {
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    line-height: 1.35;
  }

  .remember-me {
    min-width: 0;
  }

  .forgot-link {
    min-height: 28px;
    line-height: 1.25;
  }

  .login-submit,
  .social-submit {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    border-radius: 11px;
    font-size: 15px;
  }

  .social-divider {
    margin-block: 0;
  }

  .social-submit {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    padding: 9px 12px;
  }

  .social-submit strong {
    text-align: left;
    font-size: 16px;
  }

  .social-icon {
    width: 30px;
    height: 30px;
  }

  .login-policy {
    font-size: 12.5px;
    line-height: 1.45;
  }

  .register-text {
    font-size: 14px;
    line-height: 1.35;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding-inline: max(10px, env(safe-area-inset-left))
      max(10px, env(safe-area-inset-right));
  }

  .login-card {
    width: min(100%, 310px);
  }

  .login-card {
    border-radius: 15px;
  }

  .brand-logo {
    width: min(78px, 28vw);
  }

  .login-title {
    font-size: 24px;
  }

  .login-options {
    display: grid;
    gap: 8px;
    font-size: 14.5px;
    justify-items: start;
  }

  .forgot-link {
    justify-self: start;
  }

  .login-submit {
    font-size: 17px;
  }

  .social-icon {
    width: 28px;
    height: 28px;
  }

  .social-icon svg {
    width: 20px;
    height: 20px;
  }
}

@media (max-width: 380px) {
  .login-card {
    padding: 20px 12px 18px;
  }

  .login-title {
    font-size: 26px;
  }

  .password-field .login-input {
    padding-right: 74px;
  }

  .toggle-password {
    font-size: 14px;
    padding-inline: 8px;
  }

  .social-submit strong {
    font-size: 15px;
  }
}

@media (max-width: 640px) and (max-height: 740px) {
  .login-page {
    padding-top: 10px;
  }

  .login-card {
    gap: 10px;
    padding-top: 18px;
    padding-bottom: 16px;
  }

  .login-brand {
    margin-bottom: 0;
  }

  .brand-logo {
    width: min(102px, 40vw);
  }

  .login-title {
    font-size: 26px;
  }

  .login-form {
    gap: 10px;
  }

  .login-input {
    min-height: 48px;
  }

  .login-submit,
  .social-submit {
    min-height: 48px;
  }

  .login-policy {
    line-height: 1.55;
  }
}
</style>
