# Pride Circuit

A responsive customer storefront and admin portal built with React, Vite, and Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

Use `npm run build` for a production build and `npm run lint` to run the code checks.

## Firebase data and deployment

The storefront now reads products, categories, coupons, published reviews, and
store settings from Firestore in real time. Authenticated customers read only
their own profile, cart, wishlist, addresses, masked payment methods, orders,
and returns. The admin portal reads and manages the complete operational data
set only after Firebase verifies the server-assigned `admin: true` custom claim.

Deploy the backend rules and callable functions after selecting the configured
Firebase project:

```bash
firebase deploy --only firestore,storage,functions
```

Before the first admin login, create the intended administrator as an
Email/Password user in Firebase Authentication. Then grant that account
admin access with Application Default Credentials or a service-account
credential available to the Admin SDK:

```bash
cd functions
  npm run set-admin -- <existing-admin-email>
```

Runtime collections are `products`, `categories`, `coupons`, `reviews`,
`orders`, `returns`, `refunds`, `inventoryHistory`, and `users`.
Backend-only checkout state is stored in `stockReservations`, `paymentIntents`,
and `couponUsages`. The legacy `_authPhoneIndex` remains backend-only for
profile phone-number updates; login uses Firebase email/password or Google
Authentication directly.
Store configuration uses `settings/marketing`, `settings/shipping`,
`settings/invoice`, `settings/storefront`, and `settings/admin`. The invoice
document is admin/backend-only because it contains the registered supplier
address; the validated public checkout tax fields are mirrored to
`settings/storefront.tax`. Existing values can be entered and
saved from the corresponding admin screens; subsequent updates are persisted
to Firestore rather than browser storage.

## Production checkout deployment

The storefront currently accepts Cash on Delivery while the new online payment
gateway is pending merchant verification and implementation. Order placement
continues to calculate pricing and GST on the server, reserve inventory in the
same Firestore transaction, create the invoice snapshot, and remove purchased
cart items. The generic `releaseExpiredStockReservations` scheduled function
remains available to clean up historical abandoned online-checkout holds.

Deploy the index and backend before deploying the updated browser bundle:

```bash
firebase deploy --only firestore:indexes
firebase deploy --only functions:releaseExpiredStockReservations,functions:placeOrder
npm run build
firebase deploy --only hosting
```

The scheduled cleanup requires a billing-enabled Firebase project and the
Cloud Scheduler API. No payment-gateway credentials are used by this codebase
until the approved Cashfree integration is implemented separately.

The production Razorpay retirement, secret cleanup, data-preservation rules,
and safe targeted deployment sequence are documented in
[`docs/cashfree-readiness-deployment.md`](docs/cashfree-readiness-deployment.md).

## Storefront structure

```text
src/user/
├── UserApp.jsx                  # Storefront composition and cross-feature state
├── components/
│   ├── auth/                    # Customer authentication UI
│   ├── cart/                    # Cart drawer and cart interactions
│   ├── checkout/                # Checkout and order submission UI
│   ├── common/                  # Small shared storefront primitives
│   ├── home/                    # Homepage-only sections
│   ├── layout/                  # Header, announcement bar, and footer
│   └── products/                # Catalog, cards, and product details
├── hooks/                       # Reusable stateful domain logic
└── utils/                       # Pure formatting and helper functions
```

All storefront styling lives in Tailwind utility classes directly in JSX. `src/styles/index.css` only loads Tailwind and declares the two font tokens; it contains no component styles. Admin styles remain isolated in `src/styles/admin.css` and the existing admin stylesheet.

## Included customer flows

- Responsive desktop and mobile navigation
- Live product search, category filters, and sorting
- Wishlist toggling and quick product details
- Add to cart, quantity updates, removal, and totals
- Sign-in/sign-up modal
- Delivery and payment checkout form
- Order creation passed back to the shared admin data layer
- Customer benefits, membership promotion, newsletter, and seller handoff
