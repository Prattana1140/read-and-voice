<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api, { resolveAssetUrl } from "../utils/api";
import { getUser, saveAuth } from "../utils/auth";
import { useI18n } from "../utils/i18n";

type ProfileForm = {
  username: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  birth_date: string;
  visual_impairment_status: string;
  uses_screen_reader: boolean;
  assistive_technology: string;
  preferred_reading_mode: string;
  province: string;
  bio: string;
  avatar_url: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileResponse = {
  id: number;
  name: string;
  email: string;
  role?: string;
  status?: string;
  created_at?: string;
  avatar_url?: string;
  username?: string;
  phone?: string;
  gender?: string;
  birth_date?: string | null;
  age?: number | null;
  age_verified?: boolean;
  visual_impairment_status?: string;
  uses_screen_reader?: boolean;
  assistive_technology?: string;
  preferred_reading_mode?: string;
  province?: string;
  bio?: string;
};

const router = useRouter();
const { formatLocaleDate, t } = useI18n();
const loading = ref(false);
const saving = ref(false);
const verifyingAge = ref(false);
const message = ref("");
const errorMessage = ref("");
const ageVerificationMessage = ref("");
const ageVerificationError = ref("");
const isEditOpen = ref(false);
const selectedAvatarFile = ref<File | null>(null);
const selectedAvatarPreview = ref("");
const removeAvatar = ref(false);
const profileMeta = ref<ProfileResponse | null>(null);
const isMembershipActive = ref(false);
const membershipBadgeLabel = ref(t("profile.membershipFallback"));

const form = reactive<ProfileForm>({
  username: "",
  name: "",
  email: "",
  phone: "",
  gender: "prefer_not_to_say",
  birth_date: "",
  visual_impairment_status: "not_specified",
  uses_screen_reader: false,
  assistive_technology: "",
  preferred_reading_mode: "both",
  province: "",
  bio: "",
  avatar_url: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const declaredAge = ref<number | null>(null);

const accountCards = computed(() => [
  { title: t("account.bookshelf"), text: t("profile.cardLibraryText"), to: "/my-library" },
  { title: t("account.cart"), text: t("profile.cardCartText"), to: "/cart" },
  { title: t("account.orders"), text: t("profile.cardOrderHistoryText"), to: "/orders/history" },
  { title: t("account.coinWallet"), text: t("profile.cardCoinWalletText"), to: "/coin-wallet" },
]);

const primaryAccountCards = computed(() => accountCards.value.slice(0, 4));
const secondaryAccountCards = computed(() => accountCards.value.slice(4));

const currentUser = computed(() => getUser());
const displayName = computed(() => form.name || currentUser.value?.name || "Read and Voice User");
const roleLabel = computed(() => {
  const role = String(profileMeta.value?.role || currentUser.value?.role || "user")
    .trim()
    .toLowerCase();

  if (role === "superadmin") return t("account.role.superadmin");
  if (role === "admin") return t("account.role.admin");
  if (role === "writer") return t("account.role.writer");
  return t("account.role.user");
});
const memberSince = computed(() => {
  const raw = profileMeta.value?.created_at;
  if (!raw) return t("profile.noMemberSince");

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : formatLocaleDate(date);
});
const profilePreviewUrl = computed(() => {
  if (removeAvatar.value) return "";
  if (selectedAvatarPreview.value) return selectedAvatarPreview.value;
  if (form.avatar_url.trim()) return resolveAssetUrl(form.avatar_url.trim());
  return "";
});
const calculatedAge = computed(() => {
  if (!form.birth_date) return null;

  const birth = new Date(`${form.birth_date}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
});
const ageVerified = computed(() => Boolean(profileMeta.value?.age_verified));
const ageVerificationStatusText = computed(() =>
  ageVerified.value ? "ยืนยันอายุแล้ว" : "ยังไม่ได้ยืนยันอายุ",
);
const accessibilitySummary = computed(() => {
  if (form.uses_screen_reader) return t("profile.accessibilityScreenReaderOn");
  if (["blind", "low_vision", "other"].includes(form.visual_impairment_status)) {
    return t("profile.accessibilityRecommended");
  }
  return t("profile.accessibilityAutoOff");
});

function toDateInputValue(value?: string | null) {
  if (!value) return "";

  const raw = String(value);
  const dateOnly = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return dateOnly;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function syncForm(data?: Partial<ProfileResponse> | null) {
  form.username = data?.username || currentUser.value?.username || "";
  form.name = data?.name || currentUser.value?.name || "";
  form.email = data?.email || currentUser.value?.email || "";
  form.phone = data?.phone || "";
  form.gender = data?.gender || currentUser.value?.gender || "prefer_not_to_say";
  form.birth_date = toDateInputValue(data?.birth_date || currentUser.value?.birth_date || "");
  form.visual_impairment_status =
    data?.visual_impairment_status ||
    currentUser.value?.visual_impairment_status ||
    "not_specified";
  form.uses_screen_reader = Boolean(
    data?.uses_screen_reader || currentUser.value?.uses_screen_reader,
  );
  form.assistive_technology =
    data?.assistive_technology || currentUser.value?.assistive_technology || "";
  form.preferred_reading_mode =
    data?.preferred_reading_mode || currentUser.value?.preferred_reading_mode || "both";
  form.province = data?.province || currentUser.value?.province || "";
  form.bio = data?.bio || "";
  form.avatar_url = data?.avatar_url || currentUser.value?.avatar_url || "";
}

function resetAvatarSelection() {
  if (selectedAvatarPreview.value.startsWith("blob:")) {
    URL.revokeObjectURL(selectedAvatarPreview.value);
  }
  selectedAvatarFile.value = null;
  selectedAvatarPreview.value = "";
}

async function loadProfile() {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { data } = await api.get("/profile/me");
    profileMeta.value = data || null;
    syncForm(data);
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || t("profile.loadFailed");
  } finally {
    loading.value = false;
  }
}

async function loadMembershipStatus() {
  try {
    const { data } = await api.get("/subscriptions/me");
    const subscription = data?.subscription || null;
    isMembershipActive.value = Boolean(data?.isActive);
    membershipBadgeLabel.value =
      subscription?.plan_name?.trim() || subscription?.name?.trim() || t("profile.membershipFallback");
  } catch {
    isMembershipActive.value = false;
  }
}

function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] || null;

  resetAvatarSelection();

  if (!file) {
    return;
  }

  selectedAvatarFile.value = file;
  selectedAvatarPreview.value = URL.createObjectURL(file);
  removeAvatar.value = false;
}

function clearAvatar() {
  removeAvatar.value = true;
  form.avatar_url = "";
  resetAvatarSelection();
}

function useAvatarUrlInput() {
  removeAvatar.value = false;
  resetAvatarSelection();
}

function validateProfileForm(name: string, email: string) {
  if (!name || !email) {
    return t("profile.validationNameEmail");
  }

  if (form.username.trim() && !/^[A-Za-z0-9._@-]{4,32}$/.test(form.username.trim())) {
    return t("profile.validationUsername");
  }

  if (form.birth_date) {
    if (calculatedAge.value === null || calculatedAge.value < 0) {
      return t("profile.validationBirthDateInvalid");
    }

    if (calculatedAge.value > 120) {
      return t("profile.validationBirthDateTooOld");
    }
  }

  if (form.currentPassword || form.newPassword || form.confirmPassword) {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      return t("profile.validationPasswordIncomplete");
    }

    if (form.newPassword.length < 6) {
      return t("profile.validationPasswordTooShort");
    }

    if (form.newPassword !== form.confirmPassword) {
      return t("profile.validationPasswordMismatch");
    }
  }

  return "";
}

async function saveProfile() {
  try {
    saving.value = true;
    message.value = "";
    errorMessage.value = "";

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    const validationMessage = validateProfileForm(name, email);
    if (validationMessage) {
      errorMessage.value = validationMessage;
      return;
    }

    const payload = new FormData();
    payload.append("name", name);
    payload.append("email", email);
    payload.append("username", form.username.trim());
    payload.append("phone", form.phone.trim());
    payload.append("gender", form.gender);
    payload.append("birth_date", form.birth_date);
    payload.append("visual_impairment_status", form.visual_impairment_status);
    payload.append("uses_screen_reader", form.uses_screen_reader ? "true" : "false");
    payload.append("assistive_technology", form.assistive_technology.trim());
    payload.append("preferred_reading_mode", form.preferred_reading_mode);
    payload.append("province", form.province.trim());
    payload.append(
      "accessibility_mode",
      form.uses_screen_reader ||
        ["blind", "low_vision", "other"].includes(form.visual_impairment_status)
        ? "true"
        : "false",
    );
    payload.append("bio", form.bio.trim());
    payload.append("avatar_url", form.avatar_url.trim());
    payload.append("remove_avatar", removeAvatar.value ? "true" : "false");

    if (form.currentPassword) {
      payload.append("currentPassword", form.currentPassword);
    }

    if (form.newPassword) {
      payload.append("newPassword", form.newPassword);
    }

    if (form.confirmPassword) {
      payload.append("confirmPassword", form.confirmPassword);
    }

    if (selectedAvatarFile.value) {
      payload.append("avatar", selectedAvatarFile.value);
    }

    const { data } = await api.put("/profile/me", payload, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const profile = data?.profile || null;
    profileMeta.value = profile;
    syncForm(profile);

    const user = currentUser.value;
    const token = localStorage.getItem("token");

    if (token && user) {
      saveAuth(token, {
        ...user,
        name: profile?.name || name,
        email: profile?.email || email,
        avatar_url: profile?.avatar_url || "",
        username: profile?.username || "",
        phone: profile?.phone || "",
        gender: profile?.gender || "",
        birth_date: profile?.birth_date || null,
        age_verified: profile?.age_verified || false,
        visual_impairment_status: profile?.visual_impairment_status || "not_specified",
        uses_screen_reader: profile?.uses_screen_reader || false,
        assistive_technology: profile?.assistive_technology || "",
        preferred_reading_mode: profile?.preferred_reading_mode || "both",
        province: profile?.province || "",
        bio: profile?.bio || "",
        created_at: profile?.created_at || user.created_at,
      });
    }

    form.currentPassword = "";
    form.newPassword = "";
    form.confirmPassword = "";
    removeAvatar.value = false;
    resetAvatarSelection();
    isEditOpen.value = false;
    message.value = data?.message || t("profile.saveSuccess");
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || t("profile.saveFailed");
  } finally {
    saving.value = false;
  }
}

async function verifyAgeFromProfile() {
  try {
    verifyingAge.value = true;
    ageVerificationMessage.value = "";
    ageVerificationError.value = "";

    if (!form.birth_date) {
      ageVerificationError.value = "กรุณาบันทึกวันเกิดในโปรไฟล์ก่อนยืนยันอายุ";
      return;
    }

    if (declaredAge.value === null || !Number.isInteger(Number(declaredAge.value))) {
      ageVerificationError.value = "กรุณากรอกอายุเป็นตัวเลข";
      return;
    }

    const { data } = await api.post("/profile/me/verify-age", {
      age: Number(declaredAge.value),
    });

    const profile = data?.profile || null;
    profileMeta.value = profile;
    syncForm(profile);
    ageVerificationMessage.value = data?.message || "ยืนยันอายุสำเร็จ";

    const user = currentUser.value;
    const token = localStorage.getItem("token");
    if (token && user && profile) {
      saveAuth(token, {
        ...user,
        age_verified: Boolean(profile.age_verified),
        birth_date: profile.birth_date || user.birth_date || null,
      });
    }
  } catch (error: any) {
    ageVerificationError.value =
      error?.response?.data?.message || "ยืนยันอายุไม่สำเร็จ";
  } finally {
    verifyingAge.value = false;
  }
}

function goTo(path: string) {
  router.push(path);
}

onMounted(() => {
  loadProfile();
  loadMembershipStatus();
});
onUnmounted(resetAvatarSelection);
</script>

<template>
  <main class="profile-page">
    <section class="profile-hero">
      <div class="avatar-shell" :class="{ 'avatar-shell--member': isMembershipActive }">
        <img v-if="profilePreviewUrl" :src="profilePreviewUrl" :alt="t('profile.avatarAlt')" class="avatar-image" />
        <div v-else class="avatar" aria-hidden="true">
          {{ displayName.slice(0, 1).toUpperCase() }}
        </div>
      </div>
      <div class="hero-copy">
        <h1>{{ displayName }}</h1>
        <span>{{ form.email || t("common.loading") }}</span>
        <div class="hero-meta">
          <strong class="role-pill">{{ roleLabel }}</strong>
          <strong v-if="isMembershipActive" class="membership-pill">
            {{ membershipBadgeLabel }}
          </strong>
          <small>{{ t("profile.memberSince") }} {{ memberSince }}</small>
        </div>
      </div>
      <div class="profile-actions">
        <button type="button" @click="isEditOpen = !isEditOpen">
          {{ isEditOpen ? t("profile.closeForm") : t("profile.editInfo") }}
        </button>
        <button type="button" class="ghost-button" @click="isEditOpen = true">
          {{ t("profile.changeAvatar") }}
        </button>
        <button
          v-if="profilePreviewUrl"
          type="button"
          class="danger-button"
          @click="clearAvatar(); isEditOpen = true"
        >
          {{ t("profile.removeAvatar") }}
        </button>
      </div>
    </section>

    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>

    <section v-if="isEditOpen" class="edit-panel">
      <div class="edit-header">
        <div>
          <h2>{{ t("profile.editTitle") }}</h2>
          <p>{{ t("profile.editDescription") }}</p>
        </div>
      </div>

      <form class="profile-form" @submit.prevent="saveProfile">
        <div class="avatar-editor">
          <div
            class="avatar-preview-card"
            :class="{ 'avatar-preview-card--member': isMembershipActive }"
          >
            <img v-if="profilePreviewUrl" :src="profilePreviewUrl" :alt="t('profile.avatarPreviewAlt')" class="avatar-preview" />
            <div v-else class="avatar-preview fallback-avatar">
              {{ displayName.slice(0, 1).toUpperCase() }}
            </div>
          </div>

          <label class="upload-field">
            <span>{{ t("profile.uploadAvatar") }}</span>
            <input type="file" accept="image/*" @change="handleAvatarChange" />
          </label>

          <label class="full-span">
            <span>{{ t("profile.avatarUrl") }}</span>
            <input
              v-model="form.avatar_url"
              type="url"
              inputmode="url"
              placeholder="https://example.com/avatar.jpg"
              @input="useAvatarUrlInput"
            />
          </label>

          <button type="button" class="ghost-button" @click="clearAvatar">
            {{ t("profile.deleteProfileAvatar") }}
          </button>
        </div>

        <div class="form-main">
          <section class="form-section">
            <div class="section-heading">
              <h3>{{ t("profile.accountInfoTitle") }}</h3>
              <p>{{ t("profile.accountInfoDescription") }}</p>
            </div>

            <div class="field-grid">
              <label>
                <span>{{ t("profile.username") }}</span>
                <input v-model="form.username" type="text" autocomplete="username" :placeholder="t('profile.usernamePlaceholder')" />
                <small>{{ t("profile.usernameHint") }}</small>
              </label>

              <label>
                <span>{{ t("profile.displayName") }}</span>
                <input v-model="form.name" type="text" autocomplete="name" />
              </label>

              <label>
                <span>{{ t("profile.email") }}</span>
                <input v-model="form.email" type="email" autocomplete="email" />
              </label>

              <label>
                <span>{{ t("profile.phone") }}</span>
                <input v-model="form.phone" type="tel" autocomplete="tel" :placeholder="t('profile.phonePlaceholder')" />
              </label>

              <label>
                <span>{{ t("profile.gender") }}</span>
                <select v-model="form.gender">
                  <option value="prefer_not_to_say">{{ t("profile.genderPreferNot") }}</option>
                  <option value="female">{{ t("profile.genderFemale") }}</option>
                  <option value="male">{{ t("profile.genderMale") }}</option>
                  <option value="other">{{ t("profile.genderOther") }}</option>
                </select>
              </label>

              <label>
                <span>{{ t("profile.province") }}</span>
                <input v-model="form.province" type="text" autocomplete="address-level1" :placeholder="t('profile.provincePlaceholder')" />
              </label>

              <label>
                <span>{{ t("profile.status") }}</span>
                <input :value="profileMeta?.status || 'active'" type="text" disabled />
              </label>

              <label class="full-span">
                <span>{{ t("profile.bio") }}</span>
                <textarea
                  v-model="form.bio"
                  rows="4"
                  maxlength="2000"
                  :placeholder="t('profile.bioPlaceholder')"
                />
              </label>
            </div>
          </section>

          <section class="form-section">
            <div class="section-heading">
              <h3>{{ t("profile.ageAccessTitle") }}</h3>
              <p>{{ t("profile.ageAccessDescription") }}</p>
            </div>

            <div class="field-grid">
              <label>
                <span>{{ t("profile.birthDate") }}</span>
                <input v-model="form.birth_date" type="date" autocomplete="bday" />
              </label>

              <div class="age-card">
                <span>{{ t("profile.ageCurrent") }}</span>
                <strong>{{ calculatedAge !== null ? `${calculatedAge} ${t("profile.years")}` : t("profile.noAge") }}</strong>
              </div>

              <div class="age-verification-card full-span" :class="{ verified: ageVerified }">
                <div>
                  <span>สถานะยืนยันอายุ</span>
                  <strong>{{ ageVerificationStatusText }}</strong>
                  <small>
                    {{
                      ageVerified
                        ? "บัญชีนี้ผ่านการยืนยันสำหรับเนื้อหา 18+ แล้ว"
                        : "หากยังไม่ได้ยืนยัน สามารถกรอกอายุเพื่อเทียบกับวันเกิดที่บันทึกไว้"
                    }}
                  </small>
                </div>

                <div v-if="!ageVerified" class="age-verify-form">
                  <label>
                    <span>กรอกอายุปัจจุบัน</span>
                    <input v-model.number="declaredAge" min="0" max="120" type="number" />
                  </label>
                  <button type="button" :disabled="verifyingAge" @click="verifyAgeFromProfile">
                    {{ verifyingAge ? "กำลังตรวจสอบ..." : "ยืนยันอายุ" }}
                  </button>
                </div>

                <p v-if="ageVerificationMessage" class="inline-feedback success">
                  {{ ageVerificationMessage }}
                </p>
                <p v-if="ageVerificationError" class="inline-feedback error">
                  {{ ageVerificationError }}
                </p>
              </div>

              <label>
                <span>{{ t("profile.visualStatus") }}</span>
                <select v-model="form.visual_impairment_status">
                  <option value="not_specified">{{ t("profile.visualNotSpecified") }}</option>
                  <option value="none">{{ t("profile.visualNone") }}</option>
                  <option value="blind">{{ t("profile.visualBlind") }}</option>
                  <option value="low_vision">{{ t("profile.visualLowVision") }}</option>
                  <option value="other">{{ t("profile.visualOther") }}</option>
                  <option value="prefer_not_to_say">{{ t("profile.visualPreferNot") }}</option>
                </select>
              </label>

              <label>
                <span>{{ t("profile.preferredMode") }}</span>
                <select v-model="form.preferred_reading_mode">
                  <option value="both">{{ t("profile.preferredBoth") }}</option>
                  <option value="ebook">{{ t("profile.preferredEbook") }}</option>
                  <option value="audio">{{ t("profile.preferredAudio") }}</option>
                  <option value="not_sure">{{ t("profile.preferredNotSure") }}</option>
                </select>
              </label>

              <label class="checkbox-card full-span">
                <input v-model="form.uses_screen_reader" type="checkbox" />
                <span>
                  {{ t("profile.readingModeCheckbox") }}
                  <small>{{ accessibilitySummary }}</small>
                </span>
              </label>

              <label class="full-span">
                <span>{{ t("profile.assistiveTechnology") }}</span>
                <input
                  v-model="form.assistive_technology"
                  type="text"
                  :placeholder="t('profile.assistiveTechnologyPlaceholder')"
                />
              </label>
            </div>
          </section>

          <section class="password-panel">
            <div class="section-heading">
              <h3>{{ t("profile.passwordTitle") }}</h3>
              <p>{{ t("profile.passwordDescription") }}</p>
            </div>

            <div class="password-grid">
              <label>
                <span>{{ t("profile.currentPassword") }}</span>
                <input v-model="form.currentPassword" type="password" autocomplete="current-password" />
              </label>

              <label>
                <span>{{ t("profile.newPassword") }}</span>
                <input v-model="form.newPassword" type="password" autocomplete="new-password" />
              </label>

              <label>
                <span>{{ t("profile.confirmPassword") }}</span>
                <input v-model="form.confirmPassword" type="password" autocomplete="new-password" />
              </label>
            </div>
          </section>
        </div>

        <div class="field-grid old-profile-fields" aria-hidden="true">
          <label>
            <span>{{ t("profile.displayName") }}</span>
            <input v-model="form.name" type="text" autocomplete="name" />
          </label>

          <label>
            <span>{{ t("profile.email") }}</span>
            <input v-model="form.email" type="email" autocomplete="email" />
          </label>

          <label>
            <span>{{ t("profile.phone") }}</span>
            <input v-model="form.phone" type="tel" autocomplete="tel" :placeholder="t('profile.phonePlaceholder')" />
          </label>

          <label>
            <span>{{ t("profile.status") }}</span>
            <input :value="profileMeta?.status || 'active'" type="text" disabled />
          </label>

          <label class="full-span">
            <span>{{ t("profile.bio") }}</span>
            <textarea
              v-model="form.bio"
              rows="5"
              maxlength="2000"
              :placeholder="t('profile.bioPlaceholder')"
            />
          </label>

          <label>
            <span>{{ t("profile.currentPassword") }}</span>
            <input v-model="form.currentPassword" type="password" autocomplete="current-password" />
          </label>

          <label>
            <span>{{ t("profile.newPassword") }}</span>
            <input v-model="form.newPassword" type="password" autocomplete="new-password" />
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" :disabled="saving">
            {{ saving ? t("profile.savingProfile") : t("profile.saveProfile") }}
          </button>
        </div>
      </form>
    </section>

    <section class="account-shortcuts" :class="{ loading }">
      <div class="shortcut-head">
        <div>
          <h2>{{ t("profile.accountShortcutsTitle") }}</h2>
          <p>{{ t("profile.accountShortcutsDescription") }}</p>
        </div>
      </div>

      <div class="account-grid">
        <article v-for="card in primaryAccountCards" :key="card.to" class="account-card" @click="goTo(card.to)">
          <strong>{{ card.title }}</strong>
          <span>{{ card.text }}</span>
        </article>
      </div>

      <details v-if="secondaryAccountCards.length" class="account-more-menu">
        <summary>
          <span>{{ t("profile.moreMenu") }}</span>
          <small>{{ secondaryAccountCards.length }} {{ t("home.items") }}</small>
        </summary>

        <div class="account-more-list">
          <button
            v-for="card in secondaryAccountCards"
            :key="card.to"
            type="button"
            @click="goTo(card.to)"
          >
            <span>
              <strong>{{ card.title }}</strong>
              <small>{{ card.text }}</small>
            </span>
            <b aria-hidden="true">›</b>
          </button>
        </div>
      </details>
    </section>
  </main>
</template>

<style scoped>
.profile-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--page-block, 32px) var(--page-gutter, 20px) 56px;
}

.profile-hero,
.edit-panel,
.account-card {
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.profile-hero {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  gap: 20px;
  align-items: center;
  padding: 26px;
}

.avatar-shell {
  position: relative;
  display: grid;
  place-items: center;
}
.avatar-shell--member {
  width: 100px;
  height: 100px;
  border: 4px solid transparent;
  border-radius: 34px;
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    conic-gradient(from 210deg, #14b8a6, #99f6e4, #ffd166, #f59e0b, #14b8a6)
      border-box;
  box-shadow:
    0 12px 28px rgba(20, 184, 166, 0.24),
    0 0 30px rgba(245, 158, 11, 0.18);
}
.avatar-shell--member::after,
.avatar-preview-card--member::after {
  content: "";
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 18px;
  height: 18px;
  border: 3px solid var(--surface);
  border-radius: 999px;
  background: linear-gradient(135deg, #ffd166, #f59e0b);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
}

.avatar,
.avatar-image {
  width: 84px;
  height: 84px;
  border-radius: 28px;
}

.avatar {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #00a878, #20b8ad);
  color: #fff;
  font-size: 30px;
  font-weight: 900;
}

.avatar-image {
  object-fit: cover;
  border: 1px solid rgba(15, 118, 110, 0.12);
}
.avatar-shell--member .avatar,
.avatar-shell--member .avatar-image {
  border: 3px solid #fff;
  box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.08);
}

.hero-copy {
  min-width: 0;
}

.eyebrow,
h1 {
  margin: 0;
}

.eyebrow {
  color: var(--primary-strong, var(--primary));
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  color: var(--text-strong);
  font-size: clamp(24px, 3.6vw, 34px);
}

.profile-hero span {
  display: block;
  color: var(--text-muted);
  margin-top: 4px;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  margin-top: 12px;
}

.hero-meta small {
  color: var(--text-muted);
  font-size: 15px;
}

.role-pill {
  display: inline-block;
  border-radius: 999px;
  background: #e8faf6;
  color: #0f766e;
  padding: 6px 10px;
  text-transform: lowercase;
}
.membership-pill {
  border-radius: 999px;
  padding: 7px 12px;
  background: linear-gradient(135deg, #14b8a6, #0f766e 58%, #f59e0b);
  color: #fff;
  box-shadow: 0 8px 18px rgba(15, 118, 110, 0.18);
  font-size: 15px;
}

button {
  min-height: 44px;
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
  opacity: 0.65;
}

.ghost-button {
  background: #e6fffb;
  color: #0f766e;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.danger-button {
  background: #fef2f2;
  color: #dc2626;
}

.alert {
  border-radius: 14px;
  font-weight: 800;
  margin: 18px 0 0;
  padding: 14px;
}

.alert.success {
  background: #f0fdf4;
  color: #15803d;
}

.alert.error {
  background: #fef2f2;
  color: #dc2626;
}

.edit-panel {
  margin-top: 20px;
  padding: 24px;
}

.edit-header h2,
.edit-header p {
  margin: 0;
}

.edit-header h2 {
  color: var(--text-strong);
}

.edit-header p {
  color: var(--text-muted);
  margin-top: 6px;
}

.profile-form {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;
}

.avatar-editor,
.form-main,
.form-section,
.field-grid,
.password-panel {
  display: grid;
  gap: 14px;
}

.avatar-editor {
  align-content: start;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(232, 250, 246, 0.9), rgba(255, 255, 255, 0.95));
  border: 1px solid rgba(15, 118, 110, 0.12);
}

.avatar-preview-card {
  position: relative;
  display: grid;
  place-items: center;
}
.avatar-preview-card--member {
  width: 202px;
  height: 202px;
  border: 5px solid transparent;
  border-radius: 40px;
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    conic-gradient(from 210deg, #14b8a6, #99f6e4, #ffd166, #f59e0b, #14b8a6)
      border-box;
  box-shadow:
    0 14px 30px rgba(20, 184, 166, 0.22),
    0 0 32px rgba(245, 158, 11, 0.16);
}

.avatar-preview {
  width: 180px;
  height: 180px;
  border-radius: 32px;
  object-fit: cover;
  background: var(--surface-soft);
  border: 1px solid var(--border);
}

.fallback-avatar {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #00a878, #20b8ad);
  color: #fff;
  font-size: 32px;
  font-weight: 900;
}

.field-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-section,
.password-panel {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  padding: 16px;
}

.section-heading {
  display: grid;
  gap: 4px;
}

.section-heading h3,
.section-heading p {
  margin: 0;
}

.section-heading h3 {
  color: var(--text-strong);
  font-size: 20px;
}

.section-heading p {
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.55;
}

.password-panel {
  background: linear-gradient(135deg, rgba(232, 250, 246, 0.9), rgba(255, 251, 235, 0.85));
  border-color: rgba(15, 118, 110, 0.18);
}

.password-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.age-card {
  min-height: 72px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 12px;
  background: linear-gradient(135deg, #ecfeff, #f8fafc);
  display: grid;
  align-content: center;
  gap: 4px;
  padding: 12px 14px;
}

.age-card span,
.profile-form small {
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 800;
}

.age-card strong {
  color: var(--primary-strong, var(--primary));
  font-size: 24px;
}

.age-verification-card {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 12px;
  background: #fffbeb;
  padding: 14px;
}

.age-verification-card.verified {
  border-color: rgba(16, 185, 129, 0.32);
  background: #ecfdf5;
}

.age-verification-card > div:first-child,
.age-verify-form {
  display: grid;
  gap: 6px;
}

.age-verification-card span,
.age-verification-card small {
  color: var(--text-muted);
  font-weight: 800;
}

.age-verification-card strong {
  color: var(--text-strong);
  font-size: 18px;
}

.age-verify-form {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.age-verify-form button {
  min-height: 42px;
  border: 0;
  border-radius: 10px;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 900;
  padding: 0 16px;
}

.age-verify-form button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.inline-feedback {
  margin: 0;
  border-radius: 10px;
  font-weight: 800;
  line-height: 1.5;
  padding: 9px 10px;
}

.inline-feedback.success {
  background: #dcfce7;
  color: #047857;
}

.inline-feedback.error {
  background: #fee2e2;
  color: #b91c1c;
}

.checkbox-card {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 12px;
  background: var(--surface-soft);
  padding: 12px 14px;
}

.checkbox-card input {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  accent-color: var(--primary);
}

.checkbox-card span {
  display: grid;
  gap: 3px;
}

.old-profile-fields {
  display: none !important;
}

.profile-form label,
.upload-field {
  display: grid;
  gap: 8px;
  color: var(--text-strong);
  font-weight: 900;
}

.profile-form .checkbox-card {
  display: flex;
  align-items: center;
}

.profile-form input,
.profile-form textarea,
.profile-form select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text-strong);
  padding: 12px 14px;
  font: inherit;
}

.profile-form input,
.profile-form select {
  min-height: 48px;
}

.profile-form .checkbox-card input {
  width: 18px;
  min-height: auto;
  padding: 0;
}

.profile-form textarea {
  min-height: 132px;
  resize: vertical;
}

.profile-form input:disabled {
  opacity: 0.75;
}

.full-span {
  grid-column: 1 / -1;
}

.form-actions {
  grid-column: 2 / -1;
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.account-shortcuts {
  display: grid;
  gap: 16px;
  margin-top: 22px;
}

.account-shortcuts.loading {
  opacity: 0.72;
}

.shortcut-head {
  align-items: end;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.shortcut-head h2,
.shortcut-head p {
  margin: 0;
}

.shortcut-head h2 {
  color: var(--text-strong);
  font-size: 24px;
}

.shortcut-head p {
  color: var(--text-muted);
  font-size: 16px;
}

.account-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.account-card {
  cursor: pointer;
  display: grid;
  gap: 8px;
  min-height: 124px;
  padding: 18px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.account-card:hover {
  border-color: var(--primary);
  box-shadow: 0 16px 34px rgba(15, 118, 110, 0.12);
  transform: translateY(-3px);
}

.account-card strong {
  color: var(--text-strong);
  font-size: 20px;
}

.account-card span {
  color: var(--text-muted);
  line-height: 1.55;
}

.account-more-menu {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.account-more-menu summary {
  align-items: center;
  color: var(--text-strong);
  cursor: pointer;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  list-style: none;
  min-height: 58px;
  padding: 16px 18px;
}

.account-more-menu summary::-webkit-details-marker {
  display: none;
}

.account-more-menu summary span {
  font-size: 18px;
  font-weight: 900;
}

.account-more-menu summary small {
  color: var(--text-muted);
  font-weight: 800;
}

.account-more-menu summary::after {
  color: var(--primary-strong);
  content: "⌄";
  font-size: 20px;
  font-weight: 900;
  transition: transform 0.18s ease;
}

.account-more-menu[open] summary::after {
  transform: rotate(180deg);
}

.account-more-list {
  border-top: 1px solid var(--border);
  display: grid;
}

.account-more-list button {
  align-items: center;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--border);
  color: var(--text-strong);
  cursor: pointer;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  min-height: 66px;
  padding: 12px 18px;
  text-align: left;
}

.account-more-list button:last-child {
  border-bottom: 0;
}

.account-more-list button:hover {
  background: var(--surface-soft);
}

.account-more-list button > span {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.account-more-list strong {
  color: var(--text-strong);
  font-size: 17px;
}

.account-more-list small {
  color: var(--text-muted);
  line-height: 1.45;
}

.account-more-list b {
  color: var(--primary-strong);
  font-size: 24px;
  line-height: 1;
}

.profile-page {
  max-width: 1240px;
  padding-top: 22px;
}

.profile-hero,
.edit-panel,
.account-more-menu,
.account-card {
  border-color: rgba(15, 118, 110, 0.12);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
}

.profile-hero {
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 16px;
  padding: 18px 20px;
}

.avatar,
.avatar-image {
  width: 64px;
  height: 64px;
  border-radius: 18px;
}

.avatar-shell--member {
  width: 72px;
  height: 72px;
  border-width: 3px;
  border-radius: 22px;
}

.avatar {
  font-size: 24px;
}

h1 {
  font-size: clamp(20px, 2vw, 26px);
  line-height: 1.18;
}

.profile-hero span {
  font-size: 13px;
}

.hero-meta {
  gap: 8px;
  margin-top: 10px;
}

.hero-meta small,
.membership-pill {
  font-size: 12px;
}

.role-pill,
.membership-pill {
  padding: 5px 9px;
}

button {
  min-height: 38px;
  border-radius: 10px;
  font-size: 13px;
  padding: 0 14px;
}

.profile-actions {
  gap: 8px;
}

.edit-panel {
  overflow: hidden;
  padding: 0;
}

.edit-header {
  border-bottom: 1px solid rgba(15, 118, 110, 0.1);
  background:
    linear-gradient(135deg, rgba(232, 250, 246, 0.9), rgba(255, 255, 255, 0.95));
  padding: 18px 22px;
}

.edit-header h2 {
  font-size: 20px;
  line-height: 1.25;
}

.edit-header p {
  max-width: 760px;
  font-size: 13px;
  line-height: 1.5;
}

.profile-form {
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  gap: 0;
  margin-top: 0;
}

.avatar-editor {
  position: sticky;
  top: 78px;
  align-self: start;
  gap: 12px;
  min-height: 100%;
  border: 0;
  border-right: 1px solid rgba(15, 118, 110, 0.1);
  border-radius: 0;
  background: #f7fffc;
  padding: 24px;
}

.avatar-preview-card,
.avatar-preview-card--member {
  width: 112px;
  height: 112px;
  justify-self: center;
  border-radius: 28px;
}

.avatar-preview {
  width: 104px;
  height: 104px;
  border-radius: 24px;
}

.fallback-avatar {
  font-size: 28px;
}

.form-main {
  gap: 16px;
  padding: 20px 22px 10px;
}

.form-section,
.password-panel {
  gap: 16px;
  border-color: rgba(15, 118, 110, 0.12);
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
}

.section-heading h3 {
  font-size: 16px;
  line-height: 1.25;
}

.section-heading p {
  font-size: 12px;
  line-height: 1.45;
}

.field-grid {
  gap: 12px 14px;
}

.password-grid {
  gap: 12px;
}

.profile-form label,
.upload-field {
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.profile-form input,
.profile-form select,
.profile-form textarea {
  min-height: 42px;
  border-color: rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  background: #f8fafc;
  font-size: 13px;
  padding: 9px 11px;
}

.profile-form textarea {
  min-height: 104px;
}

.age-card {
  min-height: 62px;
  border-radius: 10px;
  padding: 10px 12px;
}

.age-verify-form {
  grid-template-columns: 1fr;
}

.age-card span,
.profile-form small {
  font-size: 11px;
}

.age-card strong {
  font-size: 18px;
}

.checkbox-card {
  gap: 10px;
  border-radius: 10px;
  background: #f8fffd;
  padding: 10px 12px;
}

.form-actions {
  grid-column: 2 / -1;
  margin: 0;
  padding: 0 22px 20px;
}

.form-actions button {
  min-width: 132px;
  background: #0aa891;
}

.account-shortcuts {
  gap: 14px;
  margin-top: 20px;
}

.shortcut-head h2 {
  font-size: 18px;
}

.shortcut-head p {
  font-size: 13px;
}

.account-grid {
  gap: 12px;
}

.account-card {
  min-height: 96px;
  border-radius: 14px;
  padding: 16px;
}

.account-card strong {
  font-size: 15px;
}

.account-card span {
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 920px) {
  .profile-form {
    grid-template-columns: 1fr;
  }

  .avatar-editor {
    position: static;
    min-height: auto;
    border-right: 0;
    border-bottom: 1px solid rgba(15, 118, 110, 0.1);
  }

  .form-actions {
    grid-column: auto;
  }
}

@media (max-width: 860px) {
  .profile-hero,
  .field-grid,
  .password-grid,
  .account-grid {
    grid-template-columns: 1fr;
  }

  .profile-hero {
    justify-items: start;
  }

  .form-actions {
    justify-content: stretch;
  }

  .form-actions button {
    width: 100%;
  }

  .profile-hero,
  .edit-panel {
    border-radius: 16px;
    padding: 18px;
  }

  .edit-panel {
    padding: 0;
  }

  .avatar-preview {
    width: min(180px, 58vw);
    height: min(180px, 58vw);
  }
}

@media (max-width: 640px) {
  .profile-page {
    padding: 8px 8px 28px;
  }

  .profile-hero,
  .edit-panel {
    border-radius: 12px;
  }

  .profile-hero {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 10px;
    padding: 12px;
  }

  .profile-actions {
    grid-column: 1 / -1;
    width: 100%;
  }

  .profile-actions button {
    flex: 1 1 120px;
  }

  .avatar,
  .avatar-image,
  .avatar-shell--member {
    width: 56px;
    height: 56px;
    border-radius: 18px;
  }

  h1 {
    font-size: 25px;
    line-height: 1.12;
  }

  .hero-meta,
  .edit-header p,
  .section-heading p,
  .profile-form small {
    font-size: 13px;
    line-height: 1.35;
  }

  .profile-form {
    margin-top: 10px;
  }

  .edit-header {
    padding: 14px;
  }

  .avatar-editor,
  .form-main,
  .form-section,
  .field-grid,
  .password-grid,
  .password-panel {
    gap: 7px;
  }

  .avatar-editor,
  .form-section,
  .password-panel {
    border-radius: 10px;
    padding: 12px;
  }

  .avatar-editor {
    grid-template-columns: 64px minmax(0, 1fr);
    align-items: center;
    border-bottom: 1px solid rgba(15, 118, 110, 0.1);
  }

  .avatar-preview-card--member,
  .avatar-preview {
    width: 58px;
    height: 58px;
    border-radius: 16px;
  }

  .field-grid,
  .password-grid {
    grid-template-columns: 1fr;
  }

  .full-span,
  .checkbox-card {
    grid-column: 1 / -1;
  }

  .profile-form label,
  .profile-form .checkbox-card {
    gap: 4px;
    font-size: 13px;
    line-height: 1.25;
  }

  .profile-form input,
  .profile-form textarea,
  .profile-form select {
    min-height: 40px;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
  }

  .profile-form textarea {
    min-height: 84px;
  }

  .form-main {
    padding: 12px;
  }

  .form-actions {
    padding: 0 12px 14px;
  }

  .form-actions button {
    min-height: 38px;
    border-radius: 8px;
    font-size: 14px;
  }
}
</style>
