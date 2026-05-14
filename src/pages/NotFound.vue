<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <main class="not-found-page">
    <section class="not-found-panel">
      <p>404</p>
      <h1>ไม่พบหน้าที่ต้องการ</h1>
      <span>ลิงก์นี้อาจถูกย้าย เปลี่ยนชื่อ หรือยังไม่มีในระบบ</span>
      <div class="actions">
        <button type="button" @click="router.push('/')">กลับหน้าแรก</button>
        <button type="button" class="secondary" @click="router.push('/search')">
          ค้นหาหนังสือ
        </button>
        <button type="button" class="ghost" @click="router.push('/support')">
          ขอความช่วยเหลือ
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.not-found-page {
  min-height: 62vh;
  display: grid;
  place-items: center;
  padding: var(--page-block) var(--page-gutter);
}

.not-found-panel {
  width: min(680px, 100%);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 34px;
}

.not-found-panel p,
.not-found-panel h1,
.not-found-panel span {
  margin: 0;
}

.not-found-panel p {
  color: var(--primary);
  font-size: 18px;
  font-weight: 900;
}

.not-found-panel h1 {
  margin-top: 8px;
  color: var(--text-strong);
  font-size: 36px;
  line-height: 1.2;
}

.not-found-panel span {
  display: block;
  margin-top: 12px;
  color: var(--text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.actions button {
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

.actions .secondary {
  background: var(--secondary);
}

.actions .ghost {
  background: var(--surface-soft);
  color: var(--text-strong);
}
</style>
