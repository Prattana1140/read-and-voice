<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { api } from "../utils/api";
import { announceAccessibilityMessage } from "../utils/accessibility";

const emit = defineEmits(["close", "success"]);
const router = useRouter();

const loading = ref(false);
const error = ref("");
const success = ref("");
const fieldErrors = reactive({});

const form = reactive({
  email: "",
  username: "",
  displayName: "",
  gender: "prefer_not_to_say",
  password: "",
  confirmPassword: "",
  birthDate: "",
  visualImpairmentStatus: "",
  usesScreenReader: false,
  assistiveTechnology: "",
  preferredReadingMode: "both",
  phone: "",
  province: "",
  termsAccepted: false,
});

const calculatedAge = computed(() => {
  if (!form.birthDate) return null;

  const birth = new Date(`${form.birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
});

const isVisualAssistUser = computed(() =>
  ["blind", "low_vision", "other"].includes(form.visualImpairmentStatus) ||
  form.usesScreenReader,
);

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

const legacyValidateForm = () => {
  const requiredFields = [
    form.email.trim(),
    form.username.trim(),
    form.displayName.trim(),
    form.password.trim(),
    form.confirmPassword.trim(),
    form.birthDate,
    form.visualImpairmentStatus,
  ];

  if (requiredFields.some((value) => !value)) {
    return "กรุณากรอกข้อมูลที่มี * ให้ครบ";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "รูปแบบอีเมลไม่ถูกต้อง";
  }

  if (!/^[A-Za-z0-9._@-]{4,32}$/.test(form.username.trim())) {
    return "ยูสเซอร์เนมต้องมี 4-32 ตัวอักษร และใช้ได้เฉพาะ A-Z, a-z, 0-9, ., _, @, -";
  }

  if (form.password !== form.confirmPassword) {
    return "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน";
  }

  if (form.password.length < 6) {
    return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
  }

  if (calculatedAge.value === null || calculatedAge.value < 0) {
    return "กรุณาเลือกวันเกิดที่ถูกต้อง";
  }

  if (calculatedAge.value > 120) {
    return "กรุณาตรวจสอบวันเกิดอีกครั้ง";
  }

  if (!form.termsAccepted) {
    return "กรุณายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว";
  }

  return "";
};

const clearFieldError = (field) => {
  if (fieldErrors[field]) {
    delete fieldErrors[field];
  }

  if (error.value) {
    error.value = "";
  }
};

const setFieldError = (field, message) => {
  fieldErrors[field] = message;
};

const resetFieldErrors = () => {
  Object.keys(fieldErrors).forEach((field) => {
    delete fieldErrors[field];
  });
};

const hasFieldError = (field) => Boolean(fieldErrors[field]);

const validateForm = () => {
  resetFieldErrors();

  if (!form.email.trim()) {
    setFieldError("email", "กรุณากรอกอีเมล");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    setFieldError("email", "รูปแบบอีเมลไม่ถูกต้อง เช่น name@example.com");
  }

  if (!form.username.trim()) {
    setFieldError("username", "กรุณากรอกยูสเซอร์เนม");
  } else if (!/^[A-Za-z0-9._@-]{4,32}$/.test(form.username.trim())) {
    setFieldError(
      "username",
      "ยูสเซอร์เนมต้องมี 4-32 ตัว และใช้ได้เฉพาะ A-Z, a-z, 0-9, จุด, ขีดล่าง, @, -",
    );
  }

  if (!form.displayName.trim()) {
    setFieldError("displayName", "กรุณากรอกชื่อที่ให้คนอื่นเห็น");
  }

  if (!form.password.trim()) {
    setFieldError("password", "กรุณากรอกรหัสผ่าน");
  } else if (form.password.length < 6) {
    setFieldError("password", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
  }

  if (!form.confirmPassword.trim()) {
    setFieldError("confirmPassword", "กรุณายืนยันรหัสผ่าน");
  } else if (form.password && form.password !== form.confirmPassword) {
    setFieldError("confirmPassword", "ยืนยันรหัสผ่านไม่ตรงกับรหัสผ่านที่กรอก");
  }

  if (!form.birthDate) {
    setFieldError("birthDate", "กรุณาเลือกวันเกิด");
  } else if (calculatedAge.value === null || calculatedAge.value < 0) {
    setFieldError("birthDate", "วันเกิดไม่ถูกต้อง กรุณาเลือกวันที่ไม่ใช่อนาคต");
  } else if (calculatedAge.value > 120) {
    setFieldError("birthDate", "วันเกิดดูไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
  }

  if (!form.visualImpairmentStatus) {
    setFieldError("visualImpairmentStatus", "กรุณาเลือกสถานะการมองเห็น");
  }

  const normalizedPhone = form.phone.replace(/[\s-]/g, "");
  if (normalizedPhone && !/^[0-9+]{9,15}$/.test(normalizedPhone)) {
    setFieldError("phone", "เบอร์โทรศัพท์ไม่ถูกต้อง กรุณากรอกเป็นตัวเลข 9-15 หลัก");
  }

  if (!form.termsAccepted) {
    setFieldError("termsAccepted", "กรุณายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว");
  }

  return Object.keys(fieldErrors).length === 0
    ? ""
    : "กรุณาตรวจสอบช่องที่มีกรอบสีแดงและแก้ไขข้อมูลให้ถูกต้อง";
};

const submitRegister = async () => {
  error.value = "";
  success.value = "";

  const validationMessage = validateForm();
  if (validationMessage) {
    error.value = validationMessage;
    return;
  }

  loading.value = true;

  try {
    await api.post("/api/auth/register", {
      name: form.displayName.trim(),
      display_name: form.displayName.trim(),
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      gender: form.gender,
      birth_date: form.birthDate,
      visual_impairment_status: form.visualImpairmentStatus,
      uses_screen_reader: form.usesScreenReader,
      assistive_technology: form.assistiveTechnology.trim(),
      preferred_reading_mode: form.preferredReadingMode,
      phone: form.phone.trim(),
      province: form.province.trim(),
      accessibility_mode: isVisualAssistUser.value,
      terms_accepted: form.termsAccepted,
    });

    success.value = "สมัครสมาชิกสำเร็จ";
    announceAccessibilityMessage(success.value);
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

watch(error, (message) => {
  if (message) announceAccessibilityMessage(message);
});
</script>

<template>
  <div class="register-modal" @click.self="closeModal">
    <section
      class="register-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-title"
      aria-describedby="register-status"
    >
      <span id="register-title" class="sr-only">สมัครสมาชิก Read and Voice</span>

      <div class="register-header">
        <div class="title-wrap">
          <h1 class="register-title">สมัครสมาชิก Read and Voice Account</h1>
          <p class="register-subtitle">กรุณาใส่ข้อมูลที่มี * ให้ครบถ้วน เพื่อยืนยันอายุและปรับการใช้งานให้เหมาะกับคุณ</p>
        </div>

        <button type="button" class="close-btn" aria-label="ปิด" @click="closeModal">
          x
        </button>
      </div>

      <form class="register-form" @submit.prevent="submitRegister">
        <div class="section-title">ข้อมูลบัญชี</div>

        <div class="form-grid">
          <div class="form-group">
            <label for="register-email">อีเมล *</label>
            <input
              id="register-email"
              v-model="form.email"
              type="email"
              class="input"
              :class="{ invalid: hasFieldError('email') }"
              placeholder="กรอกอีเมล"
              autocomplete="email"
              :aria-invalid="hasFieldError('email')"
              aria-describedby="register-email-error"
              @input="clearFieldError('email')"
            />
            <small v-if="fieldErrors.email" id="register-email-error" class="field-error">
              {{ fieldErrors.email }}
            </small>
          </div>

          <div class="form-group">
            <label for="register-username">ยูสเซอร์เนม *</label>
            <input
              id="register-username"
              v-model="form.username"
              type="text"
              class="input"
              :class="{ invalid: hasFieldError('username') }"
              placeholder="เช่น readvoice_user"
              autocomplete="username"
              :aria-invalid="hasFieldError('username')"
              aria-describedby="register-username-error register-username-hint"
              @input="clearFieldError('username')"
            />
            <small id="register-username-hint" class="hint">4-32 chars [A-Z, a-z, 0-9, ., _, @, -]</small>
            <small v-if="fieldErrors.username" id="register-username-error" class="field-error">
              {{ fieldErrors.username }}
            </small>
          </div>

          <div class="form-group">
            <label for="register-display-name">ชื่อที่ให้คนอื่นเห็น *</label>
            <input
              id="register-display-name"
              v-model="form.displayName"
              type="text"
              class="input"
              :class="{ invalid: hasFieldError('displayName') }"
              placeholder="กรอกชื่อที่แสดงในระบบ"
              autocomplete="name"
              :aria-invalid="hasFieldError('displayName')"
              aria-describedby="register-display-name-error"
              @input="clearFieldError('displayName')"
            />
            <small
              v-if="fieldErrors.displayName"
              id="register-display-name-error"
              class="field-error"
            >
              {{ fieldErrors.displayName }}
            </small>
          </div>

          <div class="form-group">
            <label for="register-gender">เพศ</label>
            <select id="register-gender" v-model="form.gender" class="input">
              <option value="prefer_not_to_say">ไม่เปิดเผย</option>
              <option value="female">หญิง</option>
              <option value="male">ชาย</option>
              <option value="other">อื่น ๆ</option>
            </select>
          </div>

          <div class="form-group">
            <label for="register-password">รหัสผ่าน *</label>
            <input
              id="register-password"
              v-model="form.password"
              type="password"
              class="input"
              :class="{ invalid: hasFieldError('password') }"
              placeholder="กรอกรหัสผ่าน"
              autocomplete="new-password"
              :aria-invalid="hasFieldError('password')"
              aria-describedby="register-password-error"
              @input="clearFieldError('password')"
            />
            <small v-if="fieldErrors.password" id="register-password-error" class="field-error">
              {{ fieldErrors.password }}
            </small>
          </div>

          <div class="form-group">
            <label for="register-confirm-password">ยืนยันรหัสผ่าน *</label>
            <input
              id="register-confirm-password"
              v-model="form.confirmPassword"
              type="password"
              class="input"
              :class="{ invalid: hasFieldError('confirmPassword') }"
              placeholder="ยืนยันรหัสผ่านอีกครั้ง"
              autocomplete="new-password"
              :aria-invalid="hasFieldError('confirmPassword')"
              aria-describedby="register-confirm-password-error"
              @input="clearFieldError('confirmPassword')"
            />
            <small
              v-if="fieldErrors.confirmPassword"
              id="register-confirm-password-error"
              class="field-error"
            >
              {{ fieldErrors.confirmPassword }}
            </small>
          </div>
        </div>

        <div class="section-title">ข้อมูลยืนยันอายุและการเข้าถึง</div>

        <div class="form-grid">
          <div class="form-group">
            <label for="register-birth-date">วันเกิด *</label>
            <input
              id="register-birth-date"
              v-model="form.birthDate"
              type="date"
              class="input"
              autocomplete="bday"
            />
            <small v-if="calculatedAge !== null" class="hint">อายุปัจจุบัน {{ calculatedAge }} ปี</small>
          </div>

          <div class="form-group">
            <label for="register-visual-status">สถานะการมองเห็น *</label>
            <select id="register-visual-status" v-model="form.visualImpairmentStatus" class="input">
              <option value="" disabled>เลือกสถานะ</option>
              <option value="none">ไม่ได้เป็นผู้พิการทางสายตา</option>
              <option value="blind">ตาบอด</option>
              <option value="low_vision">สายตาเลือนราง</option>
              <option value="other">มีข้อจำกัดด้านการมองเห็นอื่น ๆ</option>
              <option value="prefer_not_to_say">ไม่ประสงค์ระบุ</option>
            </select>
          </div>

          <label class="checkbox-field">
            <input v-model="form.usesScreenReader" type="checkbox" />
            <span>ใช้โปรแกรมอ่านหน้าจอหรือเทคโนโลยีช่วยอ่าน</span>
          </label>

          <div class="form-group">
            <label for="register-assistive-tech">เครื่องมือช่วยอ่านที่ใช้</label>
            <input
              id="register-assistive-tech"
              v-model="form.assistiveTechnology"
              type="text"
              class="input"
              placeholder="เช่น TalkBack, VoiceOver, NVDA"
            />
          </div>

          <div class="form-group">
            <label for="register-reading-mode">รูปแบบการอ่านที่ต้องการ</label>
            <select id="register-reading-mode" v-model="form.preferredReadingMode" class="input">
              <option value="both">อ่านและฟัง</option>
              <option value="ebook">อ่านเป็นหลัก</option>
              <option value="audio">ฟังเป็นหลัก</option>
              <option value="not_sure">ยังไม่แน่ใจ</option>
            </select>
          </div>

          <div class="form-group">
            <label for="register-phone">เบอร์โทรศัพท์</label>
            <input
              id="register-phone"
              v-model="form.phone"
              type="tel"
              class="input"
              placeholder="08x-xxx-xxxx"
              autocomplete="tel"
            />
          </div>

          <div class="form-group">
            <label for="register-province">จังหวัด</label>
            <input
              id="register-province"
              v-model="form.province"
              type="text"
              class="input"
              placeholder="จังหวัดที่อาศัยอยู่"
              autocomplete="address-level1"
            />
          </div>

          <label class="checkbox-field span-2">
            <input v-model="form.termsAccepted" type="checkbox" />
            <span>
              ฉันยอมรับ
              <router-link to="/terms" target="_blank">เงื่อนไขการใช้งาน</router-link>
              และ
              <router-link to="/privacy-policy" target="_blank">นโยบายความเป็นส่วนตัว</router-link>
            </span>
          </label>

          <div class="submit-wrap span-2">
            <button type="submit" class="submit-btn" :disabled="loading">
              {{ loading ? "กำลังส่งข้อมูล..." : "สมัครสมาชิก" }}
            </button>

            <p class="login-text">
              มีบัญชีแล้ว?
              <button type="button" @click="goToLogin">เข้าสู่ระบบ</button>
            </p>
          </div>
        </div>
      </form>

      <p id="register-status" v-if="error" class="error-text" aria-live="assertive">{{ error }}</p>
      <p id="register-status" v-if="success" class="success-text" aria-live="polite">{{ success }}</p>
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
  padding: var(--page-gutter, 24px);
  box-sizing: border-box;
  overflow-y: auto;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  padding: 0;
}

.register-card {
  width: min(1080px, 96vw);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
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
  line-height: 1.45;
}

.close-btn {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
  padding: 4px;
}

.register-form {
  display: grid;
  gap: 18px;
}

.section-title {
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 900;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 28px;
  align-items: start;
}

.form-group {
  display: grid;
  gap: 8px;
}

.form-group label,
.checkbox-field {
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
  font-size: 16px;
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

.checkbox-field {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px 14px;
  box-sizing: border-box;
  line-height: 1.45;
}

.checkbox-field input {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  accent-color: var(--primary);
}

.checkbox-field a {
  color: var(--primary-strong, var(--primary));
  font-weight: 900;
  text-decoration: none;
}

.span-2 {
  grid-column: 1 / -1;
}

.submit-wrap {
  display: grid;
  gap: 10px;
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
  margin: 0;
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

  .span-2 {
    grid-column: auto;
  }

  .title-wrap {
    text-align: left;
  }
}

@media (max-width: 560px) {
  .register-modal {
    place-items: start center;
    padding:
      max(12px, env(safe-area-inset-top))
      max(12px, env(safe-area-inset-right))
      max(18px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
  }

  .register-card {
    width: 100%;
    max-height: none;
    border-radius: 16px;
    padding: 20px 14px 18px;
  }

  .register-title {
    font-size: 20px;
  }

  .register-subtitle {
    font-size: 12px;
  }
}
</style>
