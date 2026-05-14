<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api from "../../utils/api";

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

const sections: Section[] = [
  {
    key: "login-events",
    title: "Login events",
    description: "Recent sign-in attempts, providers, IP addresses, and failure notes.",
  },
  {
    key: "social-connections",
    title: "Social connections",
    description: "Linked LINE/Facebook accounts and provider identity data.",
  },
  {
    key: "reading-activity",
    title: "Reading activity",
    description: "Book views, episode views, and last reading progress.",
  },
  {
    key: "user-assets",
    title: "User assets",
    description: "Devices, notifications, and bookmarks stored for users.",
  },
  {
    key: "benefits",
    title: "Benefits",
    description: "Gift codes, user benefits, and age verification records.",
  },
  {
    key: "empty-data",
    title: "Empty/reserved tables",
    description: "Tables that exist for future features or currently have no data.",
  },
];

const activeSection = ref<SectionKey>("login-events");
const loading = ref(false);
const errorMessage = ref("");
const payload = ref<any>({ summary: {}, items: [] });

const currentSection = computed(
  () => sections.find((section) => section.key === activeSection.value) || sections[0],
);

const summaryCards = computed(() => {
  const summary = payload.value?.summary || {};

  if (Array.isArray(summary.providers)) {
    return [
      { label: "Total", value: summary.total || 0 },
      ...summary.providers.map((item: any) => ({
        label: item.provider || "unknown",
        value: item.total || 0,
      })),
    ];
  }

  return Object.entries(summary)
    .filter(([, value]) => typeof value !== "object")
    .map(([key, value]) => ({
      label: key.replace(/_/g, " "),
      value: value ?? 0,
    }));
});

function text(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH", {
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
      error?.response?.data?.message || "Unable to load system data";
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
        <p class="eyebrow">Admin reports</p>
        <h1>System Data Center</h1>
        <p>
          A single place for data that existed in the backend but did not have a clear frontend surface yet.
        </p>
      </div>
    </section>

    <nav class="tabbar" aria-label="System data sections">
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
      <button type="button" @click="loadSection()">Refresh</button>
    </section>

    <div v-if="loading" class="state-box">Loading data...</div>
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
              <th>Time</th>
              <th>User</th>
              <th>Provider</th>
              <th>Status</th>
              <th>IP</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in payload.items" :key="item.id">
              <td>{{ formatDate(item.created_at) }}</td>
              <td>{{ text(item.name || item.email || item.user_id) }}</td>
              <td>{{ text(item.provider) }}</td>
              <td><span class="pill" :class="statusClass(item.success)">{{ Number(item.success) === 1 ? "success" : "failed" }}</span></td>
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
              <th>User</th>
              <th>Provider</th>
              <th>Display name</th>
              <th>Provider email</th>
              <th>Connected</th>
              <th>Updated</th>
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
          <h3>Top books by views</h3>
          <table>
            <thead><tr><th>Book</th><th>Views</th><th>Readers</th><th>Last viewed</th></tr></thead>
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
          <h3>Top episodes by views</h3>
          <table>
            <thead><tr><th>Episode</th><th>Book</th><th>Views</th><th>Readers</th><th>Last viewed</th></tr></thead>
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
          <h3>Recent reading progress</h3>
          <table>
            <thead><tr><th>User</th><th>Book</th><th>Mode</th><th>Page</th><th>Progress</th><th>Last read</th></tr></thead>
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
          <h3>Devices</h3>
          <table>
            <thead><tr><th>User</th><th>Device</th><th>Platform</th><th>Last used</th><th>Created</th></tr></thead>
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
          <h3>Notifications</h3>
          <table>
            <thead><tr><th>User</th><th>Type</th><th>Title</th><th>Read</th><th>Created</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.notifications" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td>{{ text(item.type) }}</td>
                <td>{{ text(item.title) }}</td>
                <td><span class="pill" :class="statusClass(item.is_read)">{{ Number(item.is_read) === 1 ? "read" : "unread" }}</span></td>
                <td>{{ formatDate(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="table-card">
          <h3>Bookmarks</h3>
          <table>
            <thead><tr><th>User</th><th>Book</th><th>Page</th><th>Note</th><th>Created</th></tr></thead>
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
          <h3>User benefits</h3>
          <table>
            <thead><tr><th>User</th><th>Title</th><th>Status</th><th>Expires</th><th>Created</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.benefits" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td>{{ text(item.title) }}</td>
                <td><span class="pill" :class="statusClass(item.status)">{{ text(item.status) }}</span></td>
                <td>{{ formatDate(item.expires_at) }}</td>
                <td>{{ formatDate(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="table-card">
          <h3>Gift codes</h3>
          <table>
            <thead><tr><th>User</th><th>Code</th><th>Status</th><th>Description</th><th>Redeemed</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.gift_codes" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td>{{ text(item.code) }}</td>
                <td><span class="pill" :class="statusClass(item.status)">{{ text(item.status) }}</span></td>
                <td>{{ text(item.description) }}</td>
                <td>{{ formatDate(item.redeemed_at) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="table-card">
          <h3>Age verifications</h3>
          <table>
            <thead><tr><th>User</th><th>Status</th><th>Document</th><th>Note</th><th>Updated</th></tr></thead>
            <tbody>
              <tr v-for="item in payload.items.age_verifications" :key="item.id">
                <td>{{ text(item.name || item.email || item.user_id) }}</td>
                <td><span class="pill" :class="statusClass(item.status)">{{ text(item.status) }}</span></td>
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
              <th>Table</th>
              <th>Rows</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in payload.items" :key="item.table">
              <td>{{ item.table }}</td>
              <td>{{ item.total }}</td>
              <td>
                <span class="pill" :class="item.total > 0 ? 'ok' : 'warn'">
                  {{ item.total > 0 ? "has data" : "empty" }}
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
  border-radius: 22px;
  padding: 24px;
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
  font-size: clamp(30px, 5vw, 44px);
}

.page-head p,
.section-intro p {
  color: var(--text-muted);
  line-height: 1.7;
}

.tabbar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 14px 0;
}

.tabbar button,
.section-intro button {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-strong);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  min-height: 40px;
  padding: 0 14px;
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
  border-radius: 18px;
  padding: 18px;
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
  border-radius: 16px;
  padding: 16px;
}

.summary-card span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.summary-card strong {
  color: var(--text-strong);
  font-size: 28px;
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
    padding-inline: var(--page-gutter, 14px);
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .page-head,
  .section-intro,
  .table-card {
    border-radius: 14px;
    padding: 14px;
  }
}
</style>
