<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../utils/api";
import { loginWithSocialProvider } from "../utils/socialLogin";

const router = useRouter();
const socialLoading = ref("");
const statusLoading = ref(true);
const error = ref("");
const oauthStatus = ref({});

const socialProviders = [
  { id: "line", label: "LINE Login", subtitle: "เข้าสู่ระบบด้วยบัญชี LINE", className: "line" },
  {
    id: "facebook",
    label: "Facebook Login",
    subtitle: "เข้าสู่ระบบด้วยบัญชี Facebook",
    className: "facebook",
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

const goToAccountLogin = () => {
  router.push("/login/account");
};

const goToRegister = () => {
  router.push("/register");
};

onMounted(loadOAuthStatus);
</script>

<template>
  <div class="login-page">
    <section class="login-card">
      <div class="login-head">
        <p class="eyebrow">Read and Voice</p>
        <h1>เข้าสู่ระบบ</h1>
        <p>เลือกช่องทางที่ต้องการเพื่อเข้าใช้งานคลังหนังสือของคุณ</p>
      </div>

      <div class="social-list">
        <button
          v-for="provider in socialProviders"
          :key="provider.id"
          class="social-btn"
          :class="[
            provider.className,
            { unconfigured: !providerStatus[provider.id]?.configured && !statusLoading },
          ]"
          :disabled="!!socialLoading || statusLoading"
          @click="socialLogin(provider.id)"
        >
          <span class="provider-mark">
            {{ provider.id === "line" ? "LINE" : "f" }}
          </span>
          <span class="provider-copy">
            <strong>
              {{
                socialLoading === provider.id
                  ? "กำลังพาไปเข้าสู่ระบบ..."
                  : provider.label
              }}
            </strong>
            <small>
              {{
                !providerStatus[provider.id]?.configured && !statusLoading
                  ? "ยังไม่ได้ตั้งค่าใน backend/.env"
                  : provider.subtitle
              }}
            </small>
          </span>
        </button>
      </div>

      <div class="divider">
        <span>หรือ</span>
      </div>

      <button class="account-btn" @click="goToAccountLogin">
        เข้าสู่ระบบด้วย Read and Voice Account
      </button>

      <p class="register-text">
        ยังไม่มีบัญชี?
        <button type="button" @click="goToRegister">สมัครสมาชิก</button>
      </p>

      <p v-if="error" class="error-text">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: calc(100vh - 140px);
  background: var(--bg);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 28px 16px 40px;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 460px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 28px;
}

.login-head {
  text-align: center;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--primary-strong);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0;
}

.login-head h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 28px;
  font-weight: 900;
}

.login-head p:not(.eyebrow) {
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.7;
}

.social-list {
  display: grid;
  gap: 12px;
}

.social-btn {
  width: 100%;
  min-height: 58px;
  border: 1px solid var(--border);
  border-radius: 8px;
  display: grid;
  grid-template-columns: 46px 1fr;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  text-align: left;
  transition: 0.2s ease;
}

.social-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.social-btn:disabled {
  cursor: not-allowed;
  opacity: 0.72;
  transform: none;
  box-shadow: none;
}

.provider-mark {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.86);
  font-size: 14px;
  font-weight: 900;
}

.provider-copy {
  display: grid;
  gap: 2px;
}

.provider-copy strong {
  color: inherit;
  font-size: 16px;
  font-weight: 900;
}

.provider-copy small {
  color: inherit;
  opacity: 0.88;
  font-size: 12px;
  font-weight: 700;
}

.line {
  background: var(--primary);
  color: var(--on-primary);
}

.facebook {
  background: var(--secondary);
  color: white;
}

.unconfigured {
  filter: grayscale(0.25);
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 800;
}

.divider::before,
.divider::after {
  content: "";
  height: 1px;
  flex: 1;
  background: var(--border);
}

.account-btn {
  width: 100%;
  min-height: 52px;
  border-radius: 8px;
  border: 2px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
}

.register-text {
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  margin: 18px 0 0;
}

.register-text button {
  border: 0;
  background: transparent;
  color: var(--primary-strong);
  font-weight: 900;
  cursor: pointer;
  padding: 0 0 0 4px;
}

.error-text {
  color: var(--danger);
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.22);
  border-radius: 8px;
  font-weight: 800;
  margin: 14px 0 0;
  padding: 10px 12px;
  line-height: 1.6;
}

@media (max-width: 520px) {
  .login-card {
    padding: 22px 16px;
  }
}
</style>
