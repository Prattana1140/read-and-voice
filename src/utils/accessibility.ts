import { reactive } from "vue";
import api from "./api";

export type AccessibilitySettings = {
  enabled: boolean;
  highContrast: boolean;
  speakUi: boolean;
  hoverSpeak: boolean;
  fontScale: number;
  lineSpacing: number;
  letterSpacing: number;
};

type StoredAccessibilitySettings = Partial<AccessibilitySettings> & {
  settingsVersion?: number;
};

const STORAGE_KEY = "read-voice-accessibility";
const SETTINGS_VERSION = 3;
const ACTIVE_READER_TTS_KEY = "read-voice-reader-tts-active";
const HOVER_SPEECH_DELAY_MS = 420;
const REPEAT_SPEECH_GAP_MS = 1200;
const MAX_HOVER_LABEL_LENGTH = 180;

const defaultSettings: AccessibilitySettings = {
  enabled: false,
  highContrast: false,
  speakUi: false,
  hoverSpeak: false,
  fontScale: 1,
  lineSpacing: 1.7,
  letterSpacing: 0,
};

export const accessibilityState = reactive<AccessibilitySettings>({ ...defaultSettings });

let initialized = false;
let lastSpokenLabel = "";
let lastSpokenAt = 0;
let hoverSpeechTimer: number | undefined;
let pendingHoverTarget: HTMLElement | null = null;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const readNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeSettings = (
  raw: StoredAccessibilitySettings | null | undefined,
  options: { migrateLegacyStorage?: boolean } = {},
): AccessibilitySettings => {
  const defaultVersion = options.migrateLegacyStorage ? 1 : SETTINGS_VERSION;
  const savedVersion = readNumber(raw?.settingsVersion, defaultVersion);
  const migratedFromAutoContrast = Boolean(options.migrateLegacyStorage && savedVersion < SETTINGS_VERSION);

  return {
    enabled: Boolean(raw?.enabled),
    highContrast: migratedFromAutoContrast ? false : Boolean(raw?.highContrast),
    speakUi: migratedFromAutoContrast ? false : Boolean(raw?.speakUi),
    hoverSpeak: migratedFromAutoContrast ? false : Boolean(raw?.hoverSpeak),
    fontScale: clamp(readNumber(raw?.fontScale, defaultSettings.fontScale), 1, 1.5),
    lineSpacing: clamp(readNumber(raw?.lineSpacing, defaultSettings.lineSpacing), 1.5, 2.4),
    letterSpacing: clamp(readNumber(raw?.letterSpacing, defaultSettings.letterSpacing), 0, 0.08),
  };
};

export const applyAccessibilitySettings = () => {
  const root = document.documentElement;
  root.dataset.accessibility = accessibilityState.enabled ? "enabled" : "disabled";
  root.dataset.contrast = accessibilityState.highContrast ? "high" : "normal";
  root.style.setProperty("--a11y-font-scale", String(accessibilityState.fontScale));
  root.style.setProperty("--a11y-line-spacing", String(accessibilityState.lineSpacing));
  root.style.setProperty("--a11y-letter-spacing", `${accessibilityState.letterSpacing}em`);
};

const persistAccessibilitySettings = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...accessibilityState, settingsVersion: SETTINGS_VERSION }));
  if (!localStorage.getItem("token")) return;

  api.put("/account/preferences", {
    preferences: {
      accessibility: { ...accessibilityState, settingsVersion: SETTINGS_VERSION },
    },
  }).catch(() => undefined);
};

export const announceToScreenReader = (message: string) => {
  window.dispatchEvent(new CustomEvent("read-voice:announce", { detail: message }));
};

export const speakText = (message: string) => {
  if (!message || !("speechSynthesis" in window)) return;
  if (localStorage.getItem(ACTIVE_READER_TTS_KEY) === "true") return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "th-TH";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
};

export const announceAccessibilityMessage = (message: string) => {
  announceToScreenReader(message);
  if (accessibilityState.enabled && accessibilityState.speakUi) {
    speakText(message);
  }
};

const getElementSpeechLabel = (target: HTMLElement) => {
  const explicitSpeech = target.getAttribute("data-speech-label")?.trim();
  if (explicitSpeech) return explicitSpeech;

  const ariaLabel = target.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  const ariaLabelledBy = target.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const source = document.getElementById(ariaLabelledBy);
    const text = source?.textContent?.trim();
    if (text) return text;
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    const labelText = target.labels?.[0]?.textContent?.trim();
    if (labelText) return labelText;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const placeholder = target.placeholder.trim();
      if (placeholder) return placeholder;
    }
  }

  const title = target.getAttribute("title")?.trim();
  if (title) return title;

  const alt = target.getAttribute("alt")?.trim();
  if (alt) return alt;

  return target.textContent?.trim().replace(/\s+/g, " ").slice(0, MAX_HOVER_LABEL_LENGTH) || "";
};

const describeElementForSpeech = (target: HTMLElement) => {
  const label = getElementSpeechLabel(target);
  if (!label) return "";

  const tagName = target.tagName.toLowerCase();
  const role = target.getAttribute("role")?.toLowerCase();

  if (target instanceof HTMLButtonElement || role === "button") return `ปุ่ม ${label}`;
  if (target instanceof HTMLAnchorElement) return `ลิงก์ ${label}`;
  if (target instanceof HTMLInputElement) {
    const inputType = target.type || "text";
    if (inputType === "checkbox") return `ช่องทำเครื่องหมาย ${label} ${target.checked ? "เลือกอยู่" : "ยังไม่เลือก"}`;
    if (inputType === "radio") return `ตัวเลือก ${label} ${target.checked ? "เลือกอยู่" : "ยังไม่เลือก"}`;
    if (inputType === "search") return `ช่องค้นหา ${label}`;
    return `ช่องกรอก ${label}`;
  }
  if (target instanceof HTMLTextAreaElement) return `ช่องพิมพ์ข้อความ ${label}`;
  if (target instanceof HTMLSelectElement) return `รายการให้เลือก ${label}`;
  if (target instanceof HTMLImageElement) return `รูปภาพ ${label}`;
  if (/^h[1-6]$/.test(tagName)) return `หัวข้อ ${label}`;
  if (tagName === "li") return `รายการ ${label}`;
  if (tagName === "th") return `หัวตาราง ${label}`;
  if (tagName === "td") return `ข้อมูล ${label}`;

  return label;
};

const getSpeechTarget = (target: HTMLElement) => {
  return target.closest<HTMLElement>(
    [
      "button",
      "a[href]",
      "input",
      "select",
      "textarea",
      "summary",
      "label",
      "[role='button']",
      "[aria-label]",
      "[title]",
      "img[alt]",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "li",
      "th",
      "td",
      "p",
      "[data-speech-label]",
    ].join(", "),
  );
};

const speakElementLabel = (target: HTMLElement) => {
  const label = describeElementForSpeech(target).replace(/\s+/g, " ").trim().slice(0, MAX_HOVER_LABEL_LENGTH);
  const now = Date.now();
  if (!label) return;
  if (label === lastSpokenLabel && now - lastSpokenAt < REPEAT_SPEECH_GAP_MS) return;

  lastSpokenLabel = label;
  lastSpokenAt = now;
  speakText(label);
};

const handleFocusSpeech = (event: FocusEvent) => {
  if (!accessibilityState.enabled || !accessibilityState.speakUi) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  const interactive = target.closest<HTMLElement>("button, a, input, select, textarea, [role='button'], [tabindex]");
  if (!interactive) return;

  speakElementLabel(interactive);
};

const handleHoverSpeech = (event: MouseEvent) => {
  if (!accessibilityState.enabled || !accessibilityState.hoverSpeak) return;
  if (localStorage.getItem(ACTIVE_READER_TTS_KEY) === "true") return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  const speechTarget = getSpeechTarget(target);
  if (!speechTarget) return;

  if (hoverSpeechTimer) window.clearTimeout(hoverSpeechTimer);
  pendingHoverTarget = speechTarget;
  hoverSpeechTimer = window.setTimeout(() => {
    if (!pendingHoverTarget || pendingHoverTarget !== speechTarget) return;
    speakElementLabel(speechTarget);
  }, HOVER_SPEECH_DELAY_MS);
};

const handleHoverSpeechCancel = (event: MouseEvent) => {
  const nextTarget = event.relatedTarget as Node | null;
  if (pendingHoverTarget && nextTarget && pendingHoverTarget.contains(nextTarget)) return;

  pendingHoverTarget = null;
  if (hoverSpeechTimer) {
    window.clearTimeout(hoverSpeechTimer);
    hoverSpeechTimer = undefined;
  }
};

export const updateAccessibilitySettings = (patch: Partial<AccessibilitySettings>) => {
  Object.assign(accessibilityState, normalizeSettings({ ...accessibilityState, ...patch }));
  applyAccessibilitySettings();
  persistAccessibilitySettings();
};

export const toggleAccessibilityMode = () => {
  const nextEnabled = !accessibilityState.enabled;
  updateAccessibilitySettings({
    enabled: nextEnabled,
    highContrast: nextEnabled ? accessibilityState.highContrast : false,
    speakUi: nextEnabled ? true : false,
    hoverSpeak: nextEnabled ? true : false,
    fontScale: nextEnabled ? Math.max(1.08, accessibilityState.fontScale) : defaultSettings.fontScale,
    lineSpacing: nextEnabled ? Math.max(1.8, accessibilityState.lineSpacing) : defaultSettings.lineSpacing,
    letterSpacing: nextEnabled ? accessibilityState.letterSpacing : defaultSettings.letterSpacing,
  });

  announceAccessibilityMessage(nextEnabled ? "เปิดโหมดช่วยการเข้าถึงและอ่านเมื่อชี้เมาส์แล้ว" : "ปิดโหมดช่วยการเข้าถึงแล้ว");
};

export const enableVisualAssistPreset = () => {
  updateAccessibilitySettings({
    enabled: true,
    highContrast: true,
    speakUi: true,
    hoverSpeak: true,
    fontScale: 1.22,
    lineSpacing: 2.1,
    letterSpacing: 0.03,
  });
};

export const initializeAccessibility = () => {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    Object.assign(accessibilityState, normalizeSettings(parsed, { migrateLegacyStorage: true }));
  } catch {
    Object.assign(accessibilityState, defaultSettings);
  }

  applyAccessibilitySettings();
  if (localStorage.getItem("token")) {
    api.get("/account/preferences")
      .then(({ data }) => {
        const remote = data?.preferences?.accessibility;
        if (!remote || typeof remote !== "object") return;
        Object.assign(accessibilityState, normalizeSettings(remote));
        applyAccessibilitySettings();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...accessibilityState, settingsVersion: SETTINGS_VERSION }));
      })
      .catch(() => undefined);
  }
  document.addEventListener("focusin", handleFocusSpeech);
  document.addEventListener("mouseover", handleHoverSpeech);
  document.addEventListener("mouseout", handleHoverSpeechCancel);
};
