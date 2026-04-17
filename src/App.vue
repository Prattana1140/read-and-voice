<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import Footer from "./components/Footer.vue";
import Navbar from "./components/Navbar.vue";

type ThemeMode = "normal" | "dark" | "reading";

const theme = ref<ThemeMode>("normal");
const skipNextThemeWatch = ref(false);

const applyTheme = (mode: ThemeMode, withTransition = true) => {
  document.documentElement.dataset.theme = mode === "normal" ? "" : mode;

  if (!withTransition) return;

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
  let initialTheme: ThemeMode = "normal";

  if (
    savedTheme === "normal" ||
    savedTheme === "dark" ||
    savedTheme === "reading"
  ) {
    initialTheme = savedTheme;
  }

  skipNextThemeWatch.value = initialTheme !== theme.value;
  theme.value = initialTheme;
  applyTheme(initialTheme, false);
});

watch(theme, (mode) => {
  if (skipNextThemeWatch.value) {
    skipNextThemeWatch.value = false;
    localStorage.setItem("read-voice-theme", mode);
    return;
  }

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
