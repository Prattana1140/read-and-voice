import { reactive } from "vue";
import api from "./api";

export type AccessibilitySettings = {
  enabled: boolean;
  highContrast: boolean;
  speakUi: boolean;
  fontScale: number;
  lineSpacing: number;
  letterSpacing: number;
};

type StoredAccessibilitySettings = Partial<AccessibilitySettings> & {
  settingsVersion?: number;
};

const STORAGE_KEY = "read-voice-accessibility";
const SETTINGS_VERSION = 2;

const defaultSettings: AccessibilitySettings = {
  enabled: false,
  highContrast: false,
  speakUi: false,
  fontScale: 1,
  lineSpacing: 1.7,
  letterSpacing: 0,
};

export const accessibilityState = reactive<AccessibilitySettings>({ ...defaultSettings });

let initialized = false;
let lastSpokenLabel = "";

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

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "th-TH";
  window.speechSynthesis.speak(utterance);
};

export const announceAccessibilityMessage = (message: string) => {
  announceToScreenReader(message);
  if (accessibilityState.enabled && accessibilityState.speakUi) {
    speakText(message);
  }
};

const getElementSpeechLabel = (target: HTMLElement) => {
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

  return target.textContent?.trim().replace(/\s+/g, " ").slice(0, 120) || "";
};

const handleFocusSpeech = (event: FocusEvent) => {
  if (!accessibilityState.enabled || !accessibilityState.speakUi) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  const interactive = target.closest<HTMLElement>("button, a, input, select, textarea, [role='button'], [tabindex]");
  if (!interactive) return;

  const label = getElementSpeechLabel(interactive);
  if (!label || label === lastSpokenLabel) return;

  lastSpokenLabel = label;
  speakText(label);
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
    speakUi: nextEnabled ? accessibilityState.speakUi : false,
    fontScale: nextEnabled ? Math.max(1.08, accessibilityState.fontScale) : defaultSettings.fontScale,
    lineSpacing: nextEnabled ? Math.max(1.8, accessibilityState.lineSpacing) : defaultSettings.lineSpacing,
    letterSpacing: nextEnabled ? accessibilityState.letterSpacing : defaultSettings.letterSpacing,
  });

  announceAccessibilityMessage(nextEnabled ? "เปิดโหมดช่วยการเข้าถึงแล้ว" : "ปิดโหมดช่วยการเข้าถึงแล้ว");
};

export const enableVisualAssistPreset = () => {
  updateAccessibilitySettings({
    enabled: true,
    highContrast: true,
    speakUi: true,
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
};
