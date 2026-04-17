import type { Router } from "vue-router";
import { api } from "./api";
import { saveAuth } from "./auth";
import { redirectAfterLogin } from "./loginRedirect";

export type SocialProvider = "facebook" | "line" | "apple" | "google";

const providerNames: Record<SocialProvider, string> = {
  facebook: "Facebook",
  line: "LINE",
  apple: "Apple",
  google: "Google",
};

export const loginWithSocialProvider = async (
  router: Router,
  provider: SocialProvider
) => {
  const providerName = providerNames[provider];
  const res = await api.post("/api/auth/social-login", {
    provider,
    providerId: "local-demo",
    name: `${providerName} User`,
    email: `${provider}.local-demo@read-and-voice.local`,
  });

  saveAuth(res.data.token, res.data.user);
  await redirectAfterLogin(router, res.data.user);
};
