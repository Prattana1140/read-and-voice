<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import logoUrl from "../assets/Logo-transparent.png";

type ThemeMode = "normal" | "dark" | "reading";

const props = defineProps<{
  theme: ThemeMode;
}>();

const emit = defineEmits<{
  (event: "change-theme", theme: ThemeMode): void;
}>();

const router = useRouter();

const isLoggedIn = computed(() => !!localStorage.getItem("token"));

const themeOptions: { label: string; value: ThemeMode }[] = [
  { label: "ปกติ", value: "normal" },
  { label: "มืด", value: "dark" },
  { label: "อ่าน", value: "reading" },
];

const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  router.push("/login");
};
</script>

<template>
  <header class="navbar">
    <router-link class="brand" to="/">
      <img class="brand-logo" :src="logoUrl" alt="Read and Voice" />
      <span>
        <strong>Read and Voice</strong>
        <small>อ่านง่าย ฟังสบาย</small>
      </span>
    </router-link>

    <nav class="nav-links" aria-label="เมนูหลัก">
      <router-link to="/">หน้าแรก</router-link>
      <router-link to="/store">ร้านหนังสือ</router-link>
      <router-link to="/my-library">ชั้นหนังสือ</router-link>
      <router-link to="/cart">ตะกร้า</router-link>
      <router-link to="/upload-book">อัปโหลด</router-link>
    </nav>

    <div class="right-actions">
      <div class="theme-switcher" aria-label="เปลี่ยนโหมดสี">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          type="button"
          :class="{ active: props.theme === option.value }"
          @click="emit('change-theme', option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <button
        v-if="isLoggedIn"
        class="account-btn"
        type="button"
        @click="logout"
      >
        ออกจากระบบ
      </button>

      <template v-else>
        <router-link class="account-btn ghost" to="/login">เข้าสู่ระบบ</router-link>
        <router-link class="account-btn" to="/register">สมัครสมาชิก</router-link>
      </template>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(10px, 1.4vw, 20px);
  min-height: 72px;
  width: 100%;
  padding: 12px clamp(12px, 2.6vw, 40px);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 8px 22px rgba(16, 24, 40, 0.06);
  backdrop-filter: blur(14px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
  color: var(--text-strong);
  text-decoration: none;
}

.brand-logo {
  width: 82px;
  height: 48px;
  border: 0;
  border-radius: 0;
  background: transparent;
  object-fit: contain;
}

.brand strong,
.brand small {
  display: block;
  line-height: 1.2;
}

.brand small {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 12px;
}

.nav-links,
.right-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-links {
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.nav-links a {
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--text);
  text-decoration: none;
  font-weight: 700;
  white-space: nowrap;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: var(--primary-strong);
  background: var(--primary-soft);
}

.right-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  min-width: 0;
}

.theme-switcher {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
}

.theme-switcher button {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  padding: 7px 9px;
}

.theme-switcher button.active {
  color: var(--on-primary);
  background: var(--primary);
}

.account-btn {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--primary);
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  text-decoration: none;
  font-weight: 800;
  white-space: nowrap;
}

.account-btn.ghost {
  background: transparent;
  color: var(--primary-strong);
}

@media (max-width: 980px) {
  .navbar {
    position: static;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .brand,
  .nav-links,
  .right-actions {
    justify-content: center;
  }

  .nav-links {
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }
}

@media (max-width: 640px) {
  .navbar {
    padding: 10px 12px;
  }

  .brand {
    min-width: 0;
  }

  .brand-logo {
    width: 68px;
    height: 40px;
  }

  .brand small {
    display: none;
  }

  .nav-links a {
    flex: 0 0 auto;
    padding: 8px 9px;
    font-size: 14px;
  }

  .right-actions,
  .theme-switcher {
    width: 100%;
  }

  .theme-switcher button,
  .account-btn {
    flex: 1 1 auto;
    justify-content: center;
  }
}
</style>
