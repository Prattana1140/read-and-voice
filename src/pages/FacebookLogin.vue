<template>
  <div class="social-page">
    <div class="card">
      <h1>Facebook Login</h1>
      <p>หน้านี้เตรียมไว้สำหรับเชื่อมระบบเข้าสู่ระบบด้วย Facebook</p>

      <div class="actions">
        <button class="btn primary" @click="goMockLogin">
          ทดลองเข้าสู่ระบบแบบจำลอง
        </button>
        <button class="btn" @click="goBack">กลับหน้า Login</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const goMockLogin = () => {
  alert("ตอนนี้ยังไม่ได้เชื่อม Facebook OAuth จริง");
};

const goBack = () => {
  router.push({ name: "Login" });
};
</script>

<style scoped>
.social-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f3f5f9;
  padding: 24px;
}
.card {
  width: 100%;
  max-width: 520px;
  background: white;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
}
h1 {
  margin: 0 0 12px;
}
p {
  color: #667085;
  line-height: 1.7;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 20px;
}
.btn {
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 700;
  background: #e9edf7;
}
.btn.primary {
  background: #1877f2;
  color: white;
}
</style>