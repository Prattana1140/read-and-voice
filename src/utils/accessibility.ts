import { reactive } from "vue";

export type AccessibilitySettings = {
  enabled: boolean;
  highContrast: boolean;
  speakUi: boolean;
  fontScale: number;
  lineSpacing: number;
  letterSpacing: number;
};

const STORAGE_KEY = "read-voice-accessibility";

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

const normalizeSettings = (raw: Partial<AccessibilitySettings> | null | undefined): AccessibilitySettings => ({
  enabled: Boolean(raw?.enabled),
  highContrast: Boolean(raw?.highContrast),
  speakUi: Boolean(raw?.speakUi),
  fontScale: clamp(Number(raw?.fontScale ?? defaultSettings.fontScale), 1, 1.5),
  lineSpacing: clamp(Number(raw?.lineSpacing ?? defaultSettings.lineSpacing), 1.5, 2.4),
  letterSpacing: clamp(Number(raw?.letterSpacing ?? defaultSettings.letterSpacing), 0, 0.08),
});

export const applyAccessibilitySettings = () => {
  const root = document.documentElement;
  root.dataset.accessibility = accessibilityState.enabled ? "enabled" : "disabled";
  root.dataset.contrast = accessibilityState.highContrast ? "high" : "normal";
  root.style.setProperty("--a11y-font-scale", String(accessibilityState.fontScale));
  root.style.setProperty("--a11y-line-spacing", String(accessibilityState.lineSpacing));
  root.style.setProperty("--a11y-letter-spacing", `${accessibilityState.letterSpacing}em`);
};

const persistAccessibilitySettings = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...accessibilityState }));
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
    if (target.placeholder?.trim()) return target.placeholder.trim();
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
    highContrast: nextEnabled ? true : accessibilityState.highContrast,
    speakUi: nextEnabled ? true : accessibilityState.speakUi,
    fontScale: nextEnabled ? Math.max(1.12, accessibilityState.fontScale) : accessibilityState.fontScale,
    lineSpacing: nextEnabled ? Math.max(1.9, accessibilityState.lineSpacing) : accessibilityState.lineSpacing,
    letterSpacing: nextEnabled ? Math.max(0.02, accessibilityState.letterSpacing) : accessibilityState.letterSpacing,
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
    Object.assign(accessibilityState, normalizeSettings(parsed));
  } catch {
    Object.assign(accessibilityState, defaultSettings);
  }

  applyAccessibilitySettings();
  document.addEventListener("focusin", handleFocusSpeech);
};
