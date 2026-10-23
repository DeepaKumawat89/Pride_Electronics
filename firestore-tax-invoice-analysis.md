# Firestore tax and invoice settings analysis

Target: `projects/ecommerce-78081/databases/(default)` (Standard edition,
Firestore native mode, `asia-south1`).

## Scoped data model and access

- `settings/invoice` contains `business`, `tax`, and `numbering` maps plus a
  backend timestamp. Seller details are publicly readable because they are
  customer-facing invoice data. Client writes are denied.
- The `updateInvoiceSettings` callable requires the server-issued `admin: true`
  custom claim, normalizes bounded strings and numeric settings, validates the
  seller email, GSTIN, PAN/state consistency, registration/tax enums, and
  numbering configuration, then replaces the settings document.
- Order creation reads `settings/invoice` inside its existing transaction.
  Each new order and invoice record receives an immutable seller snapshot.
- Customer invoice retrieval reads the stored invoice snapshot rather than
  current settings, preserving historical business and tax details.

## Relevant queries and writes

- Web SDK: document listener on `settings/invoice`.
- Admin callable: Admin SDK replacement write to `settings/invoice`.
- Checkout/order backend: transactional reads of `settings/invoice` and
  `settings/shipping`; product document reads; coupon lookup by `code` with
  `limit(1)`; order/invoice snapshot writes.
- Customer invoice PDF: no settings read; it renders `order.invoice.seller`.

## Adversarial review

- Unauthenticated/admin-spoofed settings writes: denied by Firestore Rules;
  the callable independently requires an authenticated `admin: true` claim.
- Schema pollution and obsolete default GST fields: removed during backend
  normalization because the callable performs a replacement write.
- Invalid types, oversized strings, malformed email/GSTIN/PAN, mismatched GST
  state/PAN, invalid shipping tax modes, and invalid numbering: rejected by
  backend validation before the write.
- Duplicate submissions: the save action is disabled while its callable is in
  flight and the handler also guards re-entry.
- Historical invoice mutation: settings updates do not touch existing orders
  or invoice records; PDFs use the saved seller snapshot.
- Product-tax regression: product `taxRate` remains authoritative for every
  product line; no settings-level default product GST rate is stored or used.
- Delivery-tax mismatch: client preview and backend quote now select the same
  saved delivery GST treatment and fixed delivery rate.
- Public data exposure: only seller business/tax configuration is exposed by
  this document; customer and invoice records remain owner/admin restricted.

## Delivery GST and checkout consistency review

- Supported delivery treatments are exactly `fixed`, `product-rates`, and
  `exempt`. The callable rejects unknown values instead of silently persisting
  or displaying a fallback.
- `fixed` applies the configured delivery rate to the Express Delivery charge;
  `product-rates` allocates the charge across taxable product lines and applies
  each corresponding product rate; `exempt` records no delivery GST.
- Office Pickup and Porter have no seller-collected delivery charge, so their
  effective delivery treatment is `exempt` for the quote without changing the
  stored admin preference used by Express Delivery.
- Client preview and backend quote round every product line and delivery-tax
  allocation to paise, then sum the rounded components. The backend validates
  line tax, delivery allocation, combined GST, total, and integer paise before
  creating a gateway order.
- The browser validates the same authoritative quote components before showing
  or accepting a Razorpay total. Orders and invoices copy that server quote,
  and the placement transaction verifies invoice, gateway, and quote paise are
  equal.
- The checkout summary renders combined `productTax + shippingTax` as one
  `GST` row. Express Delivery alone shows the delivery-charge row; Office
  Pickup and Porter keep it hidden.

No application, tests, builds, emulators, deployments, or rules dry-runs were
run, per the task constraint.
