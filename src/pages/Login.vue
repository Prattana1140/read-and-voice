<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { loginWithSocialProvider } from "../utils/socialLogin";

const router = useRouter();
const socialLoading = ref("");
const error = ref("");

const socialLogin = async (provider) => {
  error.value = "";
  socialLoading.value = provider;

  try {
    await loginWithSocialProvider(router, provider);
  } catch (err) {
    error.value =
      err?.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    socialLoading.value = "";
  }
};

const goToAccountLogin = () => {
  router.push("/login/account");
};

const goToRegister = () => {
  router.push("/register");
};
</script>

<template>
  <div class="login-page">
    <div class="login-box">
      <h1 class="title">เข้าสู่ระบบ</h1>

      <button class="social-btn facebook" :disabled="!!socialLoading" @click="socialLogin('facebook')">
        {{ socialLoading === "facebook" ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Facebook" }}
      </button>

      <button class="social-btn line" :disabled="!!socialLoading" @click="socialLogin('line')">
        {{ socialLoading === "line" ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย LINE" }}
      </button>

      <button class="social-btn apple" :disabled="!!socialLoading" @click="socialLogin('apple')">
        {{ socialLoading === "apple" ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Apple" }}
      </button>

      <button class="social-btn google" :disabled="!!socialLoading" @click="socialLogin('google')">
        <span class="google-icon">G</span>
        {{ socialLoading === "google" ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google" }}
      </button>

      <button class="social-btn account" @click="goToAccountLogin">
        เข้าสู่ระบบด้วย Read and Voice Account
      </button>

      <p class="register-text">
        ยังไม่มีบัญชี?
        <span class="register-link" @click="goToRegister">สมัครสมาชิก</span>
      </p>

      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: calc(100vh - 140px);
  background: var(--bg);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 16px 32px;
  box-sizing: border-box;
}

.login-box {
  width: 100%;
  max-width: 420px;
  text-align: center;
  transform: translateY(-20px);
}

.title {
  font-size: 26px;
  font-weight: 900;
  margin: 0 0 28px;
  color: var(--text-strong);
}

.social-btn {
  width: 100%;
  min-height: 56px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 18px;
  cursor: pointer;
  transition: 0.2s ease;
}

.social-btn:hover {
  transform: translateY(-1px);
}

.social-btn:disabled {
  cursor: not-allowed;
  opacity: 0.72;
  transform: none;
}

.facebook {
  background: var(--secondary);
  color: white;
}

.line {
  background: var(--primary);
  color: var(--on-primary);
}

.apple {
  background: var(--text-strong);
  color: var(--surface);
}

.google,
.account {
  background: var(--surface);
  color: var(--text);
  border: 3px solid var(--border);
  font-weight: 700;
}

.google-icon {
  display: inline-block;
  margin-right: 10px;
  font-weight: 900;
  color: var(--primary-strong);
}

.register-text {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 8px;
}

.register-link {
  color: var(--primary-strong);
  font-weight: 800;
  cursor: pointer;
  margin-left: 4px;
}

.error-text {
  color: var(--danger);
  font-weight: 800;
  margin-top: 12px;
}
</style>
