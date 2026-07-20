# Read and Voice Features Audit

อ้างอิงจากโค้ดใน `../src/router/index.ts`, `../src/pages`, `server.js`, และ `routes/*.js`

## 1. ภาพรวมฟังก์ชันของเว็บไซต์

### ฝั่งผู้ใช้ทั่วไป
- สมัครสมาชิกและเข้าสู่ระบบด้วยอีเมล
- เข้าสู่ระบบผ่าน OAuth / social login
- ดูหน้าหลักและหน้าแนะนำหนังสือ
- ดูหน้าร้านหนังสือ, รายตอน, ขายดี, มาใหม่, โปรโมชัน, ฟรี, Hall of fame, Recommended
- ดูรายละเอียดหนังสือ, ตอน, รีวิว, คำอธิบาย, ราคา, สิทธิ์การเข้าถึง
- ซื้อหนังสือหรือซื้อตอน
- เพิ่มหนังสือลงตะกร้า
- เปิดหน้าอ่านหนังสือพร้อมระบบ TTS
- ดูชั้นหนังสือของฉัน
- ดูประวัติคำสั่งซื้อ
- ดูและแก้ไขโปรไฟล์
- ดูแพ็กเกจ subscription
- เติม coin และดูประวัติธุรกรรม

### ฝั่งสมาชิก
- บันทึกความคืบหน้าการอ่าน
- ดูสถานะ subscription ของตัวเอง
- เขียนรีวิว, แก้ไขรีวิว, ลบรีวิว
- ใช้งานหน้ากลุ่มบัญชี เช่น following, devices, benefits, age verification

### ฝั่งนักเขียน
- ดูแดชบอร์ดนักเขียน
- ดูรายการหนังสือของตัวเอง
- อัปโหลดหนังสือจากไฟล์
- สร้าง E-Book แบบ manual
- สร้างหนังสือแบบ serial และเพิ่ม episode
- ดูสถิติหนังสือเบื้องต้น
- เปิดหน้าแก้ไขหนังสือ

### ฝั่งแอดมิน / ซูเปอร์แอดมิน
- ดูแดชบอร์ดแอดมิน
- จัดการหนังสือ
- แก้ไขหนังสือ
- อัปโหลดหนังสือ
- จัดการหมวดหมู่
- จัดการสมาชิกและสิทธิ์
- จัดการ page content
- จัดการ role / status ผู้ใช้

## 2. API ที่มีในระบบ

### System
- `GET /`
- `GET /api`
- `GET /uploads/*`

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/oauth/status`
- `GET /api/auth/oauth/:provider/start`
- `GET /api/auth/oauth/:provider/callback`
- `POST /api/auth/oauth/:provider/callback`
- `POST /api/auth/social-login`
- `GET /api/auth/me`

### Books / Reader / Reviews
- `GET /api/books`
- `POST /api/books`
- `POST /api/books/upload`
- `POST /api/books/manual`
- `POST /api/books/serial`
- `GET /api/books/:id`
- `GET /api/books/:id/toc`
- `GET /api/books/:id/content`
- `GET /api/books/:id/episodes`
- `POST /api/books/:id/episodes`
- `PUT /api/books/:id`
- `DELETE /api/books/:id`
- `GET /api/reader/books/:bookId/content`
- `GET /api/reader/episodes/:episodeId/content`
- `GET /api/reader/books/:bookId/access`
- `GET /api/reader/books/:bookId/units/:unitId`
- `GET /api/reader/books/:bookId/progress`
- `POST /api/reader/books/:bookId/progress`
- `GET /api/reader/settings/tts`
- `PUT /api/reader/settings/tts`
- `GET /api/books/:bookId/reviews`
- `POST /api/books/:bookId/reviews`
- `PUT /api/reviews/:reviewId`
- `DELETE /api/reviews/:reviewId`

### Store / Shelves
- `GET /api/ebooks`
- `GET /api/serials`
- `GET /api/best-sellers`
- `GET /api/new-releases`
- `GET /api/promotions`
- `GET /api/free-books`
- `GET /api/hall-of-fame`
- `GET /api/recommended`
- `GET /api/subscription`

### Account / Profile / Member data
- `GET /api/profile/me`
- `PUT /api/profile/me`
- `GET /api/account/social-connections`
- `DELETE /api/account/social-connections/:provider`
- `GET /api/account/following`
- `POST /api/account/following`
- `DELETE /api/account/following/:id`
- `GET /api/account/devices`
- `POST /api/account/devices`
- `PUT /api/account/devices/:id`
- `DELETE /api/account/devices/:id`
- `GET /api/account/reviews`
- `POST /api/account/reviews`
- `GET /api/account/age-verification`
- `POST /api/account/age-verification`
- `GET /api/account/notifications`
- `POST /api/account/notifications/:id/read`
- `POST /api/account/notifications/read-all`

### Cart / Orders / Library / Progress
- `POST /api/cart`
- `GET /api/cart`
- `DELETE /api/cart/:id`
- `POST /api/orders/checkout`
- `POST /api/orders/purchase`
- `GET /api/orders/history`
- `GET /api/payments/status/:orderId`
- Mock payment endpoints were removed. Use coin checkout, manual top-up approval, or a real payment webhook.
- `POST /api/library`
- `GET /api/library/me`
- `DELETE /api/library/:bookId`
- `POST /api/progress`
- `GET /api/progress/:bookId`

### Categories / Subscription / Coins
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/subscriptions/plans`
- `GET /api/subscriptions/me`
- `POST /api/subscriptions/checkout`
- `POST /api/subscriptions/subscribe`
- `GET /api/coins/packages`
- `GET /api/coins/wallet`
- `GET /api/coins/transactions`
- `POST /api/coins/topup`

### Writer / Admin
- `POST /api/writer/books`
- `GET /api/writer/books/mine`
- `PUT /api/writer/books/:id`
- `DELETE /api/writer/books/:id`
- `GET /api/writer/books/:bookId/episodes`
- `POST /api/writer/books/:bookId/units`
- `PUT /api/writer/books/:bookId/units/:unitId`
- `POST /api/writer/books/:bookId/units/:unitId/import-text`
- `POST /api/writer/books/:bookId/units/:unitId/content`
- `GET /api/writer/books/:bookId/units/:unitId/content`
- `POST /api/writer/books/:bookId/publish`
- `POST /api/writer/books/:bookId/unpublish`
- `POST /api/writer/books/:bookId/episodes`
- `PUT /api/writer/books/episodes/:episodeId`
- `DELETE /api/writer/books/episodes/:episodeId`
- `GET /api/admin`
- `GET /api/admin/users`
- `PUT /api/admin/:id/status`
- `PUT /api/admin/users/:id/status`
- `PATCH /api/admin/:id/status`
- `PATCH /api/admin/users/:id/status`
- `PUT /api/admin/:id/role`
- `PUT /api/admin/users/:id/role`
- `PATCH /api/admin/:id/role`
- `PATCH /api/admin/users/:id/role`
- `PATCH /api/admin/users/:id/approve-admin`
- `PATCH /api/admin/users/:id/revoke-admin`
- `GET /api/admin/stats/summary`
- `GET /api/admin/books/pending`
- `GET /api/admin/books/:id`
- `PUT /api/admin/books/:id/approval`
- `PUT /api/admin/books/:id/requested-placements`
- `GET /api/page-content`
- `POST /api/page-content/subscription-hero`
- `DELETE /api/page-content/subscription-hero`
- `GET /api/episodes/:episodeId/comments`
- `POST /api/episodes/:episodeId/comments`
- `PUT /api/episode-comments/:commentId`
- `DELETE /api/episode-comments/:commentId`

## 3. ฟอร์มที่มีในระบบ

### ฟอร์มผู้ใช้ทั่วไป
- ฟอร์มค้นหาใน navbar
- ฟอร์ม login
- ฟอร์ม register
- ฟอร์ม account login
- ฟอร์ม forgot password
- ฟอร์มค้นหาใน store / shelf / my library
- ฟอร์มเพิ่มรีวิวและแก้ไขรีวิวในหน้า book detail
- ฟอร์มแก้ไขโปรไฟล์

### ฟอร์มธุรกรรม
- ฟอร์มเพิ่มเข้าตะกร้า
- ฟอร์ม checkout
- ฟอร์ม top-up coin
- ฟอร์มซื้อ subscription

### ฟอร์มนักเขียน
- ฟอร์มอัปโหลดหนังสือจากไฟล์
- ฟอร์มสร้าง E-Book แบบ manual
- ฟอร์มสร้าง serial พร้อมหลาย episode
- ฟอร์ม metadata หนังสือ
- ฟอร์ม chapter / episode builder
- ฟอร์ม preview settings
- ฟอร์ม TTS settings
- หน้าแก้ไขหนังสือของนักเขียนมีข้อมูลแสดง แต่ยังไม่ใช่ฟอร์มบันทึกจริง

### ฟอร์มแอดมิน
- ฟอร์มอัปโหลดหนังสือ
- ฟอร์มแก้ไขหนังสือ
- ฟอร์มเพิ่ม / แก้ไข / ลบหมวดหมู่
- ฟอร์มค้นหาและปรับ status / role สมาชิก
- ฟอร์มจัดการภาพ page content

## 4. ตารางหน้า / ฟังก์ชัน / ฟอร์ม / API ที่ใช้

| Route | หน้า | ฟังก์ชันหลัก | ฟอร์ม | API หลัก | สถานะ |
|---|---|---|---|---|---|
| `/` | Home | หน้าแรก, แนะนำหนังสือ | ไม่มีฟอร์มหลัก | ใช้ข้อมูลหนังสือ / shelf | พร้อมใช้งาน |
| `/store` | Store | ร้านหนังสือ, ค้นหา, ซื้อ, เพิ่มเข้าชั้น | ค้นหา | `GET /api/books`, `POST /api/library`, `POST /api/cart` | พร้อมใช้งาน |
| `/serials` | Serials | ดูรายการหนังสือแบบรายตอน | ไม่มีฟอร์มหลัก | `GET /api/books` | พร้อมใช้งาน |
| `/book/:id` | BookDetail | รายละเอียดหนังสือ, ตอน, รีวิว, ซื้อ, เพิ่มตะกร้า | รีวิว, ซื้อ, เพิ่มตะกร้า | `GET /api/books/:id`, `GET /api/books/:id/episodes`, `GET /api/books/:id/content`, `GET/POST/PUT/DELETE รีวิว`, `POST /api/cart`, `POST /api/orders/purchase` | พร้อมใช้งาน |
| `/best-sellers` | ShelfPage | ชั้นหนังสือแบบขายดี | ค้นหา | `GET /api/books` | พร้อมใช้งาน |
| `/new-releases` | ShelfPage | ชั้นหนังสือมาใหม่ | ค้นหา | `GET /api/books` | พร้อมใช้งาน |
| `/promotions` | ShelfPage | ชั้นหนังสือโปรโมชัน | ค้นหา | `GET /api/books` | พร้อมใช้งาน |
| `/free-books` | ShelfPage | ชั้นหนังสือฟรี | ค้นหา | `GET /api/books` | พร้อมใช้งาน |
| `/hall-of-fame` | ShelfPage | ชั้นหนังสือ hall of fame | ค้นหา | `GET /api/books` | พร้อมใช้งาน |
| `/recommended` | ShelfPage | ชั้นหนังสือแนะนำ | ค้นหา | `GET /api/books` | พร้อมใช้งาน |
| `/terms` | Terms | เงื่อนไขการใช้งาน | ไม่มี | ไม่มี | พร้อมใช้งาน |
| `/privacy-policy` | PrivacyPolicy | นโยบายความเป็นส่วนตัว | ไม่มี | ไม่มี | พร้อมใช้งาน |
| `/subscription-plans` | SubscriptionPlans | ดูแพ็กเกจ, สถานะสมาชิก, checkout | เลือกแพ็กเกจ | `GET /api/subscriptions/plans`, `GET /api/subscriptions/me`, `GET /api/page-content`, `POST /api/subscriptions/checkout` | พร้อมใช้งาน |
| `/coin-wallet` | CoinWallet | ดู coin wallet และเติม coin | เลือก package | `GET /api/coins/wallet`, `GET /api/coins/packages`, `GET /api/coins/transactions`, `POST /api/coins/topup` | พร้อมใช้งาน |
| `/login` | Login | login + social auth status | login | `POST /api/auth/login`, `GET /api/auth/oauth/status` | พร้อมใช้งาน |
| `/login/account` | AccountLogin | login แบบบัญชี | login | `POST /api/auth/login` | พร้อมใช้งาน |
| `/login/line` | LineLogin | social login page | ไม่มีฟอร์มหลัก | OAuth flow | พร้อมใช้งาน |
| `/oauth/callback` | OAuthCallback | รับ callback หลัง social login | ไม่มี | OAuth flow | พร้อมใช้งาน |
| `/register` | Register | สมัครสมาชิก | register | `POST /api/auth/register` | พร้อมใช้งาน |
| `/forgot-password` | ForgotPassword | ขอรีเซ็ตรหัสผ่าน | email form | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | พร้อมใช้งาน |
| `/reader/:id` | ReaderPage | อ่านหนังสือ, TTS, resume progress | ควบคุมเสียง / ตอน | `GET /api/books/:id`, `GET /api/books/:id/episodes`, `GET /api/progress/:bookId`, `GET /api/reader/books/:bookId/content`, `GET /api/reader/episodes/:episodeId/content`, `GET /api/reader/books/:bookId/access`, `GET /api/reader/books/:bookId/units/:unitId`, `GET /api/reader/settings/tts`, `PUT /api/reader/settings/tts` | พร้อมใช้งาน |
| `/my-library` | MyLibrary | ดูหนังสือที่มีสิทธิ์อ่าน | ค้นหา | `GET /api/library/me`, `DELETE /api/library/:bookId` | พร้อมใช้งาน |
| `/cart` | Cart | ดูตะกร้า, ลบ, checkout | checkout | `GET /api/cart`, `DELETE /api/cart/:id`, `GET /api/coins/wallet`, `POST /api/orders/checkout` | พร้อมใช้งาน |
| `/orders/history` | OrderHistory | ประวัติคำสั่งซื้อ | ไม่มี | `GET /api/orders/history` | พร้อมใช้งาน |
| `/profile` | Profile | ดูและแก้ไขโปรไฟล์, ลิงก์ไปหน้าบัญชีย่อย | แก้ไขโปรไฟล์ | `GET /api/profile/me`, `PUT /api/profile/me` | พร้อมใช้งาน |
| `/account/following` | AccountPlaceholder | ดูรายการติดตาม | ไม่มีฟอร์มเฉพาะ | `GET/POST/DELETE /api/account/following` | Placeholder |
| `/account/devices` | AccountPlaceholder | ดูอุปกรณ์ที่ผูก | ไม่มีฟอร์มเฉพาะ | `GET/POST /api/account/devices` | Placeholder |
| `/account/reviews` | AccountPlaceholder | ดูรีวิวของฉัน | ไม่มีฟอร์มเฉพาะ | `GET/POST /api/account/reviews` | Placeholder |
| `/account/age-verification` | AccountPlaceholder | ดู/ส่งคำขอยืนยันอายุ | ปุ่มส่งคำขอ | `GET/POST /api/account/age-verification` | Placeholder |
| `/writer` | WriterDashboard | dashboard นักเขียน | ไม่มีฟอร์มหลัก | `GET /api/books` | พร้อมใช้งาน |
| `/writer/books` | WriterBooks | รายการหนังสือของนักเขียน | ไม่มีฟอร์มหลัก | `GET /api/writer/books/mine` | พร้อมใช้งาน |
| `/writer/upload` | WriterUpload | อัปโหลด ebook/serial/manual และ TTS Studio 6 step | ฟอร์มอัปโหลดเต็มรูปแบบ + publish readiness checklist | `GET /api/categories`, `POST /api/books/upload`, `POST /api/books/manual`, `POST /api/books/serial`, `POST /api/books/:id/episodes`, `POST /api/writer/books`, `POST /api/writer/books/:bookId/units`, `POST /api/writer/books/:bookId/units/:unitId/content`, `POST /api/writer/books/:bookId/publish` | พร้อมใช้งาน |
| `/writer/books/:id/edit` | WriterEditBook | ดูข้อมูลหนังสือก่อนแก้ไข | ฟอร์มแก้ไข/บันทึก | `GET /api/books/:id`, `PUT /api/books/:id` | พร้อมใช้งาน |
| `/writer/stats` | WriterStats | ดูสถิตินักเขียนแบบละเอียด | ไม่มี | `GET /api/writer/books/stats` | พร้อมใช้งาน |
| `/admin` | AdminDashboard | จัดการหนังสือแบบรวม | ค้นหา, ลบหนังสือ | `GET /api/books`, `DELETE /api/books/:id` | พร้อมใช้งาน |
| `/admin/books` | AdminBooks | รายการหนังสือแอดมิน | ไม่มีฟอร์มหลัก | ใช้ข้อมูลหนังสือ | พร้อมใช้งาน |
| `/admin/page-content` | AdminPageContent | จัดการภาพ/คอนเทนต์บางส่วน | upload image / delete | `GET /api/books`, `GET /api/page-content`, `POST /api/page-content/subscription-hero`, `DELETE /api/page-content/subscription-hero` | พร้อมใช้งาน |
| `/admin/books/edit/:id` | AdminEditBook | แก้ไขข้อมูลหนังสือ | edit form | `GET /api/books/:id`, `PUT /api/books/:id` | พร้อมใช้งาน |
| `/admin/upload-book` | UploadBook | อัปโหลดหนังสือฝั่งแอดมิน | upload form | `GET /api/categories`, `POST /api/books/upload` | พร้อมใช้งาน |
| `/admin/categories` | AdminCategories | จัดการหมวดหมู่ | add/edit category | `GET /api/categories`, `POST /api/categories`, `PUT /api/categories/:id`, `DELETE /api/categories/:id` | พร้อมใช้งาน |
| `/admin/members` | AdminMembers | จัดการสถานะสมาชิก | เปลี่ยน status | `GET /api/admin/users`, `PUT /api/admin/users/:id/status` | พร้อมใช้งาน |
| `/superadmin/roles` | SuperAdminRoles | จัดการ role | เปลี่ยน role | `GET /api/admin/users`, `PATCH /api/admin/users/:id/role` | พร้อมใช้งาน |
| `/superadmin/users` | SuperAdminUsers | จัดการ user ระดับสูง | เปลี่ยน role/status | `GET /api/admin/users`, `PATCH /api/admin/users/:id/status`, `PATCH /api/admin/users/:id/role`, `PATCH /api/admin/users/:id/approve-admin`, `PATCH /api/admin/users/:id/revoke-admin` | พร้อมใช้งาน |
| `/superadmin/settings` | SuperAdminSettings | หน้า settings ระดับระบบและ operational readiness | launch checklist + system settings | `GET/PUT /api/admin/settings/checklist`, `GET/PUT /api/admin/settings/system`, `GET /api/admin/settings/readiness`, `GET /api/admin/settings/operations` | พร้อมใช้งาน |

## 5. Audit สถานะหน้า

### A. พร้อมใช้งาน
| หน้า | หมายเหตุ |
|---|---|
| Home | หน้าแรกใช้งานได้ |
| Store | ค้นหา, ซื้อ/เพิ่ม library |
| Serials | แสดงรายการรายตอน |
| BookDetail | ข้อมูลหนังสือ, ตอน, รีวิว, ซื้อ |
| ShelfPage ทุกหมวด | ใช้งานได้ครบตาม route |
| SubscriptionPlans | ดึงแพ็กเกจและ checkout ได้ |
| CoinWallet | wallet, package, transaction, top-up |
| Login / AccountLogin / Register / OAuthCallback | flow หลักพร้อม |
| ReaderPage | reader + TTS + progress |
| MyLibrary / Cart / OrderHistory | ฟีเจอร์หลักพร้อม |
| Profile | ดูและแก้ไขโปรไฟล์ได้ |
| WriterDashboard / WriterBooks | ใช้งานได้ |
| AdminDashboard / AdminEditBook / UploadBook / Categories / Members / PageContent | ใช้งานได้ |
| SuperAdminRoles / SuperAdminUsers | ผูกกับระบบจัดการ user แล้ว |

### B. ยังเป็น Placeholder หรือหน้าโครง
| หน้า | สถานะ |
|---|---|
| AccountFollowing | ใช้ `AccountPlaceholder.vue` |
| AccountDevices | ใช้ `AccountPlaceholder.vue` |
| AccountReviews | ใช้ `AccountPlaceholder.vue` |
| AccountAgeVerification | ใช้ `AccountPlaceholder.vue` พร้อมปุ่มส่งคำขอ |
| SuperAdminSettings | ผูก API settings/readiness/operations แล้ว |

### C. มีหน้าแล้ว แต่ยังขาด backend หรือยังไม่ครบ flow
| หน้า | ที่ขาด |
|---|---|
| ForgotPassword | มี backend แล้วผ่าน `POST /api/auth/forgot-password` และ `POST /api/auth/reset-password` |
| WriterEditBook | มี backend save/update แล้วผ่าน `PUT /api/books/:id` |
| WriterUpload | มี schema `language`, `tags`, unit/block/sentence-level storage, TTS settings และ publish readiness flow แล้ว |
| WriterStats | ใช้ endpoint เฉพาะนักเขียน `/api/writer/books/stats` แล้ว |

### D. ไฟล์หน้าที่มีอยู่ แต่ยังไม่ถูก route ใช้งานตรง ๆ
| ไฟล์ | หมายเหตุ |
|---|---|
| `../src/pages/Reader.vue` | หน้าแจ้งว่า reader หลักย้ายแล้ว |
| `../src/pages/SubscriptionPage.vue` | wrapper ของ `SubscriptionPlans.vue` แต่ route ใช้ `SubscriptionPlans` โดยตรง |
| `../src/pages/writer/MyBooks.vue` | มีไฟล์ แต่ route ใช้ `writer/WriterBooks.vue` |
| `../src/pages/superadmin/Dashboard.vue` | มีไฟล์ แต่ route ยังไม่ชี้มาใช้ |

## 6. สรุปสั้น

ตอนนี้ระบบมีโครงสร้างหลักครบแล้วทั้งฝั่งผู้อ่าน, นักเขียน, แอดมิน, และซูเปอร์แอดมิน แต่ยังมี 3 กลุ่มที่ควรทำต่อเป็นลำดับแรก

1. ทำหน้ากลุ่ม `account/*` ให้เลิกใช้ placeholder แยกเป็นหน้าจริง
2. ต่อ provider อีเมลจริงใน production สำหรับ forgot password หากยังไม่ได้ตั้งค่า Resend/webhook
3. เพิ่ม analytics รายวัน/รายเดือนให้ writer dashboard หากต้องการมากกว่าสรุปรวม
