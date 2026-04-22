<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from "vue-router";

type TrailItem = {
  fullPath: string;
  label: string;
};

const route = useRoute();
const router = useRouter();

const homeItem: TrailItem = { fullPath: "/", label: "หน้าแรก" };

const routeLabels: Record<string, string> = {
  Home: "หน้าแรก",
  Store: "E-Book",
  Serials: "นิยายรายตอน",
  BookDetail: "รายละเอียด e-book",
  BestSellers: "ขายดี",
  NewReleases: "ออกใหม่",
  Promotions: "โปรโมชัน",
  FreeBooks: "อ่านฟรี",
  HallOfFame: "หอเกียรติยศ",
  Recommended: "แนะนำ",
  SubscriptionPlans: "แพ็กเกจสมาชิก",
  CoinWallet: "กระเป๋า coin",
  ReaderPage: "อ่าน e-book",
  ReaderListenPage: "โหมดอ่านให้ฟัง",
  MyLibrary: "ชั้นหนังสือของฉัน",
  WishList: "รายการที่ติดตาม",
  Cart: "ตะกร้า",
  OrderHistory: "ประวัติการสั่งซื้อของฉัน",
  Profile: "ข้อมูลของฉัน",
  AccountFollowing: "รายการที่ติดตาม",
  AccountGiftCodes: "Gift Code",
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
  SuperAdminRoles: "จัดการสิทธิ์ผู้ใช้",
  SuperAdminUsers: "จัดการผู้ใช้",
  SuperAdminSettings: "ตั้งค่าระบบ",
};

const parentRoutes: Record<string, TrailItem> = {
  AccountFollowing: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  AccountGiftCodes: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  AccountBuffet: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  AccountDevices: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  AccountBenefits: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  AccountReviews: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  AccountAgeVerification: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  OrderHistory: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  MyLibrary: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  CoinWallet: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  Terms: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  PrivacyPolicy: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  DataPrivacy: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  NotificationSettings: { fullPath: "/profile", label: "ข้อมูลของฉัน" },
  WriterBooks: { fullPath: "/writer", label: "ศูนย์นักเขียน" },
  WriterUpload: { fullPath: "/writer", label: "ศูนย์นักเขียน" },
  WriterEditBook: { fullPath: "/writer/books", label: "หนังสือของฉัน" },
  WriterStats: { fullPath: "/writer", label: "ศูนย์นักเขียน" },
  AdminBooks: { fullPath: "/admin", label: "จัดการระบบ" },
  AdminPageContent: { fullPath: "/admin", label: "จัดการระบบ" },
  AdminEditBook: { fullPath: "/admin/books", label: "จัดการหนังสือ" },
  UploadBook: { fullPath: "/admin", label: "จัดการระบบ" },
  AdminCategories: { fullPath: "/admin", label: "จัดการระบบ" },
  AdminMembers: { fullPath: "/admin", label: "จัดการระบบ" },
  SuperAdminRoles: { fullPath: "/superadmin/users", label: "จัดการผู้ใช้" },
  SuperAdminSettings: { fullPath: "/superadmin/users", label: "จัดการผู้ใช้" },
};

function fallbackLabel(currentRoute: RouteLocationNormalizedLoaded) {
  const segment = currentRoute.path.split("/").filter(Boolean).at(-1);
  if (!segment) return homeItem.label;
  if (/^\d+$/.test(segment)) return "รายละเอียด";
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getRouteLabel(currentRoute: RouteLocationNormalizedLoaded) {
  const name = typeof currentRoute.name === "string" ? currentRoute.name : "";
  return (
    routeLabels[name] ||
    (name === "Login"
      ? "เข้าสู่ระบบ"
      : name === "AccountLogin"
        ? "เข้าสู่ระบบ"
        : name === "LineLogin"
          ? "เข้าสู่ระบบด้วย LINE"
          : name === "FacebookLogin"
            ? "เข้าสู่ระบบด้วย Facebook"
            : name === "Register"
              ? "สมัครสมาชิก"
              : name === "ForgotPassword"
                ? "ลืมรหัสผ่าน"
                : name === "OAuthCallback"
                  ? "เข้าสู่ระบบ"
                  : fallbackLabel(currentRoute))
  );
}

function withParentTrail(items: TrailItem[]) {
  const name = typeof route.name === "string" ? route.name : "";
  const parent = parentRoutes[name];
  if (!parent || items.some((item) => item.fullPath === parent.fullPath)) return items;
  return [items[0] || homeItem, parent, ...items.slice(1)];
}

const visibleTrail = computed(() => {
  if (route.path === "/") return [homeItem];

  const currentItem: TrailItem = {
    fullPath: route.fullPath,
    label: getRouteLabel(route),
  };

  return withParentTrail([homeItem, currentItem]);
});

const shouldShowTrail = computed(() => route.path !== "/" && visibleTrail.value.length > 1);

function goTo(item: TrailItem) {
  if (item.fullPath !== route.fullPath) {
    router.push(item.fullPath);
  }
}
</script>

<template>
  <nav v-if="shouldShowTrail" class="navigation-trail" aria-label="เส้นทางการใช้งาน">
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
  </nav>
</template>

<style scoped>
.navigation-trail {
  width: 100%;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.navigation-trail__list {
  width: min(100% - 32px, var(--content-width));
  min-height: 36px;
  margin: 0 auto;
  padding: 6px 0;
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  list-style: none;
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
  .navigation-trail__list {
    width: calc(100% - 24px);
  }

  .navigation-trail__link {
    max-width: 150px;
  }
}
</style>
