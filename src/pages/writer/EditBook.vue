<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, resolveAssetUrl } from "../../utils/api";
import { useI18n } from "../../utils/i18n";
import { localizedTitle } from "../../utils/localizedContent";

type Category = {
  id: number;
  name: string;
};

type Episode = {
  id: number;
  title: string;
  title_th?: string;
  title_en?: string;
  episode_number: number;
  access_type: string;
  price: number;
  created_at: string;
};

type WizardStep = 1 | 2 | 3 | 4;

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();

const loading = ref(true);
const saving = ref(false);
const publishing = ref(false);
const episodesLoading = ref(false);
const addingEpisode = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const categories = ref<Category[]>([]);
const existingTags = ref<string[]>([]);
const episodes = ref<Episode[]>([]);
const step = ref<WizardStep>(1);
const lifecycleStatus = ref("draft");
const ageRatingOptions = [
  { value: "general", label: "ทั่วไป" },
  { value: "13+", label: "13+" },
  { value: "15+", label: "15+" },
  { value: "18+", label: "18+" },
];

const form = ref({
  title: "",
  title_th: "",
  title_en: "",
  author: "",
  description: "",
  category_id: "",
  age_rating: "general",
  tags: "",
  cover_image: "",
  access_type: "free",
  price: 0,
});

const episodeForm = ref({
  episode_number: 1,
  title: "",
  title_th: "",
  title_en: "",
  content: "",
  is_free: true,
  price: 0,
  preview_char_limit: 1500,
});

const bookId = computed(() => Number(route.params.id));
const coverPreview = computed(() => resolveAssetUrl(form.value.cover_image));
const displayBookTitle = computed(() => localizedTitle(form.value, locale.value) || form.value.title || "");
const canGoBack = computed(() => step.value > 1);
const canGoNext = computed(() => step.value < 4);
const currentStepTitle = computed(() => {
  switch (step.value) {
    case 1:
      return "ข้อมูลหนังสือ";
    case 2:
      return "สิทธิ์อ่านและราคา";
    case 3:
      return "ตรวจเนื้อหาและตอน";
    default:
      return "เผยแพร่";
  }
});

function formatAccessType(value: string) {
  if (value === "free") return "ฟรี";
  if (value === "paid") return "ชำระเงิน";
  if (value === "subscription") return "แพ็กเกจสมาชิก";
  return value;
}

function formatLifecycleStatus(value: string) {
  if (value === "draft") return "ร่าง";
  if (value === "published") return "เผยแพร่แล้ว";
  if (value === "pending") return "รอตรวจ";
  return value;
}

function getEpisodeTitle(episode: Episode) {
  return localizedTitle(episode, locale.value) || episode.title;
}

function syncNextEpisodeNumber() {
  const maxEpisode = episodes.value.reduce(
    (max, episode) => Math.max(max, Number(episode.episode_number || 0)),
    0,
  );
  episodeForm.value.episode_number = maxEpisode + 1;
}

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  if (!target || target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
}

function goNext() {
  if (step.value < 4) {
    step.value = (step.value + 1) as WizardStep;
  }
}

function goBack() {
  if (step.value > 1) {
    step.value = (step.value - 1) as WizardStep;
  }
}

async function fetchEpisodes() {
  try {
    episodesLoading.value = true;
    const { data } = await api.get(`/writer/books/${bookId.value}/episodes`);
    episodes.value = Array.isArray(data) ? data : [];
    syncNextEpisodeNumber();
  } catch {
    episodes.value = [];
    syncNextEpisodeNumber();
  } finally {
    episodesLoading.value = false;
  }
}

async function fetchBook() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [{ data: book }, { data: categoryRows }, { data: tagRows }] = await Promise.all([
      api.get(`/books/${bookId.value}`),
      api.get("/categories"),
      api.get("/books/tags").catch(() => ({ data: [] })),
    ]);

    categories.value = Array.isArray(categoryRows) ? categoryRows : [];
    existingTags.value = (Array.isArray(tagRows) ? tagRows : [])
      .map((tag: any) => String(tag?.name || tag || "").trim())
      .filter(Boolean);
    lifecycleStatus.value = String(book?.lifecycle_status || "draft");
    form.value = {
      title: String(book?.title || ""),
      title_th: String(book?.title_th || book?.title || ""),
      title_en: String(book?.title_en || ""),
      author: String(book?.author_name || book?.author || ""),
      description: String(book?.description || ""),
      category_id: book?.category_id ? String(book.category_id) : "",
      age_rating: String(book?.age_rating || "general"),
      tags: Array.isArray(book?.tags) ? book.tags.join(", ") : String(book?.tags || ""),
      cover_image: String(book?.cover_image_url || book?.cover_image || ""),
      access_type: String(book?.access_type || "free"),
      price: Number(book?.price || 0),
    };

    await fetchEpisodes();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดรายละเอียดหนังสือไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function saveBook() {
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  if (!form.value.title_th.trim() || !form.value.title_en.trim()) {
    errorMessage.value = "กรุณากรอกชื่อหนังสือทั้งภาษาไทยและภาษาอังกฤษ";
    saving.value = false;
    return;
  }

  try {
    await api.put(`/writer/books/${bookId.value}`, {
      title: form.value.title_th.trim(),
      title_th: form.value.title_th.trim(),
      title_en: form.value.title_en.trim(),
      author: form.value.author,
      author_name: form.value.author,
      description: form.value.description,
      category_id: form.value.category_id ? Number(form.value.category_id) : null,
      age_rating: form.value.age_rating,
      tags: form.value.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      cover_image: form.value.cover_image,
      cover_image_url: form.value.cover_image,
      access_type: form.value.access_type,
      price: Number(form.value.price || 0),
    });

    successMessage.value = "บันทึกการแก้ไขหนังสือสำเร็จ";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "บันทึกการแก้ไขหนังสือไม่สำเร็จ";
  } finally {
    saving.value = false;
  }
}

async function publishBook() {
  try {
    publishing.value = true;
    errorMessage.value = "";
    successMessage.value = "";
    await api.post(`/writer/books/${bookId.value}/publish`);
    lifecycleStatus.value = "published";
    successMessage.value = "เผยแพร่หนังสือแล้ว";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เผยแพร่หนังสือไม่สำเร็จ";
  } finally {
    publishing.value = false;
  }
}

async function unpublishBook() {
  try {
    publishing.value = true;
    errorMessage.value = "";
    successMessage.value = "";
    await api.post(`/writer/books/${bookId.value}/unpublish`);
    lifecycleStatus.value = "draft";
    successMessage.value = "ย้ายหนังสือกลับเป็นร่างแล้ว";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ย้ายกลับเป็นร่างไม่สำเร็จ";
  } finally {
    publishing.value = false;
  }
}

async function addEpisode() {
  errorMessage.value = "";
  successMessage.value = "";

  if (!episodeForm.value.title_th.trim() || !episodeForm.value.title_en.trim() || !episodeForm.value.content.trim()) {
    errorMessage.value = "กรุณากรอกชื่อตอนและเนื้อหาตอน";
    return;
  }

  try {
    addingEpisode.value = true;
    const price = episodeForm.value.is_free ? 0 : Number(episodeForm.value.price || 0);
    const { data } = await api.post(`/books/${bookId.value}/episodes`, {
      episode_number: episodeForm.value.episode_number,
      title: episodeForm.value.title_th.trim(),
      title_th: episodeForm.value.title_th.trim(),
      title_en: episodeForm.value.title_en.trim(),
      content: episodeForm.value.content,
      is_free: episodeForm.value.is_free ? 1 : 0,
      price,
      access_type: episodeForm.value.is_free ? "free" : "paid",
      preview_char_limit: episodeForm.value.preview_char_limit || 1500,
    });

    successMessage.value = data?.message || "เพิ่มตอนใหม่สำเร็จ";
    episodeForm.value.title = "";
    episodeForm.value.title_th = "";
    episodeForm.value.title_en = "";
    episodeForm.value.content = "";
    episodeForm.value.price = 0;
    episodeForm.value.is_free = true;
    await fetchEpisodes();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เพิ่มตอนไม่สำเร็จ";
  } finally {
    addingEpisode.value = false;
  }
}

onMounted(fetchBook);
</script>

<template>
  <main class="writer-edit-page">
    <section class="panel">
      <div class="header">
        <div>
          <p class="eyebrow">ตัวช่วยจัดการหนังสือ</p>
          <h1>จัดการหนังสือแบบ 4 ขั้นตอน</h1>
          <p class="muted">
            {{ currentStepTitle }}: ทำทีละขั้นเพื่อให้อัปเดตข้อมูล สิทธิ์อ่าน เนื้อหา และสถานะเผยแพร่ได้ชัดเจนขึ้น
          </p>
        </div>

        <button class="back-btn" type="button" @click="router.push('/writer/books')">
          กลับไปหนังสือของฉัน
        </button>
      </div>

      <div class="wizard-steps">
        <button :class="{ active: step === 1 }" type="button" @click="step = 1">1. ข้อมูลหนังสือ</button>
        <button :class="{ active: step === 2 }" type="button" @click="step = 2">2. ราคาและสิทธิ์</button>
        <button :class="{ active: step === 3 }" type="button" @click="step = 3">3. เนื้อหา</button>
        <button :class="{ active: step === 4 }" type="button" @click="step = 4">4. เผยแพร่</button>
      </div>

      <p v-if="loading" class="muted">กำลังโหลดรายละเอียดหนังสือ...</p>
      <p v-else-if="errorMessage && !saving && !successMessage" class="error">{{ errorMessage }}</p>

      <div v-else class="wizard-body">
        <section v-if="step === 1" class="step-card editor-grid">
          <div class="cover-card">
            <img :src="coverPreview" :alt="displayBookTitle || 'ปกหนังสือ'" @error="handleImageError" />
            <label>
              <span>ลิงก์รูปปก</span>
              <input v-model="form.cover_image" type="text" placeholder="https://..." />
            </label>
          </div>

          <div class="book-fields">
            <label>
              <span>ชื่อเรื่อง</span>
              <input v-model="form.title_th" type="text" required />
            </label>

            <label>
              <span>ชื่อภาษาอังกฤษ (ไม่บังคับ)</span>
              <input v-model="form.title_en" type="text" required />
            </label>

            <label>
              <span>ผู้เขียน</span>
              <input v-model="form.author" type="text" required />
            </label>

            <label>
              <span>หมวดหมู่</span>
              <select v-model="form.category_id">
                <option value="">ยังไม่จัดหมวดหมู่</option>
                <option v-for="category in categories" :key="category.id" :value="String(category.id)">
                  {{ category.name }}
                </option>
              </select>
            </label>

            <label>
              <span>ระดับอายุ</span>
              <select v-model="form.age_rating">
                <option v-for="option in ageRatingOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label>
              <span>แท็ก</span>
              <input
                v-model="form.tags"
                type="text"
                list="writer-book-tag-options"
                placeholder="โรแมนติก, แฟนเก่า, NC"
              />
              <datalist id="writer-book-tag-options">
                <option v-for="tag in existingTags" :key="tag" :value="tag" />
              </datalist>
            </label>

            <label>
              <span>คำอธิบาย</span>
              <textarea v-model="form.description" rows="8" />
            </label>
          </div>
        </section>

        <section v-else-if="step === 2" class="step-card pricing-grid">
          <article class="mini-card">
            <strong>สิทธิ์การอ่าน</strong>
            <select v-model="form.access_type">
              <option value="free">ฟรี</option>
              <option value="paid">ชำระเงิน</option>
              <option value="subscription">แพ็กเกจสมาชิก</option>
            </select>
            <small>กำหนดว่าผู้อ่านจะอ่านได้ฟรี ซื้อรายเล่ม หรือใช้แพ็กเกจรายเดือน</small>
          </article>

          <article class="mini-card">
            <strong>ราคา</strong>
            <input
              v-model.number="form.price"
              type="number"
              min="0"
              step="1"
              :disabled="form.access_type === 'free'"
            />
            <small>ถ้าเป็น free ระบบจะไม่คิดราคา</small>
          </article>

          <article class="mini-card">
            <strong>ตัวอย่างสถานะ</strong>
            <p>
              {{
                form.access_type === "free"
                  ? "ผู้อ่านเปิดอ่านได้ทันที"
                  : form.access_type === "subscription"
                    ? "ผู้อ่านต้องมีแพ็กเกจรายเดือน"
                    : `ผู้อ่านต้องซื้อก่อนในราคา ${form.price || 0} คอยน์`
              }}
            </p>
          </article>
        </section>

        <section v-else-if="step === 3" class="step-card">
          <div class="content-head">
            <div>
              <h2>ตอนและเนื้อหา</h2>
              <p class="muted">เพิ่มตอนใหม่ต่อจากเรื่องเดิมได้ทุกวัน ระบบจะผูกเข้ากับหนังสือเล่มนี้โดยอัตโนมัติ</p>
            </div>
            <button class="ghost-btn" type="button" @click="fetchEpisodes">โหลดใหม่</button>
          </div>

          <form class="episode-create" @submit.prevent="addEpisode">
            <div class="episode-create__head">
              <div>
                <h3>เพิ่มตอนถัดไป</h3>
                <p class="muted">ถ้าเคยเพิ่มตอนแล้ว เลขตอนจะต่อจากตอนล่าสุดให้อัตโนมัติ</p>
              </div>
              <button class="save-btn" type="submit" :disabled="addingEpisode">
                {{ addingEpisode ? "กำลังเพิ่มตอน..." : "เพิ่มตอน" }}
              </button>
            </div>

            <div class="episode-form-grid">
              <label>
                <span>ตอนที่</span>
                <input v-model.number="episodeForm.episode_number" min="1" type="number" />
              </label>
              <label>
                <span>ชื่อตอน</span>
                <input v-model="episodeForm.title_th" type="text" />
              </label>
              <label>
                <span>Episode title (English)</span>
                <input v-model="episodeForm.title_en" type="text" />
              </label>
              <label>
                <span>อ่านฟรี</span>
                <select v-model="episodeForm.is_free">
                  <option :value="true">ฟรี</option>
                  <option :value="false">เสียเงิน</option>
                </select>
              </label>
              <label>
                <span>ราคาตอน</span>
                <input
                  v-model.number="episodeForm.price"
                  :disabled="episodeForm.is_free"
                  min="0"
                  type="number"
                />
              </label>
              <label class="full">
                <span>ตัวอย่างกี่ตัวอักษร</span>
                <input v-model.number="episodeForm.preview_char_limit" min="1" type="number" />
              </label>
              <label class="full">
                <span>เนื้อหาตอน</span>
                <textarea v-model="episodeForm.content" rows="9" />
              </label>
            </div>
          </form>

          <div v-if="episodesLoading" class="state-box">กำลังโหลดตอน...</div>
          <div v-else-if="episodes.length" class="episode-list">
            <article v-for="episode in episodes" :key="episode.id" class="episode-item">
              <div>
                <strong>ตอนที่ {{ episode.episode_number }} {{ getEpisodeTitle(episode) }}</strong>
            <span>{{ formatAccessType(episode.access_type) }} · {{ episode.price || 0 }} คอยน์</span>
              </div>
              <small>{{ new Date(episode.created_at).toLocaleString() }}</small>
            </article>
          </div>
          <div v-else class="state-box">
            ยังไม่พบตอนของหนังสือเล่มนี้ เพิ่มตอนแรกจากฟอร์มด้านบนได้เลย
          </div>
        </section>

        <section v-else class="step-card publish-grid">
          <article class="status-card" :class="lifecycleStatus">
            <strong>สถานะปัจจุบัน</strong>
            <span>{{ formatLifecycleStatus(lifecycleStatus) }}</span>
          </article>

          <article class="mini-card">
            <strong>รายการตรวจสอบก่อนเผยแพร่</strong>
            <ul>
              <li>มีชื่อเรื่องและผู้เขียน</li>
              <li>กำหนดสิทธิ์อ่านและราคาแล้ว</li>
              <li>มีตอนหรือเนื้อหาอย่างน้อย 1 ชุด</li>
            </ul>
          </article>

          <div class="publish-actions">
            <button class="save-btn" type="button" :disabled="publishing" @click="publishBook">
              {{ publishing ? "กำลังเผยแพร่..." : "เผยแพร่หนังสือ" }}
            </button>
            <button class="ghost-btn" type="button" :disabled="publishing" @click="unpublishBook">
              ย้ายกลับเป็นร่าง
            </button>
          </div>
        </section>

        <div v-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
        <div v-if="successMessage" class="state-box success">{{ successMessage }}</div>

        <div class="wizard-actions">
          <button class="ghost-btn" type="button" :disabled="!canGoBack || saving" @click="goBack">
            ย้อนกลับ
          </button>
          <button class="save-btn" type="button" :disabled="saving" @click="saveBook">
            {{ saving ? "กำลังบันทึก..." : "บันทึกขั้นตอน" }}
          </button>
          <button class="ghost-btn" type="button" :disabled="!canGoNext || saving" @click="goNext">
            ถัดไป
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.writer-edit-page {
  width: min(1080px, calc(100% - calc(var(--page-gutter, 16px) * 2)));
  margin: 0 auto;
  padding: var(--page-block, 32px) 0 52px;
}

.panel,
.step-card,
.mini-card,
.status-card,
.episode-item,
.state-box {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.panel {
  padding: 28px;
}

.header {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 22px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1,
h2,
p,
ul {
  margin: 0;
}

.muted,
.episode-item span,
.episode-item small {
  color: var(--text-muted);
}

.wizard-steps,
.wizard-actions,
.publish-actions,
.content-head {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.wizard-steps {
  margin-bottom: 20px;
}

.wizard-steps button,
.back-btn,
.save-btn,
.ghost-btn {
  min-height: 42px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

.wizard-steps button,
.back-btn,
.ghost-btn {
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-strong);
}

.wizard-steps button.active,
.save-btn {
  border: 0;
  background: var(--primary);
  color: var(--on-primary);
}

.wizard-body {
  display: grid;
  gap: 18px;
}

.step-card {
  padding: 22px;
}

.editor-grid {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
}

.cover-card,
.book-fields,
label {
  display: grid;
  gap: 8px;
}

.cover-card img {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 16px;
  object-fit: cover;
  background: var(--surface-soft);
}

label span,
.mini-card strong,
.status-card strong,
.episode-item strong {
  color: var(--text-strong);
  font-weight: 900;
}

input,
textarea,
select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  font: inherit;
  font-size: 18px;
  padding: 12px 14px;
}

.pricing-grid,
.publish-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.mini-card {
  display: grid;
  gap: 10px;
  padding: 18px;
}

.episode-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.episode-create {
  display: grid;
  gap: 16px;
  margin-top: 18px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-soft);
}

.episode-create__head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.episode-create__head h3 {
  margin: 0 0 4px;
  color: var(--text-strong);
}

.episode-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.episode-form-grid .full {
  grid-column: 1 / -1;
}

.episode-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 16px;
}

.status-card {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.status-card.published {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.status-card.draft {
  background: #fff7ed;
  border-color: #fed7aa;
}

.state-box {
  padding: 14px 16px;
}

.state-box.error {
  background: #fef2f2;
  color: #991b1b;
}

.state-box.success {
  background: #f0fdf4;
  color: #166534;
}

ul {
  padding-left: 18px;
}

@media (max-width: 860px) {
  .header,
  .editor-grid,
  .pricing-grid,
  .publish-grid,
  .episode-item {
    grid-template-columns: 1fr;
  }

  .header,
  .episode-create__head,
  .episode-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .episode-form-grid {
    grid-template-columns: 1fr;
  }

  .panel,
  .step-card {
    padding: 18px;
  }

  .wizard-steps,
  .wizard-steps button,
  .wizard-actions,
  .wizard-actions button,
  .publish-actions,
  .publish-actions button {
    width: 100%;
  }
}
</style>
