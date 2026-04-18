<script setup lang="ts">
// ======================================================
// [เพิ่มอะไร]
// - ฟอร์มแก้ไขโปรไฟล์จริง
// - เปลี่ยนชื่อ / อีเมล / รหัสผ่าน
//
// [ใช้ทำอะไร]
// - ปิด requirement เรื่อง "จัดการโปรไฟล์"
// ======================================================

import { onMounted, reactive, ref } from "vue";
import api from "../utils/api";

const loading = ref(false);
const saving = ref(false);
const message = ref("");
const errorMessage = ref("");

const form = reactive({
  name: "",
  email: "",
  currentPassword: "",
  newPassword: "",
});

async function loadProfile() {
  try {
    loading.value = true;
    const { data } = await api.get("/profile/me");
    form.name = data?.name || "";
    form.email = data?.email || "";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดโปรไฟล์ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  try {
    saving.value = true;
    message.value = "";
    errorMessage.value = "";

    const payload = {
      name: form.name,
      email: form.email,
      currentPassword: form.currentPassword || undefined,
      newPassword: form.newPassword || undefined,
    };

    const { data } = await api.put("/profile/me", payload);
    message.value = data?.message || "บันทึกสำเร็จ";

    form.currentPassword = "";
    form.newPassword = "";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "บันทึกไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

onMounted(loadProfile);
</script>

<template>
  <div class="profile-page">
    <div class="profile-card">
      <h1>โปรไฟล์ของฉัน</h1>

      <p v-if="loading">กำลังโหลดข้อมูล...</p>
      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <div class="field">
        <label>ชื่อ</label>
        <input v-model="form.name" type="text" placeholder="กรอกชื่อ" />
      </div>

      <div class="field">
        <label>อีเมล</label>
        <input v-model="form.email" type="email" placeholder="กรอกอีเมล" />
      </div>

      <hr />

      <div class="field">
        <label>รหัสผ่านปัจจุบัน</label>
        <input
          v-model="form.currentPassword"
          type="password"
          placeholder="กรอกเมื่อต้องการเปลี่ยนรหัสผ่าน"
        />
      </div>

      <div class="field">
        <label>รหัสผ่านใหม่</label>
        <input
          v-model="form.newPassword"
          type="password"
          placeholder="กรอกรหัสผ่านใหม่"
        />
      </div>

      <button :disabled="saving" @click="saveProfile">
        {{ saving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 32px 16px;
  background: #f7f7fb;
}
.profile-card {
  max-width: 640px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
}
.field {
  margin-bottom: 16px;
}
label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
}
input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d8d8e0;
  border-radius: 10px;
}
button {
  padding: 12px 18px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  background: #4f46e5;
  color: white;
}
.success {
  color: #15803d;
}
.error {
  color: #dc2626;
}
</style>