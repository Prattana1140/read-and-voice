<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <main class="reader-legacy-page">
    <section class="notice">
      <p class="eyebrow">Read and Voice</p>
      <h1>หน้าอ่านหนังสือถูกย้ายไปใช้ Reader หลักแล้ว</h1>
      <p>
        กรุณาเลือกหนังสือจากหน้าร้านหรือคลังของฉัน เพื่อเปิดหน้าอ่านพร้อมระบบ TTS
        ที่รองรับภาษาไทยและอังกฤษ
      </p>
      <div class="actions">
        <button type="button" @click="router.push('/store')">ไปหน้าร้านหนังสือ</button>
        <button class="ghost" type="button" @click="router.push('/my-library')">
          ไปคลังของฉัน
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.reader-legacy-page {
  display: grid;
  min-height: calc(100vh - 120px);
  min-height: calc(100dvh - 120px);
  place-items: center;
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
}

.notice {
  width: min(720px, 100%);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
}

.eyebrow {
  color: var(--primary-strong);
  font-weight: 900;
  margin: 0 0 8px;
}

h1 {
  color: var(--text-strong);
  margin: 0 0 12px;
}

p {
  color: var(--text-muted);
  line-height: 1.7;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

button {
  border: 0;
  border-radius: 8px;
  background: #14b8a6;
  color: white;
  cursor: pointer;
  font-weight: 900;
  padding: 12px 16px;
}

button.ghost {
  background: #eef2ff;
  color: #3730a3;
}

@media (max-width: 560px) {
  .reader-legacy-page {
    place-items: start center;
  }

  .notice {
    padding: 22px 16px;
  }

  .actions,
  .actions button {
    width: 100%;
  }
}
</style>
