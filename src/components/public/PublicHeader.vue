<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  onToggleNotify: () => void;
  onToggleAccount: () => void;
  onToggleSearch: () => void;
  onOpenRegister: () => void;
}>();

const router = useRouter();

const isLoggedIn = computed(() => {
  return !!localStorage.getItem("token");
});

const currentRole = computed(() => {
  const raw = localStorage.getItem("user");
  if (!raw) return "";

  try {
    return String(JSON.parse(raw)?.role || "").trim().toLowerCase();
  } catch {
    return "";
  }
});

const canUploadBooks = computed(() =>
  ["writer", "admin", "superadmin"].includes(currentRole.value),
);

const goToLogin = () => {
  router.push("/login");
};

const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  router.push("/login");
};
</script>

<template>
  <header class="header">
    <div class="left">
      <button v-if="!isLoggedIn" class="login-btn" @click="goToLogin">
        เข้าสู่ระบบ
      </button>

      <button v-else class="login-btn logout-btn" @click="logout">
        ออกจากระบบ
      </button>

      <button
        v-if="!isLoggedIn"
        class="register-btn"
        @click="props.onOpenRegister"
      >
        สมัครสมาชิก
      </button>
    </div>

    <div class="logo">Read & Voice</div>

    <div class="right">
      <button class="icon-btn" @click="props.onToggleNotify">แจ้งเตือน</button>
      <router-link class="icon-btn link-btn" to="/wishlist">ถูกใจ</router-link>
      <router-link class="icon-btn link-btn" to="/cart">ตะกร้า</router-link>

      <router-link class="icon-btn link-btn" to="/my-library">
        My Library
      </router-link>

      <button class="icon-btn" @click="props.onToggleSearch">ค้นหา</button>
      <button class="icon-btn" @click="props.onToggleAccount">บัญชี</button>
      <router-link v-if="canUploadBooks" class="icon-btn link-btn" to="/writer/upload">
        อัปโหลด
      </router-link>
    </div>
  </header>
</template>

<style scoped>
.header {
  min-height: 64px;
  background: #18b84f;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 50;
  gap: 12px;
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.logo {
  font-size: 22px;
  font-weight: 800;
  text-align: center;
}

.login-btn,
.register-btn {
  background: rgba(0, 0, 0, 0.15);
  border: none;
  color: white;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
}

.register-btn {
  background: rgba(255, 255, 255, 0.18);
}

.logout-btn {
  background: rgba(255, 255, 255, 0.18);
}

.icon-btn,
.link-btn {
  min-width: 40px;
  height: 40px;
  border: none;
  padding: 0 12px;
  background: transparent;
  color: white;
  cursor: pointer;
  font-size: 14px;
  display: grid;
  place-items: center;
  text-decoration: none;
  border-radius: 8px;
}

.icon-btn:hover,
.link-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

@media (max-width: 900px) {
  .header {
    flex-direction: column;
  }
}
</style>
