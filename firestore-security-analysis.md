# Firestore security analysis

Target: `projects/iplteams-6eb14/databases/(default)` (Standard edition).

## Access inventory

- Public reads, admin writes: `products`, `categories`, `subcategories`, `coupons`.
- Public selected documents, admin writes: `settings/{marketing,shipping,invoice,storefront}`.
- Conditional public/owner reads, admin writes: `reviews`.
- Owner/admin reads, trusted backend/admin writes: `orders`, `returns`.
- Owner/admin reads with no customer writes: `users/{uid}`. The document contains PII, saved addresses/payment aliases, and carts.
- Admin-only: `refunds`, `inventoryHistory`; own admin record is readable at `admins/{uid}`.
- Backend-only/default-denied: `paymentIntents`, `stockReservations`, `couponUsages`, `_authPhoneIndex`.

Application queries found:

- `reviews where status == Published`.
- `orders where userId == current uid`.
- `returns where userId == current uid`.
- Backend: coupons by `code` with `limit(1)`; expired stock reservations by `status` and `expiresAt` with a limit; coupon usage by `userId`; returns by `orderId` and `userId`; reviews by `productId` and `status`.

## Adversarial review

- Public/cross-user profile reads: denied by owner/admin checks.
- Arbitrary order/invoice creation or updates: denied for customers.
- Invoice manipulation: amounts, tax split, seller identity, number, and date are generated and validated in the order transaction; direct customer order writes remain denied.
- Query mismatch: owner order/return queries include the required `userId` equality filter; published review query includes the required status filter.
- Orphaned subcollections: none are exposed by current rules.

This file records the review basis for the prototype rules and their tests.
