<script setup lang="ts">
// ======================================================
// [เพิ่มอะไร]
// - ดู / เพิ่ม / แก้ / ลบ หมวดหมู่
//
// [ใช้ทำอะไร]
// - ปิดงาน admin category management
// ======================================================

import { onMounted, ref } from "vue";
import api from "../../utils/api";

type Category = {
  id: number;
  name: string;
};

const categories = ref<Category[]>([]);
const newName = ref("");
const editingId = ref<number | null>(null);
const editingName = ref("");
const message = ref("");
const errorMessage = ref("");

async function loadCategories() {
  try {
    const { data } = await api.get("/categories");
    categories.value = data || [];
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดหมวดหมู่ไม่สำเร็จ";
  }
}

async function createCategory() {
  try {
    message.value = "";
    errorMessage.value = "";

    await api.post("/categories", { name: newName.value });
    newName.value = "";
    message.value = "เพิ่มหมวดหมู่สำเร็จ";
    await loadCategories();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เพิ่มหมวดหมู่ไม่สำเร็จ";
  }
}

function startEdit(item: Category) {
  editingId.value = item.id;
  editingName.value = item.name;
}

async function updateCategory() {
  try {
    if (!editingId.value) return;

    await api.put(`/categories/${editingId.value}`, {
      name: editingName.value,
    });

    message.value = "แก้ไขหมวดหมู่สำเร็จ";
    editingId.value = null;
    editingName.value = "";
    await loadCategories();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "แก้ไขหมวดหมู่ไม่สำเร็จ";
  }
}

async function deleteCategory(id: number) {
  const ok = window.confirm("ยืนยันการลบหมวดหมู่นี้?");
  if (!ok) return;

  try {
    await api.delete(`/categories/${id}`);
    message.value = "ลบหมวดหมู่สำเร็จ";
    await loadCategories();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ลบหมวดหมู่ไม่สำเร็จ";
  }
}

onMounted(loadCategories);
</script>

<template>
  <div class="page">
    <div class="card">
      <h1>จัดการหมวดหมู่</h1>

      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <div class="form-row">
        <input v-model="newName" type="text" placeholder="ชื่อหมวดหมู่ใหม่" />
        <button @click="createCategory">เพิ่มหมวดหมู่</button>
      </div>

      <div v-if="editingId" class="form-row">
        <input v-model="editingName" type="text" placeholder="แก้ชื่อหมวดหมู่" />
        <button @click="updateCategory">บันทึก</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>ชื่อหมวดหมู่</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in categories" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.name }}</td>
            <td class="actions">
              <button @click="startEdit(item)">แก้ไข</button>
              <button class="danger" @click="deleteCategory(item.id)">ลบ</button>
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
  background: #fff;
  border-radius: 16px;
  padding: 20px;
}
.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
input {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  padding: 10px;
}
button {
  padding: 10px 14px;
  cursor: pointer;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  border-bottom: 1px solid var(--border);
  text-align: left;
  padding: 12px;
}
.actions {
  display: flex;
  gap: 8px;
}
.danger {
  background: #dc2626;
  color: #fff;
}
.success {
  color: #15803d;
}
.error {
  color: #dc2626;
}

@media (max-width: 640px) {
  .card {
    padding: 16px;
    overflow-x: auto;
  }

  .form-row,
  .actions {
    flex-direction: column;
  }

  button,
  input {
    width: 100%;
  }

  table {
    min-width: 520px;
  }
}
</style>
