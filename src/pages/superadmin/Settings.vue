<script setup lang="ts">
import { computed, reactive } from "vue";
import { useRouter } from "vue-router";
import { API_BASE_URL } from "../../utils/api";
import { getUser, logout } from "../../utils/auth";

type ChecklistKey =
  | "rolesReviewed"
  | "approvalsChecked"
  | "pageContentReviewed"
  | "catalogReviewed";

type ChecklistItem = {
  key: ChecklistKey;
  title: string;
  text: string;
};

type SettingsLink = {
  title: string;
  text: string;
  to: string;
};

const router = useRouter();
const currentUser = computed(() => getUser());

const storageKey = "rav-superadmin-settings-checklist";
const savedChecklist = (() => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
})();

const checklistState = reactive<Record<ChecklistKey, boolean>>({
  rolesReviewed: Boolean(savedChecklist.rolesReviewed),
  approvalsChecked: Boolean(savedChecklist.approvalsChecked),
  pageContentReviewed: Boolean(savedChecklist.pageContentReviewed),
  catalogReviewed: Boolean(savedChecklist.catalogReviewed),
});

const checklistItems = computed<ChecklistItem[]>(() => [
  {
    key: "rolesReviewed",
    title: "ตรวจ role และผู้ดูแลระบบ",
    text: "ทบทวนสิทธิ์ของ admin และ superadmin ว่ายังตรงกับหน้าที่ปัจจุบัน",
  },
  {
    key: "approvalsChecked",
    title: "เคลียร์คิวอนุมัติหนังสือ",
    text: "เช็กหนังสือที่รออนุมัติหรือ placement ที่ยังไม่ได้จัดการ",
  },
  {
    key: "pageContentReviewed",
    title: "ทบทวนเนื้อหาหน้าสาธารณะ",
    text: "เช็ก hero banner และข้อความสำคัญว่าทันกับโปรโมชันปัจจุบัน",
  },
  {
    key: "catalogReviewed",
    title: "สำรวจ catalog และหมวดหมู่",
    text: "ดูว่าหมวดหมู่และข้อมูลหนังสือยังจัดระเบียบได้ดีสำหรับหน้าร้าน",
  },
]);

const governanceLinks = computed<SettingsLink[]>(() => [
  {
    title: "บทบาทและสิทธิ์",
    text: "จัดการ role ของผู้ใช้ รวมถึงสิทธิ์ admin และ superadmin",
    to: "/superadmin/roles",
  },
  {
    title: "ผู้ใช้ทั้งหมด",
    text: "ตรวจสถานะบัญชี อนุมัติ admin และติดตามผู้ใช้ที่ต้องดูแล",
    to: "/superadmin/users",
  },
  {
    title: "สมาชิกและสถานะ",
    text: "ดูแลผู้ใช้ในมุม admin เช่นระงับบัญชีหรือคืนสถานะ",
    to: "/admin/members",
  },
]);

const contentLinks = computed<SettingsLink[]>(() => [
  {
    title: "อนุมัติหนังสือ",
    text: "จัดคิว approval และ placement สำหรับหน้า shelf",
    to: "/admin/approvals",
  },
  {
    title: "จัดการหน้าเว็บ",
    text: "แก้ subscription hero และเนื้อหาหน้าสาธารณะ",
    to: "/admin/page-content",
  },
  {
    title: "หมวดหมู่หนังสือ",
    text: "จัดระเบียบ category ให้ตรงกับเนื้อหาและการค้นหา",
    to: "/admin/categories",
  },
  {
    title: "แดชบอร์ดแอดมิน",
    text: "ดูภาพรวมฝั่งปฏิบัติการของร้านและ catalog",
    to: "/admin",
  },
]);

function persistChecklist() {
  localStorage.setItem(storageKey, JSON.stringify(checklistState));
}

function toggleChecklist(key: ChecklistKey) {
  checklistState[key] = !checklistState[key];
  persistChecklist();
}

function openRoute(path: string) {
  router.push(path);
}

function signOut() {
  logout();
  router.push("/login");
}
</script>

<template>
  <main class="settings-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">System Settings</p>
        <h1>ศูนย์ควบคุมงานกำกับดูแลระบบ</h1>
        <p class="hero-text">
          หน้านี้รวมทางลัดและรายการตรวจเช็กสำหรับงาน superadmin ที่ต้องตามต่อเป็นประจำ
          เพื่อให้การดูแลสิทธิ์ เนื้อหา และการปฏิบัติการไม่ตกหล่น
        </p>
      </div>

      <div class="session-card">
        <strong>{{ currentUser?.name || "Superadmin" }}</strong>
        <span>{{ currentUser?.email || "ไม่พบอีเมลใน session" }}</span>
        <small>API: {{ API_BASE_URL }}</small>
        <div class="session-actions">
          <button type="button" class="ghost-btn" @click="openRoute('/superadmin')">
            กลับแดชบอร์ด
          </button>
          <button type="button" class="primary-btn" @click="signOut">ออกจากระบบ</button>
        </div>
      </div>
    </section>

    <section class="layout-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>Operational Checklist</h2>
          <span>บันทึกในเครื่องนี้</span>
        </div>

        <div class="checklist">
          <button
            v-for="item in checklistItems"
            :key="item.key"
            type="button"
            class="check-item"
            :class="{ done: checklistState[item.key] }"
            @click="toggleChecklist(item.key)"
          >
            <div class="check-badge">{{ checklistState[item.key] ? "Done" : "Todo" }}</div>
            <strong>{{ item.title }}</strong>
            <span>{{ item.text }}</span>
          </button>
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>Governance</h2>
          <span>สิทธิ์และผู้ใช้</span>
        </div>

        <div class="link-grid">
          <button
            v-for="link in governanceLinks"
            :key="link.to"
            type="button"
            class="nav-card"
            @click="openRoute(link.to)"
          >
            <strong>{{ link.title }}</strong>
            <span>{{ link.text }}</span>
          </button>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>Content And Commerce</h2>
        <span>Catalog Operations</span>
      </div>

      <div class="link-grid wide">
        <button
          v-for="link in contentLinks"
          :key="link.to"
          type="button"
          class="nav-card"
          @click="openRoute(link.to)"
        >
          <strong>{{ link.title }}</strong>
          <span>{{ link.text }}</span>
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.settings-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 20px 56px;
}

.hero-card,
.panel,
.session-card,
.check-item,
.nav-card {
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: stretch;
}

.hero-card,
.panel {
  padding: 24px;
}

.eyebrow,
.hero-card h1,
.hero-text,
.panel h2,
.panel-head span,
.session-card strong,
.session-card span,
.session-card small,
.check-item strong,
.check-item span,
.nav-card strong,
.nav-card span {
  margin: 0;
}

.eyebrow {
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-card h1,
.panel h2,
.check-item strong,
.nav-card strong,
.session-card strong {
  color: var(--text-strong);
}

.hero-card h1 {
  font-size: clamp(30px, 5vw, 44px);
}

.hero-text,
.check-item span,
.nav-card span,
.session-card span,
.session-card small {
  color: var(--text-muted);
  line-height: 1.75;
}

.session-card {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.session-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.primary-btn,
.ghost-btn {
  min-height: 44px;
  border-radius: 14px;
  font: inherit;
  font-weight: 900;
  padding: 0 16px;
  cursor: pointer;
}

.primary-btn {
  border: 0;
  background: var(--primary);
  color: var(--on-primary);
}

.ghost-btn {
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-strong);
}

.layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr);
  gap: 16px;
  margin-top: 16px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.panel-head span {
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
  padding: 6px 10px;
}

.checklist,
.link-grid {
  display: grid;
  gap: 12px;
}

.link-grid.wide {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.check-item,
.nav-card {
  display: grid;
  gap: 6px;
  background: var(--surface-soft);
  padding: 16px;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.check-item.done {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.check-badge {
  width: fit-content;
  border-radius: 999px;
  background: #111827;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  padding: 6px 10px;
  text-transform: uppercase;
}

.check-item.done .check-badge {
  background: #15803d;
}

@media (max-width: 980px) {
  .hero-card,
  .layout-grid,
  .link-grid.wide {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .settings-page {
    padding-inline: 16px;
  }
}
</style>
