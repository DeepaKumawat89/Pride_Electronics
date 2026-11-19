# Cashfree Production Readiness

Live checkout is fail-closed. The server parameter `CASHFREE_PAYMENTS_ENABLED`
defaults to `false`, and the frontend flag `VITE_CASHFREE_PAYMENTS_ENABLED`
must also be explicitly set to `true`. Do not enable either until the steps
below are complete.

## Required Cashfree configuration

- Complete Cashfree merchant verification and obtain production App ID and
  Secret Key credentials.
- Store `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET` using Firebase
  Functions Secret Manager. Do not put either value in Vite environment files,
  source code, Hosting configuration, or logs.
- Deploy `cashfreePaymentWebhook` and copy its actual HTTPS URL from the Firebase
  console. Set the non-secret `CASHFREE_WEBHOOK_URL` parameter to that exact URL.
  The application intentionally does not guess the deployed Cloud Functions
  URL.
- In Cashfree, allowlist `https://pridecircuit.in` and configure the copied
  webhook URL for payment success, failure, pending, user-dropped, and refund
  status events. Confirm webhook delivery and signature configuration against
  the production account.
- Configure Cashfree's return URL as
  `https://pridecircuit.in/order-success?order_id={order_id}`.
- Configure Firebase App Check for the production domain and set
  `VITE_FIREBASE_APP_CHECK_SITE_KEY` for the website. Payment creation,
  verification, cancellation, and refund callables enforce App Check.
- Review and deploy the updated Firestore rules. Payment fields on Cashfree
  orders and Cashfree refund records are backend-managed.

The production API endpoint is `https://api.cashfree.com/pg`; the Cashfree
JavaScript SDK is initialized in production mode. The checkout feature remains
disabled by default until the credentials, webhook URL, merchant settings,
domain allowlisting, App Check, and Firestore rules are verified.

## Live enablement sequence

1. Verify the merchant account and production credentials in Cashfree.
2. Set the two Cashfree credentials in Firebase Secret Manager.
3. Deploy the payment webhook and required payment functions, then copy the
   deployed webhook HTTPS URL into `CASHFREE_WEBHOOK_URL`. Redeploy the payment
   functions after setting this parameter.
4. Register the webhook events and production website domain in Cashfree.
5. Verify App Check and deploy Firestore rules.
6. Review deployed function permissions, logs, alerts, and refund operations.
7. Enable `CASHFREE_PAYMENTS_ENABLED` for Functions and
   `VITE_CASHFREE_PAYMENTS_ENABLED` for the website only after all previous
   steps are verified.
8. Deploy the website and perform the separately approved production
   verification and reconciliation steps before announcing checkout as live.

Do not delete deployed legacy functions, secrets, webhook registrations,
Firestore orders, or historical transaction fields as part of this setup.

The source no longer exports the legacy `placeOrder` callable. If that function
is deployed, remove it in a separately approved production change before
opening checkout. Do not use a blanket Functions deployment to remove it.
