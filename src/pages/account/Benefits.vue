<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../utils/api";
import AccountSectionLayout from "../../components/account/AccountSectionLayout.vue";

type BenefitItem = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
};

const router = useRouter();
const loading = ref(true);
const errorMessage = ref("");
const items = ref<BenefitItem[]>([]);
const hasItems = computed(() => items.value.length > 0);

async function loadItems() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/account/benefits");
    items.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดสิทธิพิเศษไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

onMounted(loadItems);
</script>

<template>
  <AccountSectionLayout
    title="สิทธิพิเศษ"
    description="รวม benefit และสิทธิประโยชน์ที่บัญชีของคุณได้รับจากระบบหรือแพ็กเกจสมาชิก"
    :loading="loading"
    :error-message="errorMessage"
    :empty="!hasItems"
    empty-title="ยังไม่มีสิทธิพิเศษ"
    empty-text="เมื่อมีสิทธิพิเศษใหม่ ระบบจะแสดงรายการให้ที่หน้านี้"
    @back="router.push('/profile')"
  >
    <section class="card-grid">
      <article v-for="item in items" :key="item.id" class="item-card">
        <div class="row">
          <strong>{{ item.title }}</strong>
          <span class="pill">{{ item.status }}</span>
        </div>
        <p>{{ item.description || "ไม่มีคำอธิบายเพิ่มเติม" }}</p>
        <small>หมดอายุ {{ item.expires_at ? new Date(item.expires_at).toLocaleDateString() : "ไม่กำหนด" }}</small>
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
}

p,
small {
  margin: 0;
  color: var(--text-muted);
}

.pill {
  border-radius: 999px;
  background: #ecfdf3;
  color: #15803d;
  font-size: 12px;
  font-weight: 900;
  padding: 6px 10px;
  text-transform: uppercase;
}

@media (max-width: 760px) {
  .card-grid {
    grid-template-columns: 1fr;
  }

  .row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
