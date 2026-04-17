export const getToken = () => {
  return localStorage.getItem("token") || "";
};

export const getUser = () => {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
};

export const getAuthHeaders = () => {
  const token = getToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};