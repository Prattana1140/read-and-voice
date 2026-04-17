import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

import UploadBook from "../pages/UploadBook.vue";
import Home from "../pages/Home.vue";
import Store from "../pages/Store.vue";
import BookDetail from "../pages/BookDetail.vue";
import ReaderPage from "../pages/ReaderPage.vue";
import MyLibrary from "../pages/MyLibrary.vue";

import AdminDashboard from "../pages/admin/Dashboard.vue";
import AdminEditBook from "../pages/admin/EditBook.vue";
import AdminUsers from "../pages/admin/AdminUsers.vue";
import WriterDashboard from "../pages/writer/Dashboard.vue";

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
    meta: { requiresAuth: true },
  },
  {
    path: "/my-library",
    name: "MyLibrary",
    component: MyLibrary,
    meta: { requiresAuth: true },
  },
  {
    path: "/upload-book",
    name: "UploadBook",
    component: UploadBook,
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin",
    name: "AdminDashboard",
    component: AdminDashboard,
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/book/:id/edit",
    name: "AdminEditBook",
    component: AdminEditBook,
    props: true,
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/users",
    name: "AdminUsers",
    component: AdminUsers,
    meta: { requiresAdmin: true },
  },
  {
    path: "/writer",
    name: "WriterDashboard",
    component: WriterDashboard,
    meta: { requiresAuth: true },
  },
  {
    path: "/wishlist",
    name: "Wishlist",
    component: () => import("../pages/Wishlist.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/cart",
    name: "Cart",
    component: () => import("../pages/Cart.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/orders/history",
    name: "OrderHistory",
    component: () => import("../pages/OrderHistory.vue"),
    meta: { requiresAuth: true },
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
  role?: string;
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
  const isAdmin =
    isLoggedIn && (user.role === "admin" || user.role === "superadmin");
  const isSuperAdmin = isLoggedIn && user.role === "superadmin";

  // หน้า admin/users ให้เข้าได้เฉพาะ superadmin
  if (to.path.startsWith("/admin/users") && !isSuperAdmin) {
    alert("เฉพาะ superadmin เท่านั้น");
    return next("/");
  }

  // หน้า admin อื่น ๆ ให้ admin และ superadmin เข้าได้
  if (to.meta.requiresAdmin && !isAdmin) {
    alert("เฉพาะ admin เท่านั้น");
    return next("/");
  }

  // หน้าที่ต้อง login ก่อน
  if (to.meta.requiresAuth && !isLoggedIn) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    return next("/login");
  }

  // หน้า login/register ถ้า login แล้วไม่ต้องเข้า
  if (to.meta.guestOnly && isLoggedIn) {
    return next("/");
  }

  next();
});

export default router;
