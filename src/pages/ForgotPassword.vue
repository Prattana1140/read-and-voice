<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../utils/api";

const route = useRoute();
const router = useRouter();

const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const previewResetUrl = ref("");

const resetToken = computed(() => String(route.query.token || "").trim());
const isResetMode = computed(() => resetToken.value.length > 0);

async function submitRequest() {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  previewResetUrl.value = "";

  try {
    const { data } = await api.post("/auth/forgot-password", {
      email: email.value,
    });

    successMessage.value =
      data?.message ||
      "Reset request created successfully.";
    previewResetUrl.value = String(data?.reset_url || "");
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "Could not create reset request.";
  } finally {
    loading.value = false;
  }
}

async function submitReset() {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Passwords do not match.";
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const { data } = await api.post("/auth/reset-password", {
      token: resetToken.value,
      password: password.value,
    });

    successMessage.value =
      data?.message || "Password reset completed successfully.";

    window.setTimeout(() => {
      router.push("/login");
    }, 1200);
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || "Could not reset password.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="forgot-page">
    <section class="forgot-card">
      <p class="eyebrow">Account Recovery</p>
      <h1>{{ isResetMode ? "Choose a new password" : "Forgot password" }}</h1>
      <p class="intro">
        {{
          isResetMode
            ? "Set a new password for your account. After saving, you will be redirected to the login page."
            : "Enter your account email to create a password reset request. In this build, the reset link is shown as a preview."
        }}
      </p>

      <form v-if="!isResetMode" class="forgot-form" @submit.prevent="submitRequest">
        <label>
          <span>Email</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
          />
        </label>

        <button type="submit" :disabled="loading">
          {{ loading ? "Creating request..." : "Create reset request" }}
        </button>
      </form>

      <form v-else class="forgot-form" @submit.prevent="submitReset">
        <label>
          <span>New password</span>
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="6"
            placeholder="At least 6 characters"
            required
          />
        </label>

        <label>
          <span>Confirm password</span>
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            minlength="6"
            placeholder="Repeat your new password"
            required
          />
        </label>

        <button type="submit" :disabled="loading">
          {{ loading ? "Saving..." : "Reset password" }}
        </button>
      </form>

      <div v-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
      <div v-if="successMessage" class="state-box success">
        <strong>{{ successMessage }}</strong>
        <a
          v-if="previewResetUrl"
          class="preview-link"
          :href="previewResetUrl"
        >
          Open preview reset link
        </a>
      </div>

      <div class="actions">
        <button type="button" class="ghost" @click="router.push('/login')">
          Back to login
        </button>
        <button
          v-if="isResetMode"
          type="button"
          class="ghost"
          @click="router.push('/forgot-password')"
        >
          Create another reset link
        </button>
        <button
          v-else
          type="button"
          class="ghost"
          @click="router.push('/register')"
        >
          Register
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.forgot-page {
  min-height: calc(100vh - 140px);
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top left, rgba(0, 168, 120, 0.12), transparent 32%),
    var(--bg);
  padding: 32px 18px;
}

.forgot-card {
  width: min(520px, 100%);
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 30px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary-strong, var(--primary));
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 34px;
}

.intro {
  color: var(--text-muted);
  line-height: 1.7;
}

.forgot-form,
label {
  display: grid;
  gap: 10px;
}

label span {
  color: var(--text-strong);
  font-weight: 900;
}

input {
  min-height: 50px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 0 14px;
}

button {
  min-height: 46px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.state-box {
  display: grid;
  gap: 8px;
  border-radius: 14px;
  line-height: 1.7;
  margin-top: 16px;
  padding: 16px;
}

.state-box.success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.state-box.error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.preview-link {
  color: inherit;
  font-weight: 800;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 22px;
}

.ghost {
  background: #e8faf6;
  color: #0f766e;
}
</style>
