<template>
  <nav class="nav">
    <div class="nav-inner">
      <div class="all-books">อีบุ๊กทั้งหมด</div>

      <router-link to="/" class="nav-link">หน้าแรก</router-link>
      <router-link to="/store" class="nav-link">ขายดี</router-link>
      <router-link to="/new-releases" class="nav-link">มาใหม่</router-link>
      <router-link to="/promotions" class="nav-link">โปรโมชัน</router-link>
      <router-link to="/free-books" class="nav-link">ฟรีรายวัน</router-link>
      <router-link to="/hall-of-fame" class="nav-link">ฮิตขึ้นหิ้ง</router-link>
      <router-link to="/recommended" class="nav-link">แนะนำ</router-link>
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
