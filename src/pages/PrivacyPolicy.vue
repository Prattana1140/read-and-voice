<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const goBack = () => {
  router.back();
};
</script>

<template>
  <main class="policy-page">
    <section class="policy-card">
      <div class="policy-head">
        <h1>นโยบายความเป็นส่วนตัว</h1>
        <p>รายละเอียดเกี่ยวกับการเก็บ ใช้ และคุ้มครองข้อมูลของผู้ใช้งาน</p>
      </div>

      <div class="policy-content">
        <section>
          <h2>1. ข้อมูลที่ระบบอาจเก็บ</h2>
          <p>
            ระบบอาจเก็บข้อมูลพื้นฐานของผู้ใช้งาน เช่น ชื่อ อีเมล
            ข้อมูลการเข้าสู่ระบบ และข้อมูลที่เกี่ยวข้องกับการใช้งานเว็บไซต์
            เพื่อให้บริการได้อย่างเหมาะสม
          </p>
        </section>

        <section>
          <h2>2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
          <p>
            ข้อมูลที่เก็บจะใช้เพื่อการยืนยันตัวตน การให้บริการภายในระบบ
            การปรับปรุงประสบการณ์ผู้ใช้งาน การรักษาความปลอดภัยของเว็บไซต์
            และการจัดการฟังก์ชันต่าง ๆ ของระบบ
          </p>
        </section>

        <section>
          <h2>3. การเก็บข้อมูลการใช้งาน</h2>
          <p>
            ระบบอาจบันทึกข้อมูลบางส่วน เช่น ประวัติการอ่านหนังสือ
            การเข้าสู่ระบบ หรือการใช้งานฟังก์ชันต่าง ๆ
            เพื่อช่วยให้ผู้ใช้งานได้รับประสบการณ์ที่ต่อเนื่องและสะดวกมากขึ้น
          </p>
        </section>

        <section>
          <h2>4. การเปิดเผยข้อมูล</h2>
          <p>
            เว็บไซต์จะไม่เปิดเผยข้อมูลส่วนบุคคลของผู้ใช้งานแก่บุคคลภายนอก
            ยกเว้นในกรณีที่จำเป็นตามกฎหมาย หรือเพื่อป้องกันความเสียหายต่อระบบและผู้ใช้งาน
          </p>
        </section>

        <section>
          <h2>5. ความปลอดภัยของข้อมูล</h2>
          <p>
            ระบบมีมาตรการพื้นฐานในการดูแลข้อมูลผู้ใช้งาน เช่น การป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
            และการจัดเก็บข้อมูลในลักษณะที่เหมาะสมตามขอบเขตของระบบ
          </p>
        </section>

        <section>
          <h2>6. การปรับปรุงนโยบาย</h2>
          <p>
            เว็บไซต์อาจมีการปรับปรุงนโยบายความเป็นส่วนตัวตามความเหมาะสม
            โดยจะแสดงข้อมูลฉบับล่าสุดไว้บนหน้านี้
          </p>
        </section>
      </div>

      <div class="policy-actions">
        <button type="button" class="back-btn" @click="goBack">
          กลับหน้าก่อนหน้า
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.policy-page {
  min-height: calc(100vh - 140px);
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: 28px 20px 40px;
  box-sizing: border-box;
}

.policy-card {
  width: min(900px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow);
  padding: 30px 26px;
  display: grid;
  gap: 22px;
}

.policy-head h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 32px;
  font-weight: 900;
}

.policy-head p {
  margin: 8px 0 0;
  color: var(--text-muted);
  line-height: 1.7;
}

.policy-content {
  display: grid;
  gap: 18px;
}

.policy-content section {
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-soft);
}

.policy-content h2 {
  margin: 0 0 10px;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 900;
}

.policy-content p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.8;
}

.policy-actions {
  display: flex;
  justify-content: flex-end;
}

.back-btn {
  min-height: 46px;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 900;
  cursor: pointer;
}

@media (max-width: 640px) {
  .policy-card {
    padding: 22px 16px;
    border-radius: 18px;
  }

  .policy-head h1 {
    font-size: 26px;
  }

  .policy-content h2 {
    font-size: 16px;
  }
}
</style>