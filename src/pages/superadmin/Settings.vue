<template>
  <div class="superadmin-page">
    <section class="panel">
      <p class="eyebrow">Superadmin</p>
      <h1>ตั้งค่าระบบ</h1>
      <p class="muted">
        พื้นที่สำหรับตั้งค่าระบบระดับสูง เช่น นโยบายสิทธิ์ การเปิดปิดฟีเจอร์ และการตั้งค่าความปลอดภัย
      </p>
    </section>
  </div>
</template>

<style scoped>
.superadmin-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1 {
  color: var(--text-strong);
}

.muted {
  color: var(--text-muted);
  line-height: 1.8;
}
</style>
