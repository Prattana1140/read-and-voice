<script setup lang="ts">
import { ref, watch } from "vue";

// ข้อความทั้งหมด
const text = ref(`นี่คือตัวอย่างข้อความสำหรับทดลองระบบอ่านออกเสียง
คุณสามารถแก้ข้อความนี้ได้ แล้วกดปุ่มอ่าน`);

// ค่าความเร็วและโทนเสียง
const rate = ref(1);
const pitch = ref(1);

// รายการประโยค
const sentences = ref<string[]>([]);

// index ของประโยคที่กำลังอ่าน
const currentSentenceIndex = ref(-1);

// สถานะการอ่าน
const isSpeaking = ref(false);
const isPaused = ref(false);

// แยกข้อความเป็นประโยค
const splitSentences = () => {
  sentences.value = text.value
    .split(/(?<=[.!?।]|[\n])/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

splitSentences();

watch(text, () => {
  splitSentences();
});

// เริ่มอ่านใหม่ตั้งแต่ต้น
const speak = () => {
  window.speechSynthesis.cancel();
  splitSentences();

  if (sentences.value.length === 0) return;

  currentSentenceIndex.value = 0;
  isSpeaking.value = true;
  isPaused.value = false;

  speakCurrentSentence();
};

// อ่านจากประโยคที่เลือก
const speakFromIndex = (index: number) => {
  if (index < 0 || index >= sentences.value.length) return;

  window.speechSynthesis.cancel();
  currentSentenceIndex.value = index;
  isSpeaking.value = true;
  isPaused.value = false;

  speakCurrentSentence();
};

// อ่านประโยคปัจจุบัน
const speakCurrentSentence = () => {
  if (
    currentSentenceIndex.value < 0 ||
    currentSentenceIndex.value >= sentences.value.length
  ) {
    isSpeaking.value = false;
    isPaused.value = false;
    currentSentenceIndex.value = -1;
    return;
  }

  const currentSentence = sentences.value[currentSentenceIndex.value];
  const utterance = new SpeechSynthesisUtterance(currentSentence);

  utterance.lang = "th-TH";
  utterance.rate = Number(rate.value);
  utterance.pitch = Number(pitch.value);

  utterance.onend = () => {
    if (!isSpeaking.value || isPaused.value) return;

    currentSentenceIndex.value++;

    if (currentSentenceIndex.value < sentences.value.length) {
      speakCurrentSentence();
    } else {
      isSpeaking.value = false;
      isPaused.value = false;
      currentSentenceIndex.value = -1;
    }
  };

  window.speechSynthesis.speak(utterance);
};

// หยุดชั่วคราว
const pauseSpeak = () => {
  if (!isSpeaking.value) return;

  window.speechSynthesis.pause();
  isPaused.value = true;
};

// อ่านต่อ
const resumeSpeak = () => {
  if (!isSpeaking.value) return;

  window.speechSynthesis.resume();
  isPaused.value = false;
};

// หยุดทั้งหมด
const stopSpeak = () => {
  isSpeaking.value = false;
  isPaused.value = false;
  currentSentenceIndex.value = -1;
  window.speechSynthesis.cancel();
};

// ไปประโยคก่อนหน้า
const prevSentence = () => {
  if (sentences.value.length === 0) return;

  const newIndex =
    currentSentenceIndex.value > 0 ? currentSentenceIndex.value - 1 : 0;

  speakFromIndex(newIndex);
};

// ไปประโยคถัดไป
const nextSentence = () => {
  if (sentences.value.length === 0) return;

  const newIndex =
    currentSentenceIndex.value < sentences.value.length - 1
      ? currentSentenceIndex.value + 1
      : sentences.value.length - 1;

  speakFromIndex(newIndex);
};

// อัปโหลดไฟล์
const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    text.value = (e.target?.result as string) || "";
    splitSentences();
    stopSpeak();
  };

  reader.readAsText(file, "UTF-8");
};

// ข้อความสถานะ
const statusText = () => {
  if (isSpeaking.value && isPaused.value) return "สถานะ: หยุดชั่วคราว";
  if (isSpeaking.value) return "สถานะ: กำลังอ่าน";
  return "สถานะ: พร้อมอ่าน";
};
</script>

<template>
  <div class="reader-page">
    <h1>หน้าอ่านหนังสือ + อ่านออกเสียง</h1>

    <label for="fileInput">เลือกไฟล์หนังสือ</label>
    <input
      id="fileInput"
      name="fileInput"
      type="file"
      accept=".txt"
      @change="handleFileUpload"
    />

    <label for="bookText">เนื้อหาหนังสือ</label>
    <textarea
      id="bookText"
      name="bookText"
      v-model="text"
      aria-label="เนื้อหาหนังสือ"
      rows="10"
    ></textarea>

    <div class="status-box">
      {{ statusText() }}
    </div>

    <div class="preview-box">
      <p
        v-for="(sentence, index) in sentences"
        :key="index"
        :class="{ active: index === currentSentenceIndex }"
        @click="speakFromIndex(index)"
      >
        {{ sentence }}
      </p>
    </div>

    <label for="rate">ความเร็ว: {{ rate }}</label>
    <input
      id="rate"
      name="rate"
      type="range"
      min="0.5"
      max="2"
      step="0.1"
      v-model="rate"
    />

    <label for="pitch">โทนเสียง: {{ pitch }}</label>
    <input
      id="pitch"
      name="pitch"
      type="range"
      min="0"
      max="2"
      step="0.1"
      v-model="pitch"
    />

    <div class="button-group">
      <button @click="speak">อ่านออกเสียง</button>
      <button @click="pauseSpeak">หยุดชั่วคราว</button>
      <button @click="resumeSpeak">อ่านต่อ</button>
      <button @click="stopSpeak">หยุด</button>
      <button @click="prevSentence">ประโยคก่อนหน้า</button>
      <button @click="nextSentence">ประโยคถัดไป</button>
    </div>
  </div>
</template>

<style scoped>
.reader-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px;
  font-family: Arial, sans-serif;
}

textarea {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  line-height: 1.7;
  border-radius: 12px;
  border: 1px solid #ccc;
  resize: vertical;
  margin-bottom: 20px;
}

label {
  display: block;
  margin-top: 12px;
  margin-bottom: 8px;
  font-weight: 600;
}

input[type="range"] {
  width: 100%;
  margin-bottom: 12px;
}

.status-box {
  margin-top: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #f3f3f3;
  font-weight: 600;
}

.preview-box {
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid #ccc;
  border-radius: 12px;
  background: #fafafa;
  line-height: 1.8;
  max-height: 300px;
  overflow-y: auto;
}

.preview-box p {
  margin: 0 0 12px 0;
  padding: 8px 10px;
  border-radius: 8px;
}

.preview-box p.active {
  background-color: yellow;
  color: black;
  font-weight: 700;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
}

button {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
}

.preview-box p {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.preview-box p:hover {
  background-color: #f0f0f0;
}


</style>
