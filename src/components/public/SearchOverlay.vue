<script setup lang="ts">
defineProps<{
  onClose: () => void;
}>();
</script>

<template>
  <div class="overlay">
    <div class="search-bar">
      <input type="text" placeholder="ค้นหาหนังสือ" />
      <button class="close-btn" @click="onClose">✕</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(25, 52, 66, 0.75);
  z-index: 80;
}

.search-bar {
  background: #18b84f;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-bar input {
  flex: 1;
  height: 48px;
  border: none;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 16px;
}

.close-btn {
  width: 42px;
  height: 42px;
  border: none;
  background: transparent;
  color: white;
  font-size: 28px;
  cursor: pointer;
}
</style>
