<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../utils/api";

type Plan = {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_days: number;
};

type CurrentPlan = {
  isActive?: boolean;
  plan?: Plan;
  end_at?: string;
};

const router = useRouter();
const plans = ref<Plan[]>([]);
const currentPlan = ref<CurrentPlan | null>(null);
const message = ref("");
const errorMessage = ref("");
const loading = ref(true);
const subscribingId = ref<number | null>(null);

async function loadPlans() {
  loading.value = true;
  message.value = "";
  errorMessage.value = "";

  try {
    const [plansRes, meRes] = await Promise.all([
      api.get("/subscriptions/plans"),
      api.get("/subscriptions/me"),
    ]);

    plans.value = Array.isArray(plansRes.data) ? plansRes.data : [];
    currentPlan.value = meRes.data || null;
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "โหลดแพ็กเกจไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function subscribe(planId: number) {
  message.value = "";
  errorMessage.value = "";
  subscribingId.value = planId;

  try {
    const { data } = await api.post("/subscriptions/checkout", { planId });
    message.value = data?.message || "สมัครแพ็กเกจสำเร็จ";
    await loadPlans();
  } catch (error: any) {
    if (error?.response?.status === 402) {
      errorMessage.value = "coin ไม่พอ กรุณาเติม coin ก่อนสมัครแพ็กเกจ";
      router.push({ name: "CoinWallet" });
      return;
    }

    errorMessage.value =
      error?.response?.data?.message || "สมัครแพ็กเกจไม่สำเร็จ";
  } finally {
    subscribingId.value = null;
  }
}

onMounted(loadPlans);
</script>

<template>
  <main class="plans-page">
    <section class="hero">
      <p class="eyebrow">Read and Voice Plus</p>
      <h1>อ่านนิยายและหนังสือแบบรายเดือน</h1>
      <p>
        ใช้ coin สมัครแพ็กเกจ แล้วอ่านคอนเทนต์ที่กำหนดเป็น subscription ได้ทันที
      </p>

      <div class="hero-actions">
        <button type="button" @click="router.push('/coin-wallet')">เติม coin</button>
        <button class="ghost" type="button" @click="router.push('/store')">
          เลือกหนังสือ
        </button>
      </div>

      <p v-if="currentPlan?.isActive" class="alert success">
        คุณมีแพ็กเกจที่ใช้งานอยู่แล้ว
      </p>
      <p v-if="message" class="alert success">{{ message }}</p>
      <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
    </section>

    <section v-if="loading" class="state-card">กำลังโหลดแพ็กเกจ...</section>

    <section v-else class="plan-grid">
      <article v-for="plan in plans" :key="plan.id" class="plan-card">
        <span>{{ plan.duration_days }} วัน</span>
        <h2>{{ plan.name }}</h2>
        <p>{{ plan.description }}</p>
        <strong>{{ plan.price }} coin</strong>
        <button
          type="button"
          :disabled="subscribingId === plan.id"
          @click="subscribe(plan.id)"
        >
          {{ subscribingId === plan.id ? "กำลังสมัคร..." : "สมัครแพ็กเกจนี้" }}
        </button>
      </article>
    </section>
  </main>
</template>

<style scoped>
.plans-page {
  background: #f7f8fb;
  min-height: 100vh;
  padding: 24px;
}

.hero,
.state-card,
.plan-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.hero {
  margin: 0 auto 18px;
  max-width: 1120px;
  padding: 30px;
}

.eyebrow {
  color: #0f766e;
  font-weight: 900;
  margin: 0 0 8px;
}

h1,
h2 {
  color: #111827;
  margin: 0;
}

h1 {
  font-size: clamp(32px, 5vw, 56px);
}

.hero p:not(.eyebrow),
.plan-card p {
  color: #6b7280;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0 0;
}

button {
  border: 0;
  border-radius: 8px;
  background: #14b8a6;
  color: white;
  cursor: pointer;
  font-weight: 900;
  padding: 12px 16px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

button.ghost {
  background: #eef2ff;
  color: #3730a3;
}

.alert {
  border-radius: 8px;
  font-weight: 800;
  margin-top: 14px;
  padding: 12px 14px;
}

.success {
  background: #ecfdf5;
  color: #047857;
}

.error {
  background: #fef2f2;
  color: #dc2626;
}

.state-card,
.plan-grid {
  margin: 0 auto;
  max-width: 1120px;
}

.state-card {
  color: #6b7280;
  padding: 24px;
}

.plan-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.plan-card {
  display: grid;
  gap: 12px;
  padding: 22px;
}

.plan-card span {
  color: #0f766e;
  font-weight: 900;
}

.plan-card strong {
  color: #111827;
  font-size: 34px;
}
</style>
