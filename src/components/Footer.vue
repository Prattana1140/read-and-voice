<template>
  <footer class="footer">
    <div class="footer-inner">
      <section class="footer-brand">
        <h2>Read and Voice</h2>
        <p>พื้นที่อ่านและฟัง e-book ที่ออกแบบให้ใช้งานง่าย อ่านสบาย และเข้าถึงหน้าบริการสำคัญได้ครบ</p>
      </section>
      <section>
        <h3>เลือกหมวดหมู่</h3>
        <router-link to="/store">นิยาย</router-link>
        <router-link to="/serials">การ์ตูน</router-link>
        <router-link to="/new-releases">นิตยสาร</router-link>
        <router-link to="/recommended">ทั่วไป</router-link>
        <router-link to="/free-books">หนังสือเสียง</router-link>
        <router-link to="/subscription-plans">บุฟเฟต์</router-link>
      </section>
      <section>
        <h3>บริการช่วยเหลือ</h3>
        <router-link to="/profile">วิธีการใช้งาน</router-link>
        <router-link to="/account/buffet">สถานะสมาชิก</router-link>
        <router-link to="/coin-wallet">meb coin</router-link>
        <router-link to="/account/gift-codes">Gift Code คืออะไร?</router-link>
        <router-link to="/terms">เงื่อนไขในการใช้บริการ</router-link>
        <router-link to="/privacy-policy">นโยบายความเป็นส่วนตัว</router-link>
        <router-link to="/notification-settings">ตั้งค่าการแจ้งเตือน</router-link>
      </section>
      <section>
        <h3>เกี่ยวกับเรา</h3>
        <router-link to="/promotions">ข่าวสารและกิจกรรม</router-link>
        <router-link to="/data-privacy">ติดต่อเรา</router-link>
      </section>
    </div>
    <div class="footer-bottom"><span>© 2026 Read and Voice</span><span>อ่านชัด ฟังสบาย ในทุกโหมด</span></div>
  </footer>
</template>

<style scoped>
.footer { margin-top: auto; background: color-mix(in srgb, #e7fbf7 88%, white); color: #244b47; border-top: 1px solid rgba(17, 156, 145, 0.16); box-shadow: 0 -10px 28px rgba(17, 156, 145, 0.08); }
.footer-inner { max-width: var(--content-width); margin: 0 auto; display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); gap: 28px; padding: 40px 20px; }
.footer-brand h2,h3 { color: #0b5f59; }
.footer-brand h2 { margin: 0 0 10px; font-size: 26px; }
.footer-brand p { margin: 0; color: #4f8f88; line-height: 1.7; }
h3 { margin: 0 0 12px; font-size: 16px; }
a { display: block; width: fit-content; margin: 8px 0; color: #244b47; text-decoration: none; }
a:hover { color: #0f766e; }
.footer-bottom { max-width: var(--content-width); margin: 0 auto; display: flex; justify-content: space-between; gap: 14px; padding: 16px 20px 24px; border-top: 1px solid rgba(17, 156, 145, 0.16); color: #4f8f88; font-size: 14px; }
@media (max-width: 820px) { .footer-inner { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) { .footer-inner { grid-template-columns: 1fr; } .footer-bottom { flex-direction: column; } }
</style>
