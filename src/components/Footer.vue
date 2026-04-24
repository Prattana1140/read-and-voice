<script setup lang="ts">
import logoUrl from "../assets/Logo-transparent.png";
</script>

<template>
  <footer class="footer">
    <div class="footer-inner">
      <section class="footer-column">
        <h3>ดูเนื้อหา</h3>
        <router-link to="/store">นิยาย</router-link>
        <router-link to="/subscription-plans">แฟนฟิค</router-link>
        <router-link to="/serials">การ์ตูน</router-link>
        <router-link to="/admin/categories">หมวดหมู่นิยาย</router-link>
        <router-link to="/recommended">นิยายแช็ก ออริจินอล</router-link>
      </section>

      <section class="footer-column">
        <h3>เมนูของฉัน</h3>
        <router-link to="/my-library">My Reading</router-link>
        <router-link to="/profile">อ่านล่าสุด</router-link>
        <router-link to="/writer/books">My Writing</router-link>
        <router-link to="/writer/upload">เพิ่มงานเขียนใหม่</router-link>
      </section>

      <section class="footer-column footer-about">
        <div class="footer-about-links">
          <h3>เกี่ยวกับเรา</h3>
          <router-link to="/data-privacy">ติดต่อเรา</router-link>
          <router-link to="/terms">เงื่อนไขการใช้บริการ</router-link>
          <router-link to="/privacy-policy">นโยบายความเป็นส่วนตัว</router-link>
          <router-link to="/data-privacy">รู้จัก readAwrite และ meb</router-link>
          <router-link to="/coin-wallet">วิธีการเติมคอยน์</router-link>
          <router-link to="/notification-settings">Proof ตรวจคำผิดอัตโนมัติ</router-link>
        </div>

        <div class="footer-logo-wrap">
          <img class="footer-logo" :src="logoUrl" alt="Read and Voice" />
        </div>
      </section>
    </div>

    <div class="footer-bottom">
      <span>© 2026 Read and Voice</span>
      <span>อ่านชัด ฟังสบาย และต่อยอดเป็น ecosystem ได้จริง</span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: auto;
  background: #eef3f2;
  color: #111827;
  border-top: 1px solid #d8e2e1;
}

.footer-inner,
.footer-bottom {
  max-width: 1220px;
  margin: 0 auto;
  padding-inline: 28px;
}

.footer-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(420px, 1.45fr);
  gap: 72px;
  padding-top: 48px;
  padding-bottom: 30px;
}

.footer-column {
  display: grid;
  align-content: start;
  gap: 6px;
}

.footer-column h3 {
  margin: 0 0 10px;
  color: #111827;
  font-size: 16px;
  font-weight: 900;
}

.footer-column a {
  width: fit-content;
  color: #111827;
  font-size: 15px;
  line-height: 1.75;
  text-decoration: none;
  transition: color 0.18s ease;
}

.footer-column a:hover {
  color: #0f766e;
}

.footer-about {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 280px;
  align-items: center;
  gap: 92px;
}

.footer-about-links {
  display: grid;
  align-content: start;
  gap: 6px;
}

.footer-about-links h3,
.footer-about-links a {
  white-space: nowrap;
}

.footer-logo-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
}

.footer-logo {
  width: 260px;
  height: auto;
  object-fit: contain;
}

.footer-bottom {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 22px;
  color: #5b6468;
  font-size: 13px;
  text-align: center;
}

@media (max-width: 1080px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
    gap: 36px;
  }

  .footer-about {
    grid-column: 1 / -1;
    grid-template-columns: minmax(280px, 1fr) 240px;
    gap: 48px;
  }
}

@media (max-width: 560px) {
  .footer-inner {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .footer-about {
    grid-column: auto;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .footer-about-links h3,
  .footer-about-links a {
    white-space: normal;
  }

  .footer-logo {
    width: 190px;
  }

  .footer-logo-wrap {
    justify-content: center;
    order: -1;
  }

  .footer-bottom {
    gap: 10px;
  }
}
</style>
