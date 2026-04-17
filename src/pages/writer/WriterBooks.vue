<template>
  <main class="writer-page">
    <section class="writer-card">
      <h1>หนังสือของฉัน</h1>
      <p>หน้านี้ใช้สำหรับแสดงรายการหนังสือของนักเขียน</p>
    </section>
  </main>
</template>

<style scoped>
.writer-page {
  min-height: calc(100vh - 140px);
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: 24px;
}

.writer-card {
  width: min(900px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 28px;
}

h1 {
  margin: 0 0 10px;
  color: var(--text-strong);
  font-size: 28px;
  font-weight: 900;
}

p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}
</style>