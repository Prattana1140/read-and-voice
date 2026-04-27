import type { Router } from "vue-router";
import type { AuthUser } from "./auth";
import { enableVisualAssistPreset } from "./accessibility";

export const redirectAfterLogin = (router: Router, user: AuthUser) => {
  if (user.visual_impairment_verified) {
    enableVisualAssistPreset();
    return router.push("/accessible-home");
  }

  if (user.role === "admin" || user.role === "superadmin") {
    return router.push("/admin");
  }

  if (user.role === "writer") {
    return router.push("/writer");
  }

  return router.push("/");
};
