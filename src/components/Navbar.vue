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
  role?: UserRole;
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

const props = defineProps<{
  theme: ThemeMode;
}>();

const emit = defineEmits<{
  (event: "change-theme", theme: ThemeMode): void;
}>();

const router = useRouter();
const isMenuOpen = ref(false);
const isSearchOpen = ref(false);
const isNotificationsOpen = ref(false);
const search = ref("");
const authVersion = ref(0);
const notificationCount = ref(49);

const notifications = [
  "หนังสือใหม่พร้อมให้อ่านแล้ว",
  "ระบบบันทึกความคืบหน้าการอ่านล่าสุด",
  "มีรายการแนะนำใหม่สำหรับคุณ",
];

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

const currentRole = computed<UserRole>(() => {
  return isLoggedIn.value ? user.value?.role || "user" : "guest";
});

const themeOptions: { label: string; value: ThemeMode }[] = [
  { label: "ปกติ", value: "normal" },
  { label: "มืด", value: "dark" },
  { label: "อ่าน", value: "reading" },
];

const publicNavItems: NavItem[] = [
  { label: "หน้าแรก", to: "/", roles: ["guest", "user", "writer", "admin", "superadmin"] },
  { label: "ขายดี", to: "/best-sellers", roles: ["guest", "user", "writer", "admin", "superadmin"] },
  { label: "มาใหม่", to: "/new-releases", roles: ["guest", "user", "writer", "admin", "superadmin"] },
  { label: "โปรโมชั่น", to: "/promotions", roles: ["guest", "user", "writer", "admin", "superadmin"] },
  { label: "ฟรีกระจาย", to: "/free-books", roles: ["guest", "user", "writer", "admin", "superadmin"] },
  { label: "ฮิตขึ้นหิ้ง", to: "/hall-of-fame", roles: ["guest", "user", "writer", "admin", "superadmin"] },
  { label: "แนะนำ", to: "/recommended", roles: ["guest", "user", "writer", "admin", "superadmin"] },
];

const mainNavItems = computed(() => {
  return publicNavItems.filter((item) => item.roles.includes(currentRole.value));
});

const accountGroups = computed<NavGroup[]>(() => {
  const role = currentRole.value;
  const groups: NavGroup[] = [
    {
      title: "บัญชีของฉัน",
      items: [
        { label: "โปรไฟล์", to: "/profile", roles: ["user", "writer", "admin", "superadmin"] },
        { label: "ประวัติคำสั่งซื้อ", to: "/orders/history", roles: ["user", "writer"] },
      ],
    },
    {
      title: "การใช้งาน",
      items: [
        { label: "ชั้นหนังสือของฉัน", to: "/my-library", roles: ["user", "writer"] },
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
        { label: "แดชบอร์ด", to: "/admin", roles: ["admin", "superadmin"] },
        { label: "จัดการหนังสือ", to: "/admin/books", roles: ["admin", "superadmin"] },
        { label: "จัดการหมวดหมู่", to: "/admin/categories", roles: ["admin", "superadmin"] },
        { label: "อัปโหลดหนังสือ", to: "/admin/upload-book", roles: ["admin", "superadmin"] },
        { label: "จัดการสมาชิกบางส่วน", to: "/admin/members", roles: ["admin", "superadmin"] },
      ],
    },
    {
      title: "สิทธิ์ขั้นสูง",
      items: [
        { label: "จัดการผู้ใช้", to: "/superadmin/users", roles: ["superadmin"] },
        { label: "เปลี่ยน role / ระงับผู้ใช้", to: "/superadmin/roles", roles: ["superadmin"] },
        { label: "ตั้งค่าระบบ", to: "/superadmin/settings", roles: ["superadmin"] },
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

const submitSearch = () => {
  const keyword = search.value.trim();
  closeMenu();
  closeSearch();
  router.push(keyword ? { name: "Store", query: { q: keyword } } : { name: "Store" });
};

const logout = () => {
  clearAuth();
  closeMenu();
  router.push("/login");
};

onMounted(() => {
  window.addEventListener(AUTH_CHANGED_EVENT, refreshAuth);
  window.addEventListener("storage", refreshAuth);
});

onUnmounted(() => {
  window.removeEventListener(AUTH_CHANGED_EVENT, refreshAuth);
  window.removeEventListener("storage", refreshAuth);
});
</script>

<template>
  <header class="navbar">
    <div class="top-bar">
      <router-link class="brand" to="/" aria-label="กลับหน้าแรก" @click="closeMenu">
        <img class="brand-logo" :src="logoUrl" alt="Read and Voice" />
      </router-link>

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
        <button class="icon-button" type="button" aria-label="ค้นหาหนังสือ" @click="openSearch">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.8 4.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Zm0 2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm5.4 9 4 4-1.4 1.4-4-4 1.4-1.4Z" />
          </svg>
        </button>

        <details class="icon-dropdown">
          <summary class="icon-button" aria-label="เปลี่ยนโหมดสี">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3a9 9 0 0 0 0 18h.4a3.1 3.1 0 0 0 2.2-5.3 1.1 1.1 0 0 1 .8-1.9H17a4 4 0 0 0 0-8h-.5A8.9 8.9 0 0 0 12 3Zm-5 9.2a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm3.1-4.1a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm4.6.1a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z" />
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

        <div class="notification-wrapper">
          <button
            class="notification-button"
            type="button"
            aria-label="แจ้งเตือน"
            :aria-expanded="isNotificationsOpen"
            @click="toggleNotifications"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 22a2.7 2.7 0 0 0 2.6-2h-5.2A2.7 2.7 0 0 0 12 22Zm7-5-1.8-2.2V10a5.2 5.2 0 0 0-4-5.1V3a1.2 1.2 0 0 0-2.4 0v1.9a5.2 5.2 0 0 0-4 5.1v4.8L5 17v1h14v-1Z" />
            </svg>
            <span v-if="notificationCount" class="notification-badge">
              {{ notificationCount > 99 ? "99+" : notificationCount }}
            </span>
          </button>

          <div v-if="isNotificationsOpen" class="notification-panel">
            <h3>แจ้งเตือน</h3>
            <p v-for="item in notifications" :key="item">{{ item }}</p>
          </div>
        </div>

        <details class="icon-dropdown account-dropdown">
          <summary class="avatar-button" aria-label="บัญชีผู้ใช้">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Zm0 2c-4.2 0-7.6 2.2-7.6 5v1.2h15.2V19c0-2.8-3.4-5-7.6-5Z" />
            </svg>
          </summary>

          <div class="dropdown-panel account-panel">
            <template v-if="isLoggedIn">
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
              <section class="account-section">
                <h3>บัญชีของฉัน</h3>
                <router-link class="account-link" to="/login">เข้าสู่ระบบ</router-link>
                <router-link class="account-link" to="/register">สมัครสมาชิก</router-link>
              </section>
            </template>
          </div>
        </details>

        <button
          class="menu-toggle icon-button"
          type="button"
          :aria-expanded="isMenuOpen"
          aria-controls="mobile-menu"
          @click="isMenuOpen = !isMenuOpen"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16v2H4V7Zm0 4h16v2H4v-2Zm0 4h16v2H4v-2Z" />
          </svg>
        </button>
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
          <path d="M10.8 4.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Zm0 2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm5.4 9 4 4-1.4 1.4-4-4 1.4-1.4Z" />
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="ค้นหา"
          aria-label="ค้นหาหนังสือ"
        />
        <button class="search-close" type="button" aria-label="ปิดค้นหา" @click="closeSearch">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
          </svg>
        </button>
      </div>
    </form>

    <div id="mobile-menu" class="mobile-panel" :class="{ open: isMenuOpen }">
      <form class="mobile-search" role="search" @submit.prevent="submitSearch">
        <input v-model="search" type="search" placeholder="ค้นหาหนังสือ" />
      </form>

      <section class="mobile-group">
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

      <section class="mobile-group">
        <h3>บัญชี</h3>
        <template v-if="!isLoggedIn">
          <router-link to="/login" @click="closeMenu">เข้าสู่ระบบ</router-link>
          <router-link to="/register" @click="closeMenu">สมัครสมาชิก</router-link>
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

      <section class="mobile-group">
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  min-height: 82px;
  padding: 10px clamp(14px, 3vw, 52px);
}

.brand,
.desktop-public-nav a,
.account-link {
  text-decoration: none;
}

.brand {
  position: absolute;
  left: clamp(14px, 3vw, 52px);
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  border-radius: 12px;
  transition:
    filter 0.18s ease,
    background 0.18s ease;
}

.brand:hover {
  background: rgba(46, 196, 182, 0.12);
  filter: drop-shadow(0 6px 10px rgba(17, 156, 145, 0.18));
}

.brand:hover .brand-logo {
  transform: translateY(-1px) scale(1.04);
}

.brand:active .brand-logo {
  transform: translateY(1px) scale(0.96);
}

.brand-logo {
  width: clamp(128px, 11vw, 180px);
  height: 58px;
  object-fit: contain;
  transform-origin: center;
  transition: transform 0.18s ease;
  will-change: transform;
}

.desktop-public-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  justify-content: center;
  margin: 0;
  transform: translateY(8px);
}

.desktop-public-nav a {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #244b47;
  font-size: 14px;
  font-weight: 900;
  padding: 8px 10px;
  white-space: nowrap;
}

.desktop-public-nav a:hover,
.desktop-public-nav a.router-link-exact-active {
  color: #0f766e;
  background: rgba(255, 255, 255, 0.68);
  border-color: #082f2b;
}

.top-actions {
  position: absolute;
  right: clamp(14px, 3vw, 52px);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
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
  background: rgba(255, 255, 255, 0.76);
  color: #082f2b;
  cursor: pointer;
  list-style: none;
}

.icon-button::-webkit-details-marker,
.avatar-button::-webkit-details-marker {
  display: none;
}

.icon-button svg,
.avatar-button svg,
.notification-button svg {
  width: 25px;
  height: 25px;
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
}

.notification-button {
  position: relative;
  background: rgba(255, 255, 255, 0.76);
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
  gap: 8px;
  width: min(300px, calc(100vw - 24px));
  border: 1px solid rgba(17, 156, 145, 0.18);
  border-radius: 12px;
  background: #f8fffd;
  box-shadow: 0 12px 28px rgba(17, 156, 145, 0.14);
  padding: 14px;
}

.notification-panel h3 {
  margin: 0 0 4px;
  color: #0b5f59;
  font-size: 15px;
}

.notification-panel p {
  margin: 0;
  border-radius: 8px;
  background: #eefbf8;
  color: #244b47;
  font-size: 13px;
  font-weight: 700;
  padding: 10px;
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 70;
  display: grid;
  min-width: 210px;
  border: 1px solid rgba(17, 156, 145, 0.18);
  border-radius: 8px;
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

@media (max-width: 720px) {
  .top-bar {
    min-height: 74px;
    padding: 8px 12px;
  }

  .brand-logo {
    width: 132px;
    height: 52px;
  }

  .desktop-public-nav {
    display: none;
  }

  .menu-toggle {
    display: inline-grid;
  }

  .mobile-panel.open {
    display: grid;
    gap: 14px;
    padding: 0 12px 16px;
    background: rgba(255, 255, 255, 0.86);
  }

  .mobile-group {
    display: grid;
    gap: 8px;
    border-top: 1px solid rgba(17, 156, 145, 0.14);
    padding-top: 12px;
  }

  .mobile-group h3 {
    margin: 0;
    color: #0b5f59;
    font-size: 13px;
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
    border: 1px solid rgba(17, 156, 145, 0.18);
    border-radius: 8px;
    background: #f2fffc;
    color: #244b47;
    font-weight: 900;
    padding: 10px 12px;
    text-decoration: none;
  }

  .mobile-group a.router-link-active {
    color: #0f766e;
    background: #dff8f3;
  }

  .mobile-theme {
    display: flex;
    width: 100%;
  }

  .mobile-theme button {
    flex: 1;
  }
}

@media (max-width: 420px) {
  .top-actions {
    gap: 8px;
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
    width: 22px;
    height: 22px;
  }

  .notification-badge {
    min-width: 25px;
    height: 20px;
    font-size: 11px;
  }
}
</style>
