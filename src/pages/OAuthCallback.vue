<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { saveAuth, type AuthUser } from "../utils/auth";
import { registerCurrentDevice } from "../utils/deviceRegistration";
import { redirectAfterLogin } from "../utils/loginRedirect";

const router = useRouter();
const error = ref("");

const parseHash = () => {
  const hash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(hash);
};

const decodeUser = (value: string): AuthUser => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const json = decodeURIComponent(
    Array.from(atob(padded))
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );

  return JSON.parse(json);
};

onMounted(async () => {
  const query = new URLSearchParams(window.location.search);
  const queryError = query.get("error");

  if (queryError) {
    error.value = queryError;
    return;
  }

  const params = parseHash();
  const token = params.get("token");
  const userPayload = params.get("user");

  if (!token || !userPayload) {
    error.value = "ไม่พบข้อมูลเข้าสู่ระบบจาก social network";
    return;
  }

  try {
    const user = decodeUser(userPayload);
    saveAuth(token, user);
    await registerCurrentDevice();
    await redirectAfterLogin(router, user);
  } catch {
    error.value = "อ่านข้อมูลเข้าสู่ระบบไม่สำเร็จ";
  }
});
</script>

<template>
  <main class="oauth-page">
    <section class="oauth-card">
      <div class="oauth-mark" :class="{ error: !!error }">
        {{ error ? "!" : "✓" }}
      </div>
      <p class="eyebrow">เข้าสู่ระบบ Read and Voice</p>
      <h1>{{ error ? "เข้าสู่ระบบไม่สำเร็จ" : "กำลังเชื่อมต่อบัญชี" }}</h1>
      <p v-if="!error">
        ระบบกำลังตรวจสอบบัญชี LINE และพาคุณไปยังหน้าที่เหมาะสม
      </p>
      <p v-else class="error-text">{{ error }}</p>
      <button v-if="error" type="button" @click="router.push('/login')">
        กลับหน้าเข้าสู่ระบบ
      </button>
    </section>
  </main>
</template>

<style scoped>
.oauth-page {
  min-height: calc(100vh - 140px);
  min-height: calc(100dvh - 140px);
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
}

.oauth-card {
  width: min(460px, 100%);
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 34px 28px;
  text-align: center;
}

.oauth-mark {
  width: 58px;
  height: 58px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
  background: #e8faf6;
  color: #0f766e;
  font-size: 30px;
  font-weight: 900;
}

.oauth-mark.error {
  background: #fef2f2;
  color: #dc2626;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong, var(--primary));
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 10px;
  color: var(--text-strong);
}

p {
  margin: 0;
  color: var(--text-muted);
}

.error-text {
  color: var(--danger);
  font-weight: 800;
}

button {
  min-height: 42px;
  margin-top: 18px;
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 10px 14px;
}

@media (max-width: 560px) {
  .oauth-page {
    place-items: start center;
  }

  .oauth-card {
    border-radius: 16px;
    padding: 26px 16px;
  }
}
</style>
