<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import logoUrl from "../assets/Logo-transparent.png";
import api, { resolveAssetUrl } from "../utils/api";
import {
  AUTH_CHANGED_EVENT,
  getToken,
  getUser,
  logout as clearAuth,
} from "../utils/auth";
import { useI18n } from "../utils/i18n";

type ThemeMode = "normal" | "dark" | "reading";
type UserRole = "guest" | "user" | "writer" | "admin" | "superadmin";

type StoredUser = {
  id?: number;
  name?: string;
  role?: string;
  avatar_url?: string;
} | null;

type NavItem = {
  label: string;
  to: string;
  roles: UserRole[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  action_url?: string | null;
  is_read: number;
  created_at: string;
};

type BuffetItem = {
  id: number;
  title: string | null;
  status: string | null;
  payment_status: string | null;
  end_at: string | null;
};

const props = defineProps<{ theme: ThemeMode }>();
const emit = defineEmits<{ (event: "change-theme", theme: ThemeMode): void }>();

const router = useRouter();
const {
  currentLanguageName,
  formatLocaleDate,
  formatLocaleDateTime,
  locale,
  nextLanguageLabel,
  setLocale,
  t,
} = useI18n();
const navbarRef = ref<HTMLElement | null>(null);
const topBarRef = ref<HTMLElement | null>(null);
const themeDropdownRef = ref<HTMLDetailsElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const isCompactNav = ref(false);
const isMenuOpen = ref(false);
const isSearchOpen = ref(false);
const isNotificationsOpen = ref(false);
const search = ref("");
const authVersion = ref(0);
const walletBalance = ref(0);
const membershipLabel = ref(t("account.noMembership"));
const isMembershipActive = ref(false);
const notificationItems = ref<NotificationItem[]>([]);
const notificationLoading = ref(false);
const notificationError = ref("");
const allRoles: UserRole[] = ["guest", "user", "writer", "admin", "superadmin"];
const compactNavBreakpoint = 1240;
let navResizeObserver: ResizeObserver | null = null;
let compactMeasureFrame = 0;

const notificationCount = computed(
  () =>
    notificationItems.value.filter((item) => Number(item.is_read) !== 1).length,
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

const memberRoles: UserRole[] = ["user", "writer", "admin", "superadmin"];
const readerRoles: UserRole[] = ["user", "writer"];
const adminRoles: UserRole[] = ["admin", "superadmin"];
const superAdminRoles: UserRole[] = ["superadmin"];
const isReaderRole = computed(() => readerRoles.includes(currentRole.value));
const isAdminRole = computed(() => adminRoles.includes(currentRole.value));
const isSuperAdminRole = computed(() => superAdminRoles.includes(currentRole.value));
const roleLabel = computed(() => {
  if (currentRole.value === "superadmin") return t("account.role.superadmin");
  if (currentRole.value === "admin") return t("account.role.admin");
  if (currentRole.value === "writer") return t("account.role.writer");
  if (currentRole.value === "user") return t("account.role.user");
  return t("account.role.guest");
});
const roleHint = computed(() => {
  if (isSuperAdminRole.value) return t("account.roleHint.superadmin");
  if (currentRole.value === "admin") return t("account.roleHint.admin");
  if (currentRole.value === "writer") return t("account.roleHint.writer");
  if (currentRole.value === "user") return t("account.roleHint.user");
  return "";
});

const userDisplayName = computed(
  () => user.value?.name?.trim() || "Read and Voice",
);
const userAvatarUrl = computed(() => {
  const avatar = user.value?.avatar_url?.trim();
  return avatar ? resolveAssetUrl(avatar) : "";
});
const userMeta = computed(() => {
  if (user.value?.id) {
    return `member-${String(user.value.id).padStart(6, "0")}`;
  }

  return t("account.memberOf");
});

const accountQuickLinks = computed<NavItem[]>(() => {
  if (!isLoggedIn.value) return [];

  return [
    { label: t("account.bookshelf"), to: "/my-library", roles: readerRoles },
    { label: t("account.wishlist"), to: "/wishlist", roles: readerRoles },
    { label: t("account.following"), to: "/account/following", roles: readerRoles },
  ].filter((item) => item.roles.includes(currentRole.value));
});

const themeOptions = computed<{ label: string; value: ThemeMode }[]>(() => [
  { label: t("theme.normal"), value: "normal" },
  { label: t("theme.dark"), value: "dark" },
  { label: t("theme.reading"), value: "reading" },
]);

const selectTheme = (theme: ThemeMode) => {
  emit("change-theme", theme);

  if (themeDropdownRef.value) {
    themeDropdownRef.value.open = false;
  }

  closeMenu();
};

const selectLanguage = (value: "th" | "en") => {
  setLocale(value);
  closeMenu();
  scheduleCompactNavMeasure();
};

const publicNavItems = computed<NavItem[]>(() => [
  { label: t("nav.home"), to: "/", roles: allRoles },
  { label: t("nav.books"), to: "/store", roles: allRoles },
  { label: t("nav.serials"), to: "/serials", roles: allRoles },
]);

const mainNavItems = computed(() =>
  publicNavItems.value.filter((item) => item.roles.includes(currentRole.value)),
);

const accountGroups = computed<NavGroup[]>(() => {
  const role = currentRole.value;
  const groups: NavGroup[] = [
    {
      title: t("account.myAccount"),
      items: [
        { label: t("account.profile"), to: "/profile", roles: memberRoles },
        { label: t("account.userDevices"), to: "/account/devices", roles: memberRoles },
        {
          label: t("account.notifications"),
          to: "/account/notifications",
          roles: memberRoles,
        },
      ],
      defaultOpen: true,
    },
    {
      title: t("account.readingMember"),
      items: [
        { label: t("account.bookshelf"), to: "/my-library", roles: readerRoles },
        { label: t("account.wishlist"), to: "/wishlist", roles: readerRoles },
        { label: t("account.following"), to: "/account/following", roles: readerRoles },
        { label: t("account.package"), to: "/account/buffet", roles: readerRoles },
        { label: t("account.benefits"), to: "/account/benefits", roles: readerRoles },
        {
          label: t("account.orders"),
          to: "/orders/history",
          roles: readerRoles,
        },
        { label: t("account.reviews"), to: "/account/reviews", roles: readerRoles },
        {
          label: t("account.ageVerification"),
          to: "/account/age-verification",
          roles: readerRoles,
        },
      ],
    },
    {
      title: t("account.settings"),
      items: [
        { label: t("account.giftCodes"), to: "/account/gift-codes", roles: memberRoles },
        {
          label: t("notification.settings"),
          to: "/notification-settings",
          roles: memberRoles,
        },
      ],
      defaultOpen: true,
    },
    {
      title: t("account.writerSpace"),
      items: [{ label: t("account.writerDashboard"), to: "/writer", roles: ["writer"] }],
    },
    {
      title: t("account.adminTools"),
      items: [
        {
          label: t("account.adminDashboard"),
          to: "/admin",
          roles: adminRoles,
        },
        {
          label: t("account.contentManagement"),
          to: "/admin/page-content",
          roles: adminRoles,
        },
        {
          label: t("account.bookManagement"),
          to: "/admin/books",
          roles: adminRoles,
        },
        {
          label: t("account.uploadBook"),
          to: "/admin/upload-book",
          roles: adminRoles,
        },
        {
          label: t("account.approvals"),
          to: "/admin/approvals",
          roles: adminRoles,
        },
      ],
    },
    {
      title: t("account.superadmin"),
      items: [
        { label: t("account.superDashboard"), to: "/superadmin", roles: superAdminRoles },
        { label: t("account.userManagement"), to: "/superadmin/users", roles: superAdminRoles },
        { label: t("account.roleManagement"), to: "/superadmin/roles", roles: superAdminRoles },
        { label: t("account.settingsSystem"), to: "/superadmin/settings", roles: superAdminRoles },
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

const hasNavbarOverflow = () => {
  const navbar = navbarRef.value;
  const topBar = topBarRef.value;
  if (!navbar || !topBar) return false;

  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;

  return (
    topBar.scrollWidth > topBar.clientWidth + 1 ||
    navbar.scrollWidth > viewportWidth + 1
  );
};

const scheduleCompactNavMeasure = () => {
  if (compactMeasureFrame) {
    window.cancelAnimationFrame(compactMeasureFrame);
  }

  compactMeasureFrame = window.requestAnimationFrame(() => {
    compactMeasureFrame = 0;

    if (window.innerWidth <= compactNavBreakpoint) {
      isCompactNav.value = true;
      return;
    }

    if (isCompactNav.value) {
      isCompactNav.value = false;
      window.requestAnimationFrame(() => {
        isCompactNav.value = hasNavbarOverflow();
      });
      return;
    }

    isCompactNav.value = hasNavbarOverflow();
  });
};

const openSearch = () => {
  closeMenu();
  closeFloatingMenus();
  isSearchOpen.value = true;
  nextTick(() => {
    searchInputRef.value?.focus();
  });
};

const closeSearch = () => {
  isSearchOpen.value = false;
};

const toggleNotifications = () => {
  isNotificationsOpen.value = !isNotificationsOpen.value;

  if (isNotificationsOpen.value) {
    loadNotifications();
  }
};

const openNotificationSettings = () => {
  closeFloatingMenus();
  router.push("/notification-settings");
};

const closeFloatingMenus = () => {
  isNotificationsOpen.value = false;
  document
    .querySelectorAll<HTMLDetailsElement>(".icon-dropdown[open]")
    .forEach((item) => {
      item.open = false;
    });
};

const openAccessibilityPanel = () => {
  closeFloatingMenus();
  window.dispatchEvent(new CustomEvent("read-voice:open-accessibility-panel"));
};

const handleDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const navbar = navbarRef.value;
  const activeDropdown = target.closest(
    ".icon-dropdown",
  ) as HTMLDetailsElement | null;
  document
    .querySelectorAll<HTMLDetailsElement>(".icon-dropdown[open]")
    .forEach((item) => {
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
  router.push(
    keyword ? { name: "Store", query: { q: keyword } } : { name: "Store" },
  );
};

const formatNotificationTime = (value: string) => {
  return formatLocaleDateTime(value);
};

const notificationToneClass = (type: string) => {
  if (type === "sale" || type === "promotion") return "tone-sale";
  if (type === "writer_follow" || type === "book_published")
    return "tone-writer";
  return "tone-serial";
};

const loadNotifications = async () => {
  if (!isLoggedIn.value) {
    notificationItems.value = [];
    notificationError.value = "";
    return;
  }

  try {
    notificationLoading.value = true;
    notificationError.value = "";
    const { data } = await api.get("/account/notifications");
    notificationItems.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error: any) {
    notificationError.value =
      error?.response?.data?.message || t("notification.errorLoad");
  } finally {
    notificationLoading.value = false;
  }
};

const markNotificationAsRead = async (item: NotificationItem) => {
  try {
    if (Number(item.is_read) !== 1) {
      await api.post(`/account/notifications/${item.id}/read`);
      item.is_read = 1;
    }

    if (item.action_url) {
      closeFloatingMenus();
      router.push(item.action_url);
    }
  } catch (error: any) {
    notificationError.value =
      error?.response?.data?.message || t("notification.errorMark");
  }
};

const markAllNotificationsRead = async () => {
  try {
    await api.post("/account/notifications/read-all");
    notificationItems.value = notificationItems.value.map((item) => ({
      ...item,
      is_read: 1,
    }));
  } catch (error: any) {
    notificationError.value =
      error?.response?.data?.message || t("notification.errorReadAll");
  }
};

const deleteAllNotifications = async () => {
  if (!notificationItems.value.length) return;

  const confirmed = window.confirm(t("notification.confirmDelete"));
  if (!confirmed) return;

  try {
    await api.delete("/account/notifications");
    notificationItems.value = [];
    notificationError.value = "";
  } catch (error: any) {
    notificationError.value =
      error?.response?.data?.message || t("notification.errorDeleteAll");
  }
};

const loadWalletBalance = async () => {
  if (!isLoggedIn.value || !isReaderRole.value) {
    walletBalance.value = 0;
    return;
  }

  try {
    const { data } = await api.get("/coins/wallet");
    walletBalance.value = Number(data?.balance || 0);
  } catch {
    walletBalance.value = 0;
  }
};

const loadMembershipLabel = async () => {
  if (!isLoggedIn.value) {
    membershipLabel.value = t("account.noMembership");
    isMembershipActive.value = false;
    return;
  }

  if (!isReaderRole.value) {
    membershipLabel.value = roleLabel.value;
    isMembershipActive.value = isAdminRole.value;
    return;
  }

  try {
    const { data } = await api.get("/account/buffet");
    const items = Array.isArray(data?.items)
      ? (data.items as BuffetItem[])
      : [];
    const activeItem = items.find(
      (item) => item.status === "active" || item.payment_status === "paid",
    );

    if (!activeItem) {
      membershipLabel.value = t("account.noMembership");
      isMembershipActive.value = false;
      return;
    }

    const planName = activeItem.title?.trim() || t("account.specialMember");
    const expiry = activeItem.end_at
      ? `${t("account.untilDate")} ${formatLocaleDate(activeItem.end_at)}`
      : t("account.noExpiry");

    isMembershipActive.value = true;
    membershipLabel.value = `${planName} · ${expiry}`;
  } catch {
    membershipLabel.value = t("account.statusFailed");
    isMembershipActive.value = false;
  }
};

const logout = () => {
  clearAuth();
  closeMenu();
  closeFloatingMenus();
  router.push({ name: "Login", query: { loggedOut: "1" } });
};

onMounted(() => {
  window.addEventListener(AUTH_CHANGED_EVENT, refreshAuth);
  window.addEventListener("storage", refreshAuth);
  window.addEventListener("resize", scheduleCompactNavMeasure);
  document.addEventListener("pointerdown", handleDocumentPointerDown);

  if (typeof ResizeObserver !== "undefined" && topBarRef.value) {
    navResizeObserver = new ResizeObserver(scheduleCompactNavMeasure);
    navResizeObserver.observe(topBarRef.value);
  }

  scheduleCompactNavMeasure();
  loadWalletBalance();
  loadMembershipLabel();
  loadNotifications();
});

onUnmounted(() => {
  window.removeEventListener(AUTH_CHANGED_EVENT, refreshAuth);
  window.removeEventListener("storage", refreshAuth);
  window.removeEventListener("resize", scheduleCompactNavMeasure);
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  navResizeObserver?.disconnect();
  navResizeObserver = null;

  if (compactMeasureFrame) {
    window.cancelAnimationFrame(compactMeasureFrame);
    compactMeasureFrame = 0;
  }
});

watch(isLoggedIn, () => {
  loadWalletBalance();
  loadMembershipLabel();
  loadNotifications();
  scheduleCompactNavMeasure();
});

watch(currentRole, () => {
  scheduleCompactNavMeasure();
});

watch(locale, () => {
  loadMembershipLabel();
  scheduleCompactNavMeasure();
});

watch(isCompactNav, (compact) => {
  if (!compact) closeMenu();
});
</script>

<template>
  <header
    id="site-navigation"
    ref="navbarRef"
    class="navbar"
    :class="{ 'navbar--compact': isCompactNav }"
  >
    <div ref="topBarRef" class="top-bar">
      <div class="left-cluster">
        <button
          class="menu-toggle icon-button"
          type="button"
          :aria-expanded="isMenuOpen"
          aria-controls="mobile-menu"
          :aria-label="t('common.mainMenu')"
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
          :aria-label="t('nav.home')"
          @click="closeMenu"
        >
          <img class="brand-logo" :src="logoUrl" alt="Read and Voice" />
        </router-link>

        <router-link
          v-if="isReaderRole"
          class="subscription-link"
          to="/subscription-plans"
          @click="closeMenu"
        >
          {{ t("nav.subscription") }}
        </router-link>

        <router-link
          v-if="isReaderRole"
          class="coin-link"
          to="/coin-wallet"
          @click="closeMenu"
        >
          <span class="coin-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8.5" class="coin-face" />
              <circle cx="12" cy="12" r="5.4" class="coin-core" />
              <ellipse cx="9.2" cy="8.4" rx="2.2" ry="1.5" class="coin-shine" />
            </svg>
          </span>
          {{ t("nav.topUp") }}
        </router-link>
        <button
          class="accessibility-link"
          type="button"
          data-accessibility-toggle="true"
          :aria-label="t('a11y.open')"
          @click="openAccessibilityPanel"
        >
          {{ t("a11y.open") }}
        </button>
      </div>

      <nav class="desktop-public-nav" aria-label="Main navigation">
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
          :aria-label="t('common.search')"
          @click="openSearch"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M10.8 4.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Zm0 2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm5.4 9 4 4-1.4 1.4-4-4 1.4-1.4Z"
            />
          </svg>
        </button>

        <details ref="themeDropdownRef" class="icon-dropdown">
          <summary class="icon-button" :aria-label="t('theme.switch')">
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
              @click="selectTheme(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </details>

        <div
          class="language-switch"
          :aria-label="`${t('language.label')}: ${currentLanguageName}`"
          :title="nextLanguageLabel"
        >
          <span class="language-switch__label">{{ t("language.label") }}</span>
          <button
            type="button"
            :class="{ active: locale === 'th' }"
            :aria-pressed="locale === 'th'"
            @click="selectLanguage('th')"
          >
            ไทย
          </button>
          <button
            type="button"
            :class="{ active: locale === 'en' }"
            :aria-pressed="locale === 'en'"
            @click="selectLanguage('en')"
          >
            EN
          </button>
        </div>

        <button
          class="icon-button mobile-accessibility-button"
          type="button"
          data-accessibility-toggle="true"
          :aria-label="t('a11y.open')"
          @click="openAccessibilityPanel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 4.3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Zm-7 5.1 5.1 1.4v3.4l-2.2 5.4 2 .8 2.1-5 2.1 5 2-.8-2.2-5.4v-3.4L19 9.4l-.6-2.1-4.8 1.3h-3.2L5.6 7.3 5 9.4Z"
            />
          </svg>
        </button>

        <div v-if="isLoggedIn" class="notification-wrapper">
          <button
            class="notification-button"
            type="button"
            :aria-label="t('account.notifications')"
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
              <h3>{{ t("account.notifications") }}</h3>
              <div class="notification-panel__actions">
                <button
                  class="notification-icon-action"
                  type="button"
                  :aria-label="t('notification.settings')"
                  @click="openNotificationSettings"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.2a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.6a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.2a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.2a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.6a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.2a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button
                  class="notification-icon-action notification-icon-action--danger"
                  type="button"
                  :aria-label="t('notification.deleteAll')"
                  :disabled="notificationItems.length === 0"
                  @click="deleteAllNotifications"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="m19 6-1 14H6L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>

            <p v-if="notificationError" class="notification-empty">
              {{ notificationError }}
            </p>
            <p v-else-if="notificationLoading" class="notification-empty">
              {{ t("notification.loading") }}
            </p>
            <div v-else-if="notificationItems.length" class="notification-list">
              <article
                v-for="item in notificationItems"
                :key="item.id"
                class="notification-item"
                :class="{ unread: Number(item.is_read) !== 1 }"
              >
                <span
                  class="notification-thumb"
                  :class="notificationToneClass(item.type)"
                  >RV</span
                >
                <div class="notification-copy">
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.message }}</p>
                  <time>{{ formatNotificationTime(item.created_at) }}</time>
                </div>
                <button
                  class="notification-open"
                  type="button"
                  @click="markNotificationAsRead(item)"
                >
                  {{ item.action_url ? t("common.open") : t("common.read") }}
                </button>
              </article>
            </div>
            <p v-else class="notification-empty">{{ t("notification.empty") }}</p>
            <router-link
              class="notification-footer-link"
              to="/account/notifications"
              @click="closeFloatingMenus"
            >
              {{ t("notification.all") }}
            </router-link>
          </div>
        </div>

        <details
          class="icon-dropdown account-dropdown"
          @toggle="
            loadWalletBalance();
            loadMembershipLabel();
          "
        >
          <summary
            class="avatar-button"
            :class="{ 'avatar-button--member': isMembershipActive }"
            :aria-label="t('account.menu')"
          >
            <img
              v-if="userAvatarUrl"
              :src="userAvatarUrl"
              alt=""
              class="nav-avatar-image"
              aria-hidden="true"
            />
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 12a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Zm0 2c-4.2 0-7.6 2.2-7.6 5v1.2h15.2V19c0-2.8-3.4-5-7.6-5Z"
              />
            </svg>
          </summary>

          <div class="dropdown-panel account-panel">
            <template v-if="isLoggedIn">
              <div class="account-summary-card">
                <img
                  v-if="userAvatarUrl"
                  :src="userAvatarUrl"
                  :alt="t('account.profile')"
                  class="account-avatar account-avatar-image"
                  :class="{ 'account-avatar--member': isMembershipActive }"
                />
                <div
                  v-else
                  class="account-avatar"
                  :class="{ 'account-avatar--member': isMembershipActive }"
                  aria-hidden="true"
                >
                  {{ userDisplayName.slice(0, 1).toUpperCase() }}
                </div>
                <div class="account-summary-copy">
                  <strong>{{ userDisplayName }}</strong>
                  <span>{{ userMeta }}</span>
                  <small class="role-badge" :class="`role-badge--${currentRole}`">
                    {{ roleLabel }}
                  </small>
                  <small v-if="isReaderRole" class="account-membership">
                    {{ membershipLabel }}
                  </small>
                  <small v-else class="account-role-hint">
                    {{ roleHint }}
                  </small>
                </div>
                <button class="logout-chip" type="button" @click="logout">
                  {{ t("account.logout") }}
                </button>
              </div>

              <div v-if="isAdminRole" class="admin-quick-row">
                <router-link to="/admin/page-content" @click="closeFloatingMenus">
                  {{ t("account.contentManagement") }}
                </router-link>
                <router-link to="/admin" @click="closeFloatingMenus">
                  {{ t("account.adminDashboard") }}
                </router-link>
              </div>

              <div v-if="isReaderRole" class="wallet-row">
                <div class="wallet-balance">
                  <span class="wallet-label">{{ t("account.coin") }}</span>
                  <strong>{{ walletBalance.toFixed(2) }}</strong>
                </div>
                <router-link
                  class="wallet-link"
                  to="/coin-wallet"
                  @click="closeFloatingMenus"
                >
                  {{ t("nav.topUp") }}
                </router-link>
              </div>

              <section
                v-if="accountQuickLinks.length"
                class="account-shortcuts"
              >
                <router-link
                  v-for="item in accountQuickLinks"
                  :key="item.to + item.label"
                  class="account-link"
                  :to="item.to"
                  @click="closeFloatingMenus"
                >
                  {{ item.label }}
                </router-link>
              </section>

              <details
                v-for="group in accountGroups"
                :key="group.title"
                class="account-accordion"
                :open="group.defaultOpen"
              >
                <summary>
                  <span>{{ group.title }}</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m8 10 4 4 4-4" />
                  </svg>
                </summary>
                <div class="account-section">
                  <router-link
                    v-for="item in group.items"
                    :key="item.to + item.label"
                    class="account-link"
                    :to="item.to"
                    @click="closeFloatingMenus"
                  >
                    {{ item.label }}
                  </router-link>
                </div>
              </details>
            </template>

            <template v-else>
              <div class="guest-actions">
                <router-link class="guest-auth-link" to="/login"
                  >{{ t("account.login") }}</router-link
                >
                <span>/</span>
                <router-link class="guest-auth-link" to="/register"
                  >{{ t("account.register") }}</router-link
                >
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
      @click.self="closeSearch"
      @keydown.esc="closeSearch"
      @submit.prevent="submitSearch"
    >
      <div class="search-box">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M10.8 4.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Zm0 2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm5.4 9 4 4-1.4 1.4-4-4 1.4-1.4Z"
          />
        </svg>
        <input
          ref="searchInputRef"
          v-model="search"
          type="search"
          :placeholder="t('common.search')"
          :aria-label="t('common.search')"
        />
        <button
          class="search-close"
          type="button"
          :aria-label="t('common.back')"
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
          :aria-label="t('common.back')"
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

      <section class="mobile-group mobile-card">
        <h3>{{ t("common.mainMenu") }}</h3>
        <router-link
          v-for="item in mainNavItems"
          :key="item.to"
          :to="item.to"
          @click="closeMenu"
        >
          {{ item.label }}
        </router-link>
      </section>

      <section class="mobile-group mobile-card mobile-cta-group">
        <router-link
          v-if="isReaderRole"
          class="subscription-link mobile-pill-link"
          to="/subscription-plans"
          @click="closeMenu"
        >
          {{ t("nav.subscription") }}
        </router-link>
        <router-link
          v-if="isReaderRole"
          class="coin-link mobile-pill-link"
          to="/coin-wallet"
          @click="closeMenu"
        >
          <span class="coin-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8.5" class="coin-face" />
              <circle cx="12" cy="12" r="5.4" class="coin-core" />
              <ellipse cx="9.2" cy="8.4" rx="2.2" ry="1.5" class="coin-shine" />
            </svg>
          </span>
          {{ t("nav.topUp") }}
        </router-link>
        <button
          class="accessibility-link mobile-pill-link"
          type="button"
          data-accessibility-toggle="true"
          :aria-label="t('a11y.open')"
          @click="openAccessibilityPanel"
        >
          {{ t("a11y.open") }}
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
  overflow-x: clip;
  background: color-mix(in srgb, #e7fbf7 88%, white);
  border-bottom: 1px solid rgba(17, 156, 145, 0.16);
  box-shadow: 0 10px 28px rgba(17, 156, 145, 0.1);
  backdrop-filter: blur(16px);
}
.top-bar {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: clamp(14px, 2vw, 34px);
  min-height: 76px;
  padding: 8px clamp(24px, 3.4vw, 58px);
}
.left-cluster {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-self: start;
  min-width: 0;
  gap: 14px;
}
.brand,
.desktop-public-nav a,
.account-link,
.subscription-link,
.coin-link {
  text-decoration: none;
}
.brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 152px;
  width: 152px;
  height: 58px;
  border-radius: 8px;
}
.brand-logo {
  width: 216px;
  height: auto;
  max-height: 64px;
  object-fit: contain;
  transform: scale(1.75);
  transform-origin: center;
}
.desktop-public-nav {
  grid-column: 2;
  grid-row: 1;
  justify-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  gap: clamp(14px, 1.6vw, 34px);
}
.desktop-public-nav a {
  color: #1f2937;
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
}
.desktop-public-nav a.router-link-active {
  color: #0f766e;
}
.subscription-link,
.coin-link,
.accessibility-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 900;
  white-space: nowrap;
}
.subscription-link {
  padding: 0 16px;
  background: linear-gradient(135deg, #15b8c7, #0ea5a8);
  color: #fff;
}
.coin-link {
  gap: 8px;
  padding: 0 18px;
  background: linear-gradient(180deg, #ff9d10 0%, #f28a00 100%);
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 4px 10px rgba(200, 112, 0, 0.18);
}
.accessibility-link {
  padding: 0 16px;
  border: 1px solid rgba(15, 118, 110, 0.16);
  background: rgba(255, 255, 255, 0.82);
  color: #0f766e;
  cursor: pointer;
}
.coin-mark {
  display: inline-grid;
  place-items: center;
  width: 21px;
  height: 21px;
  border-radius: 999px;
  background: radial-gradient(
    circle at 35% 35%,
    #ffe48a 0%,
    #ffc933 45%,
    #e59a00 100%
  );
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.42),
    0 1px 2px rgba(181, 118, 0, 0.3);
}
.coin-mark svg {
  width: 14px;
  height: 14px;
  filter: drop-shadow(0 1px 0 rgba(181, 118, 0, 0.18));
}
.coin-face {
  fill: #ffd24d;
}
.coin-core {
  fill: #f6b301;
}
.coin-shine {
  fill: rgba(255, 245, 186, 0.52);
}
.top-actions {
  grid-column: 3;
  grid-row: 1;
  position: relative;
  z-index: 2;
  justify-self: end;
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
}
.icon-button,
.notification-button,
.avatar-button,
.mobile-close,
.search-close {
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(15, 118, 110, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #0f172a;
  cursor: pointer;
}
.icon-button svg,
.notification-button svg,
.avatar-button svg,
.mobile-close svg,
.search-close svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 1.2;
}
.avatar-button {
  position: relative;
  overflow: visible;
}
.avatar-button--member {
  border: 0;
  padding: 3px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    conic-gradient(from 210deg, #00b3a4, #9bf6e8, #ffd166, #f59e0b, #00b3a4)
      border-box;
  box-shadow:
    0 0 0 1px rgba(15, 118, 110, 0.08),
    0 8px 20px rgba(13, 148, 136, 0.24),
    0 0 22px rgba(245, 158, 11, 0.18);
}
.avatar-button--member::after,
.account-avatar--member::after {
  content: "";
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 13px;
  height: 13px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffd166, #f59e0b);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);
}
.nav-avatar-image {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  object-fit: cover;
  background: #fff;
}
.avatar-button--member svg {
  position: relative;
  z-index: 1;
  border-radius: 999px;
  background: #fff;
  padding: 6px;
}
.menu-toggle {
  display: none;
}
.mobile-accessibility-button {
  display: none;
}
.icon-dropdown {
  position: relative;
}
.icon-dropdown summary {
  list-style: none;
}
.icon-dropdown summary::-webkit-details-marker {
  display: none;
}
.dropdown-panel,
.notification-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: min(92vw, 340px);
  border: 1px solid rgba(15, 118, 110, 0.12);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
  padding: 18px;
}
.theme-panel {
  display: grid;
  gap: 8px;
}
.theme-panel button,
.account-btn {
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  background: #e8f8f6;
  color: #0f766e;
  cursor: pointer;
  font-weight: 900;
}
.theme-panel button.active {
  background: #0f766e;
  color: #fff;
}
.language-switch {
  display: inline-grid;
  grid-template-columns: auto 1fr 1fr;
  align-items: center;
  gap: 2px;
  min-height: 36px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  padding: 3px;
}
.language-switch__label {
  color: #0f766e;
  font-size: 11px;
  font-weight: 900;
  padding: 0 5px 0 7px;
  white-space: nowrap;
}
.language-switch button {
  min-width: 38px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #0f766e;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  padding: 0 9px;
}
.language-switch button.active {
  background: #0f766e;
  color: #fff;
}
.notification-wrapper {
  position: relative;
}
.notification-button {
  position: relative;
}
.notification-badge {
  position: absolute;
  top: -4px;
  right: -2px;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  display: grid;
  place-items: center;
  padding: 0 4px;
}
.notification-panel__header,
.notification-panel__actions,
.guest-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.notification-panel__actions {
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 8px;
}
.notification-icon-action {
  display: inline-grid;
  place-items: center;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #0f766e;
  cursor: pointer;
  padding: 0;
}
.notification-icon-action svg {
  width: 19px;
  height: 19px;
  display: block;
  fill: none;
  stroke: currentColor;
}
.notification-icon-action:hover {
  background: #e8f8f6;
}
.notification-icon-action--danger {
  color: #dc2626;
}
.notification-icon-action--danger:hover {
  background: #fee2e2;
}
.notification-icon-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.notification-panel__header h3,
.mobile-group h3 {
  margin: 0;
}
.notification-list {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}
.notification-item {
  display: grid;
  grid-template-columns: 40px 1fr 32px;
  gap: 12px;
  align-items: start;
  border: 1px solid #ecf1f1;
  border-radius: 14px;
  padding: 12px;
}
.notification-item.unread {
  background: #f2fffc;
}
.notification-thumb {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}
.tone-sale {
  background: #f59e0b;
}
.tone-serial {
  background: #0ea5e9;
}
.tone-writer {
  background: #8b5cf6;
}
.notification-copy h4,
.notification-copy p,
.notification-copy time {
  margin: 0;
}
.notification-copy p {
  margin-top: 4px;
  color: #475569;
  font-size: 13px;
  line-height: 1.5;
}
.notification-copy time {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
}
.notification-open {
  min-height: 34px;
  border: 0;
  border-radius: 10px;
  background: #e8f8f6;
  color: #0f766e;
  cursor: pointer;
  font-weight: 800;
  padding: 0 10px;
}
.notification-empty {
  margin: 8px 0 0;
  color: #64748b;
}
.notification-footer-link {
  display: inline-flex;
  margin-top: 12px;
  color: #0f766e;
  font-weight: 800;
  text-decoration: none;
}
.account-panel {
  display: grid;
  gap: 14px;
  width: min(92vw, 300px);
  padding: 16px;
}
.account-summary-card {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
}
.account-avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: linear-gradient(135deg, #e5e7eb, #cbd5e1);
  color: #475569;
  font-size: 20px;
  font-weight: 900;
}
.account-avatar-image {
  object-fit: cover;
  border: 1px solid rgba(15, 118, 110, 0.12);
}
.account-avatar--member {
  border: 3px solid transparent;
  background:
    linear-gradient(#fff, #fff) padding-box,
    conic-gradient(from 200deg, #14b8a6, #99f6e4, #ffd166, #f59e0b, #14b8a6)
      border-box;
  box-shadow:
    0 0 0 1px rgba(20, 184, 166, 0.08),
    0 10px 26px rgba(20, 184, 166, 0.22),
    0 0 22px rgba(245, 158, 11, 0.18);
}
.account-summary-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.account-summary-copy strong {
  color: #1f2937;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.account-summary-copy span {
  color: #64748b;
  font-size: 12px;
}
.account-membership {
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
}
.role-badge {
  display: inline-flex;
  justify-self: start;
  margin-top: 2px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 11px;
  font-weight: 900;
  padding: 3px 8px;
}
.role-badge--writer {
  background: #f3e8ff;
  color: #7e22ce;
}
.role-badge--admin {
  background: #fff7ed;
  color: #c2410c;
}
.role-badge--superadmin {
  background: #fef2f2;
  color: #b91c1c;
}
.account-role-hint {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}
.logout-chip {
  min-height: 36px;
  border: 1px solid #ef4444;
  border-radius: 999px;
  background: #fff;
  color: #ef4444;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  padding: 0 12px;
}
.wallet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.wallet-balance {
  display: flex;
  align-items: center;
  gap: 8px;
}
.wallet-label {
  color: #1f2937;
  font-size: 14px;
}
.wallet-balance strong {
  color: #f59e0b;
  font-size: 15px;
}
.wallet-link {
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}
.admin-quick-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.admin-quick-row a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 13px;
  font-weight: 900;
  padding: 0 12px;
  text-decoration: none;
}
.admin-quick-row a:first-child {
  background: #ecfeff;
  color: #0f766e;
}
.admin-quick-row a::after {
  content: "›";
  font-size: 18px;
  line-height: 1;
}
.account-shortcuts,
.account-section {
  display: grid;
  gap: 10px;
}
.account-shortcuts {
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.account-accordion {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}
.account-accordion:last-of-type {
  border-bottom: 0;
  padding-bottom: 0;
}
.account-accordion summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  list-style: none;
  color: #111827;
  font-size: 16px;
  font-weight: 800;
}
.account-accordion summary::-webkit-details-marker {
  display: none;
}
.account-accordion summary svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  transition: transform 0.18s ease;
}
.account-accordion[open] summary svg {
  transform: rotate(180deg);
}
.account-section {
  padding-top: 10px;
}
.account-link,
.guest-auth-link,
.mobile-group a {
  color: #1f2937;
  font-weight: 500;
  text-decoration: none;
}
.account-link:hover,
.wallet-link:hover,
.guest-auth-link:hover {
  color: #0f766e;
}
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: max(18px, env(safe-area-inset-top)) 18px 18px;
  background:
    linear-gradient(180deg, rgba(231, 251, 247, 0.98), rgba(231, 251, 247, 0.82) 120px),
    rgba(15, 23, 42, 0.38);
  backdrop-filter: blur(14px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease;
}
.search-overlay.open {
  opacity: 1;
  pointer-events: auto;
}
.search-box {
  display: grid;
  grid-template-columns: 24px 1fr 42px;
  align-items: center;
  gap: 12px;
  width: min(860px, calc(100vw - 36px));
  min-height: 68px;
  padding: 12px 14px 12px 18px;
  border: 1px solid rgba(15, 118, 110, 0.12);
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.24);
  transform: translateY(-8px);
  transition: transform 0.16s ease;
}
.search-overlay.open .search-box {
  transform: translateY(0);
}
.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  min-width: 0;
}
.search-box input::placeholder {
  color: #64748b;
  font-weight: 600;
}
.mobile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.18);
}
.mobile-panel {
  position: absolute;
  top: calc(100% + 10px);
  left: 12px;
  width: min(calc(100vw - 24px), 420px);
  display: grid;
  gap: 16px;
  border: 1px solid rgba(15, 118, 110, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 24px 54px rgba(15, 23, 42, 0.16);
  padding: 18px;
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  z-index: 60;
  box-sizing: border-box;
}
.mobile-panel.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.mobile-panel-header,
.mobile-group {
  margin-bottom: 0;
}
.mobile-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.mobile-panel-logo {
  width: 132px;
  height: auto;
}
.mobile-group {
  display: grid;
  gap: 10px;
}
.mobile-card {
  padding: 16px;
  border-radius: 18px;
  background: #f8fbfb;
}
.mobile-group h3 {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.mobile-group a {
  padding: 6px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
}
.mobile-cta-group {
  display: none;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  background: transparent;
  padding: 0;
}
.mobile-pill-link {
  width: 100%;
  justify-content: center;
}

.navbar--compact .top-bar {
  grid-template-columns: minmax(0, 1fr) max-content;
  gap: 16px;
  min-height: 82px;
  padding: 10px clamp(18px, 3vw, 40px);
}
.navbar--compact .left-cluster {
  min-width: 0;
  gap: 8px;
}
.navbar--compact .left-cluster > .subscription-link,
.navbar--compact .left-cluster > .coin-link,
.navbar--compact .desktop-public-nav {
  display: none;
}
.navbar--compact .left-cluster > .accessibility-link {
  display: inline-flex;
  min-height: 36px;
  padding: 0 14px;
  font-size: 12px;
}
.navbar--compact .menu-toggle {
  display: inline-grid;
}
.navbar--compact .brand {
  flex: 0 0 136px;
  width: 136px;
  height: 52px;
}
.navbar--compact .brand-logo {
  width: 190px;
  transform: scale(1.65);
}
.navbar--compact .top-actions {
  grid-column: 2;
}
.navbar--compact .mobile-cta-group {
  display: grid;
  grid-template-columns: 1fr;
}
.navbar--compact .mobile-cta-group .subscription-link,
.navbar--compact .mobile-cta-group .coin-link {
  display: inline-flex;
}
.navbar--compact .mobile-cta-group .subscription-link,
.navbar--compact .mobile-cta-group .coin-link {
  min-height: 44px;
  padding: 0 14px;
}
.navbar--compact .mobile-cta-group .mobile-pill-link.accessibility-link {
  display: none;
}

@media (max-width: 1240px) {
  .top-bar {
    grid-template-columns: minmax(0, 1fr) max-content;
    gap: 16px;
    min-height: 82px;
    padding: 10px clamp(18px, 3vw, 40px);
  }
  .left-cluster {
    min-width: 0;
    gap: 8px;
  }
  .top-actions {
    grid-column: 2;
  }
  .left-cluster > .subscription-link,
  .left-cluster > .coin-link,
  .desktop-public-nav {
    display: none;
  }
  .left-cluster > .accessibility-link {
    display: inline-flex;
    min-height: 36px;
    padding: 0 14px;
    font-size: 12px;
  }
  .menu-toggle {
    display: inline-grid;
  }
  .brand {
    flex: 0 0 136px;
    width: 136px;
    height: 52px;
  }
  .brand-logo {
    width: 190px;
    transform: scale(1.65);
  }
  .mobile-cta-group {
    display: grid;
    grid-template-columns: 1fr;
  }
  .mobile-cta-group .subscription-link,
  .mobile-cta-group .coin-link {
    display: inline-flex;
  }
  .mobile-cta-group .subscription-link,
  .mobile-cta-group .coin-link {
    min-height: 44px;
    padding: 0 14px;
  }
  .mobile-cta-group .mobile-pill-link.accessibility-link {
    display: none;
  }
}
@media (max-width: 780px) {
  .top-bar {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    min-height: 76px;
    padding: 10px 8px;
  }
  .left-cluster {
    flex: 0 1 auto;
    min-width: 0;
    gap: 4px;
  }
  .subscription-link,
  .coin-link {
    display: none;
  }
  .left-cluster > .accessibility-link {
    display: inline-flex;
    min-height: 32px;
    padding: 0 11px;
    font-size: 11px;
  }
  .mobile-accessibility-button {
    display: none;
  }
  .top-actions {
    flex: 0 0 auto;
    width: auto;
    gap: 4px;
    justify-self: auto;
    min-width: 0;
  }
  .top-actions > .icon-button,
  .top-actions > .icon-dropdown,
  .top-actions > .notification-wrapper {
    flex: 0 0 34px;
    width: 34px;
  }
  .language-switch {
    min-height: 32px;
    padding: 2px;
  }
  .language-switch__label {
    display: none;
  }
  .language-switch button {
    min-width: 30px;
    height: 26px;
    font-size: 10px;
    padding: 0 6px;
  }
  .brand {
    flex: 0 0 88px;
    width: 88px;
    height: 44px;
  }
  .brand-logo {
    width: 138px;
    transform: scale(1.42);
  }
  .icon-button,
  .notification-button,
  .avatar-button {
    width: 34px;
    height: 34px;
  }
  .icon-button svg,
  .notification-button svg,
  .avatar-button svg {
    width: 17px;
    height: 17px;
  }
  .mobile-panel {
    position: fixed;
    top: 84px;
    right: 8px;
    bottom: 8px;
    left: 8px;
    width: auto;
    max-height: calc(100dvh - 92px);
    overflow-y: auto;
    border-radius: 18px;
    padding: 12px;
  }
  .mobile-cta-group {
    display: grid;
    grid-template-columns: 1fr;
  }
  .mobile-cta-group .subscription-link,
  .mobile-cta-group .coin-link {
    display: inline-flex;
  }
  .mobile-cta-group .subscription-link,
  .mobile-cta-group .coin-link {
    min-height: 44px;
    padding: 0 14px;
  }
  .mobile-cta-group .mobile-pill-link.accessibility-link {
    display: none;
  }
}

@media (max-width: 420px) {
  .top-bar {
    min-height: 70px;
    padding-inline: max(6px, env(safe-area-inset-left))
      max(6px, env(safe-area-inset-right));
  }

  .left-cluster {
    flex: 0 1 auto;
    gap: 3px;
  }

  .left-cluster > .accessibility-link {
    min-height: 30px;
    padding: 0 9px;
    font-size: 10px;
  }

  .top-actions {
    flex: 0 1 auto;
    width: auto;
    gap: 3px;
  }

  .top-actions > .icon-button,
  .top-actions > .icon-dropdown,
  .top-actions > .notification-wrapper {
    flex: 0 0 31px;
    width: 31px;
  }
  .language-switch {
    grid-template-columns: 1fr;
    gap: 2px;
    min-height: 31px;
    padding: 2px;
  }
  .language-switch button {
    min-width: 25px;
    height: 13px;
    font-size: 8px;
    line-height: 1;
    padding: 0 3px;
  }

  .brand {
    flex: 0 0 72px;
    width: 72px;
    height: 40px;
  }

  .brand-logo {
    width: 116px;
    transform: scale(1.32);
  }

  .icon-button,
  .notification-button,
  .avatar-button {
    width: 31px;
    height: 31px;
  }

  .dropdown-panel,
  .notification-panel,
  .account-panel {
    position: fixed;
    top: 76px;
    right: 8px;
    left: 8px;
    width: auto;
    max-height: calc(100dvh - 88px);
    overflow-y: auto;
  }
}

@media (max-width: 360px) {
  .top-bar {
    gap: 6px;
  }

  .left-cluster {
    gap: 3px;
  }

  .left-cluster > .accessibility-link {
    min-height: 28px;
    padding: 0 7px;
    font-size: 9px;
  }

  .brand {
    flex-basis: 64px;
    width: 64px;
  }

  .brand-logo {
    width: 104px;
    transform: scale(1.28);
  }

  .top-actions > .icon-button,
  .top-actions > .icon-dropdown,
  .top-actions > .notification-wrapper,
  .icon-button,
  .notification-button,
  .avatar-button {
    flex-basis: 30px;
    width: 30px;
    height: 30px;
  }

  .icon-button svg,
  .notification-button svg,
  .avatar-button svg {
    width: 16px;
    height: 16px;
  }
}
</style>
