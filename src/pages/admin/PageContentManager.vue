<template>
  <div class="admin-page-content">
    <header class="page-hero">
      <div>
        <p>Admin content center</p>
        <h1>จัดข้อมูลหน้าเมนู</h1>
        <span>
          ตรวจว่าหน้าแรก, อีบุ๊ก, รายตอน, ขายดี, มาใหม่, โปรโมชั่น,
          ฟรีกระจาย, ฮิตขึ้นหิ้ง, แนะนำ และสมัครรายเดือน ต้องเติมข้อมูลอะไรบ้าง
        </span>
      </div>

      <div class="hero-actions">
        <router-link to="/admin/upload-book">เพิ่มหนังสือ</router-link>
        <router-link to="/admin/books">จัดการหนังสือ</router-link>
      </div>
    </header>

    <section class="summary-grid" aria-label="สรุปข้อมูลในระบบ">
      <article>
        <strong>{{ totalBooks }}</strong>
        <span>หนังสือทั้งหมด</span>
      </article>
      <article>
        <strong>{{ paidBooks.length }}</strong>
        <span>หนังสือแบบขาย</span>
      </article>
      <article>
        <strong>{{ freeBooks.length }}</strong>
        <span>หนังสือฟรี</span>
      </article>
      <article>
        <strong>{{ readyPages }}</strong>
        <span>หน้าที่พร้อมใช้งาน</span>
      </article>
    </section>

    <section class="admin-note">
      <h2>สิ่งที่แอดมินต้องจัดการ</h2>
      <p>
        หน้านี้รวมงานที่ต้องเติมลงแต่ละเมนูหน้าเว็บไว้ในที่เดียว
        ตอนนี้ระบบอ้างอิงจากข้อมูลหนังสือที่มีจริง หากเมนูไหนขึ้นว่า
        “ควรเพิ่มข้อมูล” ให้กดปุ่มด้านขวาเพื่อไปเพิ่มหรือแก้ไขข้อมูลทันที
      </p>
    </section>

    <section class="banner-manager">
      <div class="banner-form">
        <h2>รูปภาพหน้า สมัครรายเดือน</h2>
        <p>
          อัปโหลดรูปภาพแบนเนอร์สมาชิกพิเศษ หรือวางลิงก์รูปภาพ
          ภาพนี้จะแสดงแทนกล่องสีแดงด้านบนของหน้าสมัครรายเดือน
        </p>

        <label>
          ลิงก์รูปภาพ
          <input
            v-model="subscriptionHeroUrl"
            type="url"
            placeholder="https://example.com/banner.jpg"
          />
        </label>

        <label>
          อัปโหลดรูปภาพ
          <input type="file" accept="image/*" @change="selectHeroFile" />
        </label>

        <div class="banner-actions">
          <button type="button" :disabled="savingHero" @click="saveSubscriptionHero">
            {{ savingHero ? "กำลังบันทึก..." : "บันทึกรูปภาพ" }}
          </button>
          <button type="button" class="ghost" :disabled="savingHero" @click="clearSubscriptionHero">
            ลบรูปภาพ
          </button>
        </div>

        <p v-if="contentMessage" class="content-message">{{ contentMessage }}</p>
      </div>

      <div class="banner-preview">
        <img
          v-if="subscriptionHeroPreview"
          :src="subscriptionHeroPreview"
          alt="ตัวอย่างรูปภาพหน้า สมัครรายเดือน"
        />
        <div v-else class="empty-preview">
          <strong>ช่องรูปภาพ</strong>
          <span>ยังไม่มีรูปจากแอดมิน ระบบจะแสดงดีไซน์ fallback เดิม</span>
        </div>
      </div>
    </section>

    <section class="banner-manager">
      <div class="banner-form">
        <h2>แบนเนอร์โปรโมชั่นหน้าแรก</h2>
        <p>
          เพิ่มภาพโปรโมตแนวกว้างสำหรับนิยายหรือหนังสือ ภาพเหล่านี้จะแสดงในสไลด์หน้าแรก
          และควรมีข้อความหรือดีไซน์แคมเปญอยู่ในภาพเรียบร้อยแล้ว
        </p>

        <label>
          ชื่อแบนเนอร์
          <input v-model="homeBannerTitle" type="text" placeholder="ชื่อแคมเปญ" />
        </label>

        <label>
          ลิงก์ปลายทาง
          <input v-model="homeBannerLink" type="text" placeholder="/book/1 or /promotions" />
        </label>

        <label>
          ลิงก์รูปภาพ
          <input v-model="homeBannerUrl" type="url" placeholder="https://example.com/promo.jpg" />
          <small class="image-size-hint">ขนาดภาพแนะนำ: 1200 x 360 px หรือ 1600 x 480 px</small>
        </label>

        <label>
          อัปโหลดรูปภาพ
          <input type="file" accept="image/*" @change="selectHomeBannerFile" />
          <small class="image-size-hint">ขนาดภาพแนะนำ: 1200 x 360 px หรือ 1600 x 480 px</small>
        </label>

        <div class="banner-actions">
          <button type="button" :disabled="savingHomeBanner" @click="saveHomeBanner">
            {{ savingHomeBanner ? "กำลังบันทึก..." : "เพิ่มแบนเนอร์หน้าแรก" }}
          </button>
        </div>

        <p v-if="homeBannerMessage" class="content-message">{{ homeBannerMessage }}</p>
      </div>

      <div class="home-banner-list">
        <article v-for="banner in homeBannerList" :key="banner.id" class="home-banner-item">
          <img :src="resolveImageUrl(banner.image_url)" :alt="banner.title || 'แบนเนอร์หน้าแรก'" />
          <div>
            <strong>{{ banner.title || "ยังไม่ได้ตั้งชื่อแบนเนอร์" }}</strong>
            <small>{{ banner.link_url || "ยังไม่มีลิงก์" }}</small>
          </div>
          <button type="button" @click="deleteHomeBanner(banner.id)">ลบ</button>
        </article>

        <div v-if="homeBannerList.length === 0" class="empty-preview">
          <strong>ยังไม่มีแบนเนอร์หน้าแรก</strong>
          <span>เพิ่มภาพโปรโมตเพื่อแสดงสไลด์บนหน้าแรก</span>
        </div>
      </div>
    </section>

    <section class="content-table" aria-label="รายการหน้าเมนูที่ต้องจัดข้อมูล">
      <div class="table-head">
        <span>หน้าเมนู</span>
        <span>ข้อมูลที่ต้องมี</span>
        <span>สถานะ</span>
        <span>จัดการ</span>
      </div>

      <article v-for="page in menuPages" :key="page.path" class="menu-row">
        <div class="menu-name">
          <strong>{{ page.title }}</strong>
          <small>{{ page.path }}</small>
        </div>

        <ul>
          <li v-for="task in page.tasks" :key="task">{{ task }}</li>
        </ul>

        <div class="status-area">
          <span class="status" :class="page.statusClass">{{ page.statusText }}</span>
          <small>{{ page.current }} / {{ page.target }} รายการ</small>
        </div>

        <div class="row-actions">
          <router-link :to="page.path">ดูหน้า</router-link>
          <router-link :to="page.manageTo">{{ page.manageLabel }}</router-link>
        </div>
      </article>
    </section>

    <section class="next-steps">
      <h2>งานที่ควรทำต่อเพื่อให้ขายได้จริง</h2>
      <div class="step-grid">
        <article>
          <strong>1. ตั้งค่าสถานะหนังสือ</strong>
          <p>กำหนดหนังสือขายดี, แนะนำ, โปรโมชัน และฟรีให้ชัดในฐานข้อมูล</p>
        </article>
        <article>
          <strong>2. เพิ่มระบบจัด banner</strong>
          <p>ทำตารางหรือ API สำหรับเลือกภาพ banner ของหน้าแรกและหน้าโปรโมชั่น</p>
        </article>
        <article>
          <strong>3. เติมรายการรายตอน</strong>
          <p>หน้า /serials และ API รายตอนพร้อมใช้งานแล้ว ควรเพิ่ม serial ให้ครบพอสำหรับแท็บและหมวดหมู่</p>
        </article>
      </div>
    </section>

    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import api, { API_BASE_URL } from "../../utils/api";

type Book = {
  id: number;
  title?: string;
  author?: string;
  price?: number | string | null;
  total_pages?: number | string | null;
  content_type?: string | null;
  created_at?: string | null;
};

type MenuPage = {
  title: string;
  path: string;
  target: number;
  current: number;
  tasks: string[];
  manageTo: string;
  manageLabel: string;
  statusText: string;
  statusClass: "ready" | "warning" | "danger";
};

type PageContent = {
  subscriptionHero?: {
    image_url?: string;
    updated_at?: string | null;
  };
  homeBanners?: HomeBanner[];
};

type HomeBanner = {
  id: string;
  image_url: string;
  title?: string;
  link_url?: string;
  sort_order?: number;
  is_active?: boolean;
};

type ShelfResponse = {
  books?: Book[];
  count?: number;
};

const books = ref<Book[]>([]);
const serialBooks = ref<Book[]>([]);
const pageContent = ref<PageContent | null>(null);
const subscriptionHeroUrl = ref("");
const subscriptionHeroFile = ref<File | null>(null);
const subscriptionHeroFilePreview = ref("");
const contentMessage = ref("");
const savingHero = ref(false);
const homeBannerList = ref<HomeBanner[]>([]);
const homeBannerTitle = ref("");
const homeBannerLink = ref("");
const homeBannerUrl = ref("");
const homeBannerFile = ref<File | null>(null);
const homeBannerMessage = ref("");
const savingHomeBanner = ref(false);
const errorMessage = ref("");

const totalBooks = computed(() => books.value.length);
const paidBooks = computed(() =>
  books.value.filter((book) => Number(book.price || 0) > 0),
);
const freeBooks = computed(() =>
  books.value.filter((book) => Number(book.price || 0) <= 0),
);
const longBooks = computed(() =>
  books.value.filter((book) => Number(book.total_pages || 0) >= 50),
);
const serialReadyCount = computed(() => {
  if (serialBooks.value.length > 0) return serialBooks.value.length;
  return books.value.filter((book) => book.content_type === "serial").length;
});
const recentBooks = computed(() => {
  return [...books.value].sort((a, b) => {
    return (
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    );
  });
});

const getStatus = (current: number, target: number) => {
  if (current >= target) {
    return {
      statusText: "พร้อมใช้งาน",
      statusClass: "ready" as const,
    };
  }

  if (current > 0) {
    return {
      statusText: "ควรเพิ่มข้อมูล",
      statusClass: "warning" as const,
    };
  }

  return {
    statusText: "ต้องทำต่อ",
    statusClass: "danger" as const,
  };
};

const buildPage = (
  page: Omit<MenuPage, "statusText" | "statusClass">,
): MenuPage => {
  return {
    ...page,
    ...getStatus(page.current, page.target),
  };
};

const menuPages = computed<MenuPage[]>(() => [
  buildPage({
    title: "หน้าแรก",
    path: "/",
    target: 20,
    current: totalBooks.value,
    tasks: [
      "มีหนังสืออย่างน้อย 20 เล่มสำหรับแบ่งเป็นหลายแถว",
      "มีหนังสืออย่างน้อย 6 เล่มสำหรับสไลด์ banner อัตโนมัติ",
      "ตรวจปกหนังสือให้ครบก่อนโชว์หน้าแรก",
    ],
    manageTo: "/admin/books",
    manageLabel: "จัดหนังสือ",
  }),
  buildPage({
    title: "อีบุ๊ก",
    path: "/store",
    target: 12,
    current: totalBooks.value,
    tasks: [
      "มีรายการหนังสือหลักให้ค้นหาได้",
      "ตรวจชื่อผู้เขียน ราคา หมวดหมู่ และรูปปก",
      "เชื่อมไปหน้ารายละเอียดและหน้าอ่านได้ถูกต้อง",
    ],
    manageTo: "/admin/books",
    manageLabel: "จัดหนังสือ",
  }),
  buildPage({
    title: "รายตอน",
    path: "/serials",
    target: 6,
    current: serialReadyCount.value,
    tasks: [
      "มีหนังสือแบบรายตอนอย่างน้อย 6 เรื่อง",
      "ตรวจราคา/สิทธิ์อ่านรายตอน และจำนวนตอนที่เผยแพร่",
      "หน้า /serials แยกจากอีบุ๊กแล้ว ควรเติมรายการ serial ให้พอสำหรับจัดหมวดและแท็บ",
    ],
    manageTo: "/admin/upload-book",
    manageLabel: "เพิ่มรายตอน",
  }),
  buildPage({
    title: "ขายดี",
    path: "/best-sellers",
    target: 15,
    current: Math.min(totalBooks.value, 15),
    tasks: [
      "มีหนังสืออย่างน้อย 15 เล่ม",
      "ควรเพิ่ม field ยอดขายหรือจำนวนการอ่านเพื่อเรียงขายดีจริง",
      "ตรวจป้ายขายดีให้แสดงเฉพาะเล่มที่เหมาะสม",
    ],
    manageTo: "/admin/books",
    manageLabel: "จัดอันดับ",
  }),
  buildPage({
    title: "มาใหม่",
    path: "/new-releases",
    target: 15,
    current: Math.min(recentBooks.value.length, 15),
    tasks: [
      "มีหนังสือใหม่อย่างน้อย 15 เล่ม",
      "ตรวจ created_at เพื่อให้เรียงจากใหม่ไปเก่า",
      "อัปโหลดปกให้ครบก่อนปล่อยหน้าใหม่",
    ],
    manageTo: "/admin/upload-book",
    manageLabel: "เพิ่มหนังสือใหม่",
  }),
  buildPage({
    title: "โปรโมชั่น",
    path: "/promotions",
    target: 10,
    current: paidBooks.value.length,
    tasks: [
      "มีหนังสือแบบขายอย่างน้อย 10 เล่ม",
      "ควรเพิ่ม field ราคาเต็ม ราคาโปร และวันหมดโปร",
      "ควรเพิ่ม banner โปรโมชั่นแยกจากหนังสือทั่วไป",
    ],
    manageTo: "/admin/books",
    manageLabel: "จัดโปร",
  }),
  buildPage({
    title: "ฟรีกระจาย",
    path: "/free-books",
    target: 15,
    current: freeBooks.value.length,
    tasks: [
      "มีหนังสือฟรีอย่างน้อย 15 เล่ม",
      "ตรวจราคาให้เป็น 0 หรือฟรี",
      "แบ่งกลุ่มหนังสือฟรีตามหมวดหมู่ให้ชัด",
    ],
    manageTo: "/admin/books",
    manageLabel: "จัดหนังสือฟรี",
  }),
  buildPage({
    title: "ฮิตขึ้นหิ้ง",
    path: "/hall-of-fame",
    target: 10,
    current: longBooks.value.length || Math.min(totalBooks.value, 10),
    tasks: [
      "คัดเล่มที่มีเนื้อหาเยอะหรือมีคุณภาพสูง",
      "ควรเพิ่ม field คะแนน/ยอดอ่านเพื่อจัดอันดับถาวร",
      "ตรวจป้ายขายดีหรือรางวัลให้ตรงกับเล่มจริง",
    ],
    manageTo: "/admin/books",
    manageLabel: "จัดรายการ",
  }),
  buildPage({
    title: "แนะนำ",
    path: "/recommended",
    target: 15,
    current: Math.min(totalBooks.value, 15),
    tasks: [
      "เลือกหนังสือแนะนำอย่างน้อย 15 เล่ม",
      "ควรเพิ่มช่องข้อมูลแนะนำหรือบรรณาธิการเลือกในระบบหลังบ้าน",
      "ตรวจหมวดหมู่ให้หลากหลาย ไม่ซ้ำแนวเกินไป",
    ],
    manageTo: "/admin/books",
    manageLabel: "เลือกเล่มแนะนำ",
  }),
  buildPage({
    title: "สมัครรายเดือน",
    path: "/subscription-plans",
    target: 3,
    current: 3,
    tasks: [
      "มีแพ็กเกจสมาชิกพิเศษ 30, 90 และ 365 วัน",
      "ตรวจราคาและสิทธิประโยชน์ให้ตรงกับระบบหลังบ้าน",
      "ทดสอบ flow สมัครสมาชิกและสถานะหลังชำระเงิน",
    ],
    manageTo: "/subscription-plans",
    manageLabel: "ดูแพ็กเกจ",
  }),
]);

const readyPages = computed(() => {
  return menuPages.value.filter((page) => page.statusClass === "ready").length;
});

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
};

const subscriptionHeroPreview = computed(() => {
  return subscriptionHeroFilePreview.value || resolveImageUrl(subscriptionHeroUrl.value);
});

const fetchBooks = async () => {
  errorMessage.value = "";

  try {
    const response = await api.get("/books");
    const data = response.data;

    if (Array.isArray(data)) {
      books.value = data;
      return;
    }

    if (Array.isArray(data?.books)) {
      books.value = data.books;
      return;
    }

    books.value = [];
  } catch (error: unknown) {
    books.value = [];
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "โหลดข้อมูลหนังสือไม่สำเร็จ";
  }
};

const fetchSerialBooks = async () => {
  try {
    const { data } = await api.get<ShelfResponse>("/serials");
    serialBooks.value = Array.isArray(data?.books) ? data.books : [];
  } catch {
    serialBooks.value = [];
  }
};

const fetchPageContent = async () => {
  try {
    const { data } = await api.get("/page-content");
    pageContent.value = data || null;
    subscriptionHeroUrl.value = data?.subscriptionHero?.image_url || "";
    homeBannerList.value = Array.isArray(data?.homeBanners) ? data.homeBanners : [];
  } catch (error: unknown) {
    pageContent.value = null;
    homeBannerList.value = [];
  }
};

const selectHeroFile = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (subscriptionHeroFilePreview.value) {
    URL.revokeObjectURL(subscriptionHeroFilePreview.value);
  }

  subscriptionHeroFile.value = target.files?.[0] || null;
  subscriptionHeroFilePreview.value = subscriptionHeroFile.value
    ? URL.createObjectURL(subscriptionHeroFile.value)
    : "";
};

const selectHomeBannerFile = (event: Event) => {
  const target = event.target as HTMLInputElement;
  homeBannerFile.value = target.files?.[0] || null;
};

const saveHomeBanner = async () => {
  homeBannerMessage.value = "";
  savingHomeBanner.value = true;

  try {
    const formData = new FormData();
    formData.append("title", homeBannerTitle.value.trim());
    formData.append("link_url", homeBannerLink.value.trim());

    if (homeBannerFile.value) {
      formData.append("home_banner", homeBannerFile.value);
    } else {
      formData.append("image_url", homeBannerUrl.value.trim());
    }

    const { data } = await api.post("/page-content/home-banners", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    homeBannerList.value = Array.isArray(data?.homeBanners) ? data.homeBanners : [];
    homeBannerTitle.value = "";
    homeBannerLink.value = "";
    homeBannerUrl.value = "";
    homeBannerFile.value = null;
    homeBannerMessage.value = data?.message || "บันทึกแบนเนอร์หน้าแรกสำเร็จ";
  } catch (error: any) {
    homeBannerMessage.value =
      error?.response?.data?.message || "บันทึกแบนเนอร์หน้าแรกไม่สำเร็จ";
  } finally {
    savingHomeBanner.value = false;
  }
};

const deleteHomeBanner = async (id: string) => {
  homeBannerMessage.value = "";
  savingHomeBanner.value = true;

  try {
    const { data } = await api.delete(`/page-content/home-banners/${id}`);
    homeBannerList.value = Array.isArray(data?.homeBanners) ? data.homeBanners : [];
    homeBannerMessage.value = data?.message || "ลบแบนเนอร์หน้าแรกสำเร็จ";
  } catch (error: any) {
    homeBannerMessage.value =
      error?.response?.data?.message || "ลบแบนเนอร์หน้าแรกไม่สำเร็จ";
  } finally {
    savingHomeBanner.value = false;
  }
};

const saveSubscriptionHero = async () => {
  contentMessage.value = "";
  savingHero.value = true;

  try {
    const formData = new FormData();
    if (subscriptionHeroFile.value) {
      formData.append("image", subscriptionHeroFile.value);
    } else {
      formData.append("image_url", subscriptionHeroUrl.value.trim());
    }

    const { data } = await api.post("/page-content/subscription-hero", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    pageContent.value = {
      ...(pageContent.value || {}),
      subscriptionHero: data.subscriptionHero,
    };
    subscriptionHeroUrl.value = data.subscriptionHero?.image_url || "";
    subscriptionHeroFile.value = null;
    subscriptionHeroFilePreview.value = "";
    contentMessage.value = data.message || "บันทึกรูปภาพสำเร็จ";
  } catch (error: any) {
    contentMessage.value =
      error?.response?.data?.message || "บันทึกรูปภาพไม่สำเร็จ";
  } finally {
    savingHero.value = false;
  }
};

const clearSubscriptionHero = async () => {
  contentMessage.value = "";
  savingHero.value = true;

  try {
    const { data } = await api.delete("/page-content/subscription-hero");
    subscriptionHeroUrl.value = "";
    subscriptionHeroFile.value = null;
    subscriptionHeroFilePreview.value = "";
    contentMessage.value = data?.message || "ลบรูปภาพสำเร็จ";
  } catch (error: any) {
    contentMessage.value =
      error?.response?.data?.message || "ลบรูปภาพไม่สำเร็จ";
  } finally {
    savingHero.value = false;
  }
};

onMounted(() => {
  fetchBooks();
  fetchSerialBooks();
  fetchPageContent();
});

onUnmounted(() => {
  if (subscriptionHeroFilePreview.value) {
    URL.revokeObjectURL(subscriptionHeroFilePreview.value);
  }
});
</script>

<style scoped>
.admin-page-content {
  display: grid;
  gap: 24px;
  width: min(1180px, calc(100% - calc(var(--page-gutter, 16px) * 2)));
  margin: 0 auto;
  padding: var(--page-block, 36px) 0 56px;
  color: #143d39;
}

.page-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  border: 1px solid rgba(20, 184, 166, 0.18);
  border-radius: 8px;
  background: linear-gradient(135deg, #f0fffb 0%, #ffffff 100%);
  padding: 28px;
  box-shadow: 0 16px 34px rgba(15, 118, 110, 0.08);
}

.page-hero p,
.page-hero h1,
.page-hero span,
.admin-note h2,
.admin-note p,
.next-steps h2,
.step-grid p {
  margin: 0;
}

.page-hero p {
  color: #0f766e;
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
}

.page-hero h1 {
  margin-top: 6px;
  color: #063d38;
  font-size: 34px;
  line-height: 1.15;
}

.page-hero span {
  display: block;
  max-width: 780px;
  margin-top: 10px;
  color: #52716d;
  font-size: 15px;
  line-height: 1.7;
}

.hero-actions,
.row-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hero-actions a,
.row-actions a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border-radius: 8px;
  background: #20b8ad;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  padding: 0 14px;
  text-decoration: none;
  white-space: nowrap;
}

.hero-actions a:last-child,
.row-actions a:first-child {
  background: #e8faf6;
  color: #0f766e;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-grid article,
.admin-note,
.banner-manager,
.content-table,
.next-steps,
.step-grid article {
  border: 1px solid rgba(20, 184, 166, 0.16);
  border-radius: 8px;
  background: var(--surface);
}

.summary-grid article {
  display: grid;
  gap: 6px;
  padding: 18px;
}

.summary-grid strong {
  color: #0f766e;
  font-size: 30px;
}

.summary-grid span,
.status-area small,
.menu-name small {
  color: #66827e;
  font-size: 13px;
  font-weight: 800;
}

.admin-note,
.next-steps {
  padding: 22px;
}

.admin-note h2,
.next-steps h2 {
  color: #073f3a;
  font-size: 22px;
}

.admin-note p {
  margin-top: 10px;
  color: #516f6b;
  line-height: 1.75;
}

.banner-manager {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 22px;
  padding: 22px;
}

.banner-form {
  display: grid;
  align-content: start;
  gap: 14px;
}

.banner-form h2,
.banner-form p,
.content-message {
  margin: 0;
}

.banner-form h2 {
  color: #073f3a;
  font-size: 22px;
}

.banner-form p {
  color: #516f6b;
  line-height: 1.7;
}

.banner-form label {
  display: grid;
  gap: 8px;
  color: #0b5f59;
  font-size: 13px;
  font-weight: 900;
}

.banner-form input {
  min-height: 42px;
  border: 1px solid rgba(20, 184, 166, 0.24);
  border-radius: 8px;
  color: #143d39;
  font-size: 16px;
  padding: 0 12px;
}

.banner-form input[type="file"] {
  padding: 10px 12px;
}

.image-size-hint {
  color: #dc2626;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  margin-top: 4px;
}

.banner-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.banner-actions button {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  background: #20b8ad;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  padding: 0 16px;
}

.banner-actions button.ghost {
  background: #edf5f3;
  color: #0b5f59;
}

.banner-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.content-message {
  border-radius: 8px;
  background: #e8faf6;
  color: #0b5f59;
  font-weight: 800;
  padding: 10px 12px;
}

.banner-preview {
  overflow: hidden;
  border: 1px dashed rgba(20, 184, 166, 0.35);
  border-radius: 8px;
  background: var(--panel-bg);
}

.banner-preview img,
.empty-preview {
  width: 100%;
  aspect-ratio: 16 / 7;
}

.banner-preview img {
  display: block;
  object-fit: cover;
}

.home-banner-list {
  display: grid;
  align-content: start;
  gap: 12px;
}

.home-banner-item {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(20, 184, 166, 0.18);
  border-radius: 8px;
  padding: 10px;
}

.home-banner-item img {
  width: 160px;
  aspect-ratio: 16 / 7;
  border-radius: 4px;
  object-fit: cover;
}

.home-banner-item div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.home-banner-item strong,
.home-banner-item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-banner-item strong {
  color: #073f3a;
}

.home-banner-item small {
  color: #66827e;
  font-weight: 800;
}

.home-banner-item button {
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: #fee2e2;
  color: #991b1b;
  cursor: pointer;
  font-weight: 900;
  padding: 0 12px;
}

.empty-preview {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: #66827e;
  text-align: center;
  padding: 20px;
}

.empty-preview strong {
  color: #0b5f59;
  font-size: 24px;
}

.content-table {
  overflow: hidden;
}

.table-head,
.menu-row {
  display: grid;
  grid-template-columns: 1.1fr 2fr 0.9fr 1fr;
  gap: 18px;
  align-items: center;
  padding: 16px 18px;
}

.table-head {
  background: #e9fbf7;
  color: #0b5f59;
  font-size: 13px;
  font-weight: 900;
}

.menu-row + .menu-row {
  border-top: 1px solid rgba(20, 184, 166, 0.12);
}

.menu-name {
  display: grid;
  gap: 4px;
}

.menu-name strong {
  color: #073f3a;
  font-size: 17px;
}

.menu-row ul {
  display: grid;
  gap: 6px;
  margin: 0;
  color: #355c58;
  font-size: 14px;
  line-height: 1.55;
  padding-left: 18px;
}

.status-area {
  display: grid;
  gap: 6px;
  justify-items: start;
}

.status {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  padding: 0 10px;
}

.status.ready {
  background: #dff8ee;
  color: #067647;
}

.status.warning {
  background: #fff3d6;
  color: #946200;
}

.status.danger {
  background: #ffe2e2;
  color: #b42318;
}

.step-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.step-grid article {
  padding: 18px;
}

.step-grid strong {
  color: #0b5f59;
}

.step-grid p {
  margin-top: 8px;
  color: #516f6b;
  line-height: 1.65;
}

.error-text {
  margin: 0;
  border-radius: 8px;
  background: #fff1f3;
  color: #b42318;
  font-weight: 800;
  padding: 14px 16px;
}

@media (max-width: 900px) {
  .page-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-grid,
  .step-grid,
  .banner-manager {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .table-head {
    display: none;
  }

  .menu-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .banner-manager {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .summary-grid,
  .step-grid {
    grid-template-columns: 1fr;
  }

  .page-hero {
    padding: 20px;
  }

  .page-hero h1 {
    font-size: 28px;
  }

  .hero-actions,
  .hero-actions a,
  .banner-actions,
  .banner-actions button {
    width: 100%;
  }

  .admin-note,
  .banner-manager,
  .next-steps,
  .menu-row {
    padding: 18px;
  }
}
</style>
