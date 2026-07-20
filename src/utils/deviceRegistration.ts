import api from "./api";

const DEVICE_ID_KEY = "read-voice-client-device-id";
export const DEVICES_CHANGED_EVENT = "read-and-voice-devices-changed";

function createDeviceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `rv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getClientDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = createDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function getBrowserName(userAgent: string) {
  if (/Edg\//.test(userAgent)) return "Microsoft Edge";
  if (/OPR\//.test(userAgent)) return "Opera";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Safari\//.test(userAgent)) return "Safari";
  return "Browser";
}

function getPlatformName() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Windows/i.test(platform)) return "Windows";
  if (/Mac/i.test(platform)) return "macOS";
  if (/Linux/i.test(platform)) return "Linux";
  return platform || "Unknown";
}

export function getCurrentDevicePayload() {
  const userAgent = navigator.userAgent || "";
  const platform = getPlatformName();
  const browser = getBrowserName(userAgent);

  return {
    client_device_id: getClientDeviceId(),
    device_name: `${browser} on ${platform}`,
    platform,
    user_agent: userAgent.slice(0, 500),
  };
}

export async function registerCurrentDevice() {
  try {
    await api.post("/account/devices", getCurrentDevicePayload());
    window.dispatchEvent(new CustomEvent(DEVICES_CHANGED_EVENT));
  } catch {
    // Device registration should never block login.
  }
}
