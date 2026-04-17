<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { loginWithSocialProvider } from "../utils/socialLogin";

const router = useRouter();
const loading = ref(false);
const error = ref("");

const login = async () => {
  error.value = "";
  loading.value = true;

  try {
    await loginWithSocialProvider(router, "google");
  } catch (err: any) {
    error.value = err.response?.data?.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <main class="social-page">
    <section class="card">
      <h1>Google Login</h1>
      <p>เชื่อมบัญชี Google เพื่อเข้าใช้งาน Read and Voice</p>

      <button class="btn primary" type="button" :disabled="loading" @click="login">
        {{ loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google" }}
      </button>
      <button class="btn" type="button" @click="router.push('/login')">
        กลับหน้า Login
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </main>
</template>

<style scoped>
.social-page {
  min-height: calc(100vh - 140px);
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: 24px;
}
.card {
  display: grid;
  gap: 14px;
  width: min(520px, 100%);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
}
h1 {
  margin: 0;
  color: var(--text-strong);
}
p {
  margin: 0;
  color: var(--text-muted);
}
.btn {
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-strong);
  cursor: pointer;
  font-weight: 900;
  padding: 10px 14px;
}
.btn.primary {
  background: #ffffff;
  border: 1px solid var(--border);
  color: var(--text-strong);
}
.btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
.error {
  color: var(--danger);
  font-weight: 800;
}
</style>
