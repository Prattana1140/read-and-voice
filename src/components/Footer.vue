<template>
  <footer class="footer">
    <div class="footer-inner">
      <section class="footer-brand">
        <h2>Read and Voice</h2>
        <p>พื้นที่อ่านหนังสือและฟังเสียงที่ปรับแสงสีให้เหมาะกับสายตาของคุณ</p>
      </section>

      <section>
        <h3>หนังสือ</h3>
        <router-link to="/store">ร้านหนังสือ</router-link>
        <router-link to="/my-library">ชั้นหนังสือของฉัน</router-link>
        <router-link to="/wishlist">รายการถูกใจ</router-link>
      </section>

      <section>
        <h3>บัญชี</h3>
        <router-link to="/login">เข้าสู่ระบบ</router-link>
        <router-link to="/register">สมัครสมาชิก</router-link>
        <router-link to="/orders/history">ประวัติคำสั่งซื้อ</router-link>
      </section>

      <section>
        <h3>ผู้เขียน</h3>
        <router-link to="/upload-book">อัปโหลดหนังสือ</router-link>
        <router-link to="/writer">แดชบอร์ดนักเขียน</router-link>
        <router-link to="/admin">ผู้ดูแลระบบ</router-link>
      </section>
    </div>

    <div class="footer-bottom">
      <span>© 2026 Read and Voice</span>
      <span>อ่านชัด ฟังสบาย ในทุกโหมด</span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: auto;
  background: color-mix(in srgb, #e7fbf7 88%, white);
  color: #244b47;
  border-top: 1px solid rgba(17, 156, 145, 0.16);
  box-shadow: 0 -10px 28px rgba(17, 156, 145, 0.08);
}

.footer-inner {
  max-width: var(--content-width);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: 28px;
  padding: 40px 20px;
}

.footer-brand h2,
h3 {
  color: #0b5f59;
}

.footer-brand h2 {
  margin: 0 0 10px;
  font-size: 26px;
}

.footer-brand p {
  margin: 0;
  color: #4f8f88;
  line-height: 1.7;
}

h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

a {
  display: block;
  width: fit-content;
  margin: 8px 0;
  color: #244b47;
  text-decoration: none;
}

a:hover {
  color: #0f766e;
}

.footer-bottom {
  max-width: var(--content-width);
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px 24px;
  border-top: 1px solid rgba(17, 156, 145, 0.16);
  color: #4f8f88;
  font-size: 14px;
}

@media (max-width: 820px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .footer-inner {
    grid-template-columns: 1fr;
  }

  .footer-bottom {
    flex-direction: column;
  }
}
</style>
