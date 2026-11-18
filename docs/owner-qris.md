# Owner QRIS implementation contract

Status: **foundation only; not deployed**. The repository README confirms the complete application has not been committed.

## Owner dashboard
- Settings > Payment Methods > QRIS > Upload/Replace/Enable/Disable.
- Accept PNG, JPEG, WebP only, max 2 MB, validate file magic bytes and decode image server-side.
- Store images in private Cloudflare R2, not Neon or public GitHub. Store only object keys in Neon.
- Server derives owner identity from verified session and store ownership from database. Ignore browser-supplied owner IDs.
- Use signed, short-lived URLs or authenticated image-serving endpoint.
- Deleting/replacing QRIS must not affect past orders; snapshot payment instructions per order.

## Checkout
- Display QRIS for the exact store on the order, never another store's QRIS.
- Show a manual payment notice and allow proof upload.
- Uploading proof changes order to 'awaiting_review', NEVER 'paid'.
- Only the verified owner of that order's store may approve/reject proof.
- On approval use a transaction and audit trail; guard against repeated approval and duplicate orders.
- A QR image uploaded by an owner is **not** a dynamic gateway QRIS and has no payment webhook.

## API endpoints to implement in the actual app
- PUT /api/owner/payment/qris: authenticated owner, multipart image, R2 upload, database upsert
- PATCH /api/owner/payment/qris: authenticated owner, toggle enabled
- GET /api/store/:storeId/payment/qris: return only enabled QRIS via signed access
- POST /api/orders/:orderId/payment-proof: authenticated buyer, image validation, R2 upload
- POST /api/owner/orders/:orderId/review-payment: authenticated owner, approve/reject with audit

## Before production
1. Inspect existing Neon ID types, orders schema and authorization model.
2. Adapt and apply the SQL migration; do not blindly apply template ID types.
3. Integrate routes into deployed Cloudflare Worker/Pages app.
4. Bind R2 bucket and Neon secrets server-side; never expose credentials.
5. Test cross-store access, forged ownership, oversized uploads, malicious files, duplicate reviews and payment status.
