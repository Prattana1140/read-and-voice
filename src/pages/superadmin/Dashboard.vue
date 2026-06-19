<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";
import { getUser, logout } from "../../utils/auth";

type SummaryResponse = {
  total_users: number;
  total_books: number;
  total_categories: number;
  active_subscriptions: number;
  popular_books: Array<{
    id: number;
    title: string;
    total_sales: number;
  }>;
};

type QuickLink = {
  title: string;
  text: string;
  to: string;
  tone: "default" | "accent" | "warning";
};

const router = useRouter();
const currentUser = computed(() => getUser());

const loading = ref(true);
const errorMessage = ref("");
const summary = ref<SummaryResponse>({
  total_users: 0,
  total_books: 0,
  total_categories: 0,
  active_subscriptions: 0,
  popular_books: [],
});

const stats = computed(() => [
  {
    label: "ผู้ใช้งานทั้งหมด",
    value: summary.value.total_users,
    hint: "รวมบัญชีที่มีอยู่ในระบบตอนนี้",
  },
  {
    label: "หนังสือทั้งหมด",
    value: summary.value.total_books,
    hint: "ทั้งที่เผยแพร่แล้วและยังรอจัดการ",
  },
  {
    label: "หมวดหมู่",
    value: summary.value.total_categories,
    hint: "หมวดที่ใช้จัดระเบียบเนื้อหาในร้าน",
  },
  {
    label: "สมาชิกที่ยังใช้งาน",
    value: summary.value.active_subscriptions,
    hint: "สมาชิกที่ active และชำระแล้ว",
  },
]);

const quickLinks = computed<QuickLink[]>(() => [
  {
    title: "จัดการสิทธิ์และบทบาท",
    text: "ตรวจ role, อนุมัติสิทธิ์ admin และจัดการผู้ใช้ระดับสูง",
    to: "/superadmin/roles",
    tone: "accent",
  },
  {
    title: "ผู้ใช้ทั้งหมด",
    text: "ดูสถานะบัญชี ระงับหรือคืนสิทธิ์ และติดตามการดูแลผู้ใช้",
    to: "/superadmin/users",
    tone: "default",
  },
  {
    title: "ตั้งค่าระบบ",
    text: "รวมทางลัดด้าน governance, content และ operational review",
    to: "/superadmin/settings",
    tone: "warning",
  },
  {
    title: "งานอนุมัติหนังสือ",
    text: "ตรวจคิวหนังสือที่รออนุมัติและตำแหน่ง placement",
    to: "/admin/approvals",
    tone: "default",
  },
  {
    title: "สถิติฝั่งแอดมิน",
    text: "เข้าแดชบอร์ดแอดมินเพื่อจัดการ catalog และภาพรวมร้าน",
    to: "/admin",
    tone: "default",
  },
  {
    title: "จัดการเนื้อหาหน้าเว็บ",
    text: "แก้ภาพ hero และเนื้อหาหน้าสาธารณะที่มีผลต่อ conversion",
    to: "/admin/page-content",
    tone: "default",
  },
  {
    title: "System Data Center",
    text: "Review login logs, social accounts, reading activity, devices, benefits, and reserved tables.",
    to: "/admin/system-data",
    tone: "accent",
  },
]);

async function loadSummary() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/admin/stats/summary");
    summary.value = {
      total_users: Number(data?.total_users || 0),
      total_books: Number(data?.total_books || 0),
      total_categories: Number(data?.total_categories || 0),
      active_subscriptions: Number(data?.active_subscriptions || 0),
      popular_books: Array.isArray(data?.popular_books) ? data.popular_books : [],
    };
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดข้อมูลสรุประดับระบบไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

function openRoute(path: string) {
  router.push(path);
}

function signOut() {
  logout();
  router.push("/login");
}

onMounted(loadSummary);
</script>

<template>
  <main class="superadmin-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">ศูนย์ควบคุมผู้ดูแลสูงสุด</p>
        <h1>ภาพรวมและทางลัดสำหรับดูแลระบบ</h1>
        <p class="hero-text">
          ใช้หน้านี้เพื่อตรวจสุขภาพของระบบ ดูตัวเลขหลัก และกระโดดไปยังงานกำกับดูแลที่สำคัญได้เร็วขึ้น
        </p>
        <div class="identity-row">
          <span class="identity-pill">{{ currentUser?.name || "ผู้ดูแลสูงสุด" }}</span>
          <span class="identity-pill muted">{{ currentUser?.email || "ไม่มีอีเมลใน session" }}</span>
        </div>
      </div>

      <div class="hero-actions">
        <button type="button" class="primary-btn" @click="openRoute('/superadmin/settings')">
          เปิดหน้าตั้งค่าระบบ
        </button>
        <button type="button" class="ghost-btn" @click="signOut">ออกจากระบบ</button>
      </div>
    </section>

    <div v-if="loading" class="state-box">กำลังโหลดข้อมูลสรุประบบ...</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>

    <template v-else>
      <section class="stats-grid">
        <article v-for="item in stats" :key="item.label" class="stat-card">
          <span class="stat-label">{{ item.label }}</span>
          <strong class="stat-value">{{ item.value }}</strong>
          <p>{{ item.hint }}</p>
        </article>
      </section>

      <section class="content-grid">
        <article class="panel">
          <div class="panel-head">
            <h2>งานที่ควรเช็กเป็นประจำ</h2>
            <span>Priority Flow</span>
          </div>
          <div class="link-grid">
            <button
              v-for="link in quickLinks"
              :key="link.to"
              type="button"
              class="shortcut-card"
              :class="link.tone"
              @click="openRoute(link.to)"
            >
              <strong>{{ link.title }}</strong>
              <span>{{ link.text }}</span>
            </button>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>หนังสือขายดีล่าสุด</h2>
            <span>Top 5</span>
          </div>

          <div v-if="summary.popular_books.length" class="popular-list">
            <button
              v-for="book in summary.popular_books"
              :key="book.id"
              type="button"
              class="popular-item"
              @click="openRoute(`/book/${book.id}`)"
            >
              <strong>{{ book.title }}</strong>
              <span>{{ book.total_sales }} รายการขาย</span>
            </button>
          </div>
          <div v-else class="empty-box">
            ยังไม่มีข้อมูลหนังสือขายดีจากคำสั่งซื้อที่ชำระเงินแล้ว
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.superadmin-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 56px;
}

.hero-card,
.stat-card,
.panel,
.state-box {
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  padding: 28px;
}

.eyebrow,
.hero-card h1,
.hero-text,
.panel h2,
.panel-head span,
.stat-card p,
.shortcut-card span,
.popular-item span {
  margin: 0;
}

.eyebrow {
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-card h1 {
  color: var(--text-strong);
  font-size: clamp(30px, 5vw, 46px);
}

.hero-text {
  max-width: 760px;
  color: var(--text-muted);
  line-height: 1.8;
  margin-top: 10px;
}

.identity-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.identity-pill {
  border-radius: 999px;
  background: #ecfdf3;
  color: #15803d;
  font-size: 13px;
  font-weight: 800;
  padding: 8px 12px;
}

.identity-pill.muted {
  background: var(--surface-soft);
  color: var(--text-muted);
}

.hero-actions {
  display: grid;
  gap: 10px;
}

.primary-btn,
.ghost-btn,
.shortcut-card,
.popular-item {
  font: inherit;
  cursor: pointer;
}

.primary-btn,
.ghost-btn {
  min-height: 46px;
  border-radius: 14px;
  font-weight: 900;
  padding: 0 16px;
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

.state-box {
  color: var(--text-muted);
  margin-top: 20px;
  padding: 18px;
}

.state-box.error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.stat-card {
  display: grid;
  gap: 8px;
  padding: 22px;
}

.stat-label {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
}

.stat-value {
  color: var(--text-strong);
  font-size: clamp(28px, 4vw, 40px);
}

.stat-card p {
  color: var(--text-muted);
  line-height: 1.6;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
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
  margin-bottom: 14px;
}

.panel h2,
.shortcut-card strong,
.popular-item strong {
  color: var(--text-strong);
}

.panel-head span {
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
  padding: 6px 10px;
}

.link-grid,
.popular-list {
  display: grid;
  gap: 12px;
}

.shortcut-card,
.popular-item,
.empty-box {
  display: grid;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface-soft);
  padding: 16px;
  text-align: left;
}

.shortcut-card.accent {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.shortcut-card.warning {
  background: #fff7ed;
  border-color: #fed7aa;
}

.shortcut-card span,
.popular-item span,
.empty-box {
  color: var(--text-muted);
  line-height: 1.6;
}

@media (max-width: 980px) {
  .stats-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .superadmin-page {
    padding: 8px 18px 22px;
  }

  .hero-card {
    flex-direction: column;
    gap: 9px;
    border-radius: 10px;
    padding: 11px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .eyebrow,
  .stat-label,
  .panel-head span,
  .identity-pill,
  .shortcut-card span,
  .popular-item span {
    font-size: 9px;
  }

  .hero-card h1 {
    font-size: 18px;
    line-height: 1.2;
  }

  .hero-text,
  .stat-card p,
  .empty-box {
    font-size: 10px;
    line-height: 1.35;
  }

  .identity-row {
    gap: 6px;
    margin-top: 9px;
  }

  .identity-pill {
    padding: 4px 8px;
  }

  .hero-actions {
    gap: 7px;
    width: 100%;
  }

  .primary-btn,
  .ghost-btn {
    min-height: 31px;
    border-radius: 8px;
    font-size: 9px;
    padding: 0 9px;
  }

  .state-box {
    margin-top: 9px;
    border-radius: 10px;
    padding: 10px;
    font-size: 10px;
  }

  .stats-grid,
  .content-grid {
    gap: 8px;
    margin-top: 8px;
  }

  .hero-actions button,
  .panel,
  .stat-card {
    width: 100%;
  }

  .panel,
  .stat-card {
    border-radius: 10px;
    padding: 10px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .stat-card {
    gap: 4px;
  }

  .stat-value {
    font-size: 20px;
  }

  .panel-head {
    gap: 7px;
    margin-bottom: 9px;
  }

  .panel h2,
  .shortcut-card strong,
  .popular-item strong {
    font-size: 14px;
  }

  .link-grid,
  .popular-list {
    gap: 7px;
  }

  .shortcut-card,
  .popular-item,
  .empty-box {
    border-radius: 9px;
    gap: 3px;
    padding: 8px;
  }
}

@media (max-width: 420px) {
  .superadmin-page {
    padding: 7px 20px 20px;
  }

  .hero-card h1 {
    font-size: 16px;
  }

  .primary-btn,
  .ghost-btn {
    min-height: 29px;
    font-size: 8px;
  }
}
</style>
