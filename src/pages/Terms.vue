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
        <h1>ข้อตกลงในการใช้งาน</h1>
        <p>โปรดอ่านรายละเอียดก่อนใช้งานระบบ Read and Voice</p>
      </div>

      <div class="policy-content">
        <section>
          <h2>1. การยอมรับเงื่อนไข</h2>
          <p>
            เมื่อผู้ใช้งานสมัครสมาชิก เข้าสู่ระบบ หรือใช้งานเว็บไซต์ Read and Voice
            ถือว่าผู้ใช้งานยอมรับข้อตกลงและเงื่อนไขการใช้งานทั้งหมดของระบบ
          </p>
        </section>

        <section>
          <h2>2. การใช้งานบัญชีผู้ใช้</h2>
          <p>
            ผู้ใช้งานมีหน้าที่ดูแลอีเมล รหัสผ่าน และข้อมูลการเข้าสู่ระบบของตนเอง
            ไม่เปิดเผยข้อมูลให้ผู้อื่น และรับผิดชอบต่อกิจกรรมที่เกิดขึ้นภายใต้บัญชีของตน
          </p>
        </section>

        <section>
          <h2>3. การใช้งานเนื้อหาในระบบ</h2>
          <p>
            หนังสือ ข้อความ ภาพประกอบ เสียง และเนื้อหาอื่น ๆ ในระบบ
            ใช้เพื่อการอ่าน การเรียนรู้ และการใช้งานตามวัตถุประสงค์ของเว็บไซต์เท่านั้น
            ผู้ใช้งานต้องไม่คัดลอก แจกจ่าย ดัดแปลง หรือเผยแพร่เนื้อหาโดยไม่ได้รับอนุญาต
          </p>
        </section>

        <section>
          <h2>4. การใช้งานอย่างเหมาะสม</h2>
          <p>
            ผู้ใช้งานตกลงว่าจะไม่ใช้ระบบในลักษณะที่ก่อให้เกิดความเสียหายต่อเว็บไซต์
            ผู้ใช้งานอื่น หรือข้อมูลภายในระบบ เช่น การพยายามเข้าถึงข้อมูลโดยไม่ได้รับอนุญาต
            การส่งข้อมูลที่เป็นอันตราย หรือการใช้ระบบผิดวัตถุประสงค์
          </p>
        </section>

        <section>
          <h2>5. สิทธิ์ของระบบ</h2>
          <p>
            ผู้ดูแลระบบมีสิทธิ์ในการระงับ จำกัด หรือยกเลิกการใช้งานบัญชีของผู้ใช้
            หากตรวจพบการกระทำที่ละเมิดข้อตกลง หรือส่งผลกระทบต่อความปลอดภัยของระบบ
          </p>
        </section>

        <section>
          <h2>6. การเปลี่ยนแปลงเงื่อนไข</h2>
          <p>
            เว็บไซต์อาจมีการปรับปรุงหรือเปลี่ยนแปลงข้อตกลงในการใช้งานตามความเหมาะสม
            โดยจะแสดงข้อมูลฉบับล่าสุดบนหน้านี้
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