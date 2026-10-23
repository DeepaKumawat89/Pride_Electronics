# Firestore return-policy analysis

## Target database

- Project: `ecommerce-78081`
- Database: `(default)`
- Edition/mode: Standard / Firestore Native
- Region: `asia-south1`

## Data paths and access

- `products/{productId}` is publicly read for the storefront and written only by an authenticated admin custom claim.
- New and edited catalog products store `returnPolicy` as a bounded map containing `type`, `days`, `conditions`, and `customerRights`.
- Existing product documents may omit `returnPolicy`; they remain readable and operationally updateable without migration.
- `orders/{orderId}` is owner/admin readable. Order creation is performed by trusted Cloud Functions, which copy the product policy into each authoritative quoted/order item.
- Payment intents, stock reservations, and invoice records remain backend-only. The policy snapshot travels inside the existing authoritative quote; it does not affect price, tax, stock, or payment validation.

## Queries

- Products use a collection snapshot listener without filters, sorting, or limits; sorting is performed client-side.
- Orders retain their existing owner/admin access paths and queries. This change adds no query or index.

## Validation and compatibility

- Allowed configured policy types: `return`, `replacement`, `non-returnable`.
- Return/replacement periods are integer values from 1 through 365 days.
- Non-returnable policies require a zero-day period.
- Conditions are required and limited to 2,000 characters; the customer-rights notice is required and limited to 500 characters.
- Legacy products without a configured policy snapshot as `unspecified` for new orders; historical orders are never rewritten.

## Security review / attack checks

- Public catalog users cannot write policy fields because product writes require the admin custom claim.
- Non-admin create/update/delete attempts remain denied.
- Invalid enum values, negative/oversized periods, missing conditions, oversized text, and extra nested policy keys are rejected.
- Update validation calls the same product validator used for creates; narrow legacy operational updates cannot add or change the policy field.
- Policy snapshots in orders cannot be written by customers because order creation remains trusted-backend-only.
- No new ownership, role, counter, timestamp, path, or query authorization surface is introduced.
