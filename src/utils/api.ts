import axios from "axios";
import { AUTH_CHANGED_EVENT } from "./auth";

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

const GENERIC_SERVER_MESSAGES = new Set([
  "เกิดข้อผิดพลาดในระบบ",
  "Internal Server Error",
  "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่",
  "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่",
]);

export function getApiErrorMessage(error: unknown, fallback: string) {
  const err = error as any;
  const status = err?.response?.status;
  const data = err?.response?.data;
  const serverMessage =
    typeof data?.message === "string" ? data.message.trim() : "";
  const detail =
    typeof data?.detail === "string"
      ? data.detail.trim()
      : typeof data?.details === "string"
        ? data.details.trim()
        : typeof data?.reason === "string"
          ? data.reason.trim()
          : "";

  const rawReason = detail || serverMessage;
  const reason =
    rawReason && !GENERIC_SERVER_MESSAGES.has(rawReason)
      ? rawReason
      : status
        ? status === 400
          ? "ข้อมูลที่ส่งไม่ถูกต้องหรือยังไม่ครบ"
          : status === 401
            ? "ยังไม่ได้เข้าสู่ระบบ หรือ session หมดอายุ"
            : status === 403
              ? "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้"
              : status === 404
                ? "ไม่พบข้อมูลที่ต้องการทำรายการ"
                : status === 409
                  ? "ข้อมูลซ้ำหรือขัดแย้งกับข้อมูลเดิมในระบบ"
                  : status === 413
                    ? "ไฟล์หรือข้อมูลที่ส่งมีขนาดใหญ่เกินไป"
                    : status >= 500
                      ? "เซิร์ฟเวอร์ขัดข้องหรือฐานข้อมูลยังไม่พร้อมใช้งาน"
                      : `เซิร์ฟเวอร์ตอบกลับสถานะ ${status}`
        : err?.request
          ? "ติดต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือรอสักครู่แล้วลองใหม่"
          : err?.message
            ? err.message
            : "";

  if (!reason) {
    return fallback;
  }

  return reason.includes(fallback) ? reason : `${fallback}: ${reason}`;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
    }

    const message = getApiErrorMessage(error, "ทำรายการไม่สำเร็จ");

    if (error?.response?.data) {
      const currentMessage =
        typeof error.response.data.message === "string"
          ? error.response.data.message.trim()
          : "";

      if (!currentMessage || GENERIC_SERVER_MESSAGES.has(currentMessage)) {
        error.response.data.message = message;
      }
    } else if (error?.response) {
      error.response.data = { message };
    } else if (error) {
      error.response = { data: { message } };
    }

    return Promise.reject(error);
  },
);

export function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export function resolveAssetUrl(input?: string | null) {
  const raw = String(input || "").trim();

  if (!raw) {
    return "/no-cover.png";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const normalized = raw.replace(/\\/g, "/");
  const uploadsIndex = normalized.toLowerCase().indexOf("uploads/");
  const relativePath = uploadsIndex >= 0 ? normalized.slice(uploadsIndex) : normalized;

  return `${API_BASE_URL}/${relativePath.replace(/^\/+/, "")}`;
}
