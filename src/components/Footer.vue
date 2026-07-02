<script setup lang="ts">
import { computed } from "vue";
import logoUrl from "../assets/Logo-transparent.png";
import { getAuthUser, isAuthenticated } from "../utils/auth";
import { useI18n } from "../utils/i18n";

type UserRole = "user" | "writer" | "admin" | "superadmin";

const { t } = useI18n();
const isLoggedIn = computed(() => isAuthenticated());
const authUser = computed(() => getAuthUser() as { role?: string } | null);
const currentRole = computed<UserRole | null>(() => {
  const role = authUser.value?.role?.trim().toLowerCase();

  if (
    role === "user" ||
    role === "writer" ||
    role === "admin" ||
    role === "superadmin"
  ) {
    return role;
  }

  return null;
});

const canWriteBooks = computed(() => currentRole.value === "writer");
const memberLink = computed(() =>
  isLoggedIn.value ? "/my-library" : "/login",
);
const walletLink = computed(() =>
  isLoggedIn.value ? "/coin-wallet" : "/login",
);
</script>

<template>
  <footer class="footer">
    <div class="footer-inner">
      <section class="footer-column">
        <h3>{{ t("footer.content") }}</h3>
        <router-link to="/store">{{ t("nav.books") }}</router-link>
        <router-link to="/subscription-plans">{{
          t("nav.subscription")
        }}</router-link>
        <router-link to="/serials">{{ t("nav.serials") }}</router-link>
        <router-link to="/recommended">{{ t("home.recommended") }}</router-link>
      </section>

      <section class="footer-column">
        <h3>{{ t("footer.memberMenu") }}</h3>
        <router-link :to="memberLink">{{ t("account.bookshelf") }}</router-link>
        <router-link v-if="canWriteBooks" to="/writer/books">
          {{ t("footer.writerBooks") }}
        </router-link>
        <router-link v-if="canWriteBooks" to="/writer/upload">
          {{ t("account.uploadBook") }}
        </router-link>
      </section>

      <section class="footer-column footer-about">
        <div class="footer-about-links">
          <h3>{{ t("footer.about") }}</h3>
          <router-link to="/support">{{ t("footer.help") }}</router-link>
          <router-link to="/terms">{{ t("footer.terms") }}</router-link>
          <router-link to="/privacy-policy">{{
            t("footer.privacy")
          }}</router-link>
          <router-link to="/data-privacy">{{
            t("footer.dataPrivacy")
          }}</router-link>
          <router-link :to="walletLink">{{ t("nav.topUp") }}</router-link>
        </div>

        <div class="footer-logo-wrap">
          <img class="footer-logo" :src="logoUrl" alt="Read and Voice" />
        </div>
      </section>
    </div>

    <div class="footer-bottom">
      <span>{{ t("footer.copyright") }}</span>
      <span>{{ t("footer.footerNote") }}</span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: auto;
  background: var(--footer-bg);
  color: var(--text);
  border-top: 1px solid var(--border);
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
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 900;
}

.footer-column a {
  width: fit-content;
  color: var(--text);
  font-size: 15px;
  line-height: 1.75;
  text-decoration: none;
  transition: color 0.18s ease;
}

.footer-column a:hover {
  color: var(--primary-strong);
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
  width: 200px;
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
  color: var(--text-muted);
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
    grid-template-columns: minmax(130px, 1fr) 120px;
    gap: 12px;
  }

  .footer-logo {
    width: 100px;
  }

  .footer-bottom {
    font-size: 12px;
    gap: 12px;
  }
}

@media (max-width: 640px) {
  .footer-inner {
    grid-template-columns:
      minmax(70px, 0.8fr)
      minmax(80px, 0.85fr)
      minmax(180px, 1.4fr);
    gap: 12px;
    padding-inline: 18px;
    padding-top: 28px;
    padding-bottom: 24px;
  }

  .footer-about {
    grid-template-columns: minmax(0, 1fr) 70px;
    gap: 8px;
  }

  .footer-logo-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }

  .footer-logo {
    width: 60px;
    max-width: 60px;
    height: auto;
  }
  .footer-bottom {
    font-size: 11px;
    gap: 8px;
  }
}

@media (max-width: 460px) {
  .footer-inner {
    grid-template-columns:
      minmax(58px, 0.75fr)
      minmax(68px, 0.78fr)
      minmax(150px, 1.4fr);
    gap: 6px;
    padding-inline: 10px;
    padding-top: 24px;
  }

  .footer-about {
    grid-template-columns: minmax(0, 1fr) 60px;
    align-items: center;
    gap: 6px;
  }

  .footer-column {
    gap: 4px;
  }

  .footer-column h3 {
    font-size: 11px;
    margin-bottom: 6px;
  }

  .footer-column a {
    font-size: 10px;
    line-height: 1.45;
  }

  .footer-logo {
    width: 50px;
    max-width: 50px;
    height: auto;
  }

  .footer-logo-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    padding-inline: 4px;
  }

  .footer-bottom {
    font-size: 10px;
    gap: 6px;
    padding-inline: var(--page-gutter, 16px);
  }
}
</style>
