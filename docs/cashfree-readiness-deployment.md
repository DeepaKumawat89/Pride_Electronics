# Pride Circuit Cashfree Readiness Deployment Checklist

This checklist records the production state observed on November 11, 2026. It
does not authorize deployment, function deletion, secret destruction, or
Firestore writes. Obtain explicit approval before performing those actions.

## Confirmed source values and document verification

The source now uses Pride Circuit, Pride Automation, proprietor Pravin
Rameshrao Banait, GSTIN `27AFUPB6009F2ZG`, support phone `9607126969`, and
`support@pridecircuit.in`. These remain owner-supplied and must be checked
against the actual GST and business documents before production configuration.

- Verify the owner-supplied registered address against GST/KYC documents before
  entering it in private `settings/invoice.business.address`. Do not copy it to
  public pages or `settings/storefront`.
- Verify the GSTIN, proprietor, trade name, PAN, state code, and registration
  type together. The callable invoice validator requires the GSTIN/PAN match.
- Confirm the configured delivery GST treatment (`fixed`, `product-rates`, or
  `exempt`) and, if fixed, its verified rate. Source does not invent a new rate.

## Production conflicts to resolve

The source About, Contact, footer, invoice defaults, and shipping defaults now
agree. The existing production Firestore documents observed before this edit
still contain conflicting legacy values and have not been modified.

The source checkout exposes Standard Delivery at INR 80 plus applicable GST,
Pune-only Express Delivery at INR 100 plus applicable GST, Office Pickup, and
customer-booked/customer-paid Porter. Production settings must be aligned
before deploying this source.

Before deployment, update the source policy, checkout delivery configuration,
and the following Firestore setting documents as one approved value set:

- `settings/invoice`
- `settings/storefront`
- `settings/shipping`

`settings/invoice` is now private to administrators and trusted backend code.
The validated invoice update callable mirrors only the public tax calculation
fields into `settings/storefront.tax`; it does not expose the registered
supplier address. Deploy the matching Firestore rules with the application.

Do not modify orders, invoices, payment intents, stock reservations, customers,
or any other historical records as part of this cleanup.

## Deployed Razorpay inventory

The following Generation 2 functions are currently active in `asia-south1` and
must be explicitly deleted after the replacement backend and COD storefront are
deployed:

- `createRazorpayOrder`
- `verifyRazorpayPayment`
- `releaseRazorpayReservation`
- `razorpayWebhook`

The currently deployed `updateUserProfile` function is also bound to
`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Redeploy it from the cleaned source
before destroying either secret.

The external Razorpay Dashboard webhook registration for the deployed
`razorpayWebhook` URL must be disabled or removed separately. Deleting a Cloud
Function does not remove a webhook registered in Razorpay.

The following Secret Manager versions are enabled and should be destroyed only
after no deployed function references them:

- `RAZORPAY_KEY_ID@1`
- `RAZORPAY_KEY_SECRET@1`
- `RAZORPAY_KEY_SECRET@2`
- `RAZORPAY_WEBHOOK_SECRET@1`

Secret values must never be printed, copied into source, or included in logs.

## Safe deployment order

1. Obtain approval for the final business identity, address, shipping values,
   and public policy text.
2. Through a separately authorized admin/configuration change, update the three
   approved Firestore setting documents so
   branding, GST identity, contact details, delivery choices, charges, and
   estimates agree.
3. With explicit authorization, run the requested build and test suite. Do not
   continue if checkout, GST, coupon, inventory, invoice, authentication, order
   history, or policy-link checks fail.
4. Schedule a short maintenance window. The live storefront currently calls
   Razorpay functions while the replacement backend accepts COD only, so
   backend and hosting changes must not be separated by normal customer traffic.
5. Deploy the Firestore rules that make `settings/invoice` admin-only, then only
   the changed retained functions. Do not use a blanket Functions
   deployment because `createAdminProduct` is deployed but unrelated to this
   cleanup and is not exported by the current source:

   ```powershell
   firebase.cmd deploy --only firestore:rules --project ecommerce-78081
   firebase.cmd deploy --only functions:updateInvoiceSettings,functions:updateUserProfile,functions:placeOrder,functions:releaseExpiredStockReservations --project ecommerce-78081
   ```

6. Deploy the default Hosting target immediately after the retained functions:

   ```powershell
   firebase.cmd deploy --only hosting --project ecommerce-78081
   ```

7. Verify the live COD flow and inspect new records without changing historical
   orders: cart, addresses, GST invoice choice, coupon, Standard Delivery,
   Pune Express acceptance and non-Pune rejection, Office Pickup, Porter,
   delivery GST, final
   total, inventory reservation, order creation, invoice retrieval, order
   history, cancellation, and authentication.
8. Disable or remove the Razorpay Dashboard webhook registration.
9. With explicit deletion approval, remove only the four Razorpay functions:

   ```powershell
   firebase.cmd functions:delete createRazorpayOrder verifyRazorpayPayment releaseRazorpayReservation razorpayWebhook --region asia-south1 --project ecommerce-78081
   ```

10. Re-run the read-only deployed-function inventory. Confirm the four
    Razorpay functions are absent and `updateUserProfile` has no Razorpay secret
    bindings.
11. With explicit secret-destruction approval, destroy every enabled Razorpay
    secret version:

    ```powershell
    firebase.cmd functions:secrets:destroy RAZORPAY_KEY_ID@1 --project ecommerce-78081
    firebase.cmd functions:secrets:destroy RAZORPAY_KEY_SECRET@1 --project ecommerce-78081
    firebase.cmd functions:secrets:destroy RAZORPAY_KEY_SECRET@2 --project ecommerce-78081
    firebase.cmd functions:secrets:destroy RAZORPAY_WEBHOOK_SECRET@1 --project ecommerce-78081
    ```

12. Confirm the destroyed versions are no longer enabled. Confirm no source,
    Hosting bundle, deployed function, Cloud Run service, webhook configuration,
    or environment binding retains active Razorpay processing.
13. End the maintenance window only after production verification succeeds.

## Historical-data preservation

Do not delete or rewrite existing Firestore orders, invoices, payment intents,
stock reservations, inventory history, refunds, returns, customers, or coupon
usage. The storefront and admin payment utilities intentionally retain read-only
support for the legacy `razorpayPaymentId` field so historical transaction IDs
remain visible.
