<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../utils/api";

type PageConfig = {
  title: string;
  text: string;
  endpoint: string;
  emptyText: string;
};

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const errorMessage = ref("");
const rawData = ref<any>(null);

const pageMap: Record<string, PageConfig> = {
  AccountFollowing: {
    title: "รายการที่ติดตาม",
    text: "รวมรายการหนังสือ นักเขียน สำนักพิมพ์ และหมวดหมู่ที่คุณติดตามไว้",
    endpoint: "/account/following",
    emptyText: "ยังไม่มีรายการที่ติดตาม",
  },
  AccountGiftCodes: {
    title: "Gift Code",
    text: "ตรวจสอบ Gift Code ที่ได้รับและสถานะการใช้งานทั้งหมด",
    endpoint: "/account/gift-codes",
    emptyText: "ยังไม่มี Gift Code",
  },
  AccountBuffet: {
    title: "บุฟเฟต์ของฉัน",
    text: "ตรวจสอบสถานะบุฟเฟต์ วันหมดอายุ และรายการที่อ่านได้",
    endpoint: "/account/buffet",
    emptyText: "ยังไม่มีข้อมูลบุฟเฟต์",
  },
  AccountDevices: {
    title: "อุปกรณ์ของฉัน",
    text: "รายการอุปกรณ์ที่ใช้กับบัญชี Read and Voice",
    endpoint: "/account/devices",
    emptyText: "ยังไม่มีอุปกรณ์ที่บันทึกไว้",
  },
  AccountBenefits: {
    title: "สิทธิพิเศษของฉัน",
    text: "รวมสิทธิพิเศษ ส่วนลด และแคมเปญที่คุณได้รับ",
    endpoint: "/account/benefits",
    emptyText: "ยังไม่มีสิทธิพิเศษ",
  },
  AccountReviews: {
    title: "รีวิวของฉัน",
    text: "รวมรีวิวและเรตติ้งหนังสือที่คุณเคยให้ไว้",
    endpoint: "/account/reviews",
    emptyText: "ยังไม่มีรีวิว",
  },
  AccountAgeVerification: {
    title: "การยืนยันอายุด้วยบัตรประชาชน",
    text: "ยืนยันอายุเพื่อเข้าถึงเนื้อหาที่จำกัดเฉพาะผู้ใช้ที่มีอายุเหมาะสม",
    endpoint: "/account/age-verification",
    emptyText: "ยังไม่ได้ส่งคำขอยืนยันอายุ",
  },
};

const page = computed<PageConfig>(() => {
  return pageMap[String(route.name)] || {
    title: "บัญชีของฉัน",
    text: "หน้าจัดการข้อมูลบัญชี",
    endpoint: "/profile/me",
    emptyText: "ยังไม่มีข้อมูล",
  };
});

const items = computed(() => {
  const data = rawData.value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (data && typeof data === "object") return [data];
  return [];
});

function getItemTitle(item: any) {
  return (
    item.target_name ||
    item.code ||
    item.device_name ||
    item.title ||
    item.book_title ||
    item.status ||
    "รายการ"
  );
}

function getItemText(item: any) {
  return (
    item.description ||
    item.comment ||
    item.platform ||
    item.document_type ||
    item.note ||
    item.status ||
    item.created_at ||
    "ไม่มีรายละเอียดเพิ่มเติม"
  );
}

async function loadData() {
  try {
    loading.value = true;
    errorMessage.value = "";
    rawData.value = null;

    const { data } = await api.get(page.value.endpoint);
    rawData.value = data;
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || `โหลดข้อมูล ${page.value.title} ไม่สำเร็จ`;
  } finally {
    loading.value = false;
  }
}

async function submitAgeVerification() {
  try {
    loading.value = true;
    errorMessage.value = "";
    await api.post("/account/age-verification", { document_type: "id_card" });
    await loadData();
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "ส่งคำขอยืนยันอายุไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

watch(() => route.name, loadData);
onMounted(loadData);
</script>

<template>
  <main class="placeholder-page">
    <section class="placeholder-card">
      <p>Read and Voice Account</p>
      <h1>{{ page.title }}</h1>
      <span>{{ page.text }}</span>

      <div v-if="loading" class="state">กำลังโหลดข้อมูล...</div>
      <div v-else-if="errorMessage" class="state error">{{ errorMessage }}</div>

      <div v-else class="item-list">
        <article v-for="item in items" :key="item.id || item.status" class="item-row">
          <strong>{{ getItemTitle(item) }}</strong>
          <span>{{ getItemText(item) }}</span>
        </article>

        <div v-if="!items.length" class="state">
          {{ page.emptyText }}
        </div>
      </div>

      <button
        v-if="route.name === 'AccountAgeVerification'"
        type="button"
        class="verify-button"
        :disabled="loading"
        @click="submitAgeVerification"
      >
        ส่งคำขอยืนยันอายุ
      </button>

      <div class="actions">
        <button type="button" @click="router.push('/profile')">
          กลับไปจัดการบัญชี
        </button>
        <button type="button" class="ghost" @click="router.push('/')">
          กลับหน้าแรก
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.placeholder-page {
  min-height: 70vh;
  display: grid;
  place-items: center;
  background: #ffffff;
  color: #111827;
  padding: 32px 16px;
}

.placeholder-card {
  width: min(720px, 100%);
  border: 1px solid #dbe4e1;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 118, 110, 0.08);
  padding: 34px;
}

.placeholder-card p,
.placeholder-card h1,
.placeholder-card span {
  margin: 0;
}

.placeholder-card p {
  color: #0f766e;
  font-size: 13px;
  font-weight: 900;
}

.placeholder-card h1 {
  margin-top: 8px;
  font-size: 32px;
}

.placeholder-card > span {
  display: block;
  margin-top: 12px;
  color: #4b5563;
  line-height: 1.7;
}

.item-list {
  display: grid;
  gap: 10px;
  margin-top: 24px;
}

.item-row {
  display: grid;
  gap: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
}

.item-row strong {
  color: #009b72;
}

.item-row span {
  color: #4b5563;
}

.state {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #4b5563;
  margin-top: 24px;
  padding: 14px;
}

.state.error {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.verify-button {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  background: #00a878;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  margin-top: 18px;
  padding: 0 16px;
}

.verify-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
  flex-wrap: wrap;
}

.actions button {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  background: #20b8ad;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.actions button.ghost {
  background: #e8faf6;
  color: #0f766e;
}

.actions button:hover,
.verify-button:hover {
  box-shadow: 0 10px 20px rgba(15, 118, 110, 0.14);
  transform: translateY(-2px);
}

.actions button:active,
.verify-button:active {
  transform: translateY(0) scale(0.97);
}
</style>
