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
};

const toneOptions = [
  { value: "", label: "เลือกอัตโนมัติ" },
  { value: "story", label: "นิยาย / ม่วงละมุน" },
  { value: "romance", label: "นิยายรัก / ชมพูหวาน" },
  { value: "fantasy", label: "แฟนตาซี / ม่วงเวทมนตร์" },
  { value: "mystery", label: "สืบสวน / ฟ้าอมเขียว" },
  { value: "adventure", label: "ผจญภัย / เขียวธรรมชาติ" },
  { value: "teen", label: "วัยรุ่น / ฟ้าสดใส" },
  { value: "drama", label: "ดราม่า / ชมพูละคร" },
  { value: "chinese", label: "จีนโบราณ / แดงทอง" },
  { value: "foreign", label: "ต่างประเทศ / ฟ้าเมือง" },
  { value: "manga", label: "การ์ตูน / ส้มสด" },
  { value: "knowledge", label: "ความรู้ / ฟ้าใส" },
  { value: "science", label: "วิทยาศาสตร์ / ฟ้านีออน" },
  { value: "technology", label: "เทคโนโลยี / ไซเบอร์" },
  { value: "history", label: "ประวัติศาสตร์ / น้ำตาลคลาสสิก" },
  { value: "study", label: "การศึกษา / เขียวกระดาน" },
  { value: "language", label: "ภาษา / ฟ้าเขียว" },
  { value: "exam", label: "ติวสอบ / เหลืองสดใส" },
  { value: "life", label: "พัฒนาตนเอง / ส้มกำลังใจ" },
  { value: "psychology", label: "จิตวิทยา / ม่วงนุ่ม" },
  { value: "business", label: "ธุรกิจ / ทอง" },
  { value: "finance", label: "การเงิน / เหลืองทอง" },
  { value: "marketing", label: "การตลาด / แดงส้ม" },
  { value: "wellness", label: "สุขภาพ / เขียวอ่อน" },
  { value: "food", label: "อาหาร / ส้มครีม" },
  { value: "travel", label: "ท่องเที่ยว / ฟ้าทะเล" },
  { value: "beauty", label: "ความงาม / ชมพูพีช" },
  { value: "wisdom", label: "ศาสนา / ม่วงสงบ" },
  { value: "kids", label: "เด็ก / สีรุ้งอุ่น" },
  { value: "audio", label: "หนังสือเสียง / น้ำเงิน" },
];

const artOptions = [
  { value: "", label: "เลือกอัตโนมัติ" },
  { value: "story", label: "นักอ่านถือหนังสือ" },
  { value: "romance", label: "นิยายรัก / หัวใจ" },
  { value: "fantasy", label: "พ่อมด / เวทมนตร์" },
  { value: "mystery", label: "นักสืบ / แว่นขยาย" },
  { value: "adventure", label: "นักผจญภัย / ภูเขา" },
  { value: "teen", label: "วัยรุ่น / หูฟัง" },
  { value: "drama", label: "ดราม่า / หน้ากากละคร" },
  { value: "chinese", label: "จีนโบราณ / โคมแดง" },
  { value: "foreign", label: "ต่างประเทศ / ลูกโลก" },
  { value: "manga", label: "มังงะ / ช่องคำพูด" },
  { value: "comic", label: "คอมิก / เอฟเฟกต์ป๊อป" },
  { value: "knowledge", label: "ความรู้ / หลอดไฟ" },
  { value: "documentary", label: "สารคดี / กล้อง" },
  { value: "history", label: "ประวัติศาสตร์ / ม้วนเอกสาร" },
  { value: "geography", label: "ภูมิศาสตร์ / แผนที่" },
  { value: "science", label: "วิทยาศาสตร์ / อะตอม" },
  { value: "technology", label: "เทคโนโลยี / โน้ตบุ๊ก" },
  { value: "math", label: "คณิตศาสตร์ / สูตร" },
  { value: "language", label: "ภาษา / ตัวอักษร" },
  { value: "computer", label: "คอมพิวเตอร์ / โค้ด" },
  { value: "exam", label: "คู่มือสอบ / เช็กลิสต์" },
  { value: "life", label: "พัฒนาตนเอง / กราฟขึ้น" },
  { value: "psychology", label: "จิตวิทยา / สมอง" },
  { value: "inspiration", label: "แรงบันดาลใจ / ถ้วยรางวัล" },
  { value: "time", label: "บริหารเวลา / นาฬิกา" },
  { value: "business", label: "ธุรกิจ / สูท" },
  { value: "finance", label: "การเงิน / เหรียญ" },
  { value: "marketing", label: "การตลาด / โทรโข่ง" },
  { value: "accounting", label: "บัญชี / เครื่องคิดเลข" },
  { value: "wellness", label: "สุขภาพ / ใบไม้" },
  { value: "food", label: "อาหาร / เชฟ" },
  { value: "exercise", label: "ออกกำลังกาย / พลังงาน" },
  { value: "beauty", label: "ความงาม / กระจก" },
  { value: "travel", label: "ท่องเที่ยว / กระเป๋า" },
  { value: "hobby", label: "งานอดิเรก / ศิลปะ" },
  { value: "wisdom", label: "ธรรมะ / ดอกบัว" },
  { value: "philosophy", label: "ปรัชญา / เทียน" },
  { value: "kids", label: "เด็ก / ของเล่น" },
  { value: "picturebook", label: "หนังสือภาพ / สายรุ้ง" },
  { value: "audio", label: "หนังสือเสียง / คลื่นเสียง" },
];
const emptyForm = (): CategoryForm => ({
  name: "",
  parent_id: "",
  display_tone: "",
  display_art: "",
  show_on_home: true,
  sort_order: 0,
});

const categories = ref<Category[]>([]);
const newForm = ref<CategoryForm>(emptyForm());
const editForm = ref<CategoryForm>(emptyForm());
const editingId = ref<number | null>(null);
const message = ref("");
const errorMessage = ref("");
const loading = ref(false);

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

function toPayload(form: CategoryForm) {
  return {
    name: form.name.trim(),
    parent_id: form.parent_id ? Number(form.parent_id) : null,
    display_tone: form.display_tone || null,
    display_art: form.display_art || null,
    show_on_home: form.show_on_home,
    sort_order: Number(form.sort_order) || 0,
  };
}

function formFromCategory(item: Category): CategoryForm {
  return {
    name: item.name,
    parent_id: item.parent_id ? String(item.parent_id) : "",
    display_tone: item.display_tone || "",
    display_art: item.display_art || "",
    show_on_home: item.show_on_home !== false && item.show_on_home !== 0,
    sort_order: Number(item.sort_order || 0),
  };
}

async function loadCategories() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get<Category[]>("/categories");
    categories.value = Array.isArray(data) ? data : [];
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

function getPreviewTone(form: CategoryForm) {
  return form.display_tone || "story";
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

    <section class="admin-grid">
      <form class="panel" @submit.prevent="createCategory">
        <h2>เพิ่มปุ่มหมวดใหม่</h2>
        <label>
          ชื่อปุ่ม
          <input v-model="newForm.name" type="text" placeholder="เช่น นิยายรัก" required />
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

          <label>
            ลำดับบน Home
            <input v-model.number="newForm.sort_order" type="number" min="0" step="1" />
          </label>
        </div>

        <div class="form-grid">
          <label>
            ธีมสีปุ่ม
            <select v-model="newForm.display_tone">
              <option v-for="option in toneOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            ภาพการ์ตูน
            <select v-model="newForm.display_art">
              <option v-for="option in artOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <label class="check-row">
          <input v-model="newForm.show_on_home" type="checkbox" />
          แสดงเป็นปุ่มบนหน้า Home
        </label>

        <div class="button-preview">
          <span>ตัวอย่างปุ่มหน้า Home</span>
          <div class="category-button-preview" :class="`preview--${getPreviewTone(newForm)}`">
            <strong>{{ newForm.name || "ชื่อปุ่มหมวด" }}</strong>
            <i aria-hidden="true"></i>
          </div>
        </div>

        <button class="primary-btn" type="submit">เพิ่มหมวดหมู่</button>
      </form>

      <form v-if="editingCategory" class="panel edit-panel" @submit.prevent="updateCategory">
        <h2>แก้ไขปุ่ม: {{ editingCategory.name }}</h2>
        <label>
          ชื่อปุ่ม
          <input v-model="editForm.name" type="text" required />
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

          <label>
            ลำดับบน Home
            <input v-model.number="editForm.sort_order" type="number" min="0" step="1" />
          </label>
        </div>

        <div class="form-grid">
          <label>
            ธีมสีปุ่ม
            <select v-model="editForm.display_tone">
              <option v-for="option in toneOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            ภาพการ์ตูน
            <select v-model="editForm.display_art">
              <option v-for="option in artOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <label class="check-row">
          <input v-model="editForm.show_on_home" type="checkbox" />
          แสดงเป็นปุ่มบนหน้า Home
        </label>

        <div class="button-preview">
          <span>ตัวอย่างปุ่มหน้า Home</span>
          <div class="category-button-preview" :class="`preview--${getPreviewTone(editForm)}`">
            <strong>{{ editForm.name || "ชื่อปุ่มหมวด" }}</strong>
            <i aria-hidden="true"></i>
          </div>
        </div>

        <div class="actions">
          <button class="primary-btn" type="submit">บันทึก</button>
          <button class="ghost-btn" type="button" @click="cancelEdit">ยกเลิก</button>
        </div>
      </form>
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
              <th>ภาพ</th>
              <th>ลำดับ</th>
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
                <span :class="['status-pill', item.show_on_home === false || item.show_on_home === 0 ? 'off' : 'on']">
                  {{ item.show_on_home === false || item.show_on_home === 0 ? "ซ่อน" : "แสดง" }}
                </span>
              </td>
              <td>{{ item.display_tone || "อัตโนมัติ" }}</td>
              <td>{{ item.display_art || "อัตโนมัติ" }}</td>
              <td>{{ item.sort_order || 0 }}</td>
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

.admin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
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

.edit-panel {
  border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

label {
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

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.check-row input {
  width: 18px;
  min-height: 18px;
}

.button-preview {
  display: grid;
  gap: 8px;
}

.button-preview > span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 900;
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
  max-width: 360px;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--chip-a) 32%, white);
  border-radius: 18px;
  background:
    radial-gradient(circle at 8% 16%, rgba(255, 255, 255, 0.9) 0 2px, transparent 2.5px),
    radial-gradient(circle at 86% 22%, color-mix(in srgb, var(--chip-b) 80%, white) 0 4px, transparent 4.8px),
    linear-gradient(100deg, color-mix(in srgb, var(--chip-c) 82%, white) 0%, #ffffff 50%, color-mix(in srgb, var(--chip-b) 30%, white) 100%);
  color: color-mix(in srgb, var(--chip-a) 78%, #101828);
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
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  padding: 4px 9px;
}

.status-pill.on {
  background: #dcfce7;
  color: #166534;
}

.status-pill.off {
  background: #fee2e2;
  color: #991b1b;
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
  .admin-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
