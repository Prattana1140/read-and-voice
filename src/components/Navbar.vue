<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import logoNavUrl from "../assets/Logo-nav.png";
import api, { resolveAssetUrl } from "../utils/api";
import {
  AUTH_CHANGED_EVENT,
  getToken,
  getUser,
  logout as clearAuth,
} from "../utils/auth";
import {
  filterBooks,
  uniqueBookCategories,
  type SearchableBook,
} from "../utils/bookSearch";
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
const leftClusterRef = ref<HTMLElement | null>(null);
const desktopNavRef = ref<HTMLElement | null>(null);
const topActionsRef = ref<HTMLElement | null>(null);
const themeDropdownRef = ref<HTMLDetailsElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);

const isCompactNav = ref(false);
const isMenuOpen = ref(false);
const isSearchOpen = ref(false);
const isNotificationsOpen = ref(false);

const search = ref("");
const searchBooks = ref<SearchableBook[]>([]);
const searchLoading = ref(false);
const authVersion = ref(0);
const walletBalance = ref(0);
const membershipLabel = ref(t("account.noMembership"));
const isMembershipActive = ref(false);
const notificationItems = ref<NotificationItem[]>([]);
const notificationLoading = ref(false);
const notificationError = ref("");
const recentSearches = ref<string[]>([]);

const allRoles: UserRole[] = ["guest", "user", "writer", "admin", "superadmin"];
const compactNavBreakpoint = 780;

let navResizeObserver: ResizeObserver | null = null;
let compactMeasureFrame = 0;

const recentSearchStorageKey = "read-voice-recent-searches";

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

const memberRoles: UserRole[] = ["user", "writer"];
const readerRoles: UserRole[] = ["user", "writer"];
const adminRoles: UserRole[] = ["admin"];
const superAdminRoles: UserRole[] = ["superadmin"];

const isReaderRole = computed(() => readerRoles.includes(currentRole.value));
const isAdminRole = computed(() => adminRoles.includes(currentRole.value));

const roleLabel = computed(() => {
  if (currentRole.value === "superadmin") return t("account.role.superadmin");
  if (currentRole.value === "admin") return t("account.role.admin");
  if (currentRole.value === "writer") return t("account.role.writer");
  if (currentRole.value === "user") return t("account.role.user");
  return t("account.role.guest");
});


const localizedPlanNames: Record<string, string> = {
  "annual unlimited": "account.plan.annualUnlimited",
  "monthly plus": "account.plan.monthlyPlus",
  "quarterly premium": "account.plan.quarterlyPremium",
  "starter reader": "account.plan.starterReader",
};

function formatMembershipPlanName(value: string) {
  const normalized = value.trim().toLowerCase();
  const key = localizedPlanNames[normalized];
  return key ? t(key) : value;
}

const userDisplayName = computed(
  () => user.value?.name?.trim() || "Read and Voice",
);

const userAvatarUrl = computed(() => {
  const avatar = user.value?.avatar_url?.trim();
  return avatar ? resolveAssetUrl(avatar) : "";
});

const accountQuickLinks = computed<NavItem[]>(() => {
  if (!isLoggedIn.value || !isReaderRole.value) return [];

  return [
    { label: t("account.bookshelf"), to: "/my-library", roles: readerRoles },
    {
      label: t("account.following"),
      to: "/account/following",
      roles: readerRoles,
    },
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

const searchSuggestions = computed(() => {
  const keyword = search.value.trim();
  if (!keyword) return [];
  return filterBooks(searchBooks.value, keyword).slice(0, 6);
});

const searchCategories = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  const categories = uniqueBookCategories(searchBooks.value);

  if (!keyword) return categories.slice(0, 6);

  return categories
    .filter((category) => category.toLowerCase().includes(keyword))
    .slice(0, 4);
});

const searchAuthors = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return [];

  return [
    ...new Set(
      searchBooks.value
        .map((book) => book.author || book.author_name)
        .filter(Boolean)
        .map(String),
    ),
  ]
    .filter((author) => author.toLowerCase().includes(keyword))
    .slice(0, 4);
});

type SearchChip = {
  label: string;
  query: Record<string, string>;
};

const createSearchChip = (label: string, query: Record<string, string>): SearchChip => ({
  label,
  query,
});

const popularSearches = computed<SearchChip[]>(() => [
  createSearchChip(t("home.freeBooks"), { access: "free" }),
  createSearchChip(t("home.bestSellers"), { q: t("home.bestSellers") }),
  createSearchChip(t("home.newReleases"), { q: t("home.newReleases") }),
  createSearchChip(t("home.promotions"), { q: t("home.promotions") }),
]);

const hasSearchDiscovery = computed(
  () =>
    recentSearches.value.length > 0 ||
    popularSearches.value.length > 0 ||
    searchCategories.value.length > 0,
);

const shouldShowSearchResults = computed(
  () => searchLoading.value || Boolean(search.value.trim()),
);

const accountGroups = computed<NavGroup[]>(() => {
  const role = currentRole.value;

  const adminAccountGroup: NavGroup = {
    title: t("admin.account"),
    items: [
      {
        label: t("account.profile"),
        to: "/profile",
        roles: ["admin", "superadmin"],
      },
      {
        label: t("account.notifications"),
        to: "/account/notifications",
        roles: ["admin", "superadmin"],
      },
    ],
    defaultOpen: true,
  };

  const personalGroup: NavGroup = {
    title: t("account.myAccount"),
    items: [
      { label: t("account.profile"), to: "/profile", roles: memberRoles },
      {
        label: t("account.userDevices"),
        to: "/account/devices",
        roles: memberRoles,
      },
      {
        label: t("account.notifications"),
        to: "/account/notifications",
        roles: memberRoles,
      },
    ],
    defaultOpen: true,
  };

  const readingGroup: NavGroup = {
    title: t("account.readingMember"),
    items: [
      { label: t("account.bookshelf"), to: "/my-library", roles: readerRoles },
      {
        label: t("account.following"),
        to: "/account/following",
        roles: readerRoles,
      },
      {
        label: t("account.package"),
        to: "/account/buffet",
        roles: readerRoles,
      },
      {
        label: t("account.benefits"),
        to: "/account/benefits",
        roles: readerRoles,
      },
      { label: t("account.orders"), to: "/orders/history", roles: readerRoles },
      {
        label: t("account.reviews"),
        to: "/account/reviews",
        roles: readerRoles,
      },
      {
        label: t("account.ageVerification"),
        to: "/account/age-verification",
        roles: readerRoles,
      },
    ],
  };

  const settingsGroup: NavGroup = {
    title: t("account.settings"),
    items: [
      {
        label: t("account.giftCodes"),
        to: "/account/gift-codes",
        roles: memberRoles,
      },
      {
        label: t("notification.settings"),
        to: "/notification-settings",
        roles: memberRoles,
      },
    ],
    defaultOpen: true,
  };

  const writerGroup: NavGroup = {
    title: t("account.writerSpace"),
    items: [
      {
        label: t("account.uploadBook"),
        to: "/writer/upload",
        roles: ["writer"],
      },
      { label: t("account.writerDashboard"), to: "/writer", roles: ["writer"] },
    ],
  };

  const adminGroup: NavGroup = {
    title: t("account.adminTools"),
    items: [
      {
        label: t("account.adminDashboard"),
        to: "/admin",
        roles: ["admin", "superadmin"],
      },
      {
        label: t("account.contentManagement"),
        to: "/admin/page-content",
        roles: ["admin", "superadmin"],
      },
      {
        label: t("account.bookManagement"),
        to: "/admin/books",
        roles: ["admin", "superadmin"],
      },
      {
        label: t("admin.categories"),
        to: "/admin/categories",
        roles: ["admin", "superadmin"],
      },
      {
        label: t("account.approvals"),
        to: "/admin/approvals",
        roles: ["admin", "superadmin"],
      },
      {
        label: t("admin.paymentApprovals"),
        to: "/admin/payments",
        roles: ["admin", "superadmin"],
      },
      {
        label: locale.value === "th" ? "ข้อมูลระบบ" : "System Data",
        to: "/admin/system-data",
        roles: ["admin", "superadmin"],
      },
      {
        label: t("account.adminUploadBook"),
        to: "/admin/upload-book",
        roles: ["admin"],
      },
    ],
    defaultOpen: true,
  };

  const superAdminGroup: NavGroup = {
    title: t("account.superadmin"),
    items: [
      {
        label: t("account.superDashboard"),
        to: "/superadmin",
        roles: superAdminRoles,
      },
      {
        label: t("account.userManagement"),
        to: "/superadmin/users",
        roles: superAdminRoles,
      },
      {
        label: t("account.settingsSystem"),
        to: "/superadmin/settings",
        roles: superAdminRoles,
      },
    ],
    defaultOpen: true,
  };

  const adminUtilityGroup: NavGroup = {
    title: t("admin.shortcuts"),
    items: [
      { label: t("admin.viewWebsite"), to: "/", roles: ["admin", "superadmin"] },
    ],
  };

  const roleGroups: Record<UserRole, NavGroup[]> = {
    guest: [],
    user: [personalGroup, readingGroup, settingsGroup, writerGroup],
    writer: [personalGroup, readingGroup, settingsGroup, writerGroup],
    admin: [adminAccountGroup, adminGroup, adminUtilityGroup],
    superadmin: [
      adminAccountGroup,
      adminGroup,
      superAdminGroup,
      adminUtilityGroup,
    ],
  };

  return roleGroups[role]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
});

const closeMenu = () => {
  isMenuOpen.value = false;
};

const toggleMenu = () => {
  const shouldOpen = !isMenuOpen.value;

  if (shouldOpen) {
    closeSearch();
    closeFloatingMenus();
  }

  isMenuOpen.value = shouldOpen;
};

const hasNavbarOverflow = () => {
  const topBar = topBarRef.value;
  const leftCluster = leftClusterRef.value;
  const desktopNav = desktopNavRef.value;
  const topActions = topActionsRef.value;
  if (!topBar) return false;
  const collisionGap = 12;
  const leftRect = leftCluster?.getBoundingClientRect();
  const navRect = desktopNav?.getBoundingClientRect();
  const actionsRect = topActions?.getBoundingClientRect();

  const hasCollision =
    Boolean(
      leftRect && navRect && leftRect.right + collisionGap > navRect.left,
    ) ||
    Boolean(
      navRect && actionsRect && navRect.right + collisionGap > actionsRect.left,
    );

  return (
    topBar.scrollWidth > topBar.clientWidth + 1 ||
    hasCollision
  );
};

const scheduleCompactNavMeasure = () => {
  if (compactMeasureFrame) {
    window.cancelAnimationFrame(compactMeasureFrame);
  }

  compactMeasureFrame = window.requestAnimationFrame(() => {
    compactMeasureFrame = 0;
    const viewportWidth =
      document.documentElement.clientWidth || window.innerWidth;

    isCompactNav.value =
      viewportWidth <= compactNavBreakpoint || hasNavbarOverflow();
  });
};

const openSearch = () => {
  closeMenu();
  closeFloatingMenus();
  isSearchOpen.value = true;
  loadSearchBooks();
  nextTick(() => {
    searchInputRef.value?.focus();
  });
};

const closeSearch = () => {
  isSearchOpen.value = false;
};

const saveRecentSearch = (value: string) => {
  const keyword = value.trim();
  if (!keyword) return;

  recentSearches.value = [
    keyword,
    ...recentSearches.value.filter(
      (item) => item.toLowerCase() !== keyword.toLowerCase(),
    ),
  ].slice(0, 6);

  try {
    localStorage.setItem(
      recentSearchStorageKey,
      JSON.stringify(recentSearches.value),
    );
  } catch {
    // Search history is only a convenience.
  }
};

const loadRecentSearches = () => {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(recentSearchStorageKey) || "[]",
    );
    recentSearches.value = Array.isArray(parsed)
      ? parsed.filter(Boolean).map(String).slice(0, 6)
      : [];
  } catch {
    recentSearches.value = [];
  }
};

const goToSearch = (query: Record<string, string>) => {
  closeMenu();
  closeSearch();
  router.push({ name: "Search", query });
};

const searchKeyword = (keyword: string) => {
  saveRecentSearch(keyword);
  search.value = keyword;
  goToSearch({ q: keyword });
};

const searchCategory = (categoryName: string) => {
  saveRecentSearch(categoryName);
  search.value = categoryName;
  goToSearch({ category: categoryName });
};

const searchAuthor = (authorName: string) => {
  saveRecentSearch(authorName);
  search.value = authorName;
  goToSearch({ q: authorName });
};

const searchPopular = (item: SearchChip) => {
  saveRecentSearch(item.label);
  search.value = item.label;
  goToSearch(item.query);
};

const toggleNotifications = () => {
  const shouldOpen = !isNotificationsOpen.value;

  if (shouldOpen) {
    closeMenu();
    closeSearch();
    closeFloatingMenus();
  }

  isNotificationsOpen.value = shouldOpen;

  if (isNotificationsOpen.value) {
    loadNotifications();
  }
};

const openNotificationSettings = () => {
  closeFloatingMenus();
  router.push("/notification-settings");
};

const closeFloatingMenus = (exceptDropdown: HTMLDetailsElement | null = null) => {
  isNotificationsOpen.value = false;
  document
    .querySelectorAll<HTMLDetailsElement>(".icon-dropdown[open]")
    .forEach((item) => {
      if (item !== exceptDropdown) item.open = false;
    });
};

const handleDropdownToggle = (event: Event) => {
  const dropdown = event.currentTarget as HTMLDetailsElement | null;
  if (!dropdown?.open) return;

  closeMenu();
  closeSearch();
  closeFloatingMenus(dropdown);
};

const handleAccountToggle = (event: Event) => {
  const dropdown = event.currentTarget as HTMLDetailsElement | null;
  if (dropdown?.open) {
    loadWalletBalance();
    loadMembershipLabel();
  }

  handleDropdownToggle(event);
};

const openAccessibilityPanel = (event: MouseEvent) => {
  closeMenu();
  closeSearch();
  closeFloatingMenus();

  const trigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  const rect = trigger?.getBoundingClientRect();

  window.dispatchEvent(new CustomEvent("read-voice:open-accessibility-panel", {
    detail: rect
      ? {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      : undefined,
  }));
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
  saveRecentSearch(keyword);
  router.push(
    keyword ? { name: "Search", query: { q: keyword } } : { name: "Search" },
  );
};

const loadSearchBooks = async () => {
  if (searchBooks.value.length || searchLoading.value) return;
  searchLoading.value = true;

  try {
    const { data } = await api.get("/books");
    searchBooks.value = Array.isArray(data)
      ? data
      : Array.isArray(data?.books)
        ? data.books
        : [];
  } catch {
    searchBooks.value = [];
  } finally {
    searchLoading.value = false;
  }
};

const openSearchBook = (book: SearchableBook) => {
  closeMenu();
  closeSearch();
  saveRecentSearch(search.value || book.title || "");
  search.value = "";
  router.push({ name: "BookDetail", params: { id: book.id } });
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

    const planName = activeItem.title?.trim()
      ? formatMembershipPlanName(activeItem.title)
      : t("account.specialMember");
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
  loadRecentSearches();
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
      <div ref="leftClusterRef" class="left-cluster">
        <button
          class="menu-toggle icon-button"
          type="button"
          :aria-expanded="isMenuOpen"
          aria-controls="mobile-menu"
          :aria-label="t('common.mainMenu')"
          @click="toggleMenu"
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
          <img class="brand-logo" :src="logoNavUrl" alt="Read and Voice" />
        </router-link>

        <router-link
          class="subscription-link"
          to="/subscription-plans"
          @click="closeMenu"
        >
          {{ t("nav.subscription") }}
        </router-link>

        <router-link class="coin-link" to="/coin-wallet" @click="closeMenu">
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

      <nav
        ref="desktopNavRef"
        class="desktop-public-nav"
        aria-label="Main navigation"
      >
        <router-link
          v-for="item in mainNavItems"
          :key="item.to"
          :to="item.to"
          @click="closeMenu"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <div ref="topActionsRef" class="top-actions">
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

        <details
          ref="themeDropdownRef"
          class="icon-dropdown"
          @toggle="handleDropdownToggle"
        >
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
            :aria-label="t('language.switchToTh')"
            @click="selectLanguage('th')"
          >
            ไทย
          </button>

          <button
            type="button"
            :class="{ active: locale === 'en' }"
            :aria-pressed="locale === 'en'"
            :aria-label="t('language.switchToEn')"
            @click="selectLanguage('en')"
          >
            English
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
                  aria-label="Mark all notifications as read"
                  :disabled="notificationItems.length === 0"
                  @click="markAllNotificationsRead"
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
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </button>

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

            <p v-else class="notification-empty">
              {{ t("notification.empty") }}
            </p>

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
          @toggle="handleAccountToggle"
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
                  <small
                    class="role-badge"
                    :class="`role-badge--${currentRole}`"
                  >
                    {{ roleLabel }}
                  </small>

                  <small v-if="isReaderRole" class="account-membership">
                    {{ membershipLabel }}
                  </small>
                </div>
                <button class="logout-chip" type="button" @click="logout">
                  {{ t("account.logout") }}
                </button>
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
                <router-link class="guest-auth-link" to="/login">{{
                  t("account.login")
                }}</router-link>
                <span>/</span>
                <router-link class="guest-auth-link" to="/register">{{
                  t("account.register")
                }}</router-link>
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

      <section
        v-if="shouldShowSearchResults"
        class="search-results"
        aria-label="ผลการค้นหาและคำแนะนำ"
      >
        <p v-if="searchLoading">กำลังค้นหา...</p>

        <template v-else-if="search.trim()">
          <div v-if="searchSuggestions.length" class="search-section">
            <h3>หนังสือ</h3>
            <button
              v-for="book in searchSuggestions"
              :key="book.id"
              class="search-book-result"
              type="button"
              @click="openSearchBook(book)"
            >
              <img
                :src="resolveAssetUrl(book.cover_url || book.cover_image)"
                :alt="book.title || 'book cover'"
              />
              <span>
                <strong>{{ book.title }}</strong>
                <small>
                  {{ book.author || book.author_name || "ไม่ระบุผู้เขียน" }} ·
                  {{ book.category_name || "หนังสือ" }}
                </small>
              </span>
              <em>{{ book.content_type === "serial" ? "รายตอน" : "อีบุ๊ก" }}</em>
            </button>
          </div>

          <div v-if="searchAuthors.length" class="search-section">
            <h3>นักเขียน</h3>
            <button
              v-for="author in searchAuthors"
              :key="author"
              class="search-chip-result"
              type="button"
              @click="searchAuthor(author)"
            >
              <span>นักเขียน</span>
              <strong>{{ author }}</strong>
            </button>
          </div>

          <div v-if="searchCategories.length" class="search-section">
            <h3>หมวดหมู่</h3>
            <button
              v-for="categoryName in searchCategories"
              :key="categoryName"
              class="search-chip-result"
              type="button"
              @click="searchCategory(categoryName)"
            >
              <span>หมวดหมู่</span>
              <strong>{{ categoryName }}</strong>
            </button>
          </div>

          <p
            v-if="
              searchSuggestions.length === 0 &&
              searchAuthors.length === 0 &&
              searchCategories.length === 0
            "
          >
            ไม่พบผลลัพธ์ที่เกี่ยวข้อง
          </p>
        </template>

        <template v-else-if="hasSearchDiscovery">
          <div v-if="recentSearches.length" class="search-section">
            <h3>ค้นหาล่าสุด</h3>
            <div class="search-chip-list">
              <button
                v-for="keyword in recentSearches"
                :key="keyword"
                class="search-suggestion-chip"
                type="button"
                @click="searchKeyword(keyword)"
              >
                {{ keyword }}
              </button>
            </div>
          </div>

          <div class="search-section">
            <h3>คำค้นยอดนิยม</h3>
            <div class="search-chip-list">
              <button
                v-for="item in popularSearches"
                :key="item.label"
                class="search-suggestion-chip"
                type="button"
                @click="searchPopular(item)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div v-if="searchCategories.length" class="search-section">
            <h3>หมวดหมู่แนะนำ</h3>
            <div class="search-chip-list">
              <button
                v-for="categoryName in searchCategories"
                :key="categoryName"
                class="search-suggestion-chip"
                type="button"
                @click="searchCategory(categoryName)"
              >
                {{ categoryName }}
              </button>
            </div>
          </div>
        </template>
      </section>
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

        <router-link class="mobile-panel-brand" to="/" @click="closeMenu">
          <img
            class="mobile-panel-logo"
            :src="logoNavUrl"
            alt="Read and Voice"
          />
        </router-link>

        <div class="mobile-panel-header-spacer" aria-hidden="true"></div>
      </div>

      <section class="mobile-group mobile-card mobile-main-card">
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

      <section class="mobile-group mobile-cta-group">
        <router-link
          class="subscription-link mobile-pill-link"
          to="/subscription-plans"
          @click="closeMenu"
        >
          สมัครแพ็กเกจสมาชิก
        </router-link>

        <router-link
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
          เติมคอยน์
        </router-link>
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
  overflow-x: visible;
  background: color-mix(in srgb, var(--navbar-bg) 92%, var(--primary-soft));
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px);
}

.top-bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: clamp(12px, 1.6vw, 28px);
  min-height: 62px;
  padding: 6px clamp(22px, 3vw, 48px);
}

.left-cluster {
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: max-content;
  gap: 8px;
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
  justify-content: flex-start;
  flex: 0 0 clamp(94px, 8vw, 118px);
  width: clamp(94px, 8vw, 118px);
  min-width: clamp(94px, 8vw, 118px);
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
}

.brand-logo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.desktop-public-nav {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(360px, calc(100vw - 760px));
  min-width: 260px;
  transform: translate(-50%, -50%);
  overflow: hidden;
  gap: clamp(12px, 1.1vw, 24px);
}

.desktop-public-nav a {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font-size: clamp(13px, 0.85vw, 15px);
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desktop-public-nav a.router-link-active {
  color: var(--primary-strong);
}

.subscription-link,
.coin-link,
.accessibility-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 30px;
  border-radius: 999px;
  font-size: clamp(12px, 0.68vw, 13px);
  font-weight: 900;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
}

.subscription-link {
  width: auto;
  min-width: 150px;
  padding: 0 14px;
  background: linear-gradient(135deg, #15b8c7, #0ea5a8);
  color: #fff;
}

.coin-link {
  gap: 7px;
  width: auto;
  min-width: 108px;
  padding: 0 12px;
  background: linear-gradient(180deg, #ff9d10 0%, #f28a00 100%);
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 4px 10px rgba(200, 112, 0, 0.18);
}

.accessibility-link {
  width: auto;
  min-width: 170px;
  padding: 0 14px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--primary-strong);
  cursor: pointer;
}

.coin-mark {
  display: inline-grid;
  place-items: center;
  width: 17px;
  height: 17px;
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
  width: 11px;
  height: 11px;
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
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  min-width: 0;
  margin-left: auto;
  gap: 8px;
}

.top-actions > * {
  flex: 0 0 auto;
}

.icon-button,
.notification-button,
.avatar-button,
.mobile-close,
.search-close {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-raised);
  color: var(--text-strong);
  cursor: pointer;
}

.icon-button svg,
.notification-button svg,
.avatar-button svg,
.mobile-close svg,
.search-close svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 1.2;
}

.search-close {
  width: 34px;
  height: 34px;
  min-height: 34px;
}

.search-close svg {
  width: 16px;
  height: 16px;
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

@media (max-width: 780px) {
  .menu-toggle {
    display: inline-grid;
  }

  .desktop-public-nav,
  .subscription-link,
  .coin-link,
  .accessibility-link {
    display: none;
  }
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  padding: 3px;
}

.language-switch__single-btn {
  min-width: 44px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: #0f766e;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  padding: 0 10px;
}

.language-switch__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.language-switch button {
  min-width: 31px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #0f766e;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  padding: 0 7px;
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
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 10px;
  padding: max(12px, env(safe-area-inset-top)) 14px 14px;
  background:
    linear-gradient(
      180deg,
      rgba(231, 251, 247, 0.98),
      rgba(231, 251, 247, 0.82) 120px
    ),
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
  grid-template-columns: 20px 1fr 34px;
  align-items: center;
  gap: 10px;
  width: min(640px, calc(100vw - 28px));
  min-height: 52px;
  padding: 8px 10px 8px 14px;
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
  font-size: 15px;
  font-weight: 700;
  min-width: 0;
}

.search-box input::placeholder {
  color: #64748b;
  font-weight: 600;
}

.search-results {
  width: min(640px, calc(100vw - 28px));
  max-height: min(62vh, 460px);
  overflow: auto;
  border: 1px solid rgba(15, 118, 110, 0.12);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 20px 54px rgba(15, 23, 42, 0.18);
  padding: 10px;
}

.search-results:empty {
  display: none;
}

.search-results p {
  margin: 0;
  padding: 14px;
  color: #64748b;
  font-weight: 800;
}

.search-section {
  display: grid;
  gap: 8px;
  padding: 6px;
}

.search-section + .search-section {
  border-top: 1px solid rgba(15, 118, 110, 0.1);
  padding-top: 12px;
}

.search-section h3 {
  margin: 0;
  color: #0f766e;
  font-size: 12px;
  font-weight: 900;
}

.search-book-result {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 62px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #0f172a;
  cursor: pointer;
  padding: 8px;
  text-align: left;
}

.search-book-result:hover,
.search-book-result:focus-visible,
.search-chip-result:hover,
.search-chip-result:focus-visible,
.search-suggestion-chip:hover,
.search-suggestion-chip:focus-visible {
  background: #ecfdf5;
  outline: 0;
}

.search-results img {
  width: 44px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  background: #e2e8f0;
}

.search-book-result span {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.search-book-result strong,
.search-book-result small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-book-result strong {
  font-size: 15px;
}

.search-book-result small,
.search-book-result em {
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.search-book-result em {
  color: #0f766e;
}

.search-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-suggestion-chip,
.search-chip-result {
  border: 0;
  background: #f2fbfa;
  color: #0f172a;
  cursor: pointer;
  font: inherit;
}

.search-suggestion-chip {
  min-height: 32px;
  border-radius: 999px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 900;
  padding: 0 12px;
}

.search-chip-result {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 40px;
  border-radius: 12px;
  padding: 8px 10px;
  text-align: left;
}

.search-chip-result span {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.search-chip-result strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* =========================
   MOBILE MENU
========================= */
.mobile-backdrop {
  position: fixed;
  inset: 58px 0 0 0;
  z-index: 58;
  background: rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(2px);
}

.mobile-panel {
  position: fixed;
  top: 62px;
  left: 8px;
  width: min(228px, calc(100vw - 16px));
  max-width: calc(100vw - 16px);
  max-height: calc(100dvh - 70px);
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 60;
  display: grid;
  gap: 8px;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid rgba(15, 118, 110, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.14);
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  transform-origin: top left;
  pointer-events: none;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.mobile-panel.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.mobile-panel-header {
  display: grid;
  grid-template-columns: 28px 1fr 28px;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 0 0 2px;
}

.mobile-panel-header .mobile-close,
.mobile-panel-header-spacer {
  width: 28px;
  height: 28px;
}

.mobile-panel-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.mobile-panel-logo {
  width: 52px;
  height: 24px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.mobile-group {
  display: grid;
  gap: 8px;
  margin-bottom: 0;
}

.mobile-card {
  padding: 10px 8px;
  border-radius: 14px;
  background: #f5f7f7;
}

.mobile-main-card {
  gap: 8px;
}

.mobile-group h3 {
  margin: 0 0 2px;
  color: #7b8794;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-transform: none;
}

.mobile-group a {
  display: block;
  padding: 2px 0;
  color: #111827;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  text-decoration: none;
}

.mobile-cta-group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  padding: 0;
  background: transparent;
}

.mobile-pill-link,
.mobile-cta-group .subscription-link,
.mobile-cta-group .coin-link {
  grid-column: auto;
  grid-row: auto;
  display: inline-flex;
  width: 100%;
  min-height: 34px;
  height: 34px;
  justify-content: center;
  align-items: center;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  padding: 0 8px;
}

.mobile-cta-group .coin-link {
  gap: 6px;
}

.mobile-cta-group .coin-mark {
  width: 15px;
  height: 15px;
}

.mobile-cta-group .coin-mark svg {
  width: 9px;
  height: 9px;
}

.navbar--compact .top-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-height: 68px;
  padding: 8px clamp(14px, 2.6vw, 34px);
}

.navbar--compact .left-cluster {
  flex: 1 1 auto;
  min-width: 0;
  gap: 10px;
}

.navbar--compact .desktop-public-nav {
  display: none;
}

.navbar--compact .left-cluster > .subscription-link,
.navbar--compact .left-cluster > .coin-link,
.navbar--compact .left-cluster > .accessibility-link {
  display: none;
}

.navbar--compact .menu-toggle {
  display: inline-grid;
}

.navbar--compact .mobile-accessibility-button {
  display: inline-grid;
}

.navbar--compact .menu-toggle,
.navbar--compact .mobile-accessibility-button,
.navbar--compact .top-actions .icon-button,
.navbar--compact .notification-button,
.navbar--compact .avatar-button {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 6px 16px rgba(15, 118, 110, 0.08);
  -webkit-tap-highlight-color: transparent;
}

.navbar--compact .menu-toggle svg,
.navbar--compact .mobile-accessibility-button svg,
.navbar--compact .top-actions .icon-button svg,
.navbar--compact .notification-button svg,
.navbar--compact .avatar-button svg {
  width: 18px;
  height: 18px;
}

.navbar--compact .brand {
  flex: 0 1 116px;
  width: 116px;
  min-width: 96px;
  height: 48px;
}

.navbar--compact .top-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 6px;
  margin-left: auto;
}

.navbar--compact .desktop-public-nav {
  position: static;
  transform: none;
}

.navbar--compact .mobile-cta-group {
  display: grid;
  grid-template-columns: 1fr;
}

.navbar--compact .mobile-cta-group .subscription-link,
.navbar--compact .mobile-cta-group .coin-link {
  display: inline-flex;
  width: 100%;
  min-height: 34px;
  height: 34px;
  padding: 0 8px;
}

.navbar--compact .mobile-cta-group .mobile-pill-link.accessibility-link {
  display: none;
}

@media (max-width: 780px) {
  .top-bar,
  .navbar--compact .top-bar {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    width: 100%;
    max-width: 100vw;
    overflow: hidden;
    min-height: 60px;
    padding: 8px 10px;
  }

  .left-cluster,
  .navbar--compact .left-cluster {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    gap: 4px;
  }

  .desktop-public-nav,
  .navbar--compact .desktop-public-nav {
    display: none;
  }

  .left-cluster > .subscription-link,
  .left-cluster > .coin-link,
  .left-cluster > .accessibility-link {
    display: none;
  }

  .mobile-accessibility-button {
    display: inline-grid;
  }

  .menu-toggle,
  .navbar--compact .menu-toggle {
    display: inline-grid;
    flex: 0 0 34px;
  }

  .brand,
  .navbar--compact .brand {
    flex: 0 1 112px;
    width: 112px;
    min-width: 88px;
    height: 46px;
  }

  .brand-logo {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .top-actions,
  .navbar--compact .top-actions {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    width: auto;
    gap: 4px;
    min-width: 0;
    margin-left: auto;
  }

  .top-actions > .icon-button,
  .top-actions > .icon-dropdown,
  .top-actions > .notification-wrapper {
    flex: 0 0 auto;
    width: auto;
  }

  .icon-button,
  .notification-button,
  .avatar-button,
  .navbar--compact .menu-toggle,
  .navbar--compact .mobile-accessibility-button,
  .navbar--compact .top-actions .icon-button,
  .navbar--compact .notification-button,
  .navbar--compact .avatar-button {
    flex: 0 0 34px;
    width: 34px;
    height: 34px;
  }

  .icon-button svg,
  .notification-button svg,
  .avatar-button svg,
  .navbar--compact .menu-toggle svg,
  .navbar--compact .mobile-accessibility-button svg,
  .navbar--compact .top-actions .icon-button svg,
  .navbar--compact .notification-button svg,
  .navbar--compact .avatar-button svg {
    width: 17px;
    height: 17px;
  }

  .language-switch {
    min-height: 30px;
    padding: 2px;
  }

  .language-switch__label {
    display: none;
  }

  .language-switch button {
    min-width: 26px;
    height: 24px;
    font-size: 10px;
    padding: 0 5px;
  }

  .language-switch__single-btn {
    min-width: 38px;
    height: 24px;
    font-size: 10px;
    padding: 0 8px;
  }

  .search-overlay {
    gap: 9px;
    padding: max(12px, env(safe-area-inset-top)) 12px 12px;
  }

  .search-box {
    grid-template-columns: 18px minmax(0, 1fr) 34px;
    gap: 8px;
    width: min(520px, calc(100vw - 24px));
    min-height: 48px;
    padding: 8px 8px 8px 14px;
    border-radius: 24px;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
  }

  .search-box > svg {
    width: 18px;
    height: 18px;
  }

  .search-box input {
    font-size: 13px;
    line-height: 1.25;
  }

  .search-close {
    width: 34px;
    height: 34px;
    min-height: 34px;
  }

  .search-close svg {
    width: 16px;
    height: 16px;
  }

  .search-results {
    width: min(520px, calc(100vw - 24px));
    max-height: min(58vh, 420px);
    border-radius: 14px;
    padding: 7px;
  }

  .search-section {
    gap: 6px;
    padding: 5px;
  }

  .search-section + .search-section {
    padding-top: 9px;
  }

  .search-section h3 {
    font-size: 10px;
  }

  .search-book-result {
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 8px;
    min-height: 48px;
    border-radius: 11px;
    padding: 6px;
  }

  .search-results img {
    width: 34px;
  }

  .search-book-result strong {
    font-size: 11px;
  }

  .search-book-result small,
  .search-book-result em {
    font-size: 9px;
  }

  .search-chip-list {
    gap: 6px;
  }

  .search-suggestion-chip {
    min-height: 27px;
    font-size: 10px;
    padding: 0 9px;
  }

  .search-chip-result {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 7px;
    min-height: 34px;
    border-radius: 10px;
    padding: 6px 8px;
  }

  .search-chip-result span {
    font-size: 9px;
  }

  .search-chip-result strong {
    font-size: 10px;
  }

  .mobile-backdrop {
    inset: 58px 0 0 0;
  }

  .mobile-panel {
    top: 62px;
    left: 8px;
    width: min(228px, calc(100vw - 16px));
    max-height: calc(100dvh - 70px);
    border-radius: 16px;
    padding: 8px;
    gap: 8px;
  }

  .mobile-panel-header {
    grid-template-columns: 28px 1fr 28px;
  }

  .mobile-panel-header .mobile-close,
  .mobile-panel-header-spacer {
    width: 28px;
    height: 28px;
  }

  .mobile-panel-logo {
    width: 52px;
    height: 24px;
  }

  .mobile-card {
    padding: 10px 8px;
  }

  .mobile-group a {
    font-size: 12px;
  }

  .mobile-pill-link,
  .mobile-cta-group .subscription-link,
  .mobile-cta-group .coin-link {
    min-height: 34px;
    height: 34px;
    font-size: 11px;
    padding: 0 8px;
  }
}

@media (max-width: 420px) {
  .top-bar,
  .navbar--compact .top-bar {
    min-height: 56px;
    padding: 8px 8px;
    gap: 4px;
    flex-wrap: nowrap;
    overflow: hidden;
  }

  .desktop-public-nav,
  .navbar--compact .desktop-public-nav {
    display: none;
  }

  .left-cluster,
  .navbar--compact .left-cluster {
    flex: 1 1 auto;
    gap: 3px;
    min-width: 0;
  }

  .top-actions,
  .navbar--compact .top-actions {
    flex: 0 0 auto;
    width: auto;
    gap: 3px;
  }

  .top-actions > .icon-button,
  .top-actions > .icon-dropdown,
  .top-actions > .notification-wrapper {
    flex: 0 0 auto;
    width: auto;
  }

  .brand,
  .navbar--compact .brand {
    flex: 0 1 96px;
    width: 96px;
    min-width: 72px;
    height: 40px;
  }

  .icon-button,
  .notification-button,
  .avatar-button,
  .navbar--compact .menu-toggle,
  .navbar--compact .mobile-accessibility-button,
  .navbar--compact .top-actions .icon-button,
  .navbar--compact .notification-button,
  .navbar--compact .avatar-button {
    flex: 0 0 30px;
    width: 30px;
    height: 30px;
  }

  .icon-button svg,
  .notification-button svg,
  .avatar-button svg,
  .navbar--compact .menu-toggle svg,
  .navbar--compact .mobile-accessibility-button svg,
  .navbar--compact .top-actions .icon-button svg,
  .navbar--compact .notification-button svg,
  .navbar--compact .avatar-button svg {
    width: 15px;
    height: 15px;
  }

  .language-switch {
    grid-template-columns: 1fr;
    gap: 2px;
    min-height: 28px;
    padding: 2px;
  }

  .language-switch button {
    min-width: 22px;
    height: 22px;
    font-size: 8px;
    line-height: 1;
    padding: 0 3px;
  }

  .language-switch__single-btn {
    min-width: 34px;
    height: 22px;
    font-size: 9px;
    padding: 0 6px;
  }

  .search-overlay {
    gap: 7px;
    padding: max(10px, env(safe-area-inset-top)) 10px 10px;
  }

  .search-box {
    grid-template-columns: 16px minmax(0, 1fr) 30px;
    gap: 7px;
    width: min(360px, calc(100vw - 20px));
    min-height: 42px;
    padding: 6px 6px 6px 12px;
    border-radius: 21px;
  }

  .search-box > svg {
    width: 16px;
    height: 16px;
  }

  .search-box input {
    font-size: 11px;
  }

  .search-close {
    width: 30px;
    height: 30px;
    min-height: 30px;
  }

  .search-close svg {
    width: 14px;
    height: 14px;
  }

  .search-results {
    width: min(360px, calc(100vw - 20px));
    max-height: min(56vh, 380px);
  }

  .search-book-result {
    grid-template-columns: 30px minmax(0, 1fr);
  }

  .search-book-result em {
    grid-column: 2;
  }

  .search-results img {
    width: 30px;
  }

  .search-suggestion-chip {
    min-height: 25px;
    font-size: 9px;
    padding: 0 8px;
  }

  .mobile-backdrop {
    inset: 54px 0 0 0;
  }

  .mobile-panel {
    top: 58px;
    left: 8px;
    width: min(214px, calc(100vw - 16px));
    max-height: calc(100dvh - 66px);
    padding: 7px;
    border-radius: 14px;
  }

  .mobile-panel-header {
    grid-template-columns: 26px 1fr 26px;
  }

  .mobile-panel-header .mobile-close,
  .mobile-panel-header-spacer {
    width: 26px;
    height: 26px;
  }

  .mobile-panel-logo {
    width: 48px;
    height: 22px;
  }

  .mobile-card {
    padding: 8px 7px;
  }

  .mobile-group h3 {
    font-size: 10px;
  }

  .mobile-group a {
    font-size: 11px;
    line-height: 1.3;
  }

  .mobile-pill-link,
  .mobile-cta-group .subscription-link,
  .mobile-cta-group .coin-link {
    min-height: 32px;
    height: 32px;
    font-size: 10px;
    padding: 0 7px;
  }

  .dropdown-panel,
  .notification-panel,
  .account-panel {
    position: fixed;
    top: 76px;
    right: 18px;
    left: auto;
    width: min(224px, calc(100vw - 36px));
    max-height: calc(100dvh - 88px);
    overflow-y: auto;
  }

  .dropdown-panel:not(.account-panel),
  .notification-panel {
    padding: 10px;
    border-radius: 16px;
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.14);
  }

  .theme-panel {
    gap: 6px;
  }

  .theme-panel button {
    min-height: 32px;
    border-radius: 10px;
    font-size: 11px;
  }

  .notification-panel__header {
    gap: 8px;
  }

  .notification-panel__header h3 {
    font-size: 14px;
    line-height: 1.2;
  }

  .notification-panel__actions {
    gap: 5px;
  }

  .notification-icon-action {
    flex-basis: 24px;
    width: 24px;
    height: 24px;
  }

  .notification-icon-action svg {
    width: 16px;
    height: 16px;
  }

  .notification-list {
    gap: 8px;
    margin-top: 10px;
  }

  .notification-item {
    grid-template-columns: 30px 1fr;
    gap: 8px;
    border-radius: 12px;
    padding: 9px;
  }

  .notification-thumb {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    font-size: 10px;
  }

  .notification-copy h4 {
    font-size: 12px;
    line-height: 1.25;
  }

  .notification-copy p {
    font-size: 10px;
    line-height: 1.35;
  }

  .notification-copy time {
    font-size: 10px;
    margin-top: 4px;
  }

  .notification-open {
    grid-column: 1 / -1;
    min-height: 28px;
    border-radius: 9px;
    font-size: 10px;
    padding: 0 8px;
  }

  .notification-empty,
  .notification-footer-link {
    font-size: 12px;
  }

  .account-panel {
    gap: 8px;
    padding: 10px;
    border-radius: 16px;
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.14);
  }

  .account-summary-card {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 8px;
    padding-bottom: 7px;
  }

  .account-avatar {
    width: 34px;
    height: 34px;
    font-size: 14px;
  }

  .account-avatar--member {
    border-width: 2px;
    box-shadow:
      0 0 0 1px rgba(20, 184, 166, 0.08),
      0 7px 18px rgba(20, 184, 166, 0.18);
  }

  .role-badge {
    font-size: 8px;
    padding: 2px 6px;
  }

  .account-role-hint,
  .account-membership {
    font-size: 9px;
    line-height: 1.2;
  }

  .logout-chip {
    grid-column: 1 / -1;
    min-height: 28px;
    margin-top: 3px;
    font-size: 10px;
    padding: 0 8px;
  }

  .wallet-row {
    gap: 7px;
    padding-bottom: 7px;
  }

  .wallet-label,
  .wallet-link {
    font-size: 10px;
  }

  .wallet-balance strong {
    font-size: 11px;
  }

  .account-shortcuts,
  .account-section {
    gap: 6px;
  }

  .account-shortcuts {
    padding-bottom: 7px;
  }

  .account-accordion {
    padding-bottom: 7px;
  }

  .account-accordion summary {
    font-size: 12px;
  }

  .account-accordion summary svg {
    width: 14px;
    height: 14px;
  }

  .account-section {
    padding-top: 6px;
  }

  .account-link {
    font-size: 11px;
    line-height: 1.25;
  }
}

@media (max-width: 360px) {
  .top-bar,
  .navbar--compact .top-bar {
    gap: 4px;
    flex-wrap: nowrap;
  }

  .left-cluster,
  .navbar--compact .left-cluster {
    gap: 2px;
  }

  .brand,
  .navbar--compact .brand {
    flex: 0 1 84px;
    width: 84px;
    min-width: 68px;
    height: 36px;
  }

  .top-actions > .icon-button,
  .top-actions > .icon-dropdown,
  .top-actions > .notification-wrapper,
  .icon-button,
  .notification-button,
  .avatar-button,
  .navbar--compact .menu-toggle,
  .navbar--compact .mobile-accessibility-button,
  .navbar--compact .top-actions .icon-button,
  .navbar--compact .notification-button,
  .navbar--compact .avatar-button {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
  }

  .icon-button svg,
  .notification-button svg,
  .avatar-button svg,
  .navbar--compact .menu-toggle svg,
  .navbar--compact .mobile-accessibility-button svg,
  .navbar--compact .top-actions .icon-button svg,
  .navbar--compact .notification-button svg,
  .navbar--compact .avatar-button svg {
    width: 14px;
    height: 14px;
  }

  .mobile-panel {
    width: min(204px, calc(100vw - 16px));
  }

  .account-panel {
    right: 14px;
    width: min(214px, calc(100vw - 28px));
  }

  .dropdown-panel:not(.account-panel),
  .notification-panel {
    right: 14px;
    width: min(214px, calc(100vw - 28px));
  }
}
</style>
