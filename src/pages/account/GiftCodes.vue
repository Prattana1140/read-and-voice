<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";
import AccountSectionLayout from "../../components/account/AccountSectionLayout.vue";

type GiftCodeItem = {
  id: number;
  code: string;
  description: string | null;
  status: string;
  created_at: string;
  redeemed_at: string | null;
};

const router = useRouter();
const loading = ref(true);
const errorMessage = ref("");
const items = ref<GiftCodeItem[]>([]);

const hasItems = computed(() => items.value.length > 0);

async function loadItems() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/account/gift-codes");
    items.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดโค้ดของขวัญไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

onMounted(loadItems);
</script>

<template>
  <AccountSectionLayout
    title="โค้ดของขวัญ"
    description="ดูโค้ดที่เคยได้รับ พร้อมสถานะว่าใช้แล้วหรือยัง"
    :loading="loading"
    :error-message="errorMessage"
    :empty="!hasItems"
    empty-title="ยังไม่มีโค้ดของขวัญ"
    empty-text="เมื่อมีโค้ดเข้าบัญชี ระบบจะแสดงรายการให้ที่หน้านี้"
    @back="router.push('/profile')"
  >
    <section class="card-grid">
      <article v-for="item in items" :key="item.id" class="item-card">
        <div class="row">
          <strong>{{ item.code }}</strong>
          <span class="pill" :class="item.status">{{ item.status }}</span>
        </div>

        <p>{{ item.description || "ไม่มีคำอธิบายเพิ่มเติม" }}</p>
        <small>รับเมื่อ {{ new Date(item.created_at).toLocaleString() }}</small>
        <small v-if="item.redeemed_at">ใช้เมื่อ {{ new Date(item.redeemed_at).toLocaleString() }}</small>
      </article>
    </section>
  </AccountSectionLayout>
</template>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.item-card {
  display: grid;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 20px;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

strong {
  color: var(--text-strong);
  font-size: 20px;
}

p,
small {
  margin: 0;
}

p,
small {
  color: var(--text-muted);
}

.pill {
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 900;
  padding: 6px 10px;
  text-transform: uppercase;
}

.pill.available {
  background: #ecfdf3;
  color: #15803d;
}

.pill.redeemed {
  background: #eff6ff;
  color: #1d4ed8;
}

@media (max-width: 760px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
