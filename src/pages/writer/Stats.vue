<script setup lang="ts">
import { onMounted, ref } from "vue";
import axios from "axios";

type Book = {
  id: number;
  is_published?: number;
};

const books = ref<Book[]>([]);

onMounted(async () => {
  const res = await axios.get("http://localhost:3000/api/books");
  books.value = Array.isArray(res.data) ? res.data : [];
});
</script>

<template>
  <div class="writer-page">
    <section class="panel">
      <p class="eyebrow">นักเขียน</p>
      <h1>สถิติหนังสือตัวเอง</h1>
      <div class="stats-grid">
        <article>
          <strong>{{ books.length }}</strong>
          <span>หนังสือทั้งหมด</span>
        </article>
        <article>
          <strong>{{ books.filter((book) => Number(book.is_published) === 1).length }}</strong>
          <span>เผยแพร่แล้ว</span>
        </article>
        <article>
          <strong>{{ books.filter((book) => Number(book.is_published) !== 1).length }}</strong>
          <span>รอตรวจสอบ</span>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.writer-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong);
  font-weight: 900;
}

h1 {
  color: var(--text-strong);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
}

article {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  padding: 20px;
}

strong,
span {
  display: block;
}

strong {
  color: var(--text-strong);
  font-size: 34px;
}

span {
  color: var(--text-muted);
  font-weight: 800;
}

@media (max-width: 700px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
