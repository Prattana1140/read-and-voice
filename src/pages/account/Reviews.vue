<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";
import AccountSectionLayout from "../../components/account/AccountSectionLayout.vue";

type ReviewItem = { id: number; book_id: number; rating: number; comment: string | null; created_at: string; updated_at: string; book_title: string; };
const router = useRouter();
const loading = ref(true);
const errorMessage = ref("");
const items = ref<ReviewItem[]>([]);
const hasItems = computed(() => items.value.length > 0);
async function loadItems() { try { loading.value = true; errorMessage.value = ""; const { data } = await api.get("/account/reviews"); items.value = Array.isArray(data?.items) ? data.items : []; } catch (error: any) { errorMessage.value = error?.response?.data?.message || "โหลดรีวิวไม่สำเร็จ"; } finally { loading.value = false; } }
onMounted(loadItems);
</script>

<template>
  <AccountSectionLayout title="รีวิวของฉัน" description="รวมคะแนนและความคิดเห็นที่คุณเคยเขียนไว้ในระบบ" :loading="loading" :error-message="errorMessage" :empty="!hasItems" empty-title="ยังไม่มีรีวิว" empty-text="เมื่อคุณให้คะแนนหรือรีวิวหนังสือ รายการจะแสดงที่หน้านี้" @back="router.push('/profile')">
    <section class="review-panel">
      <div class="review-filter">รีวิวของฉัน</div>
      <div v-for="item in items" :key="item.id" class="review-card">
        <div class="review-head"><strong>{{ item.book_title }}</strong><span>{{ '★'.repeat(Math.max(1, Math.min(5, item.rating))) }}</span></div>
        <p>{{ item.comment || 'ไม่มีข้อความรีวิวเพิ่มเติม' }}</p>
        <small>อัปเดตล่าสุด {{ new Date(item.updated_at).toLocaleString('th-TH') }}</small>
      </div>
    </section>
  </AccountSectionLayout>
</template>

<style scoped>
.review-panel { display: grid; gap: 16px; border: 1px solid var(--border); border-radius: 20px; background: var(--surface); box-shadow: var(--shadow); padding: 22px; }
.review-filter { border-bottom: 1px solid var(--border); color: var(--text-strong); font-size: 28px; font-weight: 900; padding-bottom: 10px; }
.review-card { display: grid; gap: 10px; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
.review-card:last-child { border-bottom: 0; padding-bottom: 0; }
.review-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
strong { color: var(--text-strong); font-size: 18px; }
span { color: #10b981; letter-spacing: 2px; }
p,small { margin: 0; color: var(--text-muted); line-height: 1.8; }
</style>
