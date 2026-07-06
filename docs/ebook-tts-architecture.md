# E-Book + TTS Architecture

เอกสารนี้ออกแบบต่อจากระบบปัจจุบันในโปรเจกต์ ซึ่งตอนนี้มีโครงสร้างหลักอยู่แล้วใน:

- `backend/routes/books.js`
- `backend/routes/reader.js`
- `backend/routes/progress.js`
- `backend/services/scripts/initDatabase.js`
- `src/pages/writer/Upload.vue`

เป้าหมายคือยกระดับจากการเก็บแบบ `full_text` / `book_pages` / `book_episodes.content`
ไปเป็นโครงสร้างที่รองรับ:

- Reader ที่เปิดเป็น chapter / episode ได้ชัดเจน
- TTS ที่อ่านเป็น paragraph / sentence
- highlight ตามประโยค
- resume ตำแหน่งได้แม่น
- monetization แบบ free / paid / subscription / preview
- workflow ฝั่งนักเขียนที่ใช้งานได้จริง

## 1. แนวทางออกแบบ

ระบบใหม่ควรมี 4 ชั้น:

1. `Book metadata`
2. `Structural content`
3. `TTS-ready content units`
4. `Reader state`

แนวคิดสำคัญคือ:

- `books` เป็นหัวหนังสือ
- `book_units` เป็น chapter หรือ episode แบบรวมในตารางเดียว
- `book_unit_blocks` เป็นย่อหน้า / dialogue / heading / quote
- `book_unit_sentences` เป็นหน่วยเล็กสุดสำหรับ TTS, highlight, resume

โครงสร้างนี้ทำให้ `ebook` และ `serial` ใช้ reader ชุดเดียวกันได้ ต่างกันแค่ชนิดของ unit

## 2. Database Schema พร้อมใช้

ด้านล่างเป็น schema เวอร์ชันแนะนำสำหรับ MySQL โดยยังคงเข้ากับฐานเดิมได้

### 2.1 `books`

ใช้แทน metadata ระดับเล่ม

```sql
CREATE TABLE books (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  subtitle VARCHAR(500) NULL,
  author_name VARCHAR(255) NOT NULL,
  author_id BIGINT UNSIGNED NULL,
  description TEXT NULL,
  cover_image_url TEXT NULL,
  category_id BIGINT UNSIGNED NULL,
  language_code VARCHAR(20) NOT NULL DEFAULT 'th',
  content_type ENUM('ebook','serial') NOT NULL DEFAULT 'ebook',
  access_type ENUM('free','paid','subscription') NOT NULL DEFAULT 'paid',
  lifecycle_status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  publishing_status ENUM('processing','ready','failed') NOT NULL DEFAULT 'ready',
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  coin_price INT NOT NULL DEFAULT 0,
  preview_mode ENUM('none','percentage','chapter_count','sentence_count') NOT NULL DEFAULT 'percentage',
  preview_value INT NOT NULL DEFAULT 10,
  total_units INT NOT NULL DEFAULT 0,
  total_blocks INT NOT NULL DEFAULT 0,
  total_sentences INT NOT NULL DEFAULT 0,
  total_words INT NOT NULL DEFAULT 0,
  total_characters INT NOT NULL DEFAULT 0,
  estimated_reading_minutes INT NOT NULL DEFAULT 0,
  age_rating VARCHAR(30) NULL,
  seo_title VARCHAR(255) NULL,
  seo_description VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_books_category_id (category_id),
  INDEX idx_books_author_id (author_id),
  INDEX idx_books_content_type (content_type),
  INDEX idx_books_access_type (access_type),
  INDEX idx_books_lifecycle_status (lifecycle_status),
  INDEX idx_books_created_by (created_by)
);
```

หมายเหตุ:

- ใช้ `slug` เพื่อ URL สวยและ stable
- แยก `lifecycle_status` ออกจาก `publishing_status` เพราะหนังสืออาจ `draft` แต่ไฟล์ parse เสร็จแล้ว
- `preview_mode + preview_value` ยืดหยุ่นกว่า `preview_page_limit` แบบเดิม

### 2.2 `book_tags` และ `book_tag_maps`

```sql
CREATE TABLE book_tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE book_tag_maps (
  book_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (book_id, tag_id),
  INDEX idx_book_tag_maps_tag_id (tag_id)
);
```

### 2.3 `book_units`

แทน chapter ของ ebook และ episode ของ serial

```sql
CREATE TABLE book_units (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id BIGINT UNSIGNED NOT NULL,
  unit_type ENUM('chapter','episode') NOT NULL,
  unit_number INT NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  short_title VARCHAR(255) NULL,
  summary TEXT NULL,
  access_type ENUM('inherit','free','paid','subscription') NOT NULL DEFAULT 'inherit',
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  coin_price INT NOT NULL DEFAULT 0,
  is_preview TINYINT(1) NOT NULL DEFAULT 0,
  lifecycle_status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  audio_status ENUM('none','queued','processing','ready','failed') NOT NULL DEFAULT 'none',
  estimated_reading_minutes INT NOT NULL DEFAULT 0,
  sentence_count INT NOT NULL DEFAULT 0,
  word_count INT NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_book_units_book_unit_number (book_id, unit_number),
  UNIQUE KEY uq_book_units_book_slug (book_id, slug),
  INDEX idx_book_units_book_id (book_id),
  INDEX idx_book_units_type_status (unit_type, lifecycle_status)
);
```

ข้อดี:

- ไม่ต้องแยก `book_pages` กับ `book_episodes` เป็นคนละรูปแบบสำหรับ reader ใหม่
- serial ขายรายตอนได้ตรงจุด
- ebook ก็มี chapter ชัดเจนแทน page-only model

### 2.4 `book_unit_blocks`

แทนย่อหน้าและส่วนแสดงผล

```sql
CREATE TABLE book_unit_blocks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_unit_id BIGINT UNSIGNED NOT NULL,
  block_order INT NOT NULL,
  block_type ENUM('heading','paragraph','dialogue','quote','list_item','separator') NOT NULL DEFAULT 'paragraph',
  display_text LONGTEXT NOT NULL,
  tts_text LONGTEXT NULL,
  speaker_name VARCHAR(255) NULL,
  char_count INT NOT NULL DEFAULT 0,
  sentence_count INT NOT NULL DEFAULT 0,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_book_unit_blocks_order (book_unit_id, block_order),
  INDEX idx_book_unit_blocks_unit_id (book_unit_id)
);
```

แนวคิด:

- `display_text` คือสิ่งที่เห็นใน reader
- `tts_text` คือข้อความที่ preprocess แล้วเพื่อให้อ่านเสียงดีขึ้น
- dialogue สามารถเก็บ `speaker_name`

### 2.5 `book_unit_sentences`

หัวใจของระบบ TTS

```sql
CREATE TABLE book_unit_sentences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sentence_uuid CHAR(36) NOT NULL,
  book_id BIGINT UNSIGNED NOT NULL,
  book_unit_id BIGINT UNSIGNED NOT NULL,
  block_id BIGINT UNSIGNED NOT NULL,
  sentence_order INT NOT NULL,
  sentence_in_block INT NOT NULL,
  display_text TEXT NOT NULL,
  tts_text TEXT NOT NULL,
  plain_text TEXT NOT NULL,
  start_offset INT NULL,
  end_offset INT NULL,
  duration_ms_estimate INT NOT NULL DEFAULT 0,
  audio_status ENUM('none','queued','processing','ready','failed') NOT NULL DEFAULT 'none',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_book_unit_sentences_uuid (sentence_uuid),
  UNIQUE KEY uq_book_unit_sentences_order (book_unit_id, sentence_order),
  INDEX idx_book_unit_sentences_block_id (block_id),
  INDEX idx_book_unit_sentences_book_id (book_id)
);
```

สิ่งที่สำคัญมาก:

- ใช้ `sentence_uuid` เป็น stable identity
- resume, bookmark, note, highlight ควรอ้างอิงที่ระดับนี้

### 2.6 Book asset storage

`book_assets` was removed from the active schema because no runtime flow reads or writes it.
The current implementation keeps source files in `book_files` and cover paths on `books`
(`cover_image` / `cover_image_url`).

### 2.7 `reading_progress`

แนะนำให้แทนของเดิมด้วย schema ที่แม่นขึ้น

```sql
CREATE TABLE reading_progress (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  book_id BIGINT UNSIGNED NOT NULL,
  book_unit_id BIGINT UNSIGNED NULL,
  block_id BIGINT UNSIGNED NULL,
  sentence_id BIGINT UNSIGNED NULL,
  sentence_uuid CHAR(36) NULL,
  progress_percent DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  last_position_ms INT NOT NULL DEFAULT 0,
  last_scroll_offset INT NOT NULL DEFAULT 0,
  reading_mode ENUM('read','listen','read_listen') NOT NULL DEFAULT 'read',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reading_progress_user_book (user_id, book_id),
  INDEX idx_reading_progress_user_id (user_id),
  INDEX idx_reading_progress_sentence_id (sentence_id)
);
```

### 2.8 `tts_user_settings`

```sql
CREATE TABLE tts_user_settings (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  voice_name VARCHAR(255) NULL,
  locale VARCHAR(20) NOT NULL DEFAULT 'th-TH',
  rate DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  pitch DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  volume DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  autoplay TINYINT(1) NOT NULL DEFAULT 0,
  highlight_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2.9 `bookmarks`, `reader_highlights`, `reader_notes`

```sql
CREATE TABLE bookmarks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  book_id BIGINT UNSIGNED NOT NULL,
  book_unit_id BIGINT UNSIGNED NOT NULL,
  sentence_id BIGINT UNSIGNED NULL,
  sentence_uuid CHAR(36) NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bookmarks_user_book (user_id, book_id)
);

CREATE TABLE reader_highlights (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  book_id BIGINT UNSIGNED NOT NULL,
  book_unit_id BIGINT UNSIGNED NOT NULL,
  start_sentence_id BIGINT UNSIGNED NOT NULL,
  end_sentence_id BIGINT UNSIGNED NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'yellow',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reader_highlights_user_book (user_id, book_id)
);

CREATE TABLE reader_notes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  book_id BIGINT UNSIGNED NOT NULL,
  book_unit_id BIGINT UNSIGNED NOT NULL,
  sentence_id BIGINT UNSIGNED NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reader_notes_user_book (user_id, book_id)
);
```

### 2.10 `tts_audio_jobs` และ `tts_audio_segments`

```sql
CREATE TABLE tts_audio_jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id BIGINT UNSIGNED NOT NULL,
  book_unit_id BIGINT UNSIGNED NULL,
  requested_by BIGINT UNSIGNED NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'browser',
  voice_name VARCHAR(255) NULL,
  status ENUM('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tts_audio_jobs_status (status),
  INDEX idx_tts_audio_jobs_book_unit (book_id, book_unit_id)
);

CREATE TABLE tts_audio_segments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id BIGINT UNSIGNED NOT NULL,
  sentence_id BIGINT UNSIGNED NOT NULL,
  file_path TEXT NOT NULL,
  duration_ms INT NOT NULL DEFAULT 0,
  status ENUM('ready','failed') NOT NULL DEFAULT 'ready',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tts_audio_segments_job_sentence (job_id, sentence_id),
  INDEX idx_tts_audio_segments_sentence_id (sentence_id)
);
```

## 3. Mapping จากฐานข้อมูลเดิม

ระบบเดิมในโปรเจกต์:

- `books`
- `book_episodes`
- `book_pages`
- `reading_progress`
- `tts_settings`

แนวทาง migration ที่ปลอดภัย:

1. คง `books` ไว้เป็นตารางหลัก
2. เพิ่ม field ใหม่ใน `books` แทนการลบของเดิมก่อน
3. สร้าง `book_units`, `book_unit_blocks`, `book_unit_sentences`
4. migrate ข้อมูลจาก:
   - `book_pages` -> chapter เดียวหรือหลาย chapter ใน `book_units`
   - `book_episodes` -> episode ใน `book_units`
5. เปลี่ยน `reader.js` ให้ดึงจากตารางใหม่
6. ค่อยเลิกพึ่ง `full_text` และ `book_pages`

แนวทาง map:

- ebook เดิม:
  - สร้าง `book_units` อย่างน้อย 1 row เป็น `chapter`
  - แต่ละ page รวมเป็น blocks
  - split เป็น sentences

- serial เดิม:
  - 1 episode เดิม = 1 `book_unit`
  - เนื้อหา `content` แปลงเป็น `book_unit_blocks`
  - split เป็น `book_unit_sentences`

## 4. API Endpoints เวอร์ชันพร้อมใช้

ออกแบบให้ยังสอดคล้องกับ pattern ของ backend ปัจจุบันที่ใช้ `/api/books`, `/api/writer/books`, `/api/reader`, `/api/progress`

## 4.1 Writer APIs

### `POST /api/writer/books`

สร้างหนังสือ draft

```json
{
  "title": "ชื่อเรื่อง",
  "subtitle": "ถ้ามี",
  "author_name": "ชื่อผู้เขียน",
  "description": "คำโปรย",
  "category_id": 2,
  "language_code": "th",
  "content_type": "ebook",
  "access_type": "paid",
  "price": 49,
  "coin_price": 49,
  "preview_mode": "percentage",
  "preview_value": 10,
  "tags": ["นิยาย", "แฟนตาซี"]
}
```

response:

```json
{
  "id": 101,
  "slug": "my-book",
  "lifecycle_status": "draft"
}
```

### `PUT /api/writer/books/:bookId`

แก้ metadata หนังสือ

### `POST /api/writer/books/:bookId/cover`

อัปโหลดรูปปก

multipart:

- `cover_file`

### `POST /api/writer/books/:bookId/source-file`

อัปโหลดไฟล์ต้นฉบับ pdf/txt/docx/json เพื่อ parse

response:

```json
{
  "job_id": 777,
  "status": "processing"
}
```

### `POST /api/writer/books/:bookId/units`

สร้าง chapter หรือ episode

```json
{
  "unit_type": "chapter",
  "unit_number": 1,
  "title": "บทนำ",
  "summary": "เกริ่นนำ",
  "access_type": "inherit",
  "is_preview": true
}
```

### `PUT /api/writer/books/:bookId/units/:unitId`

แก้ chapter/episode metadata

### `POST /api/writer/books/:bookId/units/:unitId/content`

ส่งเนื้อหาจาก editor ให้ backend แปลงเป็น block + sentence

```json
{
  "content_blocks": [
    {
      "block_type": "paragraph",
      "display_text": "วันนี้อากาศดีมาก ผมเดินออกจากบ้านแต่เช้า"
    },
    {
      "block_type": "dialogue",
      "speaker_name": "แม่",
      "display_text": "รีบกลับบ้านนะ"
    }
  ]
}
```

response:

```json
{
  "unit_id": 201,
  "blocks_created": 2,
  "sentences_created": 3
}
```

### `POST /api/writer/books/:bookId/units/:unitId/import-text`

ให้ backend รับ raw text แล้วแยก paragraph / sentence อัตโนมัติ

```json
{
  "raw_text": "วันนี้อากาศดีมาก...\n\n\"สวัสดี\" เขาพูด",
  "split_mode": "auto"
}
```

### `GET /api/writer/books/:bookId/units/:unitId/content`

อ่านฉบับ editor พร้อม sentence preview

### `POST /api/writer/books/:bookId/tts-preview`

พรีวิวเสียงจากข้อความตัวอย่างหรือ unit ปัจจุบัน

### `POST /api/writer/books/:bookId/publish`

publish หนังสือ โดย validate ว่าข้อมูลครบ

validation ขั้นต่ำ:

- มี title
- มี cover
- มีอย่างน้อย 1 unit
- แต่ละ unit มี sentences
- access_type กับราคา valid

### `POST /api/writer/books/:bookId/unpublish`

เปลี่ยนกลับเป็น draft

## 4.2 Reader APIs

### `GET /api/books`

list หนังสือพร้อม filter:

- `category`
- `tag`
- `content_type`
- `access_type`
- `q`
- `sort`

### `GET /api/books/:bookId`

รายละเอียดหนังสือ

response ควรมี:

```json
{
  "id": 101,
  "slug": "my-book",
  "title": "ชื่อเรื่อง",
  "author_name": "ผู้เขียน",
  "description": "คำโปรย",
  "cover_image_url": "https://...",
  "content_type": "ebook",
  "access_type": "paid",
  "price": 49,
  "coin_price": 49,
  "language_code": "th",
  "category": { "id": 2, "name": "นิยาย" },
  "tags": ["โรแมนติก", "อบอุ่น"],
  "stats": {
    "unit_count": 12,
    "sentence_count": 1850
  },
  "viewer_access": {
    "can_read_full": false,
    "can_preview": true,
    "reason": "purchase_required"
  }
}
```

### `GET /api/books/:bookId/toc`

สารบัญ

response:

```json
[
  {
    "id": 201,
    "unit_type": "chapter",
    "unit_number": 1,
    "title": "บทนำ",
    "is_preview": true,
    "is_locked": false
  }
]
```

### `GET /api/reader/books/:bookId/units/:unitId`

โหลด reader payload ของ unit เดียว

response:

```json
{
  "book": {
    "id": 101,
    "title": "ชื่อเรื่อง"
  },
  "unit": {
    "id": 201,
    "unit_number": 1,
    "title": "บทนำ",
    "is_locked": false
  },
  "blocks": [
    {
      "id": 5001,
      "block_type": "paragraph",
      "display_text": "วันนี้อากาศดีมาก...",
      "sentences": [
        {
          "id": 9001,
          "sentence_uuid": "2a3d...",
          "display_text": "วันนี้อากาศดีมาก",
          "tts_text": "วันนี้ อากาศ ดี มาก"
        }
      ]
    }
  ],
  "next_unit_id": 202,
  "prev_unit_id": null
}
```

### `GET /api/reader/books/:bookId/full`

โหลดแบบ full stream เฉพาะกรณีต้อง preload หลาย unit

### `GET /api/reader/books/:bookId/access`

เช็กสิทธิ์ของ user ต่อหนังสือและแต่ละ unit

### `POST /api/reader/books/:bookId/progress`

บันทึกตำแหน่งอ่าน

```json
{
  "book_unit_id": 201,
  "block_id": 5001,
  "sentence_id": 9001,
  "sentence_uuid": "2a3d...",
  "progress_percent": 13.25,
  "last_position_ms": 24000,
  "last_scroll_offset": 680,
  "reading_mode": "read_listen"
}
```

### `GET /api/reader/books/:bookId/progress`

ดึง resume data

### `GET /api/reader/settings/tts`

ดึงค่าตั้งเสียง

### `PUT /api/reader/settings/tts`

```json
{
  "voice_name": "th-TH-Neural-A",
  "locale": "th-TH",
  "rate": 1.1,
  "pitch": 1.0,
  "volume": 1.0,
  "autoplay": true,
  "highlight_enabled": true
}
```

## 4.3 Bookmark / Highlight / Note APIs

### `POST /api/reader/books/:bookId/bookmarks`
### `GET /api/reader/books/:bookId/bookmarks`
### `DELETE /api/reader/books/:bookId/bookmarks/:bookmarkId`

### `POST /api/reader/books/:bookId/highlights`
### `GET /api/reader/books/:bookId/highlights`
### `PUT /api/reader/books/:bookId/highlights/:highlightId`
### `DELETE /api/reader/books/:bookId/highlights/:highlightId`

### `POST /api/reader/books/:bookId/notes`
### `GET /api/reader/books/:bookId/notes`
### `PUT /api/reader/books/:bookId/notes/:noteId`
### `DELETE /api/reader/books/:bookId/notes/:noteId`

## 4.4 TTS/Admin Processing APIs

### `POST /api/internal/books/:bookId/tts/jobs`

queue งาน generate audio

### `GET /api/internal/tts/jobs/:jobId`

ดูสถานะ

### `POST /api/internal/books/:bookId/rebuild-content`

ใช้ตอนนักเขียนแก้เนื้อหาและต้อง regenerate sentences

## 5. Upload/Create Book Flow สำหรับหน้าเว็บ

หน้าเดิมใน `src/pages/writer/Upload.vue` ยังเป็น single-page form แบบเรียบง่าย
แต่สำหรับระบบนี้ควรเปลี่ยนเป็น wizard 6 step

## 5.1 Flow หลัก

### Step 1: ข้อมูลพื้นฐาน

fields:

- ชื่อหนังสือ
- subtitle
- ผู้เขียน
- คำโปรย
- หมวดหมู่
- ภาษา
- tags
- รูปปก

actions:

- `Save draft`
- `Next`

backend:

- `POST /api/writer/books` หรือ `PUT /api/writer/books/:id`

### Step 2: รูปแบบและสิทธิ์การเข้าถึง

fields:

- ประเภท `ebook / serial`
- สิทธิ์ `free / paid / subscription`
- ราคา
- coin price
- preview mode
- preview value
- age rating

dynamic rules:

- ถ้า `free` ซ่อนราคา
- ถ้า `subscription` แสดงข้อความว่าอ่านได้เฉพาะสมาชิก
- ถ้า `serial` แสดงว่าแต่ละตอน override access ได้

### Step 3: โครงสร้างหนังสือ

ถ้า `ebook`:

- ปุ่ม `เพิ่มบท`
- แต่ละบทมี:
  - title
  - summary
  - order
  - preview toggle

ถ้า `serial`:

- ปุ่ม `เพิ่มตอน`
- แต่ละตอนมี:
  - title
  - episode number
  - access override
  - price override
  - publish toggle

backend:

- `POST /api/writer/books/:bookId/units`
- `PUT /api/writer/books/:bookId/units/:unitId`

### Step 4: ใส่เนื้อหา

UI ที่ควรมี:

- ซ้าย: รายการ chapter/episode
- กลาง: editor
- ขวา: content diagnostics

editor actions:

- `แยกย่อหน้าอัตโนมัติ`
- `แยกประโยคอัตโนมัติ`
- `ระบุเป็นบทสนทนา`
- `พรีวิวเสียง`
- `highlight preview`

content diagnostics:

- จำนวน blocks
- จำนวน sentences
- ประโยคยาวเกิน threshold
- เครื่องหมายวรรคตอนหาย
- มีข้อความซ้ำ

backend:

- `POST /api/writer/books/:bookId/units/:unitId/content`
- `POST /api/writer/books/:bookId/units/:unitId/import-text`

### Step 5: พรีวิว Reader + TTS

ต้องมี preview panel 2 แบบ:

1. `Reader preview`
2. `Audio preview`

Reader preview ควรเห็น:

- title / chapter
- sentence highlight
- next / previous sentence
- scroll ตาม sentence

Audio preview ควรตั้งได้:

- voice
- rate
- pitch
- play from current sentence

### Step 6: ตรวจสอบและ Publish

แสดง checklist:

- มีข้อมูลพื้นฐานครบ
- มีปก
- มี chapter/episode อย่างน้อย 1 รายการ
- ทุก unit มี content
- preview ถูกตั้งค่าแล้ว
- access และราคา valid

actions:

- `Save draft`
- `Publish`

## 5.2 UX รายละเอียดที่ควรมี

### A. Draft autosave

ทุก step ควร autosave เป็นช่วง ๆ

### B. Leave protection

ถ้ามีแก้ไขแล้วยังไม่ save ต้องเตือนก่อนออก

### C. Content health meter

เช่น:

- 92/100 TTS readiness
- 4 ประโยคยาวเกินไป
- 2 ย่อหน้าไม่มี punctuation

### D. Import paths

รองรับ 3 วิธี:

1. วาง text ตรง ๆ
2. อัปโหลด pdf/txt/json
3. เริ่มจาก empty template

### E. Serial quick publishing

นักเขียนสายรายตอนควร:

- clone ตอนก่อนหน้า
- schedule publish
- ตั้ง free 3 ตอนแรกได้รวดเร็ว

## 6. ข้อเสนอสำหรับการแก้ของในโปรเจกต์นี้

จากโค้ดปัจจุบัน แนะนำลำดับทำงานแบบนี้:

### Phase 1: เติม schema ใหม่โดยไม่รื้อของเดิม

- เพิ่ม `slug`, `language_code`, `lifecycle_status` ใน `books`
- สร้าง `book_units`
- สร้าง `book_unit_blocks`
- สร้าง `book_unit_sentences`
- ขยาย `reading_progress`

### Phase 2: เขียน content transformer

สร้าง service ใหม่ เช่น:

- `backend/services/contentNormalizer.js`
- `backend/services/contentSegmenter.js`

หน้าที่:

- รับ raw text
- normalize
- split paragraph
- split sentence
- generate `tts_text`

### Phase 3: อัปเดต writer endpoints

แทนที่จะพึ่ง `POST /api/books/upload` อย่างเดียว ให้มี writer API ชัดเจนตาม flow ใหม่

### Phase 4: เปลี่ยน reader ให้ดึงจาก unit/sentence

`backend/routes/reader.js` ควรคืนข้อมูลเป็น:

- book
- toc
- current unit
- blocks
- sentences

แทนการคืน string content ยาวก้อนเดียว

### Phase 5: ปรับ `src/pages/writer/Upload.vue`

แยกเป็น component ย่อย เช่น:

- `BookBasicsStep.vue`
- `BookAccessStep.vue`
- `BookStructureStep.vue`
- `BookContentEditorStep.vue`
- `BookPreviewStep.vue`
- `BookPublishStep.vue`

## 7. Minimum Viable Version ที่ควรทำก่อน

ถ้าจะทำแบบไม่ใหญ่เกินไป ให้เริ่มแค่ชุดนี้:

1. `books` เพิ่ม field ใหม่ที่จำเป็น
2. สร้าง `book_units`
3. สร้าง `book_unit_blocks`
4. สร้าง `book_unit_sentences`
5. อัปเดต `reading_progress` ให้จำ `unit + sentence`
6. เพิ่ม endpoint:
   - `POST /api/writer/books`
   - `POST /api/writer/books/:id/units`
   - `POST /api/writer/books/:id/units/:unitId/content`
   - `GET /api/books/:id/toc`
   - `GET /api/reader/books/:bookId/units/:unitId`
   - `POST /api/reader/books/:bookId/progress`
7. เปลี่ยนหน้า upload เป็น 4 step ก่อน:
   - basics
   - access
   - structure
   - content + preview

แค่นี้ระบบจะเริ่มเป็น TTS-first จริงแล้ว

## 8. สรุปสั้น

ถ้าจะให้ระบบนี้พร้อมใช้จริง:

- ฐานข้อมูลต้องขยับจาก `book/page` ไปเป็น `book/unit/block/sentence`
- API ต้องคืนข้อมูลระดับ sentence ไม่ใช่ text ก้อนเดียว
- หน้า Upload ต้องเปลี่ยนจากฟอร์มเดียวเป็น wizard ที่มี structure + content + preview
- progress ต้องจำ `unit + sentence`

นี่คือจุดเปลี่ยนที่ทำให้ระบบจาก “เว็บอ่านหนังสือทั่วไป” กลายเป็น “reader + TTS platform” แบบจริงจัง
