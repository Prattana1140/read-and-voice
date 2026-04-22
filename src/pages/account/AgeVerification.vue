<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";
import AccountSectionLayout from "../../components/account/AccountSectionLayout.vue";

type VerificationState = {
  id?: number;
  status: string;
  document_type: string | null;
  note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  updated_at?: string | null;
};

const router = useRouter();
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const item = ref<VerificationState | null>(null);

const form = reactive({
  document_type: "id_card",
  note: "",
});

const statusLabel = computed(() => item.value?.status || "not_submitted");
const isApproved = computed(() => statusLabel.value === "approved");
const canEdit = computed(() => !isApproved.value);
const submitLabel = computed(() => {
  if (saving.value) return "กำลังบันทึก...";
  if (item.value?.submitted_at) return "อัปเดตคำขอยืนยันอายุ";
  return "ส่งคำขอยืนยันอายุ";
});

const statusSummary = computed(() => {
  switch (statusLabel.value) {
    case "approved":
      return "คำขอของคุณได้รับการอนุมัติแล้ว จึงล็อกฟอร์มไว้เป็นข้อมูลอ้างอิง";
    case "pending":
      return "คำขอกำลังรอตรวจสอบ คุณยังแก้ไขข้อมูลและส่งอัปเดตได้";
    default:
      return "กรอกข้อมูลเพื่อส่งคำขอยืนยันอายุสำหรับการเข้าถึงเนื้อหาที่จำกัดอายุ";
  }
});

async function loadItem() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/account/age-verification");
    item.value = data;
    form.document_type = data?.document_type || "id_card";
    form.note = data?.note || "";
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดสถานะการยืนยันอายุไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function submitVerification() {
  if (!canEdit.value) return;

  try {
    saving.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    await api.post("/account/age-verification", {
      document_type: form.document_type,
      note: form.note.trim() || null,
    });

    successMessage.value = item.value?.submitted_at
      ? "อัปเดตคำขอยืนยันอายุแล้ว"
      : "ส่งคำขอยืนยันอายุแล้ว";

    await loadItem();
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "บันทึกคำขอยืนยันอายุไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

onMounted(loadItem);
</script>

<template>
  <AccountSectionLayout
    title="ยืนยันอายุ"
    description="หน้านี้ใช้กรอกและอัปเดตข้อมูลสำหรับยืนยันอายุ โดยเจ้าของบัญชีแก้ไขได้เองจนกว่าจะได้รับอนุมัติ"
    :loading="loading"
    :error-message="errorMessage"
    :empty="false"
    @back="router.push('/profile')"
  >
    <section class="panel">
      <div class="panel-header">
        <div>
          <strong>สถานะปัจจุบัน</strong>
          <p>{{ statusSummary }}</p>
        </div>
        <span class="pill" :class="statusLabel">{{ statusLabel }}</span>
      </div>

      <dl class="meta-grid">
        <div>
          <dt>ส่งคำขอเมื่อ</dt>
          <dd>{{ item?.submitted_at ? new Date(item.submitted_at).toLocaleString() : "-" }}</dd>
        </div>
        <div>
          <dt>ตรวจสอบเมื่อ</dt>
          <dd>{{ item?.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : "-" }}</dd>
        </div>
      </dl>
    </section>

    <section class="panel">
      <form class="verification-form" @submit.prevent="submitVerification">
        <label>
          <span>ประเภทเอกสาร</span>
          <select v-model="form.document_type" :disabled="saving || !canEdit">
            <option value="id_card">บัตรประชาชน</option>
            <option value="passport">หนังสือเดินทาง</option>
            <option value="driver_license">ใบขับขี่</option>
            <option value="other">เอกสารอื่น ๆ</option>
          </select>
        </label>

        <label class="full-width">
          <span>รายละเอียดเพิ่มเติม</span>
          <textarea
            v-model="form.note"
            :disabled="saving || !canEdit"
            rows="5"
            placeholder="ระบุข้อมูลประกอบ เช่น ประเภทเอกสารที่ใช้ หรือคำอธิบายเพิ่มเติมสำหรับทีมตรวจสอบ"
          />
        </label>

        <p v-if="successMessage" class="feedback success">{{ successMessage }}</p>

        <div class="actions">
          <button type="submit" :disabled="saving || !canEdit">{{ submitLabel }}</button>
          <span v-if="!canEdit" class="locked-note">
            บัญชีที่อนุมัติแล้วไม่สามารถแก้ไขฟอร์มนี้ได้จากฝั่งผู้ใช้
          </span>
        </div>
      </form>
    </section>
  </AccountSectionLayout>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 16px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 22px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.panel-header p,
dt,
.locked-note {
  margin: 0;
  color: var(--text-muted);
}

.pill {
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 900;
  padding: 6px 10px;
  text-transform: uppercase;
}

.pill.pending {
  background: #fff7ed;
  color: #c2410c;
}

.pill.approved {
  background: #ecfdf3;
  color: #15803d;
}

.pill.not_submitted {
  background: #f5f5f5;
  color: #525252;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.meta-grid div,
.verification-form {
  display: grid;
  gap: 14px;
}

label {
  display: grid;
  gap: 8px;
}

label span,
strong,
dd {
  color: var(--text-strong);
  font-weight: 900;
}

dt,
dd {
  margin: 0;
}

select,
textarea,
button {
  border-radius: 12px;
  font: inherit;
}

select,
textarea {
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 12px 14px;
}

textarea {
  resize: vertical;
  min-height: 120px;
}

.full-width {
  width: 100%;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

button {
  width: fit-content;
  min-height: 46px;
  border: 0;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

button:disabled,
select:disabled,
textarea:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.feedback.success {
  margin: 0;
  color: #15803d;
  font-weight: 800;
}

@media (max-width: 760px) {
  .panel-header,
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
