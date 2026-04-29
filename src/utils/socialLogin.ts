import type { Router } from "vue-router";
import { API_BASE_URL } from "./api";

export type SocialProvider = "thaid" | "line" | "facebook";

export type LoginExperienceMode = "standard" | "visual_assist";

export const loginWithSocialProvider = async (
  _router: Router,
  provider: SocialProvider,
  mode: LoginExperienceMode = "standard",
) => {
  const params = new URLSearchParams({ mode });
  const baseUrl = API_BASE_URL.replace(/\/$/, "");

  window.location.href = `${baseUrl}/api/auth/oauth/${provider}/start?${params.toString()}`;
};
