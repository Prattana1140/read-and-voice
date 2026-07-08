import type { Router } from "vue-router";
import type { AuthUser } from "./auth";

export const redirectAfterLogin = (router: Router, user: AuthUser) => {
  if (user.role === "admin" || user.role === "superadmin") {
    return router.push("/admin");
  }

  if (user.role === "writer") {
    return router.push("/writer");
  }

  return router.push("/");
};
