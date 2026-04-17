<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();

const email = ref("");
const password = ref("");
const loading = ref(false);
const showMebForm = ref(false);

const login = async () => {
  if (!email.value || !password.value) {
    alert("กรอกอีเมลและรหัสผ่าน");
    return;
  }

  loading.value = true;

  try {
    const res = await axios.post("http://localhost:3000/api/auth/login", {
      email: email.value,
      password: password.value,
    });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));

    alert("เข้าสู่ระบบสำเร็จ");
    router.push("/");
  } catch (err) {
    alert(err?.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const goToFacebookLogin = () => {
  router.push("/login/facebook");
};

const goToLineLogin = () => {
  router.push("/login/line");
};

const goToAppleLogin = () => {
  router.push("/login/apple");
};

const goToGoogleLogin = () => {
  router.push("/login/google");
};

const goToRegister = () => {
  router.push("/register");
};

const closeLogin = () => {
  router.push("/");
};

const openMebForm = () => {
  showMebForm.value = !showMebForm.value;
};
</script>

<template>
  <div class="login-page">
    <div class="login-modal">
      <button class="close-btn" @click="closeLogin">×</button>

      <div class="login-left"></div>

      <div class="login-right">
        <h1 class="title">เข้าสู่ระบบ</h1>

        <button class="social-btn facebook" @click="goToFacebookLogin">
          เข้าสู่ระบบด้วย Facebook
        </button>

        <button class="social-btn line" @click="goToLineLogin">
          เข้าสู่ระบบด้วย LINE
        </button>

        <button class="social-btn apple" @click="goToAppleLogin">
          <span class="icon"></span>
          เข้าสู่ระบบด้วย Apple
        </button>

        <button class="social-btn google" @click="goToGoogleLogin">
          <span class="google-icon">G</span>
          เข้าสู่ระบบด้วย Google
        </button>

        <button class="social-btn meb" @click="openMebForm">
          เข้าสู่ระบบด้วย MEB Account
        </button>

        <div v-if="showMebForm" class="form-box">
          <input v-model="email" type="email" placeholder="Email" />
          <input v-model="password" type="password" placeholder="Password" />

          <button class="login-btn" @click="login" :disabled="loading">
            {{ loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ" }}
          </button>
        </div>

        <p class="register-text">
          หากยังไม่มีสมัครบัญชี meb โปรด
          <span class="register-link" @click="goToRegister">สมัครสมาชิก</span>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: rgba(0, 0, 0, 0.18);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  box-sizing: border-box;
}

.login-modal {
  width: 100%;
  max-width: 980px;
  min-height: 610px;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
}

.close-btn {
  position: absolute;
  top: 14px;
  right: 16px;
  border: none;
  background: transparent;
  font-size: 38px;
  line-height: 1;
  color: #c8c8c8;
  cursor: pointer;
  z-index: 5;
}

.login-left {
  background:
    linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
  border-right: 2px solid #d9d9d9;
}

.login-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 74px 54px 48px;
}

.title {
  margin: 0 0 28px;
  font-size: 28px;
  font-weight: 800;
  color: #111;
}

.social-btn {
  width: 100%;
  max-width: 420px;
  height: 56px;
  border: none;
  border-radius: 28px;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.social-btn:hover {
  transform: translateY(-1px);
}

.facebook {
  background: #5579c7;
  color: white;
}

.line {
  background: #07c700;
  color: white;
}

.apple {
  background: #000;
  color: white;
}

.google,
.meb {
  background: white;
  color: #4a4a4a;
  border: 3px solid #d9d9d9;
  font-weight: 500;
}

.icon {
  margin-right: 8px;
  font-size: 20px;
}

.google-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  margin-right: 10px;
  font-weight: 800;
  font-size: 22px;
  color: #ea4335;
}

.form-box {
  width: 100%;
  max-width: 420px;
  margin-top: 8px;
  padding: 18px;
  border-radius: 18px;
  background: #fafbff;
  border: 1px solid #eceff6;
}

.form-box input {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid #d8dce5;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  background: white;
}

.login-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  background: #6c63ff;
  color: white;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.register-text {
  margin-top: 20px;
  font-size: 14px;
  color: #8c8c8c;
  text-align: center;
}

.register-link {
  color: #1cc7c9;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  margin-left: 4px;
}

@media (max-width: 900px) {
  .login-modal {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .login-left {
    display: none;
  }

  .login-right {
    padding: 64px 24px 32px;
  }

  .title {
    font-size: 24px;
  }
}
</style>