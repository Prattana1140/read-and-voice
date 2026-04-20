<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from "vue-router";

type TrailItem = {
  fullPath: string;
  label: string;
};

const route = useRoute();
const router = useRouter();
const storageKey = "read-voice-navigation-trail";
const maxItems = 12;

const homeItem: TrailItem = { fullPath: "/", label: "หน้าแรก" };

const routeLabels: Record<string, string> = {
  Home: "หน้าแรก",
  Store: "ร้านหนังสือ",
  Serials: "รายตอน",
  BookDetail: "รายละเอียดหนังสือ",
  BestSellers: "ขายดี",
  NewReleases: "มาใหม่",
  Promotions: "โปรโมชั่น",
  FreeBooks: "หนังสือฟรี",
  HallOfFame: "หอเกียรติยศ",
  Recommended: "แนะนำ",
  SubscriptionPlans: "Pinto VIP",
  CoinWallet: "เติม coin",
  ReaderPage: "อ่านหนังสือ",
  MyLibrary: "ชั้นหนังสือของฉัน",
  WishList: "รายการที่อยากได้",
  Cart: "ตะกร้า",
  OrderHistory: "ประวัติคำสั่งซื้อ",
  Profile: "โปรไฟล์",
  AccountFollowing: "รายการที่ติดตาม",
  AccountGiftCodes: "Gift Code",
  AccountBuffet: "Buffet ของฉัน",
  AccountDevices: "อุปกรณ์ของฉัน",
  AccountBenefits: "สิทธิพิเศษ",
  AccountReviews: "รีวิวของฉัน",
  AccountAgeVerification: "ยืนยันอายุ",
  WriterDashboard: "นักเขียน",
  WriterBooks: "หนังสือของนักเขียน",
  WriterUpload: "เพิ่มผลงาน",
  WriterEditBook: "แก้ไขหนังสือ",
  WriterStats: "สถิตินักเขียน",
  AdminDashboard: "แอดมิน",
  AdminBooks: "จัดการหนังสือ",
  AdminPageContent: "จัดการหน้าเว็บ",
  AdminEditBook: "แก้ไขหนังสือ",
  UploadBook: "อัปโหลดหนังสือ",
  AdminCategories: "จัดการหมวดหมู่",
  AdminMembers: "จัดการสมาชิก",
  SuperAdminRoles: "จัดการสิทธิ์",
  SuperAdminUsers: "จัดการผู้ใช้",
  SuperAdminSettings: "ตั้งค่าระบบ",
};

const parentRoutes: Record<string, TrailItem> = {
  AccountFollowing: { fullPath: "/profile", label: "โปรไฟล์" },
  AccountGiftCodes: { fullPath: "/profile", label: "โปรไฟล์" },
  AccountBuffet: { fullPath: "/profile", label: "โปรไฟล์" },
  AccountDevices: { fullPath: "/profile", label: "โปรไฟล์" },
  AccountBenefits: { fullPath: "/profile", label: "โปรไฟล์" },
  AccountReviews: { fullPath: "/profile", label: "โปรไฟล์" },
  AccountAgeVerification: { fullPath: "/profile", label: "โปรไฟล์" },
  WriterBooks: { fullPath: "/writer", label: "นักเขียน" },
  WriterUpload: { fullPath: "/writer", label: "นักเขียน" },
  WriterEditBook: { fullPath: "/writer/books", label: "หนังสือของนักเขียน" },
  WriterStats: { fullPath: "/writer", label: "นักเขียน" },
  AdminBooks: { fullPath: "/admin", label: "แอดมิน" },
  AdminPageContent: { fullPath: "/admin", label: "แอดมิน" },
  AdminEditBook: { fullPath: "/admin/books", label: "จัดการหนังสือ" },
  UploadBook: { fullPath: "/admin", label: "แอดมิน" },
  AdminCategories: { fullPath: "/admin", label: "แอดมิน" },
  AdminMembers: { fullPath: "/admin", label: "แอดมิน" },
  SuperAdminRoles: { fullPath: "/superadmin/users", label: "จัดการผู้ใช้" },
  SuperAdminSettings: { fullPath: "/superadmin/users", label: "จัดการผู้ใช้" },
};

function isTrailItem(item: unknown): item is TrailItem {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TrailItem).fullPath === "string" &&
    typeof (item as TrailItem).label === "string"
  );
}

function readTrail() {
  try {
    const value = sessionStorage.getItem(storageKey);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter(isTrailItem) : [];
  } catch {
    return [];
  }
}

function writeTrail(items: TrailItem[]) {
  sessionStorage.setItem(storageKey, JSON.stringify(items));
}

function comparablePath(fullPath: string) {
  const [path = "/"] = fullPath.split(/[?#]/);
  return path.replace(/\/+$/, "") || "/";
}

function comparableLabel(label: string) {
  return label.trim().toLocaleLowerCase();
}

function isSameTrailPlace(left: TrailItem, right: TrailItem) {
  return (
    comparablePath(left.fullPath) === comparablePath(right.fullPath) ||
    comparableLabel(left.label) === comparableLabel(right.label)
  );
}

function compactTrailItems(items: TrailItem[]) {
  return items.reduce<TrailItem[]>((result, item) => {
    const previous = result.at(-1);
    if (previous && isSameTrailPlace(previous, item)) {
      result[result.length - 1] = item;
      return result;
    }

    return [...result, item];
  }, []);
}

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
  const baseLabel =
    routeLabels[name] ||
    (name === "Login"
      ? "เข้าสู่ระบบ"
      : name === "AccountLogin"
        ? "เข้าสู่ระบบ"
        : name === "LineLogin"
          ? "เข้าสู่ระบบ LINE"
          : name === "FacebookLogin"
            ? "เข้าสู่ระบบ Facebook"
            : name === "Register"
              ? "สมัครสมาชิก"
              : name === "ForgotPassword"
                ? "ลืมรหัสผ่าน"
                : name === "OAuthCallback"
                  ? "เข้าสู่ระบบ"
                  : fallbackLabel(currentRoute));
  const id = currentRoute.params.id;

  if (
    (name === "BookDetail" || name === "ReaderPage" || name === "AdminEditBook" || name === "WriterEditBook") &&
    typeof id === "string"
  ) {
    return `${baseLabel} #${id}`;
  }

  return baseLabel;
}

function withParentTrail(items: TrailItem[]) {
  const name = typeof route.name === "string" ? route.name : "";
  const parent = parentRoutes[name];
  if (!parent || items.some((item) => item.fullPath === parent.fullPath)) return items;

  return [items[0] || homeItem, parent, ...items.slice(1)];
}

const trail = ref<TrailItem[]>(readTrail());

watch(
  () => route.fullPath,
  () => {
    if (route.path === "/") {
      trail.value = [homeItem];
      writeTrail(trail.value);
      return;
    }

    const nextItem = { fullPath: route.fullPath, label: getRouteLabel(route) };
    const cleanTrail = trail.value.filter(isTrailItem);
    const existingIndex = cleanTrail.findIndex((item) => isSameTrailPlace(item, nextItem));
    const nextTrail =
      existingIndex >= 0
        ? [...cleanTrail.slice(0, existingIndex), nextItem]
        : [...cleanTrail, nextItem].slice(-maxItems);

    const compactTrail = compactTrailItems(nextTrail);
    trail.value = compactTrail;
    writeTrail(compactTrail);
  },
  { immediate: true },
);

const visibleTrail = computed(() => {
  const items = trail.value.filter(isTrailItem);
  const base = items[0]?.fullPath === "/" ? items : [homeItem, ...items];
  return compactTrailItems(withParentTrail(base));
});

const shouldShowTrail = computed(() => route.path !== "/" && visibleTrail.value.length > 1);

function goTo(item: TrailItem) {
  if (item.fullPath !== route.fullPath) {
    router.push(item.fullPath);
  }
}
</script>

<template>
  <nav v-if="shouldShowTrail" class="navigation-trail" aria-label="ประวัติหน้าที่เข้าชม">
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
