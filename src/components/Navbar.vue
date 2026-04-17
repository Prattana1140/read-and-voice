<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import logoUrl from "../assets/Logo-transparent.png";

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
const search = ref("");

const getStoredUser = (): StoredUser => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const user = computed(() => getStoredUser());
const isLoggedIn = computed(() => !!localStorage.getItem("token") && !!user.value);
const currentRole = computed<UserRole>(() => {
  return isLoggedIn.value ? user.value?.role || "user" : "guest";
});

const roleLabel = computed(() => {
  const labels: Record<UserRole, string> = {
    guest: "ผู้เยี่ยมชม",
    user: "สมาชิก",
    writer: "นักเขียน",
    admin: "ผู้ดูแล",
    superadmin: "ผู้ดูแลสูงสุด",
  };

  return labels[currentRole.value];
});

const themeOptions: { label: string; value: ThemeMode }[] = [
  { label: "ปกติ", value: "normal" },
  { label: "มืด", value: "dark" },
  { label: "อ่าน", value: "reading" },
];

const navGroups: NavGroup[] = [
  {
    title: "สาธารณะ",
    items: [
      { label: "หน้าแรก", to: "/", roles: ["guest", "user", "writer", "admin", "superadmin"] },
      { label: "ร้านหนังสือ", to: "/store", roles: ["guest", "user", "writer", "admin", "superadmin"] },
    ],
  },
  {
    title: "สมาชิก",
    items: [
      { label: "ชั้นหนังสือของฉัน", to: "/my-library", roles: ["user", "writer"] },
      { label: "รายการถูกใจ", to: "/wishlist", roles: ["user", "writer"] },
      { label: "ตะกร้า", to: "/cart", roles: ["user", "writer"] },
      { label: "ประวัติคำสั่งซื้อ", to: "/orders/history", roles: ["user", "writer"] },
      { label: "โปรไฟล์", to: "/profile", roles: ["user", "writer"] },
    ],
  },
  {
    title: "นักเขียน",
    items: [
      { label: "แดชบอร์ดนักเขียน", to: "/writer", roles: ["writer"] },
      { label: "อัปโหลดหนังสือของตัวเอง", to: "/writer/upload", roles: ["writer"] },
      { label: "จัดการหนังสือของตัวเอง", to: "/writer/books", roles: ["writer"] },
      { label: "สถิติหนังสือตัวเอง", to: "/writer/stats", roles: ["writer"] },
    ],
  },
  {
    title: "ผู้ดูแล",
    items: [
      { label: "หน้า admin dashboard", to: "/admin", roles: ["admin", "superadmin"] },
      { label: "จัดการหมวดหมู่", to: "/admin/categories", roles: ["admin", "superadmin"] },
      { label: "อัปโหลดหนังสือ", to: "/upload-book", roles: ["admin", "superadmin"] },
      { label: "จัดการสมาชิกบางส่วน", to: "/admin/members", roles: ["admin", "superadmin"] },
      { label: "โปรไฟล์", to: "/profile", roles: ["admin", "superadmin"] },
    ],
  },
  {
    title: "ผู้ดูแลสูงสุด",
    items: [
      { label: "จัดการผู้ใช้ / เปลี่ยน role / ระงับผู้ใช้", to: "/admin/users", roles: ["superadmin"] },
      { label: "ตั้งค่าระบบ", to: "/superadmin/settings", roles: ["superadmin"] },
    ],
  },
];

const visibleGroups = computed(() => {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(currentRole.value)),
    }))
    .filter((group) => group.items.length > 0);
});

const mainNavItems = computed(() => {
  return navGroups[0].items.filter((item) => item.roles.includes(currentRole.value));
});

const roleNavGroups = computed(() => {
  return visibleGroups.value.filter((group) => group.title !== navGroups[0].title);
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

const submitSearch = () => {
  const keyword = search.value.trim();
  closeMenu();
  closeSearch();
  router.push(keyword ? { name: "Store", query: { q: keyword } } : { name: "Store" });
};

const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  closeMenu();
  router.push("/login");
};
</script>

<template>
  <header class="navbar">
    <div class="top-bar">
      <router-link class="brand" to="/" @click="closeMenu">
        <img class="brand-logo" :src="logoUrl" alt="Read and Voice" />
      </router-link>

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

        <details class="icon-dropdown account-dropdown">
          <summary class="avatar-button" aria-label="บัญชีผู้ใช้">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Zm0 2c-4.2 0-7.6 2.2-7.6 5v1.2h15.2V19c0-2.8-3.4-5-7.6-5Z" />
            </svg>
          </summary>
          <div class="dropdown-panel account-panel">
            <span class="role-chip">{{ roleLabel }}</span>
            <router-link
              v-if="isLoggedIn"
              class="account-btn ghost"
              to="/profile"
            >
              โปรไฟล์
            </router-link>
            <button
              v-if="isLoggedIn"
              class="account-btn"
              type="button"
              @click="logout"
            >
              ออกจากระบบ
            </button>
            <template v-else>
              <router-link class="account-btn ghost" to="/login">เข้าสู่ระบบ</router-link>
              <router-link class="account-btn" to="/register">สมัครสมาชิก</router-link>
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

    <nav class="nav-strip" aria-label="เมนูหลัก">
      <section class="nav-group primary-group">
        <router-link
          v-for="item in mainNavItems"
          :key="item.to"
          :to="item.to"
          @click="closeMenu"
        >
          {{ item.label }}
        </router-link>
      </section>

      <section
        v-for="group in roleNavGroups"
        :key="group.title"
        class="nav-dropdown"
      >
        <details>
          <summary>{{ group.title }}</summary>
          <div class="dropdown-menu">
            <router-link
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              @click="closeMenu"
            >
              {{ item.label }}
            </router-link>
          </div>
        </details>
      </section>
    </nav>

    <div id="mobile-menu" class="mobile-panel" :class="{ open: isMenuOpen }">
      <form class="mobile-search" role="search" @submit.prevent="submitSearch">
        <input v-model="search" type="search" placeholder="ค้นหาหนังสือ" />
      </form>

      <section v-for="group in visibleGroups" :key="group.title" class="mobile-group">
        <h3>{{ group.title }}</h3>
        <router-link
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          @click="closeMenu"
        >
          {{ item.label }}
        </router-link>
      </section>

      <section class="mobile-group">
        <h3>บัญชี</h3>
        <span class="mobile-role">{{ roleLabel }}</span>
        <template v-if="!isLoggedIn">
          <router-link to="/login" @click="closeMenu">
            เข้าสู่ระบบ
          </router-link>
          <router-link to="/register" @click="closeMenu">
            สมัครสมาชิก
          </router-link>
        </template>
        <template v-else>
          <router-link to="/profile" @click="closeMenu">
            โปรไฟล์
          </router-link>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 76px;
  padding: 8px clamp(14px, 3vw, 52px);
}

.brand {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  min-width: 0;
  color: #0f766e;
  text-decoration: none;
}

.brand-logo {
  width: clamp(118px, 10vw, 166px);
  height: 58px;
  flex: 0 0 auto;
  object-fit: contain;
}

.top-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-left: auto;
}

.icon-dropdown {
  position: relative;
}

.icon-button,
.avatar-button {
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
.avatar-button svg {
  width: 25px;
  height: 25px;
  fill: currentColor;
}

.icon-button:hover,
.avatar-button:hover,
.icon-dropdown[open] > summary {
  background: #d5f6ef;
  color: #0f766e;
}

.avatar-button {
  background: #2ec4b6;
  color: white;
}

.dropdown-panel,
.dropdown-menu {
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

.theme-panel,
.account-panel {
  gap: 8px;
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

.role-chip,
.mobile-role {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  border-radius: 8px;
  background: #d5f6ef;
  color: #0b5f59;
  font-size: 13px;
  font-weight: 900;
  padding: 7px 10px;
  white-space: nowrap;
}

.account-btn,
.menu-toggle,
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
  text-decoration: none;
  font-weight: 900;
  padding: 8px 12px;
  white-space: nowrap;
}

.account-btn.ghost {
  background: rgba(255, 255, 255, 0.78);
  color: #0f766e;
}

.menu-toggle {
  display: none;
  border-radius: 50%;
  padding: 0;
}

.nav-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  padding: 0 clamp(14px, 3vw, 52px);
  background: rgba(255, 255, 255, 0.74);
}

.nav-group {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 6px;
}

.primary-group {
  margin-right: auto;
}

.nav-strip a,
.nav-dropdown summary {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  border-radius: 8px;
  color: #244b47;
  font-size: 14px;
  font-weight: 900;
  padding: 8px 10px;
  text-decoration: none;
  white-space: nowrap;
}

.nav-strip a:hover,
.nav-strip a.router-link-active,
.nav-dropdown summary:hover {
  color: #0f766e;
  background: #dff8f3;
}

.nav-dropdown {
  position: relative;
  flex: 0 0 auto;
}

.nav-dropdown details {
  position: relative;
}

.nav-dropdown summary {
  cursor: pointer;
  list-style: none;
}

.nav-dropdown summary::-webkit-details-marker {
  display: none;
}

.nav-dropdown summary::after {
  margin-left: 7px;
  content: "v";
  font-size: 11px;
}

.dropdown-menu a {
  justify-content: flex-start;
}

.mobile-panel {
  display: none;
}

@media (max-width: 720px) {
  .top-bar {
    min-height: 70px;
    padding: 8px 12px;
  }

  .brand-logo {
    width: 132px;
    height: 54px;
  }

  .nav-strip {
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
  .avatar-button {
    width: 40px;
    height: 40px;
  }

  .icon-button svg,
  .avatar-button svg {
    width: 22px;
    height: 22px;
  }
}
</style>
