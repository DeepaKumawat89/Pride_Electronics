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
- Product media integrity: full product writes require one to three HTTPS image
  URLs, an aligned Storage-path entry for each URL, the primary `image` to
  equal `images[0]`, and every non-empty path to stay under that product's
  Storage folder. Storage writes additionally require `admin: true`, WebP
  content, bounded size and filename, and matching administrator UID metadata.
- Product media update safety: new objects are uploaded before Firestore is
  changed; failed Firestore writes clean up only newly uploaded objects; old
  objects are deleted only after a successful document update. Duplicate file
  selections and duplicate optimized image content are suppressed.
- HSN validation: HSN remains optional, but any non-empty value must contain
  exactly eight digits in both client validation and Firestore Rules.
- Product pricing integrity: new and fully edited products must use the explicit
  `gst-exclusive-v1` model, a positive two-decimal base `price`,
  `priceIncludesTax: false`, and a GST rate from 0 through 100. Obsolete
  `originalPrice` and product-level `discount` fields are rejected on full
  writes. Legacy products remain readable and may receive only narrowly scoped
  operational updates until an admin edit converts them to the new model.
- Query mismatch: owner order/return queries include the required `userId` equality filter; published review query includes the required status filter.
- Orphaned subcollections: none are exposed by current rules.

This file records the review basis for the prototype rules and their tests.

## Pricing-rule audit assessment

```json
{
  "score": 8,
  "maxScore": 10,
  "severity": "low",
  "findings": [
    {
      "severity": "info",
      "area": "authorization",
      "result": "Product writes remain restricted to Firebase Auth tokens carrying the server-assigned admin claim."
    },
    {
      "severity": "info",
      "area": "pricing integrity",
      "result": "Full product writes require a positive two-decimal GST-exclusive price, explicit pricing model, false priceIncludesTax flag, bounded GST rate, and absence of obsolete MRP/product-discount fields."
    },
    {
      "severity": "low",
      "area": "legacy compatibility",
      "result": "Legacy products intentionally retain a narrowly scoped operational-update path until an admin edit converts the full document."
    },
    {
      "severity": "low",
      "area": "schema strictness",
      "result": "The product validator constrains required security-sensitive fields but does not yet use keys().hasOnly() for the complete historical catalog schema; admin-only writes limit exposure, but a future schema-hardening pass should enumerate every optional product field."
    }
  ]
}
```
