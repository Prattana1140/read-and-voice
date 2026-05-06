# Free stack deployment

This repo can move off Railway without rewriting the app by using:

- Frontend: Vercel
- Backend: Render free web service
- MySQL: Aiven free tier
- Email: Resend

Important limits from official docs:

- Render free web services spin down after 15 minutes idle and are not recommended for production: https://render.com/docs/free
- Aiven free MySQL is free with no time limit, but can be powered off if unused: https://aiven.io/docs/products/mysql/concepts/mysql-free-tier
- Railway is no longer a practical always-free production path: https://docs.railway.com/pricing

## 1. Create free MySQL on Aiven

Create an `Aiven for MySQL` service on the free tier, then copy:

- host
- port
- database name
- username
- password

If Aiven shows a CA certificate, either:

- set `DB_SSL=true` and `DB_SSL_MODE=require`, or
- paste the certificate into `DB_SSL_CA`, or
- base64 encode it and set `DB_SSL_CA_BASE64`

This backend now supports all of those options.

## 2. Point your local backend to the new database

Update [backend/.env.example](</c:/Users/jikke/Read and Voice/backend/.env.example:1>) as a template for your real `backend/.env`.

You can use either:

```env
DATABASE_URL=mysql://user:password@host:3306/read_and_voice
DB_SSL=true
DB_SSL_MODE=require
```

or:

```env
DB_HOST=...
DB_PORT=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
DB_SSL=true
DB_SSL_MODE=require
```

## 3. Initialize the remote database

Run these commands from `backend` against the Aiven database:

```powershell
npm run db:test
npm run db:init
npm run db:migrate:content
npm run db:migrate:tts-architecture
npm run db:migrate:commerce
npm run db:migrate:subscriptions
npm run db:seed:catalog
npm run db:seed:platform
npm run create:superadmin
```

## 4. Deploy backend to Render

This repo now includes [render.yaml](</c:/Users/jikke/Read and Voice/render.yaml:1>) and [backend/Dockerfile](</c:/Users/jikke/Read and Voice/backend/Dockerfile:1>) so Render can build the backend with real OCR dependencies installed.

In Render:

1. Create a new Blueprint or Web Service from this repo.
2. If you use Blueprint, Render will pick up `render.yaml`.
3. Set these environment variables on the backend service:

```env
JWT_SECRET=your-secret
API_PUBLIC_URL=https://your-render-service.onrender.com
FRONTEND_URL=https://your-vercel-domain.vercel.app
RESEND_API_KEY=...
EMAIL_FROM=onboarding@resend.dev
EMAIL_FROM_NAME=Read and Voice
MANUAL_PAYMENT_ENABLED=true
MANUAL_PAYMENT_INSTRUCTIONS=กรุณาโอนเงินตามช่องทางที่แอดมินแจ้ง แล้วส่งหลักฐานพร้อมเลขรายการ {topup_id} จำนวน {amount} บาท
LINE_CLIENT_ID=...
LINE_CLIENT_SECRET=...
LINE_SCOPE=openid profile email
ENABLE_OCR=true
OCR_LANG=tha+eng
TESSERACT_COMMAND=tesseract
DATABASE_URL=mysql://user:password@host:3306/read_and_voice
DB_SSL=true
DB_SSL_MODE=require
```

If you are not ready for OCR yet, set `ENABLE_OCR=false`.

## 5. Deploy frontend to Vercel

Update [/.env.example](</c:/Users/jikke/Read and Voice/.env.example:1>) as the template for your frontend environment:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Then redeploy Vercel.

## 6. Final checks

After the backend env is filled in:

```powershell
cd backend
npm run config:check
```

Expected outcomes:

- password reset email sends through Resend
- LINE login callback points to the Render backend
- coin top-up works in manual approval mode
- OCR works on Render because the Docker image installs Tesseract and Python OCR tools

## 7. Honest caveat

This is the closest practical "free-all" setup for this codebase without rewriting MySQL to another database.

It is good for testing, demos, and early users, but it is not truly production-grade because the free backend can sleep and Aiven free resources are intentionally small.
