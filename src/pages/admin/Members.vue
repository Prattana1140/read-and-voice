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
  padding: 24px;
}
.card {
  background: white;
  padding: 20px;
  border-radius: 16px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
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
</style>