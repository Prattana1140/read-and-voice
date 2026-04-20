<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import logoUrl from "../assets/Logo-transparent.png";
import {
  AUTH_CHANGED_EVENT,
  getToken,
  getUser,
  logout as clearAuth,
} from "../utils/auth";

type ThemeMode = "normal" | "dark" | "reading";
type UserRole = "guest" | "user" | "writer" | "admin" | "superadmin";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
} | null;

type NavItem = {
  label: string;
  to: string;
  roles: UserRole[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type NotificationItem = {
  id: number;
  title: string;
  detail: string;
  time: string;
  tone: string;
  unread?: boolean;
};

type NotificationSetting = {
  key: string;
  title: string;
  detail: string;
  enabled: boolean;
};

const props = defineProps<{
  theme: ThemeMode;
}>();

const emit = defineEmits<{
  (event: "change-theme", theme: ThemeMode): void;
}>();

const router = useRouter();
const navbarRef = ref<HTMLElement | null>(null);
const isMenuOpen = ref(false);
const isSearchOpen = ref(false);
const isNotificationsOpen = ref(false);
const isNotificationSettingsOpen = ref(false);
const search = ref("");
const authVersion = ref(0);
const allRoles: UserRole[] = ["guest", "user", "writer", "admin", "superadmin"];

const notifications = [
  "หนังสือใหม่พร้อมให้อ่านแล้ว",
  "ระบบบันทึกความคืบหน้าการอ่านล่าสุด",
  "มีรายการแนะนำใหม่สำหรับคุณ",
];

const notificationItems = ref<NotificationItem[]>([
  {
    id: 1,
    title: "วันสุดท้ายสำหรับโปรโมชันอ่านฟรี",
    detail: "E-Book ที่ติดตามกำลังจะหมดโปรโมชันวันนี้",
    time: "เมื่อ 15 เม.ย. 2569 10:46 น.",
    tone: "sale",
    unread: true,
  },
  {
    id: 2,
    title: "มีตอนใหม่จากซีรีส์ที่ติดตาม",
    detail: "ตอนล่าสุดพร้อมอ่านต่อแล้วในชั้นหนังสือของคุณ",
    time: "เมื่อ 14 เม.ย. 2569 10:40 น.",
    tone: "serial",
    unread: true,
  },
  {
    id: 3,
    title: "หนังสือใหม่จากนักเขียนที่ติดตาม",
    detail: "ผลงานใหม่ถูกเพิ่มเข้าร้านหนังสือแล้ว",
    time: "เมื่อ 12 เม.ย. 2569 09:15 น.",
    tone: "writer",
  },
  {
    id: 4,
    title: "มีความคิดเห็นตอบกลับ",
    detail: "มีผู้อ่านตอบกลับความคิดเห็นของคุณ",
    time: "เมื่อ 11 เม.ย. 2569 16:22 น.",
    tone: "comment",
  },
]);

const notificationSettings = ref<NotificationSetting[]>([
  {
    key: "writers",
    title: "นักเขียน",
    detail: "แจ้งเตือนเมื่อหนังสือออกใหม่ของนักเขียนที่ฉันติดตาม",
    enabled: true,
  },
  {
    key: "publishers",
    title: "สำนักพิมพ์",
    detail: "แจ้งเตือนเมื่อหนังสือออกใหม่ของสำนักพิมพ์ที่ฉันติดตาม",
    enabled: true,
  },
  {
    key: "series",
    title: "ซีรีส์",
    detail: "แจ้งเตือนเมื่อมีตอนใหม่ของซีรีส์ที่ฉันติดตาม",
    enabled: true,
  },
  {
    key: "collections",
    title: "เล่มถัดไป",
    detail: "แจ้งเตือนเมื่อหนังสือเล่มถัดไปจากเล่มที่ฉันมี",
    enabled: true,
  },
  {
    key: "comments",
    title: "ความคิดเห็นตอบกลับ",
    detail: "แจ้งเตือนเมื่อมีผู้ใช้งานตอบกลับความคิดเห็นของฉัน",
    enabled: true,
  },
  {
    key: "news",
    title: "ข่าวสาร",
    detail: "แจ้งเตือนเมื่อมีข่าวสารจาก Read and Voice",
    enabled: false,
  },
  {
    key: "push",
    title: "แจ้งเตือนแบบพุช",
    detail: "สำหรับผู้ใช้โมบายแอปบนอุปกรณ์มือถือและแท็บเล็ต",
    enabled: true,
  },
]);

const notificationCount = computed(
  () => notificationItems.value.filter((item) => item.unread).length,
);

const refreshAuth = () => {
  authVersion.value += 1;
};

const user = computed<StoredUser>(() => {
  authVersion.value;
  return getUser() as StoredUser;
});

const isLoggedIn = computed(() => {
  authVersion.value;
  return !!getToken() && !!user.value;
});

const normalizeRole = (role: string | undefined): UserRole => {
  const normalized = role?.trim().toLowerCase();
  return allRoles.includes(normalized as UserRole)
    ? (normalized as UserRole)
    : "user";
};

const currentRole = computed<UserRole>(() => {
  return isLoggedIn.value ? normalizeRole(user.value?.role) : "guest";
});

const currentRoleLabel = computed(() => {
  const labels: Record<UserRole, string> = {
    guest: "ผู้เยี่ยมชม",
    user: "สมาชิกทั่วไป",
    writer: "นักเขียน",
    admin: "ผู้ดูแลระบบ",
    superadmin: "ผู้ดูแลสูงสุด",
  };

  return labels[currentRole.value];
});

const themeOptions: { label: string; value: ThemeMode }[] = [
  { label: "ปกติ", value: "normal" },
  { label: "มืด", value: "dark" },
  { label: "อ่าน", value: "reading" },
];

const publicNavItems: NavItem[] = [
  {
    label: "หน้าแรก",
    to: "/",
    roles: ["guest", "user", "writer", "admin", "superadmin"],
  },
  {
    label: "E-Book",
    to: "/store",
    roles: ["guest", "user", "writer", "admin", "superadmin"],
  },
  {
    label: "รายตอน",
    to: "/serials",
    roles: ["guest", "user", "writer", "admin", "superadmin"],
  },
];

const mainNavItems = computed(() => {
  return publicNavItems.filter((item) =>
    item.roles.includes(currentRole.value),
  );
});

const accountGroups = computed<NavGroup[]>(() => {
  const role = currentRole.value;
  const groups: NavGroup[] = [
    {
      title: "บัญชีของฉัน",
      items: [
        {
          label: "โปรไฟล์",
          to: "/profile",
          roles: ["user", "writer", "admin", "superadmin"],
        },
        {
          label: "ประวัติคำสั่งซื้อ",
          to: "/orders/history",
          roles: ["user", "writer"],
        },
      ],
    },
    {
      title: "การใช้งาน",
      items: [
        {
          label: "ชั้นหนังสือของฉัน",
          to: "/my-library",
          roles: ["user", "writer"],
        },
        { label: "รายการโปรด", to: "/wishlist", roles: ["user", "writer"] },
        { label: "ตะกร้า", to: "/cart", roles: ["user", "writer"] },
      ],
    },
    {
      title: "นักเขียน",
      items: [
        { label: "แดชบอร์ดนักเขียน", to: "/writer", roles: ["writer"] },
        { label: "หนังสือของฉัน", to: "/writer/books", roles: ["writer"] },
        { label: "อัปโหลดหนังสือ", to: "/writer/upload", roles: ["writer"] },
        { label: "สถิติหนังสือ", to: "/writer/stats", roles: ["writer"] },
      ],
    },
    {
      title: "จัดการระบบ",
      items: [
        { label: "ตรวจภาพรวมระบบ", to: "/admin", roles: ["admin", "superadmin"] },
        {
          label: "จัดข้อมูลหน้าเมนู",
          to: "/admin/page-content",
          roles: ["admin", "superadmin"],
        },
        {
          label: "ตรวจสอบ / แก้ไขหนังสือ",
          to: "/admin/books",
          roles: ["admin", "superadmin"],
        },
        {
          label: "จัดหมวดหมู่หนังสือ",
          to: "/admin/categories",
          roles: ["admin", "superadmin"],
        },
        {
          label: "เพิ่มหนังสือเข้าระบบ",
          to: "/admin/upload-book",
          roles: ["admin", "superadmin"],
        },
        {
          label: "ตรวจสมาชิกบางส่วน",
          to: "/admin/members",
          roles: ["admin", "superadmin"],
        },
      ],
    },
    {
      title: "สิทธิ์ขั้นสูง",
      items: [
        {
          label: "จัดการผู้ใช้",
          to: "/superadmin/users",
          roles: ["superadmin"],
        },
        {
          label: "เปลี่ยน role / ระงับผู้ใช้",
          to: "/superadmin/roles",
          roles: ["superadmin"],
        },
        {
          label: "ตั้งค่าระบบ",
          to: "/superadmin/settings",
          roles: ["superadmin"],
        },
      ],
    },
  ];

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
});

const closeMenu = () => {
  isMenuOpen.value = false;
};

const openSearch = () => {
  isSearchOpen.value = true;
};

const closeSearch = () => {
  isSearchOpen.value = false;
};

const toggleNotifications = () => {
  isNotificationsOpen.value = !isNotificationsOpen.value;
};

const openNotificationSettings = () => {
  isNotificationSettingsOpen.value = true;
};

const closeNotificationSettings = () => {
  isNotificationSettingsOpen.value = false;
};

const deleteNotification = (id: number) => {
  notificationItems.value = notificationItems.value.filter((item) => item.id !== id);
};

const clearNotifications = () => {
  notificationItems.value = [];
};

const closeFloatingMenus = () => {
  isNotificationsOpen.value = false;
  document.querySelectorAll<HTMLDetailsElement>(".icon-dropdown[open]").forEach((item) => {
    item.open = false;
  });
};

const handleDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const navbar = navbarRef.value;
  const activeDropdown = target.closest(".icon-dropdown") as HTMLDetailsElement | null;
  document.querySelectorAll<HTMLDetailsElement>(".icon-dropdown[open]").forEach((item) => {
    if (item !== activeDropdown) {
      item.open = false;
    }
  });

  if (navbar && !navbar.contains(target)) {
    closeMenu();
    closeFloatingMenus();
    return;
  }

  if (!target.closest(".icon-dropdown, .notification-wrapper")) {
    closeFloatingMenus();
  }
};

const submitSearch = () => {
  const keyword = search.value.trim();
  closeMenu();
  closeSearch();
  router.push(
    keyword ? { name: "Store", query: { q: keyword } } : { name: "Store" },
  );
};

const logout = () => {
  clearAuth();
  closeMenu();
  router.push({ name: "Login", query: { loggedOut: "1" } });
};

onMounted(() => {
  window.addEventListener(AUTH_CHANGED_EVENT, refreshAuth);
  window.addEventListener("storage", refreshAuth);
  document.addEventListener("pointerdown", handleDocumentPointerDown);
});

onUnmounted(() => {
  window.removeEventListener(AUTH_CHANGED_EVENT, refreshAuth);
  window.removeEventListener("storage", refreshAuth);
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
});
</script>

<template>
  <header ref="navbarRef" class="navbar">
    <div class="top-bar">
      <div class="left-cluster">
        <button
          class="menu-toggle icon-button"
          type="button"
          :aria-expanded="isMenuOpen"
          aria-controls="mobile-menu"
          @click="isMenuOpen = !isMenuOpen"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              class="menu-icon-lines"
              d="M4.8 6.8h14.4M4.8 12h14.4M4.8 17.2h14.4"
            />
          </svg>
        </button>

        <router-link
          class="brand"
          to="/"
          aria-label="กลับหน้าแรก"
          @click="closeMenu"
        >
          <img class="brand-logo" :src="logoUrl" alt="Read and Voice" />
        </router-link>

        <router-link class="subscription-link" to="/subscription" @click="closeMenu">
          สมัครรายเดือน
        </router-link>

        <router-link class="coin-link" to="/coin-wallet" @click="closeMenu">
          <span class="coin-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M8.3 12.2c0-2.3 1.5-3.9 3.8-3.9 1.2 0 2.3.4 3.1 1.2l-1.2 1.4c-.5-.5-1.1-.8-1.9-.8-1.1 0-1.9.8-1.9 2.1s.8 2.1 2 2.1c.8 0 1.5-.3 2-.9l1.2 1.3c-.8.9-1.9 1.4-3.3 1.4-2.3 0-3.8-1.6-3.8-3.9Z" />
            </svg>
          </span>
          เติม coin
        </router-link>
      </div>

      <nav class="desktop-public-nav" aria-label="เมนูหลัก">
        <router-link
          v-for="item in mainNavItems"
          :key="item.to"
          :to="item.to"
          @click="closeMenu"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <div class="top-actions">
        <button
          class="icon-button"
          type="button"
          aria-label="ค้นหาหนังสือ"
          @click="openSearch"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M10.8 4.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Zm0 2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm5.4 9 4 4-1.4 1.4-4-4 1.4-1.4Z"
            />
          </svg>
        </button>

        <details class="icon-dropdown">
          <summary class="icon-button" aria-label="เปลี่ยนโหมดสี">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3a9 9 0 0 0 0 18h.4a3.1 3.1 0 0 0 2.2-5.3 1.1 1.1 0 0 1 .8-1.9H17a4 4 0 0 0 0-8h-.5A8.9 8.9 0 0 0 12 3Zm-5 9.2a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm3.1-4.1a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm4.6.1a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z"
              />
            </svg>
          </summary>
          <div class="dropdown-panel theme-panel">
            <button
              v-for="option in themeOptions"
              :key="option.value"
              type="button"
              :class="{ active: props.theme === option.value }"
              @click="emit('change-theme', option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </details>

        <div v-if="isLoggedIn" class="notification-wrapper">
          <button
            class="notification-button"
            type="button"
            aria-label="แจ้งเตือน"
            :aria-expanded="isNotificationsOpen"
            @click="toggleNotifications"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 22a2.7 2.7 0 0 0 2.6-2h-5.2A2.7 2.7 0 0 0 12 22Zm7-5-1.8-2.2V10a5.2 5.2 0 0 0-4-5.1V3a1.2 1.2 0 0 0-2.4 0v1.9a5.2 5.2 0 0 0-4 5.1v4.8L5 17v1h14v-1Z"
              />
            </svg>
            <span v-if="notificationCount" class="notification-badge">
              {{ notificationCount > 99 ? "99+" : notificationCount }}
            </span>
          </button>

          <div v-if="isNotificationsOpen" class="notification-panel">
            <div class="notification-panel__header">
              <h3>แจ้งเตือน</h3>
              <div class="notification-panel__actions">
                <button
                  type="button"
                  aria-label="ล้างแจ้งเตือนทั้งหมด"
                  @click="clearNotifications"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 4V3h8v1h4v2H4V4h4Zm-1 4h10l-.7 12H7.7L7 8Zm3 2v8h1.5v-8H10Zm2.5 0v8H14v-8h-1.5Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="ตั้งค่าการแจ้งเตือน"
                  @click="openNotificationSettings"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m19.4 13.5 1.4 1.1-2 3.5-1.8-.7c-.5.4-1 .7-1.6.9L15.1 20h-4.2l-.3-1.7c-.6-.2-1.1-.5-1.6-.9l-1.8.7-2-3.5 1.4-1.1a6 6 0 0 1 0-1.8l-1.4-1.1 2-3.5 1.8.7c.5-.4 1-.7 1.6-.9l.3-1.7h4.2l.3 1.7c.6.2 1.1.5 1.6.9l1.8-.7 2 3.5-1.4 1.1a6 6 0 0 1 0 1.8ZM12 15.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </svg>
                </button>
              </div>
            </div>

            <div v-if="notificationItems.length" class="notification-list">
              <article
                v-for="item in notificationItems"
                :key="item.id"
                class="notification-item"
                :class="{ unread: item.unread }"
              >
                <span class="notification-thumb" :class="`tone-${item.tone}`">RV</span>
                <div class="notification-copy">
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.detail }}</p>
                  <time>{{ item.time }}</time>
                </div>
                <button
                  class="notification-delete"
                  type="button"
                  aria-label="ลบแจ้งเตือนนี้"
                  @click="deleteNotification(item.id)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
                  </svg>
                </button>
              </article>
            </div>
            <p v-else class="notification-empty">ยังไม่มีแจ้งเตือนใหม่</p>
            <h3>แจ้งเตือน</h3>
            <p v-for="item in notifications" :key="item">{{ item }}</p>
          </div>
        </div>

        <router-link
          v-if="isLoggedIn"
          class="library-shortcut"
          to="/my-library"
          aria-label="ชั้นหนังสือของฉัน"
          @click="closeMenu"
        >
          <span class="library-shortcut__icon" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <path
                d="M16 20.5c6.3 0 11.1 1.1 15 3.7v21.4c-3.9-2.4-8.7-3.5-15-3.5V20.5Zm17 3.7c3.9-2.6 8.7-3.7 15-3.7v21.6c-6.3 0-11.1 1.1-15 3.5V24.2ZM13 24h2v20.2c5.7 0 10.9.8 15.2 3H13V24Zm36 0h2v23.2H33.8c4.3-2.2 9.5-3 15.2-3V24Z"
              />
            </svg>
          </span>
          <span class="library-shortcut__text">ชั้นหนังสือ</span>
        </router-link>

        <details class="icon-dropdown account-dropdown">
          <summary class="avatar-button" aria-label="บัญชีผู้ใช้">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 12a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Zm0 2c-4.2 0-7.6 2.2-7.6 5v1.2h15.2V19c0-2.8-3.4-5-7.6-5Z"
              />
            </svg>
          </summary>

          <div class="dropdown-panel account-panel">
            <template v-if="isLoggedIn">
              <div class="role-summary">
                <span>สิทธิ์ที่เข้าสู่ระบบ</span>
                <strong>{{ currentRoleLabel }}</strong>
              </div>

              <section
                v-for="group in accountGroups"
                :key="group.title"
                class="account-section"
              >
                <h3>{{ group.title }}</h3>
                <router-link
                  v-for="item in group.items"
                  :key="item.to + item.label"
                  class="account-link"
                  :to="item.to"
                >
                  {{ item.label }}
                </router-link>
              </section>

              <button class="account-btn" type="button" @click="logout">
                ออกจากระบบ
              </button>
            </template>

            <template v-else>
              <div class="guest-actions">
                <router-link class="guest-auth-link" to="/login">
                  เข้าสู่ระบบ
                </router-link>
                <span>/</span>
                <router-link class="guest-auth-link" to="/register">
                  สมัครสมาชิก
                </router-link>
              </div>
            </template>
          </div>
        </details>

      </div>
    </div>

    <form
      class="search-overlay"
      :class="{ open: isSearchOpen }"
      role="search"
      @submit.prevent="submitSearch"
    >
      <div class="search-box">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M10.8 4.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Zm0 2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm5.4 9 4 4-1.4 1.4-4-4 1.4-1.4Z"
          />
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="ค้นหา"
          aria-label="ค้นหาหนังสือ"
        />
        <button
          class="search-close"
          type="button"
          aria-label="ปิดค้นหา"
          @click="closeSearch"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z"
            />
          </svg>
        </button>
      </div>
    </form>

    <div
      v-if="isMenuOpen"
      class="mobile-backdrop"
      aria-hidden="true"
      @click="closeMenu"
    ></div>

    <div id="mobile-menu" class="mobile-panel" :class="{ open: isMenuOpen }">
      <div class="mobile-panel-header">
        <button
          class="mobile-close"
          type="button"
          aria-label="ปิดเมนู"
          @click="closeMenu"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z"
            />
          </svg>
        </button>

        <img class="mobile-panel-logo" :src="logoUrl" alt="Read and Voice" />
      </div>

      <form class="mobile-search" role="search" @submit.prevent="submitSearch">
        <input v-model="search" type="search" placeholder="ค้นหาหนังสือ" />
      </form>

      <section class="mobile-quick-actions" aria-label="เมนูพิเศษ">
        <router-link
          class="mobile-subscription-link"
          to="/subscription"
          @click="closeMenu"
        >
          สมัครรายเดือน
        </router-link>

        <router-link
          class="mobile-coin-link"
          to="/coin-wallet"
          @click="closeMenu"
        >
          <span class="coin-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M8.3 12.2c0-2.3 1.5-3.9 3.8-3.9 1.2 0 2.3.4 3.1 1.2l-1.2 1.4c-.5-.5-1.1-.8-1.9-.8-1.1 0-1.9.8-1.9 2.1s.8 2.1 2 2.1c.8 0 1.5-.3 2-.9l1.2 1.3c-.8.9-1.9 1.4-3.3 1.4-2.3 0-3.8-1.6-3.8-3.9Z" />
            </svg>
          </span>
          เติม coin
        </router-link>
      </section>

      <section class="mobile-group mobile-card">
        <h3>เมนูหลัก</h3>
        <router-link
          v-for="item in mainNavItems"
          :key="item.to"
          :to="item.to"
          @click="closeMenu"
        >
          {{ item.label }}
        </router-link>
      </section>

      <section v-if="isLoggedIn" class="mobile-group mobile-card">
        <h3>เมนูของฉัน</h3>
        <details class="mobile-details">
          <summary class="mobile-nav-link">
            แจ้งเตือน
            <span v-if="notificationCount" class="mobile-count">
              {{ notificationCount > 99 ? "99+" : notificationCount }}
            </span>
          </summary>
          <p v-for="item in notifications" :key="item">{{ item }}</p>
        </details>
        <router-link
          class="mobile-nav-link"
          to="/my-library"
          @click="closeMenu"
        >
          ชั้นหนังสือของฉัน
        </router-link>
      </section>

      <section class="mobile-account-group">
        <h3>บัญชี</h3>
        <template v-if="!isLoggedIn">
          <router-link to="/login" @click="closeMenu">เข้าสู่ระบบ</router-link>
          <router-link to="/register" @click="closeMenu">
            สมัครสมาชิก
          </router-link>
        </template>
        <template v-else>
          <template v-for="group in accountGroups" :key="group.title">
            <h3 class="mobile-subtitle">{{ group.title }}</h3>
            <router-link
              v-for="item in group.items"
              :key="item.to + item.label"
              :to="item.to"
              @click="closeMenu"
            >
              {{ item.label }}
            </router-link>
          </template>
          <button type="button" @click="logout">ออกจากระบบ</button>
        </template>
      </section>

      <section class="mobile-group mobile-card">
        <h3>โหมดสี</h3>
        <div class="theme-switcher mobile-theme">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            :class="{ active: props.theme === option.value }"
            @click="emit('change-theme', option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>
    </div>

    <div
      v-if="isNotificationSettingsOpen"
      class="notification-settings-backdrop"
      @click.self="closeNotificationSettings"
    >
      <section class="notification-settings" aria-label="ตั้งค่าการแจ้งเตือน">
        <button
          class="notification-settings__close"
          type="button"
          aria-label="ปิดตั้งค่าการแจ้งเตือน"
          @click="closeNotificationSettings"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
          </svg>
        </button>
        <h2>ตั้งค่าการแจ้งเตือน</h2>
        <label
          v-for="setting in notificationSettings"
          :key="setting.key"
          class="notification-setting"
        >
          <input v-model="setting.enabled" type="checkbox" />
          <span>
            <strong>{{ setting.title }}</strong>
            <small>{{ setting.detail }}</small>
          </span>
        </label>
        <button
          class="notification-settings__save"
          type="button"
          @click="closeNotificationSettings"
        >
          บันทึก
        </button>
      </section>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background: color-mix(in srgb, #e7fbf7 88%, white);
  border-bottom: 1px solid rgba(17, 156, 145, 0.16);
  box-shadow: 0 10px 28px rgba(17, 156, 145, 0.1);
  backdrop-filter: blur(16px);
}

.top-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 42px;
  min-height: 94px;
  padding: 12px clamp(52px, 6.2vw, 126px);
}

.left-cluster {
  display: flex;
  align-items: center;
  gap: 18px;
  flex: 0 0 auto;
}

.brand,
.desktop-public-nav a,
.account-link,
.subscription-link,
.coin-link,
.library-shortcut,
.mobile-coin-link,
.mobile-subscription-link {
  text-decoration: none;
}

.brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 128px;
  height: 58px;
  overflow: visible;
  padding: 0;
  border-radius: 8px;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.brand:hover {
  background: rgba(46, 196, 182, 0.12);
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(17, 156, 145, 0.16);
}

.brand:hover .brand-logo {
  transform: scale(1.9);
}

.brand:active {
  transform: scale(0.97);
}

.brand-logo {
  width: 204px;
  height: auto;
  max-height: 82px;
  object-fit: contain;
  transform-origin: center;
  transform: scale(1.8);
  transition:
    filter 0.2s ease,
    transform 0.2s ease;
  will-change: transform;
}

.subscription-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 142px;
  min-height: 38px;
  border-radius: 999px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent 42%),
    linear-gradient(135deg, #45c8c4 0%, #20aeb4 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0;
  padding: 0 18px;
  position: relative;
  isolation: isolate;
  box-shadow:
    0 10px 20px rgba(47, 183, 186, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition:
    background 0.2s ease,
    filter 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
  white-space: nowrap;
}

.subscription-link::after {
  content: "";
  position: absolute;
  inset: 2px;
  z-index: -1;
  border-radius: inherit;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.35), transparent 42%);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.subscription-link:hover,
.mobile-subscription-link:hover {
  filter: saturate(1.1);
  transform: translateY(-2px);
  box-shadow:
    0 14px 24px rgba(47, 183, 186, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.subscription-link:hover::after {
  opacity: 1;
}

.subscription-link:active,
.mobile-subscription-link:active {
  transform: translateY(0) scale(0.96);
  box-shadow:
    0 6px 14px rgba(47, 183, 186, 0.22),
    inset 0 2px 4px rgba(7, 99, 96, 0.22);
}

.coin-link,
.mobile-coin-link {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  border: 1px solid rgba(217, 159, 18, 0.48);
  border-radius: 999px;
  background: #f6bf36;
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
  padding: 0 16px 0 12px;
  white-space: nowrap;
  box-shadow:
    0 10px 22px rgba(208, 139, 18, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  overflow: hidden;
  transition:
    filter 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.coin-link::after,
.mobile-coin-link::after {
  display: none;
}

.coin-mark {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  filter: drop-shadow(0 2px 4px rgba(112, 71, 0, 0.24));
  transition: transform 0.2s ease;
}

.coin-mark svg {
  width: 100%;
  height: 100%;
}

.coin-mark circle {
  fill: rgba(255, 255, 255, 0.2);
  stroke: #ffffff;
  stroke-width: 1.6;
}

.coin-mark path {
  fill: #ffffff;
}

.coin-link:hover,
.mobile-coin-link:hover {
  filter: saturate(1.08);
  transform: translateY(-2px);
  box-shadow:
    0 14px 28px rgba(208, 139, 18, 0.32),
    0 0 0 4px rgba(255, 214, 90, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.coin-link:hover::after,
.mobile-coin-link:hover::after {
  display: none;
}

.coin-link:hover .coin-mark,
.mobile-coin-link:hover .coin-mark {
  transform: rotate(-12deg) scale(1.12);
}

.coin-link:active,
.mobile-coin-link:active {
  transform: translateY(0) scale(0.96);
}

.desktop-public-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-width: 0;
  overflow: hidden;
}

.desktop-public-nav a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  min-width: 0;
  border: 0;
  border-radius: 999px;
  color: #1f2937;
  font-size: 16px;
  font-weight: 800;
  position: relative;
  padding: 0 18px;
  isolation: isolate;
  overflow: hidden;
  white-space: nowrap;
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease,
    color 0.2s ease,
    transform 0.18s ease;
}

.desktop-public-nav a::before {
  display: none;
}

.desktop-public-nav a::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 3px;
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: #14b8a6;
  box-shadow: none;
  opacity: 0;
  transform: translateX(-50%) scaleX(0.35);
  transform-origin: center;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.desktop-public-nav a:hover,
.desktop-public-nav a.router-link-exact-active {
  color: #0f766e;
}

.desktop-public-nav a:hover {
  transform: translateY(-1px);
  background: rgba(20, 184, 166, 0.08);
  text-shadow: none;
}

.desktop-public-nav a:hover::after,
.desktop-public-nav a.router-link-exact-active::after {
  opacity: 1;
  transform: translateX(-50%) scaleX(1);
}

.desktop-public-nav a.router-link-exact-active {
  border: 2px solid #111827;
  background: #ffe9dc;
  color: #ea6b3a;
  box-shadow: 0 6px 14px rgba(234, 107, 58, 0.12);
}

.desktop-public-nav a.router-link-exact-active::after {
  display: none;
}

.desktop-public-nav a:active {
  transform: translateY(0) scale(0.96);
  color: #0f766e;
}

.desktop-public-nav a:active::after {
  background: #0f766e;
  transform: translateX(-50%) scaleX(0.78);
}

.top-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 22px;
  flex: 0 0 auto;
}

.icon-dropdown {
  position: relative;
}

.icon-button,
.avatar-button,
.notification-button {
  display: inline-grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  color: #082f2b;
  cursor: pointer;
  list-style: none;
  flex: 0 0 auto;
  box-shadow: 0 4px 14px rgba(15, 118, 110, 0.08);
}

.icon-button::-webkit-details-marker,
.avatar-button::-webkit-details-marker {
  display: none;
}

.icon-button svg,
.avatar-button svg,
.notification-button svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.icon-button:hover,
.avatar-button:hover,
.notification-button:hover,
.icon-dropdown[open] > summary {
  background: #d5f6ef;
  color: #0f766e;
}

.avatar-button {
  background: #2ec4b6;
  color: white;
}

.notification-wrapper {
  position: relative;
  flex: 0 0 auto;
}

.library-shortcut {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 46px;
  border: 1px solid #2ec4b6;
  border-radius: 8px;
  background: transparent;
  color: #0b5f59;
  font-size: 13px;
  font-weight: 900;
  padding: 0 14px 0 9px;
  box-shadow: none;
  white-space: nowrap;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.library-shortcut__icon {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2ec4b6;
  color: #ffffff;
  box-shadow: none;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.library-shortcut__icon svg {
  width: 19px;
  height: 19px;
  fill: currentColor;
}

.library-shortcut:hover,
.library-shortcut.router-link-active {
  border-color: #2ec4b6;
  background: rgba(46, 196, 182, 0.1);
  color: #0f766e;
  transform: translateY(-1px);
  box-shadow: none;
}

.library-shortcut:hover .library-shortcut__icon,
.library-shortcut.router-link-active .library-shortcut__icon {
  background: #2ec4b6;
  color: #ffffff;
  transform: translateY(-1px) rotate(-4deg);
}

.library-shortcut:active {
  transform: translateY(0) scale(0.97);
  box-shadow:
    0 4px 12px rgba(15, 118, 110, 0.14),
    0 0 0 2px rgba(46, 196, 182, 0.1);
}

.notification-button {
  position: relative;
  background: rgba(255, 255, 255, 0.8);
  color: #111827;
}

.notification-badge {
  position: absolute;
  top: -8px;
  right: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  border-radius: 999px;
  background: #ef3f7a;
  color: white;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  padding: 0 7px;
  box-shadow: 0 4px 10px rgba(239, 63, 122, 0.28);
}

.notification-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 72;
  display: grid;
  gap: 0;
  width: min(430px, calc(100vw - 24px));
  max-height: min(620px, calc(100vh - 110px));
  overflow: hidden;
  border: 1px solid rgba(17, 156, 145, 0.18);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.18);
  padding: 0;
}

.notification-panel > h3,
.notification-panel > p:not(.notification-empty) {
  display: none;
}

.notification-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 14px;
}

.notification-panel__header h3 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
  font-weight: 900;
}

.notification-panel__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.notification-panel__actions button,
.notification-delete {
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #334155;
  cursor: pointer;
  padding: 8px;
}

.notification-panel__actions button:hover,
.notification-delete:hover {
  background: #eefbf8;
  color: #0f766e;
}

.notification-panel__actions svg,
.notification-delete svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.notification-list {
  max-height: 520px;
  overflow-y: auto;
}

.notification-item {
  position: relative;
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 10px;
  border-bottom: 1px solid #eef2f7;
  padding: 12px 10px 12px 14px;
}

.notification-item.unread::before {
  content: "";
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 999px;
  background: #10b981;
}

.notification-thumb {
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: 54px;
  border-radius: 6px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
}

.tone-sale {
  background: #f97316;
}

.tone-serial {
  background: #22c55e;
}

.tone-writer {
  background: #0ea5e9;
}

.tone-comment {
  background: #ec4899;
}

.notification-copy {
  min-width: 0;
}

.notification-copy h4 {
  margin: 0 0 3px;
  color: #1f2937;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.25;
}

.notification-copy p {
  margin: 0 0 2px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.notification-copy time {
  color: #7c8794;
  font-size: 12px;
  font-weight: 700;
}

.notification-delete {
  align-self: start;
  opacity: 0;
  transition: opacity 0.16s ease;
}

.notification-item:hover .notification-delete {
  opacity: 1;
}

.notification-empty {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 800;
  padding: 24px;
  text-align: center;
}

.notification-settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1001;
  display: grid;
  align-items: start;
  justify-items: center;
  background: rgba(15, 23, 42, 0.38);
  padding: clamp(96px, 12vh, 132px) 22px 22px;
}

.notification-settings {
  position: relative;
  width: min(620px, calc(100vw - 28px));
  max-height: calc(100vh - 132px);
  overflow-y: auto;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  padding: 34px 42px 32px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.notification-settings h2 {
  margin: 0 0 26px;
  color: #102a35;
  font-size: 28px;
  font-weight: 900;
  text-align: center;
}

.notification-settings__close {
  position: absolute;
  top: 18px;
  right: 18px;
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #555f68;
  cursor: pointer;
}

.notification-settings__close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.notification-settings__close svg {
  width: 30px;
  height: 30px;
  fill: currentColor;
}

.notification-setting {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 14px;
  align-items: start;
  margin-bottom: 16px;
}

.notification-setting input {
  width: 16px;
  height: 16px;
  margin-top: 4px;
  accent-color: #10b981;
}

.notification-setting strong {
  display: block;
  color: #1f2937;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
}

.notification-setting small {
  display: block;
  margin-top: 4px;
  color: #8b949e;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}

.notification-settings__save {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 126px;
  min-height: 48px;
  margin: 28px auto 0;
  border: 0;
  border-radius: 999px;
  background: #10b981;
  color: #ffffff;
  cursor: pointer;
  font-size: 20px;
  font-weight: 900;
  padding: 0 28px;
}

.notification-settings__save:hover {
  background: #059669;
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 70;
  display: grid;
  min-width: 210px;
  border: 1px solid rgba(17, 156, 145, 0.18);
  border-radius: 12px;
  background: #f8fffd;
  box-shadow: 0 12px 28px rgba(17, 156, 145, 0.14);
  padding: 8px;
}

.theme-panel,
.account-panel {
  gap: 8px;
}

.account-panel {
  min-width: 300px;
  max-width: min(360px, calc(100vw - 24px));
}

.guest-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
}

.guest-auth-link {
  color: #0f766e;
  font-size: 15px;
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.guest-auth-link:hover {
  color: #0b5f59;
}

.role-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 8px;
  background: #e8faf6;
  color: #0b5f59;
  padding: 10px 12px;
}

.role-summary span {
  font-size: 12px;
  font-weight: 800;
}

.role-summary strong {
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
}

.account-section {
  display: grid;
  gap: 4px;
  border-bottom: 1px solid rgba(17, 156, 145, 0.14);
  padding: 4px 0 8px;
}

.account-section:last-of-type {
  border-bottom: 0;
}

.account-section h3 {
  margin: 0;
  color: #0b5f59;
  font-size: 12px;
  font-weight: 900;
}

.account-link {
  display: flex;
  align-items: center;
  min-height: 34px;
  border-radius: 8px;
  color: #244b47;
  font-size: 14px;
  font-weight: 800;
  padding: 7px 10px;
}

.account-link:hover,
.account-link.router-link-active {
  background: #dff8f3;
  color: #0f766e;
}

.theme-panel button,
.theme-switcher button {
  min-height: 38px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #244b47;
  cursor: pointer;
  font-weight: 900;
  padding: 8px 12px;
  text-align: left;
  white-space: nowrap;
}

.theme-panel button:hover,
.theme-panel button.active,
.theme-switcher button.active {
  color: #0f766e;
  background: #dff8f3;
}

.account-btn,
.mobile-group button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border: 1px solid #2ec4b6;
  border-radius: 8px;
  background: #2ec4b6;
  color: white;
  cursor: pointer;
  font-weight: 900;
  padding: 8px 12px;
  white-space: nowrap;
}

.menu-toggle {
  display: none;
}

.menu-toggle svg {
  width: 38px;
  height: 38px;
}

.menu-icon-lines {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 3.2;
}

.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  display: none;
  justify-content: center;
  width: 100vw;
  min-height: 52px;
  padding: 8px 14px;
  background: #ffffff;
  color: #111827;
  box-shadow: 0 1px 0 rgba(17, 24, 39, 0.08);
}

.search-overlay.open {
  display: flex;
}

.search-box {
  display: flex;
  align-items: center;
  width: min(800px, calc(100vw - 28px));
  min-height: 36px;
  border-radius: 999px;
  background: #f2f2f3;
  padding: 0 4px 0 10px;
}

.search-box > svg {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  fill: currentColor;
}

.search-box input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 34px;
  border: 0;
  background: transparent;
  color: #111827;
  font-size: 15px;
  outline: none;
  padding: 0 6px;
}

.search-close {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #7b8087;
  cursor: pointer;
  padding: 0;
}

.search-close:hover {
  background: rgba(17, 24, 39, 0.08);
  color: #111827;
}

.search-close svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.mobile-panel {
  display: none;
}

.mobile-backdrop {
  display: none;
}

.mobile-panel-header {
  display: none;
}

.mobile-search input {
  width: 100%;
  min-height: 42px;
  border: 1px solid rgba(17, 156, 145, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  color: #244b47;
  outline: none;
  padding: 0 14px;
}

.mobile-search input:focus {
  border-color: #2ec4b6;
  box-shadow: 0 0 0 3px rgba(46, 196, 182, 0.18);
}

.mobile-subscription-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  border-radius: 999px;
  background: linear-gradient(135deg, #4cc8c6 0%, #2fb7ba 100%);
  color: white;
  font-weight: 900;
  padding: 0 20px;
}

.mobile-coin-link {
  width: fit-content;
  min-height: 42px;
}

.mobile-account-group {
  display: none;
}

@media (max-width: 1280px) {
  .top-bar {
    grid-template-columns: auto 1fr auto;
    gap: 30px;
    min-height: 86px;
    padding-inline: clamp(42px, 5vw, 86px);
  }

  .left-cluster {
    gap: 30px;
  }

  .brand {
    width: 116px;
    height: 54px;
  }

  .brand-logo {
    width: 190px;
    max-height: 76px;
    transform: scale(1.72);
  }

  .subscription-link {
    min-width: 132px;
    min-height: 36px;
    font-size: 14px;
    padding: 0 16px;
  }

  .desktop-public-nav {
    gap: 14px;
  }

  .desktop-public-nav a {
    font-size: 15px;
    min-width: 0;
    padding: 0 14px;
  }
}

@media (max-width: 980px) {
  .top-bar {
    grid-template-columns: auto 1fr auto;
    gap: 16px;
    position: relative;
  }

  .left-cluster {
    order: 1;
    justify-self: start;
    gap: 12px;
    margin-left: 0;
  }

  .left-cluster > .subscription-link,
  .left-cluster > .coin-link {
    display: none;
  }

  .top-actions {
    order: 3;
    justify-self: end;
    gap: 10px;
  }

  .top-actions > .icon-dropdown:not(.account-dropdown),
  .notification-wrapper,
  .library-shortcut {
    display: none;
  }

  .desktop-public-nav {
    display: none;
  }

  .menu-toggle {
    display: inline-grid;
    position: static;
    z-index: 2;
    width: 46px;
    height: 46px;
    background: transparent;
    box-shadow: none;
    color: #111827;
  }

  .menu-toggle:hover {
    background: rgba(20, 184, 166, 0.12);
  }

  .mobile-backdrop {
    position: fixed;
    inset: 0;
    z-index: 69;
    display: block;
    background: rgba(15, 23, 42, 0.22);
    backdrop-filter: blur(2px);
  }

  .mobile-panel.open {
    display: grid;
    align-content: start;
    gap: 16px;
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 70;
    width: min(340px, 88vw);
    min-height: 100vh;
    overflow-y: auto;
    padding: 18px 16px 28px;
    background: #f8fffd;
    box-shadow: 18px 0 36px rgba(15, 23, 42, 0.16);
  }

  .mobile-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-height: 48px;
    margin-bottom: 2px;
  }

  .mobile-close {
    display: inline-grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border: 1px solid rgba(15, 118, 110, 0.18);
    border-radius: 8px;
    background: #ffffff;
    color: #111827;
    cursor: pointer;
    padding: 0;
  }

  .mobile-close:hover {
    background: #f8fafc;
  }

  .mobile-close svg {
    width: 28px;
    height: 28px;
    fill: currentColor;
  }

  .mobile-panel-logo {
    width: 118px;
    height: 48px;
    object-fit: contain;
  }

  .mobile-search,
  .mobile-account-group {
    display: none;
  }

  .mobile-quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .mobile-group {
    display: grid;
    gap: 8px;
    border-top: 0;
    padding-top: 0;
  }

  .mobile-card {
    border: 1px solid rgba(15, 118, 110, 0.14);
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 12px 24px rgba(15, 118, 110, 0.08);
    padding: 12px;
  }

  .mobile-group h3 {
    margin: 0 0 4px;
    color: #0f766e;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.02em;
  }

  .mobile-subtitle {
    margin-top: 8px !important;
    color: #4a716d !important;
    font-size: 12px !important;
  }

  .mobile-group a,
  .mobile-group button {
    width: 100%;
    min-height: 42px;
    justify-content: flex-start;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #0f172a;
    font-size: 15px;
    font-weight: 900;
    line-height: 1.25;
    padding: 0 10px;
    text-decoration: none;
  }

  .mobile-group a:hover,
  .mobile-group button:hover,
  .mobile-group a.router-link-active {
    color: #0f766e;
    background: #e8faf6;
    transform: translateX(2px);
  }

  .mobile-group .mobile-subscription-link {
    color: #ffffff;
    font-size: 15px;
    min-height: 44px;
    padding: 0 14px;
  }

  .mobile-group .mobile-subscription-link:hover {
    color: #db2777;
  }

  .mobile-quick-actions .mobile-subscription-link {
    min-height: 44px;
    border-radius: 8px;
    background: #2ec4b6;
    color: #ffffff;
    box-shadow: 0 10px 20px rgba(15, 118, 110, 0.14);
  }

  .mobile-quick-actions .mobile-coin-link {
    width: 100%;
    min-height: 42px;
    border: 1px solid rgba(217, 159, 18, 0.48);
    border-radius: 8px;
    background: #f6bf36;
    color: #ffffff;
    font-size: 15px;
    padding: 0 12px;
  }

  .mobile-nav-link,
  .mobile-details summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .mobile-details {
    display: grid;
    gap: 8px;
  }

  .mobile-details summary {
    list-style: none;
    cursor: pointer;
  }

  .mobile-details summary::-webkit-details-marker {
    display: none;
  }

  .mobile-details p {
    margin: 0;
    border-radius: 8px;
    background: #eefbf8;
    color: #244b47;
    font-size: 12px;
    font-weight: 700;
    padding: 9px 10px;
  }

  .mobile-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 22px;
    border-radius: 999px;
    background: #ef3f7a;
    color: #ffffff;
    font-size: 12px;
    font-weight: 900;
    padding: 0 7px;
  }

  .mobile-theme {
    display: flex;
    width: 100%;
  }

  .mobile-theme button {
    flex: 1;
  }
}

@media (max-width: 720px) {
  .top-bar {
    min-height: 74px;
    padding: 10px clamp(24px, 6vw, 42px);
    gap: 14px;
  }

  .left-cluster {
    gap: 12px;
    min-width: 0;
    margin-left: 0;
  }

  .brand {
    width: 98px;
    height: 50px;
    padding: 0;
  }

  .brand-logo {
    width: 158px;
    max-height: 62px;
    transform: scale(1.58);
  }

  .subscription-link {
    display: none;
  }

  .coin-link {
    display: none;
  }

  .top-actions {
    gap: 8px;
  }
}

@media (max-width: 420px) {
  .left-cluster {
    margin-left: 0;
  }

  .menu-toggle {
    width: 42px;
    height: 42px;
  }

  .menu-toggle svg {
    width: 36px;
    height: 36px;
  }

  .top-actions {
    gap: 7px;
  }

  .icon-button,
  .avatar-button,
  .notification-button {
    width: 40px;
    height: 40px;
  }

  .icon-button svg,
  .avatar-button svg,
  .notification-button svg {
    width: 20px;
    height: 20px;
  }

  .brand-logo {
    width: 136px;
    max-height: 52px;
    transform: scale(1.5);
  }

  .notification-badge {
    min-width: 25px;
    height: 20px;
    font-size: 11px;
  }
}
</style>
