# Launch Readiness Checklist

This checklist is for the first real-user launch path:

- Payments: manual approval first.
- Password reset: admin-assisted for the free first launch, or real email through Resend/webhook later.
- Deploy target: frontend, backend, and MySQL configured with production environment variables.

## 1. Manual Payment Launch Path

Set these backend environment variables:

```env
MANUAL_PAYMENT_ENABLED=true
MANUAL_PAYMENT_INSTRUCTIONS=Please transfer payment using the admin-provided channel, then submit proof with transaction {topup_id} for {amount} THB.
```

Expected behavior:

- `/coin-wallet` creates a pending coin top-up order.
- The user submits a transfer reference.
- Admin reviews it in `/admin/payments` or `/admin/coin-topups`.
- After admin approves, coins are added to the wallet.
- Purchases and subscriptions then spend coins from the wallet.

## 2. Password Reset

Free first-launch option:

```env
DISABLE_ADMIN_PASSWORD_RESET=false
ALLOW_PASSWORD_RESET_PREVIEW=false
```

Expected fallback behavior when no email provider is configured:

- `/forgot-password` creates a reset token and records the request for admin visibility.
- Admin can open `/admin/password-resets` to review pending requests.
- The user receives the reset flow through the configured fallback/preview policy.

Automatic email delivery options:

Resend:

```env
RESEND_API_KEY=...
EMAIL_FROM=hello@your-domain.com
EMAIL_FROM_NAME=Read and Voice
ALLOW_PASSWORD_RESET_PREVIEW=false
```

Webhook:

```env
PASSWORD_RESET_EMAIL_WEBHOOK_URL=https://your-email-service.example.com/password-reset
PASSWORD_RESET_EMAIL_WEBHOOK_SECRET=...
ALLOW_PASSWORD_RESET_PREVIEW=false
```

Expected behavior:

- `/forgot-password` creates a reset token.
- Production sends the reset link by email when an email provider is configured.
- Production does not return a preview reset link unless `ALLOW_PASSWORD_RESET_PREVIEW=true`.
- `/superadmin/settings` shows the active password reset provider under operational status.

## 3. Production Environment

Required backend variables:

```env
NODE_ENV=production
JWT_SECRET=...
API_PUBLIC_URL=https://your-api.example.com
FRONTEND_URL=https://your-frontend.example.com
DATABASE_URL=mysql://...
DB_SSL=true
DB_SSL_MODE=require
SUPERADMIN_EMAIL=your-admin-email@example.com
SUPERADMIN_PASSWORD=use-a-long-random-password
```

Required frontend variable:

```env
VITE_API_BASE_URL=https://your-api.example.com
```

Run:

```powershell
npm --prefix backend run config:check
npm --prefix backend run monitor:check
npm --prefix backend run content:audit
npm --prefix backend run ops:daily
npm run build
```

All checks should pass before deploy.

## 4. Role Smoke Test

Public:

- Open `/`, `/store`, `/serials`, and a `/book/:id` page.
- Confirm covers load and preview content is readable.

User:

- Log in.
- Open `/coin-wallet`, create a top-up, and submit a transfer reference.
- After admin approval, buy a book or episode with coins.
- Confirm `/my-library`, `/cart`, and `/orders/history`.

Writer:

- Open `/writer`, `/writer/books`, and `/writer/upload`.
- Create or edit content.
- Submit for admin approval.

Admin:

- Open `/admin/approvals`.
- Approve writer content.
- Open `/admin/payments` and approve one pending top-up.
- Confirm the user's wallet balance changes.

Superadmin:

- Open `/superadmin`, `/superadmin/users`, `/superadmin/roles`, and `/superadmin/settings`.
- Confirm role/status actions are available.

## 5. After Core Launch

Improve after money and email are stable:

- Make writer upload a clearer step-by-step production wizard.
- Expand superadmin settings beyond operational shortcuts.
- Use [docs/operations-runbook.md](operations-runbook.md) for LINE setup, OCR audit, content migration, monitoring, and backup operations.
- Schedule `npm --prefix backend run ops:daily` for daily monitor + content audit + database backup.
- Run `npm --prefix backend run db:backup` before major data imports or updates.
- Add a real payment gateway when manual approval becomes too slow.
