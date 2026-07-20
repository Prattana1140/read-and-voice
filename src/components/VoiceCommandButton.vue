<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { announceAccessibilityMessage } from "../utils/accessibility";
import { getAuthUser, isAuthenticated, type UserRole } from "../utils/auth";
import {
  normalizeVoiceCommand,
  normalizeVoiceMatchText,
  parseVoiceCommand,
  voiceHelpSections,
  type ReaderVoiceCommand,
  type VoiceCommandAction,
} from "../utils/voiceCommands";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>>;
};

type VoiceNavigationTarget = {
  routeName: string;
  query?: Record<string, string>;
  label: string;
};

type VoiceRouteAccess = {
  label: string;
  requiresAuth?: boolean;
  guestOnly?: boolean;
  allowedRoles?: UserRole[];
};

const router = useRouter();
const route = useRoute();

const voiceCommandRef = ref<HTMLElement | null>(null);
const voiceHelpRef = ref<HTMLElement | null>(null);
const voiceOnboardingRef = ref<HTMLElement | null>(null);
const isListening = ref(false);
const isSupported = ref(true);
const lastCommand = ref("");
const isContinuousMode = ref(false);
const isHelpOpen = ref(false);
const isManualOpen = ref(false);
const isOnboardingOpen = ref(false);
const typedCommand = ref("");
const pendingMatches = ref<HTMLElement[]>([]);
const pendingAction = ref<"click" | "focus">("click");
const statusText = ref("");
const isStatusOpen = ref(false);
const pendingDangerAction = ref<null | (() => void)>(null);
const pendingNavigation = ref<VoiceNavigationTarget | null>(null);

let recognition: SpeechRecognitionLike | null = null;
const ONBOARDING_STORAGE_KEY = "read-voice-voice-command-onboarded";
const hiddenRouteNames = new Set(["Profile", "ProfileSettings"]);
const continuousBlockedRouteNames = new Set(["Login", "AccountLogin", "Register", "ForgotPassword", ...hiddenRouteNames]);
const memberRoles: UserRole[] = ["user", "writer", "admin", "superadmin"];
const writerRoles: UserRole[] = ["writer"];
const uploaderRoles: UserRole[] = ["writer", "admin", "superadmin"];
const adminRoles: UserRole[] = ["admin", "superadmin"];
const superAdminRoles: UserRole[] = ["superadmin"];
const voiceRouteAccess: Record<string, VoiceRouteAccess> = {
  Home: { label: "หน้าแรก" },
  Store: { label: "ร้านหนังสือ" },
  Search: { label: "ค้นหา" },
  Serials: { label: "นิยายรายตอน" },
  BestSellers: { label: "หนังสือขายดี" },
  NewReleases: { label: "หนังสือใหม่" },
  Promotions: { label: "โปรโมชัน" },
  FreeBooks: { label: "อ่านฟรี" },
  HallOfFame: { label: "หอเกียรติยศ" },
  Recommended: { label: "แนะนำ" },
  SubscriptionPlans: { label: "แพ็กเกจสมาชิก" },
  CategoryIndex: { label: "หมวดหมู่" },
  TagIndex: { label: "แท็ก" },
  PublisherIndex: { label: "สำนักพิมพ์" },
  AuthorIndex: { label: "นักเขียน" },
  Support: { label: "ช่วยเหลือ" },
  Contact: { label: "ติดต่อ" },
  ReportIssue: { label: "รายงานปัญหา" },
  Login: { label: "เข้าสู่ระบบ", guestOnly: true },
  Register: { label: "สมัครสมาชิก", guestOnly: true },
  AccessibleHome: { label: "หน้าอ่านง่าย", requiresAuth: true, allowedRoles: memberRoles },
  MyLibrary: { label: "ชั้นหนังสือของฉัน", requiresAuth: true, allowedRoles: memberRoles },
  Cart: { label: "รถเข็น", requiresAuth: true, allowedRoles: memberRoles },
  OrderHistory: { label: "ประวัติคำสั่งซื้อ", requiresAuth: true, allowedRoles: memberRoles },
  Profile: { label: "โปรไฟล์", requiresAuth: true, allowedRoles: memberRoles },
  NotificationSettings: { label: "ตั้งค่าการแจ้งเตือน", requiresAuth: true, allowedRoles: memberRoles },
  AccountNotifications: { label: "การแจ้งเตือน", requiresAuth: true, allowedRoles: memberRoles },
  AccountFollowing: { label: "กำลังติดตาม", requiresAuth: true, allowedRoles: memberRoles },
  AccountDevices: { label: "อุปกรณ์ของฉัน", requiresAuth: true, allowedRoles: memberRoles },
  AccountReviews: { label: "รีวิวของฉัน", requiresAuth: true, allowedRoles: memberRoles },
  CoinWallet: { label: "กระเป๋าคอยน์", requiresAuth: true, allowedRoles: memberRoles },
  WriterDashboard: { label: "แดชบอร์ดนักเขียน", requiresAuth: true, allowedRoles: writerRoles },
  WriterProfileSettings: { label: "โปรไฟล์นักเขียน", requiresAuth: true, allowedRoles: writerRoles },
  WriterBooks: { label: "หนังสือของฉันสำหรับนักเขียน", requiresAuth: true, allowedRoles: writerRoles },
  WriterUpload: { label: "อัปโหลดหนังสือ", requiresAuth: true, allowedRoles: uploaderRoles },
  WriterStats: { label: "สถิติหนังสือ", requiresAuth: true, allowedRoles: writerRoles },
  AdminDashboard: { label: "แดชบอร์ดแอดมิน", requiresAuth: true, allowedRoles: adminRoles },
  AdminBooks: { label: "จัดการหนังสือ", requiresAuth: true, allowedRoles: adminRoles },
  AdminApprovals: { label: "อนุมัติรายการ", requiresAuth: true, allowedRoles: adminRoles },
  AdminCoinTopups: { label: "เติมคอยน์แอดมิน", requiresAuth: true, allowedRoles: adminRoles },
  AdminOrderPayments: { label: "คำสั่งซื้อแอดมิน", requiresAuth: true, allowedRoles: adminRoles },
  AdminSubscriptionPayments: { label: "ชำระแพ็กเกจสมาชิก", requiresAuth: true, allowedRoles: adminRoles },
  AdminSubscriptionPlans: { label: "จัดการแพ็กเกจสมาชิก", requiresAuth: true, allowedRoles: adminRoles },
  AdminPayments: { label: "จัดการการชำระเงิน", requiresAuth: true, allowedRoles: adminRoles },
  AdminPasswordResets: { label: "รีเซ็ตรหัสผ่าน", requiresAuth: true, allowedRoles: adminRoles },
  AdminSupportTickets: { label: "ซัพพอร์ตทิกเก็ต", requiresAuth: true, allowedRoles: adminRoles },
  AdminSystemData: { label: "ข้อมูลระบบ", requiresAuth: true, allowedRoles: adminRoles },
  AdminPageContent: { label: "จัดการเนื้อหาหน้าเว็บ", requiresAuth: true, allowedRoles: adminRoles },
  UploadBook: { label: "อัปโหลดหนังสือแอดมิน", requiresAuth: true, allowedRoles: ["admin"] },
  AdminCategories: { label: "จัดการหมวดหมู่", requiresAuth: true, allowedRoles: adminRoles },
  AdminMembers: { label: "สมาชิก", requiresAuth: true, allowedRoles: adminRoles },
  SuperAdminDashboard: { label: "แดชบอร์ดซูเปอร์แอดมิน", requiresAuth: true, allowedRoles: superAdminRoles },
  SuperAdminRoles: { label: "จัดการบทบาท", requiresAuth: true, allowedRoles: superAdminRoles },
  SuperAdminUsers: { label: "จัดการผู้ใช้", requiresAuth: true, allowedRoles: superAdminRoles },
  SuperAdminSettings: { label: "ตั้งค่าระบบ", requiresAuth: true, allowedRoles: superAdminRoles },
};
const navigationConfirmCommands = /^(ยืนยัน|ใช่|ไปเลย|ตกลง|โอเค|ok|okay|เอาเลย|เปิดเลย|ไปหน้านั้น)$/;
const navigationCancelCommands = /^(ไม่|ไม่ใช่|ยกเลิก|ไม่ไป|ปิด|หยุด|พอก่อน)$/;

const buttonLabel = computed(() =>
  !isSupported.value ? "พิมพ์คำสั่ง" : isListening.value ? "กำลังฟัง..." : "สั่งงานด้วยเสียง",
);
const voiceHelpText = computed(() =>
  voiceHelpSections.map((section) => `${section.title}: ${section.items.join(". ")}`).join(". "),
);
const isVoiceHidden = computed(() => hiddenRouteNames.has(String(route.name || "")));
const isContinuousBlockedRoute = computed(() => continuousBlockedRouteNames.has(String(route.name || "")));

function detectSpeechSupport() {
  const SpeechRecognitionConstructor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  isSupported.value = Boolean(SpeechRecognitionConstructor && window.isSecureContext);

  if (!SpeechRecognitionConstructor) {
    statusText.value = "เครื่องนี้ใช้ไมค์สั่งงานไม่ได้ ใช้ช่องพิมพ์คำสั่งแทนได้";
    isManualOpen.value = true;
  } else if (!window.isSecureContext) {
    statusText.value = "เสียงต้องใช้ HTTPS หรือ localhost แต่ช่องพิมพ์คำสั่งยังใช้ได้";
    isManualOpen.value = true;
  }

}

function getRecognition() {
  if (recognition) return recognition;

  const SpeechRecognitionConstructor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionConstructor) {
    isSupported.value = false;
    statusText.value = "เครื่องนี้ใช้ไมค์สั่งงานไม่ได้ ใช้ช่องพิมพ์คำสั่งแทนได้";
    isManualOpen.value = true;
    announceAccessibilityMessage(statusText.value);
    return null;
  }

  if (!window.isSecureContext) {
    isSupported.value = false;
    statusText.value = "เสียงต้องใช้ HTTPS หรือ localhost แต่ช่องพิมพ์คำสั่งยังใช้ได้";
    isManualOpen.value = true;
    announceAccessibilityMessage(statusText.value);
    return null;
  }

  recognition = new SpeechRecognitionConstructor() as SpeechRecognitionLike;
  recognition.lang = "th-TH";
  recognition.interimResults = false;
  recognition.continuous = isContinuousMode.value;
  recognition.onstart = () => {
    isListening.value = true;
    statusText.value = "กำลังฟังคำสั่ง...";
    isStatusOpen.value = true;
  };
  recognition.onend = () => {
    isListening.value = false;
    if (isContinuousMode.value) {
      window.setTimeout(() => {
        try {
          recognition?.start();
        } catch {
          // Browser may still be finalizing the previous recognition session.
        }
      }, 220);
    }
  };
  recognition.onerror = (event) => {
    isListening.value = false;
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      statusText.value = "กรุณาอนุญาตไมโครโฟน แล้วใช้ Chrome หรือ Edge บน HTTPS";
    } else if (event.error === "no-speech") {
      statusText.value = "ไม่ได้ยินเสียง ลองพูดใกล้ไมค์อีกครั้ง";
    } else if (event.error === "audio-capture") {
      statusText.value = "ไม่พบไมโครโฟน กรุณาตรวจสอบอุปกรณ์เสียง";
    } else {
      statusText.value = "ฟังคำสั่งไม่สำเร็จ ลองอีกครั้ง";
    }
    isStatusOpen.value = true;
    announceAccessibilityMessage(statusText.value);
  };
  recognition.onresult = (event) => {
    const transcript = getTranscript(event);
    if (!transcript) {
      statusText.value = "ไม่ได้ยินคำสั่ง";
      isStatusOpen.value = true;
      return;
    }

    lastCommand.value = transcript;
    handleCommand(transcript);
  };

  return recognition;
}

function getTranscript(event: SpeechRecognitionEventLike) {
  const chunks: string[] = [];

  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    if (result?.[0]?.transcript) chunks.push(result[0].transcript);
  }

  return chunks.join(" ").trim();
}

function speakStatus(message: string, afterSpeak?: () => void) {
  statusText.value = message;
  isStatusOpen.value = true;
  announceAccessibilityMessage(message);
  speakText(message, true, afterSpeak);
}

function announceStatusOnly(message: string) {
  statusText.value = message;
  isStatusOpen.value = true;
  announceAccessibilityMessage(message);
}

function speakText(message: string, interrupt = false, afterSpeak?: () => void) {
  if (!message || !("speechSynthesis" in window)) {
    afterSpeak?.();
    return;
  }
  if (interrupt) window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "th-TH";
  utterance.rate = 1;
  utterance.pitch = 1;
  if (afterSpeak) {
    utterance.onend = afterSpeak;
    utterance.onerror = afterSpeak;
  }
  window.speechSynthesis.speak(utterance);
}

function startListening() {
  if (!isSupported.value) {
    isManualOpen.value = true;
    return;
  }

  const speechRecognition = getRecognition();
  if (!speechRecognition) return;
  speechRecognition.continuous = isContinuousMode.value;

  if (isListening.value) {
    speechRecognition.stop();
    return;
  }

  try {
    speechRecognition.start();
  } catch {
    speechRecognition.abort();
    speechRecognition.start();
  }
}

function submitTypedCommand() {
  const command = typedCommand.value.trim();
  if (!command) {
    speakStatus("พิมพ์คำสั่งก่อน เช่น ค้นหา นิยายรัก");
    return;
  }

  typedCommand.value = "";
  isManualOpen.value = false;
  lastCommand.value = command;
  handleCommand(command);
}

function setContinuousMode(enabled: boolean) {
  if (enabled && !isSupported.value) {
    isManualOpen.value = true;
    speakStatus("โหมดฟังต่อเนื่องใช้ได้เฉพาะเครื่องที่รองรับไมค์สั่งงาน แต่พิมพ์คำสั่งได้");
    return;
  }

  if (enabled && isContinuousBlockedRoute.value) {
    speakStatus("หน้านี้ใช้คำสั่งเสียงแบบกดครั้งเดียวเท่านั้น");
    return;
  }

  isContinuousMode.value = enabled;
  if (recognition) recognition.continuous = enabled;

  if (enabled && !isListening.value) {
    startListening();
  } else if (!enabled && isListening.value) {
    recognition?.stop();
  }

  speakStatus(enabled ? "เปิดโหมดสั่งงานต่อเนื่องแล้ว" : "ปิดโหมดสั่งงานต่อเนื่องแล้ว");
}

function closeOnboarding() {
  isOnboardingOpen.value = false;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
}

function closeFloatingVoicePanels() {
  isManualOpen.value = false;
  isHelpOpen.value = false;
  isStatusOpen.value = false;
  lastCommand.value = "";
  if (isOnboardingOpen.value) closeOnboarding();
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target;
  if (!(target instanceof Node)) return;

  const clickedInsideVoiceCommand = Boolean(voiceCommandRef.value?.contains(target));
  const clickedInsideHelp = Boolean(voiceHelpRef.value?.contains(target));
  const clickedInsideOnboarding = Boolean(voiceOnboardingRef.value?.contains(target));

  if (clickedInsideVoiceCommand || clickedInsideHelp || clickedInsideOnboarding) return;
  closeFloatingVoicePanels();
}

function pushSearch(keyword: string, contentType = "all") {
  router.push({
    name: "Search",
    query: {
      q: keyword,
      ...(contentType !== "all" ? { type: contentType } : {}),
    },
  });
}

function pushSerialCategory(category: string) {
  router.push({
    name: "Serials",
    query: { category },
  });
}

function pushCategory(category: string) {
  router.push({
    name: "Search",
    query: { category },
  });
}

function dispatchReaderCommand(command: ReaderVoiceCommand) {
  window.dispatchEvent(new CustomEvent("read-voice:reader-command", { detail: command }));
}

function runReaderCommand(command: ReaderVoiceCommand, message: string) {
  if (route.name !== "ReaderPage" && route.name !== "ReaderListenPage") {
    speakStatus("เปิดหน้าอ่านก่อน แล้วค่อยสั่งเล่นเสียง");
    return;
  }

  dispatchReaderCommand(command);
  if (command === "play" || command === "next" || command === "previous") {
    announceStatusOnly(message);
    return;
  }

  speakStatus(message);
}

function isVisibleElement(element: HTMLElement) {
  if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function getAssociatedLabel(element: HTMLElement) {
  const id = element.getAttribute("id");
  if (!id) return "";

  const label = Array.from(document.querySelectorAll("label")).find(
    (item) => item.htmlFor === id,
  );

  return label?.textContent?.trim() || "";
}

function getElementVoiceName(element: HTMLElement) {
  const labeledBy = element.getAttribute("aria-labelledby");
  const labeledByText = labeledBy
    ?.split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent?.trim() || "")
    .filter(Boolean)
    .join(" ");

  return [
    element.getAttribute("aria-label"),
    labeledByText,
    getAssociatedLabel(element),
    element.getAttribute("placeholder"),
    element.getAttribute("name"),
    element.textContent,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeMatchText(value: string) {
  return normalizeVoiceMatchText(value);
}

function matchesVoiceName(element: HTMLElement, target: string) {
  const name = normalizeMatchText(getElementVoiceName(element));
  const keyword = normalizeMatchText(target);
  return Boolean(keyword && name && (name.includes(keyword) || keyword.includes(name)));
}

function getFocusableElements() {
  const selector = [
    "a[href]",
    "button",
    "input",
    "textarea",
    "select",
    "summary",
    "[tabindex]:not([tabindex='-1'])",
    "[role='button']",
  ].join(",");

  return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    const disabled = element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
    return !disabled && isVisibleElement(element);
  });
}

function getReadableElements() {
  const selector = [
    "a[href]",
    "button",
    "[role='button']",
    "article",
    "li",
    "[data-book-id]",
    "[data-category]",
  ].join(",");

  return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(isVisibleElement);
}

function getEditableElement(element: Element | null) {
  if (!element || !(element instanceof HTMLElement)) return null;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return element;
  }
  if (element.isContentEditable) return element;
  return null;
}

function setEditableValue(element: HTMLElement, value: string) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  if (element instanceof HTMLSelectElement) {
    const normalizedValue = normalizeMatchText(value);
    const option = Array.from(element.options).find((item) => {
      const optionText = normalizeMatchText(item.textContent || item.value);
      return optionText.includes(normalizedValue) || normalizedValue.includes(optionText);
    });

    if (!option) return false;
    element.value = option.value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  if (element.isContentEditable) {
    element.textContent = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    return true;
  }

  return false;
}

function focusElementByName(name: string) {
  const matches = getFocusableElements().filter((item) => matchesVoiceName(item, name));
  if (!matches.length) return false;
  if (matches.length > 1) {
    setPendingMatches(matches, "focus", name);
    return true;
  }

  const [element] = matches;
  element.focus();
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  speakStatus(`ไปที่ ${getElementVoiceName(element) || name} แล้ว`);
  return true;
}

function clickElementByName(name: string) {
  const matches = getFocusableElements().filter((item) => matchesVoiceName(item, name));
  if (!matches.length) return false;
  if (matches.length > 1) {
    setPendingMatches(matches, "click", name);
    return true;
  }

  const [element] = matches;
  element.focus();
  element.click();
  speakStatus(`กด ${getElementVoiceName(element) || name} แล้ว`);
  return true;
}

function clickVisibleText(target: string) {
  const keyword = normalizeMatchText(target);
  if (!keyword) return false;

  const matches = getReadableElements().filter((item) => {
    const text = normalizeMatchText(getElementVoiceName(item));
    return text && (text.includes(keyword) || keyword.includes(text));
  });

  if (!matches.length) return false;
  if (matches.length > 1) {
    setPendingMatches(matches, "click", target);
    return true;
  }

  const [element] = matches;
  element.focus();
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  element.click();
  speakStatus(`เปิด ${target} แล้ว`);
  return true;
}

function setPendingMatches(matches: HTMLElement[], action: "click" | "focus", target: string) {
  pendingMatches.value = matches.slice(0, 5);
  pendingAction.value = action;
  const names = pendingMatches.value
    .map((element, index) => `อันที่ ${index + 1} ${getElementVoiceName(element).slice(0, 48)}`)
    .join(" ");

  speakStatus(`พบ ${pendingMatches.value.length} รายการสำหรับ ${target} ${names}`);
}

function choosePendingMatch(index: number) {
  const element = pendingMatches.value[index];
  if (!element) {
    speakStatus("ไม่พบตัวเลือกนั้น");
    return true;
  }

  pendingMatches.value = [];
  element.focus();
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  if (pendingAction.value === "click") element.click();
  speakStatus(`${pendingAction.value === "click" ? "เปิด" : "เลือก"} ${getElementVoiceName(element) || `อันที่ ${index + 1}`} แล้ว`);
  return true;
}

function openBookByTitle(title: string) {
  if (clickVisibleText(title)) return;

  router.push({
    name: "Search",
    query: { q: title },
  });
  speakStatus(`ค้นหาหนังสือ ${title} แล้ว`);
}

function openCategoryByName(category: string, command: string) {
  if (clickVisibleText(category)) return;

  if (/รายตอน|นิยายรายตอน/.test(command) || route.name === "Serials") {
    pushSerialCategory(category);
    speakStatus(`เปิดหมวด ${category} แล้ว`);
    return;
  }

  pushCategory(category);
  speakStatus(`เปิดหมวด ${category} แล้ว`);
}

function moveFocus(step: number) {
  const elements = getFocusableElements();
  if (!elements.length) return false;

  const activeIndex = elements.findIndex((item) => item === document.activeElement);
  const nextIndex = activeIndex >= 0
    ? Math.min(elements.length - 1, Math.max(0, activeIndex + step))
    : 0;
  const next = elements[nextIndex];
  next.focus();
  next.scrollIntoView({ block: "center", behavior: "smooth" });
  speakStatus(`โฟกัส ${getElementVoiceName(next) || "รายการถัดไป"} แล้ว`);
  return true;
}

function submitCurrentForm() {
  const active = document.activeElement;
  const form = active instanceof HTMLElement ? active.closest("form") : document.querySelector("form");
  const submitButton = form?.querySelector<HTMLElement>("button[type='submit'], input[type='submit']");

  if (submitButton) {
    submitButton.click();
    speakStatus("ส่งฟอร์มแล้ว");
    return true;
  }

  if (form instanceof HTMLFormElement) {
    form.requestSubmit();
    speakStatus("ส่งฟอร์มแล้ว");
    return true;
  }

  return false;
}

function getActiveSelect() {
  const active = document.activeElement;
  if (active instanceof HTMLSelectElement) return active;
  const fallback = getFocusableElements().find((element) => element instanceof HTMLSelectElement);
  return fallback instanceof HTMLSelectElement ? fallback : null;
}

function readSelectOptions() {
  const select = getActiveSelect();
  if (!select) {
    speakStatus("ยังไม่ได้เลือกช่องตัวเลือก");
    return true;
  }

  const options = Array.from(select.options)
    .map((option, index) => `ตัวเลือกที่ ${index + 1} ${option.textContent?.trim() || option.value}`)
    .join(". ");
  speakText(options || "ไม่มีตัวเลือก", true);
  statusText.value = "กำลังอ่านตัวเลือก";
  return true;
}

function selectOptionByVoice(value: string) {
  const select = getActiveSelect();
  if (!select) {
    speakStatus("เลือกช่องตัวเลือกก่อน");
    return true;
  }

  const normalizedValue = normalizeMatchText(value);
  const option = Array.from(select.options).find((item, index) => {
    const optionText = normalizeMatchText(item.textContent || item.value);
    return optionText.includes(normalizedValue)
      || normalizedValue.includes(optionText)
      || normalizedValue === String(index + 1);
  });

  if (!option) {
    speakStatus(`ไม่พบตัวเลือก ${value}`);
    return true;
  }

  select.value = option.value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  speakStatus(`เลือก ${option.textContent?.trim() || option.value} แล้ว`);
  return true;
}

function getActiveReadableElement() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && getElementVoiceName(active)) return active;

  const selection = window.getSelection();
  const selectedNode = selection?.anchorNode;
  const selectedElement = selectedNode instanceof HTMLElement
    ? selectedNode
    : selectedNode?.parentElement;

  return selectedElement?.closest<HTMLElement>("article, section, li, tr, button, a, [role='button'], input, textarea, select") || null;
}

function readFocusedElement() {
  const element = getActiveReadableElement();
  const text = element ? getElementVoiceName(element) : "";
  if (!text) {
    speakStatus("ยังไม่มีรายการที่เลือกให้อ่าน");
    return true;
  }

  speakText(text, true);
  statusText.value = text;
  announceAccessibilityMessage(text);
  return true;
}

function readPageSummary() {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3"))
    .filter(isVisibleElement)
    .map((element) => element.textContent?.trim() || "")
    .filter(Boolean)
    .slice(0, 12);
  const focusables = getFocusableElements()
    .map(getElementVoiceName)
    .filter(Boolean)
    .slice(0, 12);
  const summary = [...headings, "รายการที่ใช้ได้", ...focusables].join(". ");

  if (!summary) {
    speakStatus("หน้านี้ยังไม่มีข้อความให้อ่าน");
    return true;
  }

  speakText(summary, true);
  statusText.value = "กำลังอ่านสรุปหน้านี้";
  return true;
}

function stopSpokenFeedback() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  statusText.value = "หยุดอ่านแล้ว";
  announceAccessibilityMessage("หยุดอ่านแล้ว");
  return true;
}

function closeTopLayer() {
  const openDialog = document.querySelector<HTMLDialogElement>("dialog[open]");
  if (openDialog) {
    openDialog.close();
    speakStatus("ปิดหน้าต่างแล้ว");
    return true;
  }

  const openDetails = Array.from(document.querySelectorAll<HTMLDetailsElement>("details[open]")).pop();
  if (openDetails) {
    openDetails.open = false;
    speakStatus("ปิดเมนูแล้ว");
    return true;
  }

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
  speakStatus("ส่งคำสั่งปิดแล้ว");
  return true;
}

function getRows() {
  return Array.from(document.querySelectorAll<HTMLElement>("tbody tr, [role='row'], article, li"))
    .filter(isVisibleElement);
}

function currentRowIndex(rows: HTMLElement[]) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return -1;
  return rows.findIndex((row) => row === active || row.contains(active));
}

function focusRow(step: number) {
  const rows = getRows();
  if (!rows.length) {
    speakStatus("ไม่พบรายการในหน้านี้");
    return true;
  }

  const activeIndex = currentRowIndex(rows);
  const nextIndex = activeIndex >= 0
    ? Math.min(rows.length - 1, Math.max(0, activeIndex + step))
    : 0;
  const row = rows[nextIndex];
  row.tabIndex = row.tabIndex >= 0 ? row.tabIndex : -1;
  row.focus();
  row.scrollIntoView({ block: "center", behavior: "smooth" });
  speakStatus(`ไปแถวที่ ${nextIndex + 1} แล้ว`);
  return true;
}

function readCurrentRow() {
  const rows = getRows();
  const index = currentRowIndex(rows);
  const row = index >= 0 ? rows[index] : rows[0];
  if (!row) {
    speakStatus("ไม่พบแถวให้อ่าน");
    return true;
  }

  const text = (row.innerText || row.textContent || "").trim().replace(/\s+/g, " ");
  if (!text) {
    speakStatus("แถวนี้ไม่มีข้อความ");
    return true;
  }

  speakText(text, true);
  statusText.value = `อ่านแถวที่ ${Math.max(index + 1, 1)}`;
  return true;
}

function clickActionInCurrentRow(actionName: string) {
  const rows = getRows();
  const index = currentRowIndex(rows);
  const row = index >= 0 ? rows[index] : rows[0];
  if (!row) {
    speakStatus("ไม่พบรายการ");
    return true;
  }

  const action = Array.from(row.querySelectorAll<HTMLElement>("button, a[href], [role='button']")).find((element) =>
    matchesVoiceName(element, actionName),
  );

  if (!action) {
    speakStatus(`ไม่พบปุ่ม ${actionName} ในรายการนี้`);
    return true;
  }

  const runAction = () => {
    action.focus();
    action.click();
    speakStatus(`กด ${actionName} ในรายการนี้แล้ว`);
  };

  if (/ลบ|delete|remove/i.test(actionName)) {
    pendingDangerAction.value = runAction;
    speakStatus("คำสั่งนี้เป็นการลบ ถ้าต้องการลบจริงให้พูดว่า ยืนยันลบ");
    return true;
  }

  runAction();
  return true;
}

function handleDangerConfirmation(command: string) {
  if (/^(ยืนยันลบ|ยืนยันการลบ|ยืนยันสั่งซื้อ|ยืนยันจ่ายเงิน|ยืนยันชำระเงิน)$/.test(command)) {
    if (!pendingDangerAction.value) {
      speakStatus("ไม่มีคำสั่งที่รอยืนยัน");
      return true;
    }

    const action = pendingDangerAction.value;
    pendingDangerAction.value = null;
    action();
    return true;
  }
  if (/^(ยกเลิกลบ|ไม่ลบ|ยกเลิกคำสั่งลบ|ยกเลิกคำสั่ง|ไม่ยืนยัน)$/.test(command)) {
    pendingDangerAction.value = null;
    speakStatus("ยกเลิกคำสั่งแล้ว");
    return true;
  }

  return false;
}

function getNavigationLabel(action: Extract<VoiceCommandAction, { type: "navigate" }>) {
  if (action.routeName === "Serials" && action.query?.view === "continue") return "รายการอ่านต่อ";
  return voiceRouteAccess[action.routeName]?.label || "หน้านั้น";
}

function canAccessNavigation(routeName: string) {
  const access = voiceRouteAccess[routeName];
  const loggedIn = isAuthenticated();
  const role = getAuthUser()?.role;

  if (!access) return { allowed: true };
  if (access.guestOnly && loggedIn) {
    return { allowed: false, message: `คุณเข้าสู่ระบบอยู่แล้ว ไม่จำเป็นต้องไปหน้า${access.label}` };
  }
  if (access.requiresAuth && !loggedIn) {
    return { allowed: false, message: `หน้า${access.label}ต้องเข้าสู่ระบบก่อน` };
  }
  if (access.allowedRoles && (!role || !access.allowedRoles.includes(role))) {
    return { allowed: false, message: `บัญชีนี้ไม่มีสิทธิ์ไปหน้า${access.label}` };
  }

  return { allowed: true };
}

function requestNavigationConfirmation(action: Extract<VoiceCommandAction, { type: "navigate" }>) {
  const access = canAccessNavigation(action.routeName);
  const label = getNavigationLabel(action);

  if (!access.allowed) {
    pendingNavigation.value = null;
    speakStatus(access.message || `ไม่สามารถไปหน้า${label}ได้`);
    return;
  }

  pendingNavigation.value = {
    routeName: action.routeName,
    query: action.query,
    label,
  };
  speakStatus(`ต้องการไปหน้า${label}ใช่หรือไม่ พูดว่ายืนยัน`, () => {
    if (pendingNavigation.value && !isListening.value) {
      startListening();
    }
  });
}

function confirmPendingNavigation() {
  const target = pendingNavigation.value;
  if (!target) return false;

  pendingNavigation.value = null;
  router.push({ name: target.routeName, query: target.query });
  speakStatus(
    routeMessage({
      type: "navigate",
      routeName: target.routeName,
      query: target.query,
    }),
  );
  return true;
}

function cancelPendingNavigation() {
  if (!pendingNavigation.value) return false;

  pendingNavigation.value = null;
  speakStatus("ยกเลิกคำสั่งแล้ว");
  return true;
}

function routeMessage(action: Extract<VoiceCommandAction, { type: "navigate" }>) {
  const messages: Record<string, string> = {
    Home: "เปิดหน้าแรกแล้ว",
    Serials: action.query?.view === "continue" ? "เปิดรายการอ่านต่อแล้ว" : "เปิดหน้านิยายรายตอนแล้ว",
    MyLibrary: "เปิดชั้นหนังสือของฉันแล้ว",
    Cart: "เปิดรถเข็นแล้ว",
    OrderHistory: "เปิดประวัติคำสั่งซื้อแล้ว",
    Store: "เปิดหน้าหนังสือแล้ว",
    FreeBooks: "เปิดหน้าอ่านฟรีแล้ว",
    CoinWallet: "เปิดกระเป๋าคอยน์แล้ว",
  };

  return messages[action.routeName] || `เปิดหน้า${getNavigationLabel(action)}แล้ว`;
}

function readerMessage(command: ReaderVoiceCommand) {
  const messages: Record<ReaderVoiceCommand, string> = {
    play: "เริ่มเล่นเสียงแล้ว",
    pause: "หยุดอ่านชั่วคราวแล้ว",
    stop: "หยุดเสียงแล้ว",
    next: "เลื่อนไปถัดไปแล้ว",
    previous: "ย้อนกลับแล้ว",
  };

  return messages[command];
}

function executeVoiceAction(action: VoiceCommandAction, normalizedCommand: string) {
  switch (action.type) {
    case "none":
      speakStatus("ยังไม่รู้จักคำสั่งนี้ ลองพูดว่า ช่วยเหลือ เพื่อดูตัวอย่างคำสั่ง");
      return;
    case "cancelListening":
      recognition?.stop();
      speakStatus("หยุดฟังคำสั่งแล้ว");
      return;
    case "help":
      isHelpOpen.value = action.open;
      if (action.open) {
        speakText(`คำสั่งที่ใช้ได้ เช่น ${voiceHelpText.value}`, true);
        speakStatus("เปิดรายการคำสั่งเสียงแล้ว");
      } else {
        speakStatus("ปิดรายการคำสั่งเสียงแล้ว");
      }
      return;
    case "continuous":
      setContinuousMode(action.enabled);
      return;
    case "readFocused":
      readFocusedElement();
      return;
    case "readPage":
      readPageSummary();
      return;
    case "stopFeedback":
      stopSpokenFeedback();
      return;
    case "closeTopLayer":
      closeTopLayer();
      return;
    case "openMenu":
      if (!clickElementByName(action.target)) speakStatus(`ไม่พบ ${action.target} ในหน้านี้`);
      return;
    case "focusRow":
      focusRow(action.step);
      return;
    case "readCurrentRow":
      readCurrentRow();
      return;
    case "rowAction":
      clickActionInCurrentRow(action.actionName);
      return;
    case "readSelectOptions":
      readSelectOptions();
      return;
    case "selectOption": {
      const optionIndex = Number(action.value);
      if (Number.isInteger(optionIndex) && optionIndex >= 1 && optionIndex <= 5 && pendingMatches.value.length) {
        choosePendingMatch(optionIndex - 1);
        return;
      }
      selectOptionByVoice(action.value);
      return;
    }
    case "moveFocus":
      moveFocus(action.step);
      return;
    case "scroll":
      if (action.direction === "down") {
        window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: "smooth" });
        speakStatus("เลื่อนลงแล้ว");
      } else if (action.direction === "up") {
        window.scrollBy({ top: -Math.round(window.innerHeight * 0.75), behavior: "smooth" });
        speakStatus("เลื่อนขึ้นแล้ว");
      } else if (action.direction === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        speakStatus("ไปบนสุดแล้ว");
      } else {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
        speakStatus("ไปล่างสุดแล้ว");
      }
      return;
    case "routerBack":
      router.back();
      speakStatus("ย้อนกลับแล้ว");
      return;
    case "submitForm":
      if (!submitCurrentForm() && !clickElementByName(normalizedCommand)) speakStatus("ไม่พบฟอร์มให้ส่งในหน้านี้");
      return;
    case "clearField": {
      const active = getEditableElement(document.activeElement);
      if (!active) {
        speakStatus("ยังไม่ได้เลือกช่องกรอกข้อมูล");
        return;
      }
      setEditableValue(active, "");
      speakStatus("ล้างข้อความแล้ว");
      return;
    }
    case "focusElement":
      if (!focusElementByName(action.target)) speakStatus(`ไม่พบ ${action.target} ในหน้านี้`);
      return;
    case "clickElement":
      if (!clickElementByName(action.target)) speakStatus(`ไม่พบปุ่ม ${action.target} ในหน้านี้`);
      return;
    case "fillNamedField": {
      if (!focusElementByName(action.fieldName)) {
        speakStatus(`ไม่พบช่อง ${action.fieldName} ในหน้านี้`);
        return;
      }
      const active = getEditableElement(document.activeElement);
      if (!active || !setEditableValue(active, action.value)) {
        speakStatus(`กรอก ${action.fieldName} ไม่สำเร็จ`);
        return;
      }
      speakStatus(`กรอก ${action.fieldName} แล้ว`);
      return;
    }
    case "fillActiveField": {
      const active = getEditableElement(document.activeElement);
      if (!active) {
        speakStatus("เลือกช่องกรอกข้อมูลก่อน");
        return;
      }
      if (!setEditableValue(active, action.value)) {
        speakStatus("กรอกข้อมูลไม่สำเร็จ");
        return;
      }
      speakStatus("กรอกข้อมูลแล้ว");
      return;
    }
    case "navigate":
      requestNavigationConfirmation(action);
      return;
    case "openAccessibility":
      window.dispatchEvent(new CustomEvent("read-voice:open-accessibility-panel"));
      speakStatus("เปิดตั้งค่าการเข้าถึงแล้ว");
      return;
    case "openCategory":
      openCategoryByName(action.category, normalizedCommand);
      return;
    case "openBook":
      openBookByTitle(action.title);
      return;
    case "search":
      pushSearch(action.keyword, action.contentType);
      speakStatus(`ค้นหา ${action.keyword} แล้ว`);
      return;
    case "reader":
      runReaderCommand(action.command, readerMessage(action.command));
      return;
  }
}

function handleCommand(rawCommand: string) {
  const command = normalizeVoiceCommand(rawCommand);
  if (pendingNavigation.value) {
    if (navigationConfirmCommands.test(command)) {
      confirmPendingNavigation();
      return;
    }
    if (navigationCancelCommands.test(command)) {
      cancelPendingNavigation();
      return;
    }
  }

  const action = parseVoiceCommand(command);
  if (pendingNavigation.value) {
    if (action.type === "navigate") {
      executeVoiceAction(action, command);
      return;
    }

    speakStatus(`กำลังรอยืนยันไปหน้า${pendingNavigation.value.label} กรุณาพูดว่ายืนยันหรือยกเลิก`);
    return;
  }

  if (handleDangerConfirmation(command)) return;
  executeVoiceAction(action, command);
}

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  recognition?.abort();
});

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  detectSpeechSupport();
  isOnboardingOpen.value = localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "1";
});

watch(
  () => route.name,
  (name) => {
    if (isContinuousMode.value && continuousBlockedRouteNames.has(String(name || ""))) {
      setContinuousMode(false);
      speakStatus("ปิดโหมดฟังต่อเนื่องในหน้าที่มีข้อมูลส่วนตัวแล้ว");
    }
  },
);
</script>

<template>
  <aside
    v-if="!isVoiceHidden"
    ref="voiceCommandRef"
    class="voice-command"
    :class="{
      'voice-command--expanded':
        isManualOpen || isStatusOpen || isListening || isContinuousMode,
    }"
    aria-label="สั่งงานด้วยเสียง"
  >
    <button
      class="voice-command__button"
      :class="{ 'is-listening': isListening, 'is-continuous': isContinuousMode }"
      type="button"
      :aria-pressed="isListening"
      @click="startListening"
    >
      <span class="voice-command__mic" aria-hidden="true"></span>
      <span class="voice-command__button-label">{{ buttonLabel }}</span>
    </button>
    <button
      v-if="isSupported"
      class="voice-command__manual-toggle"
      type="button"
      :aria-expanded="isManualOpen"
      @click="isManualOpen = !isManualOpen"
    >
      พิมพ์คำสั่ง
    </button>
    <form
      v-if="isManualOpen || !isSupported"
      class="voice-command__manual"
      @submit.prevent="submitTypedCommand"
    >
      <label for="voice-command-input">คำสั่ง</label>
      <div>
        <input
          id="voice-command-input"
          v-model="typedCommand"
          type="text"
          inputmode="text"
          autocomplete="off"
          placeholder="เช่น ค้นหา นิยายรัก"
        />
        <button type="submit">สั่ง</button>
      </div>
    </form>
    <p
      v-if="isStatusOpen && statusText"
      class="voice-command__status"
      aria-live="polite"
      aria-atomic="true"
    >
      <strong>{{ statusText }}</strong>
      <small v-if="lastCommand">คำสั่งล่าสุด: {{ lastCommand }}</small>
    </p>
  </aside>

  <section
    v-if="isHelpOpen && !isVoiceHidden"
    ref="voiceHelpRef"
    class="voice-help"
    role="dialog"
    aria-modal="false"
    aria-label="รายการคำสั่งเสียง"
  >
    <header>
      <h2>คำสั่งเสียง</h2>
      <button type="button" aria-label="ปิดช่วยเหลือคำสั่งเสียง" @click="isHelpOpen = false">×</button>
    </header>
    <div class="voice-help__sections">
      <section v-for="section in voiceHelpSections" :key="section.title">
        <h3>{{ section.title }}</h3>
        <ul>
          <li v-for="item in section.items" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </section>

  <section
    v-if="isOnboardingOpen && !isVoiceHidden"
    ref="voiceOnboardingRef"
    class="voice-onboarding"
    role="dialog"
    aria-modal="false"
    aria-label="เริ่มใช้งานคำสั่งเสียง"
  >
    <h2>สั่งงานด้วยเสียง</h2>
    <p>กดปุ่มไมค์แล้วอนุญาตไมโครโฟน จากนั้นพูดคำสั่ง เช่น “ช่วยเหลือ”, “ค้นหา นิยายรัก”, “ไปที่ช่องอีเมล” หรือ “อ่านให้ฟัง” ถ้าเครื่องไม่รองรับ ให้พิมพ์คำสั่งแทน</p>
    <div>
      <button type="button" @click="isHelpOpen = true">ดูคำสั่ง</button>
      <button type="button" @click="closeOnboarding">เข้าใจแล้ว</button>
    </div>
  </section>
</template>

<style scoped>
.voice-command {
  position: fixed;
  right: 18px;
  bottom: 82px;
  z-index: 90;
  display: grid;
  justify-items: end;
  gap: 7px;
  max-width: min(320px, calc(100vw - 36px));
  pointer-events: none;
}

.voice-command__button,
.voice-command__manual-toggle,
.voice-command__manual {
  pointer-events: auto;
}

.voice-command__button,
.voice-command__manual-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 42px;
  border: 1px solid color-mix(in srgb, var(--primary) 50%, var(--border));
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-strong);
  box-shadow: var(--shadow);
  cursor: pointer;
  font-weight: 900;
  padding: 0 15px;
}

.voice-command:not(.voice-command--expanded):not(:hover):not(:focus-within) {
  max-width: 52px;
}

.voice-command:not(.voice-command--expanded):not(:hover):not(:focus-within)
  .voice-command__button {
  width: 52px;
  height: 52px;
  min-height: 52px;
  justify-content: center;
  padding: 0;
}

.voice-command:not(.voice-command--expanded):not(:hover):not(:focus-within)
  .voice-command__button-label,
.voice-command:not(.voice-command--expanded):not(:hover):not(:focus-within)
  .voice-command__manual-toggle {
  display: none;
}

.voice-command__button-label {
  white-space: nowrap;
}

.voice-command__manual-toggle {
  min-height: 34px;
  border-color: var(--border);
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  color: var(--text-muted);
  font-size: 14px;
  padding: 0 12px;
}

.voice-command__mic {
  position: relative;
  flex: 0 0 auto;
  width: 14px;
  height: 20px;
  border: 2px solid currentColor;
  border-radius: 999px;
}

.voice-command__mic::before {
  content: "";
  position: absolute;
  right: 3px;
  bottom: -7px;
  left: 3px;
  height: 7px;
  border-bottom: 2px solid currentColor;
  border-left: 2px solid currentColor;
  border-right: 2px solid currentColor;
  border-radius: 0 0 999px 999px;
}

.voice-command__button.is-listening {
  background: var(--primary);
  color: var(--on-primary);
}

.voice-command__button.is-continuous {
  border-color: #f59e0b;
  box-shadow:
    var(--shadow),
    0 0 0 3px rgba(245, 158, 11, 0.18);
}

.voice-command__manual {
  display: grid;
  gap: 6px;
  width: min(320px, calc(100vw - 36px));
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 97%, transparent);
  box-shadow: var(--shadow);
  padding: 10px;
}

.voice-command__manual label {
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 900;
}

.voice-command__manual div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.voice-command__manual input {
  min-width: 0;
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-strong);
  font: inherit;
  padding: 0 10px;
}

.voice-command__manual button {
  min-height: 38px;
  border: 1px solid var(--primary);
  border-radius: 10px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 12px;
}

.voice-command p {
  pointer-events: none;
  max-width: 100%;
  margin: 0;
  overflow: visible;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 800;
  padding: 7px 11px;
  white-space: normal;
}

.voice-command__status {
  display: grid;
  gap: 3px;
}

.voice-command__status strong,
.voice-command__status small {
  display: block;
}

.voice-command__status small {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 650;
}

.voice-help {
  position: fixed;
  right: 18px;
  bottom: 166px;
  z-index: 91;
  width: min(420px, calc(100vw - 36px));
  max-height: min(560px, calc(100vh - 130px));
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow);
  color: var(--text-strong);
  padding: 16px;
}

.voice-help header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.voice-help h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
}

.voice-help header button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-strong);
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.voice-help__sections {
  display: grid;
  gap: 14px;
}

.voice-help section {
  display: grid;
  gap: 6px;
}

.voice-help h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 900;
}

.voice-help ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
}

.voice-help li {
  color: var(--text-muted);
  line-height: 1.55;
}

.voice-onboarding {
  position: fixed;
  right: 18px;
  bottom: 238px;
  z-index: 91;
  display: grid;
  gap: 10px;
  width: min(380px, calc(100vw - 36px));
  border: 1px solid color-mix(in srgb, var(--primary) 40%, var(--border));
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow);
  color: var(--text-strong);
  padding: 16px;
}

.voice-onboarding h2,
.voice-onboarding p {
  margin: 0;
}

.voice-onboarding h2 {
  font-size: 20px;
  font-weight: 900;
}

.voice-onboarding p {
  color: var(--text-muted);
  line-height: 1.65;
}

.voice-onboarding div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.voice-onboarding button {
  min-height: 36px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-strong);
  cursor: pointer;
  font-weight: 900;
  padding: 0 13px;
}

.voice-onboarding button:last-child {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--on-primary);
}

@media (max-width: 640px) {
  .voice-command {
    right: 12px;
    bottom: 76px;
  }

  .voice-command__button {
    justify-content: center;
    width: 44px;
    min-height: 40px;
    gap: 0;
    overflow: hidden;
    font-size: 0;
    padding: 0;
  }

  .voice-command__manual-toggle {
    min-height: 32px;
    font-size: 13px;
    padding: 0 10px;
  }

  .voice-command__mic {
    flex: 0 0 auto;
  }

  .voice-command p {
    display: none;
  }

  .voice-command__manual {
    width: min(300px, calc(100vw - 24px));
  }

  .voice-help {
    right: 12px;
    bottom: 134px;
    width: calc(100vw - 24px);
  }

  .voice-onboarding {
    display: none;
  }
}
</style>
