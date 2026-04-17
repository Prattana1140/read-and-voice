<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import Footer from "./components/Footer.vue";
import Navbar from "./components/Navbar.vue";

type ThemeMode = "normal" | "dark" | "reading";

const theme = ref<ThemeMode>("normal");

const applyTheme = (mode: ThemeMode) => {
  document.documentElement.dataset.theme = mode === "normal" ? "" : mode;
  document.documentElement.classList.add("theme-transition");
  window.setTimeout(() => {
    document.documentElement.classList.remove("theme-transition");
  }, 260);
};

const changeTheme = (mode: ThemeMode) => {
  theme.value = mode;
};

onMounted(() => {
  const savedTheme = localStorage.getItem("read-voice-theme");

  if (
    savedTheme === "normal" ||
    savedTheme === "dark" ||
    savedTheme === "reading"
  ) {
    theme.value = savedTheme;
  }

  applyTheme(theme.value);
});

watch(theme, (mode) => {
  localStorage.setItem("read-voice-theme", mode);
  applyTheme(mode);
});
</script>

<template>
  <div class="app-shell">
    <Navbar :theme="theme" @change-theme="changeTheme" />
    <main class="app-main">
      <router-view />
    </main>
    <Footer />
  </div>
</template>
