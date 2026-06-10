# Demo Seed Guide

This project now includes a platform seed flow so the app feels populated for every permission level.

This guide is for local/demo databases only. Do not run `db:seed:platform` against a real production database. The script refuses to run when `NODE_ENV=production` unless `ALLOW_DEMO_SEED_IN_PRODUCTION=true` is set intentionally for a non-real demo database.

## Recommended order

Run these commands from `backend`:

```bash
npm run db:init
npm run db:seed:catalog
npm run db:seed:platform
```

## What gets created

- Catalog content for storefront pages
- Demo users for `user`, `writer`, `admin`, and `superadmin`
- User profiles and writer public profiles
- Wallet balances and coin transactions
- Library ownership, wishlists, and reading progress
- Completed orders and paid order items
- Reviews, follows, gift codes, and subscriptions
- Device and TTS settings to populate account-related pages

## Demo accounts

All demo accounts use the same local/demo password:

```text
123456
```

Accounts:

- `reader.nida@readvoice.local` - user
- `reader.arun@readvoice.local` - user
- `writer.mali@readvoice.local` - writer
- `writer.tan@readvoice.local` - writer
- `admin.ops@readvoice.local` - admin
- `superadmin@readvoice.local` - superadmin

## Notes

- `db:seed:platform` is safe to rerun for these demo users. It refreshes their seeded account activity.
- If the catalog is empty, run `npm run db:seed:catalog` first so storefront, library, writer, and admin pages have books to display.
- For production, create a real superadmin with `SUPERADMIN_EMAIL` and a strong `SUPERADMIN_PASSWORD`; do not use the demo accounts above.
