import type { Router } from "vue-router";
import { API_BASE_URL } from "./api";

export type SocialProvider = "facebook" | "line" | "apple" | "google";

export const loginWithSocialProvider = async (
  _router: Router,
  provider: SocialProvider
) => {
  window.location.href = `${API_BASE_URL}/api/auth/oauth/${provider}/start`;
};
