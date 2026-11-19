# Production readiness checklist

This repository contains a **static non-transactional landing page** and initial database/payment security foundations. It is NOT a functional e-commerce application and must not accept real orders or payments.

- [ ] Build authenticated Super Admin / Owner / Customer sessions, authorization and CSRF protections
- [ ] Build catalog, inventory, cart and server-side priced checkout
- [ ] Implement transactional order creation with inventory checks and idempotency
- [ ] Connect Neon using server-only credentials and Cloudflare runtime
- [ ] Configure private R2 storage and validate QRIS / proof images
- [ ] Implement per-store QRIS settings with ownership checks
- [ ] Implement bank transfer settings and manual payment review
- [ ] Select gateway provider, implement official signed webhook verification and replay protection
- [ ] Test multi-tenant isolation, failed payments, retries, refunds and reconciliation
- [ ] Deploy to Cloudflare, verify domain, TLS, monitoring, backups and end-to-end test purchases

Never store gateway credentials in frontend source. Never mark orders paid on browser requests or proof uploads.
