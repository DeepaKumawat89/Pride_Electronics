# Firestore security analysis

Target: `projects/ecommerce-78081/databases/(default)` (Standard edition, native mode, `asia-south1`).

## Access inventory

- Public reads, admin writes: `products`, `categories`, `subcategories`, `coupons`.
- Public selected documents, admin writes: `settings/{marketing,shipping,invoice,storefront}`.
- Conditional public/owner reads, admin writes: `reviews`.
- Owner/admin reads, trusted backend/admin writes: `orders`, `returns`.
- Owner/admin reads with no customer writes: `users/{uid}`. The document contains PII, saved addresses/payment aliases, and carts.
- Admin-only: `refunds`, `inventoryHistory`.
- Backend-only/default-denied: `paymentIntents`, `stockReservations`, `couponUsages`, `_authPhoneIndex`.

Application queries found:

- `reviews where status == Published`.
- `orders where userId == current uid`.
- `returns where userId == current uid`.
- Backend: coupons by `code` with `limit(1)`; expired stock reservations by `status` and `expiresAt` with a limit; coupon usage by `userId`; returns by `orderId` and `userId`; reviews by `productId` and `status`.

## Adversarial review

- Public/cross-user profile reads: denied by owner/admin checks.
- Privilege escalation: client-written profile roles and role/permission token
  values do not grant access; privileged rules trust only the Admin SDK-issued
  `admin: true` claim.
- Former administrator: the provisioning script removes legacy admin claims
  from every other user and revokes their refresh tokens. Already-issued ID
  tokens can remain valid until their normal expiry (up to one hour), which is
  documented as a required cutover window.
- Arbitrary order/invoice creation or updates: denied for customers.
- Invoice manipulation: amounts, tax split, seller identity, number, and date are generated and validated in the order transaction; direct customer order writes remain denied.
- Invoice PII/GSTIN disclosure: order documents are readable only by their owner or the sole administrator identified by the server-issued `admin: true` claim. Public invoice settings contain seller details only.
- Product schema pollution: validated product fields are enforced for full writes; narrowly scoped operational updates remain possible for legacy products, and every product write still requires the server-issued admin claim.
- Query mismatch: owner order/return queries include the required `userId` equality filter; published review query includes the required status filter.
- Orphaned subcollections: none are exposed by current rules.

This file records the review basis for the prototype rules and their tests.
