<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api, { API_BASE_URL } from "../../utils/api";

type Plan = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  duration_days: number | string;
  is_active?: boolean | number;
  sort_order?: number | string | null;
};

type PlanForm = {
  name: string;
  description: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  sort_order: number;
};

type Benefit = {
  title: string;
  text: string;
};

type Faq = {
  question: string;
  answer: string;
};

type SubscriptionPage = {
  hero_badge: string;
  hero_title: string;
  hero_description: string;
  primary_cta: string;
  secondary_cta: string;
  status_title: string;
  payment_title: string;
  payment_note: string;
  plans_kicker: string;
  plans_title: string;
  benefits: Benefit[];
  compare_title: string;
  compare_general_title: string;
  compare_general_text: string;
  compare_general_bullets: string[];
  compare_vip_title: string;
  compare_vip_text: string;
  compare_vip_bullets: string[];
  faq_title: string;
  faqs: Faq[];
};

const emptyPlanForm = (): PlanForm => ({
  name: "",
  description: "",
  price: 0,
  duration_days: 30,
  is_active: true,
  sort_order: 0,
});

const emptyContent = (): SubscriptionPage => ({
  hero_badge: "Read and Voice VIP",
  hero_title: "สมัครสมาชิกพิเศษ อ่านได้คุ้มกว่าเดิม",
  hero_description: "เลือกแพ็กเกจที่เหมาะกับจังหวะการอ่านของคุณ แล้วชำระด้วยคอยน์จากกระเป๋าได้ทันที",
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
      text: "เมื่อสมัครแพ็กเกจสำเร็จ ผู้ใช้จะเปิดอ่านหนังสือหรือตอนที่ถูกตั้งค่าเป็นเนื้อหาสำหรับสมาชิกได้ทันที",
    },
  ],
  compare_title: "เปรียบเทียบสิทธิ์",
  compare_general_title: "สมาชิกทั่วไป",
  compare_general_text: "อ่านฟรีและซื้อด้วยคอยน์เป็นรายเล่มหรือรายตอน",
  compare_general_bullets: ["อ่านเนื้อหาฟรีได้ทันที"],
  compare_vip_title: "สมาชิกพิเศษ Read and Voice",
  compare_vip_text: "อ่านคอนเทนต์สมาชิกตามช่วงเวลาของแพ็กเกจ",
  compare_vip_bullets: ["อ่านเนื้อหาสำหรับสมาชิกได้ตามช่วงวันที่สมัคร"],
  faq_title: "คำถามที่พบบ่อย",
  faqs: [
    {
      question: "สมัครแล้วหักคอยน์จริงไหม?",
      answer: "หักจริงจากกระเป๋าคอยน์ของผู้ใช้ในขั้นตอนสมัคร",
    },
  ],
});

const plans = ref<Plan[]>([]);
const newPlan = ref<PlanForm>(emptyPlanForm());
const editPlan = ref<PlanForm>(emptyPlanForm());
const editingPlanId = ref<number | null>(null);
const content = ref<SubscriptionPage>(emptyContent());
const generalBulletsText = ref("");
const vipBulletsText = ref("");
const heroUrl = ref("");
const heroFile = ref<File | null>(null);
const heroFilePreview = ref("");
const loading = ref(false);
const savingPlan = ref(false);
const savingContent = ref(false);
const savingHero = ref(false);
const message = ref("");
const errorMessage = ref("");

const activePlans = computed(() => plans.value.filter((plan) => plan.is_active !== false && plan.is_active !== 0));

const heroPreview = computed(() => heroFilePreview.value || resolveImageUrl(heroUrl.value));

function resolveImageUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

function planToForm(plan: Plan): PlanForm {
  return {
    name: plan.name || "",
    description: plan.description || "",
    price: Number(plan.price || 0),
    duration_days: Number(plan.duration_days || 30),
    is_active: plan.is_active !== false && plan.is_active !== 0,
    sort_order: Number(plan.sort_order || 0),
  };
}

function planPayload(form: PlanForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price || 0),
    duration_days: Number(form.duration_days || 0),
    is_active: form.is_active,
    sort_order: Number(form.sort_order || 0),
  };
}

function syncBulletTextFromContent() {
  generalBulletsText.value = content.value.compare_general_bullets.join("\n");
  vipBulletsText.value = content.value.compare_vip_bullets.join("\n");
}

function syncContentFromBulletText() {
  content.value.compare_general_bullets = generalBulletsText.value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  content.value.compare_vip_bullets = vipBulletsText.value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loadAll() {
  loading.value = true;
  message.value = "";
  errorMessage.value = "";

  try {
    const [plansRes, contentRes] = await Promise.all([
      api.get("/subscriptions/admin/plans"),
      api.get("/page-content"),
    ]);

    plans.value = Array.isArray(plansRes.data) ? plansRes.data : [];
    content.value = {
      ...emptyContent(),
      ...(contentRes.data?.subscriptionPage || {}),
    };
    content.value.benefits = Array.isArray(content.value.benefits) ? content.value.benefits : [];
    content.value.faqs = Array.isArray(content.value.faqs) ? content.value.faqs : [];
    syncBulletTextFromContent();
    heroUrl.value = contentRes.data?.subscriptionHero?.image_url || "";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดข้อมูลหน้าสมัครสมาชิกไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function createPlan() {
  savingPlan.value = true;
  message.value = "";
  errorMessage.value = "";

  try {
    const { data } = await api.post("/subscriptions/admin/plans", planPayload(newPlan.value));
    message.value = data?.message || "สร้างแพ็กเกจสำเร็จ";
    newPlan.value = emptyPlanForm();
    await loadAll();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "สร้างแพ็กเกจไม่สำเร็จ";
  } finally {
    savingPlan.value = false;
  }
}

function startEditPlan(plan: Plan) {
  editingPlanId.value = plan.id;
  editPlan.value = planToForm(plan);
}

function cancelEditPlan() {
  editingPlanId.value = null;
  editPlan.value = emptyPlanForm();
}

async function updatePlan() {
  if (!editingPlanId.value) return;
  savingPlan.value = true;
  message.value = "";
  errorMessage.value = "";

  try {
    const { data } = await api.put(
      `/subscriptions/admin/plans/${editingPlanId.value}`,
      planPayload(editPlan.value),
    );
    message.value = data?.message || "แก้ไขแพ็กเกจสำเร็จ";
    cancelEditPlan();
    await loadAll();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "แก้ไขแพ็กเกจไม่สำเร็จ";
  } finally {
    savingPlan.value = false;
  }
}

async function deletePlan(plan: Plan) {
  const ok = window.confirm(`ต้องการลบหรือปิดการแสดงผลแพ็กเกจ "${plan.name}" ใช่ไหม?`);
  if (!ok) return;

  savingPlan.value = true;
  message.value = "";
  errorMessage.value = "";

  try {
    const { data } = await api.delete(`/subscriptions/admin/plans/${plan.id}`);
    message.value = data?.message || "ลบแพ็กเกจสำเร็จ";
    await loadAll();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ลบแพ็กเกจไม่สำเร็จ";
  } finally {
    savingPlan.value = false;
  }
}

function addBenefit() {
  content.value.benefits.push({ title: "", text: "" });
}

function removeBenefit(index: number) {
  content.value.benefits.splice(index, 1);
}

function addFaq() {
  content.value.faqs.push({ question: "", answer: "" });
}

function removeFaq(index: number) {
  content.value.faqs.splice(index, 1);
}

async function saveContent() {
  savingContent.value = true;
  message.value = "";
  errorMessage.value = "";
  syncContentFromBulletText();

  try {
    const { data } = await api.post("/page-content/subscription-page", content.value);
    content.value = {
      ...emptyContent(),
      ...(data?.subscriptionPage || content.value),
    };
    syncBulletTextFromContent();
    message.value = data?.message || "บันทึกข้อความหน้าสมัครสมาชิกสำเร็จ";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "บันทึกข้อความไม่สำเร็จ";
  } finally {
    savingContent.value = false;
  }
}

function selectHeroFile(event: Event) {
  if (heroFilePreview.value) URL.revokeObjectURL(heroFilePreview.value);
  const target = event.target as HTMLInputElement;
  heroFile.value = target.files?.[0] || null;
  heroFilePreview.value = heroFile.value ? URL.createObjectURL(heroFile.value) : "";
}

async function saveHero() {
  savingHero.value = true;
  message.value = "";
  errorMessage.value = "";

  try {
    const formData = new FormData();
    if (heroFile.value) {
      formData.append("image", heroFile.value);
    } else {
      formData.append("image_url", heroUrl.value.trim());
    }

    const { data } = await api.post("/page-content/subscription-hero", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    heroUrl.value = data?.subscriptionHero?.image_url || "";
    heroFile.value = null;
    heroFilePreview.value = "";
    message.value = data?.message || "บันทึกรูปภาพสำเร็จ";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "บันทึกรูปภาพไม่สำเร็จ";
  } finally {
    savingHero.value = false;
  }
}

async function clearHero() {
  savingHero.value = true;
  message.value = "";
  errorMessage.value = "";

  try {
    const { data } = await api.delete("/page-content/subscription-hero");
    heroUrl.value = "";
    heroFile.value = null;
    heroFilePreview.value = "";
    message.value = data?.message || "ลบรูปภาพสำเร็จ";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ลบรูปภาพไม่สำเร็จ";
  } finally {
    savingHero.value = false;
  }
}

onMounted(loadAll);
</script>

<template>
  <main class="subscription-admin">
    <header class="page-hero">
      <div>
        <p>จัดการหน้าสมาชิก</p>
        <h1>จัดการหน้าสมาชิกพิเศษ</h1>
        <span>
          แก้แพ็กเกจ ราคา จำนวนวัน รูปภาพ ข้อความ เปรียบเทียบสิทธิ์ และคำถามที่พบบ่อยได้จากหน้านี้
        </span>
      </div>
      <router-link to="/subscription-plans">ดูหน้าจริง</router-link>
    </header>

    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>
    <p v-if="loading" class="loading">กำลังโหลดข้อมูล...</p>

    <section class="summary-grid">
      <article>
        <strong>{{ plans.length }}</strong>
        <span>แพ็กเกจทั้งหมด</span>
      </article>
      <article>
        <strong>{{ activePlans.length }}</strong>
        <span>แพ็กเกจที่เปิดขาย</span>
      </article>
      <article>
        <strong>{{ content.benefits.length }}</strong>
        <span>กล่องอธิบายสิทธิ์</span>
      </article>
      <article>
        <strong>{{ content.faqs.length }}</strong>
        <span>คำถามที่พบบ่อย</span>
      </article>
    </section>

    <section class="admin-card">
      <div class="section-head">
        <div>
          <p>แพ็กเกจสมาชิก</p>
          <h2>แพ็กเกจสมาชิก</h2>
        </div>
      </div>

      <form class="plan-form" @submit.prevent="createPlan">
        <label>
          ชื่อแพ็กเกจ
          <input v-model="newPlan.name" type="text" placeholder="เช่น รายเดือน Plus" required />
        </label>
        <label>
          ราคา (คอยน์)
          <input v-model.number="newPlan.price" type="number" min="0" step="1" required />
        </label>
        <label>
          จำนวนวัน
          <input v-model.number="newPlan.duration_days" type="number" min="1" step="1" required />
        </label>
        <label>
          ลำดับ
          <input v-model.number="newPlan.sort_order" type="number" step="1" />
        </label>
        <label class="wide">
          คำอธิบาย
          <textarea v-model="newPlan.description" rows="2" placeholder="คำอธิบายที่จะแสดงบนการ์ดแพ็กเกจ"></textarea>
        </label>
        <label class="check">
          <input v-model="newPlan.is_active" type="checkbox" />
          เปิดขายแพ็กเกจนี้
        </label>
        <button type="submit" :disabled="savingPlan">เพิ่มแพ็กเกจ</button>
      </form>

      <div class="plan-list">
        <article v-for="plan in plans" :key="plan.id" class="plan-row">
          <form v-if="editingPlanId === plan.id" class="plan-edit" @submit.prevent="updatePlan">
            <input v-model="editPlan.name" type="text" required />
            <input v-model.number="editPlan.price" type="number" min="0" step="1" required />
            <input v-model.number="editPlan.duration_days" type="number" min="1" step="1" required />
            <input v-model.number="editPlan.sort_order" type="number" step="1" />
            <textarea v-model="editPlan.description" rows="2"></textarea>
            <label class="check">
              <input v-model="editPlan.is_active" type="checkbox" />
              เปิดขาย
            </label>
            <div class="row-actions">
              <button type="submit" :disabled="savingPlan">บันทึก</button>
              <button type="button" class="ghost" @click="cancelEditPlan">ยกเลิก</button>
            </div>
          </form>

          <template v-else>
            <div>
              <strong>{{ plan.name }}</strong>
              <p>{{ plan.description || "ไม่มีคำอธิบาย" }}</p>
              <small>
                {{ Number(plan.price).toLocaleString("th-TH") }} คอยน์ ·
                {{ Number(plan.duration_days).toLocaleString("th-TH") }} วัน ·
                ลำดับ {{ Number(plan.sort_order || 0).toLocaleString("th-TH") }}
              </small>
            </div>
            <span :class="['status-pill', plan.is_active === false || plan.is_active === 0 ? 'off' : 'on']">
              {{ plan.is_active === false || plan.is_active === 0 ? "ปิดขาย" : "เปิดขาย" }}
            </span>
            <div class="row-actions">
              <button type="button" @click="startEditPlan(plan)">แก้ไข</button>
              <button type="button" class="danger" @click="deletePlan(plan)">ลบ/ปิด</button>
            </div>
          </template>
        </article>
      </div>
    </section>

    <section class="admin-card two-columns">
      <div class="content-form">
        <div class="section-head">
          <div>
            <p>รูปภาพส่วนหัว</p>
            <h2>รูปภาพด้านบน</h2>
          </div>
        </div>
        <label>
          ลิงก์รูปภาพ
          <input v-model="heroUrl" type="url" placeholder="https://example.com/vip.jpg" />
        </label>
        <label>
          อัปโหลดรูปภาพ
          <input type="file" accept="image/*" @change="selectHeroFile" />
        </label>
        <div class="row-actions">
          <button type="button" :disabled="savingHero" @click="saveHero">บันทึกรูปภาพ</button>
          <button type="button" class="ghost" :disabled="savingHero" @click="clearHero">ลบรูปภาพ</button>
        </div>
      </div>

      <div class="preview-box">
        <img v-if="heroPreview" :src="heroPreview" alt="ตัวอย่างรูปภาพหน้าสมาชิก" />
        <div v-else>
          <strong>ยังไม่มีรูปภาพ</strong>
          <span>ถ้าไม่ใส่รูป ระบบจะแสดงกล่อง VIP สำรอง</span>
        </div>
      </div>
    </section>

    <section class="admin-card">
      <div class="section-head">
        <div>
          <p>ข้อความบนหน้า</p>
          <h2>ข้อความหน้าสมัครสมาชิก</h2>
        </div>
        <button type="button" :disabled="savingContent" @click="saveContent">บันทึกข้อความทั้งหมด</button>
      </div>

      <div class="content-grid">
        <label>
          ป้ายเล็กบน hero
          <input v-model="content.hero_badge" type="text" />
        </label>
        <label>
          หัวข้อใหญ่
          <input v-model="content.hero_title" type="text" />
        </label>
        <label class="wide">
          คำอธิบาย hero
          <textarea v-model="content.hero_description" rows="2"></textarea>
        </label>
        <label>
          ปุ่มหลัก
          <input v-model="content.primary_cta" type="text" />
        </label>
        <label>
          ปุ่มรอง
          <input v-model="content.secondary_cta" type="text" />
        </label>
        <label>
          หัวข้อสถานะสมาชิก
          <input v-model="content.status_title" type="text" />
        </label>
        <label>
          หัวข้อการชำระเงิน
          <input v-model="content.payment_title" type="text" />
        </label>
        <label class="wide">
          ข้อความการชำระเงิน
          <input v-model="content.payment_note" type="text" />
        </label>
        <label>
          ป้ายหัวข้อแพ็กเกจ
          <input v-model="content.plans_kicker" type="text" />
        </label>
        <label>
          หัวข้อแพ็กเกจ
          <input v-model="content.plans_title" type="text" />
        </label>
      </div>

      <h3>กล่องอธิบายสิทธิ์</h3>
      <div class="editable-list">
        <article v-for="(item, index) in content.benefits" :key="index">
          <input v-model="item.title" type="text" placeholder="หัวข้อ" />
          <textarea v-model="item.text" rows="3" placeholder="คำอธิบาย"></textarea>
          <button type="button" class="danger" @click="removeBenefit(index)">ลบ</button>
        </article>
      </div>
      <button type="button" class="ghost add-button" @click="addBenefit">เพิ่มกล่องอธิบาย</button>

      <h3>เปรียบเทียบสิทธิ์</h3>
      <div class="content-grid">
        <label>
          หัวข้อ section
          <input v-model="content.compare_title" type="text" />
        </label>
        <label>
          ชื่อฝั่งสมาชิกทั่วไป
          <input v-model="content.compare_general_title" type="text" />
        </label>
        <label class="wide">
          คำอธิบายสมาชิกทั่วไป
          <textarea v-model="content.compare_general_text" rows="3"></textarea>
        </label>
        <label class="wide">
          Bullet สมาชิกทั่วไป (บรรทัดละ 1 ข้อ)
          <textarea v-model="generalBulletsText" rows="4"></textarea>
        </label>
        <label>
          ชื่อฝั่งสมาชิกพิเศษ
          <input v-model="content.compare_vip_title" type="text" />
        </label>
        <label class="wide">
          คำอธิบายสมาชิกพิเศษ
          <textarea v-model="content.compare_vip_text" rows="3"></textarea>
        </label>
        <label class="wide">
          Bullet สมาชิกพิเศษ (บรรทัดละ 1 ข้อ)
          <textarea v-model="vipBulletsText" rows="4"></textarea>
        </label>
      </div>

      <h3>คำถามที่พบบ่อย</h3>
      <label>
        หัวข้อ FAQ
        <input v-model="content.faq_title" type="text" />
      </label>
      <div class="editable-list">
        <article v-for="(item, index) in content.faqs" :key="index">
          <input v-model="item.question" type="text" placeholder="คำถาม" />
          <textarea v-model="item.answer" rows="3" placeholder="คำตอบ"></textarea>
          <button type="button" class="danger" @click="removeFaq(index)">ลบ</button>
        </article>
      </div>
      <button type="button" class="ghost add-button" @click="addFaq">เพิ่มคำถาม</button>
    </section>
  </main>
</template>

<style scoped>
.subscription-admin {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  padding: 28px 20px 72px;
}

.page-hero,
.summary-grid,
.admin-card,
.alert,
.loading {
  width: min(100%, 1120px);
  margin-inline: auto;
}

.page-hero {
  border-radius: 8px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 16%, var(--surface)), var(--surface));
  border: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 26px;
}

.page-hero p,
.section-head p {
  color: var(--accent-strong);
  font-size: 14px;
  font-weight: 900;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.page-hero h1,
.section-head h2 {
  color: var(--text-strong);
  margin: 0;
}

.page-hero span {
  color: var(--text-muted);
  display: block;
  line-height: 1.7;
  margin-top: 8px;
}

.page-hero a,
button {
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 11px 16px;
  text-decoration: none;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-strong);
}

.danger {
  background: #ef4444;
  color: #fff;
}

.alert,
.loading {
  border-radius: 8px;
  margin-top: 14px;
  padding: 12px 14px;
}

.success {
  background: color-mix(in srgb, #22c55e 14%, var(--surface));
  color: #15803d;
}

.error {
  background: color-mix(in srgb, #ef4444 14%, var(--surface));
  color: #b91c1c;
}

.loading {
  background: var(--surface);
  color: var(--text-muted);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.summary-grid article,
.admin-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.summary-grid article {
  display: grid;
  gap: 4px;
  padding: 16px;
}

.summary-grid strong {
  color: var(--text-strong);
  font-size: 30px;
}

.summary-grid span,
.plan-row p,
.plan-row small {
  color: var(--text-muted);
}

.admin-card {
  margin-top: 18px;
  padding: 22px;
}

.section-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

label {
  color: var(--text-strong);
  display: grid;
  gap: 7px;
  font-size: 15px;
  font-weight: 900;
}

input,
textarea {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text);
  font: inherit;
  padding: 10px 12px;
  width: 100%;
}

textarea {
  resize: vertical;
}

.plan-form,
.content-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.wide {
  grid-column: span 2;
}

.check {
  align-items: center;
  display: flex;
  gap: 8px;
}

.check input {
  width: auto;
}

.plan-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.plan-row {
  border: 1px solid var(--border);
  border-radius: 8px;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 14px;
  padding: 14px;
}

.plan-row strong {
  color: var(--text-strong);
  font-size: 20px;
}

.status-pill {
  align-self: start;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 900;
  padding: 5px 10px;
}

.status-pill.on {
  background: color-mix(in srgb, #22c55e 16%, var(--surface));
  color: #15803d;
}

.status-pill.off {
  background: color-mix(in srgb, #ef4444 14%, var(--surface));
  color: #b91c1c;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.plan-edit {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 10px;
}

.plan-edit textarea,
.plan-edit .row-actions {
  grid-column: span 2;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.content-form {
  display: grid;
  gap: 14px;
}

.preview-box {
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  min-height: 220px;
  overflow: hidden;
}

.preview-box img {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.preview-box div {
  display: grid;
  height: 100%;
  place-content: center;
  text-align: center;
}

.preview-box span {
  color: var(--text-muted);
}

.admin-card h3 {
  color: var(--text-strong);
  margin: 24px 0 12px;
}

.editable-list {
  display: grid;
  gap: 12px;
}

.editable-list article {
  border: 1px solid var(--border);
  border-radius: 8px;
  display: grid;
  gap: 10px;
  padding: 14px;
}

.add-button {
  margin-top: 12px;
}

@media (max-width: 900px) {
  .summary-grid,
  .plan-form,
  .content-grid,
  .two-columns {
    grid-template-columns: 1fr 1fr;
  }

  .plan-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-hero,
  .section-head {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-grid,
  .plan-form,
  .content-grid,
  .two-columns,
  .plan-edit {
    grid-template-columns: 1fr;
  }

  .wide,
  .plan-edit textarea,
  .plan-edit .row-actions {
    grid-column: auto;
  }
}
</style>
