<script setup lang="ts">
// ======================================================
// [เพิ่มอะไร]
// - รายชื่อสมาชิก
// - ban / unban
//
// [ใช้ทำอะไร]
// - ปิดงาน user management ฝั่ง admin
// ======================================================

import { onMounted, ref } from "vue";
import api from "../../utils/api";

type UserItem = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "banned";
  created_at: string;
};

const users = ref<UserItem[]>([]);
const loading = ref(false);
const message = ref("");
const errorMessage = ref("");

async function loadUsers() {
  try {
    loading.value = true;
    const { data } = await api.get("/admin/users");
    users.value = data || [];
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดรายชื่อสมาชิกไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function updateStatus(id: number, status: "active" | "banned") {
  try {
    await api.put(`/admin/users/${id}/status`, { status });
    message.value = status === "banned" ? "แบนสมาชิกสำเร็จ" : "ปลดแบนสมาชิกสำเร็จ";
    await loadUsers();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เปลี่ยนสถานะไม่สำเร็จ";
  }
}

onMounted(loadUsers);
</script>

<template>
  <div class="page">
    <div class="card">
      <h1>จัดการสมาชิก</h1>

      <p v-if="loading">กำลังโหลด...</p>
      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>ชื่อ</th>
            <th>อีเมล</th>
            <th>Role</th>
            <th>Status</th>
            <th>จัดการ</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.role }}</td>
            <td>{{ user.status }}</td>
            <td class="actions">
              <button
                v-if="user.status === 'active'"
                class="danger"
                @click="updateStatus(user.id, 'banned')"
              >
                Ban
              </button>

              <button
                v-else
                @click="updateStatus(user.id, 'active')"
              >
                Unban
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
}
.card {
  background: var(--surface);
  padding: 20px;
  border-radius: 16px;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 12px;
  border-bottom: 1px solid var(--border);
}
.actions {
  display: flex;
  gap: 8px;
}
button {
  padding: 8px 12px;
  cursor: pointer;
}
.danger {
  background: #dc2626;
  color: white;
}
.success {
  color: #15803d;
}
.error {
  color: #dc2626;
}

@media (max-width: 640px) {
  .page {
    padding: 8px 18px 22px;
  }

  .card {
    border-radius: 10px;
    padding: 10px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  h1 {
    margin: 0 0 8px;
    font-size: 20px;
    line-height: 1.2;
  }

  p {
    font-size: 12px;
  }

  table {
    min-width: 0;
    table-layout: fixed;
  }

  th,
  td {
    overflow-wrap: anywhere;
    padding: 5px 4px;
    font-size: 9px;
    line-height: 1.25;
    word-break: break-word;
  }

  th {
    font-size: 8.5px;
    line-height: 1.15;
  }

  .actions {
    gap: 5px;
    flex-direction: column;
  }

  button {
    min-height: 19px;
    border-radius: 7px;
    font-size: 8.5px;
    line-height: 1.15;
    padding: 2px 3px;
  }
}
</style>
