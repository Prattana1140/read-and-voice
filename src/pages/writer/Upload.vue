<script setup lang="ts">
import { computed, ref } from "vue";
import axios from "axios";
import { api, API_BASE_URL } from "../../utils/api";
import { getAuthHeaders } from "../../utils/auth";

type UploadMode = "ebook" | "serial" | "studio";
type AccessType = "free" | "paid" | "subscription";
type StudioUnitType = "chapter" | "episode";

type StudioUnit = {
  id: number;
  unit_number: number;
  unit_type: StudioUnitType;
  title: string;
  sentence_count?: number;
};

type StudioSentence = {
  id: number;
  sentence_uuid: string;
  display_text: string;
  tts_text: string;
};

type StudioBlock = {
  id: number;
  block_order: number;
  block_type: string;
  display_text: string;
  speaker_name?: string | null;
  sentences: StudioSentence[];
};

const mode = ref<UploadMode>("studio");
const activeStudioStep = ref(0);

const title = ref("");
const author = ref("");
const description = ref("");
const coverImage = ref("");
const price = ref(0);
const accessType = ref<AccessType>("paid");
const requestedPlacements = ref({
  requested_best_seller: false,
  requested_new_release: true,
  requested_promotion: false,
  requested_free_book: false,
  requested_hall_of_fame: false,
  requested_recommended: false,
});
const previewPageLimit = ref(1);
const previewCharLimit = ref(1500);
const bookFile = ref<File | null>(null);
const coverFile = ref<File | null>(null);

const serialBookId = ref<number | null>(null);
const episodeNumber = ref(1);
const episodeTitle = ref("");
const episodeContent = ref("");
const episodePrice = ref(0);
const episodeIsFree = ref(true);
const episodePreviewLimit = ref(1500);

const studioBookId = ref<number | null>(null);
const studioBookSlug = ref("");
const studioBookType = ref<"ebook" | "serial">("ebook");
const studioPreviewMode = ref<"percentage" | "chapter_count" | "sentence_count">(
  "percentage",
);
const studioPreviewValue = ref(10);
const studioTags = ref("");
const studioLanguage = ref("th");
const studioAgeRating = ref("");
const studioUnits = ref<StudioUnit[]>([]);
const selectedUnitId = ref<number | null>(null);
const selectedUnitType = ref<StudioUnitType>("chapter");
const unitTitle = ref("");
const unitSummary = ref("");
const unitRawText = ref("");
const contentPreview = ref<StudioBlock[]>([]);

const loading = ref(false);
const message = ref("");
const error = ref("");

const selectedUnit = computed(() => {
  return studioUnits.value.find((unit) => unit.id === selectedUnitId.value) || null;
});

const studioSteps = computed(() => [
  {
    title: "ข้อมูลหนังสือ",
    caption: "ชื่อเรื่อง ราคา สิทธิ์ และตัวอย่าง",
    done: Boolean(studioBookId.value),
  },
  {
    title: "โครงสร้าง",
    caption: "เพิ่มบทหรือตอน",
    done: studioUnits.value.length > 0,
  },
  {
    title: "ใส่เนื้อหา",
    caption: "วางข้อความและแปลงเป็นประโยค",
    done: totalPreviewSentences.value > 0,
  },
  {
    title: "Preview",
    caption: "ตรวจบล็อกและประโยค",
    done: totalPreviewSentences.value > 0,
  },
  {
    title: "ส่งอนุมัติ",
    caption: "เผยแพร่เพื่อให้แอดมินตรวจ",
    done: false,
  },
]);

const totalPreviewSentences = computed(() => {
  return contentPreview.value.reduce((sum, block) => sum + block.sentences.length, 0);
});

const canOpenStudioStep = (index: number) => {
  if (index <= 0) return true;
  if (index === 1) return Boolean(studioBookId.value);
  if (index === 2) return Boolean(studioBookId.value && selectedUnitId.value);
  if (index === 3) return totalPreviewSentences.value > 0;
  return Boolean(studioBookId.value && studioUnits.value.length > 0);
};

const goToStudioStep = (index: number) => {
  if (!canOpenStudioStep(index)) return;
  activeStudioStep.value = index;
};

const advanceStudioStep = (index: number) => {
  activeStudioStep.value = Math.max(activeStudioStep.value, index);
};

const formatUnitType = (type: string) => {
  if (type === "episode") return "ตอน";
  if (type === "chapter") return "บท";
  return type;
};

const formatBlockType = (type: string) => {
  if (type === "paragraph") return "ย่อหน้า";
  if (type === "sentence") return "ประโยค";
  if (type === "dialogue") return "บทสนทนา";
  return type;
};

const resetStatus = () => {
  message.value = "";
  error.value = "";
};

const setError = (err: unknown, fallback: string) => {
  const maybeAxios = err as {
    response?: { data?: { message?: string; error?: string } };
  };
  error.value =
    maybeAxios.response?.data?.message ||
    maybeAxios.response?.data?.error ||
    fallback;
};

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  bookFile.value = target.files?.[0] || null;
};

const onCoverFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  coverFile.value = target.files?.[0] || null;
};

const uploadEbook = async () => {
  resetStatus();

  if (!title.value || !author.value || !bookFile.value) {
    error.value = "กรุณากรอกชื่อหนังสือ ผู้เขียน และเลือกไฟล์หนังสือ";
    return;
  }

  loading.value = true;

  try {
    const formData = new FormData();
    formData.append("title", title.value);
    formData.append("author", author.value);
    formData.append("description", description.value);
    if (coverImage.value.trim()) {
      formData.append("cover_image", coverImage.value.trim());
    }
    formData.append("price", String(price.value || 0));
    formData.append("access_type", accessType.value);
    formData.append("preview_page_limit", String(previewPageLimit.value || 1));
    formData.append(
      "preview_char_limit",
      String(previewCharLimit.value || 1500),
    );
    Object.entries(requestedPlacements.value).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    formData.append("book_file", bookFile.value);
    if (coverFile.value) {
      formData.append("cover_file", coverFile.value);
    }

    const res = await axios.post(`${API_BASE_URL}/api/books/upload`, formData, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "multipart/form-data",
      },
      timeout: 30 * 60 * 1000,
    });

    message.value = `อัปโหลดเล่มเต็มสำเร็จ: หนังสือ #${res.data.book_id}`;
    bookFile.value = null;
    coverFile.value = null;
  } catch (err) {
    setError(err, "อัปโหลดเล่มเต็มไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const createSerialBook = async () => {
  resetStatus();

  if (!title.value || !author.value) {
    error.value = "กรุณากรอกชื่อเรื่องและผู้เขียนก่อนสร้างเรื่องรายตอน";
    return;
  }

  loading.value = true;

  try {
    const res = await api.post("/books/serial", {
      title: title.value,
      author: author.value,
      description: description.value,
      cover_image: coverImage.value,
      price: price.value || 0,
      access_type: accessType.value,
      ...requestedPlacements.value,
    });

    serialBookId.value = Number(res.data.book_id);
    message.value = `สร้างเรื่องรายตอนสำเร็จ: หนังสือ #${serialBookId.value}`;
  } catch (err) {
    setError(err, "สร้างเรื่องรายตอนไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const addEpisode = async () => {
  resetStatus();

  if (!serialBookId.value) {
    error.value = "กรุณาสร้างเรื่องรายตอนก่อนเพิ่มตอน";
    return;
  }

  if (!episodeTitle.value || !episodeContent.value) {
    error.value = "กรุณากรอกชื่อตอนและเนื้อหาตอน";
    return;
  }

  loading.value = true;

  try {
    const res = await api.post(`/books/${serialBookId.value}/episodes`, {
      episode_number: episodeNumber.value,
      title: episodeTitle.value,
      content: episodeContent.value,
      price: episodeIsFree.value ? 0 : episodePrice.value || 0,
      is_free: episodeIsFree.value,
      preview_char_limit: episodePreviewLimit.value || 1500,
    });

    message.value = `เพิ่มตอนสำเร็จ: ตอน #${res.data.episode_id}`;
    episodeNumber.value += 1;
    episodeTitle.value = "";
    episodeContent.value = "";
    episodePrice.value = 0;
    episodeIsFree.value = true;
  } catch (err) {
    setError(err, "เพิ่มตอนไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const createStudioBook = async () => {
  resetStatus();

  if (!title.value || !author.value) {
    error.value = "กรุณากรอกชื่อหนังสือและผู้เขียนก่อนสร้างร่าง";
    return;
  }

  loading.value = true;

  try {
    const res = await api.post("/writer/books", {
      title: title.value,
      subtitle: null,
      author_name: author.value,
      description: description.value,
      cover_image_url: coverImage.value || null,
      language_code: studioLanguage.value,
      content_type: studioBookType.value,
      access_type: accessType.value,
      price: price.value || 0,
      coin_price: price.value || 0,
      preview_mode: studioPreviewMode.value,
      preview_value: studioPreviewValue.value || 10,
      age_rating: studioAgeRating.value || null,
      tags: studioTags.value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      ...requestedPlacements.value,
    });

    studioBookId.value = Number(res.data.id);
    studioBookSlug.value = String(res.data.slug || "");
    studioUnits.value = [];
    selectedUnitId.value = null;
    contentPreview.value = [];
    advanceStudioStep(1);
    message.value = `สร้างร่างพร้อมโครงสร้างอ่านออกเสียงสำเร็จ: หนังสือ #${studioBookId.value}`;
  } catch (err) {
    setError(err, "สร้างร่างแบบเตรียมอ่านออกเสียงไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const addStudioUnit = async () => {
  resetStatus();

  if (!studioBookId.value) {
    error.value = "กรุณาสร้างร่างหนังสือก่อนเพิ่มบทหรือตอน";
    return;
  }

  if (!unitTitle.value.trim()) {
    error.value = "กรุณากรอกชื่อบทหรือตอน";
    return;
  }

  loading.value = true;

  try {
    const nextNumber = studioUnits.value.length + 1;
    const res = await api.post(`/writer/books/${studioBookId.value}/units`, {
      unit_type: selectedUnitType.value,
      unit_number: nextNumber,
      title: unitTitle.value,
      summary: unitSummary.value,
      is_preview: nextNumber === 1,
    });

    studioUnits.value.push({
      id: Number(res.data.id),
      unit_number: Number(res.data.unit_number),
      unit_type: res.data.unit_type as StudioUnitType,
      title: unitTitle.value,
      sentence_count: 0,
    });
    selectedUnitId.value = Number(res.data.id);
    unitTitle.value = "";
    unitSummary.value = "";
    unitRawText.value = "";
    contentPreview.value = [];
    advanceStudioStep(2);
    message.value = "เพิ่มบทหรือตอนสำเร็จ";
  } catch (err) {
    setError(err, "เพิ่มบทหรือตอนไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const loadUnitContent = async (unitId: number) => {
  if (!studioBookId.value) return;

  loading.value = true;
  resetStatus();

  try {
    const res = await api.get(
      `/writer/books/${studioBookId.value}/units/${unitId}/content`,
    );

    selectedUnitId.value = unitId;
    contentPreview.value = Array.isArray(res.data.blocks) ? res.data.blocks : [];
    unitRawText.value = contentPreview.value
      .map((block) => block.display_text)
      .join("\n\n");
  } catch (err) {
    setError(err, "โหลดเนื้อหาของบทนี้ไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const importUnitText = async () => {
  resetStatus();

  if (!studioBookId.value || !selectedUnitId.value) {
    error.value = "กรุณาเลือกบทหรือตอนก่อน";
    return;
  }

  if (!unitRawText.value.trim()) {
    error.value = "กรุณาใส่ข้อความก่อนนำเข้า";
    return;
  }

  loading.value = true;

  try {
    const res = await api.post(
      `/writer/books/${studioBookId.value}/units/${selectedUnitId.value}/import-text`,
      {
        raw_text: unitRawText.value,
        preferred_type: "paragraph",
      },
    );

    const targetUnit = studioUnits.value.find(
      (unit) => unit.id === selectedUnitId.value,
    );
    if (targetUnit) {
      targetUnit.sentence_count = Number(res.data.sentences_created || 0);
    }
    await loadUnitContent(selectedUnitId.value);
    advanceStudioStep(3);
    message.value = `แปลงเนื้อหาเป็นย่อหน้าและประโยคสำเร็จ ${res.data.sentences_created} ประโยค`;
  } catch (err) {
    setError(err, "แปลงเนื้อหาไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const saveUnitAsSingleBlock = async () => {
  resetStatus();

  if (!studioBookId.value || !selectedUnitId.value) {
    error.value = "กรุณาเลือกบทหรือตอนก่อน";
    return;
  }

  if (!unitRawText.value.trim()) {
    error.value = "กรุณาใส่ข้อความก่อนบันทึก";
    return;
  }

  loading.value = true;

  try {
    const res = await api.post(
      `/writer/books/${studioBookId.value}/units/${selectedUnitId.value}/content`,
      {
        content_blocks: [
          {
            block_type: "paragraph",
            display_text: unitRawText.value,
          },
        ],
      },
    );

    const targetUnit = studioUnits.value.find(
      (unit) => unit.id === selectedUnitId.value,
    );
    if (targetUnit) {
      targetUnit.sentence_count = Number(res.data.sentences_created || 0);
    }
    await loadUnitContent(selectedUnitId.value);
    advanceStudioStep(3);
    message.value = "บันทึกโครงสร้างเนื้อหาสำเร็จ";
  } catch (err) {
    setError(err, "บันทึกโครงสร้างเนื้อหาไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const publishStudioBook = async () => {
  resetStatus();

  if (!studioBookId.value) {
    error.value = "กรุณาสร้างร่างก่อน";
    return;
  }

  loading.value = true;

  try {
    await api.post(`/writer/books/${studioBookId.value}/publish`);
    advanceStudioStep(4);
    message.value = "เผยแพร่หนังสือสำเร็จ";
  } catch (err) {
    setError(err, "เผยแพร่หนังสือไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="writer-page">
    <section class="panel">
      <p class="eyebrow">สตูดิโอนักเขียน</p>
      <h1>สร้างหนังสือสำหรับระบบอ่าน + ฟังเสียง</h1>
      <p class="muted">
        โหมดใหม่นี้เพิ่มโครงสร้างบท/ตอน ย่อหน้า และประโยค พร้อมเตรียมข้อมูลสำหรับอ่านออกเสียง
        โดยยังคงโหมดอัปโหลดเดิมไว้ให้ใช้งานได้เหมือนเดิม
      </p>

      <div class="mode-tabs">
        <button :class="{ active: mode === 'studio' }" @click="mode = 'studio'">
        สตูดิโออ่านออกเสียง
        </button>
        <button :class="{ active: mode === 'ebook' }" @click="mode = 'ebook'">
          อัปโหลดเล่มเต็ม
        </button>
        <button :class="{ active: mode === 'serial' }" @click="mode = 'serial'">
          รายตอนแบบเดิม
        </button>
      </div>

      <div class="form-grid">
        <label>
          <span>ชื่อหนังสือ</span>
          <input v-model="title" type="text" />
        </label>
        <label>
          <span>ผู้เขียน</span>
          <input v-model="author" type="text" />
        </label>
        <label class="full">
          <span>คำโปรย</span>
          <textarea v-model="description" rows="4" />
        </label>
        <label>
          <span>สิทธิ์การเข้าถึง</span>
          <select v-model="accessType">
            <option value="paid">ขายรายเล่ม</option>
            <option value="free">ฟรี</option>
            <option value="subscription">แพ็กเกจสมาชิก</option>
          </select>
        </label>
        <label>
          <span>ราคา</span>
          <input v-model.number="price" min="0" type="number" />
        </label>
        <label class="full">
          <span>ลิงก์รูปปก</span>
          <input v-model="coverImage" type="url" placeholder="https://..." />
        </label>
      </div>

      <div class="placement-panel">
        <h3>เสนอให้แอดมินพิจารณาแสดงผลในเมนู</h3>
        <div class="placement-grid">
          <label class="placement-item"><input v-model="requestedPlacements.requested_best_seller" type="checkbox" />ขายดี</label>
          <label class="placement-item"><input v-model="requestedPlacements.requested_new_release" type="checkbox" />มาใหม่</label>
          <label class="placement-item"><input v-model="requestedPlacements.requested_promotion" type="checkbox" />โปรโมชั่น</label>
          <label class="placement-item"><input v-model="requestedPlacements.requested_free_book" type="checkbox" />ฟรีรายวัน</label>
          <label class="placement-item"><input v-model="requestedPlacements.requested_hall_of_fame" type="checkbox" />ฮิตขึ้นหิ้ง</label>
          <label class="placement-item"><input v-model="requestedPlacements.requested_recommended" type="checkbox" />แนะนำ</label>
        </div>
        <p class="muted">
          ค่าที่เลือกตรงนี้เป็นคำขอจากตอนอัปโหลด หนังสือจะไปอยู่ในเมนูจริงเมื่อแอดมินอนุมัติจากหน้าอนุมัติหนังสือ
        </p>
      </div>

      <div v-if="mode === 'studio'" class="sub-panel stack">
        <div class="section-header">
          <div>
            <h2>ร่างหนังสือพร้อมอ่านออกเสียง</h2>
            <p class="muted">
              ทำตามขั้นตอนจากข้อมูลหนังสือ ไปจนถึง preview และส่งให้แอดมินอนุมัติ
            </p>
          </div>
        </div>

        <nav class="wizard-steps" aria-label="ขั้นตอนสร้างหนังสือ">
          <button
            v-for="(step, index) in studioSteps"
            :key="step.title"
            type="button"
            class="wizard-step"
            :class="{ active: activeStudioStep === index, done: step.done }"
            :disabled="!canOpenStudioStep(index)"
            @click="goToStudioStep(index)"
          >
            <span class="step-number">{{ index + 1 }}</span>
            <span>
              <strong>{{ step.title }}</strong>
              <small>{{ step.caption }}</small>
            </span>
          </button>
        </nav>

        <div v-show="activeStudioStep === 0" class="wizard-stage">
          <section class="studio-panel">
            <div class="section-header">
              <div>
                <h3>ขั้นตอนที่ 1: ข้อมูลหนังสือ</h3>
                <p class="muted">ตั้งค่าพื้นฐานสำหรับร่างหนังสือและระบบอ่านออกเสียง</p>
              </div>
              <button class="primary-btn" :disabled="loading" @click="createStudioBook">
                {{ studioBookId ? "บันทึกเป็นร่างใหม่" : loading ? "กำลังสร้าง..." : "สร้างร่าง" }}
              </button>
            </div>

            <div class="form-grid compact">
              <label>
                <span>ประเภทหนังสือ</span>
                <select v-model="studioBookType">
                  <option value="ebook">อีบุ๊ก</option>
                  <option value="serial">รายตอน</option>
                </select>
              </label>
              <label>
                <span>ภาษา</span>
                <input v-model="studioLanguage" type="text" />
              </label>
              <label>
                <span>โหมดตัวอย่าง</span>
                <select v-model="studioPreviewMode">
                  <option value="percentage">เปอร์เซ็นต์</option>
                  <option value="chapter_count">จำนวนบท</option>
                  <option value="sentence_count">จำนวนประโยค</option>
                </select>
              </label>
              <label>
                <span>ค่าตัวอย่าง</span>
                <input v-model.number="studioPreviewValue" min="1" type="number" />
              </label>
              <label>
                <span>เรตอายุ</span>
                <input v-model="studioAgeRating" type="text" placeholder="เช่น 13+" />
              </label>
              <label class="full">
                <span>แท็ก</span>
                <input
                  v-model="studioTags"
                  type="text"
                  placeholder="นิยาย, แฟนตาซี, อบอุ่น"
                />
              </label>
            </div>
          </section>
        </div>

        <div v-if="studioBookId" class="status-card">
          <strong>ร่างพร้อมใช้งาน</strong>
          <span>หนังสือ #{{ studioBookId }}<template v-if="studioBookSlug"> · {{ studioBookSlug }}</template></span>
        </div>

        <div class="wizard-stage">
          <section v-show="activeStudioStep === 1" class="studio-panel">
            <h3>ขั้นตอนที่ 2: โครงสร้างหนังสือ</h3>
            <div class="form-grid compact single">
              <label>
                <span>ชนิดของหน่วย</span>
                <select v-model="selectedUnitType">
                  <option :value="studioBookType === 'serial' ? 'episode' : 'chapter'">
                    {{ studioBookType === "serial" ? "ตอน" : "บท" }}
                  </option>
                  <option value="chapter">บท</option>
                  <option value="episode">ตอน</option>
                </select>
              </label>
              <label>
                <span>ชื่อบท/ตอน</span>
                <input v-model="unitTitle" type="text" />
              </label>
              <label>
                <span>สรุปสั้น ๆ</span>
                <textarea v-model="unitSummary" rows="3" />
              </label>
            </div>
            <button class="primary-btn" :disabled="loading || !studioBookId" @click="addStudioUnit">
              เพิ่มบท/ตอน
            </button>

            <div class="unit-list">
              <button
                v-for="unit in studioUnits"
                :key="unit.id"
                class="unit-item"
                :class="{ active: unit.id === selectedUnitId }"
                @click="loadUnitContent(unit.id)"
              >
                <strong>{{ unit.unit_number }}. {{ unit.title }}</strong>
                <span>{{ formatUnitType(unit.unit_type) }} · {{ unit.sentence_count || 0 }} ประโยค</span>
              </button>
              <p v-if="!studioUnits.length" class="muted empty-note">
                ยังไม่มีบทหรือตอน
              </p>
            </div>
          </section>

          <section v-show="activeStudioStep === 2" class="studio-panel">
            <h3>ขั้นตอนที่ 3: ใส่เนื้อหา</h3>
            <p class="muted">
              เลือกบททางซ้าย แล้ววางข้อความเพื่อให้ระบบแปลงเป็นย่อหน้าและประโยค
            </p>
            <div v-if="selectedUnit" class="status-card compact-card">
              <strong>{{ selectedUnit.title }}</strong>
              <span>{{ formatUnitType(selectedUnit.unit_type) }}ที่ {{ selectedUnit.unit_number }}</span>
            </div>
            <textarea
              v-model="unitRawText"
              class="content-editor"
              rows="18"
              placeholder="พิมพ์หรือวางเนื้อหาที่นี่"
            />

            <div class="action-row">
              <button class="secondary-btn" :disabled="loading || !selectedUnitId" @click="saveUnitAsSingleBlock">
                บันทึกแบบ block เดียว
              </button>
              <button class="primary-btn" :disabled="loading || !selectedUnitId" @click="importUnitText">
                แยกย่อหน้าและประโยคอัตโนมัติ
              </button>
            </div>
          </section>

          <section v-show="activeStudioStep === 3" class="studio-panel">
            <h3>ขั้นตอนที่ 4: Preview สำหรับอ่านออกเสียง</h3>
            <div class="preview-stats">
              <article>
                <strong>{{ contentPreview.length }}</strong>
                <span>บล็อก</span>
              </article>
              <article>
                <strong>{{ totalPreviewSentences }}</strong>
                <span>ประโยค</span>
              </article>
              <article>
                <strong>{{ selectedUnit?.title || "-" }}</strong>
                <span>หน่วยที่เลือก</span>
              </article>
            </div>

            <div class="preview-list">
              <article v-for="block in contentPreview" :key="block.id" class="preview-block">
                <header>
                  <strong>#{{ block.block_order }} · {{ formatBlockType(block.block_type) }}</strong>
                  <span v-if="block.speaker_name">{{ block.speaker_name }}</span>
                </header>
                <p>{{ block.display_text }}</p>
                <div class="sentence-list">
                  <span v-for="sentence in block.sentences" :key="sentence.id">
                    {{ sentence.display_text }}
                  </span>
                </div>
              </article>
              <p v-if="!contentPreview.length" class="muted empty-note">
                ยังไม่มีตัวอย่างของโครงสร้างเนื้อหา
              </p>
            </div>

            <button class="publish-btn" :disabled="!canOpenStudioStep(4)" @click="goToStudioStep(4)">
              ไปขั้นตอนส่งอนุมัติ
            </button>
          </section>

          <section v-show="activeStudioStep === 4" class="studio-panel">
            <h3>ขั้นตอนที่ 5: ส่งให้แอดมินอนุมัติ</h3>
            <div class="publish-summary">
              <article>
                <span>หนังสือ</span>
                <strong>{{ title || "-" }}</strong>
              </article>
              <article>
                <span>จำนวนบท/ตอน</span>
                <strong>{{ studioUnits.length }}</strong>
              </article>
              <article>
                <span>จำนวนประโยคใน preview</span>
                <strong>{{ totalPreviewSentences }}</strong>
              </article>
              <article>
                <span>สิทธิ์การเข้าถึง</span>
                <strong>{{ accessType }}</strong>
              </article>
            </div>
            <p class="muted">
              เมื่อกดส่ง หนังสือจะเข้าสู่ flow เผยแพร่และรอแอดมินตรวจ/อนุมัติตำแหน่งแสดงผลตามที่เลือกไว้
            </p>
            <button class="publish-btn" :disabled="loading || !studioBookId || !studioUnits.length" @click="publishStudioBook">
              {{ loading ? "กำลังส่ง..." : "ส่งอนุมัติ / เผยแพร่" }}
            </button>
          </section>
        </div>
      </div>

      <div v-else-if="mode === 'ebook'" class="sub-panel">
        <h2>อัปโหลดอีบุ๊กทั้งเล่ม</h2>
        <div class="form-grid">
          <label>
            <span>ตัวอย่างกี่หน้า</span>
            <input v-model.number="previewPageLimit" min="1" type="number" />
          </label>
          <label>
            <span>ตัวอย่างกี่ตัวอักษร</span>
            <input v-model.number="previewCharLimit" min="1" type="number" />
          </label>
          <label class="full">
            <span>ไฟล์หนังสือ</span>
            <input
              type="file"
              accept=".pdf,.txt,.json,.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff,image/*"
              @change="onFileChange"
            />
          </label>
          <label class="full">
            <span>ไฟล์รูปปก</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              @change="onCoverFileChange"
            />
          </label>
        </div>
        <button class="primary-btn" :disabled="loading" @click="uploadEbook">
          {{ loading ? "กำลังอัปโหลด..." : "อัปโหลดเล่มเต็ม" }}
        </button>
      </div>

      <div v-else class="sub-panel">
        <h2>สร้างเรื่องรายตอน</h2>
        <button class="primary-btn" :disabled="loading" @click="createSerialBook">
          {{ serialBookId ? `กำลังใช้หนังสือ #${serialBookId}` : "สร้างเรื่องรายตอน" }}
        </button>

        <div class="episode-form" :class="{ disabled: !serialBookId }">
          <h3>เพิ่มตอน</h3>
          <div class="form-grid">
            <label>
              <span>ตอนที่</span>
              <input v-model.number="episodeNumber" min="1" type="number" />
            </label>
            <label>
              <span>ชื่อตอน</span>
              <input v-model="episodeTitle" type="text" />
            </label>
            <label>
              <span>อ่านฟรี</span>
              <select v-model="episodeIsFree">
                <option :value="true">ฟรี</option>
                <option :value="false">เสียเงิน</option>
              </select>
            </label>
            <label>
              <span>ราคาตอน</span>
              <input
                v-model.number="episodePrice"
                :disabled="episodeIsFree"
                min="0"
                type="number"
              />
            </label>
            <label class="full">
              <span>ตัวอย่างกี่ตัวอักษร</span>
              <input v-model.number="episodePreviewLimit" min="1" type="number" />
            </label>
            <label class="full">
              <span>เนื้อหาตอน</span>
              <textarea v-model="episodeContent" rows="10" />
            </label>
          </div>
          <button class="primary-btn" :disabled="loading || !serialBookId" @click="addEpisode">
            เพิ่มตอน
          </button>
        </div>
      </div>

      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.writer-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 48px;
}

.panel,
.sub-panel,
.studio-panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.panel {
  padding: 28px;
}

.sub-panel,
.studio-panel {
  padding: 24px;
}

.stack {
  display: grid;
  gap: 18px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1,
h2,
h3 {
  margin: 0 0 10px;
  color: var(--text-strong);
}

.muted {
  color: var(--text-muted);
}

.mode-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 22px 0;
}

.mode-tabs button,
.primary-btn,
.secondary-btn,
.publish-btn,
.unit-item {
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 900;
}

.mode-tabs button {
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 10px 14px;
}

.mode-tabs button.active {
  background: var(--primary);
  color: var(--on-primary);
}

.placement-panel {
  display: grid;
  gap: 12px;
  margin-top: 6px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
}

.placement-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.placement-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  padding: 10px 12px;
}

.placement-item input {
  width: 18px;
  height: 18px;
}

.section-header,
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.form-grid.compact {
  margin: 14px 0 0;
}

.form-grid.single {
  grid-template-columns: 1fr;
}

label {
  display: grid;
  gap: 8px;
  color: var(--text-strong);
  font-weight: 800;
}

.full {
  grid-column: 1 / -1;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-strong);
  font: inherit;
  padding: 12px 14px;
}

.content-editor {
  min-height: 340px;
  resize: vertical;
}

.primary-btn,
.secondary-btn,
.publish-btn {
  padding: 12px 18px;
}

.primary-btn,
.publish-btn {
  background: var(--primary);
  color: var(--on-primary);
}

.secondary-btn {
  background: var(--surface-soft);
  color: var(--text-strong);
  border: 1px solid var(--border);
}

.publish-btn {
  width: 100%;
  margin-top: 16px;
}

.primary-btn:disabled,
.secondary-btn:disabled,
.publish-btn:disabled {
  opacity: 0.65;
}

.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(20, 184, 166, 0.18);
  border-radius: 10px;
  background: rgba(20, 184, 166, 0.08);
  padding: 14px 16px;
}

.status-card strong {
  color: var(--text-strong);
}

.status-card span {
  color: var(--text-muted);
  font-weight: 700;
}

.compact-card {
  margin: 12px 0;
}

.wizard-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.wizard-step {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 76px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.wizard-step.active {
  border-color: color-mix(in srgb, var(--primary) 60%, var(--border));
  background: color-mix(in srgb, var(--primary) 10%, var(--surface));
}

.wizard-step.done .step-number {
  background: var(--primary);
  color: var(--on-primary);
}

.wizard-step:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.wizard-step strong,
.wizard-step small {
  display: block;
}

.wizard-step small {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.step-number {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-strong);
  font-weight: 900;
}

.wizard-stage {
  display: grid;
  gap: 18px;
}

.publish-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.publish-summary article {
  display: grid;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 14px;
}

.publish-summary span {
  color: var(--text-muted);
  font-size: 13px;
}

.publish-summary strong {
  color: var(--text-strong);
}

.unit-list,
.preview-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.unit-item {
  display: grid;
  gap: 4px;
  text-align: left;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 14px;
}

.unit-item.active {
  outline: 2px solid var(--primary);
}

.unit-item span {
  color: var(--text-muted);
  font-size: 13px;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.preview-stats article {
  display: grid;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 12px;
}

.preview-stats strong {
  color: var(--text-strong);
  font-size: 18px;
}

.preview-stats span {
  color: var(--text-muted);
  font-size: 13px;
}

.preview-block {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 14px;
}

.preview-block header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.preview-block p {
  margin: 10px 0 0;
  color: var(--text-strong);
  line-height: 1.7;
}

.sentence-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.sentence-list span {
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.12);
  color: var(--text-strong);
  font-size: 13px;
  padding: 6px 10px;
}

.empty-note {
  margin: 0;
}

.episode-form {
  margin-top: 24px;
}

.episode-form.disabled {
  opacity: 0.75;
}

.success {
  color: var(--primary-strong);
  font-weight: 800;
}

.error {
  color: var(--danger);
  font-weight: 800;
}

@media (max-width: 1080px) {
  .wizard-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .publish-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .panel,
  .sub-panel,
  .studio-panel {
    padding: 16px;
  }

  .mode-tabs button,
  .primary-btn,
  .secondary-btn,
  .publish-btn {
    width: 100%;
    min-height: 46px;
  }

  .wizard-steps,
  .form-grid,
  .preview-stats,
  .placement-grid,
  .publish-summary {
    grid-template-columns: 1fr;
  }

  .status-card,
  .preview-block header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
