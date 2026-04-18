<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const submitted = ref(false);

function submitRequest() {
  submitted.value = true;
}
</script>

<template>
  <main class="forgot-page">
    <section class="forgot-card">
      <p class="eyebrow">Account Recovery</p>
      <h1>ลืมรหัสผ่าน</h1>
      <p class="intro">
        กรอกอีเมลของบัญชี Read and Voice ระบบจะแสดงขั้นตอนติดต่อผู้ดูแลเพื่อรีเซ็ตรหัสผ่านอย่างปลอดภัย
      </p>

      <form v-if="!submitted" class="forgot-form" @submit.prevent="submitRequest">
        <label>
          <span>อีเมล</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
          />
        </label>

        <button type="submit">ขอรีเซ็ตรหัสผ่าน</button>
      </form>

      <div v-else class="result-box">
        <strong>รับคำขอแล้ว</strong>
        <span>
          เพื่อความปลอดภัย ตอนนี้ระบบยังไม่ส่งอีเมลอัตโนมัติ กรุณาติดต่อผู้ดูแลพร้อมอีเมล
          <b>{{ email }}</b>
          เพื่อยืนยันตัวตนและรีเซ็ตรหัสผ่าน
        </span>
      </div>

      <div class="actions">
        <button type="button" class="ghost" @click="router.push('/login')">
          กลับไปเข้าสู่ระบบ
        </button>
        <button type="button" class="ghost" @click="router.push('/register')">
          สมัครสมาชิกใหม่
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.forgot-page {
  min-height: calc(100vh - 140px);
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top left, rgba(0, 168, 120, 0.12), transparent 32%),
    var(--bg);
  padding: 32px 18px;
}

.forgot-card {
  width: min(520px, 100%);
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 30px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong, var(--primary));
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 34px;
}

.intro {
  color: var(--text-muted);
  line-height: 1.7;
}

.forgot-form,
label,
.result-box {
  display: grid;
  gap: 10px;
}

label span {
  color: var(--text-strong);
  font-weight: 900;
}

input {
  min-height: 50px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 0 14px;
}

button {
  min-height: 46px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

.result-box {
  border: 1px solid #bbf7d0;
  border-radius: 14px;
  background: #f0fdf4;
  color: #166534;
  line-height: 1.7;
  padding: 16px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 22px;
}

.ghost {
  background: #e8faf6;
  color: #0f766e;
}
</style>
