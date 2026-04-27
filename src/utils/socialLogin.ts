import type { Router } from "vue-router";
import { API_BASE_URL } from "./api";

export type SocialProvider = "thaid";
export type LoginExperienceMode = "standard" | "visual_assist";

export const loginWithSocialProvider = async (
  _router: Router,
  provider: SocialProvider,
  mode: LoginExperienceMode = "standard",
) => {
  const params = new URLSearchParams({ mode });
  window.location.href = `${API_BASE_URL}/api/auth/oauth/${provider}/start?${params.toString()}`;
};
