<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api, { API_BASE_URL } from "../utils/api";
import { getToken } from "../utils/auth";

type Plan = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  duration_days: number | string;
};

type CurrentPlan = {
  isActive?: boolean;
  subscription?: {
    plan_name?: string;
    name?: string;
    end_at?: string;
    duration_days?: number | string;
  } | null;
};

type PageContent = {
  subscriptionHero?: {
    image_url?: string;
    updated_at?: string | null;
  };
};

type Wallet = {
  balance?: number | string;
};

const router = useRouter();
const plans = ref<Plan[]>([]);
const currentPlan = ref<CurrentPlan | null>(null);
const pageContent = ref<PageContent | null>(null);
const walletBalance = ref<number | null>(null);
const message = ref("");
const errorMessage = ref("");
const loading = ref(true);
const walletLoading = ref(false);
const subscribingId = ref<number | null>(null);

const isLoggedIn = computed(() => !!getToken());

const sortedPlans = computed(() => {
  return [...plans.value].sort((a, b) => getPlanDays(a) - getPlanDays(b));
});

const featuredPlanId = computed(() => {
  const quarterly = sortedPlans.value.find((plan) => getPlanDays(plan) >= 90);
  return quarterly?.id || sortedPlans.value[Math.min(1, sortedPlans.value.length - 1)]?.id;
});

const activePlanText = computed(() => {
  if (!currentPlan.value?.isActive) return "";
  const sub = currentPlan.value.subscription;
  const planName = sub?.plan_name || sub?.name || "แพ็กเกจสมาชิก";
  const endAt = sub?.end_at ? new Date(sub.end_at).toLocaleDateString("th-TH") : "";

  return endAt
    ? `${planName} ของคุณใช้งานได้ถึง ${endAt}`
    : `${planName} ของคุณกำลังใช้งานอยู่`;
});

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
};

const heroImageUrl = computed(() => {
  return resolveImageUrl(pageContent.value?.subscriptionHero?.image_url || "");
});

const walletText = computed(() => {
  if (!isLoggedIn.value) return "เข้าสู่ระบบเพื่อดูยอดคอยน์";
  if (walletLoading.value) return "กำลังโหลดยอดคอยน์...";
  if (walletBalance.value === null) return "ยังไม่พบยอดคอยน์";
  return `${formatCoins(walletBalance.value)} คอยน์`;
});

function getPlanDays(plan: Plan) {
  return Number(plan.duration_days || 0);
}

function getPlanPrice(plan: Plan) {
  return Number(plan.price || 0);
}

function formatCoins(value: number | string) {
  const amount = Number(value || 0);
  return amount.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function getPlanTitle(plan: Plan) {
  const days = getPlanDays(plan);
  if (days >= 365) return "รายปี";
  if (days >= 90) return "รายไตรมาส";
  if (days >= 30) return "รายเดือน";
  return `${days} วัน`;
}

function getPlanSubtitle(plan: Plan) {
  const days = getPlanDays(plan);
  if (days >= 365) return "เหมาะกับนักอ่านประจำ คุ้มที่สุด";
  if (days >= 90) return "ต่อเนื่องยาวขึ้น จ่ายน้อยลง";
  if (days >= 30) return "เริ่มต้นอ่านแบบสมาชิก";
  return "ทดลองใช้สิทธิ์สมาชิก";
}

function getDailyPrice(plan: Plan) {
  const days = Math.max(getPlanDays(plan), 1);
  const price = getPlanPrice(plan);
  return price / days;
}

function getDiscount(plan: Plan) {
  const dailyPrice = getDailyPrice(plan);
  const base = sortedPlans.value[0] ? getDailyPrice(sortedPlans.value[0]) : dailyPrice;
  if (!base || dailyPrice >= base) return 0;
  return Math.round((1 - dailyPrice / base) * 100);
}

function getPlanBenefits(plan: Plan) {
  const days = getPlanDays(plan);
  const benefits = [
    `ใช้สิทธิ์สมาชิกได้ ${days.toLocaleString("th-TH")} วัน`,
    "อ่านหนังสือ/ตอนที่กำหนดเป็นสมาชิกได้ทันที",
    "ชำระด้วยคอยน์จากกระเป๋า Read and Voice",
  ];

  if (days >= 90) {
    benefits.push("เหมาะกับการอ่านต่อเนื่องและลดต้นทุนต่อวัน");
  }

  if (days >= 365) {
    benefits.push("ดีที่สุดสำหรับผู้อ่านประจำทั้งปี");
  }

  return benefits;
}

function canAfford(plan: Plan) {
  return walletBalance.value !== null && walletBalance.value >= Math.ceil(getPlanPrice(plan));
}

async function loadWallet() {
  if (!isLoggedIn.value) {
    walletBalance.value = null;
    return;
  }

  walletLoading.value = true;
  try {
    const { data } = await api.get<Wallet>("/coins/wallet");
    walletBalance.value = Number(data?.balance || 0);
  } catch {
    walletBalance.value = null;
  } finally {
    walletLoading.value = false;
  }
}

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
        plansRes.reason?.response?.data?.message || "โหลดแพ็กเกจสมาชิกไม่สำเร็จ";
    }

    currentPlan.value = meRes.status === "fulfilled" ? meRes.value.data || null : null;
    pageContent.value =
      pageContentRes.status === "fulfilled" ? pageContentRes.value.data || null : null;
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดแพ็กเกจไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function subscribe(plan: Plan) {
  message.value = "";
  errorMessage.value = "";

  if (!isLoggedIn.value) {
    router.push({ name: "Login" });
    return;
  }

  const price = Math.ceil(getPlanPrice(plan));
  const confirmed = window.confirm(
    `ยืนยันสมัคร ${getPlanTitle(plan)} โดยชำระ ${formatCoins(price)} คอยน์ใช่ไหม?`,
  );
  if (!confirmed) return;

  subscribingId.value = plan.id;

  try {
    const { data } = await api.post("/subscriptions/checkout", { planId: plan.id });
    walletBalance.value = Number(data?.balance ?? walletBalance.value ?? 0);
    message.value =
      data?.message ||
      `สมัคร ${getPlanTitle(plan)} สำเร็จ หัก ${formatCoins(price)} คอยน์แล้ว`;
    window.alert(`สมัคร ${getPlanTitle(plan)} สำเร็จ หัก ${formatCoins(price)} เหรียญแล้ว`);
    await Promise.all([loadPlans(), loadWallet()]);
  } catch (error: any) {
    if (error?.response?.status === 402) {
      const balance = Number(error?.response?.data?.balance ?? walletBalance.value ?? 0);
      window.alert(`เหรียญไม่พอ ตอนนี้มี ${formatCoins(balance)} เหรียญ ต้องใช้ ${formatCoins(price)} เหรียญ`);
      walletBalance.value = balance;
      errorMessage.value = `คอยน์ไม่พอ ตอนนี้มี ${formatCoins(balance)} คอยน์ ต้องใช้ ${formatCoins(price)} คอยน์`;
      return;
    }

    if (error?.response?.status === 401) {
      router.push({ name: "Login" });
      return;
    }

    errorMessage.value =
      error?.response?.data?.message || "สมัครแพ็กเกจไม่สำเร็จ กรุณาลองอีกครั้ง";
    window.alert(errorMessage.value || "สมัครแพ็กเกจไม่สำเร็จ กรุณาลองอีกครั้ง");
  } finally {
    subscribingId.value = null;
  }
}

function goTopUp() {
  router.push({ name: "CoinWallet" });
}

function handlePlanAction(plan: Plan) {
  if (isLoggedIn.value && walletBalance.value !== null && !canAfford(plan)) {
    const price = Math.ceil(getPlanPrice(plan));
    window.alert(
      `เหรียญไม่พอ ตอนนี้มี ${formatCoins(walletBalance.value)} เหรียญ ต้องใช้ ${formatCoins(price)} เหรียญ`,
    );
    return;
  }

  subscribe(plan);
}

onMounted(async () => {
  await Promise.all([loadPlans(), loadWallet()]);
});
</script>

<template>
  <main class="vip-page">
    <nav class="crumb" aria-label="breadcrumb">
      <router-link to="/">หน้าแรก</router-link>
      <span>/</span>
      <strong>สมาชิกพิเศษ Pinto</strong>
    </nav>

    <section class="vip-hero">
      <div class="hero-copy">
        <p class="eyebrow">Pinto VIP</p>
        <h1>สมัครสมาชิกพิเศษ อ่านได้คุ้มกว่าเดิม</h1>
        <span>
          เลือกแพ็กเกจที่เหมาะกับจังหวะการอ่านของคุณ แล้วชำระด้วยคอยน์จากกระเป๋าได้ทันที
        </span>
        <div class="hero-actions">
          <a href="#plans">เลือกแพ็กเกจ</a>
          <button type="button" @click="goTopUp">เติมคอยน์</button>
        </div>
      </div>

      <div class="hero-panel">
        <img
          v-if="heroImageUrl"
          class="hero-image"
          :src="heroImageUrl"
          alt="สมาชิกพิเศษ Pinto"
        />
        <div v-else class="vip-token" aria-hidden="true">
          <strong>VIP</strong>
          <span>Pinto</span>
        </div>

        <div class="wallet-card">
          <small>คอยน์ของคุณ</small>
          <strong>{{ walletText }}</strong>
          <button type="button" @click="goTopUp">เติมคอยน์</button>
        </div>
      </div>
    </section>

    <section class="status-strip" aria-label="สถานะสมาชิกและการชำระเงิน">
      <article>
        <span>สถานะสมาชิก</span>
        <strong>{{ activePlanText || "ยังไม่มีแพ็กเกจที่ใช้งานอยู่" }}</strong>
      </article>
      <article>
        <span>การชำระเงิน</span>
        <strong>หักคอยน์จริงจากกระเป๋าเมื่อกดยืนยันสมัคร</strong>
      </article>
    </section>

    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>

    <section id="plans" class="plans-section">
      <div class="section-head">
        <p>เลือกแพ็กเกจ</p>
        <h2>จ่ายด้วยคอยน์ เริ่มใช้สิทธิ์ทันที</h2>
      </div>

      <div v-if="loading" class="state-card">กำลังโหลดแพ็กเกจ...</div>
      <div v-else-if="sortedPlans.length === 0" class="state-card">
        ยังไม่มีแพ็กเกจสมาชิกในระบบ
      </div>

      <div v-else class="plan-grid">
        <article
          v-for="plan in sortedPlans"
          :key="plan.id"
          class="plan-card"
          :class="{
            featured: plan.id === featuredPlanId,
            unaffordable: isLoggedIn && walletBalance !== null && !canAfford(plan),
          }"
        >
          <span v-if="plan.id === featuredPlanId" class="plan-ribbon">แนะนำ</span>
          <span v-else-if="getDiscount(plan)" class="plan-ribbon quiet">
            ประหยัด {{ getDiscount(plan) }}%
          </span>

          <div>
            <p>{{ getPlanSubtitle(plan) }}</p>
            <h3>{{ getPlanTitle(plan) }}</h3>
          </div>

          <div class="price-line">
            <strong>{{ formatCoins(getPlanPrice(plan)) }}</strong>
            <span>คอยน์</span>
          </div>
          <small class="daily-price">
            เฉลี่ย {{ getDailyPrice(plan).toLocaleString("th-TH", { maximumFractionDigits: 1 }) }} คอยน์/วัน
          </small>

          <ul>
            <li v-for="benefit in getPlanBenefits(plan)" :key="benefit">
              {{ benefit }}
            </li>
          </ul>

          <button
            type="button"
            :disabled="subscribingId === plan.id"
            @click="handlePlanAction(plan)"
          >
            {{
              subscribingId === plan.id
                ? "กำลังชำระ..."
                : isLoggedIn && walletBalance !== null && !canAfford(plan)
                  ? "เติมคอยน์ก่อนสมัคร"
                  : "สมัครด้วยคอยน์"
            }}
          </button>
        </article>
      </div>
    </section>

    <section class="benefits-section" aria-label="สิทธิ์สมาชิก">
      <article>
        <span>01</span>
        <h3>อ่านเนื้อหาสมาชิก</h3>
        <p>ปลดล็อกหนังสือหรือตอนที่ตั้งค่าสำหรับสมาชิกตามระยะเวลาแพ็กเกจ</p>
      </article>
      <article>
        <span>02</span>
        <h3>ต่ออายุแบบทบวัน</h3>
        <p>ถ้ายังมีแพ็กเกจเดิมอยู่ ระบบจะต่อวันจากวันหมดอายุล่าสุด</p>
      </article>
      <article>
        <span>03</span>
        <h3>ตรวจสอบได้ในประวัติคอยน์</h3>
        <p>ทุกการสมัครจะถูกบันทึกเป็นรายการใช้คอยน์ในกระเป๋าของผู้ใช้</p>
      </article>
    </section>

    <section class="compare-section">
      <h2>เปรียบเทียบสิทธิ์</h2>
      <div class="compare-grid">
        <div>
          <strong>สมาชิกทั่วไป</strong>
          <span>อ่านฟรีและซื้อด้วยคอยน์เป็นรายเล่ม</span>
        </div>
        <div>
          <strong>สมาชิกพิเศษ Pinto</strong>
          <span>อ่านคอนเทนต์สมาชิกตามแพ็กเกจ พร้อมซื้อรายเล่มด้วยคอยน์ได้เหมือนเดิม</span>
        </div>
      </div>
    </section>

    <section class="faq-section">
      <h2>คำถามที่พบบ่อย</h2>
      <details open>
        <summary>สมัครแล้วหักคอยน์จริงไหม?</summary>
        <p>
          หักจริงผ่าน API <code>/subscriptions/checkout</code> ระบบจะล็อกกระเป๋าคอยน์
          ตรวจยอด หักยอด และบันทึก transaction ก่อนเปิดสิทธิ์สมาชิก
        </p>
      </details>
      <details>
        <summary>คอยน์ไม่พอต้องทำอย่างไร?</summary>
        <p>กดเติมคอยน์ ระบบจะพาไปหน้ากระเป๋าคอยน์ แล้วกลับมาสมัครแพ็กเกจอีกครั้งได้</p>
      </details>
      <details>
        <summary>สมัครซ้ำจะทับแพ็กเกจเดิมไหม?</summary>
        <p>ระบบจะนำวันคงเหลือเดิมมาเป็นฐาน แล้วต่ออายุแพ็กเกจใหม่จากวันหมดอายุล่าสุด</p>
      </details>
    </section>
  </main>
</template>

<style scoped>
.vip-page {
  min-height: 100vh;
  min-height: 100dvh;
  background:
    radial-gradient(circle at 10% 10%, color-mix(in srgb, var(--primary) 14%, transparent), transparent 28%),
    radial-gradient(circle at 92% 4%, color-mix(in srgb, #f59e0b 14%, transparent), transparent 26%),
    var(--bg);
  color: var(--text);
  padding: var(--page-block, 28px) var(--page-gutter, 20px) 72px;
}

.crumb,
.vip-hero,
.status-strip,
.plans-section,
.benefits-section,
.compare-section,
.faq-section,
.alert {
  width: min(100%, 1120px);
  margin-inline: auto;
}

.crumb {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 16px;
}

.crumb a {
  color: var(--accent-strong);
  font-weight: 800;
  text-decoration: none;
}

.vip-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 26px;
  align-items: stretch;
  border: 1px solid var(--border);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, #f43f5e 92%, var(--surface) 8%), #ff7a59 52%, #ffc861);
  box-shadow: var(--shadow);
  overflow: hidden;
  padding: clamp(26px, 5vw, 54px);
}

.hero-copy {
  display: grid;
  align-content: center;
  gap: 18px;
  color: #fff;
}

.eyebrow,
.hero-copy h1,
.hero-copy span,
.section-head p,
.section-head h2,
.plan-card p,
.plan-card h3,
.benefits-section h3,
.benefits-section p,
.compare-section h2,
.faq-section h2 {
  margin: 0;
}

.eyebrow {
  width: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-weight: 900;
  padding: 6px 12px;
}

.hero-copy h1 {
  max-width: 660px;
  font-size: clamp(38px, 6vw, 78px);
  font-weight: 900;
  line-height: 1;
  text-wrap: balance;
}

.hero-copy span {
  max-width: 620px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-actions a,
.hero-actions button,
.wallet-card button,
.plan-card button {
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 900;
  padding: 0 18px;
}

.hero-actions a {
  display: inline-flex;
  align-items: center;
  background: #fff;
  color: #e11d48;
  text-decoration: none;
}

.hero-actions button,
.wallet-card button {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.44);
}

.hero-panel {
  display: grid;
  align-content: center;
  gap: 16px;
}

.hero-image,
.vip-token,
.wallet-card {
  border-radius: 8px;
  box-shadow: 0 20px 38px rgba(124, 45, 18, 0.18);
}

.hero-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.vip-token {
  display: grid;
  place-items: center;
  min-height: 230px;
  background:
    radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.9), transparent 16%),
    linear-gradient(145deg, #fff7d1, #ffffff);
  color: #e11d48;
}

.vip-token strong {
  font-size: clamp(64px, 10vw, 108px);
  line-height: 0.9;
}

.vip-token span {
  color: #a16207;
  font-size: 22px;
  font-weight: 900;
}

.wallet-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 14px;
  align-items: center;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.36);
  color: #fff;
  padding: 18px;
}

.wallet-card small {
  color: rgba(255, 255, 255, 0.78);
  font-weight: 800;
}

.wallet-card strong {
  font-size: 24px;
}

.wallet-card button {
  grid-row: span 2;
}

.status-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.status-strip article,
.state-card,
.plan-card,
.benefits-section article,
.compare-section,
.faq-section {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.status-strip article {
  display: grid;
  gap: 5px;
  padding: 16px 18px;
}

.status-strip span {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 800;
}

.status-strip strong {
  color: var(--text-strong);
}

.alert {
  border-radius: 8px;
  font-weight: 900;
  margin-top: 14px;
  padding: 12px 14px;
}

.success {
  background: color-mix(in srgb, #22c55e 14%, var(--surface) 86%);
  color: color-mix(in srgb, #15803d 82%, var(--text-strong) 18%);
}

.error {
  background: color-mix(in srgb, #ef4444 14%, var(--surface) 86%);
  color: color-mix(in srgb, #dc2626 82%, var(--text-strong) 18%);
}

.plans-section,
.benefits-section,
.compare-section,
.faq-section {
  margin-top: 30px;
}

.section-head {
  display: grid;
  gap: 6px;
  margin-bottom: 18px;
}

.section-head p {
  color: var(--accent-strong);
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
}

.section-head h2,
.compare-section h2,
.faq-section h2 {
  color: var(--text-strong);
  font-size: clamp(24px, 4vw, 36px);
  line-height: 1.15;
}

.state-card {
  color: var(--text-muted);
  padding: 28px;
  text-align: center;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.plan-card {
  position: relative;
  display: grid;
  gap: 16px;
  align-content: start;
  overflow: hidden;
  padding: 24px 20px 20px;
}

.plan-card.featured {
  border-color: color-mix(in srgb, var(--primary) 44%, var(--border));
  transform: translateY(-6px);
}

.plan-card.unaffordable {
  opacity: 0.78;
}

.plan-ribbon {
  position: absolute;
  top: 12px;
  right: 12px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  padding: 5px 10px;
}

.plan-ribbon.quiet {
  background: color-mix(in srgb, var(--primary) 16%, var(--surface) 84%);
  color: var(--accent-strong);
}

.plan-card p {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 800;
}

.plan-card h3 {
  color: var(--text-strong);
  font-size: 24px;
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--text-strong);
}

.price-line strong {
  font-size: 36px;
  line-height: 1;
}

.daily-price {
  color: var(--text-muted);
  font-weight: 800;
}

.plan-card ul {
  display: grid;
  gap: 8px;
  margin: 0;
  color: var(--text);
  line-height: 1.6;
  padding-left: 18px;
}

.plan-card button {
  width: 100%;
  margin-top: auto;
  background: var(--primary);
  color: var(--on-primary);
}

.plan-card button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.benefits-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.benefits-section article {
  padding: 20px;
}

.benefits-section span {
  color: var(--accent-strong);
  font-size: 13px;
  font-weight: 900;
}

.benefits-section h3 {
  margin-top: 8px;
  color: var(--text-strong);
  font-size: 20px;
}

.benefits-section p {
  margin-top: 8px;
  color: var(--text-muted);
  line-height: 1.7;
}

.compare-section,
.faq-section {
  padding: 24px;
}

.compare-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.compare-grid div {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  display: grid;
  gap: 8px;
  padding: 16px;
}

.compare-grid strong {
  color: var(--text-strong);
  font-size: 18px;
}

.compare-grid span,
.faq-section p {
  color: var(--text-muted);
  line-height: 1.7;
}

.faq-section details {
  border-top: 1px solid var(--border);
  padding: 16px 0;
}

.faq-section details:first-of-type {
  margin-top: 12px;
}

.faq-section summary {
  color: var(--text-strong);
  cursor: pointer;
  font-weight: 900;
}

.faq-section code {
  color: var(--accent-strong);
  font-weight: 900;
}

@media (max-width: 1040px) {
  .vip-hero {
    grid-template-columns: 1fr;
  }

  .plan-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plan-card.featured {
    transform: none;
  }
}

@media (max-width: 680px) {
  .crumb {
    gap: 5px;
    margin-bottom: 10px;
    font-size: 10px;
    line-height: 1.25;
  }

  .vip-hero {
    padding: 24px 18px;
  }

  .hero-copy h1 {
    font-size: 40px;
  }

  .status-strip,
  .plan-grid,
  .benefits-section,
  .compare-grid {
    grid-template-columns: 1fr;
  }

  .wallet-card {
    grid-template-columns: 1fr;
  }

  .wallet-card button {
    grid-row: auto;
  }
}
</style>
