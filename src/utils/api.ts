import { AUTH_CHANGED_EVENT } from "./auth";

// Central API helper for the frontend.
// Supports both Thai and English UI text by keeping this file in UTF-8.

const RAW_API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

export const API_BASE_URL = RAW_API_URL.replace(/\/api\/?$/, "");

type ApiRequestConfig = {
  headers?: Record<string, string>;
  method?: string;
  body?: unknown;
  params?: Record<string, unknown> | URLSearchParams;
  timeout?: number;
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void;
};

type ApiResponse<T = any> = {
  data: T;
  status: number;
  ok: boolean;
  headers: Headers;
};

type ApiError = Error & {
  response?: {
    status?: number;
    data?: any;
  };
  request?: true;
};

function appendQueryParams(url: string, params?: ApiRequestConfig["params"]) {
  if (!params) return url;

  const searchParams =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== null && value !== "")
            .map(([key, value]) => [key, String(value)]),
        );

  const query = searchParams.toString();
  if (!query) return url;

  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

function normalizeApiUrl(url: string, params?: ApiRequestConfig["params"]) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return appendQueryParams(url, params);
  }

  const apiPath =
    url && !url.startsWith("/api/")
      ? url.startsWith("/")
        ? `/api${url}`
        : `/api/${url}`
      : url;

  return appendQueryParams(`${API_BASE_URL}${apiPath}`, params);
}

function buildRequestInit(config: ApiRequestConfig = {}): RequestInit {
  const headers: Record<string, string> = { ...(config.headers || {}) };
  const token = localStorage.getItem("token");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method: config.method || "GET",
    headers,
  };

  if (config.body !== undefined) {
    if (config.body instanceof FormData) {
      init.body = config.body;
      delete headers["Content-Type"];
    } else if (
      typeof config.body === "string" ||
      config.body instanceof Blob ||
      config.body instanceof ArrayBuffer
    ) {
      init.body = config.body as BodyInit;
    } else {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      init.body = JSON.stringify(config.body);
    }
  }

  return init;
}

async function parseResponseBody(response: Response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

async function request<T = any>(url: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
  let response: Response;

  try {
    config.onUploadProgress?.({ loaded: 0 });
    response = await fetch(normalizeApiUrl(url, config.params), buildRequestInit(config));
    config.onUploadProgress?.({ loaded: 1, total: 1 });
  } catch (cause: any) {
    const error = new Error(cause?.message || "Network request failed") as ApiError;
    error.request = true;
    throw normalizeApiError(error);
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const error = new Error(
      typeof data?.message === "string" ? data.message : `HTTP ${response.status}`,
    ) as ApiError;
    error.response = {
      status: response.status,
      data,
    };
    throw normalizeApiError(error);
  }

  return {
    data: data as T,
    status: response.status,
    ok: response.ok,
    headers: response.headers,
  };
}

export const api = {
  get<T = any>(url: string, config?: ApiRequestConfig) {
    return request<T>(url, { ...config, method: "GET" });
  },
  delete<T = any>(url: string, config?: ApiRequestConfig) {
    return request<T>(url, { ...config, method: "DELETE" });
  },
  post<T = any>(url: string, data?: unknown, config?: ApiRequestConfig) {
    return request<T>(url, { ...config, method: "POST", body: data });
  },
  put<T = any>(url: string, data?: unknown, config?: ApiRequestConfig) {
    return request<T>(url, { ...config, method: "PUT", body: data });
  },
  patch<T = any>(url: string, data?: unknown, config?: ApiRequestConfig) {
    return request<T>(url, { ...config, method: "PATCH", body: data });
  },
};

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

function normalizeApiError(error: ApiError) {
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

  return error;
}

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
