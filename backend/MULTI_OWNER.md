# Multi-Owner Luxury Marketplace — PROJECT SB Commerce

## Tenant model
- A public visitor may browse the marketplace and published store pages.
- Any customer may **apply** for an Owner account; Owner status remains PENDING until Super Admin approves it.
- After approval, each Owner may create and fully manage **their own** storefront at `/toko/<slug>`.
- Multiple independent Owners can coexist. Store ownership is bound to a verified `sb_users.id`, never just a URL or browser state.
- A store Owner can edit logo, name, descriptions, banner, theme (light/dark), accent color, layout, typography, categories, products, inventory, and custom pages.
- Owner cannot read/write other Owners' private data. Super Admin retains platform-level powers.
- Optional store staff roles MANAGER/EDITOR can be delegated per store.
- Store publishing is a separate action, so a draft is not publicly visible.

## Required implementation milestones
1. Apply `backend/sql/002_multitenant.sql` in Neon.
2. Add authenticated API routes for store creation, updates, categories, products, pages, and publish.
3. Every mutation: validate session, verify active role and store ownership in the **same server-side operation**, validate field lengths, rate-limit, and record audit events.
4. Serve published storefronts at `/toko/<slug>` with store-specific themes, content and SEO metadata.
5. Integrate owner dashboard forms with the APIs; do not treat browser localStorage as authoritative.
6. Complete registration/login and Super Admin approval flows; test two separate Owner accounts for cross-tenant isolation.
7. Keep payment disabled until checkout, stock validation, orders and payment callbacks are implemented and tested.

## Security
- No unrestricted access across shops. Owner's full access is scoped to their own shop.
- Public registration must never self-assign SUPER_ADMIN.
- Protect mutations against CSRF, cross-origin requests, replay, and privilege escalation.
- Store uploaded images in managed storage with content type/size validation; don't allow arbitrary HTML or JS in editable fields.
