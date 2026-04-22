<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, resolveAssetUrl } from "../../utils/api";

type Category = {
  id: number;
  name: string;
};

type Episode = {
  id: number;
  title: string;
  episode_number: number;
  access_type: string;
  price: number;
  created_at: string;
};

type WizardStep = 1 | 2 | 3 | 4;

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const publishing = ref(false);
const episodesLoading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const categories = ref<Category[]>([]);
const episodes = ref<Episode[]>([]);
const step = ref<WizardStep>(1);
const lifecycleStatus = ref("draft");

const form = ref({
  title: "",
  author: "",
  description: "",
  category_id: "",
  cover_image: "",
  access_type: "free",
  price: 0,
});

const bookId = computed(() => Number(route.params.id));
const coverPreview = computed(() => resolveAssetUrl(form.value.cover_image));
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
  } catch {
    episodes.value = [];
  } finally {
    episodesLoading.value = false;
  }
}

async function fetchBook() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [{ data: book }, { data: categoryRows }] = await Promise.all([
      api.get(`/books/${bookId.value}`),
      api.get("/categories"),
    ]);

    categories.value = Array.isArray(categoryRows) ? categoryRows : [];
    lifecycleStatus.value = String(book?.lifecycle_status || "draft");
    form.value = {
      title: String(book?.title || ""),
      author: String(book?.author_name || book?.author || ""),
      description: String(book?.description || ""),
      category_id: book?.category_id ? String(book.category_id) : "",
      cover_image: String(book?.cover_image_url || book?.cover_image || ""),
      access_type: String(book?.access_type || "free"),
      price: Number(book?.price || 0),
    };

    await fetchEpisodes();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "Could not load book details.";
  } finally {
    loading.value = false;
  }
}

async function saveBook() {
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await api.put(`/writer/books/${bookId.value}`, {
      title: form.value.title,
      author: form.value.author,
      author_name: form.value.author,
      description: form.value.description,
      category_id: form.value.category_id ? Number(form.value.category_id) : null,
      cover_image: form.value.cover_image,
      cover_image_url: form.value.cover_image,
      access_type: form.value.access_type,
      price: Number(form.value.price || 0),
    });

    successMessage.value = "Book updated successfully.";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "Could not save book changes.";
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
    successMessage.value = "ย้ายหนังสือกลับเป็น draft แล้ว";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ย้ายกลับ draft ไม่สำเร็จ";
  } finally {
    publishing.value = false;
  }
}

onMounted(fetchBook);
</script>

<template>
  <main class="writer-edit-page">
    <section class="panel">
      <div class="header">
        <div>
          <p class="eyebrow">Writer Wizard</p>
          <h1>จัดการหนังสือแบบ 4 ขั้นตอน</h1>
          <p class="muted">
            {{ currentStepTitle }}: ทำทีละขั้นเพื่อให้อัปเดตข้อมูล สิทธิ์อ่าน เนื้อหา และสถานะเผยแพร่ได้ชัดเจนขึ้น
          </p>
        </div>

        <button class="back-btn" type="button" @click="router.push('/writer/books')">
          Back to my books
        </button>
      </div>

      <div class="wizard-steps">
        <button :class="{ active: step === 1 }" type="button" @click="step = 1">1. ข้อมูลหนังสือ</button>
        <button :class="{ active: step === 2 }" type="button" @click="step = 2">2. ราคาและสิทธิ์</button>
        <button :class="{ active: step === 3 }" type="button" @click="step = 3">3. เนื้อหา</button>
        <button :class="{ active: step === 4 }" type="button" @click="step = 4">4. เผยแพร่</button>
      </div>

      <p v-if="loading" class="muted">Loading book details...</p>
      <p v-else-if="errorMessage && !saving && !successMessage" class="error">{{ errorMessage }}</p>

      <div v-else class="wizard-body">
        <section v-if="step === 1" class="step-card editor-grid">
          <div class="cover-card">
            <img :src="coverPreview" :alt="form.title || 'Book cover'" @error="handleImageError" />
            <label>
              <span>Cover image URL</span>
              <input v-model="form.cover_image" type="text" placeholder="https://..." />
            </label>
          </div>

          <div class="book-fields">
            <label>
              <span>Title</span>
              <input v-model="form.title" type="text" required />
            </label>

            <label>
              <span>Author</span>
              <input v-model="form.author" type="text" required />
            </label>

            <label>
              <span>Category</span>
              <select v-model="form.category_id">
                <option value="">Uncategorized</option>
                <option v-for="category in categories" :key="category.id" :value="String(category.id)">
                  {{ category.name }}
                </option>
              </select>
            </label>

            <label>
              <span>Description</span>
              <textarea v-model="form.description" rows="8" />
            </label>
          </div>
        </section>

        <section v-else-if="step === 2" class="step-card pricing-grid">
          <article class="mini-card">
            <strong>Access type</strong>
            <select v-model="form.access_type">
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="subscription">Subscription</option>
            </select>
            <small>กำหนดว่าผู้อ่านจะอ่านได้ฟรี ซื้อรายเล่ม หรือใช้แพ็กเกจรายเดือน</small>
          </article>

          <article class="mini-card">
            <strong>Price</strong>
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
                    : `ผู้อ่านต้องซื้อก่อนในราคา ${form.price || 0} coin`
              }}
            </p>
          </article>
        </section>

        <section v-else-if="step === 3" class="step-card">
          <div class="content-head">
            <div>
              <h2>ตอนและเนื้อหา</h2>
              <p class="muted">ตรวจว่าหนังสือมีเนื้อหาแล้วหรือยัง และเข้าไปแก้เพิ่มเติมจากหน้า upload/studio ได้</p>
            </div>
            <button class="ghost-btn" type="button" @click="fetchEpisodes">Reload</button>
          </div>

          <div v-if="episodesLoading" class="state-box">Loading episodes...</div>
          <div v-else-if="episodes.length" class="episode-list">
            <article v-for="episode in episodes" :key="episode.id" class="episode-item">
              <div>
                <strong>ตอนที่ {{ episode.episode_number }} {{ episode.title }}</strong>
                <span>{{ episode.access_type }} · {{ episode.price || 0 }} coin</span>
              </div>
              <small>{{ new Date(episode.created_at).toLocaleString() }}</small>
            </article>
          </div>
          <div v-else class="state-box">
            ยังไม่พบตอนของหนังสือเล่มนี้ หากเป็น serial ให้กลับไปเพิ่มตอนที่หน้า writer upload/studio ก่อนเผยแพร่
          </div>
        </section>

        <section v-else class="step-card publish-grid">
          <article class="status-card" :class="lifecycleStatus">
            <strong>สถานะปัจจุบัน</strong>
            <span>{{ lifecycleStatus }}</span>
          </article>

          <article class="mini-card">
            <strong>Checklist ก่อนเผยแพร่</strong>
            <ul>
              <li>มีชื่อเรื่องและผู้เขียน</li>
              <li>กำหนดสิทธิ์อ่านและราคาแล้ว</li>
              <li>มีตอนหรือเนื้อหาอย่างน้อย 1 ชุด</li>
            </ul>
          </article>

          <div class="publish-actions">
            <button class="save-btn" type="button" :disabled="publishing" @click="publishBook">
              {{ publishing ? "Publishing..." : "Publish book" }}
            </button>
            <button class="ghost-btn" type="button" :disabled="publishing" @click="unpublishBook">
              Move back to draft
            </button>
          </div>
        </section>

        <div v-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
        <div v-if="successMessage" class="state-box success">{{ successMessage }}</div>

        <div class="wizard-actions">
          <button class="ghost-btn" type="button" :disabled="!canGoBack || saving" @click="goBack">
            Previous
          </button>
          <button class="save-btn" type="button" :disabled="saving" @click="saveBook">
            {{ saving ? "Saving..." : "Save step" }}
          </button>
          <button class="ghost-btn" type="button" :disabled="!canGoNext || saving" @click="goNext">
            Next
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.writer-edit-page {
  width: min(1080px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 52px;
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
  .episode-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
