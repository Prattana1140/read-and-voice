# Role UX Checklist

Use this checklist for a full role-by-role smoke test before presenting or launching Read and Voice.

## Smoke Test Result

Latest API smoke test passed for:

- Public catalog: books and recommended shelves
- User: library, wishlist, cart, order history
- Writer: writer books and writer profile
- Admin: dashboard stats and pending approvals
- Superadmin: user management

## Demo Accounts

These accounts are for local/demo smoke testing only. For production smoke testing, use real test accounts created in the production database.

All demo accounts use password `123456`.

| Role | Email | Start Page |
|---|---|---|
| User | `reader.nida@readvoice.local` | `/` or `/my-library` |
| Writer | `writer.mali@readvoice.local` | `/writer` |
| Admin | `admin.ops@readvoice.local` | `/admin` |
| Superadmin | `superadmin@readvoice.local` | `/superadmin` |

## Public Visitor Flow

Expected flow:

1. Open `/`.
2. Browse shelves and hero content.
3. Open `/store`.
4. Open one book detail page.
5. Confirm preview content, reviews, price/access labels, and read/listen buttons are understandable.

Pass criteria:

- No broken image in the first viewport.
- Book cards open correctly.
- Thai text is readable.
- If LINE login is not configured, LINE button is hidden.

## User Flow

Expected flow:

1. Log in as `reader.nida@readvoice.local`.
2. Open `/my-library`.
3. Open `/wishlist`.
4. Open `/cart`.
5. Open `/orders/history`.
6. Open a readable book and test `/reader/:id`.
7. Open `/coin-wallet` and confirm the manual payment instructions are visible.

Pass criteria:

- User can access member-only pages without permission errors.
- Library has books.
- Wishlist has items.
- Cart empty state or item state is clear.
- Checkout spends coins, and coin top-up creates a pending manual approval request.
- Reader page loads content and read/listen controls.

## Writer Flow

Expected flow:

1. Log in as `writer.mali@readvoice.local`.
2. Open `/writer`.
3. Open `/writer/books`.
4. Open `/writer/upload`.
5. Use the studio wizard:
   - Step 1: create draft.
   - Step 2: add chapter/episode.
   - Step 3: add content.
   - Step 4: preview blocks/sentences.
   - Step 5: send/publish for admin review.

Pass criteria:

- Wizard steps unlock in the correct order.
- Writer understands what to do next.
- Error messages are clear when required fields are missing.
- Existing upload modes still remain available.

## Admin Flow

Expected flow:

1. Log in as `admin.ops@readvoice.local`.
2. Open `/admin`.
3. Open `/admin/approvals`.
4. Review pending books.
5. Approve or reject one test item only if the demo data can be changed.
6. Open `/admin/books`, `/admin/categories`, and `/admin/page-content`.

Pass criteria:

- Admin pages load without permission errors.
- Pending approval list is visible.
- Placement flags are understandable.
- Page content manager does not require unsupported ThaiID or real payment setup.

## Superadmin Flow

Expected flow:

1. Log in as `superadmin@readvoice.local`.
2. Open `/superadmin`.
3. Open `/superadmin/users`.
4. Open `/superadmin/roles`.
5. Open `/superadmin/settings`.

Pass criteria:

- User and role lists load.
- Role/status actions are visible.
- Settings page loads the operational checklist and links to admin/superadmin flows.

## Known Launch Boundaries

- ThaiID is removed from scope.
- LINE login appears only when backend credentials are configured.
- Coin top-up is manual approval first, not an automated gateway.
- Forgot password is admin-assisted by default for the free launch path; automatic email delivery can be added with Resend or a webhook.
- Mock payments and demo user seeds must remain disabled in production.
- Production readiness still requires secrets, HTTPS, backups, and monitoring.
