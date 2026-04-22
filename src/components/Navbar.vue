<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import logoUrl from "../assets/Logo-transparent.png";
import { AUTH_CHANGED_EVENT, getToken, getUser, logout as clearAuth } from "../utils/auth";

type ThemeMode = "normal" | "dark" | "reading";
type UserRole = "guest" | "user" | "writer" | "admin" | "superadmin";

type StoredUser = {
  id?: number;
  name?: string;
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

const props = defineProps<{ theme: ThemeMode }>();
const emit = defineEmits<{ (event: "change-theme", theme: ThemeMode): void }>();

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
  "New books are ready to read.",
  "Your reading progress has been saved.",
  "There are new picks for you.",
];

const notificationItems = ref<NotificationItem[]>([
  {
    id: 1,
    title: "Last day of the free reading promotion",
    detail: "An ebook you follow is leaving the promotion today.",
    time: "Apr 15, 2026 10:46",
    tone: "sale",
    unread: true,
  },
  {
    id: 2,
    title: "A new episode is available",
    detail: "The latest episode is now in your library.",
    time: "Apr 14, 2026 10:40",
    tone: "serial",
    unread: true,
  },
  {
    id: 3,
    title: "A followed writer published a new title",
    detail: "A new title has been added to the store.",
    time: "Apr 12, 2026 09:15",
    tone: "writer",
  },
]);

const notificationSettings = ref<NotificationSetting[]>([
  { key: "writers", title: "Writers", detail: "Notify me when followed writers publish.", enabled: true },
  { key: "series", title: "Series", detail: "Notify me when followed series update.", enabled: true },
  { key: "comments", title: "Comments", detail: "Notify me when someone replies.", enabled: true },
  { key: "news", title: "News", detail: "Notify me about Read and Voice updates.", enabled: false },
]);

const notificationCount = computed(() => notificationItems.value.filter((item) => item.unread).length);

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
  return allRoles.includes(normalized as UserRole) ? (normalized as UserRole) : "user";
};

const currentRole = computed<UserRole>(() => {
  return isLoggedIn.value ? normalizeRole(user.value?.role) : "guest";
});

const currentRoleLabel = computed(() => {
  const labels: Record<UserRole, string> = {
    guest: "Guest",
    user: "Member",
    writer: "Writer",
    admin: "Admin",
    superadmin: "Super Admin",
  };

  return labels[currentRole.value];
});

const themeOptions: { label: string; value: ThemeMode }[] = [
  { label: "Normal", value: "normal" },
  { label: "Dark", value: "dark" },
  { label: "Reading", value: "reading" },
];

const publicNavItems: NavItem[] = [
  { label: "Home", to: "/", roles: allRoles },
  { label: "E-Book", to: "/store", roles: allRoles },
  { label: "Serials", to: "/serials", roles: allRoles },
];

const mainNavItems = computed(() => publicNavItems.filter((item) => item.roles.includes(currentRole.value)));

const accountGroups = computed<NavGroup[]>(() => {
  const role = currentRole.value;
  const groups: NavGroup[] = [
    {
      title: "My Account",
      items: [
        { label: "Profile", to: "/profile", roles: ["user", "writer", "admin", "superadmin"] },
        { label: "Order History", to: "/orders/history", roles: ["user", "writer"] },
        { label: "Notifications", to: "/account/notifications", roles: ["user", "writer", "admin", "superadmin"] },
      ],
    },
    {
      title: "My Reading",
      items: [
        { label: "My Library", to: "/my-library", roles: ["user", "writer"] },
        { label: "Wishlist", to: "/wishlist", roles: ["user", "writer"] },
        { label: "Cart", to: "/cart", roles: ["user", "writer"] },
      ],
    },
    {
      title: "Writer",
      items: [
        { label: "Writer Dashboard", to: "/writer", roles: ["writer"] },
        { label: "My Books", to: "/writer/books", roles: ["writer"] },
        { label: "Upload Book", to: "/writer/upload", roles: ["writer"] },
        { label: "Stats", to: "/writer/stats", roles: ["writer"] },
      ],
    },
    {
      title: "Admin",
      items: [
        { label: "Dashboard", to: "/admin", roles: ["admin", "superadmin"] },
        { label: "Page Content", to: "/admin/page-content", roles: ["admin", "superadmin"] },
        { label: "Books", to: "/admin/books", roles: ["admin", "superadmin"] },
        { label: "Categories", to: "/admin/categories", roles: ["admin", "superadmin"] },
        { label: "Members", to: "/admin/members", roles: ["admin", "superadmin"] },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Users", to: "/superadmin/users", roles: ["superadmin"] },
        { label: "Roles", to: "/superadmin/roles", roles: ["superadmin"] },
        { label: "Settings", to: "/superadmin/settings", roles: ["superadmin"] },
      ],
    },
  ];

  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
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
    if (item !== activeDropdown) item.open = false;
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
  router.push(keyword ? { name: "Store", query: { q: keyword } } : { name: "Store" });
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
          aria-label="Open menu"
          @click="isMenuOpen = !isMenuOpen"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path class="menu-icon-lines" d="M4.8 6.8h14.4M4.8 12h14.4M4.8 17.2h14.4" />
          </svg>
        </button>

        <router-link class="brand" to="/" aria-label="Go to home" @click="closeMenu">
          <img class="brand-logo" :src="logoUrl" alt="Read and Voice" />
        </router-link>

        <router-link class="subscription-link" to="/subscription-plans" @click="closeMenu">
          Subscribe
        </router-link>

        <router-link class="coin-link" to="/coin-wallet" @click="closeMenu">
          <span class="coin-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M8.3 12.2c0-2.3 1.5-3.9 3.8-3.9 1.2 0 2.3.4 3.1 1.2l-1.2 1.4c-.5-.5-1.1-.8-1.9-.8-1.1 0-1.9.8-1.9 2.1s.8 2.1 2 2.1c.8 0 1.5-.3 2-.9l1.2 1.3c-.8.9-1.9 1.4-3.3 1.4-2.3 0-3.8-1.6-3.8-3.9Z" />
            </svg>
          </span>
          Coin
        </router-link>
      </div>

      <nav class="desktop-public-nav" aria-label="Main navigation">
        <router-link v-for="item in mainNavItems" :key="item.to" :to="item.to" @click="closeMenu">
          {{ item.label }}
        </router-link>
      </nav>

      <div class="top-actions">
        <button class="icon-button" type="button" aria-label="Search books" @click="openSearch">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.8 4.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Zm0 2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm5.4 9 4 4-1.4 1.4-4-4 1.4-1.4Z" />
          </svg>
        </button>

        <details class="icon-dropdown">
          <summary class="icon-button" aria-label="Change color mode">
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

        <div v-if="isLoggedIn" class="notification-wrapper">
          <button
            class="notification-button"
            type="button"
            aria-label="Notifications"
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
            <div class="notification-panel__header">
              <h3>Notifications</h3>
              <div class="notification-panel__actions">
                <button type="button" aria-label="Clear all notifications" @click="clearNotifications">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 4V3h8v1h4v2H4V4h4Zm-1 4h10l-.7 12H7.7L7 8Zm3 2v8h1.5v-8H10Zm2.5 0v8H14v-8h-1.5Z" />
                  </svg>
                </button>
                <button type="button" aria-label="Notification settings" @click="openNotificationSettings">
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
                <button class="notification-delete" type="button" aria-label="Delete notification" @click="deleteNotification(item.id)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
                  </svg>
                </button>
              </article>
            </div>
            <p v-else class="notification-empty">No new notifications.</p>
          </div>
        </div>

        <details class="icon-dropdown account-dropdown">
          <summary class="avatar-button" aria-label="User account">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Zm0 2c-4.2 0-7.6 2.2-7.6 5v1.2h15.2V19c0-2.8-3.4-5-7.6-5Z" />
            </svg>
          </summary>

          <div class="dropdown-panel account-panel">
            <template v-if="isLoggedIn">
              <div class="role-summary">
                <span>Signed in as</span>
                <strong>{{ currentRoleLabel }}</strong>
              </div>

              <section v-for="group in accountGroups" :key="group.title" class="account-section">
                <h3>{{ group.title }}</h3>
                <router-link v-for="item in group.items" :key="item.to + item.label" class="account-link" :to="item.to">
                  {{ item.label }}
                </router-link>
              </section>

              <button class="account-btn" type="button" @click="logout">Log out</button>
            </template>

            <template v-else>
              <div class="guest-actions">
                <router-link class="guest-auth-link" to="/login">Log in</router-link>
                <span>/</span>
                <router-link class="guest-auth-link" to="/register">Sign up</router-link>
              </div>
            </template>
          </div>
        </details>
      </div>
    </div>

    <form class="search-overlay" :class="{ open: isSearchOpen }" role="search" @submit.prevent="submitSearch">
      <div class="search-box">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.8 4.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Zm0 2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm5.4 9 4 4-1.4 1.4-4-4 1.4-1.4Z" />
        </svg>
        <input v-model="search" type="search" placeholder="Search" aria-label="Search books" />
        <button class="search-close" type="button" aria-label="Close search" @click="closeSearch">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
          </svg>
        </button>
      </div>
    </form>

    <div v-if="isMenuOpen" class="mobile-backdrop" aria-hidden="true" @click="closeMenu"></div>

    <div id="mobile-menu" class="mobile-panel" :class="{ open: isMenuOpen }">
      <div class="mobile-panel-header">
        <button class="mobile-close" type="button" aria-label="Close menu" @click="closeMenu">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
          </svg>
        </button>
        <img class="mobile-panel-logo" :src="logoUrl" alt="Read and Voice" />
      </div>

      <form class="mobile-search" role="search" @submit.prevent="submitSearch">
        <input v-model="search" type="search" placeholder="Search books" />
      </form>

      <section class="mobile-group mobile-card">
        <h3>Main Menu</h3>
        <router-link v-for="item in mainNavItems" :key="item.to" :to="item.to" @click="closeMenu">
          {{ item.label }}
        </router-link>
      </section>

      <section v-if="isLoggedIn" class="mobile-group mobile-card">
        <h3>My Menu</h3>
        <details class="mobile-details">
          <summary class="mobile-nav-link">
            Notifications
            <span v-if="notificationCount" class="mobile-count">{{ notificationCount > 99 ? "99+" : notificationCount }}</span>
          </summary>
          <p v-for="item in notifications" :key="item">{{ item }}</p>
        </details>
        <router-link class="mobile-nav-link" to="/my-library" @click="closeMenu">
          My Library
        </router-link>
      </section>

      <section class="mobile-account-group">
        <h3>Account</h3>
        <template v-if="!isLoggedIn">
          <router-link to="/login" @click="closeMenu">Log in</router-link>
          <router-link to="/register" @click="closeMenu">Sign up</router-link>
        </template>
        <template v-else>
          <template v-for="group in accountGroups" :key="group.title">
            <h3 class="mobile-subtitle">{{ group.title }}</h3>
            <router-link v-for="item in group.items" :key="item.to + item.label" :to="item.to" @click="closeMenu">
              {{ item.label }}
            </router-link>
          </template>
          <button type="button" @click="logout">Log out</button>
        </template>
      </section>

      <section class="mobile-group mobile-card">
        <h3>Theme</h3>
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

    <div v-if="isNotificationSettingsOpen" class="notification-settings-backdrop" @click.self="closeNotificationSettings">
      <section class="notification-settings" aria-label="Notification settings">
        <button class="notification-settings__close" type="button" aria-label="Close notification settings" @click="closeNotificationSettings">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
          </svg>
        </button>
        <h2>Notification Settings</h2>
        <label v-for="setting in notificationSettings" :key="setting.key" class="notification-setting">
          <input v-model="setting.enabled" type="checkbox" />
          <span>
            <strong>{{ setting.title }}</strong>
            <small>{{ setting.detail }}</small>
          </span>
        </label>
        <button class="notification-settings__save" type="button" @click="closeNotificationSettings">
          Save
        </button>
      </section>
    </div>
  </header>
</template>

<style scoped>
.navbar { position: sticky; top: 0; z-index: 50; width: 100%; background: color-mix(in srgb, #e7fbf7 88%, white); border-bottom: 1px solid rgba(17, 156, 145, 0.16); box-shadow: 0 10px 28px rgba(17, 156, 145, 0.1); backdrop-filter: blur(16px); }
.top-bar { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 42px; min-height: 94px; padding: 12px clamp(28px, 4vw, 72px); }
.left-cluster { display: flex; align-items: center; gap: 18px; }
.brand, .desktop-public-nav a, .account-link, .subscription-link, .coin-link { text-decoration: none; }
.brand { display: inline-flex; align-items: center; justify-content: center; width: 128px; height: 58px; border-radius: 8px; }
.brand-logo { width: 204px; height: auto; max-height: 82px; object-fit: contain; transform: scale(1.8); transform-origin: center; }
.desktop-public-nav { display: flex; align-items: center; justify-content: center; gap: clamp(18px, 2vw, 44px); }
.desktop-public-nav a { color: #1f2937; font-weight: 800; }
.desktop-public-nav a.router-link-active { color: #0f766e; }
.subscription-link, .coin-link { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 999px; font-weight: 900; white-space: nowrap; }
.subscription-link { padding: 0 18px; background: linear-gradient(135deg, #15b8c7, #0ea5a8); color: #fff; }
.coin-link { gap: 10px; padding: 0 18px; background: linear-gradient(135deg, #ffcf4a, #f59e0b); color: #fff; }
.coin-mark { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: rgba(255,255,255,0.22); }
.coin-mark svg { width: 18px; height: 18px; fill: currentColor; }
.top-actions { display: flex; align-items: center; gap: 12px; }
.icon-button, .notification-button, .avatar-button, .mobile-close, .search-close { display: inline-grid; place-items: center; width: 42px; height: 42px; border: 1px solid rgba(15,118,110,0.16); border-radius: 999px; background: rgba(255,255,255,0.72); color: #0f172a; cursor: pointer; }
.icon-button svg, .notification-button svg, .avatar-button svg, .mobile-close svg, .search-close svg { width: 20px; height: 20px; fill: currentColor; stroke: currentColor; stroke-width: 1.2; }
.menu-toggle { display: none; }
.icon-dropdown { position: relative; }
.icon-dropdown summary { list-style: none; }
.icon-dropdown summary::-webkit-details-marker { display: none; }
.dropdown-panel, .notification-panel { position: absolute; top: calc(100% + 10px); right: 0; width: min(92vw, 340px); border: 1px solid rgba(15,118,110,0.12); border-radius: 20px; background: #fff; box-shadow: 0 20px 48px rgba(15,23,42,0.16); padding: 18px; }
.theme-panel { display: grid; gap: 8px; }
.theme-panel button, .theme-switcher button, .account-btn, .notification-settings__save, .mobile-account-group button { min-height: 42px; border: 0; border-radius: 12px; background: #e8f8f6; color: #0f766e; cursor: pointer; font-weight: 900; }
.theme-panel button.active, .theme-switcher button.active { background: #0f766e; color: #fff; }
.notification-wrapper { position: relative; }
.notification-button { position: relative; }
.notification-badge { position: absolute; top: -4px; right: -2px; min-width: 20px; height: 20px; border-radius: 999px; background: #ef4444; color: #fff; font-size: 11px; font-weight: 900; display: grid; place-items: center; padding: 0 4px; }
.notification-panel__header, .notification-panel__actions, .role-summary, .guest-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.notification-panel__header h3, .account-section h3, .mobile-group h3, .mobile-account-group h3, .notification-settings h2 { margin: 0; }
.notification-list { display: grid; gap: 12px; margin-top: 14px; }
.notification-item { display: grid; grid-template-columns: 40px 1fr 32px; gap: 12px; align-items: start; border: 1px solid #ecf1f1; border-radius: 14px; padding: 12px; }
.notification-item.unread { background: #f2fffc; }
.notification-thumb { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: #fff; font-size: 12px; font-weight: 900; }
.tone-sale { background: #f59e0b; } .tone-serial { background: #0ea5e9; } .tone-writer { background: #8b5cf6; }
.notification-copy h4, .notification-copy p, .notification-copy time { margin: 0; }
.notification-copy p { margin-top: 4px; color: #475569; font-size: 13px; line-height: 1.5; }
.notification-copy time { display: block; margin-top: 6px; color: #64748b; font-size: 12px; }
.notification-delete { border: 0; background: transparent; color: #64748b; cursor: pointer; }
.notification-empty { margin: 8px 0 0; color: #64748b; }
.account-panel { display: grid; gap: 16px; }
.role-summary { padding: 12px; border-radius: 14px; background: #f3fbfb; }
.role-summary span { color: #64748b; font-size: 12px; font-weight: 700; }
.role-summary strong { color: #0f172a; }
.account-section { display: grid; gap: 8px; }
.account-link, .guest-auth-link, .mobile-group a, .mobile-account-group a { color: #1f2937; font-weight: 700; }
.search-overlay { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; padding: 18px; background: rgba(230,255,251,0.92); }
.search-overlay.open { display: flex; }
.search-box { display: grid; grid-template-columns: 24px 1fr 42px; align-items: center; gap: 12px; width: min(720px,100%); padding: 10px 12px; border-radius: 18px; background: #fff; box-shadow: 0 16px 40px rgba(15,23,42,0.12); }
.search-box input, .mobile-search input { width: 100%; border: 0; outline: 0; background: transparent; font-size: 16px; }
.mobile-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.35); }
.mobile-panel { position: fixed; top: 0; left: 0; bottom: 0; width: min(88vw,360px); transform: translateX(-100%); background: #fff; box-shadow: 20px 0 50px rgba(15,23,42,0.18); transition: transform 0.24s ease; padding: 18px; overflow-y: auto; z-index: 60; }
.mobile-panel.open { transform: translateX(0); }
.mobile-panel-header, .mobile-search, .mobile-group, .mobile-account-group { margin-bottom: 18px; }
.mobile-panel-header { display: flex; align-items: center; justify-content: space-between; }
.mobile-panel-logo { width: 132px; height: auto; }
.mobile-group, .mobile-account-group { display: grid; gap: 10px; }
.mobile-card { padding: 14px; border-radius: 18px; background: #f8fbfb; }
.mobile-nav-link, .mobile-details summary { cursor: pointer; font-weight: 700; }
.mobile-subtitle { margin-top: 8px; color: #0f766e; font-size: 14px; }
.mobile-count { margin-left: 8px; color: #ef4444; font-size: 12px; font-weight: 900; }
.mobile-theme { display: grid; gap: 8px; }
.notification-settings-backdrop { position: fixed; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(15,23,42,0.4); z-index: 70; }
.notification-settings { width: min(92vw,480px); display: grid; gap: 12px; border-radius: 24px; background: #fff; padding: 22px; box-shadow: 0 28px 60px rgba(15,23,42,0.2); }
.notification-settings__close { justify-self: end; }
.notification-setting { display: grid; grid-template-columns: 18px 1fr; gap: 12px; align-items: start; padding: 12px; border-radius: 14px; background: #f8fbfb; }
.notification-setting strong, .notification-setting small { display: block; }
.notification-setting small { margin-top: 4px; color: #64748b; }
@media (max-width: 1100px) { .top-bar { grid-template-columns: 1fr auto; } .desktop-public-nav { display: none; } .menu-toggle { display: inline-grid; } }
@media (max-width: 780px) { .top-bar { gap: 16px; padding: 12px 16px; } .left-cluster { gap: 10px; } .subscription-link, .coin-link { display: none; } .brand-logo { width: 164px; transform: scale(1.3); } }
</style>
