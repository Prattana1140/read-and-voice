<script setup lang="ts">
import { computed } from "vue";

type UserRole = "user" | "writer" | "admin" | "superadmin";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: UserRole;
  status?: string;
};

type SummaryCard = {
  label: string;
  value: string;
  detail: string;
};

const user: StoredUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
})();

const role = computed<UserRole>(() => user.role || "user");

const roleLabel = computed(() => {
  const labels: Record<UserRole, string> = {
    user: "สมาชิกทั่วไป",
    writer: "นักเขียน",
    admin: "ผู้ดูแลระบบ",
    superadmin: "ผู้ดูแลระบบสูงสุด",
  };

  return labels[role.value];
});

const summaryCards = computed<SummaryCard[]>(() => {
  const summaries: Record<UserRole, SummaryCard[]> = {
    user: [
      { label: "หนังสือของฉัน", value: "0", detail: "หนังสือที่อยู่ในชั้นอ่าน" },
      { label: "รายการโปรด", value: "0", detail: "หนังสือที่บันทึกไว้" },
      { label: "คำสั่งซื้อล่าสุด", value: "0", detail: "ประวัติการซื้อของบัญชีนี้" },
    ],
    writer: [
      { label: "หนังสือที่เผยแพร่", value: "0", detail: "ผลงานที่เปิดให้อ่านแล้ว" },
      { label: "ยอดอ่าน", value: "0", detail: "จำนวนการอ่านจากผู้อ่าน" },
      { label: "ยอดขาย", value: "0", detail: "สรุปรายได้จากหนังสือ" },
    ],
    admin: [
      { label: "งานที่ดูแล", value: "ระบบหนังสือ", detail: "ตรวจสอบหนังสือและหมวดหมู่" },
      { label: "หนังสือในระบบ", value: "0", detail: "รายการหนังสือทั้งหมด" },
      { label: "สมาชิก", value: "0", detail: "ข้อมูลสมาชิกที่ตรวจสอบได้" },
    ],
    superadmin: [
      { label: "ผู้ใช้ทั้งหมด", value: "0", detail: "บัญชีในระบบทั้งหมด" },
      { label: "Admin", value: "0", detail: "บัญชีผู้ดูแลระบบ" },
      { label: "Writer", value: "0", detail: "บัญชีนักเขียน" },
    ],
  };

  return summaries[role.value];
});
</script>

<template>
  <main class="profile-page">
    <section class="profile-hero">
      <div class="avatar" aria-hidden="true">
        {{ (user.name || user.email || "R").charAt(0).toUpperCase() }}
      </div>

      <div class="identity">
        <p class="eyebrow">บัญชีของฉัน</p>
        <h1>{{ user.name || "ผู้ใช้ Read and Voice" }}</h1>
        <p>{{ user.email || "ยังไม่มีอีเมลในระบบ" }}</p>
      </div>

      <button class="edit-btn" type="button">แก้ไขโปรไฟล์</button>
    </section>

    <section class="details-grid" aria-label="ข้อมูลบัญชี">
      <article class="detail-card">
        <span>สิทธิ์การใช้งาน</span>
        <strong>{{ roleLabel }}</strong>
      </article>
      <article class="detail-card">
        <span>สถานะบัญชี</span>
        <strong>{{ user.status || "active" }}</strong>
      </article>
      <article class="detail-card">
        <span>รหัสผู้ใช้</span>
        <strong>{{ user.id ? `#${user.id}` : "-" }}</strong>
      </article>
    </section>

    <section class="summary-grid" aria-label="สรุปการใช้งาน">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="summary-card"
      >
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <p>{{ card.detail }}</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.profile-page {
  width: min(1120px, calc(100% - 32px));
  min-height: 100%;
  margin: 0 auto;
  padding: 32px 0 52px;
}

.profile-hero,
.detail-card,
.summary-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.profile-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 24px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: #dff8f3;
  color: #0b5f59;
  font-size: 32px;
  font-weight: 900;
}

.identity {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: clamp(28px, 4vw, 44px);
}

.identity p:not(.eyebrow),
.summary-card p,
.detail-card span {
  color: var(--text-muted);
}

.edit-btn {
  min-height: 42px;
  border: 1px solid #2ec4b6;
  border-radius: 8px;
  background: #2ec4b6;
  color: white;
  cursor: pointer;
  font-weight: 900;
  padding: 10px 14px;
}

.details-grid,
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.detail-card,
.summary-card {
  padding: 18px;
}

.detail-card span,
.summary-card span {
  display: block;
  font-size: 13px;
  font-weight: 900;
}

.detail-card strong,
.summary-card strong {
  display: block;
  margin-top: 8px;
  color: var(--text-strong);
  font-size: 24px;
}

.summary-card p {
  margin: 8px 0 0;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .profile-hero {
    grid-template-columns: 1fr;
  }

  .details-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .edit-btn {
    width: 100%;
  }
}
</style>
