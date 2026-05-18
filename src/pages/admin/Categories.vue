<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api from "../../utils/api";

type Category = {
  id: number;
  name: string;
  parent_id: number | null;
  display_tone?: string | null;
  display_art?: string | null;
  show_on_home?: boolean | number | null;
  sort_order?: number | null;
};

type CategoryForm = {
  name: string;
  parent_id: string;
  display_tone: string;
  display_art: string;
  show_on_home: boolean;
  sort_order: number;
  home_row: number;
  home_column: number;
};

type CategoryPreset = {
  name: string;
  tone: string;
  art: string;
};

const toneOptions = [
  { value: "", label: "ไม่เลือกธีม (อัตโนมัติ)" },
  { value: "story", label: "ม่วงละมุน" },
  { value: "romance", label: "ชมพูหวาน" },
  { value: "mystery", label: "ฟ้าอมเขียว" },
  { value: "adventure", label: "เขียวธรรมชาติ" },
  { value: "teen", label: "ฟ้าสดใส" },
  { value: "chinese", label: "แดงทอง" },
  { value: "manga", label: "ส้มสด" },
  { value: "history", label: "น้ำตาลคลาสสิก" },
  { value: "travel", label: "ฟ้าทะเล" },
  { value: "kids", label: "สีรุ้งอุ่น" },
  { value: "audio", label: "น้ำเงิน" },
];

const formNameLimit = 28;
const homeGridRows = 2;

const quickPresets: CategoryPreset[] = [
  { name: "นิยายรัก", tone: "romance", art: "romance-books" },
  { name: "เทคโนโลยี", tone: "technology", art: "space-science" },
  { name: "การศึกษา", tone: "study", art: "education-graduate" },
  { name: "คอมพิวเตอร์", tone: "technology", art: "space-science" },
  { name: "ธุรกิจ", tone: "business", art: "finance-book" },
  { name: "สุขภาพ", tone: "wellness", art: "health-yoga" },
];

const artOptions = [
  { value: "travel-book", label: "ต่างประเทศ / หนังสือเดินทาง PNG" },
  { value: "manga-reader", label: "มังงะ / นักอ่านมังงะ PNG" },
  { value: "mystery-book", label: "สืบสวน / นักสืบ PNG" },
  { value: "adventure-book", label: "ผจญภัย / นักสำรวจ PNG" },
  { value: "teen-reader", label: "วัยรุ่น / นักอ่านหูฟัง PNG" },
  { value: "drama-mask", label: "ดราม่า / หน้ากากละคร PNG" },
  { value: "chinese-girl", label: "จีนโบราณ / สาวจีนโบราณ PNG" },
  { value: "classic-writer", label: "วรรณกรรม / นักเขียน PNG" },
  { value: "romance-books", label: "นิยายรัก / หนังสือคู่รัก PNG" },
  { value: "fantasy-wizard", label: "แฟนตาซี / พ่อมด PNG" },
  { value: "category-art-set", label: "ชุดตัวอย่าง / รวมภาพปุ่ม PNG" },
  { value: "business-growth", label: "พัฒนาตนเอง / ก้าวสู่ความสำเร็จ PNG" },
  { value: "finance-book", label: "การเงิน / หนังสือนักธุรกิจ PNG" },
  { value: "health-yoga", label: "สุขภาพ / โยคะ PNG" },
  { value: "wisdom-monk", label: "ธรรมะ / สมาธิ PNG" },
  { value: "kids-rainbow", label: "เด็ก / อ่านกับของเล่น PNG" },
  { value: "audio-reader", label: "หนังสือเสียง / ไมค์และหูฟัง PNG" },
  { value: "space-science", label: "วิทยาศาสตร์ / อวกาศ PNG" },
  { value: "horror-book", label: "สยองขวัญ / บ้านผีสิง PNG" },
  { value: "education-owl", label: "การศึกษา / นกฮูกนักอ่าน PNG" },
  { value: "education-graduate", label: "การศึกษา / หมวกบัณฑิต PNG" },
  { value: "romance-family", label: "ครอบครัว / อ่านอบอุ่น PNG" },
  { value: "poetry-writer", label: "กวี / เขียนกลอน PNG" },
  { value: "craft-book", label: "งานฝีมือ / ศิลปะประดิษฐ์ PNG" },
  { value: "law-book", label: "กฎหมาย / ตราชั่ง PNG" },
  { value: "study-book", label: "คู่มือเรียน / จดบันทึก PNG" },
  { value: "wellness-garden", label: "ปลูกต้นไม้ / สวนหนังสือ PNG" },
  { value: "technology-circuit", label: "เทคโนโลยี / วงจร PNG" },
  { value: "math-formula", label: "คณิตศาสตร์ / สูตร PNG" },
  { value: "language-chat", label: "ภาษา / บทสนทนา PNG" },
  { value: "marketing-megaphone", label: "การตลาด / โทรโข่ง PNG" },
  { value: "food-cafe", label: "อาหาร / คาเฟ่ PNG" },
  { value: "beauty-flower", label: "ความงาม / ดอกไม้ PNG" },
  { value: "exercise-runner", label: "ออกกำลังกาย / นักวิ่ง PNG" },
  { value: "geography-globe", label: "ภูมิศาสตร์ / ลูกโลก PNG" },
  { value: "philosophy-lotus", label: "ปรัชญา / ดอกบัว PNG" },
];

const customArtImages: Record<string, string> = {
  "travel-book": "/category-art/travel-book.png",
  "manga-reader": "/category-art/manga-reader.png",
  "mystery-book": "/category-art/mystery-book.png",
  "adventure-book": "/category-art/adventure-book.png",
  "teen-reader": "/category-art/teen-reader.png",
  "drama-mask": "/category-art/drama-mask.png",
  "chinese-girl": "/category-art/chinese-girl.png",
  "classic-writer": "/category-art/classic-writer.png",
  "romance-books": "/category-art/romance-books.png",
  "fantasy-wizard": "/category-art/fantasy-wizard.png",
  "category-art-set": "/category-art/category-art-set.png",
  "business-growth": "/category-art/business-growth.png",
  "finance-book": "/category-art/finance-book.png",
  "health-yoga": "/category-art/health-yoga.png",
  "wisdom-monk": "/category-art/wisdom-monk.png",
  "kids-rainbow": "/category-art/kids-rainbow.png",
  "audio-reader": "/category-art/audio-reader.png",
  "space-science": "/category-art/space-science.png",
  "horror-book": "/category-art/horror-book.png",
  "education-owl": "/category-art/education-owl.png",
  "education-graduate": "/category-art/education-graduate.png",
  "romance-family": "/category-art/romance-family.png",
  "poetry-writer": "/category-art/poetry-writer.png",
  "craft-book": "/category-art/craft-book.png",
  "law-book": "/category-art/law-book.png",
  "study-book": "/category-art/study-book.png",
  "wellness-garden": "/category-art/wellness-garden.png",
  "technology-circuit": "/category-art/technology-circuit.png",
  "math-formula": "/category-art/math-formula.png",
  "language-chat": "/category-art/language-chat.png",
  "marketing-megaphone": "/category-art/marketing-megaphone.png",
  "food-cafe": "/category-art/food-cafe.png",
  "beauty-flower": "/category-art/beauty-flower.png",
  "exercise-runner": "/category-art/exercise-runner.png",
  "geography-globe": "/category-art/geography-globe.png",
  "philosophy-lotus": "/category-art/philosophy-lotus.png",
};

const legacyArtMap: Record<string, string> = {
  story: "romance-family",
  romance: "romance-books",
  fantasy: "fantasy-wizard",
  mystery: "mystery-book",
  adventure: "adventure-book",
  teen: "teen-reader",
  drama: "drama-mask",
  chinese: "chinese-girl",
  foreign: "travel-book",
  manga: "manga-reader",
  comic: "manga-reader",
  classic: "classic-writer",
  knowledge: "education-owl",
  documentary: "classic-writer",
  history: "law-book",
  geography: "geography-globe",
  science: "space-science",
  technology: "technology-circuit",
  math: "education-graduate",
  language: "language-chat",
  computer: "technology-circuit",
  exam: "study-book",
  life: "business-growth",
  psychology: "health-yoga",
  inspiration: "business-growth",
  time: "business-growth",
  business: "finance-book",
  finance: "finance-book",
  marketing: "marketing-megaphone",
  accounting: "finance-book",
  wellness: "health-yoga",
  food: "food-cafe",
  exercise: "exercise-runner",
  beauty: "beauty-flower",
  travel: "travel-book",
  hobby: "craft-book",
  wisdom: "wisdom-monk",
  philosophy: "philosophy-lotus",
  kids: "kids-rainbow",
  picturebook: "kids-rainbow",
  audio: "audio-reader",
};

const defaultArtValue = artOptions[0]?.value || "travel-book";

const emptyForm = (): CategoryForm => ({
  name: "",
  parent_id: "",
  display_tone: "",
  display_art: "",
  show_on_home: true,
  sort_order: 0,
  home_row: 1,
  home_column: 1,
});

const categories = ref<Category[]>([]);
const newForm = ref<CategoryForm>(emptyForm());
const editForm = ref<CategoryForm>(emptyForm());
const editingId = ref<number | null>(null);
const message = ref("");
const errorMessage = ref("");
const loading = ref(false);
const togglingHomeId = ref<number | null>(null);
const homeLayoutItems = ref<Category[]>([]);
const draggedHomeId = ref<number | null>(null);
const layoutDirty = ref(false);
const savingHomeLayout = ref(false);

const mainCategories = computed(() =>
  categories.value
    .filter((item) => !item.parent_id)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || a.name.localeCompare(b.name, "th")),
);

const sortedCategories = computed(() =>
  categories.value
    .slice()
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || a.name.localeCompare(b.name, "th")),
);

const editingCategory = computed(() =>
  categories.value.find((item) => item.id === editingId.value) || null,
);

const homeVisibleCount = computed(
  () => categories.value.filter((item) => item.show_on_home !== false && item.show_on_home !== 0).length,
);

const homeLayoutColumns = computed(() => Math.max(1, Math.ceil(homeLayoutItems.value.length / homeGridRows)));

function toPayload(form: CategoryForm) {
  return {
    name: form.name.trim(),
    parent_id: form.parent_id ? Number(form.parent_id) : null,
    display_tone: form.display_tone || null,
    display_art: form.display_art || null,
    show_on_home: form.show_on_home,
    sort_order: getHomePositionSortOrder(form),
  };
}

function formFromCategory(item: Category): CategoryForm {
  const position = sortOrderToHomePosition(item.sort_order);
  return {
    name: item.name,
    parent_id: item.parent_id ? String(item.parent_id) : "",
    display_tone: item.display_tone || "",
    display_art: item.display_art ? getImageArtValue(item.display_art) : "",
    show_on_home: item.show_on_home !== false && item.show_on_home !== 0,
    sort_order: Number(item.sort_order || 0),
    home_row: position.row,
    home_column: position.column,
  };
}

async function loadCategories() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get<Category[]>("/categories");
    categories.value = Array.isArray(data) ? data : [];
    syncHomeLayoutFromCategories();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดหมวดหมู่ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function createCategory() {
  try {
    message.value = "";
    errorMessage.value = "";
    await api.post("/categories", toPayload(newForm.value));
    newForm.value = emptyForm();
    message.value = "เพิ่มหมวดหมู่สำเร็จ";
    await loadCategories();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เพิ่มหมวดหมู่ไม่สำเร็จ";
  }
}

function startEdit(item: Category) {
  editingId.value = item.id;
  editForm.value = formFromCategory(item);
}

function cancelEdit() {
  editingId.value = null;
  editForm.value = emptyForm();
}

async function updateCategory() {
  if (!editingId.value) return;

  try {
    message.value = "";
    errorMessage.value = "";
    await api.put(`/categories/${editingId.value}`, toPayload(editForm.value));
    message.value = "แก้ไขปุ่มหมวดหมู่สำเร็จ";
    cancelEdit();
    await loadCategories();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "แก้ไขหมวดหมู่ไม่สำเร็จ";
  }
}

async function toggleHomeStatus(item: Category) {
  try {
    message.value = "";
    errorMessage.value = "";
    togglingHomeId.value = item.id;
    const nextStatus = item.show_on_home === false || item.show_on_home === 0;
    await api.put(`/categories/${item.id}`, {
      name: item.name,
      parent_id: item.parent_id,
      display_tone: item.display_tone || null,
      display_art: item.display_art || null,
      show_on_home: nextStatus,
      sort_order: Number(item.sort_order || 0),
    });
    item.show_on_home = nextStatus;
    syncHomeLayoutFromCategories();
    message.value = nextStatus ? "เปิดการแสดงบนหน้า Home แล้ว" : "ปิดการแสดงบนหน้า Home แล้ว";
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เปลี่ยนสถานะการแสดงไม่สำเร็จ";
  } finally {
    togglingHomeId.value = null;
  }
}

async function deleteCategory(id: number) {
  const ok = window.confirm("ยืนยันการลบหมวดหมู่นี้?");
  if (!ok) return;

  try {
    message.value = "";
    errorMessage.value = "";
    await api.delete(`/categories/${id}`);
    message.value = "ลบหมวดหมู่สำเร็จ";
    await loadCategories();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "ลบหมวดหมู่ไม่สำเร็จ";
  }
}

function getParentName(item: Category) {
  if (!item.parent_id) return "หมวดหลัก";
  return categories.value.find((parent) => parent.id === item.parent_id)?.name || "หมวดย่อย";
}

function isHomeVisible(item: Category) {
  return item.show_on_home !== false && item.show_on_home !== 0;
}

function getSortedHomeItems() {
  return categories.value
    .filter(isHomeVisible)
    .slice()
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id || 0) - Number(b.id || 0));
}

function syncHomeLayoutFromCategories() {
  homeLayoutItems.value = getSortedHomeItems();
  layoutDirty.value = false;
}

function getCategoryPreviewTone(item: Category) {
  return item.display_tone || "story";
}

function getCategoryPreviewArt(item: Category) {
  return item.display_art ? getImageArtValue(item.display_art) : "";
}

function getPreviewTone(form: CategoryForm) {
  return form.display_tone || "story";
}

function getPreviewArt(form: CategoryForm) {
  return form.display_art ? getImageArtValue(form.display_art) : "";
}

function getImageArtValue(value?: string | null) {
  if (value && customArtImages[value]) return value;
  if (value && legacyArtMap[value]) return legacyArtMap[value];
  return defaultArtValue;
}

function getCustomArtImage(value?: string | null) {
  if (!value) return "";
  return customArtImages[getImageArtValue(value)];
}

function getArtLabel(value: string) {
  return artOptions.find((option) => option.value === getImageArtValue(value))?.label || artOptions[0]?.label || "";
}

function getSelectedArtLabel(form: CategoryForm) {
  return form.display_art ? getArtLabel(form.display_art) : "ไม่เลือกภาพประกอบ";
}

function getSelectedToneLabel(form: CategoryForm) {
  return toneOptions.find((option) => option.value === form.display_tone)?.label || toneOptions[0].label;
}

function selectTone(form: CategoryForm, value: string, event?: MouseEvent) {
  form.display_tone = value;
  const details = event?.currentTarget instanceof HTMLElement ? event.currentTarget.closest("details") : null;
  if (details instanceof HTMLDetailsElement) details.open = false;
}

function selectArt(form: CategoryForm, value: string, event?: MouseEvent) {
  form.display_art = value;
  const details = event?.currentTarget instanceof HTMLElement ? event.currentTarget.closest("details") : null;
  if (details instanceof HTMLDetailsElement) details.open = false;
}

function hideBrokenImage(event: Event) {
  const image = event.currentTarget;
  if (image instanceof HTMLImageElement) image.hidden = true;
}

function clampPositionNumber(value: number, fallback: number, min: number, max = Number.MAX_SAFE_INTEGER) {
  const nextValue = Math.round(Number(value));
  if (!Number.isFinite(nextValue)) return fallback;
  return Math.min(Math.max(nextValue, min), max);
}

function getHomePositionSortOrder(form: CategoryForm) {
  const row = clampPositionNumber(form.home_row, 1, 1, homeGridRows);
  const column = clampPositionNumber(form.home_column, 1, 1);
  form.home_row = row;
  form.home_column = column;
  form.sort_order = (column - 1) * homeGridRows + row - 1;
  return form.sort_order;
}

function sortOrderToHomePosition(sortOrder?: number | null) {
  const order = Math.max(0, Math.round(Number(sortOrder || 0)));
  return {
    row: (order % homeGridRows) + 1,
    column: Math.floor(order / homeGridRows) + 1,
  };
}

function getHomePositionLabel(sortOrder?: number | null) {
  const position = sortOrderToHomePosition(sortOrder);
  return `แถว ${position.row} / คอลัมน์ ${position.column}`;
}

function applyHomeLayoutOrder() {
  homeLayoutItems.value.forEach((item, index) => {
    item.sort_order = index;
  });
}

function moveHomeLayoutItem(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
  const nextItems = homeLayoutItems.value.slice();
  const [item] = nextItems.splice(fromIndex, 1);
  if (!item) return;
  nextItems.splice(toIndex, 0, item);
  homeLayoutItems.value = nextItems;
  applyHomeLayoutOrder();
  layoutDirty.value = true;
}

function startHomeDrag(event: DragEvent, item: Category) {
  draggedHomeId.value = item.id;
  event.dataTransfer?.setData("text/plain", String(item.id));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function overHomeDrag(event: DragEvent, targetItem: Category) {
  event.preventDefault();
  const sourceId = draggedHomeId.value;
  if (!sourceId || sourceId === targetItem.id) return;
  const fromIndex = homeLayoutItems.value.findIndex((item) => item.id === sourceId);
  const toIndex = homeLayoutItems.value.findIndex((item) => item.id === targetItem.id);
  moveHomeLayoutItem(fromIndex, toIndex);
}

function endHomeDrag() {
  draggedHomeId.value = null;
}

async function saveHomeLayout() {
  try {
    message.value = "";
    errorMessage.value = "";
    savingHomeLayout.value = true;
    applyHomeLayoutOrder();
    await Promise.all(
      homeLayoutItems.value.map((item, index) =>
        api.put(`/categories/${item.id}`, {
          name: item.name,
          parent_id: item.parent_id,
          display_tone: item.display_tone || null,
          display_art: item.display_art || null,
          show_on_home: true,
          sort_order: index,
        }),
      ),
    );
    message.value = "บันทึกตำแหน่งปุ่มหน้า Home สำเร็จ";
    await loadCategories();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "บันทึกตำแหน่งปุ่มหน้า Home ไม่สำเร็จ";
  } finally {
    savingHomeLayout.value = false;
  }
}

function applyPreset(form: CategoryForm, preset: CategoryPreset) {
  form.name = preset.name;
  form.display_tone = preset.tone;
  form.display_art = preset.art;
  form.show_on_home = true;
}

onMounted(loadCategories);
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <span>Admin</span>
        <h1>จัดการหมวดหมู่และปุ่มหน้า Home</h1>
        <p>เพิ่มหมวด แก้ชื่อปุ่ม เลือกธีมการ์ตูน เปิด/ปิดการแสดง และจัดลำดับบนหน้า Home</p>
      </div>
    </header>

    <p v-if="message" class="success">{{ message }}</p>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <section class="category-workspace">
      <section class="admin-grid">
      <form class="panel" @submit.prevent="createCategory">
        <div class="panel-title">
          <div>
            <h2>เพิ่มปุ่มหมวดใหม่</h2>
            <p>ตั้งชื่อ เลือกโทน และดูตัวอย่างก่อนนำไปแสดงบนหน้า Home</p>
          </div>
          <span class="home-chip">Home {{ homeVisibleCount }}</span>
        </div>

        <div class="preset-panel">
          <div>
            <strong>ชุดแนะนำ</strong>
            <span>แตะเพื่อเติมชื่อ สี และภาพให้พร้อมใช้งาน</span>
          </div>
          <div class="preset-grid">
            <button
              v-for="preset in quickPresets"
              :key="preset.name"
              class="preset-chip"
              type="button"
              @click="applyPreset(newForm, preset)"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>

        <label>
          ชื่อปุ่ม
          <input v-model="newForm.name" type="text" placeholder="เช่น นิยายรัก" :maxlength="formNameLimit" required />
          <span class="field-hint-row">
            <small>ชื่อสั้นจะอ่านง่ายบนมือถือ</small>
            <small>{{ newForm.name.length }}/{{ formNameLimit }}</small>
          </span>
        </label>

        <div class="form-grid">
          <label>
            อยู่ใต้หมวด
            <select v-model="newForm.parent_id">
              <option value="">หมวดหลัก</option>
              <option v-for="item in mainCategories" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </label>

          <div class="position-fields">
            <label>
              แถวบน Home
              <input v-model.number="newForm.home_row" type="number" min="1" :max="homeGridRows" step="1" />
            </label>
            <label>
              คอลัมน์
              <input v-model.number="newForm.home_column" type="number" min="1" step="1" />
            </label>
            <small class="field-hint">หน้า Home มี 2 แถว แล้วเรียงจากซ้ายไปขวาตามคอลัมน์</small>
          </div>
        </div>

        <div class="form-grid">
          <div class="tone-picker-field">
            ธีมสีปุ่ม
            <details class="tone-dropdown">
              <summary :aria-label="`ธีมสีปุ่ม: ${getSelectedToneLabel(newForm)}`">
                <span
                  class="tone-swatch"
                  :class="newForm.display_tone ? `category-chip--${newForm.display_tone}` : 'tone-swatch--auto'"
                  aria-hidden="true"
                ></span>
              </summary>
              <div class="tone-dropdown__menu" role="radiogroup" aria-label="ธีมสีปุ่ม">
                <button
                  v-for="option in toneOptions"
                  :key="option.value || 'auto'"
                  class="tone-swatch"
                  :class="[
                    option.value ? `category-chip--${option.value}` : 'tone-swatch--auto',
                    { 'is-selected': newForm.display_tone === option.value },
                  ]"
                  type="button"
                  role="radio"
                  :aria-checked="newForm.display_tone === option.value"
                  :aria-label="option.label"
                  @click="selectTone(newForm, option.value, $event)"
                ></button>
              </div>
            </details>
          </div>

          <div class="art-picker-field">
            ภาพประกอบปุ่ม Home
            <details class="art-picker">
              <summary :aria-label="`ภาพประกอบปุ่ม Home: ${getSelectedArtLabel(newForm)}`">
                <img
                  v-if="newForm.display_art"
                  :src="getCustomArtImage(getPreviewArt(newForm))"
                  alt=""
                  @error="hideBrokenImage"
                />
                <span v-else class="art-picker__empty-mark" aria-hidden="true"></span>
              </summary>
              <div class="art-picker__menu">
                <button
                  class="art-picker__option art-picker__option--empty"
                  :class="{ 'is-selected': !newForm.display_art }"
                  type="button"
                  aria-label="ไม่เลือกภาพประกอบ"
                  @click="selectArt(newForm, '', $event)"
                >
                  <span class="art-picker__empty-mark" aria-hidden="true"></span>
                </button>
                <button
                  v-for="option in artOptions"
                  :key="option.value"
                  class="art-picker__option"
                  :class="{ 'is-selected': newForm.display_art === option.value }"
                  type="button"
                  :aria-label="option.label"
                  @click="selectArt(newForm, option.value, $event)"
                >
                  <img :src="getCustomArtImage(option.value)" alt="" @error="hideBrokenImage" />
                </button>
              </div>
            </details>
            <div class="art-selected-preview">
              <div class="art-selected-preview__scene" :class="`category-chip--${getPreviewTone(newForm)}`" aria-hidden="true">
                <img
                  v-if="newForm.display_art"
                  class="category-art-image"
                  :src="getCustomArtImage(getPreviewArt(newForm))"
                  alt=""
                  @error="hideBrokenImage"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="create-preview" :class="{ 'create-preview--hidden': !newForm.show_on_home }">
          <div class="create-preview__head">
            <strong>ตัวอย่างปุ่มที่จะสร้าง</strong>
            <small>
              {{
                newForm.show_on_home
                  ? `แถว ${newForm.home_row || 1} / คอลัมน์ ${newForm.home_column || 1}`
                  : "ยังไม่แสดงบนหน้า Home"
              }}
            </small>
          </div>
          <div
            class="category-chip create-preview__button"
            :class="[`category-chip--${getPreviewTone(newForm)}`, `category-chip--art-${getPreviewArt(newForm)}`]"
          >
            <img
              v-if="newForm.display_art"
              class="category-art-image"
              :src="getCustomArtImage(getPreviewArt(newForm))"
              alt=""
              aria-hidden="true"
              @error="hideBrokenImage"
            />
            <strong>{{ newForm.name || "ชื่อปุ่มหมวด" }}</strong>
          </div>
        </div>

        <label class="check-row">
          <input v-model="newForm.show_on_home" type="checkbox" />
          <span>
            แสดงเป็นปุ่มบนหน้า Home
            <small>ปิดได้ถ้าต้องการเก็บหมวดไว้ใช้ภายในก่อน</small>
          </span>
        </label>

        <button class="primary-btn" type="submit">เพิ่มหมวดหมู่</button>
      </form>

      <form v-if="editingCategory" class="panel edit-panel" @submit.prevent="updateCategory">
        <div class="panel-title">
          <div>
            <h2>แก้ไขปุ่ม: {{ editingCategory.name }}</h2>
            <p>ปรับหน้าตาปุ่มและสถานะการแสดงบนหน้า Home</p>
          </div>
        </div>

        <div class="preset-panel">
          <div>
            <strong>ชุดแนะนำ</strong>
            <span>ใช้เป็นจุดเริ่มต้นแล้วแก้ชื่อได้ทันที</span>
          </div>
          <div class="preset-grid">
            <button
              v-for="preset in quickPresets"
              :key="preset.name"
              class="preset-chip"
              type="button"
              @click="applyPreset(editForm, preset)"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>

        <label>
          ชื่อปุ่ม
          <input v-model="editForm.name" type="text" :maxlength="formNameLimit" required />
          <span class="field-hint-row">
            <small>ชื่อสั้นจะอ่านง่ายบนมือถือ</small>
            <small>{{ editForm.name.length }}/{{ formNameLimit }}</small>
          </span>
        </label>

        <div class="form-grid">
          <label>
            อยู่ใต้หมวด
            <select v-model="editForm.parent_id">
              <option value="">หมวดหลัก</option>
              <option
                v-for="item in mainCategories.filter((category) => category.id !== editingId)"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select>
          </label>

          <div class="position-fields">
            <label>
              แถวบน Home
              <input v-model.number="editForm.home_row" type="number" min="1" :max="homeGridRows" step="1" />
            </label>
            <label>
              คอลัมน์
              <input v-model.number="editForm.home_column" type="number" min="1" step="1" />
            </label>
            <small class="field-hint">หน้า Home มี 2 แถว แล้วเรียงจากซ้ายไปขวาตามคอลัมน์</small>
          </div>
        </div>

        <div class="form-grid">
          <div class="tone-picker-field">
            ธีมสีปุ่ม
            <details class="tone-dropdown">
              <summary :aria-label="`ธีมสีปุ่ม: ${getSelectedToneLabel(editForm)}`">
                <span
                  class="tone-swatch"
                  :class="editForm.display_tone ? `category-chip--${editForm.display_tone}` : 'tone-swatch--auto'"
                  aria-hidden="true"
                ></span>
              </summary>
              <div class="tone-dropdown__menu" role="radiogroup" aria-label="ธีมสีปุ่ม">
                <button
                  v-for="option in toneOptions"
                  :key="option.value || 'auto'"
                  class="tone-swatch"
                  :class="[
                    option.value ? `category-chip--${option.value}` : 'tone-swatch--auto',
                    { 'is-selected': editForm.display_tone === option.value },
                  ]"
                  type="button"
                  role="radio"
                  :aria-checked="editForm.display_tone === option.value"
                  :aria-label="option.label"
                  @click="selectTone(editForm, option.value, $event)"
                ></button>
              </div>
            </details>
          </div>

          <div class="art-picker-field">
            ภาพประกอบปุ่ม Home
            <details class="art-picker">
              <summary :aria-label="`ภาพประกอบปุ่ม Home: ${getSelectedArtLabel(editForm)}`">
                <img
                  v-if="editForm.display_art"
                  :src="getCustomArtImage(getPreviewArt(editForm))"
                  alt=""
                  @error="hideBrokenImage"
                />
                <span v-else class="art-picker__empty-mark" aria-hidden="true"></span>
              </summary>
              <div class="art-picker__menu">
                <button
                  class="art-picker__option art-picker__option--empty"
                  :class="{ 'is-selected': !editForm.display_art }"
                  type="button"
                  aria-label="ไม่เลือกภาพประกอบ"
                  @click="selectArt(editForm, '', $event)"
                >
                  <span class="art-picker__empty-mark" aria-hidden="true"></span>
                </button>
                <button
                  v-for="option in artOptions"
                  :key="option.value"
                  class="art-picker__option"
                  :class="{ 'is-selected': editForm.display_art === option.value }"
                  type="button"
                  :aria-label="option.label"
                  @click="selectArt(editForm, option.value, $event)"
                >
                  <img :src="getCustomArtImage(option.value)" alt="" @error="hideBrokenImage" />
                </button>
              </div>
            </details>
            <div class="art-selected-preview">
              <div class="art-selected-preview__scene" :class="`category-chip--${getPreviewTone(editForm)}`" aria-hidden="true">
                <img
                  v-if="editForm.display_art"
                  class="category-art-image"
                  :src="getCustomArtImage(getPreviewArt(editForm))"
                  alt=""
                  @error="hideBrokenImage"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="create-preview" :class="{ 'create-preview--hidden': !editForm.show_on_home }">
          <div class="create-preview__head">
            <strong>ตัวอย่างปุ่มที่กำลังแก้ไข</strong>
            <small>
              {{
                editForm.show_on_home
                  ? `แถว ${editForm.home_row || 1} / คอลัมน์ ${editForm.home_column || 1}`
                  : "ยังไม่แสดงบนหน้า Home"
              }}
            </small>
          </div>
          <div
            class="category-chip create-preview__button"
            :class="[`category-chip--${getPreviewTone(editForm)}`, `category-chip--art-${getPreviewArt(editForm)}`]"
          >
            <img
              v-if="editForm.display_art"
              class="category-art-image"
              :src="getCustomArtImage(getPreviewArt(editForm))"
              alt=""
              aria-hidden="true"
              @error="hideBrokenImage"
            />
            <strong>{{ editForm.name || "ชื่อปุ่มหมวด" }}</strong>
          </div>
        </div>

        <label class="check-row">
          <input v-model="editForm.show_on_home" type="checkbox" />
          <span>
            แสดงเป็นปุ่มบนหน้า Home
            <small>ปิดได้ถ้าต้องการเก็บหมวดไว้ใช้ภายในก่อน</small>
          </span>
        </label>

        <div class="actions">
          <button class="primary-btn" type="submit">บันทึก</button>
          <button class="ghost-btn" type="button" @click="cancelEdit">ยกเลิก</button>
        </div>
      </form>
      </section>

      <section class="panel home-layout-panel">
        <div class="panel-title">
          <div>
            <h2>ตัวอย่างปุ่มหน้า Home ทั้งหมด</h2>
            <p>ลากปุ่มเพื่อจัดตำแหน่งจริงบนหน้า Home แล้วกดบันทึก</p>
          </div>
          <div class="layout-actions">
            <button class="ghost-btn" type="button" :disabled="savingHomeLayout || !layoutDirty" @click="syncHomeLayoutFromCategories">
              คืนค่าเดิม
            </button>
            <button class="primary-btn" type="button" :disabled="savingHomeLayout || !layoutDirty" @click="saveHomeLayout">
              {{ savingHomeLayout ? "กำลังบันทึก..." : "บันทึกตำแหน่ง" }}
            </button>
          </div>
        </div>

        <div v-if="homeLayoutItems.length" class="home-layout-stage">
          <div class="home-layout-ruler">
            <span>แถว 1</span>
            <span>แถว 2</span>
          </div>
          <div
            class="home-layout-grid"
            :style="{ '--home-layout-columns': homeLayoutColumns }"
            @dragend="endHomeDrag"
            @drop="endHomeDrag"
          >
            <button
              v-for="(item, index) in homeLayoutItems"
              :key="item.id"
              :class="[
                'category-chip',
                'home-layout-chip',
                `category-chip--${getCategoryPreviewTone(item)}`,
                `category-chip--art-${getCategoryPreviewArt(item)}`,
                { 'is-dragging': draggedHomeId === item.id },
              ]"
              type="button"
              draggable="true"
              @dragstart="startHomeDrag($event, item)"
              @dragover="overHomeDrag($event, item)"
              @drop="endHomeDrag"
            >
              <img
                v-if="item.display_art"
                class="category-art-image"
                :src="getCustomArtImage(getCategoryPreviewArt(item))"
                alt=""
                aria-hidden="true"
                @error="hideBrokenImage"
              />
              <strong>{{ item.name }}</strong>
            </button>
          </div>
        </div>

        <p v-else class="empty-home-layout">ยังไม่มีปุ่มที่เปิดแสดงบนหน้า Home</p>
      </section>
    </section>

    <section class="panel list-panel">
      <div class="list-head">
        <h2>รายการหมวดหมู่</h2>
        <span v-if="loading">กำลังโหลด...</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ชื่อปุ่ม</th>
              <th>ชั้นหมวด</th>
              <th>Home</th>
              <th>ธีม</th>
              <th>ภาพประกอบ</th>
              <th>ตำแหน่ง Home</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedCategories" :key="item.id">
              <td>
                <strong>{{ item.name }}</strong>
              </td>
              <td>{{ getParentName(item) }}</td>
              <td>
                <button
                  :class="['status-pill', 'status-toggle', item.show_on_home === false || item.show_on_home === 0 ? 'off' : 'on']"
                  type="button"
                  :disabled="togglingHomeId === item.id"
                  :aria-pressed="!(item.show_on_home === false || item.show_on_home === 0)"
                  @click="toggleHomeStatus(item)"
                >
                  {{ item.show_on_home === false || item.show_on_home === 0 ? "ซ่อน" : "แสดง" }}
                </button>
              </td>
              <td>{{ item.display_tone || "อัตโนมัติ" }}</td>
              <td>{{ item.display_art || "อัตโนมัติ" }}</td>
              <td>
                <span class="position-pill">{{ getHomePositionLabel(item.sort_order) }}</span>
              </td>
              <td class="row-actions">
                <button type="button" @click="startEdit(item)">แก้ปุ่ม</button>
                <button class="danger" type="button" @click="deleteCategory(item.id)">ลบ</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 18px;
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.page-head span {
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: var(--text-strong);
  font-size: 28px;
}

.page-head p {
  margin-top: 6px;
  color: var(--text-muted);
  font-weight: 700;
}

.category-workspace {
  display: grid;
  grid-template-columns: minmax(440px, 0.9fr) minmax(460px, 1.1fr);
  align-items: start;
  gap: 18px;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.category-workspace > .admin-grid {
  grid-template-columns: 1fr;
}

.panel {
  display: grid;
  gap: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 18px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-title p {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
}

.home-chip {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  white-space: nowrap;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, var(--surface-soft));
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
  padding: 5px 10px;
}

.edit-panel {
  border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
}

.preset-panel {
  display: grid;
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--primary) 16%, var(--border));
  border-radius: 10px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--primary) 7%, transparent), transparent 44%),
    var(--surface-soft);
  padding: 12px;
}

.preset-panel strong,
.preset-panel span {
  display: block;
}

.preset-panel strong {
  color: var(--text-strong);
  font-size: 13px;
}

.preset-panel span {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.preset-chip {
  min-width: 0;
  background: var(--surface);
  color: var(--text-strong);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-chip:hover {
  border-color: var(--primary);
  color: var(--primary-strong);
}

.create-preview {
  display: grid;
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--primary) 18%, var(--border));
  border-radius: 12px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--primary) 7%, transparent), transparent 42%),
    var(--surface-soft);
  padding: 12px;
}

.create-preview__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.create-preview__head strong {
  color: var(--text-strong);
  font-size: 13px;
}

.create-preview__head small {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
  text-align: right;
}

.create-preview__button {
  width: min(360px, 100%);
  margin: 0;
}

.create-preview--hidden .create-preview__button {
  filter: grayscale(0.45);
  opacity: 0.7;
}

.art-selected-preview {
  display: grid;
  grid-template-columns: 96px;
  align-items: center;
  justify-content: start;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--primary) 16%, var(--border));
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px;
}

.art-selected-preview__scene {
  --chip-a: #7c3aed;
  --chip-b: #d8b4fe;
  --chip-c: #f6efff;
  --chip-d: #fff8ff;
  position: relative;
  min-height: 82px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--chip-a) 22%, white);
  border-radius: 12px;
  background:
    radial-gradient(circle at 14% 20%, rgba(255, 255, 255, 0.95) 0 4px, transparent 5px),
    linear-gradient(135deg, color-mix(in srgb, var(--chip-c) 82%, white), color-mix(in srgb, var(--chip-b) 28%, white));
}

.art-selected-preview__scene .category-art {
  right: -8px;
  bottom: -12px;
  transform: scale(0.58);
}

.art-selected-preview__scene .category-art-image {
  right: 10px;
  bottom: 8px;
  width: 58px;
  height: 58px;
}

.art-selected-preview > span {
  display: grid;
  gap: 3px;
  min-width: 0;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 900;
}

.art-selected-preview small {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
}

.layout-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.home-layout-panel {
  position: sticky;
  top: 76px;
  max-height: calc(100vh - 96px);
  overflow: hidden;
}

.home-layout-stage {
  position: relative;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background:
    linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(180deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    #f8fafc;
  background-size: 24px 24px;
  padding: 14px;
}

.home-layout-ruler {
  display: grid;
  grid-template-rows: repeat(2, minmax(88px, 1fr));
  gap: 14px;
}

.home-layout-ruler span {
  display: grid;
  place-items: center;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 900;
  writing-mode: vertical-rl;
}

.home-layout-grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(280px, 280px);
  grid-template-rows: repeat(2, minmax(112px, auto));
  gap: 16px 14px;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  padding: 2px 4px 12px 2px;
  scroll-snap-type: x proximity;
}

.home-layout-chip {
  scroll-snap-align: start;
  width: 100%;
  min-height: 112px;
  margin: 0;
  text-align: left;
  cursor: grab;
  transition:
    box-shadow 0.18s ease,
    opacity 0.18s ease,
    transform 0.18s ease;
}

.home-layout-chip:hover,
.home-layout-chip:focus-visible {
  box-shadow: 0 18px 34px color-mix(in srgb, var(--chip-a) 22%, transparent);
  transform: translateY(-2px);
}

.home-layout-chip:active {
  cursor: grabbing;
}

.home-layout-chip.is-dragging {
  opacity: 0.52;
  transform: scale(0.98);
}

.drag-handle,
.position-badge {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
}

.drag-handle {
  top: 8px;
  left: 10px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--text-muted);
  padding: 5px 7px;
}

.position-badge {
  right: 12px;
  top: 8px;
  background: color-mix(in srgb, var(--chip-a) 18%, white);
  color: color-mix(in srgb, var(--chip-a) 78%, #101828);
  padding: 5px 8px;
}

.empty-home-layout {
  border: 1px dashed var(--border);
  border-radius: 10px;
  color: var(--text-muted);
  font-weight: 800;
  padding: 18px;
  text-align: center;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.position-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.position-fields .field-hint {
  grid-column: 1 / -1;
}

label {
  display: grid;
  gap: 6px;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 900;
}

.tone-picker-field {
  position: relative;
  display: grid;
  align-content: start;
  gap: 8px;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 900;
}

.tone-dropdown {
  position: relative;
  z-index: 6;
}

.tone-dropdown[open] {
  z-index: 22;
}

.tone-dropdown summary {
  display: flex;
  align-items: center;
  min-height: 58px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg, #f8fafc);
  cursor: pointer;
  list-style: none;
  padding: 8px 42px 8px 10px;
}

.tone-dropdown summary::-webkit-details-marker {
  display: none;
}

.tone-dropdown summary::after {
  content: "⌄";
  position: absolute;
  top: 18px;
  right: 12px;
  color: var(--text-muted);
  font-size: 18px;
  line-height: 1;
}

.tone-dropdown[open] summary {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

.tone-dropdown__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 20px 42px rgba(15, 23, 42, 0.16);
  padding: 8px;
}

.tone-swatch {
  --chip-a: #7c3aed;
  --chip-b: #d8b4fe;
  min-width: 0;
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid transparent;
  border-radius: 999px;
  background:
    radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.9) 0 18%, transparent 19%),
    linear-gradient(135deg, var(--chip-a), var(--chip-b));
  box-shadow: 0 5px 12px color-mix(in srgb, var(--chip-a) 22%, transparent);
  cursor: pointer;
  padding: 0;
}

.tone-dropdown summary .tone-swatch {
  flex: 0 0 40px;
  width: 40px;
}

.tone-swatch--auto {
  background:
    linear-gradient(135deg, transparent 0 43%, #64748b 44% 56%, transparent 57%),
    linear-gradient(135deg, #ffffff, #e2e8f0);
  box-shadow: inset 0 0 0 1px var(--border);
}

.tone-swatch:hover,
.tone-swatch:focus-visible,
.tone-swatch.is-selected {
  border-color: var(--text-strong);
  outline: 0;
}

.tone-swatch.is-selected {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent),
    0 8px 18px color-mix(in srgb, var(--chip-a) 25%, transparent);
}

.art-picker-field {
  position: relative;
  display: grid;
  gap: 6px;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 900;
}

input,
select {
  min-height: 42px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--input-bg, #f8fafc);
  color: var(--text-strong);
  padding: 8px 10px;
}

.art-picker {
  position: relative;
  z-index: 5;
}

.art-picker[open] {
  z-index: 20;
}

.art-picker summary {
  display: grid;
  grid-template-columns: 54px;
  align-items: center;
  justify-content: start;
  min-height: 58px;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg, #f8fafc);
  color: var(--text-strong);
  cursor: pointer;
  list-style: none;
  padding: 6px 38px 6px 8px;
}

.art-picker summary::-webkit-details-marker {
  display: none;
}

.art-picker summary::after {
  content: "⌄";
  position: absolute;
  top: 18px;
  right: 12px;
  color: var(--text-muted);
  font-size: 18px;
  line-height: 1;
}

.art-picker[open] summary {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

.art-picker summary img,
.art-picker__option img {
  width: 54px;
  height: 54px;
  border-radius: 8px;
  background: transparent;
  object-fit: contain;
}

.art-picker__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 20px 42px rgba(15, 23, 42, 0.16);
  padding: 10px;
}

.art-picker__option {
  display: grid;
  place-items: center;
  min-height: 70px;
  border-color: var(--border);
  background: var(--surface-soft);
  color: var(--text-strong);
  text-align: left;
}

.art-picker__empty-mark {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.art-picker__empty-mark::before {
  content: "";
  width: 28px;
  height: 2px;
  border-radius: 999px;
  background: var(--text-muted);
  transform: rotate(-35deg);
}

.art-picker__option:hover,
.art-picker__option.is-selected {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 9%, var(--surface));
  color: var(--primary-strong);
}

.field-hint,
.field-hint-row {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
}

.field-hint-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--primary) 10%, var(--border));
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 10px 12px;
}

.check-row input {
  width: 18px;
  min-height: 18px;
}

.check-row span {
  display: grid;
  gap: 2px;
}

.check-row small {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
}

.category-button-preview {
  --chip-a: #7c3aed;
  --chip-b: #f0abfc;
  --chip-c: #f4e8ff;
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-height: 88px;
  width: min(360px, 100%);
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--chip-a) 32%, white);
  border-radius: 18px;
  background:
    radial-gradient(circle at 8% 16%, rgba(255, 255, 255, 0.9) 0 2px, transparent 2.5px),
    radial-gradient(circle at 86% 22%, color-mix(in srgb, var(--chip-b) 80%, white) 0 4px, transparent 4.8px),
    linear-gradient(100deg, color-mix(in srgb, var(--chip-c) 82%, white) 0%, #ffffff 50%, color-mix(in srgb, var(--chip-b) 30%, white) 100%);
  color: color-mix(in srgb, var(--chip-a) 78%, #101828);
  margin: 0 -8px 0 10px;
  padding: 16px 108px 16px 20px;
  box-shadow: 0 14px 28px color-mix(in srgb, var(--chip-a) 16%, transparent);
}

.category-button-preview::before {
  content: "";
  position: absolute;
  inset: 9px 10px 9px auto;
  z-index: -1;
  width: 42%;
  border-radius: 999px 16px 16px 999px;
  background:
    radial-gradient(circle at 28% 30%, rgba(255, 255, 255, 0.82) 0 9px, transparent 10px),
    linear-gradient(145deg, color-mix(in srgb, var(--chip-a) 18%, white), color-mix(in srgb, var(--chip-b) 36%, white));
}

.category-button-preview strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-art-preview {
  position: absolute;
  right: 13px;
  bottom: 9px;
  width: 78px;
  height: 76px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 28% 26%, rgba(255, 255, 255, 0.9) 0 7px, transparent 8px),
    radial-gradient(circle at 72% 74%, color-mix(in srgb, var(--chip-a) 24%, transparent) 0 24px, transparent 25px),
    linear-gradient(145deg, color-mix(in srgb, var(--chip-b) 40%, white), color-mix(in srgb, var(--chip-a) 18%, white));
}

.category-art-preview__head,
.category-art-preview__body,
.category-art-preview__book,
.category-art-preview__spark {
  position: absolute;
  display: block;
}

.category-art-preview__head {
  top: 14px;
  left: 32px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #ffe3b0;
  box-shadow: inset 0 -4px 0 rgba(120, 53, 15, 0.12);
}

.category-art-preview__head::before {
  content: "";
  position: absolute;
  inset: -5px -4px 14px -4px;
  border-radius: 999px 999px 8px 8px;
  background: var(--chip-a);
}

.category-art-preview__body {
  right: 8px;
  bottom: 7px;
  width: 38px;
  height: 31px;
  border-radius: 16px 16px 8px 8px;
  background: var(--chip-a);
  box-shadow: inset 0 -9px 0 color-mix(in srgb, #000 10%, transparent);
}

.category-art-preview__book {
  left: 10px;
  bottom: 8px;
  width: 38px;
  height: 31px;
  border-radius: 4px 11px 11px 4px;
  background:
    linear-gradient(90deg, #ffffff 0 46%, rgba(255, 255, 255, 0.72) 47% 53%, #ffffff 54%);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.12);
}

.category-art-preview__spark {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
}

.category-art-preview__spark--one {
  top: 13px;
  left: 13px;
  width: 12px;
  height: 12px;
}

.category-art-preview__spark--two {
  right: 7px;
  top: 8px;
  width: 7px;
  height: 7px;
}

.category-art-preview--romance .category-art-preview__spark--one,
.category-art-preview--beauty .category-art-preview__spark--one {
  top: 27px;
  left: 16px;
  width: 22px;
  height: 20px;
  border-radius: 6px 6px 2px 6px;
  background:
    radial-gradient(circle at 32% 30%, #ffffff 0 8px, transparent 9px),
    radial-gradient(circle at 68% 30%, #ffffff 0 8px, transparent 9px),
    linear-gradient(135deg, #ffffff 0 50%, transparent 51%);
  transform: rotate(45deg);
}

.category-art-preview--fantasy .category-art-preview__spark--two,
.category-art-preview--wisdom .category-art-preview__spark--two,
.category-art-preview--philosophy .category-art-preview__spark--two {
  right: 5px;
  top: 7px;
  width: 24px;
  height: 24px;
  border-radius: 4px 18px 18px 18px;
  background: #ffffff;
  transform: rotate(45deg);
}

.category-art-preview--mystery .category-art-preview__book {
  left: 13px;
  bottom: 17px;
  width: 30px;
  height: 30px;
  border: 7px solid #ffffff;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
}

.category-art-preview--mystery .category-art-preview__spark--one {
  top: 52px;
  left: 38px;
  width: 25px;
  height: 7px;
  background: #ffffff;
  transform: rotate(45deg);
}

.category-art-preview--adventure .category-art-preview__book,
.category-art-preview--travel .category-art-preview__book,
.category-art-preview--geography .category-art-preview__book {
  left: 9px;
  bottom: 10px;
  width: 50px;
  height: 34px;
  border-radius: 6px;
  background:
    linear-gradient(135deg, transparent 0 33%, #ffffff 34% 62%, transparent 63%),
    linear-gradient(45deg, transparent 0 42%, rgba(255, 255, 255, 0.76) 43% 68%, transparent 69%);
}

.category-art-preview--teen .category-art-preview__book,
.category-art-preview--audio .category-art-preview__book {
  left: 10px;
  bottom: 20px;
  width: 46px;
  height: 28px;
  border: 7px solid #ffffff;
  border-bottom: 0;
  border-radius: 28px 28px 0 0;
  background: transparent;
  box-shadow: none;
}

.category-art-preview--drama .category-art-preview__book,
.category-art-preview--manga .category-art-preview__book,
.category-art-preview--comic .category-art-preview__book {
  left: 9px;
  bottom: 18px;
  width: 48px;
  height: 32px;
  border-radius: 16px;
  background: #ffffff;
}

.category-art-preview--drama .category-art-preview__book::after,
.category-art-preview--manga .category-art-preview__book::after,
.category-art-preview--comic .category-art-preview__book::after {
  content: "";
  position: absolute;
  right: 8px;
  bottom: -5px;
  width: 13px;
  height: 13px;
  background: #ffffff;
  transform: rotate(45deg);
}

.category-art-preview--chinese .category-art-preview__book {
  left: 16px;
  bottom: 15px;
  width: 40px;
  height: 38px;
  border-radius: 12px 12px 22px 22px;
  background: #ffffff;
  box-shadow: inset 0 -9px 0 var(--chip-b);
}

.category-art-preview--foreign .category-art-preview__book {
  left: 14px;
  bottom: 14px;
  width: 42px;
  height: 42px;
  border: 5px solid #ffffff;
  border-radius: 999px;
  background:
    linear-gradient(90deg, transparent 44%, #ffffff 45% 55%, transparent 56%),
    linear-gradient(180deg, transparent 44%, #ffffff 45% 55%, transparent 56%);
  box-shadow: none;
}

.category-art-preview--science .category-art-preview__book,
.category-art-preview--math .category-art-preview__book,
.category-art-preview--language .category-art-preview__book,
.category-art-preview--exam .category-art-preview__book,
.category-art-preview--accounting .category-art-preview__book {
  left: 20px;
  bottom: 12px;
  width: 28px;
  height: 46px;
  border: 5px solid #ffffff;
  border-top: 0;
  border-radius: 0 0 16px 16px;
  background: color-mix(in srgb, var(--chip-b) 28%, transparent);
  box-shadow: none;
}

.category-art-preview--technology .category-art-preview__book,
.category-art-preview--computer .category-art-preview__book {
  left: 11px;
  bottom: 12px;
  width: 50px;
  height: 35px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, #ffffff 0 70%, var(--chip-a) 71% 100%);
  box-shadow: 0 8px 0 color-mix(in srgb, var(--chip-a) 24%, transparent);
}

.category-art-preview--business .category-art-preview__body,
.category-art-preview--finance .category-art-preview__body,
.category-art-preview--marketing .category-art-preview__body {
  border-radius: 8px;
  background:
    linear-gradient(90deg, var(--chip-a) 0 42%, #ffffff 43% 57%, var(--chip-a) 58%);
}

.category-art-preview--wellness .category-art-preview__book,
.category-art-preview--food .category-art-preview__book,
.category-art-preview--exercise .category-art-preview__book,
.category-art-preview--hobby .category-art-preview__book {
  left: 18px;
  bottom: 15px;
  width: 38px;
  height: 38px;
  border-radius: 999px 999px 999px 6px;
  background: #ffffff;
  box-shadow: inset -8px -8px 0 var(--chip-b);
  transform: rotate(-18deg);
}

.category-art-preview--kids .category-art-preview__head,
.category-art-preview--picturebook .category-art-preview__head {
  background: #ffd6a5;
}

.category-art-preview--kids .category-art-preview__spark--one,
.category-art-preview--picturebook .category-art-preview__spark--one {
  background: #ffffff;
  box-shadow:
    14px 13px 0 var(--chip-b),
    31px 3px 0 color-mix(in srgb, var(--chip-a) 42%, white);
}

.category-button-preview i {
  position: absolute;
  right: 18px;
  bottom: 10px;
  width: 62px;
  height: 62px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 48% 32%, #ffe3b0 0 15px, transparent 16px),
    radial-gradient(circle at 43% 25%, var(--chip-a) 0 20px, transparent 21px),
    linear-gradient(90deg, #ffffff 0 28px, var(--chip-a) 29px 52px, transparent 53px);
  box-shadow: inset 0 -8px 0 color-mix(in srgb, var(--chip-a) 18%, transparent);
}

.category-button-preview i::before,
.category-button-preview i::after {
  content: "";
  position: absolute;
  display: block;
}

.category-button-preview i::before {
  right: 5px;
  bottom: 5px;
  width: 32px;
  height: 34px;
  border-radius: 4px 10px 10px 4px;
  background: #ffffff;
  box-shadow: -16px 0 0 rgba(255, 255, 255, 0.82);
}

.category-button-preview i::after {
  top: 9px;
  left: 20px;
  width: 25px;
  height: 18px;
  border-radius: 999px 999px 8px 8px;
  background: var(--chip-a);
}

.preview-art--romance i::before,
.preview-art--beauty i::before {
  top: 15px;
  left: 16px;
  width: 28px;
  height: 26px;
  background:
    radial-gradient(circle at 30% 32%, #ffffff 0 9px, transparent 10px),
    radial-gradient(circle at 70% 32%, #ffffff 0 9px, transparent 10px),
    linear-gradient(135deg, #ffffff 0 50%, transparent 50%);
  box-shadow: none;
  transform: rotate(45deg);
}

.category-art-preview--romance,
.category-art-preview--beauty {
  --chip-a: #db2777;
  --chip-b: #f9a8d4;
}

.category-art-preview--mystery {
  --chip-a: #0f766e;
  --chip-b: #5eead4;
}

.category-art-preview--adventure,
.category-art-preview--travel {
  --chip-a: #0284c7;
  --chip-b: #7dd3fc;
}

.category-art-preview--technology,
.category-art-preview--computer {
  --chip-a: #2563eb;
  --chip-b: #93c5fd;
}

.category-art-preview--business,
.category-art-preview--finance,
.category-art-preview--marketing {
  --chip-a: #d97706;
  --chip-b: #fcd34d;
}

.category-art-preview--wellness,
.category-art-preview--food,
.category-art-preview--exercise {
  --chip-a: #16834a;
  --chip-b: #86efac;
}

.category-art-preview--chinese {
  --chip-a: #b91c1c;
  --chip-b: #fbbf24;
}

.category-art-preview--kids,
.category-art-preview--picturebook {
  --chip-a: #8b5cf6;
  --chip-b: #f9a8d4;
}

.preview-art--fantasy i::after,
.preview-art--wisdom i::after {
  top: 4px;
  left: 18px;
  width: 28px;
  height: 28px;
  border-radius: 4px 20px 20px 20px;
  background: var(--chip-a);
  transform: rotate(45deg);
}

.preview-art--mystery i::before {
  top: 16px;
  left: 14px;
  width: 24px;
  height: 24px;
  border: 6px solid #ffffff;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
}

.preview-art--mystery i::after {
  top: 39px;
  left: 38px;
  width: 22px;
  height: 7px;
  border-radius: 999px;
  background: #ffffff;
  transform: rotate(45deg);
}

.preview-art--adventure i::before,
.preview-art--travel i::before {
  right: 1px;
  bottom: 7px;
  width: 54px;
  height: 34px;
  border-radius: 4px;
  background:
    linear-gradient(135deg, transparent 0 34%, #ffffff 35% 62%, transparent 63%),
    linear-gradient(45deg, transparent 0 40%, rgba(255, 255, 255, 0.72) 41% 67%, transparent 68%);
  box-shadow: none;
}

.preview-art--teen i::before,
.preview-art--audio i::before {
  top: 22px;
  left: 9px;
  width: 44px;
  height: 28px;
  border: 6px solid #ffffff;
  border-bottom: 0;
  border-radius: 28px 28px 0 0;
  background: transparent;
  box-shadow: none;
}

.preview-art--drama i::before,
.preview-art--comic i::before,
.preview-art--manga i::before {
  right: 6px;
  bottom: 10px;
  width: 46px;
  height: 30px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: none;
}

.preview-art--drama i::after,
.preview-art--comic i::after,
.preview-art--manga i::after {
  right: 12px;
  bottom: 3px;
  left: auto;
  top: auto;
  width: 12px;
  height: 12px;
  border-radius: 0;
  background: #ffffff;
  transform: rotate(45deg);
}

.preview-art--chinese i::before {
  top: 15px;
  left: 11px;
  width: 42px;
  height: 32px;
  border-radius: 8px 8px 18px 18px;
  background: #ffffff;
  box-shadow: inset 0 -7px 0 var(--chip-b);
}

.preview-art--foreign i::before,
.preview-art--geography i::before {
  top: 11px;
  left: 12px;
  width: 38px;
  height: 38px;
  border: 5px solid #ffffff;
  border-radius: 999px;
  background:
    linear-gradient(90deg, transparent 44%, #ffffff 45% 55%, transparent 56%),
    linear-gradient(180deg, transparent 44%, #ffffff 45% 55%, transparent 56%);
  box-shadow: none;
}

.preview-art--computer i,
.preview-art--technology i {
  border-radius: 12px;
  background:
    linear-gradient(180deg, transparent 0 32px, #ffffff 33px 42px, transparent 43px),
    linear-gradient(90deg, #ffffff 0 30px, var(--chip-a) 31px 56px);
}

.preview-art--business i,
.preview-art--finance i {
  background:
    radial-gradient(circle at 48% 28%, #ffe3b0 0 14px, transparent 15px),
    linear-gradient(180deg, var(--chip-a) 0 28px, #ffffff 29px 48px, var(--chip-a) 49px);
}

.preview-art--wellness i {
  background:
    radial-gradient(ellipse at 45% 38%, #ffffff 0 12px, transparent 13px),
    radial-gradient(ellipse at 38% 34%, var(--chip-b) 0 20px, transparent 21px),
    linear-gradient(135deg, var(--chip-a), #ffffff);
}

.preview-art--science i::before,
.preview-art--math i::before,
.preview-art--language i::before,
.preview-art--exam i::before,
.preview-art--accounting i::before,
.preview-art--knowledge i::before,
.preview-art--documentary i::before {
  top: 10px;
  left: 19px;
  width: 24px;
  height: 38px;
  border: 5px solid #ffffff;
  border-top: 0;
  border-radius: 0 0 14px 14px;
  background: rgba(255, 255, 255, 0.26);
  box-shadow: none;
}

.preview-art--history i::before,
.preview-art--philosophy i::before {
  top: 14px;
  left: 12px;
  width: 42px;
  height: 34px;
  border-radius: 999px 8px 8px 999px;
  background: #ffffff;
  box-shadow: inset -9px 0 0 var(--chip-b);
}

.preview-art--food i::before {
  top: 11px;
  left: 10px;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: inset 0 -8px 0 var(--chip-b);
}

.preview-art--kids i::before,
.preview-art--picturebook i::before {
  top: 13px;
  left: 12px;
  width: 42px;
  height: 36px;
  border-radius: 8px;
  background:
    linear-gradient(90deg, #ffffff 0 46%, rgba(255, 255, 255, 0.72) 47% 53%, #ffffff 54%);
  box-shadow: none;
}

.preview--romance,
.preview--drama,
.preview--beauty {
  --chip-a: #db2777;
  --chip-b: #f9a8d4;
  --chip-c: #fff1f7;
}

.preview--technology,
.preview--knowledge,
.preview--science,
.preview--foreign,
.preview--teen {
  --chip-a: #2563eb;
  --chip-b: #93c5fd;
  --chip-c: #eff6ff;
}

.preview--study,
.preview--wellness,
.preview--adventure {
  --chip-a: #16834a;
  --chip-b: #86efac;
  --chip-c: #ecfdf3;
}

.preview--business,
.preview--finance,
.preview--exam,
.preview--manga {
  --chip-a: #d97706;
  --chip-b: #fcd34d;
  --chip-c: #fff7ed;
}

.preview--wisdom,
.preview--fantasy,
.preview--psychology {
  --chip-a: #7c3aed;
  --chip-b: #c4b5fd;
  --chip-c: #f5f3ff;
}

.preview--mystery {
  --chip-a: #0f766e;
  --chip-b: #5eead4;
  --chip-c: #ecfeff;
}

.preview--chinese {
  --chip-a: #b91c1c;
  --chip-b: #fbbf24;
  --chip-c: #fff7ed;
}

.preview--history {
  --chip-a: #92400e;
  --chip-b: #fbbf24;
  --chip-c: #fffbeb;
}

.preview--language {
  --chip-a: #0891b2;
  --chip-b: #67e8f9;
  --chip-c: #ecfeff;
}

.preview--marketing,
.preview--life {
  --chip-a: #ea580c;
  --chip-b: #fdba74;
  --chip-c: #fff7ed;
}

.preview--food {
  --chip-a: #f97316;
  --chip-b: #fed7aa;
  --chip-c: #fff7ed;
}

.preview--travel {
  --chip-a: #0284c7;
  --chip-b: #7dd3fc;
  --chip-c: #f0f9ff;
}

.preview--kids {
  --chip-a: #8b5cf6;
  --chip-b: #f9a8d4;
  --chip-c: #fef3c7;
}

.preview--audio {
  --chip-a: #1d4ed8;
  --chip-b: #60a5fa;
  --chip-c: #eff6ff;
}

button {
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 900;
  padding: 8px 12px;
}

.primary-btn {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--on-primary);
}

.ghost-btn {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.danger {
  border-color: #dc2626;
  background: #dc2626;
  color: #fff;
}

.category-chip {
  --chip-a: #0ea5a8;
  --chip-b: #f7c948;
  --chip-c: #dff8f4;
  --chip-d: #ffffff;
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-height: 112px;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--chip-a) 32%, white);
  border-radius: 22px;
  background:
    radial-gradient(circle at 7% 15%, rgba(255, 255, 255, 0.92) 0 2px, transparent 2.5px),
    radial-gradient(circle at 13% 72%, color-mix(in srgb, var(--chip-a) 18%, transparent) 0 4px, transparent 4.5px),
    radial-gradient(circle at 83% 18%, color-mix(in srgb, var(--chip-b) 82%, white) 0 4px, transparent 4.8px),
    radial-gradient(circle at 93% 72%, color-mix(in srgb, var(--chip-a) 24%, transparent) 0 28px, transparent 29px),
    linear-gradient(100deg, color-mix(in srgb, var(--chip-c) 82%, white) 0%, var(--chip-d) 46%, color-mix(in srgb, var(--chip-b) 34%, white) 100%);
  color: var(--text-strong);
  padding: 20px 128px 20px 24px;
  scroll-snap-align: start;
  text-decoration: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -10px 22px rgba(255, 255, 255, 0.5),
    0 16px 30px color-mix(in srgb, var(--chip-a) 18%, transparent);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.category-chip::before {
  content: "";
  position: absolute;
  inset: 8px 8px 8px auto;
  z-index: -1;
  width: 44%;
  height: auto;
  border-radius: 999px 18px 18px 999px;
  background:
    radial-gradient(circle at 22% 28%, rgba(255, 255, 255, 0.82) 0 10px, transparent 11px),
    radial-gradient(circle at 74% 76%, color-mix(in srgb, var(--chip-a) 22%, transparent) 0 18px, transparent 19px),
    linear-gradient(145deg, color-mix(in srgb, var(--chip-a) 18%, white), color-mix(in srgb, var(--chip-b) 36%, white));
  opacity: 0.9;
}

.category-chip::after {
  content: "";
  position: absolute;
  inset: auto 16px 12px 16px;
  z-index: -1;
  height: 24px;
  border-radius: 999px;
  background:
    radial-gradient(ellipse at 14% 50%, color-mix(in srgb, var(--chip-a) 30%, transparent) 0 12px, transparent 13px),
    radial-gradient(ellipse at 42% 72%, color-mix(in srgb, var(--chip-b) 44%, transparent) 0 15px, transparent 16px),
    radial-gradient(ellipse at 72% 42%, color-mix(in srgb, var(--chip-a) 20%, transparent) 0 18px, transparent 19px);
  filter: blur(0.1px);
}

.category-chip:hover,
.category-chip:focus-visible {
  border-color: color-mix(in srgb, var(--chip-a) 58%, var(--border));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    0 20px 42px color-mix(in srgb, var(--chip-a) 24%, transparent);
  transform: translateY(-4px);
}

.category-chip strong {
  display: block;
  position: relative;
  z-index: 2;
  overflow: hidden;
  color: color-mix(in srgb, var(--chip-a) 76%, #101828);
  font-size: clamp(16px, 1.16vw, 21px);
  font-weight: 900;
  line-height: 1.1;
  max-width: 100%;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}

.category-art {
  position: absolute;
  right: 4px;
  bottom: -2px;
  width: 120px;
  height: 118px;
  transform: scale(0.88);
  transform-origin: right bottom;
}

.category-art-image {
  position: absolute;
  right: 20px;
  bottom: 14px;
  z-index: 1;
  width: 78px;
  height: 78px;
  background: transparent;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
  filter: drop-shadow(0 14px 18px rgba(15, 23, 42, 0.16));
}

.create-preview__button .category-art-image,
.home-layout-chip .category-art-image {
  right: 20px;
  bottom: 14px;
}

.category-art::before {
  content: "";
  position: absolute;
  right: 4px;
  bottom: 5px;
  width: 86px;
  height: 86px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 34% 22%, rgba(255, 255, 255, 0.7) 0 12px, transparent 13px),
    linear-gradient(145deg, color-mix(in srgb, var(--chip-b) 42%, white), color-mix(in srgb, var(--chip-a) 18%, white));
  opacity: 0.74;
}

.category-art__head,
.category-art__body,
.category-art__book,
.category-art__spark {
  position: absolute;
  display: block;
}

.category-art__head {
  top: 15px;
  left: 56px;
  width: 46px;
  height: 46px;
  border: 2px solid rgba(15, 23, 42, 0.1);
  border-radius: 48% 52% 46% 54%;
  background:
    radial-gradient(circle at 34% 45%, #163b37 0 2.4px, transparent 2.9px),
    radial-gradient(circle at 66% 45%, #163b37 0 2.4px, transparent 2.9px),
    radial-gradient(circle at 51% 69%, rgba(22, 59, 55, 0.72) 0 2.4px, transparent 3px),
    #ffe3c4;
  box-shadow:
    inset 8px -5px 0 rgba(255, 183, 117, 0.28),
    0 -12px 0 -3px color-mix(in srgb, var(--chip-a) 58%, #6b3f22),
    0 6px 10px rgba(15, 23, 42, 0.12);
}

.category-art__head::before,
.category-art__head::after {
  content: "";
  position: absolute;
  display: block;
}

.category-art__head::before {
  left: -6px;
  top: -8px;
  width: 54px;
  height: 24px;
  border-radius: 999px 999px 12px 12px;
  background: color-mix(in srgb, var(--chip-a) 68%, #5b341f);
  transform: rotate(-5deg);
}

.category-art__head::after {
  left: 11px;
  bottom: 9px;
  width: 18px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 138, 138, 0.34);
}

.category-art__body {
  top: 63px;
  left: 43px;
  width: 66px;
  height: 52px;
  border-radius: 22px 22px 12px 12px;
  background: linear-gradient(135deg, var(--chip-a), color-mix(in srgb, var(--chip-a) 64%, #0f172a));
  box-shadow:
    inset 0 13px 0 rgba(255, 255, 255, 0.18),
    0 8px 12px rgba(15, 23, 42, 0.14);
}

.category-art__book {
  right: 48px;
  bottom: 5px;
  width: 58px;
  height: 43px;
  border: 2px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px 8px 6px 6px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.52) 0 48%, rgba(15, 23, 42, 0.08) 48% 52%, rgba(255, 255, 255, 0.3) 52%),
    linear-gradient(135deg, #ffffff, color-mix(in srgb, var(--chip-b) 48%, white));
  transform: rotate(-5deg);
  box-shadow: 0 8px 12px rgba(15, 23, 42, 0.12);
}

.category-art__spark {
  width: 14px;
  height: 14px;
  background: var(--chip-b);
  clip-path: polygon(50% 0, 63% 36%, 100% 50%, 63% 64%, 50% 100%, 37% 64%, 0 50%, 37% 36%);
}

.category-art__spark--one {
  top: 8px;
  right: 6px;
}

.category-art__spark--two {
  top: 42px;
  left: 18px;
  width: 11px;
  height: 11px;
  opacity: 0.78;
}

.category-art--fantasy .category-art__head {
  border-radius: 50% 50% 44% 44%;
  box-shadow:
    inset 7px -4px 0 rgba(255, 183, 117, 0.28),
    0 -18px 0 -7px color-mix(in srgb, var(--chip-a) 80%, #1e1b4b);
}

.category-art--fantasy .category-art__spark--one,
.category-art--mystery .category-art__spark--one {
  width: 16px;
  height: 16px;
}

.category-art--mystery .category-art__head {
  box-shadow:
    inset 7px -4px 0 rgba(255, 183, 117, 0.28),
    0 -11px 0 -3px color-mix(in srgb, var(--chip-a) 72%, #111827);
}

.category-art--adventure .category-art__body {
  border-radius: 12px 18px 18px 10px;
  transform: rotate(-4deg);
}

.category-art--classic .category-art__book,
.category-art--study .category-art__book,
.category-art--knowledge .category-art__book {
  width: 54px;
  height: 40px;
  transform: rotate(0);
}

.category-art--business .category-art__body {
  background:
    linear-gradient(90deg, transparent 0 45%, rgba(255, 255, 255, 0.72) 45% 55%, transparent 55%),
    linear-gradient(135deg, var(--chip-a), color-mix(in srgb, var(--chip-a) 64%, #0f172a));
}

.category-art--wellness .category-art__spark {
  border-radius: 999px 999px 999px 0;
  clip-path: none;
  transform: rotate(-35deg);
}

.category-art--audio .category-art__book,
.category-art--teen .category-art__book {
  border-radius: 999px;
  width: 42px;
  height: 42px;
  background:
    radial-gradient(circle at 50% 50%, #fff 0 34%, transparent 35%),
    linear-gradient(135deg, var(--chip-b), #ffffff);
}

.category-art--romance .category-art__spark,
.category-art--beauty .category-art__spark {
  border-radius: 50% 50% 50% 0;
  clip-path: none;
  transform: rotate(-45deg);
}

.category-art--foreign .category-art__book,
.category-art--geography .category-art__book {
  border-radius: 999px;
  background:
    radial-gradient(circle at 36% 36%, color-mix(in srgb, var(--chip-a) 46%, white) 0 10px, transparent 11px),
    radial-gradient(circle at 64% 62%, color-mix(in srgb, var(--chip-b) 54%, white) 0 12px, transparent 13px),
    linear-gradient(135deg, #ffffff, #dff7ff);
}

.category-art--documentary .category-art__book,
.category-art--technology .category-art__book,
.category-art--computer .category-art__book {
  border-radius: 8px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--chip-a) 74%, #0f172a) 0 62%, #e5f7ff 62%),
    linear-gradient(135deg, #ffffff, var(--chip-b));
}

.category-art--kids .category-art__body {
  border-radius: 20px 16px 14px 18px;
  background: linear-gradient(135deg, var(--chip-b), var(--chip-a));
}

.category-chip--tech {
  --chip-a: #0891b2;
  --chip-b: #67e8f9;
  --chip-c: #e0f7ff;
}

.category-chip--story {
  --chip-a: #7c3aed;
  --chip-b: #d8b4fe;
  --chip-c: #f6efff;
  --chip-d: #fff8ff;
}

.category-chip--romance,
.category-chip--drama,
.category-chip--beauty {
  --chip-a: #ec407a;
  --chip-b: #f9a8d4;
  --chip-c: #fff0f7;
  --chip-d: #fff8fc;
}

.category-chip--fantasy,
.category-chip--wisdom,
.category-chip--psychology {
  --chip-a: #6d28d9;
  --chip-b: #c084fc;
  --chip-c: #f3e8ff;
  --chip-d: #fbf7ff;
}

.category-chip--mystery,
.category-chip--language {
  --chip-a: #0f766e;
  --chip-b: #5eead4;
  --chip-c: #e6fffb;
  --chip-d: #f7fffe;
}

.category-chip--adventure,
.category-chip--wellness,
.category-chip--study {
  --chip-a: #249c43;
  --chip-b: #b8e986;
  --chip-c: #effbdc;
  --chip-d: #fbfff6;
}

.category-chip--teen,
.category-chip--knowledge,
.category-chip--technology,
.category-chip--science,
.category-chip--foreign {
  --chip-a: #2563eb;
  --chip-b: #bfdbfe;
  --chip-c: #eaf4ff;
  --chip-d: #f8fcff;
}

.category-chip--chinese {
  --chip-a: #dc2626;
  --chip-b: #fbbf24;
  --chip-c: #fff0e5;
  --chip-d: #fffaf2;
}

.category-chip--manga,
.category-chip--food,
.category-chip--life,
.category-chip--marketing {
  --chip-a: #f97316;
  --chip-b: #fdba74;
  --chip-c: #fff1df;
  --chip-d: #fffaf4;
}

.category-chip--history,
.category-chip--business,
.category-chip--finance,
.category-chip--exam {
  --chip-a: #d97706;
  --chip-b: #facc15;
  --chip-c: #fff4cf;
  --chip-d: #fffaf0;
}

.category-chip--kids {
  --chip-a: #e47d13;
  --chip-b: #ffd166;
  --chip-c: #fff1c8;
  --chip-d: #fffaf0;
}

.category-chip--travel {
  --chip-a: #0284c7;
  --chip-b: #7dd3fc;
  --chip-c: #e6faff;
  --chip-d: #f7feff;
}

.category-chip--audio {
  --chip-a: #4338ca;
  --chip-b: #a5b4fc;
  --chip-c: #edf0ff;
  --chip-d: #f9faff;
}

.actions,
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.list-panel {
  overflow: hidden;
}

.list-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid var(--border);
  text-align: left;
  padding: 12px;
}

th {
  color: var(--text-muted);
  font-size: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  padding: 4px 9px;
}

.status-toggle {
  min-height: 28px;
  border: 0;
  transition:
    box-shadow 0.18s ease,
    opacity 0.18s ease,
    transform 0.18s ease;
}

.status-toggle:hover:not(:disabled) {
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
  transform: translateY(-1px);
}

.status-toggle:disabled {
  cursor: wait;
  opacity: 0.62;
}

.status-pill.on {
  background: #dcfce7;
  color: #166534;
}

.status-pill.off {
  background: #fee2e2;
  color: #991b1b;
}

.position-pill {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 10%, var(--surface-soft));
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 900;
  padding: 4px 10px;
}

.success,
.error {
  border-radius: 8px;
  font-weight: 900;
  padding: 10px 12px;
}

.success {
  background: #dcfce7;
  color: #166534;
}

.error {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 900px) {
  .category-workspace,
  .admin-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .home-layout-panel {
    position: static;
    max-height: none;
  }

  .position-fields {
    grid-template-columns: 1fr;
  }

  .preset-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .create-preview__head {
    flex-direction: column;
  }

  .create-preview__head small {
    text-align: left;
  }

  .panel-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .layout-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .home-layout-stage {
    grid-template-columns: 1fr;
  }

  .home-layout-ruler {
    display: none;
  }

  .home-layout-grid {
    grid-auto-columns: minmax(240px, 82vw);
  }

  .category-button-preview {
    margin: 0;
  }
}
</style>
