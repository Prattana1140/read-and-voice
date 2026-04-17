<template>
  <div class="admin-page">
    <section class="panel">
      <p class="eyebrow">Admin</p>
      <h1>จัดการสมาชิกบางส่วน</h1>
      <p class="muted">
        หน้านี้เป็นพื้นที่สำหรับ admin ดูแลสมาชิกระดับทั่วไป เช่น ตรวจสอบบัญชีหรือสถานะการใช้งาน
        ส่วนการเปลี่ยน role และจัดการผู้ใช้ทั้งหมดถูกสงวนไว้สำหรับ superadmin
      </p>
    </section>
  </div>
</template>

<style scoped>
.admin-page {
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
