<template>
  <div class="admin-users-page">
    <div class="page-header">
      <div>
        <h1>จัดการผู้ใช้งาน</h1>
        <p>สำหรับ superadmin ใช้อนุมัติและเปลี่ยนสิทธิ์ผู้ใช้</p>
      </div>

      <div class="header-actions">
        <button class="refresh-btn" @click="fetchUsers" :disabled="loading">
          {{ loading ? "กำลังโหลด..." : "รีเฟรช" }}
        </button>
      </div>
    </div>

    <section class="summary-grid" aria-label="สรุปผู้ใช้ในระบบ">
      <article class="summary-card total">
        <strong>{{ userSummary.total }}</strong>
        <span>ทั้งหมด</span>
      </article>
      <article class="summary-card writer">
        <strong>{{ userSummary.writer }}</strong>
        <span>นักเขียน</span>
      </article>
      <article class="summary-card admin">
        <strong>{{ userSummary.admin + userSummary.superadmin }}</strong>
        <span>แอดมิน</span>
      </article>
    </section>

    <div class="toolbar">
      <input
        v-model="search"
        type="text"
        class="search-input"
        placeholder="ค้นหาจากชื่อหรืออีเมล"
      />

      <select v-model="filterRole" class="filter-select">
        <option value="">ทุก role</option>
        <option value="user">ผู้อ่าน</option>
        <option value="writer">นักเขียน</option>
        <option value="admin">แอดมิน</option>
        <option value="superadmin">ผู้ดูแลสูงสุด</option>
      </select>

      <div class="toolbar-meta">
        <span>กำลังแสดง: {{ filterRole ? roleLabel(filterRole) : "ทุกบทบาท" }}</span>
        <strong>{{ filteredUsers.length }} รายการ</strong>
      </div>
    </div>

    <div v-if="successMessage" class="alert success">
      {{ successMessage }}
    </div>

    <div v-if="errorMessage" class="alert error">
      {{ errorMessage }}
    </div>

    <div class="table-card">
      <div v-if="loading" class="state-box empty-state">
        <strong>กำลังโหลดข้อมูลผู้ใช้...</strong>
        <span>ระบบกำลังดึงรายชื่อผู้ใช้และสิทธิ์ในระบบ</span>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="state-box empty-state">
        <strong>{{ search.trim() || filterRole ? "ไม่พบผู้ใช้ที่ตรงกับตัวกรอง" : "ยังไม่มีข้อมูลผู้ใช้" }}</strong>
        <span>
          {{
            search.trim() || filterRole
              ? "ลองเปลี่ยนคำค้นหา/บทบาท หรือรีเฟรชข้อมูลอีกครั้ง"
              : "เมื่อมีผู้ใช้ในระบบ รายการจะแสดงในตารางนี้"
          }}
        </span>
        <button type="button" @click="fetchUsers">รีเฟรช</button>
      </div>

      <div v-else class="table-wrapper">
        <table class="users-table">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ</th>
              <th>อีเมล</th>
              <th>บทบาทปัจจุบัน</th>
              <th>วันที่สมัคร</th>
              <th>จัดการ</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span class="role-badge" :class="user.role">
                  {{ roleLabel(user.role) }}
                </span>
              </td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>
                <div class="action-group">
                  <button
                    class="action-btn approve"
                    @click="approveAdmin(user.id)"
                    :disabled="
                      actionLoadingId === user.id ||
                      user.role === 'admin' ||
                      user.role === 'superadmin'
                    "
                  >
                    ตั้งเป็นแอดมิน
                  </button>

                  <button
                    class="action-btn revoke"
                    @click="revokeAdmin(user.id)"
                    :disabled="
                      actionLoadingId === user.id || user.role !== 'admin'
                    "
                  >
                    ยกเลิกแอดมิน
                  </button>

                  <select
                    class="role-select"
                    :value="user.role"
                    @change="changeRole(user.id, ($event.target as HTMLSelectElement).value)"
                    :disabled="
                      actionLoadingId === user.id || user.role === 'superadmin'
                    "
                  >
                    <option value="user">ผู้อ่าน</option>
                    <option value="writer">นักเขียน</option>
                    <option value="admin">แอดมิน</option>
                    <option v-if="user.role === 'superadmin'" value="superadmin" disabled>
                      ผู้ดูแลสูงสุด
                    </option>
                  </select>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="note">
      หมายเหตุ: หน้านี้เข้าได้เฉพาะผู้ดูแลสูงสุด และไม่สามารถแก้บทบาทของ
      ผู้ดูแลสูงสุดได้
    </p>
  </div>
</template>

<script setup lang="ts">
import api, { API_BASE_URL } from "../../utils/api";
import { ref, computed, onMounted } from "vue";
import { getAuthHeaders, getUser } from "../../utils/auth";

type UserItem = {
  id: number;
  name: string;
  email: string;
  role: "user" | "writer" | "admin" | "superadmin";
  created_at?: string;
};

const API_BASE = `${API_BASE_URL}/api/admin`;

const users = ref<UserItem[]>([]);
const loading = ref(false);
const actionLoadingId = ref<number | null>(null);
const successMessage = ref("");
const errorMessage = ref("");

const search = ref("");
const filterRole = ref("");

const currentUser = getUser();

const clearMessages = () => {
  successMessage.value = "";
  errorMessage.value = "";
};

const filteredUsers = computed(() => {
  return users.value.filter((user) => {
    const keyword = search.value.trim().toLowerCase();

    const matchSearch =
      !keyword ||
      user.name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword);

    const matchRole = !filterRole.value || user.role === filterRole.value;

    return matchSearch && matchRole;
  });
});

const userSummary = computed(() => {
  return users.value.reduce(
    (acc, user) => {
      acc.total += 1;
      acc[user.role] += 1;
      return acc;
    },
    {
      total: 0,
      user: 0,
      writer: 0,
      admin: 0,
      superadmin: 0,
    } as Record<UserItem["role"] | "total", number>,
  );
});

const roleLabel = (role: UserItem["role"] | string) => {
  if (role === "user") return "ผู้อ่าน";
  if (role === "writer") return "นักเขียน";
  if (role === "admin") return "แอดมิน";
  if (role === "superadmin") return "ผู้ดูแลสูงสุด";
  return role || "-";
};

const fetchUsers = async () => {
  clearMessages();

  if (!currentUser || currentUser.role !== "superadmin") {
    errorMessage.value = "เฉพาะ superadmin เท่านั้น";
    return;
  }

  try {
    loading.value = true;

    const res = await api.get(`${API_BASE}/users`, {
      headers: getAuthHeaders(),
    });

    users.value = Array.isArray(res.data) ? res.data : [];
  } catch (error: any) {
    console.error("fetchUsers error:", error);
    errorMessage.value =
      error?.response?.data?.message || "โหลดรายการผู้ใช้ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

const approveAdmin = async (userId: number) => {
  clearMessages();

  try {
    actionLoadingId.value = userId;

    const res = await api.patch(
      `${API_BASE}/users/${userId}/approve-admin`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );

    successMessage.value = res.data?.message || "ตั้งเป็นแอดมินสำเร็จ";
    await fetchUsers();
  } catch (error: any) {
    console.error("approveAdmin error:", error);
    errorMessage.value =
      error?.response?.data?.message || "ตั้งเป็นแอดมินไม่สำเร็จ";
  } finally {
    actionLoadingId.value = null;
  }
};

const revokeAdmin = async (userId: number) => {
  clearMessages();

  try {
    actionLoadingId.value = userId;

    const res = await api.patch(
      `${API_BASE}/users/${userId}/revoke-admin`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );

    successMessage.value = res.data?.message || "ยกเลิกสิทธิ์แอดมินสำเร็จ";
    await fetchUsers();
  } catch (error: any) {
    console.error("revokeAdmin error:", error);
    errorMessage.value =
      error?.response?.data?.message || "ยกเลิกสิทธิ์แอดมินไม่สำเร็จ";
  } finally {
    actionLoadingId.value = null;
  }
};

const changeRole = async (userId: number, role: string) => {
  clearMessages();

  try {
    actionLoadingId.value = userId;

    const res = await api.patch(
      `${API_BASE}/users/${userId}/role`,
      { role },
      {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      }
    );

    successMessage.value = res.data?.message || `อัปเดต role เป็น ${role} สำเร็จ`;
    await fetchUsers();
  } catch (error: any) {
    console.error("changeRole error:", error);
    errorMessage.value =
      error?.response?.data?.message || "เปลี่ยน role ไม่สำเร็จ";
  } finally {
    actionLoadingId.value = null;
  }
};

const formatDate = (value?: string) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("th-TH");
  } catch {
    return value;
  }
};

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.admin-users-page {
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  min-height: 100dvh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 6px;
  color: var(--text-strong);
}

.page-header p {
  margin: 0;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.refresh-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 700;
  cursor: pointer;
}

.refresh-btn {
  background: var(--primary);
  color: var(--on-primary);
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #ecfdf5;
  color: #047857;
  padding: 16px;
  text-align: center;
}

.summary-card.total {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.summary-card.admin {
  background: #eff6ff;
  color: #2563eb;
}

.summary-card.writer {
  background: #f0fdfa;
  color: #0f766e;
}

.summary-card strong,
.summary-card span {
  display: block;
}

.summary-card strong {
  font-size: 30px;
  line-height: 1.1;
}

.summary-card span {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 800;
}

.toolbar {
  align-items: center;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.toolbar-meta {
  display: grid;
  gap: 3px;
  margin-left: auto;
  text-align: right;
}

.toolbar-meta span {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 800;
}

.toolbar-meta strong {
  color: var(--text-strong);
  font-size: 16px;
}

.search-input,
.filter-select,
.role-select {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 16px;
  background: var(--input-bg);
  color: var(--text-strong);
}

.search-input::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

.search-input {
  min-width: 280px;
  flex: 1;
}

.filter-select {
  min-width: 140px;
}

.alert {
  border-radius: 12px;
  padding: 12px 14px;
  font-weight: 600;
  margin-bottom: 16px;
}

.alert.success {
  background: color-mix(in srgb, #16a34a 12%, var(--surface));
  color: color-mix(in srgb, #16a34a 78%, var(--text-strong));
  border: 1px solid color-mix(in srgb, #16a34a 22%, var(--border));
}

.alert.error {
  background: color-mix(in srgb, #dc2626 12%, var(--surface));
  color: color-mix(in srgb, #dc2626 78%, var(--text-strong));
  border: 1px solid color-mix(in srgb, #dc2626 22%, var(--border));
}

.table-card {
  border: 1px solid var(--border);
  background: var(--surface-raised);
  border-radius: 20px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.state-box {
  padding: 28px;
  color: var(--text-muted);
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  min-height: 180px;
  padding: 30px 18px;
  text-align: center;
}

.empty-state strong {
  color: var(--text-strong);
  font-size: 20px;
}

.empty-state span {
  max-width: 560px;
  color: var(--text-muted);
  line-height: 1.7;
}

.empty-state button {
  min-height: 40px;
  border: 0;
  border-radius: 10px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  margin-top: 2px;
  padding: 0 16px;
}

.table-wrapper {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1050px;
}

.users-table th,
.users-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
}

.users-table td {
  background: var(--surface-raised);
  color: var(--text-strong);
}

.users-table tbody tr:hover td {
  background: color-mix(in srgb, var(--primary) 6%, var(--surface-raised));
}

.users-table th {
  background: var(--surface-soft);
  color: var(--text-strong);
  font-size: 16px;
}

.role-badge {
  display: inline-block;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 15px;
  font-weight: 700;
  text-transform: lowercase;
}

.role-badge.user {
  background: color-mix(in srgb, #4f46e5 16%, var(--surface));
  color: color-mix(in srgb, #4f46e5 82%, var(--text-strong));
}

.role-badge.writer {
  background: color-mix(in srgb, #0891b2 16%, var(--surface));
  color: color-mix(in srgb, #0891b2 82%, var(--text-strong));
}

.role-badge.admin {
  background: color-mix(in srgb, #b45309 18%, var(--surface));
  color: color-mix(in srgb, #b45309 84%, var(--text-strong));
}

.role-badge.superadmin {
  background: color-mix(in srgb, #b91c1c 16%, var(--surface));
  color: color-mix(in srgb, #b91c1c 84%, var(--text-strong));
}

.action-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  font-weight: 700;
  cursor: pointer;
}

.action-btn.approve {
  background: color-mix(in srgb, #16a34a 14%, var(--surface));
  color: color-mix(in srgb, #16a34a 78%, var(--text-strong));
  border: 1px solid color-mix(in srgb, #16a34a 22%, var(--border));
}

.action-btn.revoke {
  background: color-mix(in srgb, #dc2626 12%, var(--surface));
  color: color-mix(in srgb, #dc2626 78%, var(--text-strong));
  border: 1px solid color-mix(in srgb, #dc2626 22%, var(--border));
}

.action-btn:disabled,
.role-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.note {
  margin-top: 16px;
  color: var(--text-muted);
  font-size: 16px;
}

@media (max-width: 768px) {
  .admin-users-page {
    padding: 10px 16px 22px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 9px;
    margin-bottom: 12px;
  }

  .page-header h1 {
    margin-bottom: 3px;
    font-size: 24px;
    line-height: 1.15;
  }

  .page-header p {
    font-size: 13px;
    line-height: 1.35;
  }

  .header-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    width: 100%;
  }

  .refresh-btn {
    min-height: 36px;
    border-radius: 10px;
    padding: 7px 10px;
    font-size: 14px;
  }

  .search-input {
    min-width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 12px;
  }

  .summary-card {
    padding: 10px 8px;
  }

  .summary-card strong {
    font-size: 24px;
  }

  .summary-card span {
    font-size: 12px;
    margin-top: 5px;
  }

  .header-actions,
  .refresh-btn,
  .filter-select,
  .role-select {
    width: 100%;
  }

  .toolbar {
    gap: 8px;
    margin-bottom: 12px;
  }

  .toolbar-meta {
    margin-left: 0;
    text-align: left;
    width: 100%;
  }

  .search-input,
  .filter-select,
  .role-select {
    min-height: 38px;
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 14px;
  }

  .alert {
    margin-bottom: 10px;
    border-radius: 10px;
    padding: 9px 10px;
    font-size: 14px;
  }

  .table-card {
    border-radius: 14px;
    box-shadow: var(--shadow);
  }

  .state-box {
    padding: 16px;
    font-size: 14px;
  }

  .empty-state {
    min-height: 150px;
    padding: 18px 12px;
  }

  .empty-state strong {
    font-size: 15px;
  }

  .empty-state span {
    font-size: 12px;
    line-height: 1.35;
  }

  .empty-state button {
    min-height: 32px;
    border-radius: 8px;
    font-size: 12px;
    padding: 0 10px;
  }

  .users-table {
    min-width: 0;
    table-layout: fixed;
  }

  .users-table th,
  .users-table td {
    overflow-wrap: anywhere;
    padding: 6px 5px;
    font-size: 10px;
    line-height: 1.25;
    white-space: normal;
    word-break: break-word;
  }

  .users-table th {
    font-size: 9.5px;
    line-height: 1.2;
  }

  .role-badge {
    padding: 3px 5px;
    font-size: 9.5px;
    line-height: 1.1;
  }

  .action-group {
    gap: 5px;
  }

  .action-group .role-select {
    max-width: 54px;
    min-height: 22px;
    padding: 2px 16px 2px 4px;
    font-size: 9px;
    line-height: 1.15;
  }

  .action-btn {
    min-height: 22px;
    border-radius: 8px;
    padding: 3px 4px;
    font-size: 9px;
    line-height: 1.15;
  }

  .note {
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.45;
  }
}

@media (max-width: 420px) {
  .admin-users-page {
    padding: 8px 18px 20px;
  }

  .page-header {
    gap: 7px;
    margin-bottom: 10px;
  }

  .page-header h1 {
    font-size: 21px;
  }

  .page-header p {
    font-size: 12px;
  }

  .refresh-btn {
    min-height: 32px;
    border-radius: 9px;
    font-size: 12px;
    padding: 6px 8px;
  }

  .toolbar {
    gap: 7px;
  }

  .search-input,
  .filter-select,
  .role-select {
    min-height: 34px;
    border-radius: 9px;
    padding: 6px 8px;
    font-size: 12px;
  }

  .users-table {
    min-width: 0;
    table-layout: fixed;
  }

  .users-table th,
  .users-table td {
    padding: 5px 4px;
    font-size: 9px;
  }

  .action-btn {
    min-height: 20px;
    font-size: 8.5px;
    padding: 2px 3px;
  }

  .action-group .role-select {
    max-width: 50px;
    min-height: 20px;
    border-radius: 7px;
    padding: 1px 14px 1px 3px;
    font-size: 8.5px;
  }

  .note {
    font-size: 12px;
  }
}
</style>
