<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from "vue-router";
import { useI18n } from "../utils/i18n";

type TrailItem = {
  fullPath: string;
  label: string;
};

const route = useRoute();
const router = useRouter();
const { locale, t } = useI18n();

const homeItem = computed<TrailItem>(() => ({ fullPath: "/", label: t("nav.home") }));

const localizedRouteLabels: Record<"th" | "en", Record<string, string>> = {
  th: {
    Home: "หน้าแรก",
    Store: "อีบุ๊ก",
    Serials: "นิยายรายตอน",
    BookDetail: "รายละเอียดอีบุ๊ก",
    BestSellers: "ขายดี",
    NewReleases: "ออกใหม่",
    Promotions: "โปรโมชัน",
    FreeBooks: "อ่านฟรี",
    HallOfFame: "หอเกียรติยศ",
    Recommended: "แนะนำ",
    SubscriptionPlans: "แพ็กเกจสมาชิก",
    CoinWallet: "กระเป๋าคอยน์",
    ReaderPage: "อ่านอีบุ๊ก",
    ReaderListenPage: "โหมดอ่านให้ฟัง",
    MyLibrary: "ชั้นหนังสือของฉัน",
    WishList: "รายการที่ติดตาม",
    Cart: "ตะกร้า",
    OrderHistory: "ประวัติการสั่งซื้อของฉัน",
    Profile: "ข้อมูลของฉัน",
    AccountFollowing: "รายการที่ติดตาม",
    AccountGiftCodes: "โค้ดของขวัญ",
    AccountBuffet: "สถานะสมาชิก",
    AccountDevices: "อุปกรณ์ของฉัน",
    AccountBenefits: "สิทธิพิเศษของฉัน",
    AccountReviews: "รีวิวของฉัน",
    AccountAgeVerification: "การยืนยันอายุด้วยบัตรประชาชน",
    Terms: "เงื่อนไขในการใช้บริการ",
    PrivacyPolicy: "นโยบายความเป็นส่วนตัว",
    DataPrivacy: "ความเป็นส่วนตัวของข้อมูล",
    NotificationSettings: "ตั้งค่าการแจ้งเตือน",
    WriterDashboard: "ศูนย์นักเขียน",
    WriterBooks: "หนังสือของฉัน",
    WriterUpload: "อัปโหลดผลงาน",
    WriterEditBook: "แก้ไขหนังสือ",
    WriterStats: "สถิตินักเขียน",
    AdminDashboard: "จัดการระบบ",
    AdminBooks: "จัดการหนังสือ",
    AdminPageContent: "จัดการเนื้อหาหน้าเว็บ",
    AdminEditBook: "แก้ไขหนังสือ",
    UploadBook: "เพิ่มหนังสือ",
    AdminCategories: "จัดการหมวดหมู่",
    AdminMembers: "จัดการสมาชิก",
    AdminSystemData: "ข้อมูลระบบ",
    SuperAdminRoles: "จัดการสิทธิ์ผู้ใช้",
    SuperAdminUsers: "จัดการผู้ใช้",
    SuperAdminSettings: "ตั้งค่าระบบ",
  },
  en: {
    Home: "Home",
    Store: "E-books",
    Serials: "Serials",
    BookDetail: "Book details",
    BestSellers: "Best sellers",
    NewReleases: "New releases",
    Promotions: "Promotions",
    FreeBooks: "Free books",
    HallOfFame: "Hall of fame",
    Recommended: "Recommended",
    SubscriptionPlans: "Membership plans",
    CoinWallet: "Coin wallet",
    ReaderPage: "Read e-book",
    ReaderListenPage: "Listen mode",
    MyLibrary: "My library",
    WishList: "Wishlist",
    Cart: "Cart",
    OrderHistory: "My order history",
    Profile: "My profile",
    AccountFollowing: "Following",
    AccountGiftCodes: "Gift codes",
    AccountBuffet: "Membership status",
    AccountDevices: "My devices",
    AccountBenefits: "My benefits",
    AccountReviews: "My reviews",
    AccountAgeVerification: "Age verification",
    Terms: "Terms of service",
    PrivacyPolicy: "Privacy policy",
    DataPrivacy: "Data privacy",
    NotificationSettings: "Notification settings",
    WriterDashboard: "Writer center",
    WriterBooks: "My books",
    WriterUpload: "Upload work",
    WriterEditBook: "Edit book",
    WriterStats: "Writer stats",
    AdminDashboard: "System management",
    AdminBooks: "Manage books",
    AdminPageContent: "Manage page content",
    AdminEditBook: "Edit book",
    UploadBook: "Add book",
    AdminCategories: "Manage categories",
    AdminMembers: "Manage members",
    AdminSystemData: "System Data",
    SuperAdminRoles: "Manage user roles",
    SuperAdminUsers: "Manage users",
    SuperAdminSettings: "System settings",
  },
};

const routeLabels = computed(() => localizedRouteLabels[locale.value]);

const parentRoutes: Record<string, { fullPath: string; routeName: string }> = {
  AccountFollowing: { fullPath: "/profile", routeName: "Profile" },
  AccountGiftCodes: { fullPath: "/profile", routeName: "Profile" },
  AccountBuffet: { fullPath: "/profile", routeName: "Profile" },
  AccountDevices: { fullPath: "/profile", routeName: "Profile" },
  AccountBenefits: { fullPath: "/profile", routeName: "Profile" },
  AccountReviews: { fullPath: "/profile", routeName: "Profile" },
  AccountAgeVerification: { fullPath: "/profile", routeName: "Profile" },
  OrderHistory: { fullPath: "/profile", routeName: "Profile" },
  MyLibrary: { fullPath: "/profile", routeName: "Profile" },
  CoinWallet: { fullPath: "/profile", routeName: "Profile" },
  Terms: { fullPath: "/profile", routeName: "Profile" },
  PrivacyPolicy: { fullPath: "/profile", routeName: "Profile" },
  DataPrivacy: { fullPath: "/profile", routeName: "Profile" },
  NotificationSettings: { fullPath: "/profile", routeName: "Profile" },
  WriterBooks: { fullPath: "/writer", routeName: "WriterDashboard" },
  WriterUpload: { fullPath: "/writer", routeName: "WriterDashboard" },
  WriterEditBook: { fullPath: "/writer/books", routeName: "WriterBooks" },
  WriterStats: { fullPath: "/writer", routeName: "WriterDashboard" },
  AdminBooks: { fullPath: "/admin", routeName: "AdminDashboard" },
  AdminPageContent: { fullPath: "/admin", routeName: "AdminDashboard" },
  AdminEditBook: { fullPath: "/admin/books", routeName: "AdminBooks" },
  UploadBook: { fullPath: "/admin", routeName: "AdminDashboard" },
  AdminCategories: { fullPath: "/admin", routeName: "AdminDashboard" },
  AdminMembers: { fullPath: "/admin", routeName: "AdminDashboard" },
  AdminSystemData: { fullPath: "/admin", routeName: "AdminDashboard" },
  SuperAdminRoles: { fullPath: "/superadmin/users", routeName: "SuperAdminUsers" },
  SuperAdminSettings: { fullPath: "/superadmin/users", routeName: "SuperAdminUsers" },
};

function fallbackLabel(currentRoute: RouteLocationNormalizedLoaded) {
  const segment = currentRoute.path.split("/").filter(Boolean).at(-1);
  if (!segment) return homeItem.value.label;
  if (/^\d+$/.test(segment)) return locale.value === "th" ? "รายละเอียด" : "Details";
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getRouteLabel(currentRoute: RouteLocationNormalizedLoaded) {
  const name = typeof currentRoute.name === "string" ? currentRoute.name : "";
  return (
    routeLabels.value[name] ||
    (name === "Login"
      ? t("account.login")
      : name === "AccountLogin"
        ? t("account.login")
        : name === "LineLogin"
          ? locale.value === "th" ? "เข้าสู่ระบบด้วย LINE" : "Log in with LINE"
          : name === "Register"
            ? t("account.register")
            : name === "ForgotPassword"
              ? locale.value === "th" ? "ลืมรหัสผ่าน" : "Forgot password"
              : name === "OAuthCallback"
                ? t("account.login")
                : fallbackLabel(currentRoute))
  );
}

function withParentTrail(items: TrailItem[]) {
  const name = typeof route.name === "string" ? route.name : "";
  const parent = parentRoutes[name];
  if (!parent || items.some((item) => item.fullPath === parent.fullPath)) return items;
  return [
    items[0] || homeItem.value,
    { fullPath: parent.fullPath, label: routeLabels.value[parent.routeName] || parent.routeName },
    ...items.slice(1),
  ];
}

const visibleTrail = computed(() => {
  if (route.path === "/") return [homeItem.value];

  const currentItem: TrailItem = {
    fullPath: route.fullPath,
    label: getRouteLabel(route),
  };

  return withParentTrail([homeItem.value, currentItem]);
});

const shouldShowTrail = computed(() => route.path !== "/" && visibleTrail.value.length > 1);

const dashboardBackTarget = computed<TrailItem | null>(() => {
  if (route.path === "/admin") return null;
  if (route.path.startsWith("/admin")) {
    return { fullPath: "/admin", label: locale.value === "th" ? "กลับ Dashboard" : "Back to Dashboard" };
  }

  if (route.path === "/superadmin") return null;
  if (route.path.startsWith("/superadmin")) {
    return { fullPath: "/superadmin", label: locale.value === "th" ? "กลับ Dashboard" : "Back to Dashboard" };
  }

  if (route.path === "/writer") return null;
  if (route.path.startsWith("/writer")) {
    return { fullPath: "/writer", label: locale.value === "th" ? "กลับ Dashboard" : "Back to Dashboard" };
  }

  return null;
});

function goTo(item: TrailItem) {
  if (item.fullPath !== route.fullPath) {
    router.push(item.fullPath);
  }
}
</script>

<template>
  <nav v-if="shouldShowTrail" class="navigation-trail" :aria-label="t('a11y.skipNav')">
    <div class="navigation-trail__inner">
      <button
        v-if="dashboardBackTarget"
        type="button"
        class="navigation-trail__dashboard"
        @click="goTo(dashboardBackTarget)"
      >
        ← {{ dashboardBackTarget.label }}
      </button>

      <ol class="navigation-trail__list">
        <li
          v-for="(item, index) in visibleTrail"
          :key="`${item.fullPath}-${index}`"
          class="navigation-trail__item"
        >
          <button
            class="navigation-trail__link"
            :class="{ 'navigation-trail__link--current': index === visibleTrail.length - 1 }"
            type="button"
            :disabled="index === visibleTrail.length - 1"
            @click="goTo(item)"
          >
            {{ item.label }}
          </button>
          <span v-if="index < visibleTrail.length - 1" class="navigation-trail__separator" aria-hidden="true">
            &gt;
          </span>
        </li>
      </ol>
    </div>
  </nav>
</template>

<style scoped>
.navigation-trail {
  width: 100%;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.navigation-trail__inner {
  width: min(100% - calc(var(--page-gutter, 16px) * 2), var(--content-width));
  min-height: 36px;
  margin: 0 auto;
  padding: 6px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.navigation-trail__list {
  min-width: 0;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  list-style: none;
}

.navigation-trail__dashboard {
  flex: 0 0 auto;
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-strong);
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 900;
  padding: 0 14px;
  white-space: nowrap;
}

.navigation-trail__dashboard:hover,
.navigation-trail__dashboard:focus-visible {
  background: color-mix(in srgb, var(--primary-soft) 70%, var(--surface-soft) 30%);
  color: var(--primary-strong);
}

.navigation-trail__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
}

.navigation-trail__link {
  max-width: 220px;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.navigation-trail__link:hover:not(:disabled),
.navigation-trail__link:focus-visible:not(:disabled) {
  color: var(--primary-strong);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.navigation-trail__link--current {
  color: var(--text-strong);
  cursor: default;
  font-weight: 900;
}

.navigation-trail__separator {
  color: var(--text-muted);
  font-size: 0.75rem;
}

@media (max-width: 640px) {
  .navigation-trail__inner {
    width: calc(100% - calc(var(--page-gutter, 12px) * 2));
    align-items: flex-start;
    flex-direction: column;
  }

  .navigation-trail__list {
    width: 100%;
  }

  .navigation-trail__link {
    max-width: 150px;
  }
}
</style>
