import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

import Home from "../pages/Home.vue";
import Store from "../pages/Store.vue";
import BookDetail from "../pages/BookDetail.vue";
import ReaderPage from "../pages/ReaderPage.vue";

import Login from "../pages/Login.vue";
import Register from "../pages/Register.vue";
import AccountLogin from "../pages/AccountLogin.vue";
import LineLogin from "../pages/LineLogin.vue";
import FacebookLogin from "../pages/FacebookLogin.vue";
import OAuthCallback from "../pages/OAuthCallback.vue";

import MyLibrary from "../pages/MyLibrary.vue";
import WishList from "../pages/WishList.vue";
import Cart from "../pages/Cart.vue";
import OrderHistory from "../pages/OrderHistory.vue";
import Profile from "../pages/Profile.vue";

import UploadBook from "../pages/UploadBook.vue";

import AdminDashboard from "../pages/admin/Dashboard.vue";
import AdminEditBook from "../pages/admin/EditBook.vue";

import { getAuthUser, isAuthenticated, type AuthUser } from "../utils/auth";

type UserRole = "user" | "writer" | "admin" | "superadmin";

const memberRoles: UserRole[] = ["user", "writer", "admin", "superadmin"];
const writerRoles: UserRole[] = ["writer"];
const adminRoles: UserRole[] = ["admin", "superadmin"];
const loggedInRoles: UserRole[] = ["user", "writer", "admin", "superadmin"];

const routes: RouteRecordRaw[] = [
  // public
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
    path: "/terms",
    name: "Terms",
    component: () => import("../pages/Terms.vue"),
  },
  {
    path: "/privacy-policy",
    name: "PrivacyPolicy",
    component: () => import("../pages/PrivacyPolicy.vue"),
  },

  // auth
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
    path: "/login/facebook",
    name: "FacebookLogin",
    component: FacebookLogin,
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

  // member
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
    name: "WishList",
    component: WishList,
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
    meta: { requiresAuth: true, allowedRoles: loggedInRoles },
  },

  // writer
  {
    path: "/writer",
    name: "WriterDashboard",
    component: () => import("../pages/writer/Dashboard.vue"),
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
    meta: { requiresAuth: true, allowedRoles: writerRoles },
  },

  // admin
  {
    path: "/admin",
    name: "AdminDashboard",
    component: AdminDashboard,
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

  // superadmin
  {
    path: "/superadmin/roles",
    name: "SuperAdminRoles",
    component: () => import("../pages/superadmin/Roles.vue"),
    meta: { requiresAuth: true, allowedRoles: ["superadmin"] },
  },
  {
    path: "/superadmin/users",
    name: "SuperAdminUsers",
    component: () => import("../pages/superadmin/Users.vue"),
    meta: { requiresAuth: true, allowedRoles: ["superadmin"] },
  },

  // fallback
  {
    path: "/:pathMatch(.*)*",
    name: "NotFoundRedirect",
    redirect: "/",
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

  // ถ้าล็อกอินแล้ว ห้ามเข้าหน้า guestOnly
  if (to.meta.guestOnly && isLoggedIn) {
    if (role === "writer") return next("/writer");
    if (role === "admin") return next("/admin");
    if (role === "superadmin") return next("/superadmin/roles");
    return next("/");
  }

  // ถ้าหน้าที่ต้องล็อกอินก่อน
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
      if (role === "superadmin") return next("/superadmin/roles");
      return next("/");
    }
  }

  next();
});

export default router;