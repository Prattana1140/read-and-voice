<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api, { API_BASE_URL } from "../utils/api";

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
    name?: string;
    end_at?: string;
  };
};

type PageContent = {
  subscriptionHero?: {
    image_url?: string;
    updated_at?: string | null;
  };
};

const router = useRouter();
const plans = ref<Plan[]>([]);
const currentPlan = ref<CurrentPlan | null>(null);
const pageContent = ref<PageContent | null>(null);
const message = ref("");
const errorMessage = ref("");
const loading = ref(true);
const subscribingId = ref<number | null>(null);

const sortedPlans = computed(() => {
  return [...plans.value].sort((a, b) => a.duration_days - b.duration_days);
});

const activePlanText = computed(() => {
  if (!currentPlan.value?.isActive) return "";
  const endAt = currentPlan.value.subscription?.end_at
    ? new Date(currentPlan.value.subscription.end_at).toLocaleDateString("th-TH")
    : "";

  return endAt
    ? `แพ็กเกจสมาชิกของคุณใช้งานได้ถึงวันที่ ${endAt}`
    : "แพ็กเกจสมาชิกของคุณกำลังใช้งานอยู่";
});

function getPlanTitle(plan: Plan) {
  if (plan.duration_days >= 365) return "แพ็กเกจสมาชิก 365 วัน";
  if (plan.duration_days >= 90) return "แพ็กเกจสมาชิก 90 วัน";
  if (plan.duration_days >= 30) return "แพ็กเกจสมาชิก 30 วัน";
  return `แพ็กเกจสมาชิก ${plan.duration_days} วัน`;
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

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
};

const heroImageUrl = computed(() => {
  return resolveImageUrl(pageContent.value?.subscriptionHero?.image_url || "");
});

async function loadPlans() {
  loading.value = true;
  message.value = "";
  errorMessage.value = "";

  try {
    const [plansRes, meRes, pageContentRes] = await Promise.allSettled([
      api.get("/subscriptions/plans"),
      api.get("/subscriptions/me"),
      api.get("/page-content"),
    ]);

    if (plansRes.status === "fulfilled") {
      plans.value = Array.isArray(plansRes.value.data) ? plansRes.value.data : [];
    } else {
      plans.value = [];
      errorMessage.value =
        plansRes.reason?.response?.data?.message ||
        "โหลดแพ็กเกจรายเดือนไม่สำเร็จ";
    }

    currentPlan.value = meRes.status === "fulfilled" ? meRes.value.data || null : null;
    pageContent.value =
      pageContentRes.status === "fulfilled" ? pageContentRes.value.data || null : null;
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
      errorMessage.value = "คอยน์ไม่พอ กรุณาเติมคอยน์ก่อนสมัครแพ็กเกจ";
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
      <strong>สมาชิกพิเศษ Pinto</strong>
    </nav>

    <section class="vip-hero" :class="{ 'has-admin-image': heroImageUrl }">
      <img
        v-if="heroImageUrl"
        class="admin-hero-image"
        :src="heroImageUrl"
        alt="สมาชิกพิเศษ Pinto"
      />
      <div class="hero-copy">
        <p>สมาชิกพิเศษ Pinto</p>
        <h1>สมัครไว้ซื้ออีบุ๊กได้คุ้มกว่าใคร</h1>
        <span>รับสิทธิพิเศษทุกเดือน ใช้คอยน์สมัคร แล้วเริ่มอ่านได้ทันที</span>
      </div>

      <div class="benefit-board" aria-label="สิทธิพิเศษ">
        <article>
          <small>ส่วนลด</small>
          <strong>ลดทุกครั้ง</strong>
          <span>ซื้ออีบุ๊กคุ้มขึ้น</span>
        </article>
        <article>
          <small>โค้ดสมาชิกพิเศษ</small>
          <strong>โค้ดพิเศษ</strong>
          <span>รับสิทธิทุกเดือน</span>
        </article>
        <article>
          <small>คืนคอยน์</small>
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
          <strong>{{ plan.price }} คอยน์</strong>
          <del>{{ getOldPrice(plan) }} คอยน์</del>
          <ul>
            <li>อ่านคอนเทนต์แบบแพ็กเกจสมาชิกได้ {{ plan.duration_days }} วัน</li>
            <li>รับสิทธิส่วนลดสมาชิกพิเศษในหน้าร้าน</li>
            <li>ใช้ร่วมกับระบบคอยน์ของ Read and Voice</li>
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
            <th>สมาชิกพิเศษ Pinto</th>
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
            <td>✓ เมื่อหนังสือกำหนดเป็นแพ็กเกจสมาชิก</td>
          </tr>
          <tr>
            <td>ซื้อหนังสือด้วยคอยน์</td>
            <td>✓</td>
            <td>✓ พร้อมสิทธิสมาชิกพิเศษตามโปรโมชัน</td>
          </tr>
          <tr>
            <td>สิทธิพิเศษ</td>
            <td>ตามโปรปกติ</td>
            <td>โค้ดและแคมเปญสำหรับสมาชิกพิเศษ</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="details-section">
      <h2>ข้อกำหนดและเงื่อนไขการสมัครสมาชิกพิเศษ Pinto</h2>
      <p>
        แพ็กเกจสมาชิกพิเศษใช้คอยน์ในการสมัคร สิทธิจะเริ่มนับทันทีหลังสมัครสำเร็จ
        และใช้กับหนังสือหรือตอนที่ระบบกำหนดเป็นแพ็กเกจสมาชิกเท่านั้น
      </p>
      <ul>
        <li>หากคอยน์ไม่พอ ระบบจะพาไปหน้าเติมคอยน์ก่อนสมัคร</li>
        <li>เมื่อสมัครซ้ำ ระบบจะขยายวันใช้งานต่อจากแพ็กเกจเดิม</li>
        <li>สิทธิพิเศษอาจเปลี่ยนแปลงตามช่วงโปรโมชันของระบบ</li>
      </ul>
    </section>

    <section class="faq-section">
      <h2>คำถามที่พบบ่อย</h2>
      <details open>
        <summary>อ่านแบบรายเดือนคืออะไร?</summary>
        <p>คือการสมัครแพ็กเกจเพื่ออ่านหนังสือหรือรายตอนที่กำหนดสิทธิ์เป็นแพ็กเกจสมาชิก</p>
      </details>
      <details>
        <summary>สมัครแล้วอ่านหนังสือได้ทุกเล่มไหม?</summary>
        <p>อ่านได้เฉพาะเล่มที่ตั้งค่าเป็นแพ็กเกจสมาชิกหรือเล่มฟรี ส่วนเล่มขายแยกยังใช้คอยน์ซื้อได้ตามปกติ</p>
      </details>
      <details>
        <summary>คอยน์ไม่พอต้องทำอย่างไร?</summary>
        <p>เติมคอยน์ที่หน้ากระเป๋าคอยน์ แล้วกลับมาสมัครแพ็กเกจอีกครั้ง</p>
      </details>
    </section>
  </main>
</template>

<style scoped>
.vip-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text);
  padding: var(--page-block, 22px) var(--page-gutter, 20px) 72px;
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

.vip-hero.has-admin-image {
  display: block;
  min-height: 0;
  padding: 0;
  background: #f3f4f6;
}

.vip-hero.has-admin-image .hero-copy,
.vip-hero.has-admin-image .benefit-board {
  display: none;
}

.admin-hero-image {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 7;
  object-fit: cover;
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
  color: var(--text-strong);
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
  background: var(--surface);
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
  color: var(--text-strong);
  font-size: 16px;
}

.plan-card strong {
  color: var(--text-strong);
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
  color: var(--text-strong);
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
    padding-inline: var(--page-gutter, 12px);
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

  table {
    min-width: 620px;
  }
}

@media (max-width: 420px) {
  .hero-copy p {
    font-size: 38px;
  }

  .hero-copy h1 {
    font-size: 24px;
  }

  .admin-hero-image {
    aspect-ratio: 4 / 3;
  }
}
</style>
