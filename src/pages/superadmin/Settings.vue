<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api, { API_BASE_URL } from "../../utils/api";
import { getUser, logout } from "../../utils/auth";

type ChecklistKey =
  | "rolesReviewed"
  | "approvalsChecked"
  | "pageContentReviewed"
  | "catalogReviewed";

type ReadinessCheck = {
  name: string;
  ok: boolean;
  configured?: boolean;
  message: string;
};

type SystemSettings = {
  registration_enabled: boolean;
  writer_applications_enabled: boolean;
  manual_payment_enabled: boolean;
  support_form_enabled: boolean;
  admin_password_reset_enabled: boolean;
  maintenance_notice: string;
  support_email: string;
  updated_note: string;
};

type OperationsStatus = {
  checked_at?: string;
  social_login?: {
    line?: {
      configured: boolean;
      client_id_set: boolean;
      client_secret_set: boolean;
      callback_url: string;
    };
  };
  password_reset?: {
    configured: boolean;
    provider: "resend" | "webhook" | null;
    email_from_set: boolean;
    preview_enabled: boolean;
    admin_fallback_enabled: boolean;
  };
  content?: {
    total_books: number;
    missing_structured_content: number;
    content_audit_command: string;
  };
  queues?: {
    pending_book_approvals: number;
    pending_coin_topups: number;
    open_support_tickets: number;
  };
  monitoring?: {
    command: string;
    daily_command: string;
  };
  backup?: {
    configured: boolean;
    directory: string;
    latest_file: string | null;
    latest_at: string | null;
    latest_bytes: number;
    latest_age_hours: number | null;
    command: string;
    retention_days: number;
  };
};

const router = useRouter();
const currentUser = computed(() => getUser());

const loading = ref(true);
const saving = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");
const readiness = ref<ReadinessCheck[]>([]);
const operations = ref<OperationsStatus | null>(null);

const checklist = reactive<Record<ChecklistKey, boolean>>({
  rolesReviewed: false,
  approvalsChecked: false,
  pageContentReviewed: false,
  catalogReviewed: false,
});

const settings = reactive<SystemSettings>({
  registration_enabled: true,
  writer_applications_enabled: true,
  manual_payment_enabled: true,
  support_form_enabled: true,
  admin_password_reset_enabled: true,
  maintenance_notice: "",
  support_email: "",
  updated_note: "",
});

const checklistItems = [
  {
    key: "rolesReviewed" as const,
    title: "ตรวจ role และผู้ดูแลระบบ",
    text: "ทบทวนสิทธิ์ admin/superadmin ก่อนเปิดใช้งานจริง",
  },
  {
    key: "approvalsChecked" as const,
    title: "เคลียร์คิวอนุมัติหนังสือ",
    text: "ตรวจหนังสือและ placement ที่รออนุมัติ",
  },
  {
    key: "pageContentReviewed" as const,
    title: "ทบทวนเนื้อหาหน้าสาธารณะ",
    text: "ตรวจ hero, banner และข้อความหน้าเว็บหลัก",
  },
  {
    key: "catalogReviewed" as const,
    title: "สำรวจ catalog และหมวดหมู่",
    text: "เช็กหมวดหมู่ หนังสือจริง และ content ตั้งต้น",
  },
];

const readinessPassed = computed(() => readiness.value.filter((item) => item.ok).length);
const readinessFailed = computed(() => readiness.value.filter((item) => !item.ok));
const lineConfigured = computed(() => Boolean(operations.value?.social_login?.line?.configured));
const passwordResetReady = computed(() => Boolean(operations.value?.password_reset?.configured));
const passwordResetLabel = computed(() => {
  const reset = operations.value?.password_reset;
  if (reset?.provider === "resend") return "Resend email";
  if (reset?.provider === "webhook") return "Email webhook";
  if (reset?.admin_fallback_enabled) return "ให้แอดมินช่วยรีเซ็ต";
  return "ยังไม่พร้อม";
});
const backupSummary = computed(() => {
  const backup = operations.value?.backup;
  if (!backup?.latest_file) return "ยังไม่มี backup";
  const age = backup.latest_age_hours;
  return age === null ? backup.latest_file : `${backup.latest_file} (${age} ชม.ก่อน)`;
});

const quickLinks = [
  { title: "ผู้ใช้ทั้งหมด", text: "บัญชีและผู้ดูแลระบบ", to: "/superadmin/users" },
  { title: "อนุมัติหนังสือ", text: "คิวงานจากนักเขียน", to: "/admin/approvals" },
  { title: "คำขอช่วยเหลือ", text: "คำร้องจากหน้าช่วยเหลือ", to: "/admin/support-tickets" },
  { title: "คำขอรีเซ็ตรหัสผ่าน", text: "รีเซ็ตรหัสผ่านโดยแอดมินช่วยดูแล", to: "/admin/password-resets" },
  { title: "อนุมัติชำระเงิน", text: "อนุมัติรายการเติมเหรียญ", to: "/admin/payments" },
];

function applySettings(payload: Partial<SystemSettings>) {
  Object.assign(settings, {
    ...settings,
    ...payload,
  });
}

async function loadAll() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [checklistRes, systemRes, readinessRes, operationsRes] = await Promise.all([
      api.get("/admin/settings/checklist"),
      api.get("/admin/settings/system"),
      api.get("/admin/settings/readiness"),
      api.get("/admin/settings/operations"),
    ]);

    Object.assign(checklist, checklistRes.data?.checklist || {});
    applySettings(systemRes.data?.settings || {});
    readiness.value = Array.isArray(readinessRes.data?.checks) ? readinessRes.data.checks : [];
    operations.value = operationsRes.data || null;
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || "โหลดการตั้งค่าระบบไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function saveChecklist() {
  await api.put("/admin/settings/checklist", { checklist });
}

async function toggleChecklist(key: ChecklistKey) {
  checklist[key] = !checklist[key];
  statusMessage.value = "";
  errorMessage.value = "";

  try {
    await saveChecklist();
    statusMessage.value = "บันทึก checklist แล้ว";
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || "บันทึก checklist ไม่สำเร็จ";
  }
}

async function saveSystemSettings() {
  saving.value = true;
  statusMessage.value = "";
  errorMessage.value = "";

  try {
    const { data } = await api.put("/admin/settings/system", { settings });
    applySettings(data?.settings || {});
    statusMessage.value = data?.message || "บันทึกการตั้งค่าระบบแล้ว";
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || "บันทึกการตั้งค่าระบบไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

function openRoute(path: string) {
  router.push(path);
}

function signOut() {
  logout();
  router.push("/login");
}

onMounted(loadAll);
</script>

<template>
  <main class="settings-page">
    <section class="page-head">
      <div>
        <p class="eyebrow">ตั้งค่าผู้ดูแลสูงสุด</p>
        <h1>ตั้งค่าระบบ</h1>
        <p>จัดการ launch checklist, operational settings และ readiness ก่อนเปิดให้ผู้ใช้จริง</p>
      </div>
      <div class="session-box">
        <strong>{{ currentUser?.name || "Superadmin" }}</strong>
        <span>{{ currentUser?.email || "ไม่พบอีเมลใน session" }}</span>
        <small>{{ API_BASE_URL }}</small>
        <button type="button" class="ghost-btn" @click="signOut">ออกจากระบบ</button>
      </div>
    </section>

    <p v-if="statusMessage" class="notice success">{{ statusMessage }}</p>
    <p v-if="errorMessage" class="notice error">{{ errorMessage }}</p>
    <section v-if="loading" class="panel">กำลังโหลดการตั้งค่า...</section>

    <template v-else>
      <section class="summary-grid">
        <article>
          <strong>{{ readinessPassed }}/{{ readiness.length }}</strong>
          <span>readiness ผ่าน</span>
        </article>
        <article>
          <strong>{{ readinessFailed.length }}</strong>
          <span>ต้องแก้ก่อน deploy</span>
        </article>
        <article>
          <strong>{{ settings.manual_payment_enabled ? "เปิด" : "ปิด" }}</strong>
          <span>ชำระเงินแบบตรวจเอง</span>
        </article>
        <article>
          <strong>{{ settings.admin_password_reset_enabled ? "เปิด" : "ปิด" }}</strong>
          <span>รีเซ็ตรหัสผ่านโดยแอดมิน</span>
        </article>
      </section>

      <section class="operations-grid" v-if="operations">
        <article class="operation-card" :class="{ failed: !lineConfigured }">
          <span>เข้าสู่ระบบด้วย LINE</span>
          <strong>{{ lineConfigured ? "พร้อม" : "ยังไม่พร้อม" }}</strong>
          <small>
            ID: {{ operations.social_login?.line?.client_id_set ? "ตั้งแล้ว" : "ยังไม่ตั้ง" }}
            · Secret: {{ operations.social_login?.line?.client_secret_set ? "ตั้งแล้ว" : "ยังไม่ตั้ง" }}
          </small>
          <code>{{ operations.social_login?.line?.callback_url }}</code>
        </article>

        <article class="operation-card" :class="{ failed: !passwordResetReady }">
          <span>อีเมลรีเซ็ตรหัสผ่าน</span>
          <strong>{{ passwordResetLabel }}</strong>
          <small>
            From: {{ operations.password_reset?.email_from_set ? "ตั้งแล้ว" : "ยังไม่ตั้ง" }}
            · Preview: {{ operations.password_reset?.preview_enabled ? "เปิด" : "ปิด" }}
          </small>
          <code>{{ passwordResetReady ? "ส่งลิงก์รีเซ็ตผ่านอีเมลได้แล้ว" : "ตั้ง RESEND_API_KEY + EMAIL_FROM หรือ PASSWORD_RESET_EMAIL_WEBHOOK_URL" }}</code>
        </article>

        <article class="operation-card" :class="{ failed: operations.content?.missing_structured_content }">
          <span>เนื้อหาสำหรับอ่านและเสียง</span>
          <strong>{{ operations.content?.missing_structured_content || 0 }} เล่มต้องจัดโครงสร้าง</strong>
          <small>ทั้งหมด {{ operations.content?.total_books || 0 }} เล่ม</small>
          <code>{{ operations.content?.content_audit_command }}</code>
        </article>

        <article class="operation-card">
          <span>ติดตามระบบ</span>
          <strong>พร้อมตั้ง schedule</strong>
          <small>ใช้ daily command สำหรับตรวจระบบ + audit + backup</small>
          <code>{{ operations.monitoring?.daily_command }}</code>
        </article>

        <article class="operation-card" :class="{ failed: !operations.backup?.latest_file }">
          <span>สำรองข้อมูล</span>
          <strong>{{ backupSummary }}</strong>
          <small>Retention {{ operations.backup?.retention_days || 14 }} วัน</small>
          <code>{{ operations.backup?.command }}</code>
        </article>

        <article class="operation-card compact">
          <span>คิวอนุมัติหนังสือ</span>
          <strong>{{ operations.queues?.pending_book_approvals || 0 }}</strong>
        </article>

        <article class="operation-card compact">
          <span>คิวเติม coin</span>
          <strong>{{ operations.queues?.pending_coin_topups || 0 }}</strong>
        </article>

        <article class="operation-card compact">
          <span>คำขอช่วยเหลือ</span>
          <strong>{{ operations.queues?.open_support_tickets || 0 }}</strong>
        </article>
      </section>

      <section class="layout-grid">
        <article class="panel">
          <div class="panel-head">
            <h2>ตั้งค่าระบบ</h2>
            <button type="button" :disabled="saving" @click="saveSystemSettings">
              {{ saving ? "กำลังบันทึก..." : "บันทึก" }}
            </button>
          </div>

          <div class="toggle-list">
            <label>
              <input v-model="settings.registration_enabled" type="checkbox" />
              <span>เปิดสมัครสมาชิก</span>
            </label>
            <label>
              <input v-model="settings.writer_applications_enabled" type="checkbox" />
              <span>เปิดงานนักเขียน/อัปโหลด</span>
            </label>
            <label>
              <input v-model="settings.manual_payment_enabled" type="checkbox" />
              <span>เปิดเติม coin แบบ manual approval</span>
            </label>
            <label>
              <input v-model="settings.support_form_enabled" type="checkbox" />
              <span>เปิดฟอร์ม support</span>
            </label>
            <label>
              <input v-model="settings.admin_password_reset_enabled" type="checkbox" />
              <span>เปิดรีเซ็ตรหัสผ่านโดยแอดมิน</span>
            </label>
          </div>

          <label class="field">
            <span>อีเมล support</span>
            <input v-model="settings.support_email" type="email" placeholder="support@example.com" />
          </label>
          <label class="field">
            <span>ประกาศ maintenance</span>
            <textarea v-model="settings.maintenance_notice" rows="4" />
          </label>
          <label class="field">
            <span>หมายเหตุภายใน</span>
            <textarea v-model="settings.updated_note" rows="4" />
          </label>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>เช็กลิสต์ก่อนเปิดใช้งาน</h2>
            <span>{{ checklistItems.filter((item) => checklist[item.key]).length }}/{{ checklistItems.length }}</span>
          </div>

          <div class="checklist">
            <button
              v-for="item in checklistItems"
              :key="item.key"
              type="button"
              class="check-item"
              :class="{ done: checklist[item.key] }"
              @click="toggleChecklist(item.key)"
            >
              <strong>{{ item.title }}</strong>
              <span>{{ item.text }}</span>
            </button>
          </div>
        </article>
      </section>

      <section class="layout-grid">
        <article class="panel">
          <div class="panel-head">
            <h2>ความพร้อมใช้งานจริง</h2>
            <button type="button" class="ghost-btn" @click="loadAll">รีเฟรช</button>
          </div>

          <div class="readiness-list">
            <div v-for="item in readiness" :key="item.name" class="readiness-row" :class="{ failed: !item.ok }">
              <strong>{{ item.ok ? "ผ่าน" : "ต้องแก้" }}</strong>
              <div>
                <span>{{ item.name }}</span>
                <small>{{ item.message }}</small>
              </div>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>ทางลัดดูแลระบบ</h2>
          </div>

          <div class="link-grid">
            <button v-for="link in quickLinks" :key="link.to" type="button" @click="openRoute(link.to)">
              <strong>{{ link.title }}</strong>
              <span>{{ link.text }}</span>
            </button>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.settings-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 56px;
}

.page-head,
.panel,
.summary-grid article {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.page-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: stretch;
  padding: 24px;
}

.eyebrow,
h1,
h2,
p {
  margin: 0;
}

.eyebrow {
  color: var(--primary-strong);
  font-weight: 900;
}

h1,
h2,
strong {
  color: var(--text-strong);
}

.page-head p:last-child,
span,
small {
  color: var(--text-muted);
}

.session-box {
  display: grid;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 16px;
}

button {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 900;
  padding: 0 14px;
}

.ghost-btn {
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-strong);
}

button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.notice {
  margin: 16px 0 0;
  border-radius: 8px;
  padding: 12px 14px;
  font-weight: 800;
}

.notice.success {
  background: #dcfce7;
  color: #166534;
}

.notice.error {
  background: #fee2e2;
  color: #991b1b;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.summary-grid article {
  padding: 18px;
}

.summary-grid strong {
  display: block;
  font-size: 28px;
}

.operations-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.operation-card {
  display: grid;
  gap: 8px;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 16px;
}

.operation-card.failed {
  border-color: #fecaca;
  background: #fff7f7;
}

.operation-card.compact {
  align-content: center;
}

.operation-card strong {
  font-size: 22px;
}

.operation-card code {
  overflow: hidden;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 14px;
  padding: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.panel {
  padding: 22px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.toggle-list,
.checklist,
.readiness-list,
.link-grid {
  display: grid;
  gap: 10px;
}

.toggle-list label,
.check-item,
.readiness-row,
.link-grid button {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
}

.toggle-list label {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  font-weight: 800;
}

.toggle-list input {
  width: 18px;
  height: 18px;
}

.field {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  color: var(--text-strong);
  font-weight: 800;
}

input[type="email"],
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-strong);
  font: inherit;
  padding: 12px;
}

textarea {
  resize: vertical;
}

.check-item,
.link-grid button {
  display: grid;
  gap: 4px;
  color: var(--text-strong);
  padding: 14px;
  text-align: left;
}

.check-item.done {
  border-color: #86efac;
  background: #f0fdf4;
}

.readiness-row {
  display: grid;
  grid-template-columns: 74px 1fr;
  gap: 10px;
  align-items: start;
  padding: 12px;
}

.readiness-row > strong {
  width: fit-content;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 14px;
  padding: 5px 9px;
}

.readiness-row.failed > strong {
  background: #fee2e2;
  color: #991b1b;
}

.readiness-row div {
  display: grid;
  gap: 4px;
}

@media (max-width: 900px) {
  .page-head,
  .summary-grid,
  .operations-grid,
  .layout-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .settings-page {
    padding: 8px 18px 22px;
  }

  .page-head,
  .panel,
  .summary-grid article,
  .operation-card {
    border-radius: 10px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .page-head {
    gap: 9px;
    padding: 10px;
  }

  .eyebrow,
  span,
  small,
  .readiness-row > strong,
  .operation-card code {
    font-size: 11px;
  }

  h1 {
    font-size: 20px;
    line-height: 1.2;
  }

  h2,
  .operation-card strong {
    font-size: 16px;
  }

  p,
  .check-item,
  .readiness-row,
  .toggle-list label,
  input[type="email"],
  textarea {
    font-size: 12px;
    line-height: 1.35;
  }

  .session-box,
  .summary-grid article,
  .operation-card,
  .panel,
  .toggle-list label,
  .check-item,
  .readiness-row,
  .link-grid button {
    border-radius: 8px;
    padding: 8px;
  }

  button {
    min-height: 29px;
    border-radius: 7px;
    font-size: 11px;
    padding: 0 9px;
  }

  .notice {
    margin-top: 9px;
    border-radius: 8px;
    font-size: 12px;
    padding: 8px 9px;
  }

  .summary-grid,
  .operations-grid,
  .layout-grid {
    gap: 8px;
    margin-top: 9px;
  }

  .summary-grid strong {
    font-size: 20px;
  }

  .operation-card {
    gap: 5px;
  }

  .operation-card code {
    padding: 5px;
  }

  .panel {
    padding: 10px;
  }

  .panel-head {
    gap: 7px;
    margin-bottom: 9px;
  }

  .toggle-list,
  .checklist,
  .readiness-list,
  .link-grid {
    gap: 7px;
  }

  .toggle-list input {
    width: 14px;
    height: 14px;
  }

  .field {
    gap: 5px;
    margin-top: 9px;
  }

  input[type="email"],
  textarea {
    border-radius: 7px;
    padding: 8px;
  }

  .readiness-row {
    grid-template-columns: 56px 1fr;
    gap: 7px;
  }

  .readiness-row > strong {
    padding: 3px 6px;
  }
}
</style>
