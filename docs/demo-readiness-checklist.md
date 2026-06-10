# Demo Readiness Checklist

Use this checklist before presenting or deploying a demo build.

For the full role-by-role UX pass, use `docs/role-ux-checklist.md`.

## Current Smoke Test Status

- Frontend build: pass with `npm.cmd run build`
- Database connection: pass with `npm.cmd run db:test` from `backend`
- API health: pass at `/api`
- Catalog data: pass, books and categories are available
- Demo login accounts: pass for `user`, `writer`, `admin`, and `superadmin`
- Reader APIs: pass for book detail, TOC, content, and access checks
- Store shelves: pass for best sellers, new releases, free books, and recommended
- ThaiID: intentionally removed from the project scope
- LINE login: hidden on the login page unless backend reports configured credentials

## Demo Flow To Show

1. Open the home page and browse catalog shelves.
2. Open a book detail page.
3. Log in as a reader and open library, cart, and order history.
4. Open reader mode and test read/listen controls.
5. Log in as a writer and show writer dashboard, books, and upload/edit flow.
6. Log in as an admin and show pending approvals and catalog management.
7. Log in as a superadmin and show user/role management.

## Demo Accounts

These accounts are for local/demo environments only. Do not seed them into a real production database.

All demo accounts use password `123456`.

- `reader.nida@readvoice.local` - user
- `writer.mali@readvoice.local` - writer
- `admin.ops@readvoice.local` - admin
- `superadmin@readvoice.local` - superadmin

## Launch Notes

- Payment starts with manual approval: users create pending coin top-ups, admins approve them, and purchases spend coins.
- Forgot password can run as admin-assisted reset for a free first launch; Resend or an email webhook can be added later for fully automatic delivery.
- Mock payments are disabled in production by code; keep `ENABLE_MOCK_PAYMENTS=false` and `ENABLE_MOCK_COIN_TOPUP=false`.
- Create the real superadmin with `SUPERADMIN_EMAIL` and a strong `SUPERADMIN_PASSWORD`, not the demo password.
- LINE login needs real credentials before it appears in the UI.
- Writer upload should become a clearer step-by-step wizard.
- Production needs final environment variables, HTTPS, backup, and monitoring.
