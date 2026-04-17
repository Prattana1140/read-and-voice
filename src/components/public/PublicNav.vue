<template>
  <nav class="nav">
    <div class="nav-inner">
      <div class="all-books">อีบุ๊กทั้งหมด ▼</div>

      <router-link to="/" class="nav-link">หน้าแรก</router-link>
      <router-link to="/store" class="nav-link">ขายดี</router-link>
      <a href="#" class="nav-link">มาใหม่</a>
      <a href="#" class="nav-link">โปรโมชั่น</a>
      <a href="#" class="nav-link">ฟรีรายวัน</a>
      <a href="#" class="nav-link">ฮิตขึ้นหิ้ง</a>
      <a href="#" class="nav-link">แนะนำ</a>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  background: #efefef;
  border-bottom: 1px solid #ddd;
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 16px;
  overflow-x: auto;
}

.all-books {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

.nav-link {
  text-decoration: none;
  color: #333;
  white-space: nowrap;
}
</style>
