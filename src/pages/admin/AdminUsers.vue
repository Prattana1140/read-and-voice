<template>
  <div class="admin-users-page">
    <div class="page-header">
      <div>
        <h1>จัดการผู้ใช้งาน</h1>
        <p>สำหรับ superadmin ใช้อนุมัติและเปลี่ยนสิทธิ์ผู้ใช้</p>
      </div>

      <div class="header-actions">
        <button class="back-btn" @click="goToDashboard">
          ← กลับ Dashboard
        </button>
        <button class="refresh-btn" @click="fetchUsers" :disabled="loading">
          {{ loading ? "กำลังโหลด..." : "รีเฟรช" }}
        </button>
      </div>
    </div>

    <div class="toolbar">
      <input
        v-model="search"
        type="text"
        class="search-input"
        placeholder="ค้นหาจากชื่อหรืออีเมล"
      />

      <select v-model="filterRole" class="filter-select">
        <option value="">ทุก role</option>
        <option value="user">user</option>
        <option value="writer">writer</option>
        <option value="admin">admin</option>
        <option value="superadmin">superadmin</option>
      </select>
    </div>

    <div v-if="successMessage" class="alert success">
      {{ successMessage }}
    </div>

    <div v-if="errorMessage" class="alert error">
      {{ errorMessage }}
    </div>

    <div class="table-card">
      <div v-if="loading" class="state-box">กำลังโหลดข้อมูลผู้ใช้...</div>

      <div v-else-if="filteredUsers.length === 0" class="state-box">
        ไม่พบข้อมูลผู้ใช้
      </div>

      <div v-else class="table-wrapper">
        <table class="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>ชื่อ</th>
              <th>อีเมล</th>
              <th>Role ปัจจุบัน</th>
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
                  {{ user.role }}
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
                    อนุมัติ admin
                  </button>

                  <button
                    class="action-btn revoke"
                    @click="revokeAdmin(user.id)"
                    :disabled="
                      actionLoadingId === user.id || user.role !== 'admin'
                    "
                  >
                    ยกเลิก admin
                  </button>

                  <select
                    class="role-select"
                    :value="user.role"
                    @change="changeRole(user.id, ($event.target as HTMLSelectElement).value)"
                    :disabled="
                      actionLoadingId === user.id || user.role === 'superadmin'
                    "
                  >
                    <option value="user">user</option>
                    <option value="writer">writer</option>
                    <option value="admin">admin</option>
                    <option v-if="user.role === 'superadmin'" value="superadmin" disabled>
                      superadmin
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
      หมายเหตุ: หน้านี้เข้าได้เฉพาะ superadmin และไม่สามารถแก้ role ของ
      superadmin ได้
    </p>
  </div>
</template>

<script setup lang="ts">
import api, { API_BASE_URL } from "../../utils/api";
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getAuthHeaders, getUser } from "../../utils/auth";

type UserItem = {
  id: number;
  name: string;
  email: string;
  role: "user" | "writer" | "admin" | "superadmin";
  created_at?: string;
};

const router = useRouter();
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

    successMessage.value = res.data?.message || "อนุมัติเป็น admin สำเร็จ";
    await fetchUsers();
  } catch (error: any) {
    console.error("approveAdmin error:", error);
    errorMessage.value =
      error?.response?.data?.message || "อนุมัติ admin ไม่สำเร็จ";
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

    successMessage.value = res.data?.message || "ยกเลิกสิทธิ์ admin สำเร็จ";
    await fetchUsers();
  } catch (error: any) {
    console.error("revokeAdmin error:", error);
    errorMessage.value =
      error?.response?.data?.message || "ยกเลิกสิทธิ์ admin ไม่สำเร็จ";
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

const goToDashboard = () => {
  router.push({ name: "AdminDashboard" });
};

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.admin-users-page {
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
  background: #f7f8fc;
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
  color: #1f2430;
}

.page-header p {
  margin: 0;
  color: #667085;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.refresh-btn,
.back-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 700;
  cursor: pointer;
}

.refresh-btn {
  background: #6c63ff;
  color: white;
}

.back-btn {
  background: #e8edf7;
  color: #1f2430;
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.search-input,
.filter-select,
.role-select {
  border: 1px solid #d8dfeb;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  background: var(--surface);
  color: var(--text-strong);
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
  background: #e9f8ee;
  color: #15803d;
}

.alert.error {
  background: #fff1f2;
  color: #b00020;
}

.table-card {
  background: var(--surface);
  border-radius: 20px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.state-box {
  padding: 28px;
  color: var(--text-muted);
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
  border-bottom: 1px solid #edf1f7;
  text-align: left;
  vertical-align: middle;
}

.users-table th {
  background: #fafbff;
  color: #344054;
  font-size: 14px;
}

.role-badge {
  display: inline-block;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 700;
  text-transform: lowercase;
}

.role-badge.user {
  background: #eef2ff;
  color: #4f46e5;
}

.role-badge.writer {
  background: #ecfeff;
  color: #0891b2;
}

.role-badge.admin {
  background: #fef3c7;
  color: #b45309;
}

.role-badge.superadmin {
  background: #fee2e2;
  color: #b91c1c;
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
  background: #e9f8ee;
  color: #15803d;
}

.action-btn.revoke {
  background: #fff1f2;
  color: #b00020;
}

.action-btn:disabled,
.role-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.note {
  margin-top: 16px;
  color: #667085;
  font-size: 14px;
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
    font-size: 22px;
    line-height: 1.15;
  }

  .page-header p {
    font-size: 11px;
    line-height: 1.35;
  }

  .header-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    width: 100%;
  }

  .refresh-btn,
  .back-btn {
    min-height: 36px;
    border-radius: 10px;
    padding: 7px 10px;
    font-size: 12px;
  }

  .search-input {
    min-width: 100%;
  }

  .header-actions,
  .refresh-btn,
  .back-btn,
  .filter-select,
  .role-select {
    width: 100%;
  }

  .toolbar {
    gap: 8px;
    margin-bottom: 12px;
  }

  .search-input,
  .filter-select,
  .role-select {
    min-height: 38px;
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .alert {
    margin-bottom: 10px;
    border-radius: 10px;
    padding: 9px 10px;
    font-size: 12px;
  }

  .table-card {
    border-radius: 14px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .state-box {
    padding: 16px;
    font-size: 12px;
  }

  .users-table {
    min-width: 0;
    table-layout: fixed;
  }

  .users-table th,
  .users-table td {
    overflow-wrap: anywhere;
    padding: 6px 5px;
    font-size: 8px;
    line-height: 1.25;
    white-space: normal;
    word-break: break-word;
  }

  .users-table th {
    font-size: 7.5px;
    line-height: 1.2;
  }

  .role-badge {
    padding: 3px 5px;
    font-size: 7.5px;
    line-height: 1.1;
  }

  .action-group {
    gap: 5px;
  }

  .action-group .role-select {
    max-width: 54px;
    min-height: 22px;
    padding: 2px 16px 2px 4px;
    font-size: 7px;
    line-height: 1.15;
  }

  .action-btn {
    min-height: 22px;
    border-radius: 8px;
    padding: 3px 4px;
    font-size: 7px;
    line-height: 1.15;
  }

  .note {
    margin-top: 10px;
    font-size: 11px;
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
    font-size: 19px;
  }

  .page-header p {
    font-size: 10px;
  }

  .refresh-btn,
  .back-btn {
    min-height: 32px;
    border-radius: 9px;
    font-size: 10px;
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
    font-size: 10px;
  }

  .users-table {
    min-width: 0;
    table-layout: fixed;
  }

  .users-table th,
  .users-table td {
    padding: 5px 4px;
    font-size: 7px;
  }

  .action-btn {
    min-height: 20px;
    font-size: 6.5px;
    padding: 2px 3px;
  }

  .action-group .role-select {
    max-width: 50px;
    min-height: 20px;
    border-radius: 7px;
    padding: 1px 14px 1px 3px;
    font-size: 6.5px;
  }

  .note {
    font-size: 10px;
  }
}
</style>
