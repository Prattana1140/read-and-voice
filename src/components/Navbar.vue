<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import logoUrl from "../assets/Logo-transparent.png";
import api, { resolveAssetUrl } from "../utils/api";
import { AUTH_CHANGED_EVENT, getToken, getUser, logout as clearAuth } from "../utils/auth";

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
const navbarRef = ref<HTMLElement | null>(null);
const themeDropdownRef = ref<HTMLDetailsElement | null>(null);
const isMenuOpen = ref(false);
const isSearchOpen = ref(false);
const isNotificationsOpen = ref(false);
const search = ref("");
const authVersion = ref(0);
const walletBalance = ref(0);
const membershipLabel = ref("เน€เธเธเน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ•เน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธยเน€เธย");
const notificationItems = ref<NotificationItem[]>([]);
const notificationLoading = ref(false);
const notificationError = ref("");
const allRoles: UserRole[] = ["guest", "user", "writer", "admin", "superadmin"];

const notificationCount = computed(() => notificationItems.value.filter((item) => Number(item.is_read) !== 1).length);

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


const memberRoles: UserRole[] = ["user", "writer", "admin", "superadmin"];

const userDisplayName = computed(() => user.value?.name?.trim() || "Read and Voice");
const userAvatarUrl = computed(() => {
  const avatar = user.value?.avatar_url?.trim();
  return avatar ? resolveAssetUrl(avatar) : "";
});
const userMeta = computed(() => {
  if (user.value?.id) {
    return `member-${String(user.value.id).padStart(6, "0")}`;
  }

  return "เน€เธเธเน€เธเธเน€เธเธ’เน€เธยเน€เธเธ”เน€เธยเน€เธยเน€เธเธเน€เธย Read and Voice";
});

const accountQuickLinks = computed<NavItem[]>(() => {
  if (!isLoggedIn.value) return [];

  return [
    { label: "เน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธ‘เน€เธยเน€เธเธเน€เธเธ—เน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธย", to: "/my-library", roles: memberRoles },
    { label: "เน€เธเธเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ’เน€เธเธเน€เธโ€”เน€เธเธ•เน€เธยเน€เธเธเน€เธเธเน€เธเธ’เน€เธยเน€เธยเน€เธโ€เน€เธย", to: "/wishlist", roles: memberRoles },
    { label: "เน€เธเธเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ’เน€เธเธเน€เธโ€”เน€เธเธ•เน€เธยเน€เธโ€ขเน€เธเธ”เน€เธโ€เน€เธโ€ขเน€เธเธ’เน€เธเธ", to: "/account/following", roles: memberRoles },
  ].filter((item) => item.roles.includes(currentRole.value));
});

const themeOptions: { label: string; value: ThemeMode }[] = [
  { label: "เน€เธยเน€เธยเน€เธโ€ขเน€เธเธ”", value: "normal" },
  { label: "เน€เธยเน€เธเธ…เน€เธเธ’เน€เธยเน€เธยเน€เธเธ—เน€เธย", value: "dark" },
  { label: "เน€เธยเน€เธเธเน€เธเธเน€เธโ€เน€เธเธเน€เธยเน€เธเธ’เน€เธย", value: "reading" },
];

const selectTheme = (theme: ThemeMode) => {
  emit("change-theme", theme);

  if (themeDropdownRef.value) {
    themeDropdownRef.value.open = false;
  }

  closeMenu();
};

const publicNavItems: NavItem[] = [
  { label: "เน€เธเธเน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธเธเน€เธย", to: "/", roles: allRoles },
  { label: "เน€เธเธเน€เธเธ•เน€เธยเน€เธเธเน€เธยเน€เธย", to: "/store", roles: allRoles },
  { label: "เน€เธยเน€เธเธ”เน€เธเธเน€เธเธ’เน€เธเธเน€เธเธเน€เธเธ’เน€เธเธเน€เธโ€ขเน€เธเธเน€เธย", to: "/serials", roles: allRoles },
];

const mainNavItems = computed(() => publicNavItems.filter((item) => item.roles.includes(currentRole.value)));

const accountGroups = computed<NavGroup[]>(() => {
  const role = currentRole.value;
  const groups: NavGroup[] = [
    {
      title: "เน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธเธ•เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธย",
      items: [
        { label: "เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ…เน€เธย", to: "/profile", roles: memberRoles },
        { label: "เน€เธเธเน€เธเธเน€เธเธ’เน€เธยเน€เธเธ”เน€เธยเน€เธยเน€เธเธ…เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธยเน€เธย", to: "/account/buffet", roles: memberRoles },
        { label: "เน€เธเธเน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธโ€เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธย", to: "/account/devices", roles: memberRoles },
        { label: "เน€เธเธเน€เธเธ”เน€เธโ€”เน€เธยเน€เธเธ”เน€เธยเน€เธเธ”เน€เธโฌเน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธย", to: "/account/benefits", roles: memberRoles },
        { label: "เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธย", to: "/account/notifications", roles: memberRoles },
        { label: "เน€เธยเน€เธเธเน€เธเธเน€เธเธเน€เธเธ‘เน€เธโ€ขเน€เธเธ”เน€เธยเน€เธเธ’เน€เธเธเน€เธเธเน€เธเธ‘เน€เธยเน€เธยเน€เธยเน€เธเธ—เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธย", to: "/orders/history", roles: ["user", "writer"] },
        { label: "เน€เธเธเน€เธเธ•เน€เธเธเน€เธเธ”เน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธย", to: "/account/reviews", roles: memberRoles },
        { label: "เน€เธยเน€เธเธ’เน€เธเธเน€เธเธเน€เธเธ—เน€เธยเน€เธเธเน€เธเธ‘เน€เธยเน€เธเธเน€เธเธ’เน€เธเธเน€เธเธเน€เธโ€เน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ‘เน€เธโ€ขเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ’เน€เธยเน€เธย", to: "/account/age-verification", roles: memberRoles },
      ],
      defaultOpen: true,
    },
    {
      title: "เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธย",
      items: [
        { label: "เน€เธยเน€เธเธ”เน€เธยเน€เธโ€ขเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโ€", to: "/account/gift-codes", roles: memberRoles },
        { label: "เน€เธโ€ขเน€เธเธ‘เน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธย", to: "/notification-settings", roles: memberRoles },
      ],
      defaultOpen: true,
    },
    {
      title: "เน€เธโฌเน€เธยเน€เธเธเน€เธเธ—เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ—เน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธโฌเน€เธยเน€เธเธ•เน€เธเธเน€เธย",
      items: [
        { label: "เน€เธยเน€เธโ€เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธโ€เน€เธยเน€เธเธ‘เน€เธยเน€เธโฌเน€เธยเน€เธเธ•เน€เธเธเน€เธย", to: "/writer", roles: ["writer"] },
      ],
    },
    {
      title: "เน€เธยเน€เธเธ‘เน€เธโ€เน€เธยเน€เธเธ’เน€เธเธเน€เธเธเน€เธเธเน€เธยเน€เธย",
      items: [
        { label: "เน€เธยเน€เธโ€เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธโ€เน€เธยเน€เธเธเน€เธโ€เน€เธเธเน€เธเธ”เน€เธย", to: "/admin", roles: ["admin", "superadmin"] },
      ],
    },
    {
      title: "เน€เธยเน€เธเธเน€เธโฌเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธโ€เน€เธเธเน€เธเธ”เน€เธย",
      items: [
        { label: "เน€เธยเน€เธโ€เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธโ€", to: "/superadmin", roles: ["superadmin"] },
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
  document.querySelectorAll<HTMLDetailsElement>(".icon-dropdown[open]").forEach((item) => {
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

const formatNotificationTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const notificationToneClass = (type: string) => {
  if (type === "sale" || type === "promotion") return "tone-sale";
  if (type === "writer_follow" || type === "book_published") return "tone-writer";
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
    notificationError.value = error?.response?.data?.message || "เน€เธยเน€เธเธเน€เธเธ…เน€เธโ€เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ“เน€เธโฌเน€เธเธเน€เธยเน€เธย";
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
    notificationError.value = error?.response?.data?.message || "เน€เธเธเน€เธเธ‘เน€เธยเน€เธโฌเน€เธโ€เน€เธโ€ขเน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ“เน€เธโฌเน€เธเธเน€เธยเน€เธย";
  }
};

const markAllNotificationsRead = async () => {
  try {
    await api.post("/account/notifications/read-all");
    notificationItems.value = notificationItems.value.map((item) => ({ ...item, is_read: 1 }));
  } catch (error: any) {
    notificationError.value = error?.response?.data?.message || "เน€เธเธเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธยเน€เธโ€”เน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธโ€เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ“เน€เธโฌเน€เธเธเน€เธยเน€เธย";
  }
};

const loadWalletBalance = async () => {
  if (!isLoggedIn.value) {
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
    membershipLabel.value = "เน€เธเธเน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ•เน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธยเน€เธย";
    return;
  }

  try {
    const { data } = await api.get("/account/buffet");
    const items = Array.isArray(data?.items) ? (data.items as BuffetItem[]) : [];
    const activeItem = items.find((item) => item.status === "active" || item.payment_status === "paid");

    if (!activeItem) {
      membershipLabel.value = "เน€เธเธเน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ•เน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธยเน€เธย";
      return;
    }

    const planName = activeItem.title?.trim() || "เน€เธเธเน€เธเธเน€เธเธ’เน€เธยเน€เธเธ”เน€เธย VIP";
    const expiry = activeItem.end_at
      ? `เน€เธโ€“เน€เธเธ–เน€เธย ${new Date(activeItem.end_at).toLocaleDateString("th-TH")}`
      : "เน€เธยเน€เธเธ“เน€เธเธ…เน€เธเธ‘เน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธย";

    membershipLabel.value = `${planName} เธขเธ— ${expiry}`;
  } catch {
    membershipLabel.value = "เน€เธโ€ขเน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธโ€“เน€เธเธ’เน€เธยเน€เธเธเน€เธเธเน€เธเธเน€เธเธ’เน€เธยเน€เธเธ”เน€เธย";
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
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  loadWalletBalance();
  loadMembershipLabel();
  loadNotifications();
});

onUnmounted(() => {
  window.removeEventListener(AUTH_CHANGED_EVENT, refreshAuth);
  window.removeEventListener("storage", refreshAuth);
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
});

watch(isLoggedIn, () => {
  loadWalletBalance();
  loadMembershipLabel();
  loadNotifications();
});
</script>

<template>
  <header id="site-navigation" ref="navbarRef" class="navbar">
    <div class="top-bar">
      <div class="left-cluster">
        <button
          class="menu-toggle icon-button"
          type="button"
          :aria-expanded="isMenuOpen"
          aria-controls="mobile-menu"
          aria-label="เน€เธโฌเน€เธยเน€เธเธ”เน€เธโ€เน€เธโฌเน€เธเธเน€เธยเน€เธเธ"
          @click="isMenuOpen = !isMenuOpen"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path class="menu-icon-lines" d="M4.8 6.8h14.4M4.8 12h14.4M4.8 17.2h14.4" />
          </svg>
        </button>

        <router-link class="brand" to="/" aria-label="เน€เธยเน€เธเธ…เน€เธเธ‘เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธเธเน€เธย" @click="closeMenu">
          <img class="brand-logo" :src="logoUrl" alt="Read and Voice" />
        </router-link>

        <router-link class="subscription-link" to="/subscription-plans" @click="closeMenu">
          เน€เธเธเน€เธเธเน€เธเธ‘เน€เธยเน€เธเธเน€เธเธเน€เธเธ’เน€เธเธเน€เธโฌเน€เธโ€เน€เธเธ—เน€เธเธเน€เธย
        </router-link>

        <router-link class="coin-link" to="/coin-wallet" @click="closeMenu">
          <span class="coin-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8.5" class="coin-face" />
              <circle cx="12" cy="12" r="5.4" class="coin-core" />
              <ellipse cx="9.2" cy="8.4" rx="2.2" ry="1.5" class="coin-shine" />
            </svg>
          </span>
          เน€เธโฌเน€เธโ€ขเน€เธเธ”เน€เธเธ Coin
        </router-link>
        <button class="accessibility-link" type="button" aria-label="เปิดตัวช่วยการเข้าถึง" @click="openAccessibilityPanel">
          การเข้าถึง
        </button>
      </div>

      <nav class="desktop-public-nav" aria-label="Main navigation">
        <router-link v-for="item in mainNavItems" :key="item.to" :to="item.to" @click="closeMenu">
          {{ item.label }}
        </router-link>
      </nav>

      <div class="top-actions">
        <button class="icon-button" type="button" aria-label="เน€เธยเน€เธยเน€เธยเน€เธเธเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ‘เน€เธยเน€เธเธเน€เธเธ—เน€เธเธ" @click="openSearch">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.8 4.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Zm0 2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm5.4 9 4 4-1.4 1.4-4-4 1.4-1.4Z" />
          </svg>
        </button>

        <details ref="themeDropdownRef" class="icon-dropdown">
          <summary class="icon-button" aria-label="เน€เธโฌเน€เธยเน€เธเธ…เน€เธเธ•เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ•เน€เธเธ">
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
              @click="selectTheme(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </details>

        <div v-if="isLoggedIn" class="notification-wrapper">
          <button
            class="notification-button"
            type="button"
            aria-label="เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธย"
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
              <h3>เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธย</h3>
              <div class="notification-panel__actions">
                <button
                  type="button"
                  aria-label="เน€เธเธเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธยเน€เธโ€”เน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธโ€เน€เธยเน€เธเธ…เน€เธยเน€เธเธ"
                  :disabled="notificationCount === 0"
                  @click="markAllNotificationsRead"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9.2 12.8 1.9 1.9 3.9-4.8 1.6 1.3-5 6.1a1 1 0 0 1-1.5.1l-2.3-2.4 1.4-1.2Zm2.8-9.3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" />
                  </svg>
                </button>
                <button type="button" aria-label="เน€เธโ€ขเน€เธเธ‘เน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธย" @click="openNotificationSettings">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m19.4 13.5 1.4 1.1-2 3.5-1.8-.7c-.5.4-1 .7-1.6.9L15.1 20h-4.2l-.3-1.7c-.6-.2-1.1-.5-1.6-.9l-1.8.7-2-3.5 1.4-1.1a6 6 0 0 1 0-1.8l-1.4-1.1 2-3.5 1.8.7c.5-.4 1-.7 1.6-.9l.3-1.7h4.2l.3 1.7c.6.2 1.1.5 1.6.9l1.8-.7 2 3.5-1.4 1.1a6 6 0 0 1 0 1.8ZM12 15.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </svg>
                </button>
              </div>
            </div>

            <p v-if="notificationError" class="notification-empty">{{ notificationError }}</p>
            <p v-else-if="notificationLoading" class="notification-empty">เน€เธยเน€เธเธ“เน€เธเธ…เน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธเธ…เน€เธโ€เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธย...</p>
            <div v-else-if="notificationItems.length" class="notification-list">
              <article
                v-for="item in notificationItems"
                :key="item.id"
                class="notification-item"
                :class="{ unread: Number(item.is_read) !== 1 }"
              >
                <span class="notification-thumb" :class="notificationToneClass(item.type)">RV</span>
                <div class="notification-copy">
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.message }}</p>
                  <time>{{ formatNotificationTime(item.created_at) }}</time>
                </div>
                <button class="notification-open" type="button" @click="markNotificationAsRead(item)">
                  {{ item.action_url ? "เน€เธโฌเน€เธยเน€เธเธ”เน€เธโ€" : "เน€เธเธเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธเธ…เน€เธยเน€เธเธ" }}
                </button>
              </article>
            </div>
            <p v-else class="notification-empty">เน€เธเธเน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ•เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธย</p>
            <router-link class="notification-footer-link" to="/account/notifications" @click="closeFloatingMenus">
              เน€เธโ€เน€เธเธเน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโฌเน€เธโ€ขเน€เธเธ—เน€เธเธเน€เธยเน€เธโ€”เน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธโ€
            </router-link>
          </div>
        </div>

        <details class="icon-dropdown account-dropdown" @toggle="loadWalletBalance(); loadMembershipLabel()">
          <summary class="avatar-button" aria-label="เน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธเธ•เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธย">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Zm0 2c-4.2 0-7.6 2.2-7.6 5v1.2h15.2V19c0-2.8-3.4-5-7.6-5Z" />
            </svg>
          </summary>

          <div class="dropdown-panel account-panel">
            <template v-if="isLoggedIn">
              <div class="account-summary-card">
                <img
                  v-if="userAvatarUrl"
                  :src="userAvatarUrl"
                  alt="เน€เธเธเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ…เน€เธย"
                  class="account-avatar account-avatar-image"
                />
                <div v-else class="account-avatar" aria-hidden="true">
                  {{ userDisplayName.slice(0, 1).toUpperCase() }}
                </div>
                <div class="account-summary-copy">
                  <strong>{{ userDisplayName }}</strong>
                  <span>{{ userMeta }}</span>
                  <small class="account-membership">{{ membershipLabel }}</small>
                </div>
                <button class="logout-chip" type="button" @click="logout">เน€เธเธเน€เธเธเน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธย</button>
              </div>

              <div class="wallet-row">
                <div class="wallet-balance">
                  <span class="wallet-label">Coin</span>
                  <strong>{{ walletBalance.toFixed(2) }}</strong>
                </div>
                <router-link class="wallet-link" to="/coin-wallet" @click="closeFloatingMenus">
                  เน€เธโฌเน€เธโ€ขเน€เธเธ”เน€เธเธ Coin
                </router-link>
              </div>

              <section v-if="accountQuickLinks.length" class="account-shortcuts">
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
                <router-link class="guest-auth-link" to="/login">เน€เธโฌเน€เธยเน€เธยเน€เธเธ’เน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธย</router-link>
                <span>/</span>
                <router-link class="guest-auth-link" to="/register">เน€เธเธเน€เธเธเน€เธเธ‘เน€เธยเน€เธเธเน€เธเธเน€เธเธเน€เธเธ’เน€เธยเน€เธเธ”เน€เธย</router-link>
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
        <input v-model="search" type="search" placeholder="เน€เธยเน€เธยเน€เธยเน€เธเธเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ‘เน€เธยเน€เธเธเน€เธเธ—เน€เธเธ" aria-label="เน€เธยเน€เธยเน€เธยเน€เธเธเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ‘เน€เธยเน€เธเธเน€เธเธ—เน€เธเธ" />
        <button class="search-close" type="button" aria-label="เน€เธยเน€เธเธ”เน€เธโ€เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธเน€เธเธ’" @click="closeSearch">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
          </svg>
        </button>
      </div>
    </form>

    <div v-if="isMenuOpen" class="mobile-backdrop" aria-hidden="true" @click="closeMenu"></div>

    <div id="mobile-menu" class="mobile-panel" :class="{ open: isMenuOpen }">
      <div class="mobile-panel-header">
        <button class="mobile-close" type="button" aria-label="เน€เธยเน€เธเธ”เน€เธโ€เน€เธโฌเน€เธเธเน€เธยเน€เธเธ" @click="closeMenu">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
          </svg>
        </button>
        <img class="mobile-panel-logo" :src="logoUrl" alt="Read and Voice" />
      </div>

      <section class="mobile-group mobile-card">
        <h3>เน€เธโฌเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธเธ…เน€เธเธ‘เน€เธย</h3>
        <router-link v-for="item in mainNavItems" :key="item.to" :to="item.to" @click="closeMenu">
          {{ item.label }}
        </router-link>
      </section>

      <section class="mobile-group mobile-card mobile-cta-group">
        <router-link class="subscription-link mobile-pill-link" to="/subscription-plans" @click="closeMenu">
          เน€เธเธเน€เธเธเน€เธเธ‘เน€เธยเน€เธเธเน€เธเธเน€เธเธ’เน€เธเธเน€เธโฌเน€เธโ€เน€เธเธ—เน€เธเธเน€เธย
        </router-link>
        <router-link class="coin-link mobile-pill-link" to="/coin-wallet" @click="closeMenu">
          <span class="coin-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8.5" class="coin-face" />
              <circle cx="12" cy="12" r="5.4" class="coin-core" />
              <ellipse cx="9.2" cy="8.4" rx="2.2" ry="1.5" class="coin-shine" />
            </svg>
          </span>
          เน€เธโฌเน€เธโ€ขเน€เธเธ”เน€เธเธ Coin
        </router-link>
        <button class="accessibility-link mobile-pill-link" type="button" @click="openAccessibilityPanel">
          การเข้าถึง
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
.subscription-link, .coin-link, .accessibility-link { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 999px; font-weight: 900; white-space: nowrap; }
.subscription-link { padding: 0 18px; background: linear-gradient(135deg, #15b8c7, #0ea5a8); color: #fff; }
.coin-link { gap: 10px; padding: 0 22px; background: linear-gradient(180deg, #ff9d10 0%, #f28a00 100%); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 10px rgba(200, 112, 0, 0.18); }
.accessibility-link { padding: 0 18px; border: 1px solid rgba(15,118,110,0.16); background: rgba(255,255,255,0.82); color: #0f766e; cursor: pointer; }
.coin-mark { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: radial-gradient(circle at 35% 35%, #ffe48a 0%, #ffc933 45%, #e59a00 100%); box-shadow: inset 0 1px 1px rgba(255,255,255,0.42), 0 1px 2px rgba(181, 118, 0, 0.3); }
.coin-mark svg { width: 16px; height: 16px; filter: drop-shadow(0 1px 0 rgba(181, 118, 0, 0.18)); }
.coin-face { fill: #ffd24d; }
.coin-core { fill: #f6b301; }
.coin-shine { fill: rgba(255, 245, 186, 0.52); }
.top-actions { display: flex; align-items: center; gap: 12px; }
.icon-button, .notification-button, .avatar-button, .mobile-close, .search-close { display: inline-grid; place-items: center; width: 42px; height: 42px; border: 1px solid rgba(15,118,110,0.16); border-radius: 999px; background: rgba(255,255,255,0.72); color: #0f172a; cursor: pointer; }
.icon-button svg, .notification-button svg, .avatar-button svg, .mobile-close svg, .search-close svg { width: 20px; height: 20px; fill: currentColor; stroke: currentColor; stroke-width: 1.2; }
.menu-toggle { display: none; }
.icon-dropdown { position: relative; }
.icon-dropdown summary { list-style: none; }
.icon-dropdown summary::-webkit-details-marker { display: none; }
.dropdown-panel, .notification-panel { position: absolute; top: calc(100% + 10px); right: 0; width: min(92vw, 340px); border: 1px solid rgba(15,118,110,0.12); border-radius: 20px; background: #fff; box-shadow: 0 20px 48px rgba(15,23,42,0.16); padding: 18px; }
.theme-panel { display: grid; gap: 8px; }
.theme-panel button, .account-btn { min-height: 42px; border: 0; border-radius: 12px; background: #e8f8f6; color: #0f766e; cursor: pointer; font-weight: 900; }
.theme-panel button.active { background: #0f766e; color: #fff; }
.notification-wrapper { position: relative; }
.notification-button { position: relative; }
.notification-badge { position: absolute; top: -4px; right: -2px; min-width: 20px; height: 20px; border-radius: 999px; background: #ef4444; color: #fff; font-size: 11px; font-weight: 900; display: grid; place-items: center; padding: 0 4px; }
.notification-panel__header, .notification-panel__actions, .guest-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.notification-panel__header h3, .mobile-group h3 { margin: 0; }
.notification-list { display: grid; gap: 12px; margin-top: 14px; }
.notification-item { display: grid; grid-template-columns: 40px 1fr 32px; gap: 12px; align-items: start; border: 1px solid #ecf1f1; border-radius: 14px; padding: 12px; }
.notification-item.unread { background: #f2fffc; }
.notification-thumb { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: #fff; font-size: 12px; font-weight: 900; }
.tone-sale { background: #f59e0b; } .tone-serial { background: #0ea5e9; } .tone-writer { background: #8b5cf6; }
.notification-copy h4, .notification-copy p, .notification-copy time { margin: 0; }
.notification-copy p { margin-top: 4px; color: #475569; font-size: 13px; line-height: 1.5; }
.notification-copy time { display: block; margin-top: 6px; color: #64748b; font-size: 12px; }
.notification-open { min-height: 34px; border: 0; border-radius: 10px; background: #e8f8f6; color: #0f766e; cursor: pointer; font-weight: 800; padding: 0 10px; }
.notification-empty { margin: 8px 0 0; color: #64748b; }
.notification-footer-link { display: inline-flex; margin-top: 12px; color: #0f766e; font-weight: 800; text-decoration: none; }
.account-panel { display: grid; gap: 14px; width: min(92vw, 300px); padding: 16px; }
.account-summary-card { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
.account-avatar { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 999px; background: linear-gradient(135deg, #e5e7eb, #cbd5e1); color: #475569; font-size: 20px; font-weight: 900; }
.account-avatar-image { object-fit: cover; border: 1px solid rgba(15,118,110,0.12); }
.account-summary-copy { display: grid; gap: 2px; min-width: 0; }
.account-summary-copy strong { color: #1f2937; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.account-summary-copy span { color: #64748b; font-size: 12px; }
.account-membership { color: #0f766e; font-size: 12px; font-weight: 700; }
.logout-chip { min-height: 36px; border: 1px solid #ef4444; border-radius: 999px; background: #fff; color: #ef4444; cursor: pointer; font-size: 12px; font-weight: 800; padding: 0 12px; }
.wallet-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
.wallet-balance { display: flex; align-items: center; gap: 8px; }
.wallet-label { color: #1f2937; font-size: 14px; }
.wallet-balance strong { color: #f59e0b; font-size: 15px; }
.wallet-link { color: #64748b; font-size: 14px; font-weight: 700; text-decoration: none; }
.account-shortcuts, .account-section { display: grid; gap: 10px; }
.account-shortcuts { padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
.account-accordion { border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; }
.account-accordion:last-of-type { border-bottom: 0; padding-bottom: 0; }
.account-accordion summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; list-style: none; color: #111827; font-size: 16px; font-weight: 800; }
.account-accordion summary::-webkit-details-marker { display: none; }
.account-accordion summary svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; transition: transform 0.18s ease; }
.account-accordion[open] summary svg { transform: rotate(180deg); }
.account-section { padding-top: 10px; }
.account-link, .guest-auth-link, .mobile-group a { color: #1f2937; font-weight: 500; text-decoration: none; }
.account-link:hover, .wallet-link:hover, .guest-auth-link:hover { color: #0f766e; }
.search-overlay { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; padding: 18px; background: rgba(230,255,251,0.92); }
.search-overlay.open { display: flex; }
.search-box { display: grid; grid-template-columns: 24px 1fr 42px; align-items: center; gap: 12px; width: min(720px,100%); padding: 10px 12px; border-radius: 18px; background: #fff; box-shadow: 0 16px 40px rgba(15,23,42,0.12); }
.search-box input { width: 100%; border: 0; outline: 0; background: transparent; font-size: 16px; }
.mobile-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.18); }
.mobile-panel { position: absolute; top: calc(100% + 10px); left: 12px; width: min(calc(100vw - 24px), 420px); display: grid; gap: 16px; border: 1px solid rgba(15,118,110,0.12); border-radius: 24px; background: rgba(255,255,255,0.98); box-shadow: 0 24px 54px rgba(15,23,42,0.16); padding: 18px; opacity: 0; transform: translateY(-10px); pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease; z-index: 60; }
.mobile-panel.open { opacity: 1; transform: translateY(0); pointer-events: auto; }
.mobile-panel-header, .mobile-group { margin-bottom: 0; }
.mobile-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.mobile-panel-logo { width: 132px; height: auto; }
.mobile-group { display: grid; gap: 10px; }
.mobile-card { padding: 16px; border-radius: 18px; background: #f8fbfb; }
.mobile-group h3 { color: #64748b; font-size: 13px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.mobile-group a { padding: 6px 0; color: #1f2937; font-size: 16px; font-weight: 700; }
.mobile-cta-group { display: none; grid-template-columns: 1fr 1fr; gap: 10px; background: transparent; padding: 0; }
.mobile-pill-link { width: 100%; justify-content: center; }
@media (max-width: 1100px) { .top-bar { grid-template-columns: 1fr auto; } .desktop-public-nav { display: none; } .menu-toggle { display: inline-grid; } }
@media (max-width: 780px) { .top-bar { gap: 16px; padding: 12px 16px; } .left-cluster { gap: 10px; } .subscription-link, .coin-link, .accessibility-link { display: none; } .brand-logo { width: 164px; transform: scale(1.3); } .mobile-panel { left: 8px; width: calc(100vw - 16px); } .mobile-cta-group { display: grid; grid-template-columns: 1fr; } .mobile-pill-link.accessibility-link { display: inline-flex; } }
</style>
