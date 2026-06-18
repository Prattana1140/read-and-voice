# Role UX Checklist

Use this checklist for a full role-by-role smoke test before launching Read and Voice.

## Test Accounts

Create real test accounts in your own database. Do not use shared demo credentials.

| Role | Requirement | Start Page |
|---|---|---|
| User | Normal registered user | `/` or `/my-library` |
| Writer | User with writer role | `/writer` |
| Admin | User with admin role | `/admin` |
| Superadmin | User with superadmin role | `/superadmin` |

## Public Visitor Flow

1. Open `/`.
2. Browse shelves and hero content.
3. Open `/store`.
4. Open one book detail page.
5. Confirm preview content, reviews, price/access labels, and read/listen buttons are understandable.

## User Flow

1. Log in as a real user account.
2. Open `/my-library`, `/wishlist`, `/cart`, and `/orders/history`.
3. Open a readable book and test `/reader/:id`.
4. Open `/coin-wallet` and confirm manual payment instructions are visible.

## Writer Flow

1. Log in as a real writer account.
2. Open `/writer`, `/writer/books`, and `/writer/upload`.
3. Create a draft, add a unit, add content, preview blocks/sentences, then publish or submit for review.

## Admin Flow

1. Log in as a real admin account.
2. Open `/admin`, `/admin/approvals`, `/admin/books`, `/admin/categories`, and `/admin/page-content`.
3. Approve or reject only test content that is safe to change.

## Superadmin Flow

1. Log in as a real superadmin account.
2. Open `/superadmin`, `/superadmin/users`, `/superadmin/roles`, and `/superadmin/settings`.

## Known Launch Boundaries

- LINE login appears only when backend credentials are configured.
- Coin top-up uses manual approval first, not an automated gateway.
- Forgot password is admin-assisted by default for the free launch path.
- Production readiness still requires secrets, HTTPS, backups, and monitoring.
