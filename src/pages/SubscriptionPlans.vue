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
  sort_order?: number | string | null;
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
  subscriptionPage?: SubscriptionPage;
};

type Wallet = {
  balance?: number | string;
};

type CoinTopupPrompt = {
  planName: string;
  balance: number;
  price: number;
  shortage: number;
};

type BenefitCard = {
  title: string;
  text: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type SubscriptionPage = {
  hero_badge: string;
  hero_title: string;
  hero_description: string;
  hero_overlay: string;
  hero_card_image_url: string;
  primary_cta: string;
  secondary_cta: string;
  status_title: string;
  payment_title: string;
  payment_note: string;
  plans_kicker: string;
  plans_title: string;
  benefits: BenefitCard[];
  compare_title: string;
  compare_general_title: string;
  compare_general_text: string;
  compare_general_bullets: string[];
  compare_vip_title: string;
  compare_vip_text: string;
  compare_vip_bullets: string[];
  faq_title: string;
  faqs: FaqItem[];
};

const defaultSubscriptionPage: SubscriptionPage = {
  hero_badge: "Read and Voice VIP",
  hero_title: "สมัครสมาชิกพิเศษ อ่านได้คุ้มกว่าเดิม",
  hero_description:
    "เลือกแพ็กเกจที่เหมาะกับจังหวะการอ่านของคุณ แล้วชำระด้วยคอยน์จากกระเป๋าได้ทันที",
  hero_overlay: "dark",
  hero_card_image_url: "",
  primary_cta: "เลือกแพ็กเกจ",
  secondary_cta: "เติมคอยน์",
  status_title: "สถานะสมาชิก",
  payment_title: "การชำระเงิน",
  payment_note: "หักคอยน์จริงจากกระเป๋าเมื่อกดยืนยันสมัคร",
  plans_kicker: "เลือกแพ็กเกจ",
  plans_title: "จ่ายด้วยคอยน์ เริ่มใช้สิทธิ์ทันที",
  benefits: [
    {
      title: "อ่านเนื้อหาสมาชิก",
      text:
        "เมื่อสมัครแพ็กเกจสำเร็จ ผู้ใช้จะเปิดอ่านหนังสือหรือตอนที่ถูกตั้งค่าเป็นเนื้อหาสำหรับสมาชิกได้ทันที สิทธิ์จะใช้งานได้ตามจำนวนวันที่ระบุในแพ็กเกจที่เลือก",
    },
    {
      title: "ต่ออายุแบบทบวัน",
      text:
        "ถ้าผู้ใช้ยังมีแพ็กเกจเดิมที่ไม่หมดอายุ ระบบจะนำวันใหม่ไปต่อจากวันหมดอายุเดิม ทำให้วันคงเหลือไม่หายเมื่อสมัครแพ็กเกจเพิ่ม",
    },
    {
      title: "ตรวจสอบได้ในประวัติคอยน์",
      text:
        "ทุกครั้งที่สมัคร ระบบจะหักคอยน์จากกระเป๋าและบันทึกรายการไว้ ผู้ใช้จึงตรวจสอบย้อนหลังได้ว่าซื้อแพ็กเกจใด ใช้คอยน์เท่าไร และเริ่มใช้งานเมื่อใด",
    },
    {
      title: "อ่านและฟังได้ต่อเนื่อง",
      text: "ใช้สิทธิ์สมาชิกเพื่ออ่านเนื้อหาที่กำหนดไว้สำหรับสมาชิก และใช้งานร่วมกับฟีเจอร์เสียงของ Read and Voice ได้ตามเงื่อนไขของแต่ละเรื่อง",
    },
  ],
  compare_title: "เปรียบเทียบสิทธิ์",
  compare_general_title: "สมาชิกทั่วไป",
  compare_general_text:
    "เหมาะสำหรับผู้ใช้ที่ต้องการอ่านเฉพาะบางเล่มหรือบางตอน สามารถอ่านเนื้อหาฟรีได้ตามปกติ และซื้อหนังสือหรือตอนที่ต้องการด้วยคอยน์เป็นรายการ ๆ",
  compare_general_bullets: [
    "อ่านหนังสือหรือตอนที่เปิดให้อ่านฟรีได้ทันที",
    "ซื้อเนื้อหาแบบรายเล่มหรือรายตอนได้ด้วยคอยน์",
    "ถ้าเจอเนื้อหาสำหรับสมาชิก จะต้องสมัครแพ็กเกจก่อนจึงเปิดอ่านได้",
  ],
  compare_vip_title: "สมาชิกพิเศษ Read and Voice",
  compare_vip_text:
    "เหมาะสำหรับผู้ใช้ที่อ่านต่อเนื่องหรืออ่านหลายเรื่องในช่วงเวลาเดียวกัน เมื่อสมัครแล้วจะเปิดอ่านเนื้อหาที่กำหนดไว้สำหรับสมาชิกได้ตลอดอายุแพ็กเกจ",
  compare_vip_bullets: [
    "อ่านหนังสือหรือตอนที่ติดป้ายสำหรับสมาชิกได้ตามช่วงวันที่สมัคร",
    "ยังซื้อหนังสือรายเล่มหรือรายตอนได้ด้วยคอยน์เหมือนสมาชิกทั่วไป",
    "ถ้าสมัครเพิ่มก่อนหมดอายุ ระบบจะต่อวันให้จากวันหมดอายุเดิม",
  ],
  faq_title: "คำถามที่พบบ่อย",
  faqs: [
    {
      question: "สมัครแล้วหักคอยน์จริงไหม?",
      answer:
        "หักจริงจากกระเป๋าคอยน์ของผู้ใช้ในขั้นตอนสมัคร ระบบจะตรวจสอบก่อนว่ามีคอยน์เพียงพอหรือไม่ ถ้ายอดพอ ระบบจะหักคอยน์ บันทึกประวัติรายการ และเปิดสิทธิ์สมาชิกให้ใช้งานทันที",
    },
    {
      question: "คอยน์ไม่พอต้องทำอย่างไร?",
      answer:
        "ให้กดปุ่มเติมคอยน์ก่อนสมัคร ระบบจะพาไปหน้ากระเป๋าคอยน์เพื่อเติมยอดให้เพียงพอ หลังจากเติมคอยน์เรียบร้อยแล้ว ผู้ใช้สามารถกลับมาเลือกแพ็กเกจเดิมและสมัครใหม่ได้",
    },
    {
      question: "สมัครซ้ำจะทับแพ็กเกจเดิมไหม?",
      answer:
        "ไม่ทับวันเดิม ถ้าผู้ใช้ยังมีแพ็กเกจที่ใช้งานอยู่ ระบบจะนำวันคงเหลือเดิมเป็นฐาน แล้วเพิ่มจำนวนวันของแพ็กเกจใหม่ต่อจากวันหมดอายุล่าสุด ช่วยให้สมัครล่วงหน้าได้โดยไม่เสียวันคงเหลือ",
    },
    {
      question: "สิทธิ์สมาชิกใช้กับทุกเรื่องหรือไม่?",
      answer:
        "สิทธิ์สมาชิกใช้กับหนังสือหรือตอนที่ผู้เขียนหรือทีมงานตั้งค่าไว้สำหรับสมาชิก หากเป็นเนื้อหาขายรายเล่มหรือรายตอน ผู้ใช้ยังสามารถซื้อด้วยคอยน์ได้ตามปกติ",
    },
  ],
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
const coinTopupPrompt = ref<CoinTopupPrompt | null>(null);

const isLoggedIn = computed(() => !!getToken());

const sortedPlans = computed(() => {
  return [...plans.value].sort(
    (a, b) =>
      Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
      getPlanPrice(a) - getPlanPrice(b) ||
      a.id - b.id,
  );
});

const subscriptionCopy = computed<SubscriptionPage>(() => {
  const source = (pageContent.value?.subscriptionPage || {}) as Partial<SubscriptionPage>;
  return {
    ...defaultSubscriptionPage,
    ...source,
    benefits: Array.isArray(source.benefits) && source.benefits.length
      ? source.benefits
      : defaultSubscriptionPage.benefits,
    compare_general_bullets:
      Array.isArray(source.compare_general_bullets) && source.compare_general_bullets.length
        ? source.compare_general_bullets
        : defaultSubscriptionPage.compare_general_bullets,
    compare_vip_bullets:
      Array.isArray(source.compare_vip_bullets) && source.compare_vip_bullets.length
        ? source.compare_vip_bullets
        : defaultSubscriptionPage.compare_vip_bullets,
    faqs: Array.isArray(source.faqs) && source.faqs.length
      ? source.faqs
      : defaultSubscriptionPage.faqs,
  };
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
  if (url.startsWith("/page-content/")) return url;
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
};

const heroImageUrl = computed(() => {
  return resolveImageUrl(pageContent.value?.subscriptionHero?.image_url || "");
});

const heroBackgroundStyle = computed(() => {
  return heroImageUrl.value
    ? { backgroundImage: `url("${heroImageUrl.value}")` }
    : {};
});

const heroOverlayClass = computed(() => {
  const overlay = subscriptionCopy.value.hero_overlay;
  return ["dark", "warm", "soft", "clear", "none"].includes(overlay)
    ? `vip-hero--${overlay}`
    : "vip-hero--dark";
});

const heroCardImageUrl = computed(() =>
  resolveImageUrl(subscriptionCopy.value.hero_card_image_url || ""),
);

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
  if (plan.name?.trim()) return plan.name.trim();
  const days = getPlanDays(plan);
  if (days >= 365) return "รายปี";
  if (days >= 90) return "รายไตรมาส";
  if (days >= 30) return "รายเดือน";
  return `${days} วัน`;
}

function getPlanSubtitle(plan: Plan) {
  if (plan.description?.trim()) return plan.description.trim();
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

function showCoinTopupPrompt(plan: Plan, balance: number) {
  const price = Math.ceil(getPlanPrice(plan));
  coinTopupPrompt.value = {
    planName: getPlanTitle(plan),
    balance,
    price,
    shortage: Math.max(price - balance, 0),
  };
  errorMessage.value = `คอยน์ไม่พอ ตอนนี้มี ${formatCoins(balance)} คอยน์ ต้องใช้ ${formatCoins(price)} คอยน์`;
}

function closeCoinTopupPrompt() {
  coinTopupPrompt.value = null;
}

function goTopUpFromPrompt() {
  closeCoinTopupPrompt();
  goTopUp();
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
      walletBalance.value = balance;
      showCoinTopupPrompt(plan, balance);
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
    showCoinTopupPrompt(plan, walletBalance.value);
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
      <strong>สมาชิกพิเศษ Read and Voice</strong>
    </nav>

    <section
      class="vip-hero"
      :class="[
        heroOverlayClass,
        { 'vip-hero--image': heroImageUrl },
      ]"
      :style="heroBackgroundStyle"
    >
      <div class="hero-content">
        <div class="hero-copy">
          <p class="eyebrow">{{ subscriptionCopy.hero_badge }}</p>
          <h1>{{ subscriptionCopy.hero_title }}</h1>
          <span>{{ subscriptionCopy.hero_description }}</span>
          <div class="hero-actions">
            <a href="#plans">{{ subscriptionCopy.primary_cta }}</a>
            <button type="button" class="coin-topup-button" @click="goTopUp">
              <span class="coin-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="12" cy="12" r="8.5" class="coin-face" />
                  <circle cx="12" cy="12" r="5.4" class="coin-core" />
                  <ellipse cx="9.2" cy="8.4" rx="2.2" ry="1.5" class="coin-shine" />
                </svg>
              </span>
              {{ subscriptionCopy.secondary_cta }}
            </button>
          </div>
        </div>

        <div class="hero-panel">
          <img
            v-if="heroCardImageUrl"
            class="hero-card-image"
            :src="heroCardImageUrl"
            alt="สมาชิกพิเศษ Read and Voice"
          />
          <div v-else class="vip-token" aria-hidden="true">
            <strong>VIP</strong>
            <span>Read and Voice</span>
          </div>

          <div class="wallet-card">
            <small>คอยน์ของคุณ</small>
            <strong>{{ walletText }}</strong>
            <button type="button" class="coin-topup-button" @click="goTopUp">
              <span class="coin-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="12" cy="12" r="8.5" class="coin-face" />
                  <circle cx="12" cy="12" r="5.4" class="coin-core" />
                  <ellipse cx="9.2" cy="8.4" rx="2.2" ry="1.5" class="coin-shine" />
                </svg>
              </span>
              {{ subscriptionCopy.secondary_cta }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="status-strip" aria-label="สถานะสมาชิกและการชำระเงิน">
      <article>
        <span>{{ subscriptionCopy.status_title }}</span>
        <strong>{{ activePlanText || "ยังไม่มีแพ็กเกจที่ใช้งานอยู่" }}</strong>
      </article>
      <article>
        <span>{{ subscriptionCopy.payment_title }}</span>
        <strong>{{ subscriptionCopy.payment_note }}</strong>
      </article>
    </section>

    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>

    <section id="plans" class="plans-section">
      <div class="section-head">
        <p>{{ subscriptionCopy.plans_kicker }}</p>
        <h2>{{ subscriptionCopy.plans_title }}</h2>
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
          <div class="plan-card__head">
            <div>
              <p>{{ getPlanSubtitle(plan) }}</p>
              <h3>{{ getPlanTitle(plan) }}</h3>
            </div>
            <span v-if="plan.id === featuredPlanId" class="plan-ribbon">แนะนำ</span>
            <span v-else-if="getDiscount(plan)" class="plan-ribbon quiet">
              ประหยัด {{ getDiscount(plan) }}%
            </span>
          </div>

          <div class="plan-card__price">
            <div class="price-line">
              <strong>{{ formatCoins(getPlanPrice(plan)) }}</strong>
              <span>คอยน์</span>
            </div>
            <small class="daily-price">
              เฉลี่ย {{ getDailyPrice(plan).toLocaleString("th-TH", { maximumFractionDigits: 1 }) }} คอยน์/วัน
            </small>
          </div>

          <ul class="plan-card__benefits">
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
                : "สมัคร"
            }}
          </button>
        </article>
      </div>
    </section>

    <section class="benefits-section" aria-label="สิทธิ์สมาชิก">
      <article v-for="benefit in subscriptionCopy.benefits" :key="`${benefit.title}-${benefit.text}`">
        <h3>{{ benefit.title }}</h3>
        <p>{{ benefit.text }}</p>
      </article>
    </section>

    <section class="compare-section">
      <h2>{{ subscriptionCopy.compare_title }}</h2>
      <div class="compare-grid">
        <div>
          <strong>{{ subscriptionCopy.compare_general_title }}</strong>
          <p>{{ subscriptionCopy.compare_general_text }}</p>
          <ul>
            <li v-for="item in subscriptionCopy.compare_general_bullets" :key="item">
              {{ item }}
            </li>
          </ul>
        </div>
        <div>
          <strong>{{ subscriptionCopy.compare_vip_title }}</strong>
          <p>{{ subscriptionCopy.compare_vip_text }}</p>
          <ul>
            <li v-for="item in subscriptionCopy.compare_vip_bullets" :key="item">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="faq-section">
      <h2>{{ subscriptionCopy.faq_title }}</h2>
      <details v-for="(faq, index) in subscriptionCopy.faqs" :key="`${faq.question}-${index}`" :open="index === 0">
        <summary>{{ faq.question }}</summary>
        <p>{{ faq.answer }}</p>
      </details>
    </section>

    <div
      v-if="coinTopupPrompt"
      class="coin-modal-backdrop"
      role="presentation"
      @click.self="closeCoinTopupPrompt"
    >
      <section class="coin-modal" role="dialog" aria-modal="true" aria-labelledby="coin-modal-title">
        <button
          type="button"
          class="coin-modal__close"
          aria-label="ปิดแจ้งเตือน"
          @click="closeCoinTopupPrompt"
        >
          ×
        </button>

        <div class="coin-modal__icon" aria-hidden="true">
          <span class="coin-mark">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="12" cy="12" r="8.5" class="coin-face" />
              <circle cx="12" cy="12" r="5.4" class="coin-core" />
              <ellipse cx="9.2" cy="8.4" rx="2.2" ry="1.5" class="coin-shine" />
            </svg>
          </span>
        </div>

        <div class="coin-modal__body">
          <p class="coin-modal__eyebrow">คอยน์ไม่พอสำหรับแพ็กเกจนี้</p>
          <h2 id="coin-modal-title">เติมคอยน์ก่อนสมัคร</h2>
          <p>
            แพ็กเกจ {{ coinTopupPrompt.planName }} ต้องใช้
            <strong>{{ formatCoins(coinTopupPrompt.price) }} คอยน์</strong>
            ตอนนี้คุณมี {{ formatCoins(coinTopupPrompt.balance) }} คอยน์
            ขาดอีก {{ formatCoins(coinTopupPrompt.shortage) }} คอยน์
          </p>
        </div>

        <div class="coin-modal__summary">
          <span>ยอดคงเหลือ</span>
          <strong>{{ formatCoins(coinTopupPrompt.balance) }} คอยน์</strong>
          <span>ต้องใช้</span>
          <strong>{{ formatCoins(coinTopupPrompt.price) }} คอยน์</strong>
        </div>

        <div class="coin-modal__actions">
          <button type="button" class="coin-modal__topup" @click="goTopUpFromPrompt">
            <span class="coin-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <circle cx="12" cy="12" r="8.5" class="coin-face" />
                <circle cx="12" cy="12" r="5.4" class="coin-core" />
                <ellipse cx="9.2" cy="8.4" rx="2.2" ry="1.5" class="coin-shine" />
              </svg>
            </span>
            เติมคอยน์
          </button>
          <button type="button" class="coin-modal__secondary" @click="closeCoinTopupPrompt">
            ปิด
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.vip-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
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
  font-size: 15px;
  margin-bottom: 16px;
}

.crumb a {
  color: var(--accent-strong);
  font-weight: 800;
  text-decoration: none;
}

.vip-hero {
  position: relative;
  isolation: isolate;
  display: grid;
  align-items: end;
  min-height: clamp(360px, 42vw, 500px);
  border: 1px solid var(--border);
  border-radius: 8px;
  background:
    radial-gradient(circle at 82% 12%, rgba(255, 255, 255, 0.34), transparent 22%),
    linear-gradient(135deg, color-mix(in srgb, #f43f5e 92%, var(--surface) 8%), #ff7a59 52%, #ffc861);
  background-position: center;
  background-size: cover;
  box-shadow: 0 18px 36px rgba(251, 146, 60, 0.12);
  overflow: hidden;
  padding: clamp(20px, 3.4vw, 40px);
}

.vip-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0.42) 42%, rgba(255, 255, 255, 0.08) 76%),
    linear-gradient(0deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0.02) 58%);
}

.vip-hero--warm::before {
  background:
    linear-gradient(90deg, rgba(255, 247, 237, 0.72) 0%, rgba(255, 237, 213, 0.36) 48%, rgba(255, 237, 213, 0.06) 78%),
    linear-gradient(0deg, rgba(255, 247, 237, 0.28), rgba(255, 247, 237, 0.02) 58%);
}

.vip-hero--soft::before {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.42) 42%, rgba(255, 255, 255, 0.08) 76%),
    linear-gradient(0deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.04) 58%);
}

.vip-hero--clear::before {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0.12) 52%, rgba(255, 255, 255, 0.02) 82%);
}

.vip-hero--none::before {
  background: transparent;
}

.vip-hero .hero-copy,
.vip-hero .hero-copy h1,
.vip-hero .hero-copy span {
  color: #12333a;
  text-shadow: none;
}

.vip-hero--soft .hero-copy,
.vip-hero--soft .hero-copy h1,
.vip-hero--soft .hero-copy span {
  color: #17202a;
  text-shadow: none;
}

.vip-hero .eyebrow,
.vip-hero--soft .eyebrow {
  border-color: rgba(15, 23, 42, 0.16);
  background: rgba(255, 255, 255, 0.68);
  color: #12333a;
}

.vip-hero::after {
  content: none;
}

.vip-hero--image {
  background-color: #0f172a;
}

.hero-content {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.62fr);
  gap: clamp(18px, 4vw, 42px);
  align-items: end;
  width: 100%;
}

.hero-copy {
  display: grid;
  align-content: end;
  gap: 18px;
  color: #fff;
  min-height: 0;
  padding-block: 18px;
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
  background: rgba(255, 255, 255, 0.2);
  font-weight: 900;
  padding: 6px 12px;
  backdrop-filter: blur(12px);
}

.hero-copy h1 {
  max-width: 660px;
  font-size: clamp(30px, 4.2vw, 46px);
  font-weight: 900;
  line-height: 1.08;
  text-wrap: balance;
}

.hero-copy span {
  max-width: 620px;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.6;
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

.coin-topup-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.hero-actions a {
  display: inline-flex;
  align-items: center;
  background: linear-gradient(135deg, var(--primary), #10b981);
  color: var(--on-primary);
  font-size: 15px;
  box-shadow: 0 14px 32px color-mix(in srgb, var(--primary) 28%, transparent);
  text-decoration: none;
}

.hero-actions .coin-topup-button,
.wallet-card .coin-topup-button {
  width: fit-content;
  min-height: 30px;
  min-width: 0;
  justify-self: start;
  border-radius: 999px;
  background: linear-gradient(180deg, #ff9d10 0%, #f28a00 100%);
  color: #ffffff;
  border: 0;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 4px 10px rgba(200, 112, 0, 0.18);
  font-size: 14px;
  line-height: 1.15;
  padding: 0 14px 0 10px;
}

.coin-mark {
  display: inline-grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 999px;
  background: radial-gradient(
    circle at 35% 35%,
    #ffe48a 0%,
    #ffc933 45%,
    #e59a00 100%
  );
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.42),
    0 1px 2px rgba(181, 118, 0, 0.3);
  flex: 0 0 auto;
}

.coin-mark svg {
  width: 11px;
  height: 11px;
  filter: drop-shadow(0 1px 0 rgba(181, 118, 0, 0.18));
}

.coin-face {
  fill: #ffd24d;
}

.coin-core {
  fill: #f6b301;
}

.coin-shine {
  fill: rgba(255, 245, 186, 0.52);
}

.hero-panel {
  display: grid;
  align-content: end;
  gap: 16px;
  min-width: 0;
}

.hero-card-image,
.vip-token,
.wallet-card {
  border-radius: 8px;
  box-shadow: 0 20px 38px rgba(124, 45, 18, 0.18);
}

.hero-card-image {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.vip-token {
  display: grid;
  place-items: center;
  min-height: 180px;
  background:
    radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.9), transparent 16%),
    linear-gradient(145deg, #fff7d1, #ffffff);
  color: #e11d48;
}

.vip-token strong {
  font-size: clamp(30px, 4vw, 40px);
  line-height: 0.9;
}

.vip-token span {
  color: #a16207;
  font-size: 20px;
  font-weight: 900;
}

.wallet-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 14px;
  align-items: center;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(15, 23, 42, 0.12);
  color: #12333a;
  padding: 18px;
  backdrop-filter: blur(14px);
}

.wallet-card small {
  color: rgba(18, 51, 58, 0.72);
  font-weight: 800;
}

.wallet-card strong {
  font-size: 22px;
}

.wallet-card button {
  grid-row: span 2;
}

.wallet-card .coin-topup-button {
  grid-row: auto;
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
  font-size: 15px;
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

.coin-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  background: rgba(10, 25, 28, 0.34);
  padding: 20px;
}

.coin-modal {
  position: relative;
  display: grid;
  gap: 18px;
  width: min(100%, 440px);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
  padding: 28px;
}

.coin-modal__close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary-soft) 60%, var(--surface) 40%);
  color: var(--text-strong);
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.coin-modal__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(180deg, #ff9d10 0%, #f28a00 100%);
  box-shadow: 0 10px 24px rgba(200, 112, 0, 0.22);
}

.coin-modal__icon .coin-mark {
  width: 26px;
  height: 26px;
}

.coin-modal__body {
  display: grid;
  gap: 8px;
}

.coin-modal__eyebrow {
  margin: 0;
  color: var(--accent-strong);
  font-size: 13px;
  font-weight: 900;
}

.coin-modal h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 25px;
  line-height: 1.18;
}

.coin-modal__body p:not(.coin-modal__eyebrow) {
  margin: 0;
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.65;
}

.coin-modal__body strong {
  color: var(--text-strong);
}

.coin-modal__summary {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--primary-soft) 48%, var(--surface) 52%);
  padding: 14px;
}

.coin-modal__summary span {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 800;
}

.coin-modal__summary strong {
  color: var(--text-strong);
  font-size: 15px;
  text-align: right;
}

.coin-modal__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.coin-modal__topup,
.coin-modal__secondary {
  min-height: 40px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 900;
  padding: 0 18px;
}

.coin-modal__topup {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  background: linear-gradient(180deg, #ff9d10 0%, #f28a00 100%);
  color: #ffffff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 4px 10px rgba(200, 112, 0, 0.18);
}

.coin-modal__topup .coin-mark {
  width: 20px;
  height: 20px;
}

.coin-modal__secondary {
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  background: var(--surface);
  color: var(--text-strong);
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
  font-size: 15px;
  font-weight: 900;
  text-transform: uppercase;
}

.section-head h2,
.compare-section h2,
.faq-section h2 {
  color: var(--text-strong);
  font-size: clamp(20px, 2.4vw, 26px);
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
  align-items: stretch;
  gap: 16px;
}

.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow: hidden;
  padding: 18px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.plan-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: color-mix(in srgb, var(--primary) 72%, #10b981);
  opacity: 0.72;
}

.plan-card:hover {
  border-color: color-mix(in srgb, var(--primary) 32%, var(--border));
  box-shadow: 0 16px 32px rgba(15, 118, 110, 0.12);
  transform: translateY(-2px);
}

.plan-card.featured {
  border-color: color-mix(in srgb, var(--primary) 44%, var(--border));
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--primary-soft) 42%, transparent), transparent 38%),
    var(--surface);
  box-shadow: 0 18px 36px rgba(15, 118, 110, 0.14);
}

.plan-card.featured::before {
  opacity: 1;
  background: linear-gradient(90deg, var(--primary), #10b981);
}

.plan-card.unaffordable {
  opacity: 0.78;
}

.plan-card__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-width: 0;
}

.plan-card__head > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.plan-ribbon {
  order: -1;
  justify-self: start;
  max-width: 100%;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
  padding: 5px 9px;
  text-align: center;
  overflow-wrap: anywhere;
}

.plan-ribbon.quiet {
  background: color-mix(in srgb, var(--primary) 16%, var(--surface) 84%);
  color: var(--accent-strong);
}

.plan-card p {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.plan-card h3 {
  color: var(--text-strong);
  font-size: 18px;
  line-height: 1.12;
  overflow-wrap: anywhere;
}

.plan-card__price {
  display: grid;
  gap: 4px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary-soft) 46%, var(--surface) 54%);
  padding: 10px 12px;
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--text-strong);
}

.price-line strong {
  font-size: 26px;
  line-height: 1;
}

.daily-price {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
}

.plan-card__benefits {
  display: grid;
  grid-auto-rows: minmax(52px, auto);
  gap: 6px;
  align-content: start;
  flex: 1;
  margin: 0;
  color: var(--text);
  font-size: 12.5px;
  line-height: 1.4;
  list-style: none;
  padding: 2px 0 0;
}

.plan-card__benefits li {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-height: 52px;
}

.plan-card__benefits li::before {
  content: "";
  margin-top: 0.35em;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent);
}

.plan-card button {
  width: 100%;
  margin-top: auto;
  min-height: 42px;
  background: var(--primary);
  color: var(--on-primary);
}

.plan-card button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.benefits-section {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.benefits-section article {
  padding: 18px;
}

.benefits-section h3 {
  margin-top: 0;
  color: var(--text-strong);
  font-size: 18px;
  line-height: 1.25;
}

.benefits-section p {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.65;
}

.compare-section,
.faq-section {
  padding: 24px;
}

.compare-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.compare-grid div {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  display: grid;
  gap: 7px;
  padding: 14px;
}

.compare-grid strong {
  color: var(--text-strong);
  font-size: 18px;
}

.compare-grid p,
.compare-grid li,
.faq-section p {
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.62;
}

.compare-grid p,
.compare-grid ul {
  margin: 0;
}

.compare-grid ul {
  display: grid;
  gap: 5px;
  padding-left: 16px;
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
  .hero-content {
    grid-template-columns: 1fr;
  }

  .vip-hero {
    min-height: clamp(420px, 64vw, 560px);
  }

  .plan-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .benefits-section {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plan-card.featured {
    transform: none;
  }
}

@media (max-width: 820px) {
  .plan-card__head {
    grid-template-columns: 1fr;
  }

  .plan-ribbon {
    justify-self: start;
    max-width: 100%;
  }
}

@media (max-width: 680px) {
  .crumb {
    gap: 5px;
    margin-bottom: 10px;
    font-size: 12px;
    line-height: 1.25;
  }

  .vip-hero {
    min-height: 460px;
    padding: 20px 16px;
  }

  .vip-hero::before {
    background:
      linear-gradient(0deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.22) 66%, rgba(255, 255, 255, 0.08)),
      linear-gradient(90deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.16));
  }

  .vip-hero--none::before {
    background: transparent;
  }

  .hero-copy h1 {
    font-size: 30px;
  }

  .hero-copy span {
    font-size: 15px;
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
