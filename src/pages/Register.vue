<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();

const username = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const displayName = ref("");
const gender = ref("ไม่เปิดเผย");

const loading = ref(false);
const error = ref("");

const register = async () => {
  error.value = "";

  const trimmedUsername = username.value.trim();
  const trimmedDisplayName = displayName.value.trim();
  const normalizedEmail = email.value.trim().toLowerCase();

  if (
    !trimmedUsername ||
    !normalizedEmail ||
    !password.value ||
    !confirmPassword.value ||
    !trimmedDisplayName
  ) {
    error.value = "กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ";
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = "รหัสผ่านไม่ตรงกัน";
    return;
  }

  try {
    loading.value = true;

    await axios.post("http://localhost:3000/api/auth/register", {
      name: trimmedDisplayName,
      email: normalizedEmail,
      password: password.value,
    });

    alert("สมัครสมาชิก Read and Voice สำเร็จ");
    router.push("/login/account");
  } catch (err) {
    error.value =
      err.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <main class="register-page">
    <form class="register-panel" @submit.prevent="register">
      <button
        class="close-btn"
        type="button"
        aria-label="กลับไปหน้าหลัก"
        @click="router.push('/')"
      >
        x
      </button>

      <header class="register-header">
        <h1>สมัครสมาชิก Read and Voice Account</h1>
        <p>กรุณาใส่ข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน</p>
      </header>

      <div class="register-grid">
        <section class="form-column">
          <label for="email">อีเมล *</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="กรอกอีเมล"
          />

          <label for="username">ยูเซอร์เนม *</label>
          <input
            id="username"
            v-model="username"
            autocomplete="username"
            placeholder="กรอกยูเซอร์เนม"
          />
          <p class="hint">4-32 chars [A-Z, a-z, 0-9, _, @.]</p>

          <label for="password">รหัสผ่าน *</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="กรอกรหัสผ่าน"
          />

          <label for="confirm-password">ยืนยันรหัสผ่าน *</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="ยืนยันรหัสผ่านอีกครั้ง"
          />

          <label for="display-name">ชื่อที่ให้คนอื่นเห็น *</label>
          <input
            id="display-name"
            v-model="displayName"
            autocomplete="name"
            placeholder="กรอกชื่อที่ให้คนอื่นเห็นที่นี่"
          />
        </section>

        <section class="form-column side-column">
          <label for="gender">เพศ</label>
          <select id="gender" v-model="gender">
            <option>ไม่เปิดเผย</option>
            <option>หญิง</option>
            <option>ชาย</option>
            <option>อื่น ๆ</option>
          </select>

          <div class="notice-box">
            <strong>Read and Voice</strong>
            <span>บัญชีนี้ใช้สำหรับอ่านหนังสือ ฟังเสียง และจัดการคลังหนังสือของคุณ</span>
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button class="submit-btn" type="submit" :disabled="loading">
            {{ loading ? "กำลังส่งข้อมูล..." : "ส่งข้อมูล" }}
          </button>

          <p class="login-link">
            มีบัญชีแล้ว?
            <span @click="router.push('/login/account')">เข้าสู่ระบบ</span>
          </p>
        </section>
      </div>
    </form>
  </main>
</template>

<style scoped>
.register-page {
  min-height: calc(100vh - 140px);
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: 32px 16px;
  box-sizing: border-box;
}

.register-panel {
  position: relative;
  width: min(800px, 100%);
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  padding: 28px 60px 34px;
  box-sizing: border-box;
}

.close-btn {
  position: absolute;
  top: 14px;
  right: 16px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}

.register-header {
  text-align: center;
  margin-bottom: 22px;
}

.register-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 22px;
  letter-spacing: 0;
}

.register-header p {
  margin: 6px 0 0;
  color: var(--primary-strong);
  font-size: 13px;
  font-weight: 700;
}

.register-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 46px;
}

.form-column {
  min-width: 0;
}

.side-column {
  border-left: 1px solid var(--border);
  padding-left: 46px;
}

label {
  display: block;
  margin: 0 0 6px;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
}

input,
select {
  width: 100%;
  height: 40px;
  margin-bottom: 12px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  box-sizing: border-box;
  color: var(--text-strong);
  font-size: 14px;
  outline: none;
}

input:focus,
select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
}

.hint {
  margin: -8px 0 12px;
  color: var(--text-muted);
  font-size: 12px;
}

.notice-box {
  display: grid;
  gap: 6px;
  margin: 28px 0 28px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
}

.notice-box strong {
  color: var(--primary-strong);
  font-size: 16px;
}

.error {
  margin: 0 0 12px;
  color: var(--danger);
  font-size: 14px;
  font-weight: 700;
}

.submit-btn {
  width: 100%;
  height: 42px;
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.login-link {
  margin: 16px 0 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

.login-link span {
  color: var(--primary-strong);
  cursor: pointer;
  font-weight: 800;
}

@media (max-width: 760px) {
  .register-panel {
    padding: 28px 20px;
  }

  .register-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .side-column {
    border-left: 0;
    padding-left: 0;
  }
}
</style>
