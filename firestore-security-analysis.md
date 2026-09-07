# Firestore security analysis (GSTIN flow)

Target: `projects/iplteams-6eb14/databases/(default)` (Standard edition).

## Access inventory

- Public reads, admin writes: `products`, `categories`, `subcategories`, `coupons`.
- Public selected documents, admin writes: `settings/{marketing,shipping,invoice,storefront}`.
- Conditional public/owner reads, admin writes: `reviews`.
- Owner/admin reads, trusted backend/admin writes: `orders`, `returns`.
- Owner/admin reads with no customer writes: `users/{uid}`. The document contains PII, saved addresses/payment aliases, carts, and verified GST registrations.
- Admin-only: `refunds`, `inventoryHistory`; own admin record is readable at `admins/{uid}`.
- Backend-only/default-denied: `paymentIntents`, `stockReservations`, `couponUsages`, `_authPhoneIndex`.

Application queries found:

- `reviews where status == Published`.
- `orders where userId == current uid`.
- `returns where userId == current uid`.
- Backend: coupons by `code` with `limit(1)`; expired stock reservations by `status` and `expiresAt` with a limit; coupon usage by `userId`; returns by `orderId` and `userId`; reviews by `productId` and `status`.

## GST data model

`users/{uid}.gstProfiles` is a server-written list of at most 5 provider records. Each record contains bounded strings for GSTIN, legal/trade name, registration status/type/date, business type, registered address and split address, verification time, Cashfree reference, provider, and verification status. `gstDetails` is the most recently verified record for backward-compatible reads. Customers cannot write either field.

`orders/{orderId}.gstDetails` is the selected verified record copied by the backend. `orders/{orderId}.invoice` is a backend-generated snapshot of seller/buyer identity, invoice number/date, line values, CGST/SGST or IGST, and totals. Customer order writes are denied.

## Adversarial review

- Public/cross-user profile reads: denied by owner/admin checks.
- Customer GST create/update/delete and ownership hijacking: denied because all direct customer user writes are denied.
- Arbitrary order/invoice creation or updates: denied for customers.
- Admin/client GST edits (including malformed maps, oversized strings, and wrong providers): denied because both GST fields are backend-managed and immutable through client rules. Server writes apply the bounded GST mapper before using the Admin SDK.
- GST verification spoofing: browser supplies only a GSTIN; the callable stores mapped Cashfree data and rejects missing credentials, invalid, inactive, mismatched, or incomplete responses.
- Saved-record replay: order creation accepts only active Cashfree records marked verified and no older than 30 days.
- Invoice manipulation: amounts, tax split, buyer GST snapshot, seller identity, number, and date are generated and validated in the order transaction; direct customer order writes remain denied.
- Query mismatch: owner order/return queries include the required `userId` equality filter; published review query includes the required status filter.
- Orphaned subcollections: none are exposed by current rules.

This file records the review basis for the prototype rules and their tests.
