import { AUTH_CHANGED_EVENT } from "./auth";
import { getActiveLocale } from "./i18n";

// Central API helper for the frontend.
// Supports both Thai and English UI text by keeping this file in UTF-8.

const RAW_API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? window.location.origin
    : "http://localhost:3000");

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

function parseXhrResponseBody(xhr: XMLHttpRequest) {
  if (xhr.status === 204) return null;

  const contentType = xhr.getResponseHeader("content-type") || "";
  const text = xhr.responseText || "";

  if (contentType.includes("application/json")) {
    return text ? JSON.parse(text) : null;
  }

  return text || null;
}

function buildHeadersFromRaw(rawHeaders: string) {
  const headers = new Headers();

  rawHeaders
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex <= 0) return;
      headers.append(
        line.slice(0, separatorIndex).trim(),
        line.slice(separatorIndex + 1).trim(),
      );
    });

  return headers;
}

function requestWithUploadProgress<T = any>(
  url: string,
  config: ApiRequestConfig,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const requestUrl = normalizeApiUrl(url, config.params);
    const init = buildRequestInit(config);
    const xhr = new XMLHttpRequest();

    xhr.open(init.method || "GET", requestUrl, true);

    if (config.timeout) {
      xhr.timeout = config.timeout;
    }

    const headers = init.headers || {};
    if (headers instanceof Headers) {
      headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => xhr.setRequestHeader(key, value));
    } else {
      Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined) xhr.setRequestHeader(key, String(value));
      });
    }

    xhr.upload.onprogress = (event) => {
      config.onUploadProgress?.({
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : undefined,
      });
    };

    xhr.onload = () => {
      try {
        const data = parseXhrResponseBody(xhr);
        const response = {
          data: data as T,
          status: xhr.status,
          ok: xhr.status >= 200 && xhr.status < 300,
          headers: buildHeadersFromRaw(xhr.getAllResponseHeaders()),
        };

        if (!response.ok) {
          const error = new Error(
            typeof (data as any)?.message === "string"
              ? (data as any).message
              : `HTTP ${xhr.status}`,
          ) as ApiError;
          error.response = {
            status: xhr.status,
            data,
          };
          reject(normalizeApiError(error));
          return;
        }

        config.onUploadProgress?.({ loaded: 1, total: 1 });
        resolve(response);
      } catch (cause: any) {
        const error = new Error(cause?.message || "Invalid server response") as ApiError;
        error.request = true;
        reject(normalizeApiError(error));
      }
    };

    xhr.onerror = () => {
      const error = new Error("Network request failed") as ApiError;
      error.request = true;
      reject(normalizeApiError(error));
    };

    xhr.ontimeout = () => {
      const error = new Error("Network request timed out") as ApiError;
      error.request = true;
      reject(normalizeApiError(error));
    };

    config.onUploadProgress?.({ loaded: 0, total: 1 });
    xhr.send((init.body as XMLHttpRequestBodyInit | undefined) || null);
  });
}

async function request<T = any>(url: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
  let response: Response;

  if (config.onUploadProgress) {
    return requestWithUploadProgress<T>(url, config);
  }

  try {
    response = await fetch(normalizeApiUrl(url, config.params), buildRequestInit(config));
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

const API_ERROR_TEXT = {
  th: {
    badRequest: "ข้อมูลที่ส่งไม่ถูกต้องหรือยังไม่ครบ",
    conflict: "ข้อมูลซ้ำหรือขัดแย้งกับข้อมูลเดิมในระบบ",
    fallback: "ทำรายการไม่สำเร็จ",
    forbidden: "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้",
    network: "ติดต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือรอสักครู่แล้วลองใหม่",
    notFound: "ไม่พบข้อมูลที่ต้องการทำรายการ",
    payloadTooLarge: "ไฟล์หรือข้อมูลที่ส่งมีขนาดใหญ่เกินไป",
    server: "เซิร์ฟเวอร์ขัดข้องหรือฐานข้อมูลยังไม่พร้อมใช้งาน",
    status: (status: number) => `เซิร์ฟเวอร์ตอบกลับสถานะ ${status}`,
    unauthorized: "ยังไม่ได้เข้าสู่ระบบ หรือ session หมดอายุ",
  },
  en: {
    badRequest: "The submitted information is invalid or incomplete",
    conflict: "The information already exists or conflicts with existing data",
    fallback: "Action failed",
    forbidden: "This account does not have permission to perform this action",
    network: "Could not contact the server. Check your connection and try again",
    notFound: "The requested information was not found",
    payloadTooLarge: "The uploaded file or submitted data is too large",
    server: "The server or database is not ready",
    status: (status: number) => `The server responded with status ${status}`,
    unauthorized: "You are not logged in, or your session has expired",
  },
};

function apiErrorText() {
  return API_ERROR_TEXT[getActiveLocale() === "en" ? "en" : "th"];
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  const err = error as any;
  const text = apiErrorText();
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
          ? text.badRequest
          : status === 401
            ? text.unauthorized
            : status === 403
              ? text.forbidden
              : status === 404
                ? text.notFound
                : status === 409
                  ? text.conflict
                  : status === 413
                    ? text.payloadTooLarge
                    : status >= 500
                      ? text.server
                      : text.status(status)
        : err?.request
          ? text.network
          : err?.message
            ? err.message
            : "";

  if (!reason) {
    return fallback || text.fallback;
  }

  return reason.includes(fallback) ? reason : `${fallback}: ${reason}`;
}

function normalizeApiError(error: ApiError) {
  if (error?.response?.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
  }

  const message = getApiErrorMessage(error, apiErrorText().fallback);

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
