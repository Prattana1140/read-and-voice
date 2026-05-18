<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { announceAccessibilityMessage } from "../utils/accessibility";

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

type ReaderVoiceCommand = "play" | "pause" | "stop" | "next" | "previous";

const router = useRouter();
const route = useRoute();

const isListening = ref(false);
const isSupported = ref(true);
const lastCommand = ref("");
const isContinuousMode = ref(false);
const isHelpOpen = ref(false);
const isOnboardingOpen = ref(false);
const pendingMatches = ref<HTMLElement[]>([]);
const pendingAction = ref<"click" | "focus">("click");
const statusText = ref("กดเพื่อสั่งงานด้วยเสียง");
const pendingDangerAction = ref<null | (() => void)>(null);

let recognition: SpeechRecognitionLike | null = null;
const ONBOARDING_STORAGE_KEY = "read-voice-voice-command-onboarded";
const sensitiveRouteNames = new Set(["Login", "AccountLogin", "Register", "Profile", "ProfileSettings"]);

const voiceHelpItems = [
  "เปิดโหมดสั่งงานต่อเนื่อง / ปิดโหมดสั่งงานต่อเนื่อง",
  "ช่วยเหลือ / ปิดช่วยเหลือ",
  "อ่านตรงนี้ / อ่านทั้งหน้า / หยุดอ่าน",
  "ไปที่ช่อง อีเมล / กรอกว่า สมชาย / ส่งฟอร์ม",
  "เปิดหมวด นิยายรัก / เปิดหนังสือ ชื่อเรื่อง",
  "กดปุ่ม บันทึก / คลิก เข้าสู่ระบบ",
  "เลื่อนลง / เลื่อนขึ้น / ไปบนสุด / ไปล่างสุด",
  "ปิดหน้าต่าง / เปิดเมนู / ปิดเมนู",
  "แถวถัดไป / แถวก่อนหน้า / อ่านแถวนี้ / แก้ไขรายการนี้",
  "อันที่หนึ่ง / อันที่สอง เมื่อระบบพบหลายรายการ",
];

const buttonLabel = computed(() =>
  isListening.value ? "กำลังฟัง..." : "สั่งงานด้วยเสียง",
);

function getRecognition() {
  if (recognition) return recognition;

  const SpeechRecognitionConstructor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionConstructor) {
    isSupported.value = false;
    statusText.value = "เบราว์เซอร์นี้ยังไม่รองรับคำสั่งเสียง";
    return null;
  }

  recognition = new SpeechRecognitionConstructor() as SpeechRecognitionLike;
  recognition.lang = "th-TH";
  recognition.interimResults = false;
  recognition.continuous = isContinuousMode.value;
  recognition.onstart = () => {
    isListening.value = true;
    statusText.value = "กำลังฟังคำสั่ง...";
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
    statusText.value = event.error === "not-allowed"
      ? "กรุณาอนุญาตการใช้ไมโครโฟน"
      : "ฟังคำสั่งไม่สำเร็จ ลองอีกครั้ง";
    announceAccessibilityMessage(statusText.value);
  };
  recognition.onresult = (event) => {
    const transcript = getTranscript(event);
    if (!transcript) {
      statusText.value = "ไม่ได้ยินคำสั่ง";
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

function normalizeCommand(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("th-TH")
    .replace(/[“”"'.!?]/g, "")
    .replace(/\s+/g, " ");
}

function speakStatus(message: string) {
  statusText.value = message;
  announceAccessibilityMessage(message);
  speakText(message, true);
}

function speakText(message: string, interrupt = false) {
  if (!message || !("speechSynthesis" in window)) return;
  if (interrupt) window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "th-TH";
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function startListening() {
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

function setContinuousMode(enabled: boolean) {
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
  speakStatus(message);
}

function extractAfter(command: string, markers: string[]) {
  for (const marker of markers) {
    const index = command.indexOf(marker);
    if (index >= 0) {
      return command.slice(index + marker.length).trim();
    }
  }

  return "";
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
  return normalizeCommand(value).replace(/\s+/g, "");
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

function handleGlobalUiCommand(command: string) {
  const choiceMap: Record<string, number> = {
    "อันที่หนึ่ง": 0,
    "อันแรก": 0,
    "ตัวเลือกแรก": 0,
    "อันที่สอง": 1,
    "ตัวเลือกสอง": 1,
    "อันที่สาม": 2,
    "ตัวเลือกสาม": 2,
    "อันที่สี่": 3,
    "ตัวเลือกสี่": 3,
    "อันที่ห้า": 4,
    "ตัวเลือกห้า": 4,
  };

  if (command in choiceMap) return choosePendingMatch(choiceMap[command]);
  if (/^(ยืนยันลบ|ยืนยันการลบ)$/.test(command)) {
    if (!pendingDangerAction.value) {
      speakStatus("ไม่มีคำสั่งลบที่รอยืนยัน");
      return true;
    }

    const action = pendingDangerAction.value;
    pendingDangerAction.value = null;
    action();
    return true;
  }
  if (/^(ยกเลิกลบ|ไม่ลบ|ยกเลิกคำสั่งลบ)$/.test(command)) {
    pendingDangerAction.value = null;
    speakStatus("ยกเลิกคำสั่งลบแล้ว");
    return true;
  }
  if (/^(ช่วยเหลือ|คำสั่งเสียง|ดูคำสั่ง)$/.test(command)) {
    isHelpOpen.value = true;
    speakText(`คำสั่งที่ใช้ได้ เช่น ${voiceHelpItems.join(". ")}`, true);
    speakStatus("เปิดรายการคำสั่งเสียงแล้ว");
    return true;
  }
  if (/^(ปิดช่วยเหลือ|ปิดรายการคำสั่ง)$/.test(command)) {
    isHelpOpen.value = false;
    speakStatus("ปิดรายการคำสั่งเสียงแล้ว");
    return true;
  }
  if (/^(เปิดโหมดสั่งงานต่อเนื่อง|ฟังต่อเนื่อง|เปิดฟังต่อเนื่อง)$/.test(command)) {
    setContinuousMode(true);
    return true;
  }
  if (/^(ปิดโหมดสั่งงานต่อเนื่อง|หยุดฟังต่อเนื่อง|ปิดฟังต่อเนื่อง)$/.test(command)) {
    setContinuousMode(false);
    return true;
  }
  if (/^(อ่านตรงนี้|อ่านรายการนี้|อ่านช่องนี้|อ่านปุ่มนี้|อ่านสิ่งที่เลือก)$/.test(command)) return readFocusedElement();
  if (/^(อ่านทั้งหน้า|อ่านหน้านี้|สรุปหน้านี้)$/.test(command)) return readPageSummary();
  if (/^(หยุดอ่านออกเสียง|หยุดพูด|หยุดอ่าน feedback|หยุดอ่านฟีดแบ็ก)$/.test(command)) return stopSpokenFeedback();
  if (/^(ปิดหน้าต่าง|ปิดเมนู|ปิดกล่อง|ปิดป๊อปอัป|ปิด popup)$/.test(command)) return closeTopLayer();
  if (/^(เปิดเมนู|เปิดเมนูบัญชี|เปิดแจ้งเตือน)$/.test(command)) return clickElementByName(command.replace(/^เปิด/, ""));
  if (/^(แถวถัดไป|รายการถัดไป)$/.test(command)) return focusRow(1);
  if (/^(แถวก่อนหน้า|รายการก่อนหน้า)$/.test(command)) return focusRow(-1);
  if (/^(อ่านแถวนี้|อ่านรายการนี้)$/.test(command)) return readCurrentRow();
  if (/^(แก้ไขรายการนี้|แก้ไขแถวนี้)$/.test(command)) return clickActionInCurrentRow("แก้ไข");
  if (/^(ลบรายการนี้|ลบแถวนี้)$/.test(command)) return clickActionInCurrentRow("ลบ");
  if (/^(อ่านตัวเลือก|อ่านตัวเลือกทั้งหมด|มีตัวเลือกอะไรบ้าง)$/.test(command)) return readSelectOptions();

  const selectedOption = extractAfter(command, ["เลือกตัวเลือก", "เลือกค่า", "เลือกเป็น"]);
  if (selectedOption) return selectOptionByVoice(selectedOption);

  if (/^(แท็บถัดไป|ช่องถัดไป|ไปช่องถัดไป|โฟกัสถัดไป)$/.test(command)) return moveFocus(1);
  if (/^(แท็บก่อนหน้า|ช่องก่อนหน้า|ไปช่องก่อนหน้า|โฟกัสก่อนหน้า)$/.test(command)) return moveFocus(-1);

  if (/^(เลื่อนลง|ลง)$/.test(command)) {
    window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: "smooth" });
    speakStatus("เลื่อนลงแล้ว");
    return true;
  }

  if (/^(เลื่อนขึ้น|ขึ้น)$/.test(command)) {
    window.scrollBy({ top: -Math.round(window.innerHeight * 0.75), behavior: "smooth" });
    speakStatus("เลื่อนขึ้นแล้ว");
    return true;
  }

  if (/^(บนสุด|ไปบนสุด)$/.test(command)) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    speakStatus("ไปบนสุดแล้ว");
    return true;
  }

  if (/^(ล่างสุด|ไปล่างสุด)$/.test(command)) {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    speakStatus("ไปล่างสุดแล้ว");
    return true;
  }

  if (/^(ย้อนกลับ|กลับ)$/.test(command)) {
    router.back();
    speakStatus("ย้อนกลับแล้ว");
    return true;
  }

  if (/^(ส่งฟอร์ม|ยืนยัน|ตกลง|บันทึก)$/.test(command)) {
    return submitCurrentForm() || clickElementByName(command);
  }

  if (/^(ล้างช่อง|ล้างข้อความ|ลบข้อความ)$/.test(command)) {
    const active = getEditableElement(document.activeElement);
    if (!active) {
      speakStatus("ยังไม่ได้เลือกช่องกรอกข้อมูล");
      return true;
    }

    setEditableValue(active, "");
    speakStatus("ล้างข้อความแล้ว");
    return true;
  }

  const focusTarget = extractAfter(command, ["ไปที่ช่อง", "โฟกัสช่อง", "เลือกช่อง", "ไปที่"]);
  if (focusTarget) {
    if (!focusElementByName(focusTarget)) speakStatus(`ไม่พบ ${focusTarget}`);
    return true;
  }

  const clickTarget = extractAfter(command, ["กดปุ่ม", "คลิก", "กด", "เลือก"]);
  if (clickTarget) {
    if (!clickElementByName(clickTarget)) speakStatus(`ไม่พบปุ่ม ${clickTarget}`);
    return true;
  }

  const fieldFillMatch = command.match(/^(?:กรอก|พิมพ์|ใส่)\s+(.+?)\s+(?:ว่า|เป็น)\s+(.+)$/);
  if (fieldFillMatch) {
    const [, fieldName, value] = fieldFillMatch;
    if (!focusElementByName(fieldName)) {
      speakStatus(`ไม่พบช่อง ${fieldName}`);
      return true;
    }
    const active = getEditableElement(document.activeElement);
    if (!active || !setEditableValue(active, value.trim())) {
      speakStatus(`กรอก ${fieldName} ไม่สำเร็จ`);
      return true;
    }
    speakStatus(`กรอก ${fieldName} แล้ว`);
    return true;
  }

  const fillValue = extractAfter(command, ["กรอกว่า", "พิมพ์ว่า", "ใส่ว่า", "กรอก", "พิมพ์", "ใส่"]);
  if (fillValue) {
    const active = getEditableElement(document.activeElement);
    if (!active) {
      speakStatus("เลือกช่องกรอกข้อมูลก่อน");
      return true;
    }

    if (!setEditableValue(active, fillValue)) {
      speakStatus("กรอกข้อมูลไม่สำเร็จ");
      return true;
    }

    speakStatus("กรอกข้อมูลแล้ว");
    return true;
  }

  return false;
}

function handleCommand(rawCommand: string) {
  const command = normalizeCommand(rawCommand);

  if (/^(หยุดฟัง|ยกเลิก)$/.test(command)) {
    recognition?.stop();
    speakStatus("หยุดฟังคำสั่งแล้ว");
    return;
  }

  if (handleGlobalUiCommand(command)) return;

  if (/หน้าแรก|กลับหน้าแรก|โฮม/.test(command)) {
    router.push({ name: "Home" });
    speakStatus("เปิดหน้าแรกแล้ว");
    return;
  }

  if (/อ่านต่อ|อ่านค้างไว้|อ่านที่ค้าง/.test(command)) {
    router.push({ name: "Serials", query: { view: "continue" } });
    speakStatus("เปิดรายการอ่านต่อแล้ว");
    return;
  }

  if (/นิยายรายตอน|รายตอน/.test(command)) {
    router.push({ name: "Serials" });
    speakStatus("เปิดหน้านิยายรายตอนแล้ว");
    return;
  }

  if (/ร้านหนังสือ|หน้าหนังสือ|หนังสือ|อีบุ๊ก|ebook|e book/.test(command)) {
    router.push({ name: "Store" });
    speakStatus("เปิดหน้าหนังสือแล้ว");
    return;
  }

  if (/ตั้งค่าการเข้าถึง|การเข้าถึง|accessibility/.test(command)) {
    window.dispatchEvent(new CustomEvent("read-voice:open-accessibility-panel"));
    speakStatus("เปิดตั้งค่าการเข้าถึงแล้ว");
    return;
  }

  const category = extractAfter(command, ["เปิดหมวด", "ไปหมวด", "หมวด"]);
  if (category) {
    openCategoryByName(category, command);
    return;
  }

  const bookTitle = extractAfter(command, [
    "เปิดหนังสือ",
    "เปิดเรื่อง",
    "อ่านเรื่อง",
    "อ่านหนังสือ",
    "ไปที่หนังสือ",
    "ไปที่เรื่อง",
  ]);
  if (bookTitle) {
    openBookByTitle(bookTitle);
    return;
  }

  const searchKeyword = extractAfter(command, ["ค้นหา", "หาเรื่อง", "หา"]);
  if (searchKeyword) {
    pushSearch(searchKeyword, /รายตอน|นิยายรายตอน/.test(command) ? "serial" : "all");
    speakStatus(`ค้นหา ${searchKeyword} แล้ว`);
    return;
  }

  if (/เล่นเสียง|เริ่มอ่าน|อ่านให้ฟัง|อ่านออกเสียง|เล่น/.test(command)) {
    runReaderCommand("play", "เริ่มเล่นเสียงแล้ว");
    return;
  }

  if (/หยุดอ่าน|พักเสียง|พักอ่าน|หยุดชั่วคราว|pause/.test(command)) {
    runReaderCommand("pause", "หยุดอ่านชั่วคราวแล้ว");
    return;
  }

  if (/หยุดเสียง|ปิดเสียง|stop/.test(command)) {
    runReaderCommand("stop", "หยุดเสียงแล้ว");
    return;
  }

  if (/ประโยคถัดไป|ย่อหน้าถัดไป|ถัดไป|ต่อไป/.test(command)) {
    runReaderCommand("next", "เลื่อนไปถัดไปแล้ว");
    return;
  }

  if (/ก่อนหน้า|ย้อนกลับประโยค|ย้อนกลับย่อหน้า/.test(command)) {
    runReaderCommand("previous", "ย้อนกลับแล้ว");
    return;
  }

  speakStatus("ยังไม่รู้จักคำสั่งนี้");
}

onBeforeUnmount(() => {
  recognition?.abort();
});

onMounted(() => {
  isOnboardingOpen.value = localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "1";
});

watch(
  () => route.name,
  (name) => {
    if (isContinuousMode.value && sensitiveRouteNames.has(String(name || ""))) {
      setContinuousMode(false);
      speakStatus("ปิดโหมดฟังต่อเนื่องในหน้าที่มีข้อมูลส่วนตัวแล้ว");
    }
  },
);
</script>

<template>
  <aside class="voice-command" aria-label="สั่งงานด้วยเสียง">
    <button
      class="voice-command__button"
      :class="{ 'is-listening': isListening, 'is-continuous': isContinuousMode }"
      type="button"
      :disabled="!isSupported"
      :aria-pressed="isListening"
      @click="startListening"
    >
      <span aria-hidden="true"></span>
      {{ buttonLabel }}
    </button>
    <p>{{ lastCommand || statusText }}</p>
  </aside>

  <section
    v-if="isHelpOpen"
    class="voice-help"
    role="dialog"
    aria-modal="false"
    aria-label="รายการคำสั่งเสียง"
  >
    <header>
      <h2>คำสั่งเสียง</h2>
      <button type="button" aria-label="ปิดช่วยเหลือคำสั่งเสียง" @click="isHelpOpen = false">×</button>
    </header>
    <ul>
      <li v-for="item in voiceHelpItems" :key="item">{{ item }}</li>
    </ul>
  </section>

  <section
    v-if="isOnboardingOpen"
    class="voice-onboarding"
    role="dialog"
    aria-modal="false"
    aria-label="เริ่มใช้งานคำสั่งเสียง"
  >
    <h2>สั่งงานด้วยเสียง</h2>
    <p>กดปุ่มไมค์แล้วอนุญาตไมโครโฟน จากนั้นพูดคำสั่ง เช่น “ช่วยเหลือ”, “ค้นหา นิยายรัก”, “ไปที่ช่องอีเมล” หรือ “อ่านทั้งหน้า”</p>
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
  bottom: 92px;
  z-index: 90;
  display: grid;
  justify-items: end;
  gap: 8px;
  max-width: min(320px, calc(100vw - 36px));
  pointer-events: none;
}

.voice-command__button,
.voice-command p {
  pointer-events: auto;
}

.voice-command__button {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--primary) 50%, var(--border));
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-strong);
  box-shadow: var(--shadow);
  cursor: pointer;
  font-weight: 900;
  padding: 0 15px;
}

.voice-command__button span {
  position: relative;
  width: 14px;
  height: 20px;
  border: 2px solid currentColor;
  border-radius: 999px;
}

.voice-command__button span::before {
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

.voice-command__button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.voice-command p {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
  padding: 7px 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  font-size: 18px;
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
  font-size: 20px;
  line-height: 1;
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
  font-size: 18px;
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
    bottom: 82px;
  }

  .voice-command__button {
    min-height: 40px;
    padding: 0 12px;
  }

  .voice-command p {
    display: none;
  }

  .voice-help {
    right: 12px;
    bottom: 134px;
    width: calc(100vw - 24px);
  }

  .voice-onboarding {
    right: 12px;
    bottom: 134px;
    width: calc(100vw - 24px);
  }
}
</style>
