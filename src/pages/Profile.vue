<script setup lang="ts">
type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

const user: StoredUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
})();
</script>

<template>
  <div class="profile-page">
    <section class="panel">
      <p class="eyebrow">บัญชีของฉัน</p>
      <h1>โปรไฟล์</h1>
      <p class="muted">ข้อมูลบัญชีที่ใช้แยกสิทธิ์การใช้งานในระบบ Read and Voice</p>

      <dl class="profile-grid">
        <div>
          <dt>ชื่อ</dt>
          <dd>{{ user.name || "-" }}</dd>
        </div>
        <div>
          <dt>อีเมล</dt>
          <dd>{{ user.email || "-" }}</dd>
        </div>
        <div>
          <dt>สิทธิ์</dt>
          <dd>{{ user.role || "user" }}</dd>
        </div>
        <div>
          <dt>สถานะ</dt>
          <dd>{{ user.status || "active" }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 920px;
  min-height: 100%;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1 {
  margin: 0 0 10px;
  color: var(--text-strong);
}

.muted {
  color: var(--text-muted);
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 24px 0 0;
}

.profile-grid div {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 16px;
}

dt {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 800;
}

dd {
  margin: 6px 0 0;
  color: var(--text-strong);
  font-weight: 900;
}

@media (max-width: 640px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
