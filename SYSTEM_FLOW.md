# System Flow

เอกสารนี้สรุปภาพรวมการทำงานของระบบ Read and Voice ในระดับ product flow, page flow, และจุดที่ยังควรปรับก่อนขึ้น production เต็มรูปแบบ

## ภาพรวมระบบ

ระบบแบ่งเป็น 4 แกนหลัก:

- ฝั่งผู้อ่าน
- ฝั่งการซื้อและสิทธิ์
- ฝั่งนักเขียน
- ฝั่งแอดมินและซูเปอร์แอดมิน

## 1. Flow ฝั่งผู้อ่าน

ผู้ใช้เริ่มจากหน้า `Home.vue` หรือ `Store.vue` แล้วเลือกหนังสือจาก shelf, banner, หรือหมวดต่าง ๆ จากนั้นเข้าสู่ `BookDetail.vue`

ใน `BookDetail` ระบบแสดงข้อมูลหลักของเรื่อง:

- ชื่อเรื่อง
- ผู้เขียน
- หมวด
- จำนวนตอนหรือรูปแบบหนังสือ
- ราคาและสิทธิ์อ่าน
- รีวิว
- ตัวอย่างเนื้อหา หรือรายการตอน

จากหน้านี้ ผู้ใช้ตัดสินใจหลักได้ดังนี้:

- `อ่านเลย`
- `อ่านให้ฟัง`
- `เพิ่มเข้าชั้น`

ถ้าหนังสืออ่านได้ทันที ระบบจะพาไป:

- `ReaderPage.vue` สำหรับอ่าน
- `ReaderListenPage.vue` สำหรับฟัง

ถ้ายังไม่มีสิทธิ์ ระบบจะพาไป:

- `ซื้อเพื่ออ่าน`
- หรือ `สมัครเพื่ออ่าน`

การตัดสินใจเรื่องสิทธิ์อ่านหลักเริ่มรวมไว้ที่ `src/utils/bookAccess.ts`

## 2. Flow หน้าอ่าน

หน้า `ReaderPage.vue` เป็นหน้าอ่านปกติ

flow หลักของหน้าอ่าน:

- โหลดข้อมูลหนังสือหรือตอน
- โหลดเนื้อหา
- โหลด progress เดิม
- โหลด setting การอ่าน เช่น font size, line height, color mode
- render เนื้อหาให้อ่าน
- บันทึก progress กลับ local และ backend

ถ้าเป็นนิยายรายตอน ผู้ใช้สามารถเปลี่ยนตอนถัดไปจากหน้า reader ได้โดยตรง

## 3. Flow หน้าอ่านให้ฟัง

หน้า `ReaderListenPage.vue` ถูกแยกเป็นไฟล์เฉพาะแล้ว

flow หลักของหน้าอ่านให้ฟัง:

- รับ `book id` และ optional `episode id`
- โหลดสิทธิ์เข้าถึงและเนื้อหา
- split เนื้อหาเป็นประโยค
- เปิด TTS ผ่าน Web Speech API
- ควบคุม play, pause, previous, next
- เปลี่ยนเสียงและความเร็ว
- บันทึก progress และค่าการฟัง

พฤติกรรมสำคัญ:

- กด `อ่านให้ฟัง` จาก `BookDetail` จะเข้า route ฟังโดยตรง
- กลับออกจากโหมดฟังจะกลับไปหน้าอ่านปกติ
- ถ้าเปลี่ยนตอนในโหมดฟัง จะยังอยู่ในหน้าฟัง

## 4. Flow login และ account

หน้าที่เกี่ยวข้อง:

- `Login.vue`
- `Register.vue`
- `ForgotPassword.vue`
- `LineLogin.vue`
- `OAuthCallback.vue`

flow หลัก:

- login สำเร็จ
- เก็บ `token` และ `user` ใน localStorage ผ่าน `src/utils/auth.ts`
- router guard ตรวจสิทธิ์ก่อนเข้าหน้าที่ต้อง auth

หลังล็อกอิน ผู้ใช้เข้าหน้า:

- `profile`
- `my-library`
- `cart`
- `orders/history`
- กลุ่ม `account/*`

หน้ากลุ่ม account ที่ใช้งานได้แล้ว:

- `following`
- `gift codes`
- `buffet`
- `devices`
- `benefits`
- `reviews`
- `age verification`

## 5. Flow ซื้อขายและสิทธิ์

ระบบ commerce รองรับ 3 รูปแบบ:

- ฟรี
- ซื้อด้วย coin
- อ่านด้วย subscription

flow หลัก:

- ถ้าเป็นฟรี: เข้าอ่านและฟังได้เลย
- ถ้าเป็น paid: ซื้อหนังสือหรือซื้อตอน
- ถ้าเป็น subscription: ไปเลือกแพ็กเกจที่ `subscription-plans`

หน้าที่เกี่ยวข้อง:

- `Cart.vue`
- `OrderHistory.vue`
- `SubscriptionPlans.vue`
- `CoinWallet.vue`

backend หลักที่รองรับ:

- `/api/cart`
- `/api/orders`
- `/api/subscriptions`
- `/api/coins`

## 6. Flow ชั้นหนังสือและตะกร้า

จาก `BookDetail` ผู้ใช้กด:

- `เพิ่มเข้าชั้น` ไป `library`
- `เพิ่มตะกร้า` ไป `cart`

หน้าที่เกี่ยวข้อง:

- `MyLibrary.vue`
- `Cart.vue`

flow นี้ใช้สำหรับ:

- ซื้อหรือเก็บสิทธิ์อ่าน
- สะสมคลังหนังสือ

## 7. Flow รีวิว

ใน `BookDetail` ผู้ใช้สามารถ:

- ดูรีวิว
- ให้คะแนน
- เขียนรีวิว
- แก้ไขรีวิว
- ลบรีวิวของตัวเอง

นอกจากนี้ยังมีหน้า account reviews สำหรับดูรีวิวของตัวเองอีกชั้น

## 8. Flow ฝั่งนักเขียน

หน้าหลัก:

- `writer/Dashboard.vue`
- `writer/WriterBooks.vue`
- `writer/Upload.vue`
- `writer/EditBook.vue`
- `writer/Stats.vue`

flow ปัจจุบัน:

- สร้างหนังสือ
- กรอก metadata
- อัปโหลดหรือสร้างเนื้อหา
- เพิ่มตอน, units, และ content
- publish หรือ unpublish
- ดูสถิติ

ระบบนี้ใช้งานได้แล้ว แต่ยังเป็น flow แบบหลายหน้าขนาดใหญ่และมี cognitive load สูง

## 9. Flow ฝั่งแอดมิน

หน้าหลัก:

- `dashboard`
- `books`
- `approvals`
- `page content`
- `categories`
- `members`

งานหลักของแอดมิน:

- ตรวจหนังสือ
- อนุมัติหรือไม่อนุมัติ
- จัด placement และ shelf
- แก้ข้อมูลหนังสือ
- จัดการหมวดหมู่
- ดูสมาชิก

ซูเปอร์แอดมินมีเพิ่ม:

- `roles`
- `users`
- `settings`

## สิ่งที่ยังขาดหรือควรปรับ

ถ้ามองแบบตรงที่สุด ระบบไม่ขาดแกนหลักแล้ว แต่ยังขาดความนิ่ง, ความครบเชิง production, และความสม่ำเสมอ

### 1. ReaderPage ยังมี logic ฟังค้างอยู่บางส่วน

แม้จะแยก `ReaderListenPage.vue` ออกแล้ว แต่ `ReaderPage.vue` ยังมีเงื่อนไข listen route และ logic ฟังบางส่วนตกค้าง

สิ่งที่ควรทำ:

- ล้าง logic ฟังออกจาก `ReaderPage.vue`
- ให้ `ReaderListenPage.vue` ถือ ownership ของฟีเจอร์ฟังทั้งหมด

### 2. Access flow ยังรวมศูนย์ไม่สุดทั้งระบบ

ตอนนี้ `BookDetail` เริ่มใช้ `bookAccess.ts` แล้ว แต่ logic เดียวกันยังอาจไม่ถูกใช้ครบใน:

- ปุ่มใน episode list
- cart flow
- order และ purchase flow บางจุด
- หน้าฝั่งอื่นที่ตัดสินใจเรื่องสิทธิ์

สิ่งที่ควรทำ:

- ใช้ `src/utils/bookAccess.ts` ให้ครบทุกจุดที่เกี่ยวกับสิทธิ์

### 3. Writer flow ยังไม่เป็น wizard

นี่คือจุดที่ยังขาดชัดที่สุดในเชิง UX

สิ่งที่ควรทำ:

- Step 1: ข้อมูลหนังสือ
- Step 2: เนื้อหาและตอน
- Step 3: preview และ pricing/access
- Step 4: publish หรือส่งอนุมัติ

### 4. State มาตรฐานยังไม่เท่ากันทุกหน้า

หลายหน้ามี loading, empty, error แล้ว แต่ยังไม่ standardized

จุดที่ควรเก็บก่อน:

- cart
- library
- account pages

สิ่งที่ควรทำ:

- ทำ pattern กลางสำหรับ `loading / empty / success / error / auth-required`

### 5. Forgot password ยังไม่ production เต็มรูปแบบ

ระบบมี endpoint แล้ว แต่ยังควรยกระดับเป็น flow production จริง

สิ่งที่ควรทำ:

- email sender จริง
- token expiry ที่ชัด
- หน้า success และ failure ที่ดี

### 6. Automated tests ยังน้อย

นี่คือช่องว่างใหญ่ในเชิงความมั่นใจ

อย่างน้อยควรมี test สำหรับ:

- auth flow
- book access decision
- reader route
- listen route
- purchase flow
- writer publish flow

### 7. Account area ยังควรจัดหมวด UX ให้ชัดขึ้น

แม้หน้ามีแล้ว แต่ information architecture ยังไม่เป็นศูนย์บัญชีเต็มตัว

ควร regroup เป็น:

- บัญชีและความปลอดภัย
- การซื้อและสิทธิ์ใช้งาน
- กิจกรรมและสังคม
- อุปกรณ์และข้อจำกัด

## สรุปสถานะ

ถ้าถามว่า “ระบบพร้อมไหม”

- พร้อมในระดับใช้งานและเดโมฟีเจอร์ครบ
- ยังไม่พร้อมเต็ม production ในแง่ความนิ่งและความเป็นระบบ

ถ้าถามว่า “ขาดอะไรที่สุด”

- ขาดการเก็บงาน flow ให้สะอาดและสม่ำเสมอ
- ขาด writer wizard
- ขาด tests
- ขาดการรวม access logic ให้ครบทุกจุด
- ขาดการ clean-up logic ซ้ำระหว่าง Reader กับ Listen

## ลำดับที่แนะนำให้ทำต่อ

1. clean `ReaderPage.vue` ให้เหลืออ่านล้วน
2. ใช้ `bookAccess.ts` ครอบทุกจุดสิทธิ์อ่านและซื้อ
3. ทำ writer upload และ edit เป็น wizard
4. ทำ state UI มาตรฐานทุกหน้า
5. เติม test flow หลัก
