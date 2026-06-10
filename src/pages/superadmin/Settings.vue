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

const router = useRouter();
const currentUser = computed(() => getUser());

const loading = ref(true);
const saving = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");
const readiness = ref<ReadinessCheck[]>([]);

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

const quickLinks = [
  { title: "จัดการ role", text: "สิทธิ์และสถานะผู้ใช้", to: "/superadmin/roles" },
  { title: "ผู้ใช้ทั้งหมด", text: "บัญชีและผู้ดูแลระบบ", to: "/superadmin/users" },
  { title: "อนุมัติหนังสือ", text: "คิวงานจากนักเขียน", to: "/admin/approvals" },
  { title: "Support Tickets", text: "คำร้องจากหน้า support", to: "/admin/support-tickets" },
  { title: "Password Resets", text: "รีเซ็ตรหัสผ่านแบบ admin-assisted", to: "/admin/password-resets" },
  { title: "Manual Payments", text: "อนุมัติเติม coin", to: "/admin/payments" },
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
    const [checklistRes, systemRes, readinessRes] = await Promise.all([
      api.get("/admin/settings/checklist"),
      api.get("/admin/settings/system"),
      api.get("/admin/settings/readiness"),
    ]);

    Object.assign(checklist, checklistRes.data?.checklist || {});
    applySettings(systemRes.data?.settings || {});
    readiness.value = Array.isArray(readinessRes.data?.checks) ? readinessRes.data.checks : [];
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
        <p class="eyebrow">Superadmin Settings</p>
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
          <span>manual payment</span>
        </article>
        <article>
          <strong>{{ settings.admin_password_reset_enabled ? "เปิด" : "ปิด" }}</strong>
          <span>admin password reset</span>
        </article>
      </section>

      <section class="layout-grid">
        <article class="panel">
          <div class="panel-head">
            <h2>System Settings</h2>
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
            <h2>Launch Checklist</h2>
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
            <h2>Production Readiness</h2>
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
  font-size: 26px;
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
  font-size: 12px;
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
  .layout-grid {
    grid-template-columns: 1fr;
  }
}
</style>
