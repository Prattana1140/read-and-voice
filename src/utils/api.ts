import axios from "axios";

// Central API helper for the frontend.
// Supports both Thai and English UI text by keeping this file in UTF-8.

const RAW_API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

export const API_BASE_URL = RAW_API_URL.replace(/\/api\/?$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const url = config.url || "";

  // Let callers use either "/books" or "/api/books".
  if (
    url &&
    !url.startsWith("/api/") &&
    !url.startsWith("http://") &&
    !url.startsWith("https://")
  ) {
    config.url = url.startsWith("/") ? `/api${url}` : `/api/${url}`;
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

export function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}
