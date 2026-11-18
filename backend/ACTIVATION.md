# SB Commerce — Neon activation checklist

## Current state
- Cloudflare Pages project: `projectsb`, URL: https://projectsb.pages.dev
- Repository: `kokosabar99/project-sb-commerce`
- Cloudflare Pages secret `DATABASE_URL` exists for preview and production; connectivity is **not verified**.
- `AUTH_SECRET` is **not configured**. Do not enable authenticated API without it.
- `backend/auth-worker.js` is **source only**, not deployed to production.
- The current frontend is a design preview; it is not yet connected to the API.

## Required setup
1. Connect Neon to a secure SQL-capable integration and confirm the target project/database.
2. Run `backend/sql/001_auth.sql`, then `backend/sql/002_stores_products.sql` against the correct database. These migrations contain no demo records.
3. Set `AUTH_SECRET` to a cryptographically random value of at least 32 bytes, stored as a Cloudflare Pages secret (not in Git).
4. Deploy API routes alongside the existing frontend, without replacing storefront routes.
5. Check `GET /api/health` reports `{"ok":true,"database":"connected"}` from production.
6. Bootstrap the Super Admin using a secure one-time setup flow. Do not put passwords in source control.
7. Test customer registration/login/logout, owner registration/approval, owner store creation, and product CRUD.
8. Verify Owner A cannot read, modify, or delete Owner B's products (including guessed IDs).
9. Integrate frontend owner forms with the API, and public storefront with active products from the correct store.
10. Implement secure photo upload (R2 or equivalent), orders/payments, and real-time chat before advertising them as operational.

## Security caveats
- Never expose `DATABASE_URL`, `AUTH_SECRET`, or administrator credentials.
- A successful Cloudflare deployment alone does not establish database connectivity.
- Never charge customers until checkout, inventory, payment confirmation, and order persistence have been tested.
- Browser localStorage is not authoritative multi-device store storage.
