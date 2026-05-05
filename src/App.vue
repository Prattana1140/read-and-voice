<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AccessibilityWidget from "./components/AccessibilityWidget.vue";
import Footer from "./components/Footer.vue";
import Navbar from "./components/Navbar.vue";
import NavigationTrail from "./components/NavigationTrail.vue";
import api from "./utils/api";
import { announceAccessibilityMessage, initializeAccessibility } from "./utils/accessibility";
import { initLocale, useI18n } from "./utils/i18n";

type ThemeMode = "normal" | "dark" | "reading";

const theme = ref<ThemeMode>("normal");
const skipNextThemeWatch = ref(false);
const route = useRoute();
const { t } = useI18n();
const isReaderPage = computed(() => route.name === "ReaderPage");
const liveAnnouncement = ref("");

const focusMainContent = () => {
  const main = document.getElementById("app-main");
  if (!main) return;
  main.focus();
};

const handleGlobalAccessibilityKeys = (event: KeyboardEvent) => {
  if (!event.altKey) return;

  if (event.code === "KeyM") {
    event.preventDefault();
    focusMainContent();
    announceAccessibilityMessage(t("a11y.skippedMain"));
  }

  if (event.code === "KeyA") {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent("read-voice:toggle-accessibility"));
  }
};

const handleAnnouncement = (event: Event) => {
  const customEvent = event as CustomEvent<string>;
  liveAnnouncement.value = "";
  window.requestAnimationFrame(() => {
    liveAnnouncement.value = customEvent.detail || "";
  });
};

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

onMounted(async () => {
  initLocale();
  initializeAccessibility();
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

  if (localStorage.getItem("token")) {
    try {
      const { data } = await api.get("/account/preferences");
      const remoteTheme = data?.preferences?.accessibility?.theme;
      if (remoteTheme === "normal" || remoteTheme === "dark" || remoteTheme === "reading") {
        skipNextThemeWatch.value = remoteTheme !== theme.value;
        theme.value = remoteTheme;
        applyTheme(remoteTheme, false);
      }
    } catch {
      // Keep local theme if preference sync is unavailable.
    }
  }

  window.addEventListener("keydown", handleGlobalAccessibilityKeys);
  window.addEventListener("read-voice:announce", handleAnnouncement as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalAccessibilityKeys);
  window.removeEventListener("read-voice:announce", handleAnnouncement as EventListener);
});

watch(theme, (mode) => {
  if (skipNextThemeWatch.value) {
    skipNextThemeWatch.value = false;
    localStorage.setItem("read-voice-theme", mode);
    return;
  }

  localStorage.setItem("read-voice-theme", mode);
  applyTheme(mode);
  if (localStorage.getItem("token")) {
    api.put("/account/preferences", {
      preferences: {
        accessibility: { theme: mode },
      },
    }).catch(() => undefined);
  }
});
</script>

<template>
  <div class="app-shell" :class="{ 'reader-shell-mode': isReaderPage }">
    <div class="skip-links" :aria-label="t('a11y.skipLabel')">
      <a href="#app-main">{{ t("a11y.skipMain") }}</a>
      <a href="#site-navigation">{{ t("a11y.skipNav") }}</a>
    </div>
    <Navbar v-if="!isReaderPage" :theme="theme" @change-theme="changeTheme" />
    <NavigationTrail v-if="!isReaderPage" />
    <main id="app-main" class="app-main" tabindex="-1">
      <router-view />
    </main>
    <Footer v-if="!isReaderPage" />
    <AccessibilityWidget />
    <div class="sr-live" aria-live="polite" aria-atomic="true">{{ liveAnnouncement }}</div>
  </div>
</template>
