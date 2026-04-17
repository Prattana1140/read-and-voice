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
    title: "ทั่วไป",
    items: [
      { label: "หน้าแรก", to: "/", roles: ["guest", "user", "writer", "admin", "superadmin"] },
      { label: "ร้านหนังสือ", to: "/store", roles: ["guest", "user", "writer", "admin", "superadmin"] },
    ],
  },
  {
    title: "สมาชิก",
    items: [
      { label: "ชั้นหนังสือ", to: "/my-library", roles: ["user", "writer", "admin", "superadmin"] },
      { label: "รายการถูกใจ", to: "/wishlist", roles: ["user", "writer", "admin", "superadmin"] },
      { label: "ตะกร้า", to: "/cart", roles: ["user", "writer", "admin", "superadmin"] },
      { label: "ประวัติคำสั่งซื้อ", to: "/orders/history", roles: ["user", "writer", "admin", "superadmin"] },
    ],
  },
  {
    title: "นักเขียน",
    items: [
      { label: "แดชบอร์ดนักเขียน", to: "/writer", roles: ["writer", "admin", "superadmin"] },
    ],
  },
  {
    title: "ผู้ดูแล",
    items: [
      { label: "จัดการหนังสือ", to: "/admin", roles: ["admin", "superadmin"] },
      { label: "อัปโหลดหนังสือ", to: "/upload-book", roles: ["admin", "superadmin"] },
      { label: "จัดการผู้ใช้", to: "/admin/users", roles: ["superadmin"] },
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

const closeMenu = () => {
  isMenuOpen.value = false;
};

const submitSearch = () => {
  const keyword = search.value.trim();
  closeMenu();
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
        <span class="brand-text">
          <strong>Read and Voice</strong>
          <small>อ่านง่าย ฟังสบาย</small>
        </span>
      </router-link>

      <form class="search-form" role="search" @submit.prevent="submitSearch">
        <input
          v-model="search"
          type="search"
          placeholder="ค้นหาหนังสือ"
          aria-label="ค้นหาหนังสือ"
        />
      </form>

      <div class="desktop-actions">
        <div class="theme-switcher" aria-label="เปลี่ยนโหมดสี">
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

        <span class="role-chip">{{ roleLabel }}</span>

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

      <button
        class="menu-toggle"
        type="button"
        :aria-expanded="isMenuOpen"
        aria-controls="mobile-menu"
        @click="isMenuOpen = !isMenuOpen"
      >
        เมนู
      </button>
    </div>

    <nav class="nav-strip" aria-label="เมนูหลัก">
      <section v-for="group in visibleGroups" :key="group.title" class="nav-group">
        <span class="group-label">{{ group.title }}</span>
        <router-link
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          @click="closeMenu"
        >
          {{ item.label }}
        </router-link>
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
        <router-link v-if="!isLoggedIn" to="/login" @click="closeMenu">
          เข้าสู่ระบบ
        </router-link>
        <router-link v-if="!isLoggedIn" to="/register" @click="closeMenu">
          สมัครสมาชิก
        </router-link>
        <button v-else type="button" @click="logout">ออกจากระบบ</button>
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
  display: grid;
  grid-template-columns: minmax(230px, 320px) minmax(220px, 520px) auto;
  align-items: center;
  gap: clamp(12px, 2vw, 28px);
  min-height: 86px;
  padding: 10px clamp(14px, 3vw, 52px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: #0f766e;
  text-decoration: none;
}

.brand-logo {
  width: clamp(116px, 10vw, 170px);
  height: 62px;
  flex: 0 0 auto;
  object-fit: contain;
}

.brand-text {
  min-width: 0;
}

.brand strong,
.brand small {
  display: block;
  line-height: 1.15;
}

.brand strong {
  color: #0b5f59;
  font-size: 18px;
  font-weight: 900;
  white-space: nowrap;
}

.brand small {
  margin-top: 4px;
  color: #4f8f88;
  font-size: 12px;
}

.search-form,
.mobile-search {
  min-width: 0;
}

.search-form input,
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

.search-form input:focus,
.mobile-search input:focus {
  border-color: #2ec4b6;
  box-shadow: 0 0 0 3px rgba(46, 196, 182, 0.18);
}

.desktop-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.theme-switcher {
  display: inline-flex;
  flex: 0 0 auto;
  padding: 3px;
  border: 1px solid rgba(17, 156, 145, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.theme-switcher button {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #4f8f88;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  padding: 7px 9px;
  white-space: nowrap;
}

.theme-switcher button.active {
  color: white;
  background: #2ec4b6;
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
  justify-self: end;
}

.nav-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 50px;
  padding: 0 clamp(14px, 3vw, 52px);
  overflow-x: auto;
  background: rgba(255, 255, 255, 0.74);
  scrollbar-width: thin;
}

.nav-group {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 6px;
}

.group-label {
  border-right: 1px solid rgba(17, 156, 145, 0.18);
  color: #62a8a0;
  font-size: 12px;
  font-weight: 900;
  padding-right: 8px;
  white-space: nowrap;
}

.nav-strip a {
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
.nav-strip a.router-link-active {
  color: #0f766e;
  background: #dff8f3;
}

.mobile-panel {
  display: none;
}

@media (max-width: 1160px) {
  .top-bar {
    grid-template-columns: minmax(210px, 280px) minmax(180px, 1fr) auto;
  }

  .brand-text {
    display: none;
  }
}

@media (max-width: 900px) {
  .top-bar {
    grid-template-columns: auto 1fr auto;
    min-height: 78px;
  }

  .desktop-actions {
    gap: 6px;
  }

  .role-chip,
  .theme-switcher {
    display: none;
  }

  .brand-logo {
    width: 128px;
  }
}

@media (max-width: 720px) {
  .top-bar {
    grid-template-columns: 1fr auto;
    gap: 10px;
    min-height: 72px;
    padding: 8px 12px;
  }

  .brand-logo {
    width: 132px;
    height: 54px;
  }

  .search-form,
  .desktop-actions,
  .nav-strip {
    display: none;
  }

  .menu-toggle {
    display: inline-flex;
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
</style>
