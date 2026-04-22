<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from "vue-router";

type TrailItem = {
  fullPath: string;
  label: string;
};

const route = useRoute();
const router = useRouter();

const homeItem: TrailItem = { fullPath: "/", label: "Home" };

const routeLabels: Record<string, string> = {
  Home: "Home",
  Store: "Store",
  Serials: "Serials",
  BookDetail: "Book detail",
  BestSellers: "Best sellers",
  NewReleases: "New releases",
  Promotions: "Promotions",
  FreeBooks: "Free books",
  HallOfFame: "Hall of fame",
  Recommended: "Recommended",
  SubscriptionPlans: "Pinto VIP",
  CoinWallet: "Coin wallet",
  ReaderPage: "Reader",
  MyLibrary: "My library",
  WishList: "Wishlist",
  Cart: "Cart",
  OrderHistory: "Order history",
  Profile: "Profile",
  AccountFollowing: "Following",
  AccountGiftCodes: "Gift Code",
  AccountBuffet: "My Buffet",
  AccountDevices: "My devices",
  AccountBenefits: "Benefits",
  AccountReviews: "My reviews",
  AccountAgeVerification: "Age verification",
  WriterDashboard: "Writer",
  WriterBooks: "Writer books",
  WriterUpload: "Add work",
  WriterEditBook: "Edit book",
  WriterStats: "Writer stats",
  AdminDashboard: "Admin",
  AdminBooks: "Manage books",
  AdminPageContent: "Manage pages",
  AdminEditBook: "Edit book",
  UploadBook: "Upload book",
  AdminCategories: "Manage categories",
  AdminMembers: "Manage members",
  SuperAdminRoles: "Manage roles",
  SuperAdminUsers: "Manage users",
  SuperAdminSettings: "System settings",
};

const parentRoutes: Record<string, TrailItem> = {
  AccountFollowing: { fullPath: "/profile", label: "Profile" },
  AccountGiftCodes: { fullPath: "/profile", label: "Profile" },
  AccountBuffet: { fullPath: "/profile", label: "Profile" },
  AccountDevices: { fullPath: "/profile", label: "Profile" },
  AccountBenefits: { fullPath: "/profile", label: "Profile" },
  AccountReviews: { fullPath: "/profile", label: "Profile" },
  AccountAgeVerification: { fullPath: "/profile", label: "Profile" },
  WriterBooks: { fullPath: "/writer", label: "Writer" },
  WriterUpload: { fullPath: "/writer", label: "Writer" },
  WriterEditBook: { fullPath: "/writer/books", label: "Writer books" },
  WriterStats: { fullPath: "/writer", label: "Writer" },
  AdminBooks: { fullPath: "/admin", label: "Admin" },
  AdminPageContent: { fullPath: "/admin", label: "Admin" },
  AdminEditBook: { fullPath: "/admin/books", label: "Manage books" },
  UploadBook: { fullPath: "/admin", label: "Admin" },
  AdminCategories: { fullPath: "/admin", label: "Admin" },
  AdminMembers: { fullPath: "/admin", label: "Admin" },
  SuperAdminRoles: { fullPath: "/superadmin/users", label: "Manage users" },
  SuperAdminSettings: { fullPath: "/superadmin/users", label: "Manage users" },
};

function fallbackLabel(currentRoute: RouteLocationNormalizedLoaded) {
  const segment = currentRoute.path.split("/").filter(Boolean).at(-1);
  if (!segment) return homeItem.label;
  if (/^\d+$/.test(segment)) return "Detail";
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
      ? "Login"
      : name === "AccountLogin"
        ? "Login"
        : name === "LineLogin"
          ? "LINE login"
          : name === "FacebookLogin"
            ? "Facebook login"
            : name === "Register"
              ? "Register"
              : name === "ForgotPassword"
                ? "Forgot password"
                : name === "OAuthCallback"
                  ? "Login"
                  : fallbackLabel(currentRoute));
  const id = currentRoute.params.id;

  if (
    (name === "BookDetail" ||
      name === "ReaderPage" ||
      name === "AdminEditBook" ||
      name === "WriterEditBook") &&
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

const visibleTrail = computed(() => {
  if (route.path === "/") {
    return [homeItem];
  }

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
  <nav v-if="shouldShowTrail" class="navigation-trail" aria-label="Visited pages">
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
