<template>
  <div class="admin-page-content">
    <header class="page-hero">
      <div>
        <p>ศูนย์จัดการหน้าเว็บ</p>
        <h1>จัดข้อมูลหน้าเมนู</h1>
        <span>
          ตรวจว่าหน้าแรก, อีบุ๊ก, รายตอน, ขายดี, มาใหม่, โปรโมชั่น,
          ฟรีกระจาย, ฮิตขึ้นหิ้ง, แนะนำ และสมัครรายเดือน ต้องเติมข้อมูลอะไรบ้าง
        </span>
      </div>

      <div class="hero-actions">
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

    <nav class="form-shortcuts" aria-label="ทางลัดฟอร์มแก้ไขหน้าเว็บ">
      <a href="#subscription-hero-form">รูปพื้นหลังสมาชิก</a>
      <a href="#subscription-copy-form">ข้อความแบนเนอร์</a>
      <a href="#subscription-compare-form">เปรียบเทียบสิทธิ์</a>
      <a href="#subscription-card-form">กล่อง VIP</a>
      <a href="#home-banner-form">แบนเนอร์หน้าแรก</a>
    </nav>

    <section id="subscription-hero-form" class="banner-manager">
      <div class="banner-form">
        <h2>รูปภาพหน้า สมัครรายเดือน</h2>
        <p>
          อัปโหลดภาพพื้นหลังแบนเนอร์สมาชิกพิเศษ หรือวางลิงก์รูปภาพ
          ภาพนี้จะแสดงเป็นพื้นหลังขนาดใหญ่ของ hero หน้าสมัครรายเดือน
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
          <small class="image-size-hint">
            ขนาดภาพที่ใช้พอดี: 1600 x 900 px หรือ 1200 x 675 px, สัดส่วน 16:9, ไฟล์ไม่เกิน 15 MB
          </small>
        </label>

        <div class="banner-actions">
          <button type="button" :disabled="savingHero" @click="saveSubscriptionHero">
            {{ savingHero ? "กำลังบันทึก..." : "บันทึกรูปภาพ" }}
          </button>
          <button type="button" class="ghost" :disabled="savingHero" @click="clearSubscriptionHero">
            ใช้ fallback
          </button>
        </div>

        <p
          v-if="contentMessage"
          class="content-message"
          :class="{ 'content-message--error': contentMessageTone === 'error' }"
        >
          {{ contentMessage }}
        </p>
      </div>

      <div class="preview-stack">
        <div class="preview-panel">
          <div class="preview-label">
            <strong>ตัวอย่างที่กำลังแก้</strong>
            <span>ยังไม่เปลี่ยนหน้าจริงจนกดบันทึก</span>
          </div>
          <div class="banner-preview banner-preview--subscription">
            <img
              v-if="subscriptionHeroPreview"
              :src="subscriptionHeroPreview"
              alt="ตัวอย่างรูปภาพหน้า สมัครรายเดือน"
            />
            <div v-else class="subscription-background-fallback">
              <strong>พื้นหลัง fallback</strong>
              <span>ใช้ไล่สีเดิมเมื่อยังไม่มีรูปพื้นหลัง</span>
            </div>
          </div>
        </div>

        <div class="preview-panel preview-panel--current">
          <div class="preview-label">
            <strong>ที่แสดงจริงตอนนี้</strong>
            <router-link to="/subscription">ดูหน้าจริง</router-link>
          </div>
          <div class="banner-preview banner-preview--subscription">
            <img
              v-if="currentSubscriptionHeroPreview"
              :src="currentSubscriptionHeroPreview"
              alt="รูปภาพหน้าสมัครรายเดือนที่แสดงจริงตอนนี้"
            />
            <div v-else class="subscription-background-fallback">
              <strong>พื้นหลัง fallback</strong>
              <span>ยังไม่มีรูปพื้นหลังที่บันทึกไว้</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="subscription-copy-form" class="banner-manager">
      <div class="banner-form">
        <h2>ข้อความและโทนแบนเนอร์สมาชิก</h2>
        <p>
          แก้ข้อความที่วางทับบนแบนเนอร์ เลือกโทน overlay เพื่อให้ข้อความอ่านชัดบนภาพพื้นหลัง
        </p>

        <label>
          Badge
          <input v-model="subscriptionPageForm.hero_badge" type="text" />
        </label>

        <label>
          หัวข้อหลัก
          <input v-model="subscriptionPageForm.hero_title" type="text" />
        </label>

        <label>
          คำอธิบาย
          <textarea v-model="subscriptionPageForm.hero_description" rows="3"></textarea>
        </label>

        <label>
          ปุ่มหลัก
          <input v-model="subscriptionPageForm.primary_cta" type="text" />
        </label>

        <label>
          ปุ่มรอง
          <input v-model="subscriptionPageForm.secondary_cta" type="text" />
        </label>

        <label>
          โทน overlay
          <select v-model="subscriptionPageForm.hero_overlay">
            <option value="dark">เข้มอ่านง่าย</option>
            <option value="warm">แดงทอง</option>
            <option value="soft">สว่างนุ่ม</option>
            <option value="clear">เห็นภาพชัด</option>
            <option value="none">ไม่มี overlay / ใช้ภาพเต็ม</option>
          </select>
        </label>

        <div class="banner-actions">
          <button type="button" :disabled="savingSubscriptionPage" @click="saveSubscriptionPageSettings">
            {{ savingSubscriptionPage ? "กำลังบันทึก..." : "บันทึกข้อความและโทน" }}
          </button>
        </div>

        <p
          v-if="subscriptionPageMessage"
          class="content-message"
          :class="{ 'content-message--error': subscriptionPageMessageTone === 'error' }"
        >
          {{ subscriptionPageMessage }}
        </p>
      </div>

      <div
        class="subscription-hero-mini"
        :class="`subscription-hero-mini--${subscriptionPageForm.hero_overlay}`"
        :style="subscriptionHeroMiniStyle"
      >
        <div>
          <p>{{ subscriptionPageForm.hero_badge }}</p>
          <strong>{{ subscriptionPageForm.hero_title }}</strong>
          <span>{{ subscriptionPageForm.hero_description }}</span>
          <div>
            <button type="button">{{ subscriptionPageForm.primary_cta }}</button>
            <button type="button" class="coin-topup-preview-button">
              <span class="coin-mark-preview" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="12" cy="12" r="8.5" class="coin-face-preview" />
                  <circle cx="12" cy="12" r="5.4" class="coin-core-preview" />
                  <ellipse cx="9.2" cy="8.4" rx="2.2" ry="1.5" class="coin-shine-preview" />
                </svg>
              </span>
              {{ subscriptionPageForm.secondary_cta }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section id="subscription-compare-form" class="banner-manager">
      <div class="banner-form">
        <h2>เปรียบเทียบสิทธิ์สมาชิก</h2>
        <p>
          แก้หัวข้อ กล่องสมาชิกทั่วไป และกล่องสมาชิกพิเศษที่แสดงในหน้าสมัครสมาชิก
        </p>

        <label>
          หัวข้อ section
          <input v-model="subscriptionPageForm.compare_title" type="text" />
        </label>

        <label>
          หัวข้อฝั่งสมาชิกทั่วไป
          <input v-model="subscriptionPageForm.compare_general_title" type="text" />
        </label>

        <label>
          คำอธิบายสมาชิกทั่วไป
          <textarea v-model="subscriptionPageForm.compare_general_text" rows="3"></textarea>
        </label>

        <label>
          รายการสมาชิกทั่วไป
          <textarea v-model="compareGeneralBulletsText" rows="4" placeholder="ใส่ 1 รายการต่อ 1 บรรทัด"></textarea>
        </label>

        <label>
          หัวข้อฝั่งสมาชิกพิเศษ
          <input v-model="subscriptionPageForm.compare_vip_title" type="text" />
        </label>

        <label>
          คำอธิบายสมาชิกพิเศษ
          <textarea v-model="subscriptionPageForm.compare_vip_text" rows="3"></textarea>
        </label>

        <label>
          รายการสมาชิกพิเศษ
          <textarea v-model="compareVipBulletsText" rows="4" placeholder="ใส่ 1 รายการต่อ 1 บรรทัด"></textarea>
        </label>

        <div class="banner-actions">
          <button type="button" :disabled="savingSubscriptionPage" @click="saveSubscriptionPageSettings">
            {{ savingSubscriptionPage ? "กำลังบันทึก..." : "บันทึกเปรียบเทียบสิทธิ์" }}
          </button>
        </div>
      </div>

      <div class="compare-preview">
        <h3>{{ subscriptionPageForm.compare_title }}</h3>
        <div class="compare-preview__grid">
          <article>
            <strong>{{ subscriptionPageForm.compare_general_title }}</strong>
            <p>{{ subscriptionPageForm.compare_general_text }}</p>
            <ul>
              <li v-for="item in subscriptionPageForm.compare_general_bullets" :key="item">
                {{ item }}
              </li>
            </ul>
          </article>
          <article>
            <strong>{{ subscriptionPageForm.compare_vip_title }}</strong>
            <p>{{ subscriptionPageForm.compare_vip_text }}</p>
            <ul>
              <li v-for="item in subscriptionPageForm.compare_vip_bullets" :key="item">
                {{ item }}
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section id="subscription-card-form" class="banner-manager">
      <div class="banner-form">
        <h2>รูปกล่อง VIP ด้านขวา</h2>
        <p>
          เปลี่ยนภาพกล่องด้านขวาของ hero ได้ ถ้าไม่ใส่รูป ระบบจะแสดง fallback VIP เดิม
        </p>

        <label>
          ลิงก์รูปภาพ
          <input v-model="subscriptionHeroCardUrl" type="url" placeholder="https://example.com/vip-card.jpg" />
        </label>

        <label>
          อัปโหลดรูปภาพ
          <input type="file" accept="image/*" @change="selectHeroCardFile" />
          <small class="image-size-hint">
            ขนาดภาพที่ใช้พอดี: 1600 x 900 px หรือ 1200 x 675 px, สัดส่วน 16:9, ไฟล์ไม่เกิน 15 MB
          </small>
        </label>

        <div class="banner-actions">
          <button type="button" :disabled="savingSubscriptionHeroCard" @click="saveSubscriptionHeroCard">
            {{ savingSubscriptionHeroCard ? "กำลังบันทึก..." : "บันทึกรูปกล่อง VIP" }}
          </button>
          <button type="button" class="ghost" :disabled="savingSubscriptionHeroCard" @click="clearSubscriptionHeroCard">
            ใช้ fallback
          </button>
        </div>

        <p
          v-if="subscriptionHeroCardMessage"
          class="content-message"
          :class="{ 'content-message--error': subscriptionHeroCardMessageTone === 'error' }"
        >
          {{ subscriptionHeroCardMessage }}
        </p>
      </div>

      <div class="preview-stack">
        <div class="preview-panel">
          <div class="preview-label">
            <strong>ตัวอย่างที่กำลังแก้</strong>
            <span>กล่องด้านขวาบน hero</span>
          </div>
          <div class="banner-preview banner-preview--subscription">
            <img v-if="subscriptionHeroCardPreview" :src="subscriptionHeroCardPreview" alt="ตัวอย่างกล่อง VIP" />
            <div v-else class="subscription-fallback-preview">
              <strong>VIP</strong>
              <span>Read and Voice</span>
            </div>
          </div>
        </div>

        <div class="preview-panel preview-panel--current">
          <div class="preview-label">
            <strong>ที่แสดงจริงตอนนี้</strong>
            <router-link to="/subscription">ดูหน้าจริง</router-link>
          </div>
          <div class="banner-preview banner-preview--subscription">
            <img v-if="currentSubscriptionHeroCardPreview" :src="currentSubscriptionHeroCardPreview" alt="กล่อง VIP ที่แสดงจริง" />
            <div v-else class="subscription-fallback-preview">
              <strong>VIP</strong>
              <span>Read and Voice</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="home-banner-form" class="banner-manager">
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
          <small class="image-size-hint">
            ขนาดภาพที่ใช้พอดี: 1600 x 700 px หรือ 1200 x 525 px, สัดส่วน 16:7, ไฟล์ไม่เกิน 15 MB
          </small>
        </label>

        <label>
          อัปโหลดรูปภาพ
          <input type="file" accept="image/*" @change="selectHomeBannerFile" />
          <small class="image-size-hint">
            ขนาดภาพที่ใช้พอดี: 1600 x 700 px หรือ 1200 x 525 px, สัดส่วน 16:7, ไฟล์ไม่เกิน 15 MB
          </small>
        </label>

        <div class="banner-actions">
          <button type="button" :disabled="savingHomeBanner" @click="saveHomeBanner">
            {{ savingHomeBanner ? "กำลังบันทึก..." : "เพิ่มแบนเนอร์หน้าแรก" }}
          </button>
        </div>

        <p v-if="homeBannerMessage" class="content-message">{{ homeBannerMessage }}</p>
      </div>

      <div class="home-banner-list">
        <div class="preview-panel">
          <div class="preview-label">
            <strong>ตัวอย่างแบนเนอร์ใหม่</strong>
            <span>เห็นภาพก่อนเพิ่มเข้า slider หน้าแรก</span>
          </div>
          <article v-if="hasHomeBannerDraft" class="home-banner-draft">
            <img
              v-if="homeBannerDraftPreview"
              :src="homeBannerDraftPreview"
              :alt="homeBannerDraftTitle"
            />
            <div v-else class="empty-preview">
              <strong>รอรูปภาพ</strong>
              <span>ใส่ลิงก์หรือเลือกไฟล์เพื่อดูตัวอย่าง</span>
            </div>
            <div class="home-banner-draft__meta">
              <strong>{{ homeBannerDraftTitle }}</strong>
              <small>{{ homeBannerDraftLink }}</small>
            </div>
          </article>
          <div v-else class="empty-preview">
            <strong>ยังไม่มีตัวอย่างใหม่</strong>
            <span>กรอกชื่อ ลิงก์ หรือเลือกรูปเพื่อดู preview ก่อนบันทึก</span>
          </div>
        </div>

        <div class="preview-label preview-label--saved">
          <strong>แบนเนอร์ที่แสดงจริงบนหน้าแรก</strong>
          <router-link to="/">ดูหน้าจริง</router-link>
        </div>
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

    <section class="poster-review-panel">
      <div class="poster-review-head">
        <div>
          <h2>คำขอแบนเนอร์จากนักเขียน</h2>
          <p>นักเขียนส่งภาพโปรโมตเข้าคิว แอดมินเป็นคนอนุมัติก่อนขึ้นหน้าแรก</p>
        </div>
        <strong>{{ pendingPosterRequests.length }} รอตรวจ</strong>
      </div>

      <p v-if="posterRequestMessage" class="content-message">{{ posterRequestMessage }}</p>
      <p v-if="loadingPosterRequests" class="empty-line">กำลังโหลดคำขอแบนเนอร์...</p>

      <div v-else-if="pendingPosterRequests.length === 0" class="empty-preview poster-empty">
        <strong>ยังไม่มีคำขอจากนักเขียน</strong>
        <span>เมื่อ writer ส่งแบนเนอร์เข้ามา รายการจะขึ้นให้ตรวจที่นี่</span>
      </div>

      <div v-else class="poster-request-list">
        <article
          v-for="request in pendingPosterRequests"
          :key="request.id"
          class="poster-request-item"
        >
          <img :src="resolveImageUrl(request.image_url)" :alt="request.title || 'แบนเนอร์จากนักเขียน'" />
          <div class="poster-request-body">
            <div>
              <strong>{{ request.title || "ยังไม่ได้ตั้งชื่อแบนเนอร์" }}</strong>
              <small>{{ request.link_url || "ยังไม่มีลิงก์ปลายทาง" }}</small>
              <small>
                ส่งโดย {{ request.submitted_by_name || "นักเขียน" }}
                <span v-if="request.created_at"> · {{ formatDate(request.created_at) }}</span>
              </small>
            </div>

            <label>
              หมายเหตุเมื่อต้องปฏิเสธ
              <input
                v-model="posterReviewNotes[request.id]"
                type="text"
                placeholder="เช่น ภาพไม่ตรงสัดส่วน หรือข้อความในภาพอ่านยาก"
              />
            </label>

            <div class="poster-request-actions">
              <button
                type="button"
                :disabled="savingPosterRequestId === request.id"
                @click="reviewPosterRequest(request, 'approved')"
              >
                อนุมัติขึ้นหน้าแรก
              </button>
              <button
                type="button"
                class="danger"
                :disabled="savingPosterRequestId === request.id"
                @click="reviewPosterRequest(request, 'rejected')"
              >
                ไม่อนุมัติ
              </button>
            </div>
          </div>
        </article>
      </div>

      <div v-if="reviewedPosterRequests.length" class="reviewed-poster-list">
        <h3>ประวัติที่ตรวจแล้ว</h3>
        <article
          v-for="request in reviewedPosterRequests.slice(0, 6)"
          :key="request.id"
          class="reviewed-poster-item"
        >
          <img :src="resolveImageUrl(request.image_url)" :alt="request.title || 'แบนเนอร์ที่ตรวจแล้ว'" />
          <div>
            <strong>{{ request.title || "ยังไม่ได้ตั้งชื่อแบนเนอร์" }}</strong>
            <small>{{ getPosterStatusText(request.status) }}</small>
            <small v-if="request.review_note">หมายเหตุ: {{ request.review_note }}</small>
          </div>
        </article>
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

    <section class="next-steps next-steps--launch">
      <div class="next-steps__head">
        <div>
          <h2>ตรวจความพร้อมก่อนเปิดขาย</h2>
          <p>เช็กงานสำคัญจากข้อมูลจริงในระบบ แล้วกดไปจัดการต่อได้ทันที</p>
        </div>
        <strong>{{ launchReadyCount }} / {{ launchChecklist.length }} พร้อม</strong>
      </div>

      <div class="launch-checklist">
        <article
          v-for="item in launchChecklist"
          :key="item.key"
          class="launch-card"
          :class="`launch-card--${item.statusClass}`"
        >
          <div class="launch-card__top">
            <span class="status" :class="item.statusClass">{{ item.statusText }}</span>
            <small>{{ item.current }} / {{ item.target }}</small>
          </div>

          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>

          <ul>
            <li v-for="detail in item.details" :key="detail">{{ detail }}</li>
          </ul>

          <div class="launch-card__actions">
            <router-link :to="item.manageTo">{{ item.manageLabel }}</router-link>
            <router-link class="quiet" :to="item.previewTo">ดูหน้าจริง</router-link>
          </div>
        </article>
      </div>
    </section>

    <section class="next-steps next-steps--legacy" aria-hidden="true">
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

type LaunchChecklistItem = {
  key: string;
  title: string;
  description: string;
  target: number;
  current: number;
  details: string[];
  manageTo: string;
  manageLabel: string;
  previewTo: string;
  statusText: string;
  statusClass: "ready" | "warning" | "danger";
};

type PageContent = {
  subscriptionHero?: {
    image_url?: string;
    updated_at?: string | null;
  };
  subscriptionPage?: SubscriptionPageSettings;
  homeBanners?: HomeBanner[];
};

type SubscriptionPageSettings = {
  hero_badge?: string;
  hero_title?: string;
  hero_description?: string;
  hero_overlay?: string;
  hero_card_image_url?: string;
  primary_cta?: string;
  secondary_cta?: string;
  status_title?: string;
  payment_title?: string;
  payment_note?: string;
  plans_kicker?: string;
  plans_title?: string;
  compare_title?: string;
  compare_general_title?: string;
  compare_general_text?: string;
  compare_general_bullets?: string[];
  compare_vip_title?: string;
  compare_vip_text?: string;
  compare_vip_bullets?: string[];
};

type HomeBanner = {
  id: string;
  image_url: string;
  title?: string;
  link_url?: string;
  sort_order?: number;
  is_active?: boolean;
};

type PosterRequest = {
  id: string;
  image_url: string;
  title?: string;
  link_url?: string;
  sort_order?: number;
  is_active?: boolean;
  status: "pending" | "approved" | "rejected";
  submitted_by_name?: string;
  review_note?: string;
  created_at?: string;
  reviewed_at?: string;
};

type ShelfResponse = {
  books?: Book[];
  count?: number;
};

type ImageUploadSpec = {
  label: string;
  maxBytes: number;
  minWidth: number;
  minHeight: number;
  ratio: number;
  ratioText: string;
};

type ImageValidationResult = {
  ok: boolean;
  message?: string;
  previewUrl?: string;
};

const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;
const IMAGE_RATIO_TOLERANCE = 0.03;
const subscriptionHeroImageSpec: ImageUploadSpec = {
  label: "รูปสมัครรายเดือน",
  maxBytes: MAX_IMAGE_UPLOAD_BYTES,
  minWidth: 1200,
  minHeight: 675,
  ratio: 16 / 9,
  ratioText: "16:9",
};
const homeBannerImageSpec: ImageUploadSpec = {
  label: "แบนเนอร์หน้าแรก",
  maxBytes: MAX_IMAGE_UPLOAD_BYTES,
  minWidth: 1200,
  minHeight: 525,
  ratio: 16 / 7,
  ratioText: "16:7",
};
const subscriptionHeroCardImageSpec: ImageUploadSpec = {
  label: "รูปกล่อง VIP",
  maxBytes: MAX_IMAGE_UPLOAD_BYTES,
  minWidth: 1200,
  minHeight: 675,
  ratio: 16 / 9,
  ratioText: "16:9",
};
const subscriptionPageDefaults: Required<SubscriptionPageSettings> = {
  hero_badge: "Read and Voice VIP",
  hero_title: "สมัครสมาชิกพิเศษ อ่านได้คุ้มกว่าเดิม",
  hero_description:
    "เลือกแพ็กเกจที่เหมาะกับจังหวะการอ่านของคุณ แล้วชำระด้วยคอยน์จากกระเป๋าได้ทันที",
  hero_overlay: "dark",
  hero_card_image_url: "",
  primary_cta: "เลือกแพ็กเกจ",
  secondary_cta: "เติมคอยน์",
  status_title: "สถานะสมาชิก",
  payment_title: "การชำระเงิน",
  payment_note: "หักคอยน์จริงจากกระเป๋าเมื่อกดยืนยันสมัคร",
  plans_kicker: "เลือกแพ็กเกจ",
  plans_title: "จ่ายด้วยคอยน์ เริ่มใช้สิทธิ์ทันที",
  compare_title: "เปรียบเทียบสิทธิ์",
  compare_general_title: "สมาชิกทั่วไป",
  compare_general_text:
    "เหมาะสำหรับผู้ใช้ที่ต้องการอ่านเฉพาะบางเล่มหรือบางตอน สามารถอ่านเนื้อหาฟรีได้ตามปกติ และซื้อหนังสือหรือตอนที่ต้องการด้วยคอยน์เป็นรายการ ๆ",
  compare_general_bullets: [
    "อ่านหนังสือหรือตอนที่เปิดให้อ่านฟรีได้ทันที",
    "ซื้อเนื้อหาแบบรายเล่มหรือรายตอนได้ด้วยคอยน์",
    "ถ้าเจอเนื้อหาสำหรับสมาชิก จะต้องสมัครแพ็กเกจก่อนจึงเปิดอ่านได้",
  ],
  compare_vip_title: "สมาชิกพิเศษ Read and Voice",
  compare_vip_text:
    "เหมาะสำหรับผู้ใช้ที่อ่านต่อเนื่องหรืออ่านหลายเรื่องในช่วงเวลาเดียวกัน เมื่อสมัครแล้วจะเปิดอ่านเนื้อหาที่กำหนดไว้สำหรับสมาชิกได้ตลอดอายุแพ็กเกจ",
  compare_vip_bullets: [
    "อ่านหนังสือหรือตอนที่ติดป้ายสำหรับสมาชิกได้ตามช่วงวันที่สมัคร",
    "ยังซื้อหนังสือรายเล่มหรือรายตอนได้ด้วยคอยน์เหมือนสมาชิกทั่วไป",
    "ถ้าสมัครเพิ่มก่อนหมดอายุ ระบบจะต่อวันให้จากวันหมดอายุเดิม",
  ],
};

const books = ref<Book[]>([]);
const serialBooks = ref<Book[]>([]);
const pageContent = ref<PageContent | null>(null);
const subscriptionHeroUrl = ref("");
const subscriptionHeroSavedUrl = ref("");
const subscriptionHeroFile = ref<File | null>(null);
const subscriptionHeroFilePreview = ref("");
const contentMessage = ref("");
const contentMessageTone = ref<"info" | "error">("info");
const savingHero = ref(false);
const subscriptionPageForm = ref<Required<SubscriptionPageSettings>>({
  ...subscriptionPageDefaults,
});
const subscriptionPageMessage = ref("");
const subscriptionPageMessageTone = ref<"info" | "error">("info");
const savingSubscriptionPage = ref(false);
const subscriptionHeroCardUrl = ref("");
const subscriptionHeroCardSavedUrl = ref("");
const subscriptionHeroCardFile = ref<File | null>(null);
const subscriptionHeroCardFilePreview = ref("");
const subscriptionHeroCardMessage = ref("");
const subscriptionHeroCardMessageTone = ref<"info" | "error">("info");
const savingSubscriptionHeroCard = ref(false);
const homeBannerList = ref<HomeBanner[]>([]);
const homeBannerTitle = ref("");
const homeBannerLink = ref("");
const homeBannerUrl = ref("");
const homeBannerFile = ref<File | null>(null);
const homeBannerFilePreview = ref("");
const homeBannerMessage = ref("");
const savingHomeBanner = ref(false);
const posterRequests = ref<PosterRequest[]>([]);
const posterReviewNotes = ref<Record<string, string>>({});
const loadingPosterRequests = ref(false);
const savingPosterRequestId = ref("");
const posterRequestMessage = ref("");
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
const hasSubscriptionHero = computed(() => Boolean(subscriptionHeroUrl.value.trim()));
const activeHomeBannerCount = computed(() =>
  homeBannerList.value.filter((banner) => banner.is_active !== false).length,
);
const pendingPosterRequests = computed(() =>
  posterRequests.value.filter((request) => request.status === "pending"),
);
const reviewedPosterRequests = computed(() =>
  posterRequests.value.filter((request) => request.status !== "pending"),
);
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
    manageTo: "/admin/subscription-plans",
    manageLabel: "จัดการแพ็กเกจ",
  }),
]);

const readyPages = computed(() => {
  return menuPages.value.filter((page) => page.statusClass === "ready").length;
});

const buildLaunchChecklistItem = (
  item: Omit<LaunchChecklistItem, "statusText" | "statusClass">,
): LaunchChecklistItem => ({
  ...item,
  ...getStatus(item.current, item.target),
});

const launchChecklist = computed<LaunchChecklistItem[]>(() => [
  buildLaunchChecklistItem({
    key: "books",
    title: "ตั้งค่าหนังสือให้พร้อมขาย",
    description: "ตรวจว่ามีหนังสือขาย หนังสือฟรี และรายการสำหรับหน้าแนะนำเพียงพอ",
    target: 20,
    current: totalBooks.value,
    details: [
      `หนังสือทั้งหมด ${totalBooks.value} เล่ม`,
      `หนังสือขาย ${paidBooks.value.length} เล่ม`,
      `หนังสือฟรี ${freeBooks.value.length} เล่ม`,
    ],
    manageTo: "/admin/books",
    manageLabel: "ไปจัดการหนังสือ",
    previewTo: "/store",
  }),
  buildLaunchChecklistItem({
    key: "banners",
    title: "จัดการ Banner และรูปโปรโมชัน",
    description: "เติมรูป hero สมัครสมาชิกและ banner หน้าแรกเพื่อให้หน้าเว็บดูพร้อมขาย",
    target: 3,
    current: activeHomeBannerCount.value + (hasSubscriptionHero.value ? 1 : 0),
    details: [
      `Banner หน้าแรก ${activeHomeBannerCount.value} รูป`,
      hasSubscriptionHero.value
        ? "มีรูป hero หน้าสมัครสมาชิกแล้ว"
        : "ยังไม่มีรูป hero หน้าสมัครสมาชิก",
      "แนะนำอย่างน้อย 2 banner หน้าแรก + 1 hero สมัครสมาชิก",
    ],
    manageTo: "/admin/page-content",
    manageLabel: "เพิ่ม Banner",
    previewTo: "/",
  }),
  buildLaunchChecklistItem({
    key: "serials",
    title: "เติมรายการรายตอน",
    description: "ตรวจให้มีนิยายรายตอนพอสำหรับหน้า /serials และหมวดรายตอน",
    target: 6,
    current: serialReadyCount.value,
    details: [
      `นิยายรายตอน ${serialReadyCount.value} เรื่อง`,
      "ควรมีตอนเผยแพร่และปกครบก่อนโปรโมต",
      "ใช้หน้าอัปโหลดเพื่อเพิ่มหรือแก้ไข serial",
    ],
    manageTo: "/writer/upload",
    manageLabel: "เพิ่มรายตอน",
    previewTo: "/serials",
  }),
]);

const launchReadyCount = computed(() =>
  launchChecklist.value.filter((item) => item.statusClass === "ready").length,
);

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/page-content/")) return url;
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
};

const textToList = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const compareGeneralBulletsText = computed({
  get: () => subscriptionPageForm.value.compare_general_bullets.join("\n"),
  set: (value: string) => {
    subscriptionPageForm.value.compare_general_bullets = textToList(value);
  },
});

const compareVipBulletsText = computed({
  get: () => subscriptionPageForm.value.compare_vip_bullets.join("\n"),
  set: (value: string) => {
    subscriptionPageForm.value.compare_vip_bullets = textToList(value);
  },
});

const subscriptionHeroPreview = computed(() => {
  return subscriptionHeroFilePreview.value || resolveImageUrl(subscriptionHeroUrl.value);
});

const currentSubscriptionHeroPreview = computed(() =>
  resolveImageUrl(subscriptionHeroSavedUrl.value),
);

const subscriptionHeroWorkingPreview = computed(
  () => subscriptionHeroPreview.value || currentSubscriptionHeroPreview.value,
);

const subscriptionHeroMiniStyle = computed(() =>
  subscriptionHeroWorkingPreview.value
    ? { backgroundImage: `url("${subscriptionHeroWorkingPreview.value}")` }
    : {},
);

const subscriptionHeroCardPreview = computed(() =>
  subscriptionHeroCardFilePreview.value || resolveImageUrl(subscriptionHeroCardUrl.value),
);

const currentSubscriptionHeroCardPreview = computed(() =>
  resolveImageUrl(subscriptionHeroCardSavedUrl.value),
);

const homeBannerDraftPreview = computed(() => {
  return homeBannerFilePreview.value || resolveImageUrl(homeBannerUrl.value);
});

const homeBannerDraftTitle = computed(() =>
  homeBannerTitle.value.trim() || "แบนเนอร์ใหม่บนหน้าแรก",
);

const homeBannerDraftLink = computed(() =>
  homeBannerLink.value.trim() || "ยังไม่มีลิงก์ปลายทาง",
);

const hasHomeBannerDraft = computed(() =>
  Boolean(
    homeBannerDraftPreview.value ||
      homeBannerTitle.value.trim() ||
      homeBannerLink.value.trim(),
  ),
);

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
    subscriptionHeroSavedUrl.value = data?.subscriptionHero?.image_url || "";
    subscriptionPageForm.value = {
      ...subscriptionPageDefaults,
      ...(data?.subscriptionPage || {}),
    };
    subscriptionHeroCardUrl.value = data?.subscriptionPage?.hero_card_image_url || "";
    subscriptionHeroCardSavedUrl.value = data?.subscriptionPage?.hero_card_image_url || "";
    homeBannerList.value = Array.isArray(data?.homeBanners) ? data.homeBanners : [];
  } catch (error: unknown) {
    pageContent.value = null;
    subscriptionHeroSavedUrl.value = "";
    subscriptionHeroCardSavedUrl.value = "";
    homeBannerList.value = [];
  }
};

const fetchPosterRequests = async () => {
  loadingPosterRequests.value = true;

  try {
    const { data } = await api.get("/page-content/writer-posters");
    posterRequests.value = Array.isArray(data) ? data : [];
  } catch (error: any) {
    posterRequests.value = [];
    posterRequestMessage.value =
      error?.response?.data?.message || "โหลดคำขอแบนเนอร์จากนักเขียนไม่สำเร็จ";
  } finally {
    loadingPosterRequests.value = false;
  }
};

const formatFileSizeMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

const readImageDimensions = (url: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => reject(new Error("โหลดขนาดรูปภาพไม่สำเร็จ"));
    image.src = url;
  });

const validateImageFile = async (
  file: File | null,
  spec: ImageUploadSpec,
): Promise<ImageValidationResult> => {
  if (!file) return { ok: true };

  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      message: `${spec.label} ต้องเป็นไฟล์รูปภาพเท่านั้น`,
    };
  }

  if (file.size > spec.maxBytes) {
    return {
      ok: false,
      message: `${spec.label} มีขนาด ${formatFileSizeMb(file.size)} MB กรุณาเลือกไฟล์ไม่เกิน ${formatFileSizeMb(spec.maxBytes)} MB`,
    };
  }

  const previewUrl = URL.createObjectURL(file);

  try {
    const { width, height } = await readImageDimensions(previewUrl);
    const ratio = width / height;
    const ratioDelta = Math.abs(ratio - spec.ratio) / spec.ratio;

    if (width < spec.minWidth || height < spec.minHeight) {
      URL.revokeObjectURL(previewUrl);
      return {
        ok: false,
        message: `${spec.label} เล็กเกินไป (${width} x ${height} px) กรุณาใช้ภาพอย่างน้อย ${spec.minWidth} x ${spec.minHeight} px`,
      };
    }

    if (ratioDelta > IMAGE_RATIO_TOLERANCE) {
      URL.revokeObjectURL(previewUrl);
      return {
        ok: false,
        message: `${spec.label} สัดส่วนไม่พอดี (${width} x ${height} px) กรุณาใช้สัดส่วน ${spec.ratioText} เพื่อไม่ให้ภาพล้นหรือโดนครอป`,
      };
    }

    return { ok: true, previewUrl };
  } catch {
    URL.revokeObjectURL(previewUrl);
    return {
      ok: false,
      message: `${spec.label} อ่านขนาดรูปภาพไม่สำเร็จ กรุณาเลือกไฟล์รูปภาพใหม่`,
    };
  }
};

const selectHeroFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  contentMessage.value = "";
  contentMessageTone.value = "info";
  if (subscriptionHeroFilePreview.value) {
    URL.revokeObjectURL(subscriptionHeroFilePreview.value);
  }

  const file = target.files?.[0] || null;
  const result = await validateImageFile(file, subscriptionHeroImageSpec);

  if (!result.ok) {
    target.value = "";
    subscriptionHeroFile.value = null;
    subscriptionHeroFilePreview.value = "";
    contentMessage.value = result.message || "ไฟล์รูปภาพไม่ถูกต้อง";
    contentMessageTone.value = "error";
    return;
  }

  subscriptionHeroFile.value = file;
  subscriptionHeroFilePreview.value = result.previewUrl || "";
  contentMessage.value = file
    ? "เลือกไฟล์รูปสมัครรายเดือนเรียบร้อย ตรวจสัดส่วนแล้วพอดีกับหน้าเว็บ"
    : "";
  contentMessageTone.value = "info";
};

const saveSubscriptionPageSettings = async () => {
  subscriptionPageMessage.value = "";
  subscriptionPageMessageTone.value = "info";
  savingSubscriptionPage.value = true;

  try {
    const { data } = await api.post("/page-content/subscription-page", {
      ...subscriptionPageForm.value,
      hero_card_image_url: subscriptionHeroCardSavedUrl.value || subscriptionHeroCardUrl.value,
    });
    subscriptionPageForm.value = {
      ...subscriptionPageDefaults,
      ...(data?.subscriptionPage || {}),
    };
    subscriptionHeroCardUrl.value = data?.subscriptionPage?.hero_card_image_url || "";
    subscriptionHeroCardSavedUrl.value = data?.subscriptionPage?.hero_card_image_url || "";
    subscriptionPageMessage.value = data?.message || "บันทึกข้อความและโทนแบนเนอร์สำเร็จ";
  } catch (error: any) {
    subscriptionPageMessage.value =
      error?.response?.data?.message || "บันทึกข้อความและโทนแบนเนอร์ไม่สำเร็จ";
    subscriptionPageMessageTone.value = "error";
  } finally {
    savingSubscriptionPage.value = false;
  }
};

const selectHeroCardFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  subscriptionHeroCardMessage.value = "";
  subscriptionHeroCardMessageTone.value = "info";
  if (subscriptionHeroCardFilePreview.value) {
    URL.revokeObjectURL(subscriptionHeroCardFilePreview.value);
  }

  const file = target.files?.[0] || null;
  const result = await validateImageFile(file, subscriptionHeroCardImageSpec);

  if (!result.ok) {
    target.value = "";
    subscriptionHeroCardFile.value = null;
    subscriptionHeroCardFilePreview.value = "";
    subscriptionHeroCardMessage.value = result.message || "ไฟล์รูปภาพไม่ถูกต้อง";
    subscriptionHeroCardMessageTone.value = "error";
    return;
  }

  subscriptionHeroCardFile.value = file;
  subscriptionHeroCardFilePreview.value = result.previewUrl || "";
  subscriptionHeroCardMessage.value = file
    ? "เลือกไฟล์รูปกล่อง VIP เรียบร้อย ตรวจสัดส่วนแล้วพอดีกับหน้าเว็บ"
    : "";
};

const saveSubscriptionHeroCard = async () => {
  subscriptionHeroCardMessage.value = "";
  subscriptionHeroCardMessageTone.value = "info";
  savingSubscriptionHeroCard.value = true;

  try {
    const formData = new FormData();
    if (subscriptionHeroCardFile.value) {
      formData.append("card_image", subscriptionHeroCardFile.value);
    } else {
      formData.append("image_url", subscriptionHeroCardUrl.value.trim());
    }

    const { data } = await api.post("/page-content/subscription-card-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    subscriptionPageForm.value = {
      ...subscriptionPageDefaults,
      ...(data?.subscriptionPage || {}),
    };
    subscriptionHeroCardUrl.value = data?.subscriptionPage?.hero_card_image_url || "";
    subscriptionHeroCardSavedUrl.value = data?.subscriptionPage?.hero_card_image_url || "";
    subscriptionHeroCardFile.value = null;
    if (subscriptionHeroCardFilePreview.value) {
      URL.revokeObjectURL(subscriptionHeroCardFilePreview.value);
    }
    subscriptionHeroCardFilePreview.value = "";
    subscriptionHeroCardMessage.value = data?.message || "บันทึกรูปกล่อง VIP สำเร็จ";
  } catch (error: any) {
    subscriptionHeroCardMessage.value =
      error?.response?.data?.message || "บันทึกรูปกล่อง VIP ไม่สำเร็จ";
    subscriptionHeroCardMessageTone.value = "error";
  } finally {
    savingSubscriptionHeroCard.value = false;
  }
};

const clearSubscriptionHeroCard = async () => {
  subscriptionHeroCardMessage.value = "";
  subscriptionHeroCardMessageTone.value = "info";
  savingSubscriptionHeroCard.value = true;

  try {
    const { data } = await api.delete("/page-content/subscription-card-image");
    subscriptionPageForm.value = {
      ...subscriptionPageDefaults,
      ...(data?.subscriptionPage || {}),
    };
    subscriptionHeroCardUrl.value = "";
    subscriptionHeroCardSavedUrl.value = "";
    subscriptionHeroCardFile.value = null;
    if (subscriptionHeroCardFilePreview.value) {
      URL.revokeObjectURL(subscriptionHeroCardFilePreview.value);
    }
    subscriptionHeroCardFilePreview.value = "";
    subscriptionHeroCardMessage.value = data?.message || "เปลี่ยนกล่อง VIP กลับไปใช้ fallback สำเร็จ";
  } catch (error: any) {
    subscriptionHeroCardMessage.value =
      error?.response?.data?.message || "เปลี่ยนกล่อง VIP กลับไปใช้ fallback ไม่สำเร็จ";
    subscriptionHeroCardMessageTone.value = "error";
  } finally {
    savingSubscriptionHeroCard.value = false;
  }
};

const selectHomeBannerFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (homeBannerFilePreview.value) {
    URL.revokeObjectURL(homeBannerFilePreview.value);
  }

  const file = target.files?.[0] || null;
  const result = await validateImageFile(file, homeBannerImageSpec);

  if (!result.ok) {
    target.value = "";
    homeBannerFile.value = null;
    homeBannerFilePreview.value = "";
    homeBannerMessage.value = result.message || "ไฟล์รูปภาพไม่ถูกต้อง";
    return;
  }

  homeBannerFile.value = file;
  homeBannerFilePreview.value = result.previewUrl || "";
  homeBannerMessage.value = file
    ? "เลือกไฟล์แบนเนอร์หน้าแรกเรียบร้อย ตรวจสัดส่วนแล้วพอดีกับ slider"
    : "";
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
    if (homeBannerFilePreview.value) {
      URL.revokeObjectURL(homeBannerFilePreview.value);
    }
    homeBannerFilePreview.value = "";
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

const reviewPosterRequest = async (
  request: PosterRequest,
  status: "approved" | "rejected",
) => {
  posterRequestMessage.value = "";
  savingPosterRequestId.value = request.id;

  try {
    const { data } = await api.put(`/page-content/writer-posters/${request.id}/review`, {
      status,
      title: request.title || "",
      link_url: request.link_url || "",
      review_note: posterReviewNotes.value[request.id] || "",
    });

    if (Array.isArray(data?.homeBanners)) {
      homeBannerList.value = data.homeBanners;
    }

    posterRequests.value = posterRequests.value.map((item) =>
      item.id === request.id ? data.posterRequest || item : item,
    );
    posterRequestMessage.value =
      data?.message ||
      (status === "approved"
        ? "อนุมัติแบนเนอร์ขึ้นหน้าแรกสำเร็จ"
        : "ปฏิเสธแบนเนอร์สำเร็จ");
  } catch (error: any) {
    posterRequestMessage.value =
      error?.response?.data?.message || "ตรวจคำขอแบนเนอร์ไม่สำเร็จ";
  } finally {
    savingPosterRequestId.value = "";
  }
};

const getPosterStatusText = (status: PosterRequest["status"]) => {
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "rejected") return "ไม่อนุมัติ";
  return "รอตรวจ";
};

const formatDate = (value?: string) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const saveSubscriptionHero = async () => {
  contentMessage.value = "";
  contentMessageTone.value = "info";
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
    subscriptionHeroSavedUrl.value = data.subscriptionHero?.image_url || "";
    subscriptionHeroFile.value = null;
    if (subscriptionHeroFilePreview.value) {
      URL.revokeObjectURL(subscriptionHeroFilePreview.value);
    }
    subscriptionHeroFilePreview.value = "";
    contentMessage.value = data.message || "บันทึกรูปภาพสำเร็จ";
    contentMessageTone.value = "info";
  } catch (error: any) {
    contentMessage.value =
      error?.response?.data?.message || "บันทึกรูปภาพไม่สำเร็จ";
    contentMessageTone.value = "error";
  } finally {
    savingHero.value = false;
  }
};

const clearSubscriptionHero = async () => {
  contentMessage.value = "";
  contentMessageTone.value = "info";
  savingHero.value = true;

  try {
    const { data } = await api.delete("/page-content/subscription-hero");
    subscriptionHeroUrl.value = "";
    subscriptionHeroSavedUrl.value = "";
    subscriptionHeroFile.value = null;
    if (subscriptionHeroFilePreview.value) {
      URL.revokeObjectURL(subscriptionHeroFilePreview.value);
    }
    subscriptionHeroFilePreview.value = "";
    contentMessage.value = data?.message || "เปลี่ยนกลับไปใช้ fallback สำเร็จ";
    contentMessageTone.value = "info";
  } catch (error: any) {
    contentMessage.value =
      error?.response?.data?.message || "เปลี่ยนกลับไปใช้ fallback ไม่สำเร็จ";
    contentMessageTone.value = "error";
  } finally {
    savingHero.value = false;
  }
};

onMounted(() => {
  fetchBooks();
  fetchSerialBooks();
  fetchPageContent();
  fetchPosterRequests();
});

onUnmounted(() => {
  if (subscriptionHeroFilePreview.value) {
    URL.revokeObjectURL(subscriptionHeroFilePreview.value);
  }
  if (subscriptionHeroCardFilePreview.value) {
    URL.revokeObjectURL(subscriptionHeroCardFilePreview.value);
  }
  if (homeBannerFilePreview.value) {
    URL.revokeObjectURL(homeBannerFilePreview.value);
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
  font-size: 15px;
  font-weight: 900;
  text-transform: uppercase;
}

.page-hero h1 {
  margin-top: 6px;
  color: #063d38;
  font-size: 36px;
  line-height: 1.15;
}

.page-hero span {
  display: block;
  max-width: 780px;
  margin-top: 10px;
  color: #52716d;
  font-size: 17px;
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
  font-size: 16px;
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
.poster-review-panel,
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
  font-size: 32px;
}

.summary-grid span,
.status-area small,
.menu-name small {
  color: #66827e;
  font-size: 15px;
  font-weight: 800;
}

.admin-note,
.next-steps,
.poster-review-panel {
  padding: 22px;
}

.admin-note h2,
.next-steps h2,
.poster-review-panel h2,
.reviewed-poster-list h3 {
  color: #073f3a;
  font-size: 24px;
}

.admin-note p {
  margin-top: 10px;
  color: #516f6b;
  line-height: 1.75;
}

.form-shortcuts {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  border: 1px solid rgba(20, 184, 166, 0.16);
  border-radius: 8px;
  background: var(--surface);
  padding: 14px;
}

.form-shortcuts a {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  border-radius: 999px;
  background: #e8faf6;
  color: #0f766e;
  font-size: 14px;
  font-weight: 900;
  padding: 0 13px;
  text-decoration: none;
}

.form-shortcuts a:hover {
  background: #20b8ad;
  color: #ffffff;
}

.poster-review-panel {
  display: grid;
  gap: 16px;
}

.poster-review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.poster-review-head h2,
.poster-review-head p,
.reviewed-poster-list h3 {
  margin: 0;
}

.poster-review-head p {
  margin-top: 6px;
  color: #516f6b;
  line-height: 1.6;
}

.poster-review-head > strong {
  border-radius: 999px;
  background: #fff3d8;
  color: #876000;
  font-size: 14px;
  padding: 8px 12px;
  white-space: nowrap;
}

.empty-line {
  margin: 0;
  color: #66827e;
  font-weight: 800;
}

.poster-empty {
  aspect-ratio: auto;
  min-height: 170px;
}

.poster-request-list,
.reviewed-poster-list {
  display: grid;
  gap: 12px;
}

.poster-request-item {
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.1fr);
  gap: 14px;
  border: 1px solid rgba(20, 184, 166, 0.18);
  border-radius: 8px;
  padding: 12px;
}

.poster-request-item > img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 7;
  border-radius: 6px;
  object-fit: cover;
}

.poster-request-body {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
}

.poster-request-body > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.poster-request-body strong,
.poster-request-body small,
.reviewed-poster-item strong,
.reviewed-poster-item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poster-request-body strong,
.reviewed-poster-item strong {
  color: #073f3a;
}

.poster-request-body small,
.reviewed-poster-item small {
  color: #66827e;
  font-weight: 800;
}

.poster-request-body label {
  display: grid;
  gap: 7px;
  color: #0b5f59;
  font-weight: 900;
}

.poster-request-body input {
  min-height: 38px;
  border: 1px solid rgba(20, 184, 166, 0.24);
  border-radius: 8px;
  color: #143d39;
  font-size: 15px;
  padding: 0 11px;
}

.poster-request-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.poster-request-actions button {
  min-height: 38px;
  border: 0;
  border-radius: 8px;
  background: #20b8ad;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  padding: 0 13px;
}

.poster-request-actions button.danger {
  background: #fee2e2;
  color: #991b1b;
}

.poster-request-actions button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.reviewed-poster-list {
  padding-top: 4px;
}

.reviewed-poster-list h3 {
  font-size: 18px;
}

.reviewed-poster-item {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(20, 184, 166, 0.12);
  border-radius: 8px;
  padding: 9px;
}

.reviewed-poster-item img {
  width: 120px;
  aspect-ratio: 16 / 7;
  border-radius: 5px;
  object-fit: cover;
}

.reviewed-poster-item div {
  display: grid;
  gap: 3px;
  min-width: 0;
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
  font-size: 24px;
}

.banner-form p {
  color: #516f6b;
  line-height: 1.7;
}

.banner-form label {
  display: grid;
  gap: 8px;
  color: #0b5f59;
  font-size: 15px;
  font-weight: 900;
}

.banner-form input,
.banner-form textarea,
.banner-form select {
  min-height: 42px;
  border: 1px solid rgba(20, 184, 166, 0.24);
  border-radius: 8px;
  color: #143d39;
  font-size: 18px;
  padding: 0 12px;
}

.banner-form textarea {
  min-height: 96px;
  padding: 10px 12px;
  resize: vertical;
}

.banner-form select {
  background: #ffffff;
}

.banner-form input[type="file"] {
  padding: 10px 12px;
}

.image-size-hint {
  color: #dc2626;
  font-size: 13px;
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

.content-message--error {
  background: #fff1f3;
  color: #b42318;
}

.preview-stack {
  display: grid;
  align-content: start;
  gap: 14px;
}

.preview-panel {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.preview-panel--current {
  padding-top: 12px;
  border-top: 1px solid rgba(20, 184, 166, 0.14);
}

.preview-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.preview-label strong {
  color: #073f3a;
  font-size: 16px;
  line-height: 1.3;
}

.preview-label span,
.preview-label a {
  color: #66827e;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
}

.preview-label a {
  color: #0f766e;
  text-decoration: none;
  white-space: nowrap;
}

.preview-label--saved {
  margin-top: 4px;
}

.banner-preview {
  overflow: hidden;
  border: 1px dashed rgba(20, 184, 166, 0.35);
  border-radius: 8px;
  background: var(--panel-bg);
}

.banner-preview img,
.empty-preview,
.subscription-fallback-preview,
.subscription-background-fallback {
  width: 100%;
  aspect-ratio: 16 / 7;
}

.banner-preview--subscription img,
.banner-preview--subscription .empty-preview,
.banner-preview--subscription .subscription-fallback-preview,
.banner-preview--subscription .subscription-background-fallback {
  aspect-ratio: 16 / 9;
}

.banner-preview img {
  display: block;
  object-fit: cover;
}

.subscription-fallback-preview {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 18px;
  background:
    radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.9), transparent 16%),
    linear-gradient(145deg, #fff7d1, #ffffff);
  color: #e11d48;
  text-align: center;
}

.subscription-fallback-preview strong {
  font-size: clamp(32px, 5vw, 48px);
  line-height: 0.9;
}

.subscription-fallback-preview span {
  color: #a16207;
  font-size: 24px;
  font-weight: 900;
}

.subscription-background-fallback {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.24)),
    linear-gradient(135deg, var(--surface) 0%, color-mix(in srgb, var(--primary-soft) 72%, var(--surface)) 100%);
  color: #12333a;
  text-align: center;
  padding: 18px;
}

.subscription-background-fallback strong {
  font-size: clamp(24px, 4vw, 38px);
  line-height: 1.1;
}

.subscription-background-fallback span {
  max-width: 360px;
  color: #66827e;
  font-weight: 800;
  line-height: 1.5;
}

.subscription-hero-mini {
  position: relative;
  overflow: hidden;
  display: grid;
  align-content: center;
  min-height: 320px;
  border-radius: 8px;
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.18)),
    linear-gradient(135deg, var(--surface) 0%, color-mix(in srgb, var(--primary-soft) 76%, var(--surface)) 100%);
  background-position: center;
  background-size: cover;
  color: #12333a;
  padding: 32px;
}

.subscription-hero-mini::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.14)),
    linear-gradient(0deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0.02));
}

.subscription-hero-mini--warm::before {
  background:
    linear-gradient(90deg, rgba(255, 247, 237, 0.72), rgba(255, 247, 237, 0.12)),
    linear-gradient(0deg, rgba(255, 247, 237, 0.24), rgba(255, 247, 237, 0.02));
}

.subscription-hero-mini--soft::before {
  background: linear-gradient(90deg, rgba(255, 247, 237, 0.76), rgba(255, 247, 237, 0.18));
}

.subscription-hero-mini--clear::before {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.02));
}

.subscription-hero-mini--none::before {
  background: transparent;
}

.subscription-hero-mini > div {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
  max-width: 440px;
}

.subscription-hero-mini p,
.subscription-hero-mini strong,
.subscription-hero-mini span {
  margin: 0;
}

.subscription-hero-mini p {
  width: fit-content;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  font-weight: 900;
  padding: 7px 12px;
}

.subscription-hero-mini strong {
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.15;
}

.subscription-hero-mini span {
  color: rgba(18, 51, 58, 0.78);
  font-weight: 800;
  line-height: 1.65;
}

.subscription-hero-mini > div > div {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.subscription-hero-mini button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent);
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary), #10b981);
  color: var(--on-primary);
  cursor: default;
  font-size: 15px;
  font-weight: 900;
  padding: 0 14px;
}

.subscription-hero-mini .coin-topup-preview-button {
  width: fit-content;
  min-height: 30px;
  min-width: 0;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, #ff9d10 0%, #f28a00 100%);
  color: #ffffff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 4px 10px rgba(200, 112, 0, 0.18);
  font-size: 15px;
  line-height: 1.15;
  padding: 0 14px 0 10px;
}

.coin-mark-preview {
  display: inline-grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 999px;
  background: radial-gradient(
    circle at 35% 35%,
    #ffe48a 0%,
    #ffc933 45%,
    #e59a00 100%
  );
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.42),
    0 1px 2px rgba(181, 118, 0, 0.3);
  flex: 0 0 auto;
}

.coin-mark-preview svg {
  width: 11px;
  height: 11px;
  filter: drop-shadow(0 1px 0 rgba(181, 118, 0, 0.18));
}

.coin-face-preview {
  fill: #ffd24d;
}

.coin-core-preview {
  fill: #f6b301;
}

.coin-shine-preview {
  fill: rgba(255, 245, 186, 0.52);
}

.subscription-hero-mini--soft {
  color: #1f2937;
}

.subscription-hero-mini--soft span {
  color: rgba(31, 41, 55, 0.78);
}

.subscription-hero-mini--soft p,
.subscription-hero-mini--soft button + button {
  border-color: rgba(31, 41, 55, 0.22);
  background: rgba(255, 255, 255, 0.64);
  color: #9f1239;
}

.compare-preview {
  display: grid;
  align-content: start;
  gap: 16px;
  min-width: 0;
  border: 1px solid rgba(20, 184, 166, 0.16);
  border-radius: 8px;
  background: var(--surface);
  padding: 22px;
}

.compare-preview h3 {
  margin: 0;
  color: #073f3a;
  font-size: 24px;
}

.compare-preview__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.compare-preview__grid article {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  border: 1px solid rgba(20, 184, 166, 0.12);
  border-radius: 8px;
  background: var(--surface-soft, #f7f7f7);
  padding: 18px;
}

.compare-preview__grid strong {
  color: #073f3a;
  font-size: 18px;
  line-height: 1.35;
}

.compare-preview__grid p,
.compare-preview__grid li {
  color: #66827e;
  font-size: 15px;
  line-height: 1.7;
}

.compare-preview__grid p,
.compare-preview__grid ul {
  margin: 0;
}

.compare-preview__grid ul {
  display: grid;
  gap: 10px;
  padding-left: 18px;
}

.home-banner-list {
  display: grid;
  align-content: start;
  gap: 12px;
}

.home-banner-draft {
  overflow: hidden;
  border: 1px dashed rgba(20, 184, 166, 0.35);
  border-radius: 8px;
  background: var(--panel-bg);
}

.home-banner-draft img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 7;
  object-fit: cover;
}

.home-banner-draft__meta {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
}

.home-banner-draft__meta strong,
.home-banner-draft__meta small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-banner-draft__meta strong {
  color: #073f3a;
  font-size: 16px;
}

.home-banner-draft__meta small {
  color: #66827e;
  font-weight: 800;
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
  font-size: 26px;
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
  font-size: 15px;
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
  font-size: 19px;
}

.menu-row ul {
  display: grid;
  gap: 6px;
  margin: 0;
  color: #355c58;
  font-size: 16px;
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
  font-size: 14px;
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

.next-steps--legacy {
  display: none;
}

.next-steps__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.next-steps__head p {
  margin: 8px 0 0;
  color: #516f6b;
  line-height: 1.6;
}

.next-steps__head > strong {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #e8faf6;
  color: #0b5f59;
  font-size: 15px;
  padding: 8px 12px;
}

.launch-checklist {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.launch-card {
  display: grid;
  align-content: start;
  gap: 12px;
  border: 1px solid rgba(20, 184, 166, 0.16);
  border-radius: 8px;
  background: var(--surface);
  padding: 18px;
}

.launch-card--ready {
  border-color: rgba(6, 118, 71, 0.28);
}

.launch-card--warning {
  border-color: rgba(148, 98, 0, 0.32);
}

.launch-card--danger {
  border-color: rgba(180, 35, 24, 0.3);
}

.launch-card__top,
.launch-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.launch-card__top small {
  color: #66827e;
  font-weight: 900;
}

.launch-card > strong {
  color: #073f3a;
  font-size: 19px;
}

.launch-card p {
  margin: 0;
  color: #516f6b;
  line-height: 1.6;
}

.launch-card ul {
  display: grid;
  gap: 6px;
  margin: 0;
  color: #355c58;
  font-size: 15px;
  line-height: 1.5;
  padding-left: 18px;
}

.launch-card__actions {
  justify-content: flex-start;
  margin-top: 2px;
}

.launch-card__actions a {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #20b8ad;
  color: #ffffff;
  font-weight: 900;
  padding: 0 12px;
  text-decoration: none;
}

.launch-card__actions a.quiet {
  background: #e8faf6;
  color: #0f766e;
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
  .launch-checklist,
  .banner-manager,
  .poster-request-item {
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
  .step-grid,
  .launch-checklist {
    grid-template-columns: 1fr;
  }

  .next-steps__head {
    display: grid;
  }

  .page-hero {
    padding: 20px;
  }

  .page-hero h1 {
    font-size: 30px;
  }

  .hero-actions,
  .hero-actions a,
  .banner-actions,
  .banner-actions button {
    width: 100%;
  }

  .preview-label {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .admin-note,
  .banner-manager,
  .poster-review-panel,
  .next-steps,
  .menu-row {
    padding: 18px;
  }

  .poster-review-head {
    display: grid;
  }

  .poster-request-item {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .admin-page-content {
    padding: 8px 18px 22px;
  }

  .page-hero {
    border-radius: 10px;
    padding: 10px;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
  }

  .page-hero p,
  .status,
  .menu-row ul,
  .step-grid p {
    font-size: 11px;
    line-height: 1.3;
  }

  .page-hero h1 {
    font-size: 20px;
    line-height: 1.2;
  }

  .page-hero span,
  .menu-name strong,
  .step-grid strong,
  .preview-label strong,
  .home-banner-draft__meta strong {
    font-size: 12px;
    line-height: 1.35;
  }

  .hero-actions {
    gap: 7px;
  }

  .hero-actions a,
  .hero-actions button,
  .banner-actions button {
    min-height: 29px;
    border-radius: 7px;
    font-size: 11px;
    padding: 0 9px;
  }

  .admin-note,
  .banner-manager,
  .poster-review-panel,
  .next-steps,
  .menu-row {
    border-radius: 10px;
    padding: 10px;
  }

  .summary-grid,
  .step-grid,
  .launch-checklist {
    gap: 8px;
  }

  .step-grid article,
  .launch-card {
    border-radius: 9px;
    padding: 9px;
  }

  .next-steps__head {
    gap: 8px;
  }

  .next-steps__head h2,
  .launch-card > strong,
  .poster-review-panel h2 {
    font-size: 15px;
  }

  .next-steps__head p,
  .launch-card p,
  .launch-card ul,
  .launch-card__actions a,
  .preview-label span,
  .preview-label a,
  .home-banner-draft__meta small,
  .poster-review-head p,
  .poster-request-body small,
  .poster-request-actions button {
    font-size: 12px;
    line-height: 1.35;
  }

  .launch-card__actions a {
    min-height: 30px;
  }

  .error-text {
    border-radius: 8px;
    font-size: 12px;
    padding: 8px 9px;
  }
}
</style>
