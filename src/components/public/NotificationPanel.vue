<template>
  <div class="panel">
    <div class="panel-header">
      <strong>แจ้งเตือน</strong>
      <button>⚙</button>
    </div>

    <div class="item" v-for="n in 5" :key="n">
      <img src="https://placehold.co/60x60" alt="promo" />
      <div class="text">
        <p>โปรโมชั่นหนังสือและข่าวสารล่าสุด {{ n }}</p>
        <span>เมื่อ 20 มี.ค. 2569</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  position: absolute;
  top: 72px;
  left: 16px;
  width: 320px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  z-index: 60;
}

.panel-header {
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}

.panel-header button {
  border: none;
  background: transparent;
  cursor: pointer;
}

.item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid var(--border);
}

.item img {
  width: 60px;
  height: 60px;
  border-radius: 6px;
}

.text p {
  margin: 0 0 4px;
  font-size: 14px;
}

.text span {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
