<script setup lang="ts">
import { computed } from "vue";
import logoUrl from "../assets/Logo-transparent.png";
import { getAuthUser, isAuthenticated } from "../utils/auth";

type UserRole = "user" | "writer" | "admin" | "superadmin";

const isLoggedIn = computed(() => isAuthenticated());
const authUser = computed(() => getAuthUser() as { role?: string } | null);
const currentRole = computed<UserRole | null>(() => {
  const role = authUser.value?.role?.trim().toLowerCase();

  if (role === "user" || role === "writer" || role === "admin" || role === "superadmin") {
    return role;
  }

  return null;
});

const canManageCategories = computed(() => currentRole.value === "admin" || currentRole.value === "superadmin");
const canWriteBooks = computed(() => currentRole.value === "writer");
const memberLink = computed(() => (isLoggedIn.value ? "/my-library" : "/login"));
const recentLink = computed(() => (isLoggedIn.value ? "/profile" : "/login"));
const walletLink = computed(() => (isLoggedIn.value ? "/coin-wallet" : "/login"));
const notificationSettingsLink = computed(() => (isLoggedIn.value ? "/notification-settings" : "/login"));
</script>

<template>
  <footer class="footer">
    <div class="footer-inner">
      <section class="footer-column">
        <h3>ดูเนื้อหา</h3>
        <router-link to="/store">นิยาย</router-link>
        <router-link to="/subscription-plans">แฟนฟิค</router-link>
        <router-link to="/serials">การ์ตูน</router-link>
        <router-link v-if="canManageCategories" to="/admin/categories">หมวดหมู่นิยาย</router-link>
        <router-link to="/recommended">นิยายแช็ก ออริจินอล</router-link>
      </section>

      <section class="footer-column">
        <h3>เมนูของฉัน</h3>
        <router-link :to="memberLink">ชั้นอ่านของฉัน</router-link>
        <router-link :to="recentLink">อ่านล่าสุด</router-link>
        <router-link v-if="canWriteBooks" to="/writer/books">งานเขียนของฉัน</router-link>
        <router-link v-if="canWriteBooks" to="/writer/upload">เพิ่มงานเขียนใหม่</router-link>
      </section>

      <section class="footer-column footer-about">
        <div class="footer-about-links">
          <h3>เกี่ยวกับเรา</h3>
          <router-link to="/data-privacy">ติดต่อเรา</router-link>
          <router-link to="/terms">เงื่อนไขการใช้บริการ</router-link>
          <router-link to="/privacy-policy">นโยบายความเป็นส่วนตัว</router-link>
          <router-link to="/data-privacy">รู้จัก readAwrite และ meb</router-link>
          <router-link :to="walletLink">วิธีการเติมคอยน์</router-link>
          <router-link :to="notificationSettingsLink">ตรวจคำผิดอัตโนมัติ</router-link>
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
  padding-inline: var(--page-gutter, 28px);
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
    grid-template-columns:
      minmax(96px, 0.8fr)
      minmax(112px, 0.85fr)
      minmax(220px, 1.35fr);
    gap: clamp(14px, 3vw, 28px);
    padding-top: 34px;
    padding-bottom: 24px;
  }

  .footer-column h3 {
    font-size: 14px;
    margin-bottom: 8px;
  }

  .footer-column a {
    font-size: 13px;
    line-height: 1.65;
  }

  .footer-about {
    grid-column: auto;
    grid-template-columns: minmax(130px, 1fr) minmax(92px, 120px);
    gap: clamp(12px, 3vw, 24px);
  }

  .footer-logo {
    width: 128px;
  }
}

@media (max-width: 640px) {
  .footer-inner {
    grid-template-columns:
      minmax(88px, 0.8fr)
      minmax(104px, 0.85fr)
      minmax(190px, 1.25fr);
    gap: 12px;
    padding-inline: 18px;
    padding-top: 28px;
    padding-bottom: 24px;
  }

  .footer-about {
    grid-template-columns: minmax(118px, 1fr) 96px;
    gap: 12px;
  }

  .footer-logo {
    width: 104px;
  }

  .footer-logo-wrap {
    justify-content: center;
  }
}

@media (max-width: 460px) {
  .footer-inner {
    grid-template-columns:
      minmax(58px, 0.75fr)
      minmax(68px, 0.78fr)
      minmax(138px, 1.4fr);
    gap: 6px;
    padding-inline: 10px;
    padding-top: 24px;
  }

  .footer-about {
    grid-template-columns: minmax(84px, 1fr) 46px;
    align-items: center;
    gap: 4px;
  }

  .footer-column {
    gap: 4px;
  }

  .footer-column h3 {
    font-size: 12px;
    margin-bottom: 6px;
  }

  .footer-column a {
    font-size: 10px;
    line-height: 1.55;
  }

  .footer-logo {
    width: 52px;
  }

  .footer-logo-wrap {
    justify-content: center;
  }

  .footer-bottom {
    gap: 10px;
    padding-inline: var(--page-gutter, 16px);
  }
}
</style>
