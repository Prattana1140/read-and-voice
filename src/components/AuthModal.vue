<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../utils/api";
import { saveAuth } from "../utils/auth";
import { loginWithSocialProvider } from "../utils/socialLogin";

const emit = defineEmits(["close"]);
const router = useRouter();

const mode = ref("login"); // login | register

// login
const email = ref("");
const password = ref("");

// register
const name = ref("");
const regEmail = ref("");
const regPassword = ref("");
const confirmPassword = ref("");

const loading = ref(false);
const statusLoading = ref(true);
const oauthStatus = ref({});

const lineReady = computed(() => !!oauthStatus.value.line?.configured);
const hasSocialLogin = computed(() => lineReady.value);

const close = () => emit("close");

const switchMode = (m) => {
  mode.value = m;
};

const loadOAuthStatus = async () => {
  statusLoading.value = true;

  try {
    const res = await api.get("/api/auth/oauth/status");
    oauthStatus.value = (res.data.providers || []).reduce((map, provider) => {
      map[provider.provider] = provider;
      return map;
    }, {});
  } catch {
    oauthStatus.value = {};
  } finally {
    statusLoading.value = false;
  }
};

const socialLogin = async (provider) => {
  if (provider === "line" && !lineReady.value) return;

  await loginWithSocialProvider(router, provider);
};

const login = async () => {
  try {
    loading.value = true;

    const res = await api.post("/api/auth/login", {
      email: email.value,
      password: password.value,
    });

    saveAuth(res.data.token, res.data.user);

    alert("เข้าสู่ระบบสำเร็จ");
    close();
    location.reload();
  } catch (err) {
    alert("เข้าสู่ระบบไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

const register = async () => {
  if (regPassword.value !== confirmPassword.value) {
    alert("รหัสผ่านไม่ตรงกัน");
    return;
  }

  try {
    loading.value = true;

    await api.post("/api/auth/register", {
      name: name.value,
      email: regEmail.value,
      password: regPassword.value,
    });

    alert("สมัครสำเร็จ");
    mode.value = "login";
  } catch (err) {
    alert("สมัครไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadOAuthStatus();
});
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="modal">
      <button class="close" @click="close">×</button>

      <!-- LEFT -->
      <div class="left"></div>

      <!-- RIGHT -->
      <div class="right">
        <h2>{{ mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก" }}</h2>

        <!-- LOGIN -->
        <div v-if="mode === 'login'">
          <template v-if="hasSocialLogin">
            <button
              v-if="lineReady"
              class="btn line"
              :disabled="statusLoading"
              @click="socialLogin('line')"
            >
              เข้าสู่ระบบด้วย LINE
            </button>
          </template>

          <div class="form">
            <input v-model="email" placeholder="อีเมล" />
            <input v-model="password" type="password" placeholder="รหัสผ่าน" />

            <button class="submit" @click="login">
              {{ loading ? "กำลังเข้า..." : "เข้าสู่ระบบ" }}
            </button>
          </div>

          <p>
            ยังไม่มีบัญชี?
            <span @click="switchMode('register')">สมัครสมาชิก</span>
          </p>
        </div>

        <!-- REGISTER -->
        <div v-else>
          <div class="form">
            <input v-model="name" placeholder="ชื่อ" />
            <input v-model="regEmail" placeholder="อีเมล" />
            <input v-model="regPassword" type="password" placeholder="รหัสผ่าน" />
            <input v-model="confirmPassword" type="password" placeholder="ยืนยันรหัสผ่าน" />

            <button class="submit" @click="register">
              {{ loading ? "กำลังสมัคร..." : "สมัครสมาชิก" }}
            </button>
          </div>

          <p>
            มีบัญชีแล้ว?
            <span @click="switchMode('login')">เข้าสู่ระบบ</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  padding: var(--page-gutter, 16px);
  overflow-y: auto;
}

.modal {
  width: min(900px, 100%);
  background: var(--surface);
  color: var(--text);
  border-radius: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
  position: relative;
}

.close {
  position: absolute;
  right: 15px;
  top: 10px;
  border: none;
  background: none;
  font-size: 30px;
}

.left {
  background: #f5f5f5;
  border-right: 2px solid #ddd;
}

.right {
  padding: 40px;
}

.btn {
  width: 100%;
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 20px;
  border: none;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.google {
  background: #ffffff;
  color: #1f2937;
  border: 1px solid #d1d5db;
}

.line { background:#00c300; color:white }

.form input {
  width: 100%;
  margin: 8px 0;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #ccc;
  font-size: 16px;
}

.submit {
  width: 100%;
  margin-top: 10px;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #6c63ff;
  color: white;
}

span {
  color: #00bcd4;
  cursor: pointer;
}

@media (max-width: 760px) {
  .overlay {
    align-items: flex-start;
  }

  .modal {
    grid-template-columns: 1fr;
    border-radius: 16px;
  }

  .left {
    display: none;
  }

  .right {
    padding: 28px 18px;
  }
}
</style>
