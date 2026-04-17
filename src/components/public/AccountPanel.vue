<script setup lang="ts">
import { computed } from "vue";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

const user = computed<StoredUser | null>(() => {
  const raw = localStorage.getItem("user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

const isLoggedIn = computed(() => !!localStorage.getItem("token"));
</script>

<template>
  <div class="panel">
    <div class="profile">
      <img src="https://placehold.co/56x56" alt="profile" />
      <div>
        <h4>{{ user?.name || "Guest User" }}</h4>
        <p v-if="isLoggedIn">{{ user?.email || "เข้าสู่ระบบแล้ว" }}</p>
        <p v-else>ยังไม่ได้เข้าสู่ระบบ</p>
      </div>
    </div>

    <div class="menu">
      <router-link to="/wishlist">รายการที่อยากได้</router-link>
      <router-link to="/cart">ตะกร้าสินค้า</router-link>
      <router-link v-if="!isLoggedIn" to="/login">เข้าสู่ระบบ</router-link>
      <router-link v-if="!isLoggedIn" to="/register">สมัครสมาชิก</router-link>
      <a v-if="isLoggedIn" href="#">จัดการบัญชี</a>
      <a v-if="isLoggedIn" href="#">ข้อมูลของฉัน</a>
      <a href="#">บริการช่วยเหลือ</a>
    </div>
  </div>
</template>

<style scoped>
.panel {
  position: absolute;
  top: 72px;
  right: 16px;
  width: 300px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  z-index: 60;
}

.profile {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.profile img {
  width: 56px;
  height: 56px;
  border-radius: 50%;
}

.profile h4 {
  margin: 0 0 4px;
}

.profile p {
  margin: 0;
  color: #777;
  font-size: 14px;
  word-break: break-word;
}

.menu {
  display: flex;
  flex-direction: column;
}

.menu a {
  padding: 12px 16px;
  text-decoration: none;
  color: #222;
  border-bottom: 1px solid #f4f4f4;
}
</style>
