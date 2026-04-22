<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, resolveAssetUrl } from "../../utils/api";

type Category = {
  id: number;
  name: string;
};

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const categories = ref<Category[]>([]);

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

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  if (!target || target.src.endsWith("/no-cover.png")) return;
  target.src = "/no-cover.png";
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
    form.value = {
      title: String(book?.title || ""),
      author: String(book?.author_name || book?.author || ""),
      description: String(book?.description || ""),
      category_id: book?.category_id ? String(book.category_id) : "",
      cover_image: String(book?.cover_image_url || book?.cover_image || ""),
      access_type: String(book?.access_type || "free"),
      price: Number(book?.price || 0),
    };
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "Could not load book details.";
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
    errorMessage.value =
      error?.response?.data?.message || "Could not save book changes.";
  } finally {
    saving.value = false;
  }
}

onMounted(fetchBook);
</script>

<template>
  <main class="writer-edit-page">
    <section class="panel">
      <div class="header">
        <div>
          <p class="eyebrow">Writer</p>
          <h1>Edit your book</h1>
          <p class="muted">
            Update the main metadata that appears in the store and writer dashboard.
          </p>
        </div>

        <button class="back-btn" type="button" @click="router.push('/writer/books')">
          Back to my books
        </button>
      </div>

      <p v-if="loading" class="muted">Loading book details...</p>
      <p v-else-if="errorMessage && !saving && !successMessage" class="error">
        {{ errorMessage }}
      </p>

      <form v-else class="editor-grid" @submit.prevent="saveBook">
        <div class="cover-card">
          <img
            :src="coverPreview"
            :alt="form.title || 'Book cover'"
            @error="handleImageError"
          />
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

          <div class="inline-fields">
            <label>
              <span>Access type</span>
              <select v-model="form.access_type">
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="subscription">Subscription</option>
              </select>
            </label>

            <label>
              <span>Price</span>
              <input
                v-model.number="form.price"
                type="number"
                min="0"
                step="1"
                :disabled="form.access_type === 'free'"
              />
            </label>
          </div>

          <label>
            <span>Description</span>
            <textarea v-model="form.description" rows="6" />
          </label>

          <div v-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
          <div v-if="successMessage" class="state-box success">{{ successMessage }}</div>

          <div class="actions">
            <button class="save-btn" type="submit" :disabled="saving">
              {{ saving ? "Saving..." : "Save changes" }}
            </button>
            <button
              class="ghost-btn"
              type="button"
              :disabled="saving"
              @click="fetchBook"
            >
              Reload
            </button>
          </div>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.writer-edit-page {
  width: min(980px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 52px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow);
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

h1 {
  margin: 0;
  color: var(--text-strong);
}

.muted {
  color: var(--text-muted);
}

.back-btn,
.save-btn,
.ghost-btn {
  min-height: 42px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

.back-btn,
.ghost-btn {
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-strong);
}

.save-btn {
  border: 0;
  background: var(--primary);
  color: var(--on-primary);
}

.editor-grid {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
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

label span {
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

.inline-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.state-box {
  border-radius: 12px;
  padding: 12px 14px;
}

.state-box.error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.state-box.success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 760px) {
  .header,
  .editor-grid,
  .inline-fields {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
  }
}
</style>
