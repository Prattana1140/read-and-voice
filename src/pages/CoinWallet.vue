<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import api from "../utils/api";

type CoinPackage = {
  id: string;
  coins: number;
  price: number;
  label: string;
};

type Transaction = {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  description?: string;
  created_at?: string;
};

type PendingTopup = {
  topup_id?: number;
  coins?: number;
  amount?: number;
  price?: number;
  checkout_url?: string | null;
  payment_instructions?: string | null;
  payment_status?: string;
  qr_image_url?: string | null;
} | null;

const balance = ref(0);
const packages = ref<CoinPackage[]>([]);
const transactions = ref<Transaction[]>([]);
const loading = ref(true);
const creatingTopup = ref("");
const confirmingTopup = ref(false);
const message = ref("");
const errorMessage = ref("");
const pendingTopup = ref<PendingTopup>(null);
const transferReference = ref("");
const customCoins = ref<number | null>(null);
const payerName = ref("");
const transferAmount = ref<number | null>(null);
const transferDate = ref("");
const transferTime = ref("");
const slipFile = ref<File | null>(null);
const slipPreview = ref("");
const showConfirmModal = ref(false);
const showCustomModal = ref(false);
const showQrModal = ref(false);

const customTopupAmount = computed(() => Number(customCoins.value || 0));
const customTopupInvalid = computed(() => {
  const amount = customTopupAmount.value;
  return !Number.isInteger(amount) || amount <= 0 || amount > 50000;
});

const bankAccount = {
  bankName: "ธนาคารกสิกรไทย",
  accountName: "Read and Voice",
  accountNumber: "xxx-x-xxxxx-x",
};

const transferFormComplete = computed(() => {
  return Boolean(
    payerName.value.trim() &&
      transferReference.value.trim() &&
      transferAmount.value &&
      Number(transferAmount.value) > 0 &&
      transferDate.value &&
      transferTime.value &&
      slipFile.value,
  );
});

const hasPendingManualTopup = computed(() => {
  return Boolean(pendingTopup.value?.topup_id && !pendingTopup.value?.checkout_url);
});

const paymentSummary = computed(() => {
  const coins = Number(pendingTopup.value?.coins || customTopupAmount.value || 0);
  const amount = Number(pendingTopup.value?.amount || pendingTopup.value?.price || coins || 0);
  return { coins, amount };
});

async function loadWallet() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [walletRes, packageRes, txRes] = await Promise.all([
      api.get("/coins/wallet"),
      api.get("/coins/packages"),
      api.get("/coins/transactions"),
    ]);

    balance.value = Number(walletRes.data?.balance || 0);
    packages.value = packageRes.data || [];
    transactions.value = txRes.data || [];
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "โหลดกระเป๋าเหรียญไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function topup(packageId: string) {
  message.value = "";
  errorMessage.value = "";
  pendingTopup.value = null;
  transferReference.value = "";
  payerName.value = "";
  transferAmount.value = null;
  transferDate.value = "";
  transferTime.value = "";
  slipFile.value = null;
  if (slipPreview.value) {
    URL.revokeObjectURL(slipPreview.value);
    slipPreview.value = "";
  }
  creatingTopup.value = packageId;

  try {
    const { data } = await api.post("/coins/topup", { package_id: packageId });
    message.value = data?.message || "สร้างรายการเติมเหรียญสำเร็จ";

    if (data?.payment_status === "pending") {
      pendingTopup.value = {
        topup_id: data.topup_id,
        coins: Number(data.coins || 0),
        amount: Number(data.amount || data.price || 0),
        price: Number(data.price || data.amount || 0),
        checkout_url: data.checkout_url || null,
        payment_instructions: data.payment_instructions || null,
        payment_status: data.payment_status,
        qr_image_url: data.qr_image_url || null,
      };
      transferAmount.value = Number(data.amount || data.price || 0) || null;
      showQrModal.value = !data.checkout_url;
    }

    await loadWallet();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เติมเหรียญไม่สำเร็จ";
  } finally {
    creatingTopup.value = "";
  }
}

async function topupCustom() {
  message.value = "";
  errorMessage.value = "";

  if (customTopupInvalid.value) {
    errorMessage.value = "กรุณาระบุจำนวนเหรียญเป็นจำนวนเต็ม 1-50,000 เหรียญ";
    return;
  }

  pendingTopup.value = null;
  transferReference.value = "";
  payerName.value = "";
  transferAmount.value = null;
  transferDate.value = "";
  transferTime.value = "";
  slipFile.value = null;
  if (slipPreview.value) {
    URL.revokeObjectURL(slipPreview.value);
    slipPreview.value = "";
  }
  creatingTopup.value = "custom";

  try {
    const { data } = await api.post("/coins/topup", { coins: customTopupAmount.value });
    message.value = data?.message || "สร้างรายการเติมเหรียญสำเร็จ";

    if (data?.payment_status === "pending") {
      pendingTopup.value = {
        topup_id: data.topup_id,
        coins: Number(data.coins || 0),
        amount: Number(data.amount || data.price || 0),
        price: Number(data.price || data.amount || 0),
        checkout_url: data.checkout_url || null,
        payment_instructions: data.payment_instructions || null,
        payment_status: data.payment_status,
        qr_image_url: data.qr_image_url || null,
      };
      transferAmount.value = Number(data.amount || data.price || 0) || null;
      showQrModal.value = !data.checkout_url;
    }

    customCoins.value = null;
    await loadWallet();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "เติมเหรียญไม่สำเร็จ";
  } finally {
    creatingTopup.value = "";
  }
}

async function confirmManualTopup() {
  if (!pendingTopup.value?.topup_id || confirmingTopup.value) return;

  message.value = "";
  errorMessage.value = "";

  if (!transferFormComplete.value) {
    errorMessage.value = "กรุณากรอกข้อมูลการโอนให้ครบถ้วนและแนบรูปภาพสลิป";
    return;
  }

  confirmingTopup.value = true;

  try {
    const slip = slipFile.value;
    if (!slip) {
      throw new Error("missing_slip");
    }

    const formData = new FormData();
    formData.append("provider_ref", transferReference.value.trim());
    formData.append("payer_name", payerName.value.trim());
    formData.append("transfer_amount", String(transferAmount.value || ""));
    formData.append("transfer_date", transferDate.value);
    formData.append("transfer_time", transferTime.value);
    formData.append("slip", slip);

    const { data } = await api.patch(`/coins/topups/${pendingTopup.value.topup_id}/confirm`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    message.value = data?.message || "แจ้งโอนแล้ว รอแอดมินอนุมัติ";
    closeConfirmModal();
    pendingTopup.value = null;
    await loadWallet();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || "แจ้งโอนไม่สำเร็จ";
  } finally {
    confirmingTopup.value = false;
  }
}

function openConfirmModal() {
  if (!hasPendingManualTopup.value) return;
  showQrModal.value = false;
  showConfirmModal.value = true;
}

function closeConfirmModal() {
  showConfirmModal.value = false;
  transferReference.value = "";
  payerName.value = "";
  transferAmount.value = null;
  transferDate.value = "";
  transferTime.value = "";
  slipFile.value = null;
  if (slipPreview.value) {
    URL.revokeObjectURL(slipPreview.value);
    slipPreview.value = "";
  }
}

function openCustomModal() {
  message.value = "";
  errorMessage.value = "";
  customCoins.value = null;
  showCustomModal.value = true;
}

function closeCustomModal() {
  showCustomModal.value = false;
  customCoins.value = null;
}

async function submitCustomTopup() {
  await topupCustom();
  if (!errorMessage.value) {
    showCustomModal.value = false;
  }
}

function closeQrModal() {
  showQrModal.value = false;
}

function isQrCellDark(cell: number) {
  const seed = Number(pendingTopup.value?.topup_id || 0);
  const column = (cell - 1) % 12;
  const row = Math.floor((cell - 1) / 12);
  const inTopLeft = row < 3 && column < 3;
  const inTopRight = row < 3 && column > 8;
  const inBottomLeft = row > 8 && column < 3;
  if (inTopLeft || inTopRight || inBottomLeft) return row === 0 || row === 2 || column === 0 || column === 2;
  return (cell * 7 + row * 3 + column + seed) % 5 !== 0;
}

function saveQrImage() {
  if (!pendingTopup.value) return;
  if (pendingTopup.value.qr_image_url) {
    const link = document.createElement("a");
    link.href = pendingTopup.value.qr_image_url;
    link.download = `coin-topup-${pendingTopup.value.topup_id || "qr"}.png`;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
    return;
  }

  const cellSize = 18;
  const cells = Array.from({ length: 144 }, (_item, index) => index + 1)
    .map((cell) => {
      if (!isQrCellDark(cell)) return "";
      const x = ((cell - 1) % 12) * cellSize + 30;
      const y = Math.floor((cell - 1) / 12) * cellSize + 78;
      return `<rect x="${x}" y="${y}" width="${cellSize - 2}" height="${cellSize - 2}" fill="#050505"/>`;
    })
    .join("");
  const amount = paymentSummary.value.amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="430" viewBox="0 0 320 430">
    <rect width="320" height="430" fill="#ffffff"/>
    <rect width="320" height="44" fill="#f58a0a"/>
    <rect x="62" y="20" width="196" height="54" fill="#15466f"/>
    <text x="160" y="52" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">THAI QR PAYMENT</text>
    ${cells}
    <circle cx="160" cy="186" r="19" fill="#ffffff" stroke="#7dd3fc" stroke-width="2"/>
    <text x="160" y="191" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#15466f">QR</text>
    <text x="160" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#15466f">คุณจะได้รับ ${paymentSummary.value.coins} coins</text>
    <rect x="48" y="350" width="224" height="52" fill="#15466f"/>
    <text x="160" y="372" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#ffffff">สแกน QR เพื่อชำระเงิน</text>
    <text x="160" y="394" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">ยอดชำระ ${amount} บาท</text>
  </svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `coin-topup-${pendingTopup.value.topup_id || "qr"}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}

function selectSlip(event: Event) {
  const target = event.target as HTMLInputElement;
  if (slipPreview.value) URL.revokeObjectURL(slipPreview.value);
  slipFile.value = target.files?.[0] || null;
  slipPreview.value = slipFile.value ? URL.createObjectURL(slipFile.value) : "";
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function packageVisualClass(index: number) {
  const variants = ["single", "pair", "trio", "cluster", "stack"];
  return variants[index % variants.length];
}

onMounted(loadWallet);
</script>

<template>
  <main class="wallet-page">
    <section class="hero">
      <div>
        <p class="eyebrow">Read and Voice Coins</p>
        <h1>เติมเหรียญสำหรับซื้อหนังสือและรายตอน</h1>
        <p>
          วิธีที่ง่ายและไม่มีค่าระบบคือโอนผ่าน PromptPay แล้วแจ้งเลขอ้างอิง
          แอดมินจะตรวจสอบก่อนเติมเหรียญเข้ากระเป๋า
        </p>
      </div>

      <div class="balance-card">
        <span>ยอดเหรียญ</span>
        <strong>{{ balance }}</strong>
      </div>
    </section>

    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="errorMessage" class="alert error">{{ errorMessage }}</p>

    <section v-if="pendingTopup" class="pending-panel">
      <div>
        <p class="eyebrow">รอตรวจสอบการชำระเงิน</p>
        <h2>เติม {{ paymentSummary.coins.toLocaleString("th-TH") }} เหรียญ</h2>
        <p v-if="pendingTopup.payment_instructions" class="instruction">
          {{ pendingTopup.payment_instructions }}
        </p>
        <a v-if="pendingTopup.checkout_url" :href="pendingTopup.checkout_url">
          ไปหน้าชำระเงิน
        </a>
        <p class="hint">
          กรุณาโอนยอด {{ paymentSummary.amount.toLocaleString("th-TH") }} บาท แล้วส่งหลักฐานการโอนให้แอดมินตรวจสอบ เมื่ออนุมัติแล้วระบบจะเพิ่มเหรียญเข้ากระเป๋าของคุณทันที
        </p>
      </div>

      <div v-if="hasPendingManualTopup" class="confirm-box">
        <strong>โอนเงินเรียบร้อยแล้ว?</strong>
        <span>กดปุ่มด้านล่างเพื่อกรอกข้อมูลการโอนและแนบสลิป ระบบจะส่งรายการให้แอดมินตรวจสอบ</span>
        <button type="button" @click="openConfirmModal">
          แจ้งโอนเงิน
        </button>
      </div>
    </section>

    <teleport to="body">
      <div v-if="showCustomModal" class="modal-backdrop compact-backdrop" role="presentation" @click.self="closeCustomModal">
        <section class="custom-modal" role="dialog" aria-modal="true" aria-labelledby="custom-modal-title">
          <button type="button" class="plain-close" aria-label="ปิดหน้าต่าง" @click="closeCustomModal">×</button>
          <h2 id="custom-modal-title">กรุณาระบุจำนวน coin ที่ต้องการเติมผ่านช่องทาง</h2>
          <p>"THAI QR PAYMENT"</p>
          <form class="custom-modal-form" @submit.prevent="submitCustomTopup">
            <input
              v-model.number="customCoins"
              type="number"
              min="1"
              max="50000"
              step="1"
              autofocus
              required
              aria-label="จำนวนเหรียญที่ต้องการเติม"
            />
            <small v-if="customCoins && customTopupInvalid">กรุณากรอกจำนวนเต็มตั้งแต่ 1 ถึง 50,000 เหรียญ</small>
            <div>
              <button type="submit" :disabled="Boolean(creatingTopup) || customTopupInvalid">
                {{ creatingTopup === "custom" ? "กำลังสร้างรายการ..." : "ยืนยัน" }}
              </button>
              <button type="button" class="cancel-pill" @click="closeCustomModal">ยกเลิก</button>
            </div>
          </form>
        </section>
      </div>
    </teleport>

    <teleport to="body">
      <div v-if="showQrModal && pendingTopup" class="modal-backdrop qr-backdrop" role="presentation" @click.self="closeQrModal">
        <section class="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
          <button type="button" class="plain-close" aria-label="ปิดหน้าต่าง" @click="closeQrModal">×</button>
          <div class="qr-topbar">
            <strong>THAI QR<br />PAYMENT</strong>
          </div>
          <div class="qr-code" aria-label="QR สำหรับชำระเงิน">
            <img v-if="pendingTopup.qr_image_url" :src="pendingTopup.qr_image_url" alt="Thai QR Payment สำหรับชำระเงิน" />
            <template v-else>
              <span v-for="cell in 144" :key="cell" :class="{ dark: isQrCellDark(cell) }"></span>
              <b>QR</b>
            </template>
          </div>
          <button type="button" class="save-qr-button" @click="saveQrImage">บันทึกรูปภาพ</button>
          <p class="qr-coins">คุณจะได้รับ {{ paymentSummary.coins.toLocaleString("th-TH") }} coins</p>
          <div class="qr-amount">
            <span>สแกน QR เพื่อชำระเงิน</span>
            <strong>ยอดชำระ {{ paymentSummary.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} บาท</strong>
          </div>
          <p class="qr-timer">กรุณาชำระเงินและแจ้งโอนพร้อมแนบสลิป</p>
          <ol>
            <li>เซฟภาพหน้าจอหรือสแกน QR</li>
            <li>เปิดแอปธนาคารของคุณ</li>
            <li>เลือกเมนูสแกน QR หรือโอนเงิน</li>
            <li>หลังโอนเสร็จ กดแจ้งโอนเพื่อให้แอดมินตรวจสอบ</li>
          </ol>
          <button type="button" class="qr-submit" @click="openConfirmModal">แจ้งโอนและแนบสลิป</button>
        </section>
      </div>
    </teleport>

    <teleport to="body">
      <div v-if="showConfirmModal" class="modal-backdrop" role="presentation" @click.self="closeConfirmModal">
        <section
          class="slip-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="slip-modal-title"
        >
          <div class="modal-head">
            <div>
              <p class="eyebrow">ยืนยันการโอนเงิน</p>
              <h2 id="slip-modal-title">แจ้งโอนเติม {{ paymentSummary.coins.toLocaleString("th-TH") }} เหรียญ</h2>
            </div>
            <button type="button" class="close-button" aria-label="ปิดหน้าต่าง" @click="closeConfirmModal">
              ×
            </button>
          </div>

          <p class="modal-note">
            กรุณากรอกข้อมูลให้ครบและแนบรูปภาพสลิป เพื่อให้แอดมินตรวจสอบรายการเติมเหรียญได้เร็วขึ้น
          </p>

          <div class="bank-box">
            <div class="bank-logo" aria-hidden="true">K</div>
            <div>
              <strong>{{ bankAccount.bankName }}</strong>
              <span>{{ bankAccount.accountName }}</span>
              <code>{{ bankAccount.accountNumber }}</code>
            </div>
          </div>

          <form class="slip-form" @submit.prevent="confirmManualTopup">
            <label for="payer-name">
              ชื่อผู้โอน / ชื่อบัญชีที่ใช้โอน
              <input
                id="payer-name"
                v-model.trim="payerName"
                type="text"
                placeholder="เช่น สมชาย ใจดี"
                required
              />
            </label>

            <label for="transfer-amount">
              ยอดโอน
              <div class="amount-input">
                <input
                  id="transfer-amount"
                  v-model.number="transferAmount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0.00"
                  required
                />
                <span>บาท</span>
              </div>
            </label>

            <label for="transfer-date">
              วันที่โอน
              <input
                id="transfer-date"
                v-model="transferDate"
                type="date"
                required
              />
            </label>

            <label for="transfer-time">
              เวลาโอน
              <input
                id="transfer-time"
                v-model="transferTime"
                type="time"
                required
              />
            </label>

            <label for="transfer-reference">
              เลขอ้างอิงหรือเวลาที่โอน
              <input
                id="transfer-reference"
                v-model.trim="transferReference"
                type="text"
                placeholder="เช่น 202605081430 หรือ สลิปเวลา 14:30"
                required
              />
            </label>

            <label for="slip-file" class="slip-upload">
              รูปภาพสลิปการโอน
              <input
                id="slip-file"
                type="file"
                accept="image/*"
                required
                @change="selectSlip"
              />
              <span>รองรับไฟล์รูปภาพ ขนาดไม่เกิน 5MB</span>
            </label>

            <div v-if="slipPreview" class="slip-preview">
              <img :src="slipPreview" alt="ตัวอย่างสลิปการโอน" />
            </div>

            <div class="modal-actions">
              <button type="button" class="ghost-button" @click="closeConfirmModal">ยกเลิก</button>
              <button type="submit" :disabled="confirmingTopup || !transferFormComplete">
                {{ confirmingTopup ? "กำลังส่งข้อมูล..." : "ส่งข้อมูลให้แอดมินตรวจสอบ" }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </teleport>

    <section v-if="loading" class="panel">กำลังโหลดกระเป๋าเหรียญ...</section>

    <template v-else>
      <section class="topup-heading">
        <h1><span aria-hidden="true">✨</span> เติมเหรียญ <span aria-hidden="true">✨</span></h1>
        <p>เลือกแพ็กเกจที่คุณต้องการ</p>
      </section>

      <section class="package-grid" aria-label="แพ็กเกจเติมเหรียญ">
        <article
          v-for="(item, index) in packages"
          :key="item.id"
          class="coin-tile"
        >
          <button
            type="button"
            class="coin-select"
            :disabled="Boolean(creatingTopup)"
            @click="topup(item.id)"
          >
            <span class="coin-art" :class="packageVisualClass(index)" aria-hidden="true">
              <i></i><i></i><i></i><i></i><i></i>
            </span>
            <strong>
              <span class="coin-dot" aria-hidden="true"></span>
              {{ item.coins.toLocaleString("th-TH") }}
            </strong>
            <small>({{ formatMoney(item.price).replace("฿", "") }} บาท)</small>
          </button>
        </article>

        <article class="coin-tile custom-card">
          <button type="button" class="coin-select" :disabled="Boolean(creatingTopup)" @click="openCustomModal">
            <span class="coin-art custom-coin" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
            <strong class="custom-title">กำหนดเอง</strong>
            <small class="custom-price">ระบุจำนวนเหรียญที่ต้องการ</small>
          </button>
        </article>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>ประวัติเหรียญ</h2>
          <button type="button" @click="loadWallet">รีเฟรช</button>
        </div>

        <div v-if="transactions.length === 0" class="empty">ยังไม่มีรายการ</div>
        <div v-else class="tx-list">
          <article v-for="tx in transactions" :key="tx.id">
            <div>
              <strong>{{ tx.description || tx.type }}</strong>
              <span>{{ formatDate(tx.created_at) }}</span>
            </div>
            <div class="tx-amount" :class="{ plus: Number(tx.amount) > 0 }">
              {{ Number(tx.amount) > 0 ? "+" : "" }}{{ tx.amount }}
              <small>คงเหลือ {{ tx.balance_after }}</small>
            </div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.wallet-page {
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--page-block, 24px) var(--page-gutter, 24px);
}

.hero,
.panel,
.coin-tile,
.pending-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.hero {
  align-items: center;
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1fr) 220px;
  margin: 0 auto 20px;
  max-width: 1120px;
  padding: 28px;
}

.eyebrow {
  color: #0f766e;
  font-weight: 900;
  margin: 0 0 8px;
}

h1,
h2 {
  color: var(--text-strong);
  margin: 0;
}

.hero p:not(.eyebrow),
.hint,
.instruction {
  color: var(--text-muted);
  line-height: 1.7;
}

.balance-card {
  background: color-mix(in srgb, var(--text-strong) 92%, #111827);
  border-radius: 8px;
  color: white;
  padding: 20px;
}

.balance-card span,
.balance-card strong {
  display: block;
}

.balance-card strong {
  font-size: 36px;
}

.alert,
.panel,
.package-grid,
.pending-panel {
  margin: 0 auto 16px;
  max-width: 1120px;
}

.alert {
  border-radius: 8px;
  font-weight: 800;
  padding: 12px 14px;
}

.success {
  background: #ecfdf5;
  color: #047857;
}

.error {
  background: #fef2f2;
  color: #dc2626;
}

.pending-panel {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) 360px;
  padding: 20px;
}

.pending-panel a {
  color: #0f766e;
  display: inline-block;
  font-weight: 900;
  margin-top: 8px;
}

.confirm-box {
  align-content: start;
  display: grid;
  gap: 10px;
}

.confirm-box strong,
.confirm-box label {
  color: var(--text-strong);
  font-weight: 900;
}

.confirm-box span {
  color: var(--text-muted);
  line-height: 1.6;
}

.confirm-box input {
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-strong);
  font: inherit;
  min-height: 44px;
  padding: 0 12px;
}

.modal-backdrop {
  align-items: center;
  background: rgba(15, 23, 42, 0.54);
  display: flex;
  inset: 0;
  justify-content: center;
  overflow: auto;
  padding: 18px;
  position: fixed;
  z-index: 1000;
}

.compact-backdrop {
  background: rgba(15, 23, 42, 0.42);
}

.custom-modal {
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.32);
  color: #1f2937;
  padding: 38px 54px 28px;
  position: relative;
  text-align: center;
  width: min(100%, 520px);
}

.plain-close {
  background: transparent;
  color: #6b7280;
  font-size: 34px;
  font-weight: 400;
  line-height: 1;
  padding: 4px;
  position: absolute;
  right: 18px;
  top: 14px;
}

.custom-modal h2 {
  color: #4b5563;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.5;
  margin: 0;
}

.custom-modal p {
  color: #f97316;
  font-size: 20px;
  font-weight: 800;
  margin: -2px 0 18px;
}

.custom-modal-form {
  display: grid;
  gap: 18px;
}

.custom-modal-form input {
  border: 2px solid #111827;
  color: #111827;
  font: inherit;
  font-size: 24px;
  height: 38px;
  padding: 0 10px;
  width: 100%;
}

.custom-modal-form small {
  color: #dc2626;
  font-weight: 800;
}

.custom-modal-form div {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.custom-modal-form button,
.cancel-pill {
  border-radius: 999px;
  min-width: 120px;
}

.custom-modal-form button[type="submit"] {
  background: linear-gradient(180deg, #fb923c, #f97316);
}

.cancel-pill {
  background: #d9d9d9;
  color: #fff;
}

.qr-backdrop {
  align-items: start;
  background: rgba(15, 23, 42, 0.46);
  overflow: auto;
}

.qr-modal {
  background: #fff;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.28);
  color: #111827;
  margin: 16px auto;
  min-height: 760px;
  padding: 0 0 26px;
  position: relative;
  text-align: center;
  width: min(100%, 390px);
}

.qr-topbar {
  align-items: center;
  background: #f58a0a;
  display: flex;
  height: 48px;
  justify-content: center;
}

.qr-topbar strong {
  background: #15466f;
  color: #fff;
  display: block;
  font-size: 20px;
  line-height: 1.05;
  margin-top: 40px;
  padding: 10px 80px;
}

.qr-code {
  background: #fff;
  display: grid;
  gap: 3px;
  grid-template-columns: repeat(12, 1fr);
  height: 270px;
  margin: 90px auto 12px;
  padding: 16px;
  position: relative;
  width: 270px;
}

.qr-code span {
  background: transparent;
  min-height: 16px;
}

.qr-code span.dark {
  background: #050505;
}

.qr-code b {
  align-items: center;
  background: #fff;
  border: 2px solid #7dd3fc;
  border-radius: 999px;
  color: #15466f;
  display: flex;
  font-size: 15px;
  height: 34px;
  justify-content: center;
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 34px;
}

.qr-code img {
  display: block;
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  height: 100%;
  object-fit: contain;
  width: 100%;
}

.save-qr-button {
  background: #fff;
  border: 1px solid #15466f;
  border-radius: 999px;
  color: #15466f;
  font-size: 15px;
  padding: 5px 18px;
}

.qr-coins {
  color: #15466f;
  font-weight: 800;
  margin: 14px 0;
}

.qr-amount {
  background: #15466f;
  color: #fff;
  display: grid;
  font-size: 20px;
  font-weight: 900;
  gap: 4px;
  line-height: 1.35;
  margin: 0 auto;
  padding: 12px;
  width: 272px;
}

.qr-timer {
  color: #dc2626;
  font-weight: 800;
  margin: 18px 0 14px;
}

.qr-modal ol {
  color: #15466f;
  display: inline-grid;
  gap: 5px;
  line-height: 1.6;
  margin: 0 auto 20px;
  padding-left: 22px;
  text-align: left;
  width: 300px;
}

.qr-submit {
  background: linear-gradient(180deg, #fb923c, #f97316);
  border-radius: 999px;
  padding: 12px 28px;
}

.slip-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.28);
  color: var(--text);
  max-height: none;
  overflow: visible;
  padding: 20px;
  width: min(96vw, 920px);
}

.modal-head {
  align-items: start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.modal-head h2 {
  font-size: 24px;
  line-height: 1.25;
}

.close-button {
  align-items: center;
  background: var(--surface-soft);
  color: var(--text-strong);
  display: inline-flex;
  font-size: 30px;
  height: 38px;
  justify-content: center;
  line-height: 1;
  padding: 0;
  width: 38px;
}

.modal-note {
  color: var(--text-muted);
  line-height: 1.55;
  margin: 8px 0 12px;
}

.bank-box {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  display: grid;
  gap: 12px;
  grid-template-columns: 54px 1fr;
  margin-bottom: 12px;
  padding: 10px;
}

.bank-logo {
  align-items: center;
  background: linear-gradient(135deg, #16a34a, #047857);
  border-radius: 8px;
  color: #fff;
  display: flex;
  font-size: 28px;
  font-weight: 900;
  height: 54px;
  justify-content: center;
}

.bank-box strong,
.bank-box span,
.bank-box code {
  display: block;
}

.bank-box strong {
  color: var(--text-strong);
}

.bank-box span,
.bank-box code {
  color: var(--text-muted);
  margin-top: 3px;
}

.bank-box code {
  font-family: inherit;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.slip-form {
  display: grid;
  gap: 12px 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.slip-form label {
  color: var(--text-strong);
  display: grid;
  gap: 6px;
  font-weight: 900;
}

.slip-form input {
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-strong);
  font: inherit;
  min-height: 42px;
  padding: 0 12px;
}

.slip-form label:first-child,
.slip-form label:nth-child(5),
.slip-upload,
.slip-preview,
.modal-actions {
  grid-column: 1 / -1;
}

.amount-input {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  display: grid;
  grid-template-columns: 1fr auto;
  overflow: hidden;
}

.amount-input input {
  border: 0;
  border-radius: 0;
  min-height: 42px;
  text-align: right;
}

.amount-input span {
  color: var(--text-muted);
  font-weight: 900;
  padding: 0 12px;
}

.slip-upload {
  border: 1px dashed color-mix(in srgb, #14b8a6 42%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, #14b8a6 5%, var(--surface));
  padding: 10px 12px;
}

.slip-upload span {
  color: var(--text-muted);
  font-size: 15px;
  font-weight: 700;
}

.slip-preview {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  max-height: 160px;
  overflow: hidden;
}

.slip-preview img {
  display: block;
  max-height: 160px;
  object-fit: contain;
  width: 100%;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 0;
}

.ghost-button {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.package-grid {
  display: grid;
  gap: 28px;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  padding: 8px 0 30px;
}

.coin-tile {
  align-items: center;
  display: grid;
  border-color: #eef2f7;
  border-radius: 18px;
  min-height: 294px;
  overflow: hidden;
  padding: 0;
  position: relative;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.topup-heading {
  margin: 0 auto 24px;
  max-width: 1120px;
  text-align: center;
}

.topup-heading h1 {
  color: #171b2e;
  font-size: clamp(34px, 4vw, 48px);
  font-weight: 1000;
  letter-spacing: 0;
}

.topup-heading p {
  color: #8a94a6;
  font-size: 20px;
  font-weight: 900;
  margin: 6px 0 0;
}

.coin-tile:hover {
  border-color: rgba(251, 146, 60, 0.72);
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.1);
  transform: translateY(-3px);
}

.coin-select {
  align-items: center;
  background:
    radial-gradient(circle at 50% 34%, rgba(255, 248, 225, 0.95), transparent 30%),
    radial-gradient(circle at 50% 76%, rgba(245, 158, 11, 0.07), transparent 26%),
    linear-gradient(180deg, #ffffff 0%, #fffdf9 100%);
  border: 0;
  color: inherit;
  display: grid;
  gap: 8px;
  height: 100%;
  justify-items: center;
  padding: 24px 24px 20px;
  width: 100%;
}

.coin-select:disabled {
  cursor: wait;
  opacity: 0.72;
}

.coin-select strong,
.custom-title {
  align-items: center;
  color: #171b2e;
  display: flex;
  font-size: clamp(34px, 4vw, 44px);
  font-weight: 1000;
  gap: 8px;
  line-height: 1.2;
}

.coin-select small,
.custom-price {
  color: var(--text-muted);
  font-size: 20px;
  font-weight: 900;
}

.coin-dot {
  background:
    radial-gradient(circle at 30% 30%, #fff8c7 0 18%, transparent 19%),
    radial-gradient(circle at 50% 50%, #ffe45c 0 48%, #f59e0b 62%, #b45309 100%);
  border: 1px solid #f7b51d;
  border-radius: 999px;
  box-shadow:
    inset -2px -2px 0 rgba(146, 64, 14, 0.22),
    0 3px 8px rgba(245, 158, 11, 0.24);
  height: 22px;
  width: 22px;
}

.coin-art {
  display: block;
  height: 136px;
  margin-bottom: 2px;
  position: relative;
  width: 214px;
}

.coin-art::before,
.coin-art::after {
  content: "";
  position: absolute;
  pointer-events: none;
}

.coin-art::before {
  inset: 10px 22px 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 18% 44%, #fbbf24 0 2px, transparent 3px),
    radial-gradient(circle at 86% 20%, #facc15 0 2px, transparent 3px),
    radial-gradient(circle at 78% 72%, #fde68a 0 2px, transparent 3px);
  opacity: 0.78;
}

.coin-art::after {
  left: 34px;
  right: 34px;
  bottom: 6px;
  height: 18px;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgba(15, 23, 42, 0.18), transparent 68%);
  filter: blur(1px);
}

.coin-art i {
  background:
    radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.94) 0 8%, transparent 9%),
    radial-gradient(circle at 50% 50%, transparent 0 40%, rgba(154, 69, 8, 0.17) 41% 45%, transparent 46%),
    linear-gradient(145deg, #fff6a3 0%, #ffd64d 32%, #f59e0b 66%, #9a4308 100%);
  border: 2px solid #f8b51b;
  border-radius: 50%;
  box-shadow:
    inset -7px -8px 0 rgba(146, 64, 14, 0.2),
    inset 5px 5px 0 rgba(255, 255, 255, 0.34),
    0 14px 18px rgba(146, 64, 14, 0.18);
  display: block;
  height: 66px;
  position: absolute;
  transform: rotate(-12deg);
  width: 66px;
  z-index: 1;
}

.coin-art i::before {
  content: "";
  position: absolute;
  inset: 18%;
  border: 2px solid rgba(146, 64, 14, 0.28);
  border-radius: 50%;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.34);
}

.coin-art i::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 42%;
  height: 28%;
  transform: translate(-50%, -36%);
  background: linear-gradient(180deg, #ffe27a, #b45309);
  clip-path: polygon(8% 82%, 8% 42%, 29% 61%, 46% 22%, 62% 61%, 84% 41%, 84% 82%);
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.45));
  opacity: 0.82;
}

.coin-art.single i:nth-child(1) {
  height: 112px;
  left: 58px;
  top: 8px;
  transform: rotate(-18deg);
  width: 112px;
  z-index: 2;
}

.coin-art.single i:nth-child(2) {
  display: none;
}

.coin-art.single i:nth-child(n + 2) { display: none; }

.coin-art.pair i:nth-child(1) { left: 46px; top: 58px; transform: rotate(-14deg); }
.coin-art.pair i:nth-child(2) { left: 82px; top: 20px; height: 98px; transform: rotate(8deg); width: 98px; z-index: 2; }
.coin-art.pair i:nth-child(n + 3) { display: none; }

.coin-art.trio i:nth-child(1) { left: 32px; top: 62px; transform: rotate(-18deg); }
.coin-art.trio i:nth-child(2) { left: 74px; top: 22px; height: 96px; transform: rotate(-4deg); width: 96px; z-index: 3; }
.coin-art.trio i:nth-child(3) { left: 124px; top: 60px; transform: rotate(16deg); }
.coin-art.trio i:nth-child(n + 4) { display: none; }

.coin-art.cluster i:nth-child(1) { left: 40px; top: 72px; transform: rotate(-14deg); z-index: 1; }
.coin-art.cluster i:nth-child(2) { left: 66px; top: 46px; transform: rotate(-6deg); z-index: 2; }
.coin-art.cluster i:nth-child(3) { left: 100px; top: 46px; transform: rotate(7deg); z-index: 2; }
.coin-art.cluster i:nth-child(4) { left: 128px; top: 72px; transform: rotate(16deg); z-index: 1; }
.coin-art.cluster i:nth-child(5) { left: 80px; top: 76px; height: 78px; transform: rotate(-2deg); width: 78px; z-index: 4; }

.coin-art.stack i:nth-child(1) { left: 38px; top: 84px; transform: rotate(-6deg); }
.coin-art.stack i:nth-child(2) { left: 66px; top: 68px; transform: rotate(3deg); }
.coin-art.stack i:nth-child(3) { left: 94px; top: 54px; transform: rotate(-5deg); }
.coin-art.stack i:nth-child(4) { left: 120px; top: 76px; transform: rotate(7deg); }
.coin-art.stack i:nth-child(5) { left: 80px; top: 36px; height: 88px; transform: rotate(-10deg); width: 88px; z-index: 4; }

.custom-card {
  border-color: var(--border);
  justify-items: center;
  text-align: center;
}

.custom-coin::before {
  inset: 4px 34px 8px;
  border: 2px solid rgba(245, 158, 11, 0.34);
  border-top-color: transparent;
  border-radius: 50%;
}

.custom-coin i:nth-child(1) {
  height: 112px;
  left: 52px;
  top: 6px;
  width: 112px;
  z-index: 3;
}

.custom-coin i:nth-child(2),
.custom-coin i:nth-child(3) {
  display: none;
}

button {
  border: 0;
  border-radius: 8px;
  background: #14b8a6;
  color: white;
  cursor: pointer;
  font-weight: 900;
  padding: 11px 14px;
}

button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.panel {
  padding: 20px;
}

.panel-head {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 14px;
}

.tx-list {
  display: grid;
  gap: 10px;
}

.tx-list article {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  padding: 14px;
}

.tx-list span,
.tx-amount small {
  color: var(--text-muted);
  display: block;
}

.tx-amount {
  color: #dc2626;
  font-weight: 900;
  text-align: right;
}

.tx-amount.plus {
  color: #047857;
}

.empty {
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .package-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 760px) {
  .hero,
  .pending-panel {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .balance-card strong {
    font-size: 32px;
  }

  .package-grid {
    grid-template-columns: 1fr;
  }

  .modal-backdrop {
    align-items: end;
    padding: 10px;
  }

  .slip-modal {
    border-radius: 14px 14px 8px 8px;
    max-height: 94vh;
    overflow: auto;
    padding: 16px;
  }

  .slip-form {
    grid-template-columns: 1fr;
  }

  .modal-head h2 {
    font-size: 22px;
  }

  .modal-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .panel-head,
  .tx-list article {
    align-items: flex-start;
    flex-direction: column;
  }

  .tx-amount {
    text-align: left;
  }
}
</style>
