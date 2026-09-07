# Pride Electronics

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
set after Firebase verifies an admin custom claim or `admins/{uid}` record.

Deploy the backend rules and callable functions after selecting the configured
Firebase project:

```bash
firebase deploy --only firestore,storage,functions
```

Before the first admin login, create that email/password account in Firebase
Authentication and grant it admin access with Application Default Credentials
or a service-account credential available to the Admin SDK:

```bash
cd functions
npm run set-admin -- admin@example.com "Store Administrator"
```

Runtime collections are `products`, `categories`, `coupons`, `reviews`,
`orders`, `returns`, `refunds`, `inventoryHistory`, `users`, and `admins`.
Backend-only checkout state is stored in `stockReservations`, `paymentIntents`,
`couponUsages`, and `_authPhoneIndex`; Firestore rules intentionally deny all
client access to these collections.
Store configuration uses `settings/marketing`, `settings/shipping`,
`settings/invoice`, `settings/storefront`, and `settings/admin`. Existing values can be entered and
saved from the corresponding admin screens; subsequent updates are persisted
to Firestore rather than browser storage.

## Production checkout deployment

Online checkout reserves `products.reservedStock` in a Firestore transaction
before a Razorpay order is created. Holds expire after 15 minutes. Checkout
failure or dismissal releases them immediately, while the
`releaseExpiredStockReservations` scheduled function is the offline/browser
timeout backstop. Successful payment is confirmed only after the backend has
verified the Razorpay signature, payment ID, order ID, amount, currency, and
payment status. A captured payment that arrives after its hold was released is
sent through the Razorpay refund API instead of creating an oversold order.

Deploy the index and backend before deploying the updated browser bundle:

```bash
firebase deploy --only firestore:indexes
firebase deploy --only functions:createRazorpayOrder,functions:verifyRazorpayPayment,functions:releaseRazorpayReservation,functions:razorpayWebhook,functions:releaseExpiredStockReservations,functions:placeOrder
npm run build
firebase deploy --only hosting
```

The scheduled cleanup requires a billing-enabled Firebase project and the
Cloud Scheduler API. Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and
`RAZORPAY_WEBHOOK_SECRET` with Firebase Functions secrets. In the Razorpay
Dashboard, point the webhook at the deployed `razorpayWebhook` URL and subscribe
to `payment.authorized`, `payment.captured`, and `payment.failed`.

## GSTIN verification and invoices

GSTIN verification runs only in Cloud Functions. Configure the Cashfree Secure
ID credentials as Firebase secrets; never expose them through a `VITE_` variable:

```bash
firebase functions:secrets:set CASHFREE_CLIENT_ID
firebase functions:secrets:set CASHFREE_CLIENT_SECRET
```

Set `CASHFREE_ENV=sandbox` for sandbox credentials and omit it (or set it to
`production`) for live verification. Deploy `verifyGstin`,
`saveVerifiedGstDetails`, `updateUserProfile`, and `placeOrder` after changing
the credentials or GST implementation.

Successful verification saves up to five registrations at `users/{uid}.gstProfiles` and
updates `users/{uid}.gstDetails` with the latest record. Checkout sends only the
selected GSTIN. The backend resolves it against an active Cashfree-verified
record no older than 30 days, then stores the verified GST and complete invoice
snapshot on the order. Customer clients cannot write user GST records or order
invoice data directly.

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
