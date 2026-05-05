import { computed, ref } from "vue";

export type Locale = "th" | "en";

const STORAGE_KEY = "read-voice-locale";
const SITE_NAME = "Read and Voice";

type MessageKey =
  | "a11y.open"
  | "a11y.skipLabel"
  | "a11y.skipMain"
  | "a11y.skipNav"
  | "a11y.skippedMain"
  | "account.adminDashboard"
  | "account.adminTools"
  | "account.approvals"
  | "account.ageVerification"
  | "account.benefits"
  | "account.bookManagement"
  | "account.bookshelf"
  | "account.coin"
  | "account.contentManagement"
  | "account.following"
  | "account.giftCodes"
  | "account.library"
  | "account.login"
  | "account.logout"
  | "account.memberOf"
  | "account.menu"
  | "account.myAccount"
  | "account.noMembership"
  | "account.noExpiry"
  | "account.notifications"
  | "account.orders"
  | "account.package"
  | "account.profile"
  | "account.readingMember"
  | "account.register"
  | "account.reviews"
  | "account.role.admin"
  | "account.role.guest"
  | "account.role.superadmin"
  | "account.role.user"
  | "account.role.writer"
  | "account.roleHint.admin"
  | "account.roleHint.superadmin"
  | "account.roleHint.user"
  | "account.roleHint.writer"
  | "account.settings"
  | "account.settingsSystem"
  | "account.specialMember"
  | "account.statusFailed"
  | "account.untilDate"
  | "account.uploadBook"
  | "account.userDevices"
  | "account.wishlist"
  | "account.writerDashboard"
  | "account.writerSpace"
  | "account.superadmin"
  | "account.superDashboard"
  | "account.userManagement"
  | "account.roleManagement"
  | "common.back"
  | "common.delete"
  | "common.loading"
  | "common.mainMenu"
  | "common.open"
  | "common.read"
  | "common.save"
  | "common.saving"
  | "common.search"
  | "footer.about"
  | "footer.categories"
  | "footer.contact"
  | "footer.content"
  | "footer.copyright"
  | "footer.dataPrivacy"
  | "footer.footerNote"
  | "footer.memberMenu"
  | "footer.privacy"
  | "footer.recent"
  | "footer.report"
  | "footer.terms"
  | "language.en"
  | "language.label"
  | "language.switchToEn"
  | "language.switchToTh"
  | "language.th"
  | "nav.books"
  | "nav.home"
  | "nav.serials"
  | "nav.subscription"
  | "nav.topUp"
  | "notification.all"
  | "notification.confirmDelete"
  | "notification.deleteAll"
  | "notification.empty"
  | "notification.errorDeleteAll"
  | "notification.errorLoad"
  | "notification.errorMark"
  | "notification.errorReadAll"
  | "notification.loading"
  | "notification.settings"
  | "settings.notification.detail"
  | "settings.notification.errorLoad"
  | "settings.notification.errorSave"
  | "settings.notification.promotionsDetail"
  | "settings.notification.promotionsTitle"
  | "settings.notification.saved"
  | "settings.notification.seriesDetail"
  | "settings.notification.seriesTitle"
  | "settings.notification.systemDetail"
  | "settings.notification.systemTitle"
  | "settings.notification.title"
  | "settings.notification.writersDetail"
  | "settings.notification.writersTitle"
  | "theme.dark"
  | "theme.normal"
  | "theme.reading"
  | "theme.switch";

const messages: Record<Locale, Record<MessageKey, string>> = {
  th: {
    "a11y.open": "เปิดหรือปิดตัวช่วยการเข้าถึง",
    "a11y.skipLabel": "ลิงก์ข้ามเนื้อหา",
    "a11y.skipMain": "ข้ามไปยังเนื้อหาหลัก",
    "a11y.skipNav": "ข้ามไปยังเมนูนำทาง",
    "a11y.skippedMain": "ข้ามไปยังเนื้อหาหลักแล้ว",
    "account.adminDashboard": "แดชบอร์ดแอดมิน",
    "account.adminTools": "ผู้ดูแลระบบ",
    "account.approvals": "อนุมัติผลงาน",
    "account.ageVerification": "ยืนยันอายุผู้ใช้งาน",
    "account.benefits": "สิทธิประโยชน์",
    "account.bookManagement": "จัดการหนังสือ",
    "account.bookshelf": "ชั้นหนังสือของฉัน",
    "account.coin": "คอยน์",
    "account.contentManagement": "จัดการภาพ/คอนเทนต์",
    "account.following": "กำลังติดตาม",
    "account.giftCodes": "โค้ดของขวัญ",
    "account.library": "ชั้นหนังสือของฉัน",
    "account.login": "เข้าสู่ระบบ",
    "account.logout": "ออกจากระบบ",
    "account.memberOf": `สมาชิกของ ${SITE_NAME}`,
    "account.menu": "เมนูบัญชี",
    "account.myAccount": "บัญชีของฉัน",
    "account.noMembership": "ยังไม่มีแพ็กเกจสมาชิก",
    "account.noExpiry": "ยังไม่ระบุวันสิ้นสุด",
    "account.notifications": "การแจ้งเตือน",
    "account.orders": "ประวัติคำสั่งซื้อ",
    "account.package": "แพ็กเกจสมาชิก",
    "account.profile": "โปรไฟล์",
    "account.readingMember": "การอ่านและสมาชิก",
    "account.register": "สมัครสมาชิก",
    "account.reviews": "รีวิวของฉัน",
    "account.role.admin": "ผู้ดูแลระบบ",
    "account.role.guest": "ผู้เยี่ยมชม",
    "account.role.superadmin": "ผู้ดูแลสูงสุด",
    "account.role.user": "สมาชิก",
    "account.role.writer": "นักเขียน",
    "account.roleHint.admin": "เห็นเฉพาะเมนูจัดการระบบ",
    "account.roleHint.superadmin": "เห็นเมนูผู้ดูแลระบบและผู้ดูแลสูงสุด",
    "account.roleHint.user": "เห็นเมนูอ่านหนังสือและสมาชิก",
    "account.roleHint.writer": "เห็นเมนูสมาชิกและพื้นที่นักเขียน",
    "account.settings": "การตั้งค่า",
    "account.settingsSystem": "ตั้งค่าระบบ",
    "account.specialMember": "สมาชิกพิเศษ",
    "account.statusFailed": "ตรวจสอบสถานะแพ็กเกจไม่สำเร็จ",
    "account.untilDate": "ถึงวันที่",
    "account.uploadBook": "เพิ่มหนังสือ",
    "account.userDevices": "อุปกรณ์ของฉัน",
    "account.userManagement": "จัดการผู้ใช้",
    "account.roleManagement": "จัดการสิทธิ์",
    "account.wishlist": "รายการที่อยากอ่าน",
    "account.writerDashboard": "แดชบอร์ดนักเขียน",
    "account.writerSpace": "พื้นที่นักเขียน",
    "account.superadmin": "ผู้ดูแลสูงสุด",
    "account.superDashboard": "แดชบอร์ดสูงสุด",
    "common.back": "กลับหน้าก่อนหน้า",
    "common.delete": "ลบ",
    "common.loading": "กำลังโหลด...",
    "common.mainMenu": "เมนูหลัก",
    "common.open": "เปิด",
    "common.read": "อ่านแล้ว",
    "common.save": "บันทึก",
    "common.saving": "กำลังบันทึก...",
    "common.search": "ค้นหาหนังสือ นักเขียน หรือหมวดหมู่",
    "footer.about": "เกี่ยวกับเรา",
    "footer.categories": "หมวดหมู่นิยาย",
    "footer.contact": "ติดต่อเรา",
    "footer.content": "ดูเนื้อหา",
    "footer.copyright": `© 2026 ${SITE_NAME}`,
    "footer.dataPrivacy": "ความเป็นส่วนตัวของข้อมูล",
    "footer.footerNote": "อ่านชัด ฟังสบาย และต่อยอดเป็นระบบอ่านได้จริง",
    "footer.memberMenu": "เมนูของฉัน",
    "footer.privacy": "นโยบายความเป็นส่วนตัว",
    "footer.recent": "อ่านล่าสุด",
    "footer.report": "แจ้งปัญหาอัตโนมัติ",
    "footer.terms": "เงื่อนไขการใช้บริการ",
    "language.en": "English",
    "language.label": "ภาษา",
    "language.switchToEn": "เปลี่ยนเป็นภาษาอังกฤษ",
    "language.switchToTh": "เปลี่ยนเป็นภาษาไทย",
    "language.th": "ไทย",
    "nav.books": "หนังสือ",
    "nav.home": "หน้าแรก",
    "nav.serials": "รายตอน",
    "nav.subscription": "สมัครแพ็กเกจสมาชิก",
    "nav.topUp": "เติมคอยน์",
    "notification.all": "ดูการแจ้งเตือนทั้งหมด",
    "notification.confirmDelete": "ต้องการลบการแจ้งเตือนทั้งหมดใช่ไหม?",
    "notification.deleteAll": "ลบการแจ้งเตือนทั้งหมด",
    "notification.empty": "ยังไม่มีการแจ้งเตือน",
    "notification.errorDeleteAll": "ลบการแจ้งเตือนไม่สำเร็จ",
    "notification.errorLoad": "โหลดการแจ้งเตือนไม่สำเร็จ",
    "notification.errorMark": "เปิดการแจ้งเตือนไม่สำเร็จ",
    "notification.errorReadAll": "อัปเดตการแจ้งเตือนไม่สำเร็จ",
    "notification.loading": "กำลังโหลดการแจ้งเตือน...",
    "notification.settings": "ตั้งค่าการแจ้งเตือน",
    "settings.notification.detail": "เลือกประเภทการแจ้งเตือนที่คุณต้องการรับจากระบบ",
    "settings.notification.errorLoad": "โหลดค่าการแจ้งเตือนจากระบบไม่สำเร็จ",
    "settings.notification.errorSave": "บันทึกการตั้งค่าในเครื่องแล้ว แต่ยังซิงก์กับระบบไม่สำเร็จ",
    "settings.notification.promotionsDetail": "แจ้งเตือนข่าวสารและส่วนลดที่เกี่ยวข้องกับการอ่าน",
    "settings.notification.promotionsTitle": "โปรโมชัน",
    "settings.notification.saved": "บันทึกการตั้งค่าแล้ว",
    "settings.notification.seriesDetail": "แจ้งเตือนเมื่อมีตอนใหม่ของเรื่องที่กำลังติดตาม",
    "settings.notification.seriesTitle": "ตอนใหม่",
    "settings.notification.systemDetail": "แจ้งเตือนเรื่องความปลอดภัยและการเปลี่ยนแปลงสำคัญของบัญชี",
    "settings.notification.systemTitle": "การเปลี่ยนแปลงของระบบ",
    "settings.notification.title": "ตั้งค่าการแจ้งเตือน",
    "settings.notification.writersDetail": "แจ้งเตือนเมื่อมีผลงานใหม่จากนักเขียนที่คุณติดตาม",
    "settings.notification.writersTitle": "นักเขียนที่ติดตาม",
    "theme.dark": "กลางคืน",
    "theme.normal": "ปกติ",
    "theme.reading": "โหมดอ่าน",
    "theme.switch": "เปลี่ยนธีมการแสดงผล",
  },
  en: {
    "a11y.open": "Open or close accessibility tools",
    "a11y.skipLabel": "Skip links",
    "a11y.skipMain": "Skip to main content",
    "a11y.skipNav": "Skip to navigation",
    "a11y.skippedMain": "Skipped to main content",
    "account.adminDashboard": "Admin dashboard",
    "account.adminTools": "Administrator",
    "account.approvals": "Review submissions",
    "account.ageVerification": "Age verification",
    "account.benefits": "Benefits",
    "account.bookManagement": "Manage books",
    "account.bookshelf": "My bookshelf",
    "account.coin": "Coins",
    "account.contentManagement": "Images and content",
    "account.following": "Following",
    "account.giftCodes": "Gift codes",
    "account.library": "My library",
    "account.login": "Log in",
    "account.logout": "Log out",
    "account.memberOf": `${SITE_NAME} member`,
    "account.menu": "Account menu",
    "account.myAccount": "My account",
    "account.noMembership": "No membership package",
    "account.noExpiry": "No expiry date set",
    "account.notifications": "Notifications",
    "account.orders": "Order history",
    "account.package": "Membership package",
    "account.profile": "Profile",
    "account.readingMember": "Reading and membership",
    "account.register": "Register",
    "account.reviews": "My reviews",
    "account.role.admin": "Admin",
    "account.role.guest": "Guest",
    "account.role.superadmin": "Super admin",
    "account.role.user": "Member",
    "account.role.writer": "Writer",
    "account.roleHint.admin": "System management menus only",
    "account.roleHint.superadmin": "Admin and super admin menus are visible",
    "account.roleHint.user": "Reading and member menus are visible",
    "account.roleHint.writer": "Member and writer menus are visible",
    "account.settings": "Settings",
    "account.settingsSystem": "System settings",
    "account.specialMember": "Premium member",
    "account.statusFailed": "Could not check membership status",
    "account.untilDate": "until",
    "account.uploadBook": "Add book",
    "account.userDevices": "My devices",
    "account.userManagement": "Manage users",
    "account.roleManagement": "Manage roles",
    "account.wishlist": "Wishlist",
    "account.writerDashboard": "Writer dashboard",
    "account.writerSpace": "Writer area",
    "account.superadmin": "Super admin",
    "account.superDashboard": "Super dashboard",
    "common.back": "Back",
    "common.delete": "Delete",
    "common.loading": "Loading...",
    "common.mainMenu": "Main menu",
    "common.open": "Open",
    "common.read": "Read",
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.search": "Search books, writers, or categories",
    "footer.about": "About us",
    "footer.categories": "Story categories",
    "footer.contact": "Contact us",
    "footer.content": "Browse content",
    "footer.copyright": `© 2026 ${SITE_NAME}`,
    "footer.dataPrivacy": "Data privacy",
    "footer.footerNote": "Clear reading, comfortable listening, and a real reading ecosystem.",
    "footer.memberMenu": "My menu",
    "footer.privacy": "Privacy policy",
    "footer.recent": "Recently read",
    "footer.report": "Report an issue",
    "footer.terms": "Terms of service",
    "language.en": "English",
    "language.label": "Language",
    "language.switchToEn": "Switch to English",
    "language.switchToTh": "Switch to Thai",
    "language.th": "Thai",
    "nav.books": "Books",
    "nav.home": "Home",
    "nav.serials": "Serials",
    "nav.subscription": "Membership plans",
    "nav.topUp": "Top up coins",
    "notification.all": "View all notifications",
    "notification.confirmDelete": "Delete all notifications?",
    "notification.deleteAll": "Delete all notifications",
    "notification.empty": "No notifications yet",
    "notification.errorDeleteAll": "Could not delete notifications",
    "notification.errorLoad": "Could not load notifications",
    "notification.errorMark": "Could not open this notification",
    "notification.errorReadAll": "Could not update notifications",
    "notification.loading": "Loading notifications...",
    "notification.settings": "Notification settings",
    "settings.notification.detail": "Choose which notifications you want to receive from the system.",
    "settings.notification.errorLoad": "Could not load notification settings from the system",
    "settings.notification.errorSave": "Settings were saved locally, but could not sync with the system",
    "settings.notification.promotionsDetail": "Notify me about reading-related news and discounts",
    "settings.notification.promotionsTitle": "Promotions",
    "settings.notification.saved": "Settings saved",
    "settings.notification.seriesDetail": "Notify me when followed stories publish new episodes",
    "settings.notification.seriesTitle": "New episodes",
    "settings.notification.systemDetail": "Notify me about security and important account changes",
    "settings.notification.systemTitle": "System changes",
    "settings.notification.title": "Notification settings",
    "settings.notification.writersDetail": "Notify me when followed writers publish new works",
    "settings.notification.writersTitle": "Followed writers",
    "theme.dark": "Dark",
    "theme.normal": "Normal",
    "theme.reading": "Reading mode",
    "theme.switch": "Change display theme",
  },
};

function getInitialLocale(): Locale {
  if (typeof localStorage === "undefined") return "th";
  return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "th";
}

const locale = ref<Locale>(getInitialLocale());

function applyDocumentLocale(value: Locale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = value === "th" ? "th" : "en";
  }
}

function setLocale(value: Locale) {
  locale.value = value;
  localStorage.setItem(STORAGE_KEY, value);
  applyDocumentLocale(value);
}

function toggleLocale() {
  setLocale(locale.value === "th" ? "en" : "th");
}

function t(key: MessageKey) {
  return messages[locale.value][key] || messages.th[key] || key;
}

function formatLocaleDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(locale.value === "th" ? "th-TH" : "en-US");
}

function formatLocaleDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(locale.value === "th" ? "th-TH" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function initLocale() {
  applyDocumentLocale(locale.value);
}

export function useI18n() {
  const currentLanguageName = computed(() =>
    locale.value === "th" ? messages.th["language.th"] : messages.en["language.en"],
  );
  const nextLanguageLabel = computed(() =>
    locale.value === "th" ? t("language.switchToEn") : t("language.switchToTh"),
  );

  return {
    currentLanguageName,
    formatLocaleDate,
    formatLocaleDateTime,
    locale,
    nextLanguageLabel,
    setLocale,
    t,
    toggleLocale,
  };
}
