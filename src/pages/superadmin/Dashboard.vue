<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("user") || "{}");

const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  router.push("/login");
};
</script>

<template>
  <div style="padding: 24px">
    <h1>Writer Dashboard</h1>
    <p>ยินดีต้อนรับ {{ user.name }}</p>
    <p>สิทธิ์: {{ user.role }}</p>

    <button @click="logout">ออกจากระบบ</button>
  </div>
</template>