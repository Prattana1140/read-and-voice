<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description: string;
  loading?: boolean;
  errorMessage?: string;
  empty?: boolean;
  emptyTitle?: string;
  emptyText?: string;
}>();

const emit = defineEmits<{
  (event: "back"): void;
}>();
</script>

<template>
  <main class="account-page">
    <section class="account-shell">
      <header class="account-header">
        <div>
          <p class="eyebrow">{{ eyebrow || "จัดการบัญชี" }}</p>
          <h1>{{ title }}</h1>
          <p class="description">{{ description }}</p>
        </div>

        <button type="button" class="back-btn" @click="emit('back')">กลับไปข้อมูลของฉัน</button>
      </header>

      <div v-if="loading" class="state-box">กำลังโหลดข้อมูล...</div>
      <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
      <div v-else-if="empty" class="state-box empty">
        <strong>{{ emptyTitle || "ยังไม่มีข้อมูล" }}</strong>
        <span>{{ emptyText || "เมื่อเริ่มใช้งานแล้วข้อมูลจะแสดงที่หน้านี้" }}</span>
      </div>
      <slot v-else />
    </section>
  </main>
</template>

<style scoped>
.account-page { max-width: 1120px; margin: 0 auto; padding: var(--page-block, 32px) var(--page-gutter, 20px) 56px; }
.account-shell { display: grid; gap: 20px; }
.account-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border: 1px solid var(--border); border-radius: 24px; background: var(--surface); box-shadow: var(--shadow); padding: 26px; }
.eyebrow,h1,.description { margin: 0; }
.eyebrow { color: var(--primary-strong); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
h1 { color: var(--text-strong); font-size: clamp(28px, 5vw, 42px); }
.description { max-width: 760px; color: var(--text-muted); line-height: 1.8; margin-top: 10px; }
.back-btn { min-height: 44px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-soft); color: var(--text-strong); cursor: pointer; font-weight: 900; padding: 0 16px; }
.state-box { display: grid; gap: 8px; border: 1px solid var(--border); border-radius: 18px; background: var(--surface); color: var(--text-muted); box-shadow: var(--shadow); padding: 18px; }
.state-box strong { color: var(--text-strong); }
.state-box.error { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
.state-box.empty { justify-items: start; }
@media (max-width: 760px) { .account-page { padding-inline: var(--page-gutter, 16px); } .account-header { flex-direction: column; border-radius: 18px; padding: 20px; } .back-btn { width: 100%; } }
</style>
