<script setup>
import { ref } from "vue";
import axios from "axios";

const emit = defineEmits(["close"]);

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

const close = () => emit("close");

const switchMode = (m) => {
  mode.value = m;
};

const login = async () => {
  try {
    loading.value = true;

    const res = await axios.post("http://localhost:3000/api/auth/login", {
      email: email.value,
      password: password.value,
    });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));

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

    await axios.post("http://localhost:3000/api/auth/register", {
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
          <button class="btn fb">Facebook</button>
          <button class="btn line">LINE</button>
          <button class="btn apple">Apple</button>
          <button class="btn google">Google</button>

          <div class="form">
            <input v-model="email" placeholder="Email" />
            <input v-model="password" type="password" placeholder="Password" />

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
            <input v-model="regEmail" placeholder="Email" />
            <input v-model="regPassword" type="password" placeholder="Password" />
            <input v-model="confirmPassword" type="password" placeholder="Confirm Password" />

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
}

.modal {
  width: 900px;
  background: white;
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

.fb { background:#3b5998; color:white }
.line { background:#00c300; color:white }
.apple { background:black; color:white }
.google { background:#eee }

.form input {
  width: 100%;
  margin: 8px 0;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #ccc;
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
</style>