import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

import Home from "../pages/Home.vue";
import Store from "../pages/Store.vue";
import BookDetail from "../pages/BookDetail.vue";
import ReaderPage from "../pages/ReaderPage.vue";
import ReaderListenPage from "../pages/ReaderListenPage.vue";

import Login from "../pages/Login.vue";
import Register from "../pages/Register.vue";
import AccountLogin from "../pages/AccountLogin.vue";
import OAuthCallback from "../pages/OAuthCallback.vue";
import AccessibleHome from "../pages/AccessibleHome.vue";
import LineLogin from "../pages/LineLogin.vue";

import MyLibrary from "../pages/MyLibrary.vue";
import Cart from "../pages/Cart.vue";
import OrderHistory from "../pages/OrderHistory.vue";
import Profile from "../pages/Profile.vue";

import AdminDashboard from "../pages/admin/Dashboard.vue";
import AdminEditBook from "../pages/admin/EditBook.vue";

import UploadBook from "../pages/UploadBook.vue";
import SubscriptionPlans from "../pages/SubscriptionPlans.vue";
import CoinWallet from "../pages/CoinWallet.vue";

import { getAuthUser, isAuthenticated, type AuthUser } from "../utils/auth";

type UserRole = "user" | "writer" | "admin" | "superadmin";

const memberRoles: UserRole[] = ["user", "writer", "admin", "superadmin"];
const writerRoles: UserRole[] = ["writer"];
const uploaderRoles: UserRole[] = ["writer", "admin", "superadmin"];
const adminRoles: UserRole[] = ["admin", "superadmin"];
const superAdminRoles: UserRole[] = ["superadmin"];

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/store",
    name: "Store",
    component: Store,
  },
  {
    path: "/search",
    name: "Search",
    component: () => import("../pages/SearchPage.vue"),
  },
  {
    path: "/ebooks",
    redirect: "/store",
  },
  {
    path: "/serials",
    name: "Serials",
    component: () => import("../pages/Serials.vue"),
  },
  {
    path: "/book/:id",
    name: "BookDetail",
    component: BookDetail,
    props: true,
  },
  {
    path: "/best-sellers",
    name: "BestSellers",
    component: () => import("../pages/ShelfPage.vue"),
  },
  {
    path: "/new-releases",
    name: "NewReleases",
    component: () => import("../pages/ShelfPage.vue"),
  },
  {
    path: "/promotions",
    name: "Promotions",
    component: () => import("../pages/ShelfPage.vue"),
  },
  {
    path: "/free-books",
    name: "FreeBooks",
    component: () => import("../pages/ShelfPage.vue"),
  },
  {
    path: "/hall-of-fame",
    name: "HallOfFame",
    component: () => import("../pages/ShelfPage.vue"),
  },
  {
    path: "/recommended",
    name: "Recommended",
    component: () => import("../pages/ShelfPage.vue"),
  },
  {
    path: "/terms",
    name: "Terms",
    component: () => import("../pages/Terms.vue"),
  },
  {
    path: "/privacy-policy",
    name: "PrivacyPolicy",
    component: () => import("../pages/PrivacyPolicy.vue"),
  },
  {
    path: "/data-privacy",
    name: "DataPrivacy",
    component: () => import("../pages/DataPrivacy.vue"),
  },
  {
    path: "/support",
    name: "Support",
    component: () => import("../pages/HelpSupport.vue"),
  },
  {
    path: "/contact",
    name: "Contact",
    redirect: "/support",
  },
  {
    path: "/report",
    name: "ReportIssue",
    redirect: "/support",
  },
  {
    path: "/categories",
    name: "CategoryIndex",
    component: () => import("../pages/DiscoveryPage.vue"),
  },
  {
    path: "/categories/:name",
    name: "CategoryDetail",
    component: () => import("../pages/DiscoveryPage.vue"),
  },
  {
    path: "/tags",
    name: "TagIndex",
    component: () => import("../pages/DiscoveryPage.vue"),
  },
  {
    path: "/tags/:name",
    name: "TagDetail",
    component: () => import("../pages/DiscoveryPage.vue"),
  },
  {
    path: "/publishers",
    name: "PublisherIndex",
    component: () => import("../pages/DiscoveryPage.vue"),
  },
  {
    path: "/publishers/:name",
    name: "PublisherDetail",
    component: () => import("../pages/DiscoveryPage.vue"),
  },
  {
    path: "/authors",
    name: "AuthorIndex",
    component: () => import("../pages/DiscoveryPage.vue"),
  },
  {
    path: "/authors/:name",
    name: "AuthorDetail",
    component: () => import("../pages/DiscoveryPage.vue"),
  },
  {
    path: "/subscription-plans",
    name: "SubscriptionPlans",
    component: SubscriptionPlans,
  },
  {
    path: "/subscription",
    redirect: "/subscription-plans",
  },
  {
    path: "/coin-wallet",
    name: "CoinWallet",
    component: CoinWallet,
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { guestOnly: true },
  },
  {
    path: "/login/account",
    name: "AccountLogin",
    component: AccountLogin,
    meta: { guestOnly: true },
  },
  {
    path: "/login/line",
    name: "LineLogin",
    component: LineLogin,
    meta: { guestOnly: true },
  },
  {
    path: "/oauth/callback",
    name: "OAuthCallback",
    component: OAuthCallback,
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
    meta: { guestOnly: true },
  },
  {
    path: "/accessible-home",
    name: "AccessibleHome",
    component: AccessibleHome,
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: () => import("../pages/ForgotPassword.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/reader/:id",
    name: "ReaderPage",
    component: ReaderPage,
    props: true,
  },
  {
    path: "/reader/:id/listen",
    name: "ReaderListenPage",
    component: ReaderListenPage,
    props: true,
  },
  {
    path: "/my-library",
    name: "MyLibrary",
    component: MyLibrary,
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/cart",
    name: "Cart",
    component: Cart,
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/orders/history",
    name: "OrderHistory",
    component: OrderHistory,
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/notification-settings",
    name: "NotificationSettings",
    component: () => import("../pages/NotificationSettings.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/account/notifications",
    name: "AccountNotifications",
    component: () => import("../pages/account/Notifications.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/account/following",
    name: "AccountFollowing",
    component: () => import("../pages/account/Following.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/account/gift-codes",
    name: "AccountGiftCodes",
    component: () => import("../pages/account/GiftCodes.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/account/buffet",
    name: "AccountBuffet",
    component: () => import("../pages/account/Buffet.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/account/devices",
    name: "AccountDevices",
    component: () => import("../pages/account/Devices.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/account/benefits",
    name: "AccountBenefits",
    component: () => import("../pages/account/Benefits.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/account/reviews",
    name: "AccountReviews",
    component: () => import("../pages/account/Reviews.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/account/age-verification",
    name: "AccountAgeVerification",
    component: () => import("../pages/account/AgeVerification.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/writer",
    name: "WriterDashboard",
    component: () => import("../pages/writer/Dashboard.vue"),
    meta: { requiresAuth: true, allowedRoles: writerRoles },
  },
  {
    path: "/writer/profile",
    name: "WriterProfileSettings",
    component: () => import("../pages/writer/ProfileSettings.vue"),
    meta: { requiresAuth: true, allowedRoles: writerRoles },
  },
  {
    path: "/writer/books",
    name: "WriterBooks",
    component: () => import("../pages/writer/WriterBooks.vue"),
    meta: { requiresAuth: true, allowedRoles: writerRoles },
  },
  {
    path: "/writer/upload",
    name: "WriterUpload",
    component: () => import("../pages/writer/Upload.vue"),
    meta: { requiresAuth: true, allowedRoles: uploaderRoles },
  },
  {
    path: "/writer/books/:id/edit",
    name: "WriterEditBook",
    component: () => import("../pages/writer/EditBook.vue"),
    meta: { requiresAuth: true, allowedRoles: writerRoles },
  },
  {
    path: "/writer/stats",
    name: "WriterStats",
    component: () => import("../pages/writer/Stats.vue"),
    meta: { requiresAuth: true, allowedRoles: writerRoles },
  },
  {
    path: "/writers/:slug",
    name: "WriterPublicProfile",
    component: () => import("../pages/writer/PublicProfile.vue"),
    props: true,
  },
  {
    path: "/admin",
    name: "AdminDashboard",
    component: AdminDashboard,
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/books",
    name: "AdminBooks",
    component: () => import("../pages/admin/Books.vue"),
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/approvals",
    name: "AdminApprovals",
    component: () => import("../pages/admin/Approvals.vue"),
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/coin-topups",
    name: "AdminCoinTopups",
    redirect: { path: "/admin/payments", query: { type: "coin_topup" } },
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/order-payments",
    name: "AdminOrderPayments",
    redirect: { path: "/admin/payments", query: { type: "order" } },
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/subscription-payments",
    name: "AdminSubscriptionPayments",
    redirect: { path: "/admin/payments", query: { type: "subscription" } },
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/payments",
    name: "AdminPayments",
    component: () => import("../pages/admin/Payments.vue"),
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/password-resets",
    name: "AdminPasswordResets",
    component: () => import("../pages/admin/PasswordResets.vue"),
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/support-tickets",
    name: "AdminSupportTickets",
    component: () => import("../pages/admin/SupportTickets.vue"),
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/system-data",
    name: "AdminSystemData",
    component: () => import("../pages/admin/SystemData.vue"),
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/page-content",
    name: "AdminPageContent",
    component: () => import("../pages/admin/PageContentManager.vue"),
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/books/edit/:id",
    name: "AdminEditBook",
    component: AdminEditBook,
    props: true,
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/upload-book",
    name: "UploadBook",
    component: UploadBook,
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/categories",
    name: "AdminCategories",
    component: () => import("../pages/admin/Categories.vue"),
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/members",
    name: "AdminMembers",
    component: () => import("../pages/admin/Members.vue"),
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/superadmin",
    name: "SuperAdminDashboard",
    component: () => import("../pages/superadmin/Dashboard.vue"),
    meta: { requiresAuth: true, allowedRoles: superAdminRoles },
  },
  {
    path: "/superadmin/roles",
    name: "SuperAdminRoles",
    redirect: "/superadmin/users",
    meta: { requiresAuth: true, allowedRoles: superAdminRoles },
  },
  {
    path: "/superadmin/users",
    name: "SuperAdminUsers",
    component: () => import("../pages/superadmin/Users.vue"),
    meta: { requiresAuth: true, allowedRoles: superAdminRoles },
  },
  {
    path: "/superadmin/settings",
    name: "SuperAdminSettings",
    component: () => import("../pages/superadmin/Settings.vue"),
    meta: { requiresAuth: true, allowedRoles: superAdminRoles },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../pages/NotFound.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const isLoggedIn = isAuthenticated();
  const user = getAuthUser() as AuthUser | null;
  const role = user?.role as UserRole | undefined;

  if (to.meta.guestOnly && isLoggedIn) {
    if (role === "writer") return next("/writer");
    if (role === "admin") return next("/admin");
    if (role === "superadmin") return next("/superadmin");
    return next("/");
  }

  if (to.meta.requiresAuth) {
    if (!isLoggedIn || !role) {
      alert("กรุณาเข้าสู่ระบบก่อน");
      return next("/login");
    }

    const allowedRoles = to.meta.allowedRoles as UserRole[] | undefined;

    if (allowedRoles && !allowedRoles.includes(role)) {
      alert("คุณไม่มีสิทธิ์เข้าหน้านี้");

      if (role === "writer") return next("/writer");
      if (role === "admin") return next("/admin");
      if (role === "superadmin") return next("/superadmin");

      return next("/");
    }
  }

  next();
});

export default router;

