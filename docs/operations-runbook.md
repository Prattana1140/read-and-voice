# Read and Voice Operations Runbook

Use this checklist when moving from local/staging to real users.

## 1. LINE Login

Set these in `backend/.env` locally and in the hosting dashboard for production:

```env
LINE_CLIENT_ID=<LINE Login Channel ID>
LINE_CLIENT_SECRET=<LINE Login Channel Secret>
LINE_SCOPE=openid profile email
```

Callback URL to register in LINE Developers:

```text
<API_PUBLIC_URL>/api/auth/oauth/line/callback
```

Check status in the app:

```text
/superadmin/settings
```

Or via API:

```text
GET /api/auth/oauth/status
GET /api/admin/settings/operations
```

## 2. OCR And Content Quality

Run after importing scanned PDFs or large books:

```powershell
npm --prefix backend run content:audit
```

Production target:

```text
low_quality: 0
needs_review: 0
missing_structured_content: 0
```

Writers also see OCR quality feedback after upload and should review the listed pages before publishing.

## 3. Reader/TTS Structured Content

If old books ever show as missing structured content:

```powershell
npm --prefix backend run content:migrate-legacy
npm --prefix backend run content:migrate-legacy -- --apply
```

For a single large book:

```powershell
npm --prefix backend run content:migrate-legacy -- --apply --book-id=<id> --block-chars=1600
```

## 4. Monitoring And Backup

Manual health check:

```powershell
npm --prefix backend run monitor:check
```

Manual database backup:

```powershell
npm --prefix backend run db:backup
```

Daily combined maintenance:

```powershell
npm --prefix backend run ops:daily
```

Reports are written to:

```text
backend/backups/reports
```

Backups are written to:

```text
backend/backups/manual
```

Backup retention defaults to 14 days. Override with:

```env
DB_BACKUP_RETENTION_DAYS=14
```

## 5. Local Windows Schedule

Run PowerShell as your normal user from the repo root:

```powershell
.\scripts\register-local-maintenance-task.ps1 -Time "03:00"
```

This creates a Windows Scheduled Task named `ReadAndVoiceDailyMaintenance` that runs:

```powershell
npm --prefix backend run ops:daily
```

## 6. Hosting Schedule

For Render/Railway/VPS cron, run this once per day:

```bash
npm --prefix backend run ops:daily
```

If the host cannot run scheduled jobs on the same service, create a separate cron job/service with the same environment variables as the backend.
