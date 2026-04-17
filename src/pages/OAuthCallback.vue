<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { saveAuth, type AuthUser } from "../utils/auth";
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
    await redirectAfterLogin(router, user);
  } catch {
    error.value = "อ่านข้อมูลเข้าสู่ระบบไม่สำเร็จ";
  }
});
</script>

<template>
  <main class="oauth-page">
    <section class="oauth-card">
      <h1>{{ error ? "เข้าสู่ระบบไม่สำเร็จ" : "กำลังเข้าสู่ระบบ" }}</h1>
      <p v-if="!error">กำลังตรวจสอบบัญชี social network ของคุณ...</p>
      <p v-else class="error">{{ error }}</p>
      <button v-if="error" type="button" @click="router.push('/login')">
        กลับหน้าเข้าสู่ระบบ
      </button>
    </section>
  </main>
</template>

<style scoped>
.oauth-page {
  min-height: calc(100vh - 140px);
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: 24px;
}

.oauth-card {
  width: min(460px, 100%);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
  text-align: center;
}

h1 {
  margin: 0 0 10px;
  color: var(--text-strong);
}

p {
  margin: 0;
  color: var(--text-muted);
}

.error {
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
</style>
