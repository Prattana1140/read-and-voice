<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const props = defineProps<{
  onClose: () => void;
}>();

const router = useRouter();

const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const email = ref("");
const displayName = ref("");
const gender = ref("ไม่เปิดเผย");
const loading = ref(false);
const error = ref("");

const submitForm = async () => {
  error.value = "";

  const trimmedUsername = username.value.trim();
  const trimmedDisplayName = displayName.value.trim();
  const normalizedEmail = email.value.trim().toLowerCase();

  if (
    !trimmedUsername ||
    !password.value ||
    !confirmPassword.value ||
    !normalizedEmail ||
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
    props.onClose();
    router.push("/login/account");
  } catch (err: any) {
    error.value =
      err.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="backdrop">
    <form class="modal" @submit.prevent="submitForm">
      <button class="close" type="button" @click="onClose">x</button>

      <header class="modal-header">
        <h2>สมัครสมาชิก Read and Voice Account</h2>
        <p>กรุณาใส่ข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน</p>
      </header>

      <div class="modal-grid">
        <section>
          <label for="modal-email">อีเมล *</label>
          <input
            id="modal-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="กรอกอีเมล"
          />

          <label for="modal-username">ยูเซอร์เนม *</label>
          <input
            id="modal-username"
            v-model="username"
            autocomplete="username"
            placeholder="กรอกยูเซอร์เนม"
          />
          <p class="hint">4-32 chars [A-Z, a-z, 0-9, _, @.]</p>

          <label for="modal-password">รหัสผ่าน *</label>
          <input
            id="modal-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="กรอกรหัสผ่าน"
          />

          <label for="modal-confirm-password">ยืนยันรหัสผ่าน *</label>
          <input
            id="modal-confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="ยืนยันรหัสผ่านอีกครั้ง"
          />

          <label for="modal-display-name">ชื่อที่ให้คนอื่นเห็น *</label>
          <input
            id="modal-display-name"
            v-model="displayName"
            autocomplete="name"
            placeholder="กรอกชื่อที่ให้คนอื่นเห็นที่นี่"
          />
        </section>

        <section class="side">
          <label for="modal-gender">เพศ</label>
          <select id="modal-gender" v-model="gender">
            <option>ไม่เปิดเผย</option>
            <option>หญิง</option>
            <option>ชาย</option>
            <option>อื่น ๆ</option>
          </select>

          <div class="notice-box">
            <strong>Read and Voice</strong>
            <span>อ่าน ฟัง และเก็บหนังสือที่คุณรักไว้ในบัญชีเดียว</span>
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button class="submit" type="submit" :disabled="loading">
            {{ loading ? "กำลังส่งข้อมูล..." : "ส่งข้อมูล" }}
          </button>
        </section>
      </div>
    </form>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  z-index: 90;
  padding: 20px;
  box-sizing: border-box;
}

.modal {
  position: relative;
  width: min(800px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 28px 60px 34px;
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.close {
  position: absolute;
  top: 14px;
  right: 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}

.modal-header {
  text-align: center;
  margin-bottom: 22px;
}

.modal-header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 22px;
  letter-spacing: 0;
}

.modal-header p {
  margin: 6px 0 0;
  color: var(--primary-strong);
  font-size: 13px;
  font-weight: 700;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 46px;
}

.side {
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
  margin: 28px 0;
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

.submit {
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
}

.submit:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 760px) {
  .modal {
    padding: 28px 20px;
  }

  .modal-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .side {
    border-left: 0;
    padding-left: 0;
  }
}
</style>
