<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const wishlist = ref([]);

const loadWishlist = () => {
  wishlist.value = JSON.parse(localStorage.getItem("wishlist") || "[]");
};

const removeItem = (id) => {
  wishlist.value = wishlist.value.filter((b) => b.id !== id);
  localStorage.setItem("wishlist", JSON.stringify(wishlist.value));
};

onMounted(loadWishlist);
</script>

<template>
  <div class="page">
    <h1>❤️ Wishlist</h1>

    <div v-if="!wishlist.length">ยังไม่มีรายการ</div>

    <div v-else class="grid">
      <div v-for="item in wishlist" :key="item.id" class="card">
        <img :src="item.cover" class="cover" />
        <h3>{{ item.title }}</h3>

        <div class="btns">
          <button @click="router.push(`/book/${item.id}`)">ดู</button>
          <button @click="removeItem(item.id)">ลบ</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 20px }
.grid { display: grid; grid-template-columns: repeat(auto-fill, 200px); gap: 16px }
.card { background: white; padding: 10px; border-radius: 12px }
.cover { width: 100%; height: 200px; object-fit: cover }
.btns { display: flex; gap: 8px }
</style>