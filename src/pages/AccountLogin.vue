<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");

const login = async () => {
  errorMessage.value = "";

  const payload = {
    email: email.value.trim().toLowerCase(),
    password: password.value,
  };

  if (!payload.email || !payload.password) {
    errorMessage.value = "กรุณากรอกอีเมลและรหัสผ่านให้ครบ";
    return;
  }

  loading.value = true;

  try {
    const res = await axios.post(
      "http://localhost:3000/api/auth/login",
      payload
    );

    console.log("LOGIN SUCCESS:", res.data);

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));

    const role = res.data?.user?.role;

    if (role === "admin" || role === "superadmin") {
      router.push("/admin");
    } else if (role === "writer") {
      router.push("/writer");
    } else {
      router.push("/");
    }
  } catch (err) {
    console.error("LOGIN ERROR:", err.response?.data || err);

    errorMessage.value =
      err.response?.data?.message ||
      "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push("/login");
};

const goRegister = () => {
  router.push("/register");
};
</script>

<template>
  <div class="account-login-page">
    <form class="account-login-box" @submit.prevent="login">
      <button class="back-btn" type="button" @click="goBack">← กลับ</button>

      <h1 class="title">เข้าสู่ระบบด้วยบัญชี Read and Voice</h1>
      <p class="subtitle">
        กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ
      </p>

      <div class="form-group">
        <label for="email">อีเมล</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="กรอกอีเมล"
        />
      </div>

      <div class="form-group">
        <label for="password">รหัสผ่าน</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="กรอกรหัสผ่าน"
        />
      </div>

      <button class="login-btn" type="submit" :disabled="loading">
        {{ loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ" }}
      </button>

      <p v-if="errorMessage" class="error-text">
        {{ errorMessage }}
      </p>

      <p class="register-text">
        ยังไม่มีบัญชี?
        <span class="register-link" @click="goRegister">สมัครสมาชิก</span>
      </p>
    </form>
  </div>
</template>

<style scoped>
.account-login-page {
  min-height: calc(100vh - 140px);
  background: var(--bg);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 16px 32px;
  box-sizing: border-box;
}

.account-login-box {
  width: 100%;
  max-width: 460px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 28px;
  box-shadow: var(--shadow);
}

.back-btn {
  border: none;
  background: transparent;
  color: var(--primary-strong);
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  margin-bottom: 12px;
}

.title {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 28px;
}

.subtitle {
  margin: 0 0 22px;
  color: var(--text-muted);
  line-height: 1.6;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-strong);
}

.form-group input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-strong);
  padding: 12px 14px;
  outline: none;
  font-size: 15px;
}

.login-btn {
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 13px 16px;
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-text {
  margin-top: 14px;
  color: var(--danger);
  font-weight: 600;
}

.register-text {
  margin-top: 18px;
  color: var(--text-muted);
  text-align: center;
}

.register-link {
  color: var(--primary-strong);
  font-weight: 700;
  cursor: pointer;
  margin-left: 6px;
}
</style>
