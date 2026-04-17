import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

import Home from "../pages/Home.vue";
import Store from "../pages/Store.vue";
import BookDetail from "../pages/BookDetail.vue";
import ReaderPage from "../pages/ReaderPage.vue";
import MyLibrary from "../pages/MyLibrary.vue";
import Profile from "../pages/Profile.vue";
import UploadBook from "../pages/UploadBook.vue";

import AdminDashboard from "../pages/admin/Dashboard.vue";
import AdminEditBook from "../pages/admin/EditBook.vue";
import AdminUsers from "../pages/admin/AdminUsers.vue";
import AdminCategories from "../pages/admin/Categories.vue";
import AdminMembers from "../pages/admin/Members.vue";
import SuperSettings from "../pages/superadmin/Settings.vue";

import WriterDashboard from "../pages/writer/Dashboard.vue";
import WriterUpload from "../pages/writer/Upload.vue";
import WriterMyBooks from "../pages/writer/MyBooks.vue";
import WriterStats from "../pages/writer/Stats.vue";

type UserRole = "guest" | "user" | "writer" | "admin" | "superadmin";

const memberRoles: UserRole[] = ["user", "writer"];
const adminRoles: UserRole[] = ["admin", "superadmin"];
const loggedInRoles: UserRole[] = ["user", "writer", "admin", "superadmin"];

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
    path: "/book/:id",
    name: "BookDetail",
    component: BookDetail,
    props: true,
  },
  {
    path: "/reader/:id",
    name: "ReaderPage",
    component: ReaderPage,
    props: true,
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/my-library",
    name: "MyLibrary",
    component: MyLibrary,
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/wishlist",
    name: "Wishlist",
    component: () => import("../pages/Wishlist.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/cart",
    name: "Cart",
    component: () => import("../pages/Cart.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/orders/history",
    name: "OrderHistory",
    component: () => import("../pages/OrderHistory.vue"),
    meta: { requiresAuth: true, allowedRoles: memberRoles },
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
    meta: { requiresAuth: true, allowedRoles: loggedInRoles },
  },
  {
    path: "/writer",
    name: "WriterDashboard",
    component: WriterDashboard,
    meta: { requiresAuth: true, allowedRoles: ["writer"] },
  },
  {
    path: "/writer/upload",
    name: "WriterUpload",
    component: WriterUpload,
    meta: { requiresAuth: true, allowedRoles: ["writer"] },
  },
  {
    path: "/writer/books",
    name: "WriterMyBooks",
    component: WriterMyBooks,
    meta: { requiresAuth: true, allowedRoles: ["writer"] },
  },
  {
    path: "/writer/stats",
    name: "WriterStats",
    component: WriterStats,
    meta: { requiresAuth: true, allowedRoles: ["writer"] },
  },
  {
    path: "/admin",
    name: "AdminDashboard",
    component: AdminDashboard,
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/book/:id/edit",
    name: "AdminEditBook",
    component: AdminEditBook,
    props: true,
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/categories",
    name: "AdminCategories",
    component: AdminCategories,
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/members",
    name: "AdminMembers",
    component: AdminMembers,
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/upload-book",
    name: "UploadBook",
    component: UploadBook,
    meta: { requiresAuth: true, allowedRoles: adminRoles },
  },
  {
    path: "/admin/users",
    name: "AdminUsers",
    component: AdminUsers,
    meta: { requiresAuth: true, allowedRoles: ["superadmin"] },
  },
  {
    path: "/superadmin/settings",
    name: "SuperSettings",
    component: SuperSettings,
    meta: { requiresAuth: true, allowedRoles: ["superadmin"] },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("../pages/Login.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/login/facebook",
    name: "FacebookLogin",
    component: () => import("../pages/FacebookLogin.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/login/line",
    name: "LineLogin",
    component: () => import("../pages/LineLogin.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/login/apple",
    name: "AppleLogin",
    component: () => import("../pages/AppleLogin.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/login/google",
    name: "GoogleLogin",
    component: () => import("../pages/GoogleLogin.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/login/account",
    name: "AccountLogin",
    component: () => import("../pages/AccountLogin.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/oauth/callback",
    name: "OAuthCallback",
    component: () => import("../pages/OAuthCallback.vue"),
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("../pages/Register.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: UserRole;
} | null;

function getStoredUser(): StoredUser {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

router.beforeEach((to, _from, next) => {
  const user = getStoredUser();
  const token = localStorage.getItem("token");
  const isLoggedIn = !!user && !!token;
  const role: UserRole = isLoggedIn ? user?.role || "user" : "guest";

  if (to.meta.requiresAuth && !isLoggedIn) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    return next("/login");
  }

  const allowedRoles = to.meta.allowedRoles as UserRole[] | undefined;
  if (allowedRoles && !allowedRoles.includes(role)) {
    alert("คุณไม่มีสิทธิ์เข้าหน้านี้");
    return next("/");
  }

  if (to.meta.guestOnly && isLoggedIn) {
    return next("/");
  }

  next();
});

export default router;
