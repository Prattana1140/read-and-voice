<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api from "../../utils/api";
import { useI18n, type Locale } from "../../utils/i18n";

type SectionKey =
  | "login-events"
  | "social-connections"
  | "reading-activity"
  | "user-assets"
  | "benefits"
  | "empty-data";

type Section = {
  key: SectionKey;
  title: string;
  description: string;
};

type SystemCopy = {
  pageEyebrow: string;
  pageTitle: string;
  pageDescription: string;
  navLabel: string;
  refresh: string;
  loading: string;
  loadError: string;
  sections: Record<SectionKey, Omit<Section, "key">>;
  summaryLabels: Record<string, string>;
  table: Record<string, string>;
  status: Record<string, string>;
};

const copy: Record<Locale, SystemCopy> = {
  th: {
    pageEyebrow: "รายงานแอดมิน",
    pageTitle: "ศูนย์ข้อมูลระบบ",
    pageDescription:
      "รวมข้อมูลจากหลังบ้านที่มีอยู่แล้ว แต่ยังไม่มีหน้าจอสำหรับตรวจสอบอย่างชัดเจน",
    navLabel: "หมวดข้อมูลระบบ",
    refresh: "รีเฟรช",
    loading: "กำลังโหลดข้อมูล...",
    loadError: "โหลดข้อมูลระบบไม่สำเร็จ",
    sections: {
      "login-events": {
        title: "เหตุการณ์เข้าสู่ระบบ",
        description: "รายการเข้าสู่ระบบล่าสุด ผู้ให้บริการ IP และข้อความข้อผิดพลาด",
      },
      "social-connections": {
        title: "บัญชีโซเชียลที่เชื่อมต่อ",
        description: "บัญชี LINE ที่เชื่อมไว้ และข้อมูลตัวตนจากผู้ให้บริการ",
      },
      "reading-activity": {
        title: "กิจกรรมการอ่าน",
        description: "ยอดเข้าชมหนังสือ ตอน และความคืบหน้าการอ่านล่าสุด",
      },
      "user-assets": {
        title: "ข้อมูลผู้ใช้",
        description: "อุปกรณ์ การแจ้งเตือน และบุ๊กมาร์กที่บันทึกไว้ของผู้ใช้",
      },
      benefits: {
        title: "สิทธิประโยชน์",
        description: "โค้ดของขวัญ สิทธิประโยชน์ของผู้ใช้ และข้อมูลยืนยันอายุ",
      },
      "empty-data": {
        title: "ตารางว่าง/สำรอง",
        description: "ตารางที่เตรียมไว้สำหรับฟีเจอร์ในอนาคต หรือยังไม่มีข้อมูล",
      },
    },
    summaryLabels: {
      age_verifications: "การยืนยันอายุ",
      book_views: "ยอดเข้าชมหนังสือ",
      bookmarks: "บุ๊กมาร์ก",
      empty_tables: "ตารางว่าง",
      episode_views: "ยอดเข้าชมตอน",
      total: "ทั้งหมด",
      failure_count: "ไม่สำเร็จ",
      gift_codes: "โค้ดของขวัญ",
      reading_progress: "ความคืบหน้าการอ่าน",
      success_count: "สำเร็จ",
      total_tables: "ตารางทั้งหมด",
      user_benefits: "สิทธิประโยชน์ผู้ใช้",
      user_devices: "อุปกรณ์ผู้ใช้",
      user_notifications: "การแจ้งเตือนผู้ใช้",
    },
    table: {
      ageVerifications: "การยืนยันอายุ",
      book: "หนังสือ",
      bookmarks: "บุ๊กมาร์ก",
      code: "โค้ด",
      connected: "เชื่อมต่อเมื่อ",
      created: "สร้างเมื่อ",
      description: "คำอธิบาย",
      device: "อุปกรณ์",
      devices: "อุปกรณ์",
      displayName: "ชื่อที่แสดง",
      document: "เอกสาร",
      episode: "ตอน",
      expires: "หมดอายุ",
      giftCodes: "โค้ดของขวัญ",
      ip: "IP",
      lastRead: "อ่านล่าสุด",
      lastUsed: "ใช้ล่าสุด",
      lastViewed: "เข้าชมล่าสุด",
      message: "ข้อความ",
      mode: "โหมด",
      note: "หมายเหตุ",
      notifications: "การแจ้งเตือน",
      page: "หน้า",
      platform: "แพลตฟอร์ม",
      progress: "ความคืบหน้า",
      provider: "ผู้ให้บริการ",
      providerEmail: "อีเมลผู้ให้บริการ",
      read: "อ่านแล้ว",
      readers: "ผู้อ่าน",
      redeemed: "ใช้เมื่อ",
      recentProgress: "ความคืบหน้าการอ่านล่าสุด",
      rows: "แถว",
      status: "สถานะ",
      table: "ตาราง",
      time: "เวลา",
      title: "ชื่อ",
      topBooks: "หนังสือยอดเข้าชมสูงสุด",
      topEpisodes: "ตอนยอดเข้าชมสูงสุด",
      type: "ประเภท",
      updated: "อัปเดต",
      user: "ผู้ใช้",
      userBenefits: "สิทธิประโยชน์ผู้ใช้",
      views: "ยอดเข้าชม",
    },
    status: {
      active: "ใช้งานอยู่",
      approved: "อนุมัติแล้ว",
      available: "พร้อมใช้งาน",
      banned: "ถูกระงับ",
      cancelled: "ยกเลิกแล้ว",
      draft: "ฉบับร่าง",
      empty: "ว่าง",
      failed: "ไม่สำเร็จ",
      hasData: "มีข้อมูล",
      inactive: "ไม่ใช้งาน",
      not_submitted: "ยังไม่ส่ง",
      paid: "ชำระแล้ว",
      pending: "รอดำเนินการ",
      read: "อ่านแล้ว",
      rejected: "ปฏิเสธแล้ว",
      success: "สำเร็จ",
      unread: "ยังไม่อ่าน",
    },
  },
  en: {
    pageEyebrow: "Admin reports",
    pageTitle: "System Data Center",
    pageDescription:
      "A single place for data that existed in the backend but did not have a clear frontend surface yet.",
    navLabel: "System data sections",
    refresh: "Refresh",
    loading: "Loading data...",
    loadError: "Unable to load system data",
    sections: {
      "login-events": {
        title: "Login events",
        description: "Recent sign-in attempts, providers, IP addresses, and failure notes.",
      },
      "social-connections": {
        title: "Social connections",
        description: "Linked LINE accounts and provider identity data.",
      },
      "reading-activity": {
        title: "Reading activity",
        description: "Book views, episode views, and last reading progress.",
      },
      "user-assets": {
        title: "User assets",
        description: "Devices, notifications, and bookmarks stored for users.",
      },
      benefits: {
        title: "Benefits",
        description: "Gift codes, user benefits, and age verification records.",
      },
      "empty-data": {
        title: "Empty/reserved tables",
        description: "Tables that exist for future features or currently have no data.",
      },
    },
    summaryLabels: {
      age_verifications: "Age verifications",
      book_views: "Book views",
      bookmarks: "Bookmarks",
      empty_tables: "Empty tables",
      episode_views: "Episode views",
      total: "Total",
      failure_count: "Failure count",
      gift_codes: "Gift codes",
      reading_progress: "Reading progress",
      success_count: "Success count",
      total_tables: "Total tables",
      user_benefits: "User benefits",
      user_devices: "User devices",
      user_notifications: "User notifications",
    },
    table: {
      ageVerifications: "Age verifications",
      book: "Book",
      bookmarks: "Bookmarks",
      code: "Code",
      connected: "Connected",
      created: "Created",
      description: "Description",
      device: "Device",
      devices: "Devices",
      displayName: "Display name",
      document: "Document",
      episode: "Episode",
      expires: "Expires",
      giftCodes: "Gift codes",
      ip: "IP",
      lastRead: "Last read",
      lastUsed: "Last used",
      lastViewed: "Last viewed",
      message: "Message",
      mode: "Mode",
      note: "Note",
      notifications: "Notifications",
      page: "Page",
      platform: "Platform",
      progress: "Progress",
      provider: "Provider",
      providerEmail: "Provider email",
      read: "Read",
      readers: "Readers",
      redeemed: "Redeemed",
      recentProgress: "Recent reading progress",
      rows: "Rows",
      status: "Status",
      table: "Table",
      time: "Time",
      title: "Title",
      topBooks: "Top books by views",
      topEpisodes: "Top episodes by views",
      type: "Type",
      updated: "Updated",
      user: "User",
      userBenefits: "User benefits",
      views: "Views",
    },
    status: {
      active: "active",
      approved: "approved",
      available: "available",
      banned: "banned",
      cancelled: "cancelled",
      draft: "draft",
      empty: "empty",
      failed: "failed",
      hasData: "has data",
      inactive: "inactive",
      not_submitted: "not submitted",
      paid: "paid",
      pending: "pending",
      read: "read",
      rejected: "rejected",
      success: "success",
      unread: "unread",
    },
  },
};

const { locale } = useI18n();
const pageCopy = computed(() => copy[locale.value]);
const sections = computed<Section[]>(() =>
  (Object.keys(pageCopy.value.sections) as SectionKey[]).map((key) => ({
    key,
    ...pageCopy.value.sections[key],
  })),
);

const activeSection = ref<SectionKey>("login-events");
const loading = ref(false);
const errorMessage = ref("");
const payload = ref<any>({ summary: {}, items: [] });

const currentSection = computed(
  () =>
    sections.value.find((section) => section.key === activeSection.value) ||
    sections.value[0],
);

const summaryCards = computed(() => {
  const summary = payload.value?.summary || {};

  if (Array.isArray(summary.providers)) {
    return [
      { label: summaryLabel("total"), value: summary.total || 0 },
      ...summary.providers.map((item: any) => ({
        label: item.provider || "unknown",
        value: item.total || 0,
      })),
    ];
  }

  return Object.entries(summary)
    .filter(([, value]) => typeof value !== "object")
    .map(([key, value]) => ({
      label: summaryLabel(key),
      value: value ?? 0,
    }));
});

function summaryLabel(key: string) {
  const mapped = pageCopy.value.summaryLabels[key];
  if (mapped) return mapped;
  return key.replace(/_/g, " ");
}

function tableText(key: keyof SystemCopy["table"]) {
  return pageCopy.value.table[key];
}

function statusText(key: keyof SystemCopy["status"]) {
  return pageCopy.value.status[key];
}

function formatStatus(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "-";
  return pageCopy.value.status[normalized] || normalized.replace(/_/g, " ");
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(locale.value === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(value: unknown) {
  const normalized = String(value || "").toLowerCase();
  return {
    ok: ["1", "true", "success", "active", "available", "approved", "paid"].includes(normalized),
    warn: ["pending", "draft", "not_submitted"].includes(normalized),
    bad: ["0", "false", "failed", "banned", "rejected", "cancelled"].includes(normalized),
  };
}

async function loadSection(section = activeSection.value) {
  try {
    loading.value = true;
    errorMessage.value = "";
    activeSection.value = section;
    const { data } = await api.get(`/admin/stats/system-data/${section}`);
    payload.value = data || { summary: {}, items: [] };
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || pageCopy.value.loadError;
    payload.value = { summary: {}, items: [] };
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadSection());
</script>

<template>
  <main class="system-page">
    <section class="page-head">
      <div>
        <p class="eyebrow">{{ pageCopy.pageEyebrow }}</p>
        <h1>{{ pageCopy.pageTitle }}</h1>
        <p>{{ pageCopy.pageDescription }}</p>
      </div>
    </section>

    <nav class="tabbar" :aria-label="pageCopy.navLabel">
      <button
        v-for="section in sections"
        :key="section.key"
        type="button"
        :class="{ active: section.key === activeSection }"
        @click="loadSection(section.key)"
      >
        {{ section.title }}
      </button>
    </nav>

    <section class="section-intro">
      <div>
        <h2>{{ currentSection.title }}</h2>
        <p>{{ currentSection.description }}</p>
      </div>
      <button type="button" @click="loadSection()">{{ pageCopy.refresh }}</button>
    </section>

    <div v-if="loading" class="state-box">{{ pageCopy.loading }}</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>

    <template v-else>
      <section v-if="summaryCards.length" class="summary-grid">
        <article v-for="card in summaryCards" :key="card.label" class="summary-card">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
        </article>
      </section>

      <section v-if="activeSection === 'login-events'" class="table-card">
        <table>
          <thead>
            <tr>
              <th>{{ tableText("time") }}</th>
              <th>{{ tableText("user") }}</th>
              <th>{{ tableText("provider") }}</th>
              <th>{{ tableText("status") }}</th>
              <th>{{ tableText("ip") }}</th>
              <th>{{ tableText("message") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in payload.items" :key="item.id">
              <td>{{ formatDate(item.created_at) }}</td>
              <td>{{ text(item.name || item.email || item.user_id) }}</td>
              <td>{{ text(item.provider) }}</td>
              <td><span class="pill" :class="statusClass(item.success)">{{ Number(item.success) === 1 ? statusText("success") : statusText("failed") }}</span></td>
              <td>{{ text(item.ip_address) }}</td>
              <td>{{ text(item.message) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-else-if="activeSection === 'social-connections'" class="table-card">
        <table>
          <thead>
            <tr>
              <th>{{ tableText("user") }}</th>
              <th>{{ tableText("provider") }}</th>
              <th>{{ tableText("displayName") }}</th>
              <th>{{ tableText("providerEmail") }}</th>
              <th>{{ tableText("connected") }}</th>
              <th>{{ tableText("updated") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in payload.items" :key="item.id">
              <td>{{ text(item.name || item.account_email || item.user_id) }}</td>
              <td>{{ text(item.provider) }}</td>
              <td>{{ text(item.display_name) }}</td>
              <td>{{ text(item.email) }}</td>
              <td>{{ formatDate(item.connected_at) }}</td>
              <td>{{ formatDate(item.updated_at) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-else-if="activeSection === 'reading-activity'" class="stack">
        <article class="table-card">
          <h3>{{ tableText("topBooks") }}</h3>
          <table>
            <thead><tr><th>{{ tableText("book") }}</th><th>{{ tableText("views") }}</th><th>{{ tableText("readers") }}</th><th>{{ tableText("lastViewed") }}</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.top_books" :key="item.id">
                <td>{{ text(item.title || item.id) }}</td>
                <td>{{ text(item.views) }}</td>
                <td>{{ text(item.readers) }}</td>
                <td>{{ formatDate(item.last_viewed_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="table-card">
          <h3>{{ tableText("topEpisodes") }}</h3>
          <table>
            <thead><tr><th>{{ tableText("episode") }}</th><th>{{ tableText("book") }}</th><th>{{ tableText("views") }}</th><th>{{ tableText("readers") }}</th><th>{{ tableText("lastViewed") }}</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.top_episodes" :key="item.id">
                <td>{{ text(item.title || item.id) }}</td>
                <td>{{ text(item.book_title) }}</td>
                <td>{{ text(item.views) }}</td>
                <td>{{ text(item.readers) }}</td>
                <td>{{ formatDate(item.last_viewed_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="table-card">
          <h3>{{ tableText("recentProgress") }}</h3>
          <table>
            <thead><tr><th>{{ tableText("user") }}</th><th>{{ tableText("book") }}</th><th>{{ tableText("mode") }}</th><th>{{ tableText("page") }}</th><th>{{ tableText("progress") }}</th><th>{{ tableText("lastRead") }}</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.progress" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td>{{ text(item.book_title || item.book_id) }}</td>
                <td>{{ text(item.reading_mode) }}</td>
                <td>{{ text(item.current_page) }}</td>
                <td>{{ text(item.progress_percent) }}%</td>
                <td>{{ formatDate(item.last_read_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>

      <section v-else-if="activeSection === 'user-assets'" class="stack">
        <article class="table-card">
          <h3>{{ tableText("devices") }}</h3>
          <table>
            <thead><tr><th>{{ tableText("user") }}</th><th>{{ tableText("device") }}</th><th>{{ tableText("platform") }}</th><th>{{ tableText("lastUsed") }}</th><th>{{ tableText("created") }}</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.devices" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td>{{ text(item.device_name) }}</td>
                <td>{{ text(item.platform) }}</td>
                <td>{{ formatDate(item.last_used_at) }}</td>
                <td>{{ formatDate(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="table-card">
          <h3>{{ tableText("notifications") }}</h3>
          <table>
            <thead><tr><th>{{ tableText("user") }}</th><th>{{ tableText("type") }}</th><th>{{ tableText("title") }}</th><th>{{ tableText("read") }}</th><th>{{ tableText("created") }}</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.notifications" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td>{{ text(item.type) }}</td>
                <td>{{ text(item.title) }}</td>
                <td><span class="pill" :class="statusClass(item.is_read)">{{ Number(item.is_read) === 1 ? statusText("read") : statusText("unread") }}</span></td>
                <td>{{ formatDate(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="table-card">
          <h3>{{ tableText("bookmarks") }}</h3>
          <table>
            <thead><tr><th>{{ tableText("user") }}</th><th>{{ tableText("book") }}</th><th>{{ tableText("page") }}</th><th>{{ tableText("note") }}</th><th>{{ tableText("created") }}</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.bookmarks" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td>{{ text(item.book_title || item.book_id) }}</td>
                <td>{{ text(item.page_number) }}</td>
                <td>{{ text(item.note) }}</td>
                <td>{{ formatDate(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>

      <section v-else-if="activeSection === 'benefits'" class="stack">
        <article class="table-card">
          <h3>{{ tableText("userBenefits") }}</h3>
          <table>
            <thead><tr><th>{{ tableText("user") }}</th><th>{{ tableText("title") }}</th><th>{{ tableText("status") }}</th><th>{{ tableText("expires") }}</th><th>{{ tableText("created") }}</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.benefits" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td>{{ text(item.title) }}</td>
                <td><span class="pill" :class="statusClass(item.status)">{{ formatStatus(item.status) }}</span></td>
                <td>{{ formatDate(item.expires_at) }}</td>
                <td>{{ formatDate(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="table-card">
          <h3>{{ tableText("giftCodes") }}</h3>
          <table>
            <thead><tr><th>{{ tableText("user") }}</th><th>{{ tableText("code") }}</th><th>{{ tableText("status") }}</th><th>{{ tableText("description") }}</th><th>{{ tableText("redeemed") }}</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.gift_codes" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td>{{ text(item.code) }}</td>
                <td><span class="pill" :class="statusClass(item.status)">{{ formatStatus(item.status) }}</span></td>
                <td>{{ text(item.description) }}</td>
                <td>{{ formatDate(item.redeemed_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="table-card">
          <h3>{{ tableText("ageVerifications") }}</h3>
          <table>
            <thead><tr><th>{{ tableText("user") }}</th><th>{{ tableText("status") }}</th><th>{{ tableText("document") }}</th><th>{{ tableText("note") }}</th><th>{{ tableText("updated") }}</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.age_verifications" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td><span class="pill" :class="statusClass(item.status)">{{ formatStatus(item.status) }}</span></td>
                <td>{{ text(item.document_type) }}</td>
                <td>{{ text(item.note) }}</td>
                <td>{{ formatDate(item.updated_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>

      <section v-else class="table-card">
        <table>
          <thead>
            <tr>
              <th>{{ tableText("table") }}</th>
              <th>{{ tableText("rows") }}</th>
              <th>{{ tableText("status") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in payload.items" :key="item.table">
              <td>{{ item.table }}</td>
              <td>{{ item.total }}</td>
              <td>
                <span class="pill" :class="item.total > 0 ? 'ok' : 'warn'">
                  {{ item.total > 0 ? statusText("hasData") : statusText("empty") }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </main>
</template>

<style scoped>
.system-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--page-block, 28px) var(--page-gutter, 20px) 56px;
}

.page-head,
.section-intro,
.summary-card,
.table-card,
.state-box {
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.page-head {
  border-radius: 18px;
  padding: 20px;
}

.eyebrow,
.page-head h1,
.page-head p,
.section-intro h2,
.section-intro p,
.table-card h3 {
  margin: 0;
}

.eyebrow {
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.page-head h1 {
  color: var(--text-strong);
  font-size: clamp(24px, 3.2vw, 34px);
  line-height: 1.18;
}

.page-head p,
.section-intro p {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.tabbar {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 12px 0;
}

.tabbar button,
.section-intro button {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-strong);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  min-height: 34px;
  padding: 0 12px;
  white-space: nowrap;
}

.tabbar button.active,
.section-intro button {
  border-color: transparent;
  background: var(--primary);
  color: var(--on-primary);
}

.section-intro {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  border-radius: 16px;
  padding: 16px;
}

.section-intro h2,
.table-card h3 {
  color: var(--text-strong);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.summary-card {
  display: grid;
  gap: 6px;
  border-radius: 14px;
  padding: 14px;
}

.summary-card span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.summary-card strong {
  color: var(--text-strong);
  font-size: 24px;
}

.stack {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.table-card {
  border-radius: 18px;
  margin-top: 16px;
  overflow-x: auto;
  padding: 16px;
}

.stack .table-card {
  margin-top: 0;
}

.table-card h3 {
  margin-bottom: 12px;
}

table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid var(--border);
  color: var(--text);
  padding: 12px;
  text-align: left;
  vertical-align: top;
}

th {
  color: var(--text-strong);
  font-size: 13px;
}

.pill {
  display: inline-flex;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 900;
  padding: 5px 9px;
  white-space: nowrap;
}

.pill.ok,
.ok {
  background: #dcfce7;
  color: #166534;
}

.pill.warn,
.warn {
  background: #fef3c7;
  color: #92400e;
}

.pill.bad,
.bad {
  background: #fee2e2;
  color: #991b1b;
}

.state-box {
  border-radius: 18px;
  color: var(--text-muted);
  margin-top: 16px;
  padding: 18px;
}

.state-box.error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-intro {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 560px) {
  .system-page {
    padding: 8px 18px 22px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 7px;
    margin-top: 9px;
  }

  .page-head,
  .section-intro,
  .table-card {
    border-radius: 10px;
    padding: 10px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .eyebrow,
  .summary-card span,
  th,
  .pill {
    font-size: 9px;
  }

  .page-head h1 {
    font-size: 18px;
    line-height: 1.2;
  }

  .page-head p,
  .section-intro p,
  td {
    font-size: 10px;
    line-height: 1.35;
  }

  .tabbar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    overflow: visible;
    padding: 6px 0;
  }

  .tabbar button,
  .section-intro button {
    min-height: 25px;
    border-radius: 999px;
    font-size: 7.5px;
    line-height: 1.15;
    padding: 0 7px;
  }

  .tabbar button {
    width: 100%;
    min-width: 0;
    max-width: none;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .section-intro {
    gap: 8px;
  }

  .section-intro h2,
  .table-card h3 {
    font-size: 14px;
  }

  .summary-card {
    border-radius: 9px;
    gap: 3px;
    padding: 8px;
  }

  .summary-card strong {
    font-size: 18px;
  }

  .stack {
    gap: 9px;
    margin-top: 9px;
  }

  .table-card {
    margin-top: 9px;
  }

  .table-card h3 {
    margin-bottom: 8px;
  }

  table {
    min-width: 0;
    table-layout: fixed;
  }

  th,
  td {
    overflow-wrap: anywhere;
    padding: 5px 4px;
    word-break: break-word;
  }

  th {
    font-size: 7px;
    line-height: 1.2;
  }

  td {
    font-size: 7px;
    line-height: 1.25;
  }

  .pill {
    max-width: 100%;
    min-height: 14px;
    justify-content: center;
    border-radius: 5px;
    font-size: 6px;
    line-height: 1.1;
    padding: 1px 3px;
    white-space: normal;
  }

  .state-box {
    margin-top: 9px;
    border-radius: 10px;
    padding: 10px;
    font-size: 10px;
  }
}
</style>
