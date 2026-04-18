<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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
  subscription?: {
    plan_name?: string;
    end_at?: string;
  };
};

const router = useRouter();
const plans = ref<Plan[]>([]);
const currentPlan = ref<CurrentPlan | null>(null);
const message = ref("");
const errorMessage = ref("");
const loading = ref(true);
const subscribingId = ref<number | null>(null);

const sortedPlans = computed(() => {
  return [...plans.value].sort((a, b) => a.duration_days - b.duration_days);
});

const activePlanText = computed(() => {
  if (!currentPlan.value?.isActive) return "";
  const planName = currentPlan.value.subscription?.plan_name || "VIP";
  const endAt = currentPlan.value.subscription?.end_at
    ? new Date(currentPlan.value.subscription.end_at).toLocaleDateString("th-TH")
    : "";

  return endAt ? `คุณใช้ ${planName} ถึงวันที่ ${endAt}` : `คุณใช้ ${planName} อยู่`;
});

function getPlanTitle(plan: Plan) {
  if (plan.duration_days >= 365) return "VIP 365 วัน";
  if (plan.duration_days >= 90) return "VIP 90 วัน";
  if (plan.duration_days >= 30) return "VIP 30 วัน";
  return `VIP ${plan.duration_days} วัน`;
}

function getDiscount(plan: Plan) {
  if (plan.duration_days >= 365) return 7;
  if (plan.duration_days >= 90) return 6;
  return 5;
}

function getOldPrice(plan: Plan) {
  const discount = getDiscount(plan);
  return Math.ceil(Number(plan.price || 0) / (1 - discount / 100));
}

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
  <main class="vip-page">
    <nav class="crumb" aria-label="breadcrumb">
      <router-link to="/">หน้าแรก</router-link>
      <span>›</span>
      <strong>Pinto VIP</strong>
    </nav>

    <section class="vip-hero">
      <div class="hero-copy">
        <p>Pinto VIP</p>
        <h1>สมัครไว้ซื้ออีบุ๊กได้คุ้มกว่าใคร</h1>
        <span>รับสิทธิพิเศษทุกเดือน ใช้ coin สมัคร แล้วเริ่มอ่านได้ทันที</span>
      </div>

      <div class="benefit-board" aria-label="สิทธิพิเศษ">
        <article>
          <small>ส่วนลด</small>
          <strong>ลดทุกครั้ง</strong>
          <span>ซื้ออีบุ๊กคุ้มขึ้น</span>
        </article>
        <article>
          <small>VIP Code</small>
          <strong>โค้ดพิเศษ</strong>
          <span>รับสิทธิทุกเดือน</span>
        </article>
        <article>
          <small>Coin Back</small>
          <strong>คืนกำไร</strong>
          <span>มีโปรพิเศษตามช่วงเวลา</span>
        </article>
      </div>
    </section>

    <p v-if="activePlanText" class="alert success">{{ activePlanText }}</p>
    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>

    <section class="plans-section">
      <header>
        <h2>ต่ออายุอัตโนมัติ</h2>
        <p>เลือกแพ็กเกจที่เหมาะกับการอ่านของคุณ</p>
      </header>

      <div v-if="loading" class="state-card">กำลังโหลดแพ็กเกจ...</div>
      <div v-else-if="sortedPlans.length === 0" class="state-card">
        ยังไม่มีแพ็กเกจรายเดือนในระบบ
      </div>

      <div v-else class="plan-grid">
        <article
          v-for="plan in sortedPlans"
          :key="plan.id"
          class="plan-card"
          :class="{ featured: plan.duration_days >= 90 }"
        >
          <span class="discount">-{{ getDiscount(plan) }}%</span>
          <h3>{{ getPlanTitle(plan) }}</h3>
          <strong>{{ plan.price }} coin</strong>
          <del>{{ getOldPrice(plan) }} coin</del>
          <ul>
            <li>อ่านคอนเทนต์แบบ subscription ได้ {{ plan.duration_days }} วัน</li>
            <li>รับสิทธิส่วนลด VIP ในหน้าร้าน</li>
            <li>ใช้ร่วมกับระบบ coin ของ Read and Voice</li>
          </ul>
          <button
            type="button"
            :disabled="subscribingId === plan.id"
            @click="subscribe(plan.id)"
          >
            {{ subscribingId === plan.id ? "กำลังสมัคร..." : "สมัคร" }}
          </button>
        </article>
      </div>
    </section>

    <section class="compare-section">
      <table>
        <thead>
          <tr>
            <th>รายละเอียด</th>
            <th>สมาชิกทั่วไป</th>
            <th>สมาชิก Pinto VIP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>อ่านหนังสือฟรี</td>
            <td>ได้เฉพาะเล่มฟรี</td>
            <td>ได้เฉพาะเล่มฟรี</td>
          </tr>
          <tr>
            <td>อ่านคอนเทนต์รายเดือน</td>
            <td>×</td>
            <td>✓ เมื่อหนังสือกำหนดเป็น subscription</td>
          </tr>
          <tr>
            <td>ซื้อหนังสือด้วย coin</td>
            <td>✓</td>
            <td>✓ พร้อมสิทธิ VIP ตามโปรโมชัน</td>
          </tr>
          <tr>
            <td>สิทธิพิเศษ</td>
            <td>ตามโปรปกติ</td>
            <td>โค้ดและแคมเปญสำหรับ VIP</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="details-section">
      <h2>ข้อกำหนดและเงื่อนไขการสมัครสมาชิก Pinto VIP</h2>
      <p>
        แพ็กเกจ VIP ใช้ coin ในการสมัคร สิทธิจะเริ่มนับทันทีหลังสมัครสำเร็จ
        และใช้กับหนังสือหรือตอนที่ระบบกำหนดเป็น subscription เท่านั้น
      </p>
      <ul>
        <li>หาก coin ไม่พอ ระบบจะพาไปหน้าเติม coin ก่อนสมัคร</li>
        <li>เมื่อสมัครซ้ำ ระบบจะขยายวันใช้งานต่อจากแพ็กเกจเดิม</li>
        <li>สิทธิพิเศษอาจเปลี่ยนแปลงตามช่วงโปรโมชันของระบบ</li>
      </ul>
    </section>

    <section class="faq-section">
      <h2>คำถามที่พบบ่อย</h2>
      <details open>
        <summary>อ่านแบบรายเดือนคืออะไร?</summary>
        <p>คือการสมัครแพ็กเกจเพื่ออ่านหนังสือหรือรายตอนที่กำหนดสิทธิ์เป็น subscription</p>
      </details>
      <details>
        <summary>สมัครแล้วอ่านหนังสือได้ทุกเล่มไหม?</summary>
        <p>อ่านได้เฉพาะเล่มที่ตั้งค่าเป็น subscription หรือเล่มฟรี ส่วนเล่มขายแยกยังใช้ coin ซื้อได้ตามปกติ</p>
      </details>
      <details>
        <summary>coin ไม่พอต้องทำอย่างไร?</summary>
        <p>เติม coin ที่หน้า wallet แล้วกลับมาสมัครแพ็กเกจอีกครั้ง</p>
      </details>
    </section>
  </main>
</template>

<style scoped>
.vip-page {
  min-height: 100vh;
  background: #ffffff;
  color: #111827;
  padding: 22px 20px 72px;
}

.crumb,
.vip-hero,
.plans-section,
.compare-section,
.details-section,
.faq-section,
.alert {
  width: min(100%, 760px);
  margin-inline: auto;
}

.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 12px;
  margin-bottom: 14px;
}

.crumb a {
  color: #6b7280;
  text-decoration: none;
}

.vip-hero {
  display: grid;
  min-height: 380px;
  overflow: hidden;
  border-radius: 4px;
  background:
    radial-gradient(circle at 72% 18%, rgba(255, 255, 255, 0.25), transparent 24%),
    linear-gradient(135deg, #e62129 0%, #f54235 45%, #f6a21a 100%);
  color: #ffffff;
  padding: 38px 28px 26px;
}

.hero-copy {
  text-align: center;
}

.hero-copy p,
.hero-copy h1,
.hero-copy span {
  margin: 0;
}

.hero-copy p {
  color: #fff8d6;
  font-size: clamp(44px, 7vw, 82px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
  text-shadow: 0 4px 12px rgba(116, 30, 12, 0.3);
}

.hero-copy h1 {
  margin-top: 12px;
  font-size: clamp(26px, 4.5vw, 46px);
  font-weight: 900;
  line-height: 1.08;
  text-shadow: 0 3px 10px rgba(116, 30, 12, 0.24);
}

.hero-copy span {
  display: block;
  margin-top: 10px;
  font-size: 16px;
  font-weight: 800;
}

.benefit-board {
  align-self: end;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 32px;
}

.benefit-board article {
  min-height: 150px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  background: linear-gradient(180deg, #fff6bc, #ffd86a);
  color: #d72323;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 10px 18px rgba(122, 37, 8, 0.18);
}

.benefit-board small {
  color: #7c2d12;
  font-weight: 900;
}

.benefit-board strong {
  font-size: 28px;
  font-weight: 900;
}

.benefit-board span {
  color: #7c2d12;
  font-size: 13px;
  font-weight: 800;
}

.alert {
  border-radius: 4px;
  font-weight: 800;
  margin-top: 16px;
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

.plans-section {
  margin-top: 28px;
  text-align: center;
}

.plans-section header h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
}

.plans-section header p {
  margin: 4px 0 18px;
  color: #6b7280;
  font-size: 13px;
}

.state-card {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  color: #6b7280;
  padding: 22px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.plan-card {
  position: relative;
  display: grid;
  gap: 10px;
  border: 1px solid #cfd8dc;
  border-top: 3px solid #9ca3af;
  border-radius: 4px;
  background: #ffffff;
  padding: 22px 14px 14px;
  text-align: left;
}

.plan-card.featured {
  border-top-color: #20b7d2;
}

.discount {
  position: absolute;
  top: -1px;
  right: -1px;
  background: #ef3f45;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  padding: 5px 8px;
}

.plan-card h3,
.plan-card strong,
.plan-card del {
  text-align: center;
}

.plan-card h3 {
  margin: 0;
  color: #111827;
  font-size: 16px;
}

.plan-card strong {
  color: #111827;
  font-size: 22px;
}

.plan-card del {
  color: #6b7280;
  font-size: 13px;
}

.plan-card ul {
  display: grid;
  gap: 6px;
  margin: 6px 0;
  color: #374151;
  font-size: 12px;
  line-height: 1.5;
  padding-left: 16px;
}

.plan-card button {
  min-height: 34px;
  border: 0;
  border-radius: 4px;
  background: #f14747;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
}

.plan-card button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.compare-section {
  margin-top: 30px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  border: 1px solid #d1d5db;
  padding: 14px;
  vertical-align: top;
}

th {
  background: #232329;
  color: #ffffff;
}

th:nth-child(2) {
  background: #2fa9bf;
}

th:nth-child(3) {
  background: #ef3f45;
}

.details-section,
.faq-section {
  margin-top: 28px;
}

.details-section h2,
.faq-section h2 {
  margin: 0 0 12px;
  color: #111827;
  font-size: 18px;
}

.details-section p,
.details-section li,
.faq-section p {
  color: #374151;
  font-size: 14px;
  line-height: 1.7;
}

.details-section ul {
  padding-left: 20px;
}

.faq-section details {
  border-bottom: 1px solid #d1d5db;
  padding: 14px 0;
}

.faq-section summary {
  cursor: pointer;
  font-weight: 900;
}

@media (max-width: 760px) {
  .vip-page {
    padding-inline: 12px;
  }

  .vip-hero {
    min-height: auto;
    padding: 28px 16px 18px;
  }

  .benefit-board,
  .plan-grid {
    grid-template-columns: 1fr;
  }

  .benefit-board article {
    min-height: 118px;
  }
}
</style>
