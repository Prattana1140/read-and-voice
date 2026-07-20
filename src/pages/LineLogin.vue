<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../utils/api";
import { loginWithSocialProvider } from "../utils/socialLogin";

const router = useRouter();
const loading = ref(false);
const statusLoading = ref(false);
const error = ref("");
const oauthStatus = ref<any>(null);
const lineStatus = computed(() =>
  oauthStatus.value?.providers?.find((provider: any) => provider.provider === "line") || null,
);
const callbackUrl = computed(() => lineStatus.value?.callbackUrl || "");

async function loadOAuthStatus() {
  statusLoading.value = true;
  try {
    const { data } = await api.get("/api/auth/oauth/status");
    oauthStatus.value = data;
  } catch {
    oauthStatus.value = null;
  } finally {
    statusLoading.value = false;
  }
}

const login = async () => {
  error.value = "";
  loading.value = true;

  try {
    await loginWithSocialProvider(router, "line");
  } catch (err: any) {
    error.value = err.response?.data?.message || "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

onMounted(loadOAuthStatus);
</script>

<template>
  <main class="social-page">
    <section class="card">
      <h1>เข้าสู่ระบบด้วย LINE</h1>
      <p>เชื่อมบัญชี LINE เพื่อเข้าใช้งาน Read and Voice</p>

      <div v-if="callbackUrl || statusLoading" class="status-box">
        <strong>Callback URL ที่ต้องลงใน LINE Developers</strong>
        <code>{{ statusLoading ? "กำลังตรวจสอบ..." : callbackUrl }}</code>
      </div>

      <button class="btn primary" type="button" :disabled="loading" @click="login">
        {{ loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย LINE" }}
      </button>

      <button class="btn" type="button" @click="router.push('/login')">
        กลับหน้าเข้าสู่ระบบ
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </main>
</template>

<style scoped>
.social-page {
  min-height: calc(100vh - 140px);
  min-height: calc(100dvh - 140px);
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
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
  background: #06c755;
  color: white;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.error {
  color: var(--danger);
  font-weight: 800;
}

.status-box {
  display: grid;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 12px;
}

.status-box strong {
  color: var(--text-strong);
  font-size: 15px;
}

.status-box code {
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-family: inherit;
  font-weight: 800;
  line-height: 1.5;
}

@media (max-width: 560px) {
  .social-page {
    place-items: start center;
  }

  .card {
    padding: 22px 16px;
  }
}
</style>
