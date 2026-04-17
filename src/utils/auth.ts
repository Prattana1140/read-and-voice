export type UserRole = "user" | "writer" | "admin" | "superadmin";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status?: string;
  provider?: string;
};

export const AUTH_CHANGED_EVENT = "read-and-voice-auth-changed";

const notifyAuthChanged = () => {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
};

export const getToken = (): string => {
  return localStorage.getItem("token") || "";
};

export const getUser = (): AuthUser | null => {
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getAuthUser = (): AuthUser | null => {
  return getUser();
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export const saveAuth = (token: string, user: AuthUser) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  notifyAuthChanged();
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  notifyAuthChanged();
};