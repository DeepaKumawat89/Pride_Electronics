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
set only after Firebase verifies the server-assigned `admin: true` custom claim.

Deploy the backend rules and callable functions after selecting the configured
Firebase project:

```bash
firebase deploy --only firestore,storage,functions
```

Before the first admin login, create `admin@prideelectronics.in` as an
Email/Password user in Firebase Authentication. Then grant that account sole
admin access with Application Default Credentials or a service-account
credential available to the Admin SDK:

```bash
cd functions
npm run set-admin
```

Runtime collections are `products`, `categories`, `coupons`, `reviews`,
`orders`, `returns`, `refunds`, `inventoryHistory`, and `users`.
Backend-only checkout state is stored in `stockReservations`, `paymentIntents`,
and `couponUsages`. The legacy `_authPhoneIndex` remains backend-only for
profile phone-number updates; login uses Firebase email/password or Google
Authentication directly.
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
