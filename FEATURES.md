# FEATURES Audit

เอกสารนี้สรุปจากโค้ดปัจจุบันใน:

- `src/router/index.ts`
- `src/pages/**`
- `backend/server.js`
- `backend/routes/**`

เป้าหมายคือแยกให้เห็นชัดว่าแต่ละ `หน้า` มี `ฟังก์ชันอะไร`, มี `ฟอร์มอะไร`, ใช้ `API อะไร`, และสถานะตอนนี้เป็น:

- `พร้อมใช้งาน`
- `พร้อมใช้งานแบบ partial`
- `Placeholder`
- `ขาด backend`

## สรุปสถานะทั้งระบบ

| กลุ่ม | สถานะ |
|---|---|
| Public storefront, รายละเอียดหนังสือ, ตะกร้า, wishlist, library, orders | พร้อมใช้งาน |
| Reader + TTS | พร้อมใช้งานแบบ partial |
| Writer upload / TTS Studio / serial creation | พร้อมใช้งานแบบ partial |
| Admin จัดการหนังสือ / หมวดหมู่ / สมาชิก / approval | พร้อมใช้งาน |
| Account ย่อย (`/account/*`) | Placeholder แต่มี backend บางส่วน |
| Forgot password | พร้อมใช้งานแบบ partial |
| Writer edit book | มีหน้าอ่านข้อมูล แต่ยังไม่มี save flow จริง |
| Superadmin settings | Placeholder |

## กลุ่ม API ในระบบ

| Prefix | ใช้ทำอะไร |
|---|---|
| `/api/auth` | login, register, social login, me |
| `/api/books` | รายการหนังสือ, รายละเอียด, TOC, upload/manual/serial |
| `/api/reader` | reader payload, access, progress, TTS settings |
| `/api/progress` | progress แบบเดิม |
| `/api/cart` | ตะกร้า |
| `/api/orders` | checkout, purchase, order history |
| `/api/library` | ชั้นหนังสือของฉัน |
| `/api/wishlist` | wishlist |
| `/api/reviews` และ `/api/books/:bookId/reviews` | รีวิว |
| `/api/categories` | หมวดหมู่ |
| `/api/subscriptions` | แพ็กเกจและ subscribe |
| `/api/coins` | wallet, package, top-up |
| `/api/profile` | โปรไฟล์ผู้ใช้ |
| `/api/account` | following, devices, benefits, age verification, gift codes |
| `/api/writer/books` | หนังสือของนักเขียน, units, content segmentation, publish |
| `/api/admin` | users, role, status |
| `/api/admin/books` | approval queue และ placement flags |
| `/api/admin/stats` | dashboard summary |
| `/api/page-content` | page content manager |
| `/api/ebooks`, `/api/serials`, `/api/best-sellers`, `/api/new-releases`, `/api/promotions`, `/api/free-books`, `/api/hall-of-fame`, `/api/recommended`, `/api/subscription` | shelf/public listing |

## Audit รายหน้า

| Route | หน้า | ฟังก์ชันหลัก | ฟอร์ม | API ที่ใช้หลัก | สถานะ | หมายเหตุ |
|---|---|---|---|---|---|---|
| `/` | Home | หน้าแรก, ดึงชั้นหนังสือ/แนะนำ | ไม่มีฟอร์มหลัก | shelf APIs, `/api/page-content` | พร้อมใช้งาน | หน้า landing ใช้งานได้ |
| `/store` | Store | ดูรายการหนังสือ, ค้นหา, เพิ่ม wishlist/cart/library | ค้นหา | `/api/books`, `/api/wishlist`, `/api/library`, `/api/cart` | พร้อมใช้งาน | flow ซื้อและบันทึกใช้งานได้ |
| `/serials` | Serials | ดูรายการนิยายรายตอน | ค้นหา/กรอง | `/api/serials` หรือ `/api/books` | พร้อมใช้งาน | |
| `/book/:id` | BookDetail | รายละเอียดหนังสือ, ตอน, รีวิว, ซื้อ, wishlist/cart | รีวิว, ซื้อ, เพิ่ม wishlist/cart | `/api/books/:id`, `/api/books/:id/episodes`, `/api/books/:id/content`, review APIs, `/api/cart`, `/api/orders/purchase` | พร้อมใช้งาน | |
| `/best-sellers` | ShelfPage | ชั้นขายดี | ค้นหา | `/api/best-sellers` | พร้อมใช้งาน | ตอนนี้ผูกกับ approval placement flag แล้ว |
| `/new-releases` | ShelfPage | ชั้นมาใหม่ | ค้นหา | `/api/new-releases` | พร้อมใช้งาน | |
| `/promotions` | ShelfPage | ชั้นโปรโมชั่น | ค้นหา | `/api/promotions` | พร้อมใช้งาน | |
| `/free-books` | ShelfPage | ชั้นฟรี | ค้นหา | `/api/free-books` | พร้อมใช้งาน | |
| `/hall-of-fame` | ShelfPage | ชั้นฮิตขึ้นหิ้ง | ค้นหา | `/api/hall-of-fame` | พร้อมใช้งาน | |
| `/recommended` | ShelfPage | ชั้นแนะนำ | ค้นหา | `/api/recommended` | พร้อมใช้งาน | |
| `/subscription-plans` | SubscriptionPlans | ดูแพ็กเกจ subscription และสมัคร | เลือกแพ็กเกจ | `/api/subscriptions/plans`, `/api/subscriptions/checkout`, `/api/subscriptions/subscribe`, `/api/page-content` | พร้อมใช้งาน | |
| `/coin-wallet` | CoinWallet | wallet, packages, transaction, top-up | top-up | `/api/coins/packages`, `/api/coins/wallet`, `/api/coins/transactions`, `/api/coins/topup` | พร้อมใช้งาน | |
| `/login` | Login | เข้าสู่ระบบ | login form | `/api/auth/login` | พร้อมใช้งาน | |
| `/login/account` | AccountLogin | เข้าสู่ระบบแบบบัญชี | account login form | `/api/auth/login` | พร้อมใช้งาน | |
| `/login/line` | LineLogin | social login | ปุ่มเชื่อมต่อ | `/api/auth/oauth/:provider/start` | พร้อมใช้งาน | |
| `/oauth/callback` | OAuthCallback | รับ callback social login | ไม่มีฟอร์ม | `/api/auth/oauth/:provider/callback`, `/api/auth/social-login` | พร้อมใช้งาน | |
| `/register` | Register | สมัครสมาชิก | register form | `/api/auth/register` | พร้อมใช้งาน | |
| `/forgot-password` | ForgotPassword | ขอรีเซ็ตรหัสผ่านและตั้งรหัสใหม่ผ่าน reset token | email form, reset password form | `/api/auth/forgot-password`, `/api/auth/reset-password` | พร้อมใช้งานแบบ partial | ตอนนี้ใช้ preview reset link ในหน้า ยังไม่มี email delivery จริง |
| `/reader/:id` | ReaderPage | อ่านหนังสือ, TTS, จำ progress | controls reader/TTS | `/api/books/:id`, `/api/books/:id/episodes`, `/api/progress/:bookId`, `/api/reader/books/:bookId/content`, `/api/reader/episodes/:episodeId/content` | พร้อมใช้งานแบบ partial | หน้า reader ยังใช้ flow เดิมเป็นหลัก แม้ backend ใหม่ระดับ unit/sentence มีแล้ว |
| `/my-library` | MyLibrary | ชั้นหนังสือของฉัน | ค้นหา | `/api/library/me`, `/api/library/:bookId` | พร้อมใช้งาน | |
| `/wishlist` | Wishlist | wishlist ของฉัน | ไม่มีฟอร์มหลัก | `/api/wishlist` | พร้อมใช้งาน | |
| `/cart` | Cart | ดูตะกร้าและ checkout | checkout | `/api/cart`, `/api/orders/checkout`, `/api/coins/wallet` | พร้อมใช้งาน | |
| `/orders/history` | OrderHistory | ประวัติคำสั่งซื้อ | ไม่มีฟอร์มหลัก | `/api/orders/history` | พร้อมใช้งาน | |
| `/profile` | Profile | ดูและแก้โปรไฟล์ | profile form | `/api/profile/me` | พร้อมใช้งาน | |
| `/account/following` | AccountPlaceholder | ดูรายการที่ติดตาม | ไม่มีฟอร์มเฉพาะ | `/api/account/following` | Placeholder | มี backend แต่ UI ยังเป็น generic placeholder |
| `/account/gift-codes` | AccountPlaceholder | ดู gift codes | ไม่มีฟอร์มเฉพาะ | `/api/account/gift-codes` | Placeholder | |
| `/account/buffet` | AccountPlaceholder | ดูสถานะ buffet/subscription | ไม่มีฟอร์มเฉพาะ | `/api/account/buffet` | Placeholder | |
| `/account/devices` | AccountPlaceholder | ดูอุปกรณ์ที่ผูกบัญชี | ไม่มีฟอร์มเฉพาะ | `/api/account/devices` | Placeholder | |
| `/account/benefits` | AccountPlaceholder | ดูสิทธิประโยชน์ | ไม่มีฟอร์มเฉพาะ | `/api/account/benefits` | Placeholder | |
| `/account/reviews` | AccountPlaceholder | ดูรีวิวของฉัน | ไม่มีฟอร์มเฉพาะ | `/api/account/reviews` | Placeholder | |
| `/account/age-verification` | AccountPlaceholder | ส่งคำขอยืนยันอายุ | ปุ่ม submit verification | `/api/account/age-verification` | Placeholder | มี action จริง แต่ยังใช้หน้า generic |
| `/writer` | WriterDashboard | dashboard นักเขียน | ไม่มีฟอร์มหลัก | `/api/books` | พร้อมใช้งานแบบ partial | ใช้ข้อมูลสรุประดับรวม ยังไม่ใช่ dashboard writer เชิงลึก |
| `/writer/books` | WriterBooks | รายการหนังสือของนักเขียน | ไม่มีฟอร์มหลัก | `/api/writer/books/mine` | พร้อมใช้งาน | |
| `/writer/upload` | WriterUpload | อัปโหลด ebook, สร้าง serial, TTS Studio MVP, เสนอ placement | upload form, serial form, studio draft/unit/content forms | `/api/categories`, `/api/books/upload`, `/api/books/serial`, `/api/books/:id/episodes`, `/api/writer/books`, `/api/writer/books/:bookId/units`, `/api/writer/books/:bookId/units/:unitId/import-text`, `/api/writer/books/:bookId/units/:unitId/content`, `/api/writer/books/:bookId/publish` | พร้อมใช้งานแบบ partial | ใช้งานได้จริงแล้ว แต่ยังไม่แยกเป็น wizard production-ready เต็มรูปแบบ |
| `/writer/books/:id/edit` | WriterEditBook | แก้ metadata หนังสือของนักเขียน | edit form | `/api/books/:id`, `PUT /api/writer/books/:id`, `/api/categories` | พร้อมใช้งาน | แก้ title, author, category, access, price, cover, description ได้แล้ว |
| `/writer/stats` | WriterStats | ดูสถิตินักเขียนเบื้องต้น | ไม่มีฟอร์มหลัก | `/api/books` | พร้อมใช้งานแบบ partial | ยังไม่ใช้ endpoint stats เฉพาะนักเขียน |
| `/admin` | AdminDashboard | dashboard แอดมิน, ลิงก์ไปจัดการส่วนต่าง ๆ | ไม่มีฟอร์มหลัก | `/api/books`, `/api/admin/stats/summary` | พร้อมใช้งาน | |
| `/admin/books` | AdminBooks | รายการหนังสือทั้งหมดสำหรับแอดมิน | ค้นหา/จัดการ | `/api/books`, `/api/books/:id`, `/api/books/:id/episodes`, `/api/books/:id/content`, `/api/books/:id/reviews` | พร้อมใช้งาน | |
| `/admin/approvals` | AdminApprovals | อนุมัติหนังสือและกำหนด placement จริง | approval form, note, placement checkboxes | `/api/admin/books/pending`, `/api/admin/books/:id`, `/api/admin/books/:id/approval`, `/api/admin/books/:id/requested-placements` | พร้อมใช้งาน | เป็น flow ใหม่สำหรับอนุมัติ e-book/รายตอนระดับหนังสือ |
| `/admin/page-content` | AdminPageContent | จัดการภาพ subscription hero | upload image/url form | `/api/page-content`, `/api/page-content/subscription-hero` | พร้อมใช้งาน | |
| `/admin/books/edit/:id` | AdminEditBook | แก้ไข metadata หนังสือ | edit form | `/api/books/:id`, `PUT /api/books/:id` | พร้อมใช้งาน | |
| `/admin/upload-book` | UploadBook | อัปโหลดหนังสือฝั่งแอดมิน + ตั้ง requested placement | upload form | `/api/categories`, `/api/books/upload` | พร้อมใช้งาน | ฝั่ง admin upload จะ auto-approved |
| `/admin/categories` | AdminCategories | เพิ่ม/แก้/ลบหมวดหมู่ | category form | `/api/categories` | พร้อมใช้งาน | |
| `/admin/members` | AdminMembers | จัดการสมาชิกและ status | status form | `/api/admin/users`, `/api/admin/users/:id/status` | พร้อมใช้งาน | |
| `/superadmin/roles` | SuperAdminRoles | จัดการ role ผู้ใช้ | role form | `/api/admin/users`, `/api/admin/users/:id/role` | พร้อมใช้งาน | |
| `/superadmin/users` | SuperAdminUsers | จัดการผู้ใช้ระดับสูง | role/status form | `/api/admin/users`, `/api/admin/users/:id/status`, `/api/admin/users/:id/role`, `/api/admin/users/:id/approve-admin`, `/api/admin/users/:id/revoke-admin` | พร้อมใช้งาน | |
| `/superadmin/settings` | SuperAdminSettings | หน้าตั้งค่าระบบ | ไม่มีฟอร์มที่ผูก backend | ไม่มี | Placeholder | เป็น static page |

## ฟอร์มสำคัญในระบบ

| กลุ่ม | ฟอร์ม |
|---|---|
| Auth | login, register, account login |
| Store | search, review, add-to-cart, wishlist |
| Commerce | checkout, subscription checkout, coin top-up |
| Reader | reader controls, TTS controls, progress |
| Writer | ebook upload, serial creation, episode creation, TTS Studio draft, unit builder, import text, structured content submit, publish |
| Admin | upload book, edit book, categories, member status, approval note + placement |
| Account | age verification action, placeholder data views |

## หน้าที่เป็น Placeholder

| Route | เหตุผล |
|---|---|
| `/account/following` | ใช้ `AccountPlaceholder.vue` |
| `/account/gift-codes` | ใช้ `AccountPlaceholder.vue` |
| `/account/buffet` | ใช้ `AccountPlaceholder.vue` |
| `/account/devices` | ใช้ `AccountPlaceholder.vue` |
| `/account/benefits` | ใช้ `AccountPlaceholder.vue` |
| `/account/reviews` | ใช้ `AccountPlaceholder.vue` |
| `/account/age-verification` | ใช้ `AccountPlaceholder.vue` แม้มี action จริง |
| `/superadmin/settings` | เป็น static page |

## หน้าที่มี UI แล้ว แต่ยังขาด backend หรือ flow ยังไม่ครบ

| Route | สิ่งที่ขาด |
|---|---|
| `/forgot-password` | ยังไม่มี email delivery จริง ตอนนี้ใช้ preview reset link |
| `/reader/:id` | ยังไม่ได้ย้ายทั้งหน้าไปใช้ unit/block/sentence APIs ชุดใหม่เต็มรูปแบบ |
| `/writer/upload` | ใช้งานได้แล้ว แต่ยังไม่ครบ wizard 6 step ตามสเปกเต็ม |
| `/writer/stats` | ยังไม่มี stats backend เฉพาะนักเขียนแบบละเอียด |
| `/writer` | dashboard ยังเป็นภาพรวม ไม่ใช่ writer analytics เต็มรูปแบบ |

## ไฟล์หน้าที่มีอยู่ แต่ไม่ได้ถูก route ใช้งานตรง ๆ

| ไฟล์ | หมายเหตุ |
|---|---|
| `src/pages/Reader.vue` | หน้า reader รุ่นเก่า |
| `src/pages/SubscriptionPage.vue` | route ใช้ `SubscriptionPlans.vue` โดยตรง |
| `src/pages/writer/MyBooks.vue` | route ใช้ `writer/WriterBooks.vue` |
| `src/pages/superadmin/Dashboard.vue` | ยังไม่ถูก mount ใน router |

## งานที่ควรทำต่อก่อน

1. ย้าย `ReaderPage` ไปใช้ `/api/reader/books/:bookId/units/:unitId` และ progress แบบ sentence-level เต็มรูปแบบ
2. เปลี่ยน `/writer/upload` จาก MVP form เดียวเป็น wizard แยก step
3. ทำ `/writer/books/:id/edit` ให้บันทึกได้จริง
4. แยก `AccountPlaceholder.vue` ออกเป็นหน้าจริงทีละหน้า
5. ทำ forgot password backend ให้ครบ token + email flow
