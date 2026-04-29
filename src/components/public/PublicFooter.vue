<template>
  <footer class="footer">
    <div class="footer-grid">
      <div>
        <h4>เลือกหมวดหมู่</h4>
        <p>นิยาย</p>
        <p>การ์ตูน</p>
        <p>นิตยสาร</p>
        <p>ทั่วไป</p>
        <p>หนังสือเสียง</p>
      </div>

      <div>
        <h4>บริการช่วยเหลือ</h4>
        <p>วิธีการใช้งาน</p>
        <p>ขายอีบุ๊กกับเรา</p>
        <p>โค้ดของขวัญคืออะไร?</p>
      </div>

      <div>
        <h4>เกี่ยวกับเรา</h4>
        <p>ข่าวสารและกิจกรรม</p>
        <p>ติดต่อเรา</p>
      </div>

      <div>
        <h4>กลุ่มธุรกิจในเครือ</h4>
        <p>Central</p>
        <p>OfficeMate</p>
        <p>Power Buy</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: #ececec;
  padding: 48px 24px;
  margin-top: 40px;
}

.footer-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
}

h4 {
  margin-top: 0;
}

p {
  margin: 10px 0;
  color: #555;
}
</style>
