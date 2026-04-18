<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../utils/api";

const emit = defineEmits(["close", "success"]);
const router = useRouter();

const loading = ref(false);
const error = ref("");
const success = ref("");

const form = reactive({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  displayName: "",
  gender: "",
});

const closeModal = () => {
  emit("close");
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
};

const goToLogin = () => {
  emit("close");
  router.push("/login");
};

const submitRegister = async () => {
  error.value = "";
  success.value = "";

  if (
    !form.name.trim() ||
    !form.email.trim() ||
    !form.password.trim() ||
    !form.confirmPassword.trim() ||
    !form.displayName.trim()
  ) {
    error.value = "กรุณากรอกข้อมูลที่มี * ให้ครบ";
    return;
  }

  if (form.password !== form.confirmPassword) {
    error.value = "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน";
    return;
  }

  if (form.password.length < 6) {
    error.value = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    return;
  }

  loading.value = true;

  try {
    await api.post("/api/auth/register", {
      name: form.name,
      email: form.email,
      password: form.password,
    });

    success.value = "สมัครสมาชิกสำเร็จ";
    emit("success");

    setTimeout(() => {
      emit("close");
      router.push("/login");
    }, 800);
  } catch (err) {
    error.value =
      err?.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="register-modal" @click.self="closeModal">
    <section class="register-card">
      <div class="register-header">
        <div class="title-wrap">
          <h1 class="register-title">สมัครสมาชิก Read and Voice Account</h1>
          <p class="register-subtitle">กรุณาใส่ข้อมูลที่ต้องการทั้งหมด * ให้ครบถ้วน</p>
        </div>

        <button type="button" class="close-btn" aria-label="ปิด" @click="closeModal">
          ×
        </button>
      </div>

      <div class="register-content">
        <div class="register-left">
          <div class="form-grid">
            <div class="form-group">
              <label>อีเมล *</label>
              <input
                v-model="form.email"
                type="email"
                class="input"
                placeholder="กรอกอีเมล"
                autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label>เพศ</label>
              <select v-model="form.gender" class="input">
                <option value="">ไม่เปิดเผย</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">อื่น ๆ</option>
              </select>
            </div>

            <div class="form-group">
              <label>ยูสเซอร์เนม *</label>
              <input
                v-model="form.name"
                type="text"
                class="input"
                placeholder="กรอกยูสเซอร์เนม"
                autocomplete="username"
              />
              <small class="hint">4-32 chars [A-Z, a-z, 0-9, -, _, @.]</small>
            </div>

            <div class="form-group card-info-wrap">
              <div class="info-box">
                <h3>Read and Voice</h3>
                <p>บัญชีนี้ใช้สำหรับ เข้าชม อ่านหนังสือ ฟังเสียง และจัดการคลังหนังสือของคุณ</p>
              </div>
            </div>

            <div class="form-group">
              <label>รหัสผ่าน *</label>
              <input
                v-model="form.password"
                type="password"
                class="input"
                placeholder="กรอกรหัสผ่าน"
                autocomplete="new-password"
              />
            </div>

            <div class="form-group submit-wrap">
              <button
                type="button"
                class="submit-btn"
                :disabled="loading"
                @click="submitRegister"
              >
                {{ loading ? "กำลังส่งข้อมูล..." : "ส่งข้อมูล" }}
              </button>

              <p class="login-text">
                มีบัญชีแล้ว?
                <button type="button" @click="goToLogin">เข้าสู่ระบบ</button>
              </p>
            </div>

            <div class="form-group">
              <label>ยืนยันรหัสผ่าน *</label>
              <input
                v-model="form.confirmPassword"
                type="password"
                class="input"
                placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                autocomplete="new-password"
              />
            </div>

            <div class="form-group empty-slot"></div>

            <div class="form-group full-width">
              <label>ชื่อที่ให้คนอื่นเห็น *</label>
              <input
                v-model="form.displayName"
                type="text"
                class="input"
                placeholder="กรอกชื่อที่ให้คนอื่นเห็นที่นี่"
              />
            </div>
          </div>
        </div>
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>
      <p v-if="success" class="success-text">{{ success }}</p>
    </section>
  </div>
</template>

<style scoped>
.register-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.18);
  display: grid;
  place-items: center;
  z-index: 9999;
  padding: 24px;
  box-sizing: border-box;
}

.register-card {
  width: min(1080px, 96vw);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 26px 30px 24px;
  display: grid;
  gap: 18px;
}

.register-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.title-wrap {
  flex: 1;
  text-align: center;
}

.register-title {
  margin: 0;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 900;
  line-height: 1.25;
}

.register-subtitle {
  margin: 6px 0 0;
  color: var(--primary-strong, var(--primary));
  font-size: 13px;
  font-weight: 800;
}

.close-btn {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  padding: 0;
}

.register-content {
  display: block;
}

.register-left {
  width: 100%;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 18px 38px;
  align-items: start;
}

.form-group {
  display: grid;
  gap: 8px;
}

.form-group label {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 800;
}

.input {
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 0 14px;
  box-sizing: border-box;
  font-size: 14px;
  outline: none;
}

.input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

select.input {
  cursor: pointer;
}

.hint {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.info-box {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px 16px;
  min-height: 88px;
  display: grid;
  align-content: center;
}

.info-box h3 {
  margin: 0 0 8px;
  color: var(--primary-strong, var(--primary));
  font-size: 15px;
  font-weight: 900;
}

.info-box p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
  font-size: 13px;
}

.submit-btn {
  width: 100%;
  min-height: 52px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: var(--on-primary);
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.login-text {
  margin: 10px 0 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.login-text button {
  border: 0;
  background: transparent;
  color: var(--primary-strong, var(--primary));
  font-weight: 900;
  cursor: pointer;
  padding: 0 0 0 4px;
}

.full-width {
  grid-column: 1 / 2;
}

.empty-slot {
  visibility: hidden;
}

.error-text {
  margin: 0;
  color: var(--danger);
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 10px;
  padding: 12px 14px;
  font-weight: 800;
}

.success-text {
  margin: 0;
  color: #0f766e;
  background: rgba(13, 148, 136, 0.09);
  border: 1px solid rgba(13, 148, 136, 0.18);
  border-radius: 10px;
  padding: 12px 14px;
  font-weight: 800;
}

@media (max-width: 900px) {
  .register-card {
    width: min(760px, 96vw);
    padding: 22px 18px 20px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .card-info-wrap,
  .submit-wrap,
  .empty-slot,
  .full-width {
    grid-column: auto;
  }

  .empty-slot {
    display: none;
  }

  .title-wrap {
    text-align: left;
  }
}

@media (max-width: 560px) {
  .register-modal {
    padding: 14px;
  }

  .register-card {
    width: 100%;
    border-radius: 16px;
    padding: 20px 14px 18px;
  }

  .register-title {
    font-size: 20px;
  }

  .register-subtitle {
    font-size: 12px;
  }

  .close-btn {
    font-size: 28px;
  }
}
</style>
