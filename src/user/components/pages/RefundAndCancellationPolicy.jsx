import { RefreshCcw } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const sections = [
  [
    '1. Scope of This Policy',
    <>
      <p>
        This policy explains how cancellations, returns, replacements, and
        refunds are handled for products purchased from Pride Electronics
        through pridecircuit.in.
      </p>
      <p>
        Return eligibility may vary for certain products because of their
        condition, use, manufacturer warranty, safety requirements, or
        product-specific terms. Any different condition shown on the product
        page before purchase will form part of this policy.
      </p>
    </>,
  ],
  [
    '2. Cancelling an Order',
    <>
      <p>
        You may request cancellation while an order is pending, confirmed, or
        being processed and before it has been shipped. Use the cancellation
        option in your account where available, or contact customer support with
        your order number.
      </p>
      <p>
        A cancellation request cannot be guaranteed after packing or dispatch
        has begun. Once an order has shipped, you may need to receive it and
        request a return if the product is eligible.
      </p>
    </>,
  ],
  [
    '3. Cancellation by Pride Electronics',
    <>
      <p>We may cancel or place an order on hold for reasons including:</p>
      <ul>
        <li>The product or selected variant is unavailable.</li>
        <li>A material product, price, tax, discount, or shipping error.</li>
        <li>A failed, incomplete, reversed, unauthorized, or suspicious payment.</li>
        <li>An incomplete, invalid, or unserviceable delivery address.</li>
        <li>Suspected fraud, resale abuse, or violation of purchase limits.</li>
        <li>A legal, regulatory, safety, or technical restriction.</li>
      </ul>
      <p>
        If we cancel a prepaid order, the eligible amount will be refunded to
        the original payment method.
      </p>
    </>,
  ],
  [
    '4. Seven-Day Return Window',
    <>
      <p>
        An eligible product may be returned within seven calendar days after
        delivery. The return request must be submitted before the end of the
        seventh day. For example, a product delivered on the 1st must generally
        be reported no later than the 8th.
      </p>
      <p>
        A return request is not an automatic approval. We may review the order,
        reason, supporting evidence, product category, and product condition
        before approving pickup, replacement, or refund.
      </p>
    </>,
  ],
  [
    '5. Conditions for an Eligible Return',
    <>
      <p>Unless the product arrived damaged, defective, or incorrect:</p>
      <ul>
        <li>The product must be unused and in its original condition.</li>
        <li>Original packaging, labels, manuals, accessories, and included components must be returned.</li>
        <li>The serial number, model number, and other identifying marks must remain intact and match the order.</li>
        <li>The product must not have been installed, programmed, soldered, modified, damaged, or misused.</li>
        <li>Proof of purchase and any requested photos or videos must be provided.</li>
      </ul>
      <p>
        Handle and test products only to the extent reasonably necessary to
        confirm their identity and condition.
      </p>
    </>,
  ],
  [
    '6. Products That May Not Be Returnable',
    <>
      <p>Except where required by law or where the product arrived defective, damaged, or incorrect, returns may be declined for:</p>
      <ul>
        <li>Products identified as non-returnable on the product page.</li>
        <li>Opened consumables, adhesives, chemicals, batteries, or hygiene-sensitive products.</li>
        <li>Software, licence keys, downloadable products, or activated digital entitlements.</li>
        <li>Custom-cut, made-to-order, configured, engraved, or personalized products.</li>
        <li>Electronic components damaged through incorrect voltage, polarity, wiring, soldering, installation, static discharge, or misuse.</li>
        <li>Products with removed serial labels, tamper seals, protective films, or missing accessories.</li>
        <li>Products damaged after delivery through accident, neglect, liquid, improper storage, or unauthorized repair.</li>
      </ul>
      <p>
        Manufacturer warranty service may remain available even when a product
        is not eligible for a return.
      </p>
    </>,
  ],
  [
    '7. Damaged, Defective, Incorrect, or Missing Items',
    <>
      <p>
        Report a damaged package, defective product, incorrect product, or
        missing item within 48 hours of delivery. Contact support with:
      </p>
      <ul>
        <li>Your order number and the affected product.</li>
        <li>A clear description of the issue.</li>
        <li>Photos or video of the product, serial label, packaging, and shipping label where requested.</li>
        <li>An unboxing video where reasonably available, especially for visible transit damage or missing contents.</li>
      </ul>
      <p>
        Keep the product and all packaging until the review is complete. We may
        offer troubleshooting, replacement, return, refund, missing-item
        shipment, or manufacturer warranty assistance depending on the issue.
      </p>
    </>,
  ],
  [
    '8. How to Request a Return',
    <>
      <p>
        Submit the request from the relevant order in your Pride Electronics
        account, where available, or email support@pridecircuit.in. Include the
        order number, return reason, affected item, and requested evidence.
      </p>
      <p>
        Do not send a product back without return authorization and return
        instructions. An unauthorized shipment may be delayed, refused, or
        returned to the sender.
      </p>
    </>,
  ],
  [
    '9. Return Pickup and Shipping',
    <>
      <p>
        If pickup is available for your PIN code, we will provide scheduling
        information after approving the request. You may be asked to self-ship
        the product when pickup is unavailable.
      </p>
      <p>
        Pride Electronics will bear reasonable return-shipping costs for a
        verified damaged, defective, incorrect, or missing-item issue
        attributable to us. For other approved returns, return-shipping or
        pickup charges may be deducted from the refund if disclosed before the
        return is finalized.
      </p>
      <p>
        Package the product securely. We are not responsible for return damage
        caused by inadequate packaging or a shipping method not authorized by us.
      </p>
    </>,
  ],
  [
    '10. Inspection and Resolution',
    <>
      <p>
        Returned products may be inspected for identity, completeness,
        condition, serial number, and the reported issue. We will notify you if
        additional information is required or if the return is approved or
        rejected.
      </p>
      <p>
        Depending on the circumstances and stock availability, an approved
        claim may result in repair assistance, replacement, store resolution,
        or refund. A replacement is subject to availability; if a suitable
        replacement is unavailable, an eligible refund may be offered.
      </p>
    </>,
  ],
  [
    '11. Refund Amount and Method',
    <>
      <p>
        An approved refund may include the eligible product amount and any
        applicable refundable shipping charge. Original outbound shipping or
        convenience charges may be non-refundable for a discretionary return,
        but will be considered where the return results from our error or a
        verified damaged, defective, or incorrect product.
      </p>
      <p>
        Prepaid-order refunds are routed through Cashfree Payments to the
        original payment method used for the transaction. We do not substitute
        cash or transfer a refund to an unrelated account except where required
        by applicable law. For Cash on Delivery orders, any approved refund
        method and required account verification will be communicated securely.
      </p>
    </>,
  ],
  [
    '12. Refund Timeline',
    <>
      <p>
        After a cancellation or return is approved, we generally initiate the
        refund within 5–7 business days. Your bank, card issuer, UPI provider,
        or payment service may require additional time to credit the amount.
      </p>
      <p>
        A refund is not complete merely because it has been requested. Where
        available, we will record or communicate the gateway refund reference
        and current status.
      </p>
    </>,
  ],
  [
    '13. Refund Not Received',
    <>
      <p>
        If the expected credit period has passed, first check the original
        payment account and contact the relevant bank or payment provider. You
        may then contact us with your order number, payment method, refund date,
        and refund reference so we can investigate.
      </p>
    </>,
  ],
  [
    '14. Abuse and Fraud Prevention',
    <p>
      We may request additional verification or reject a claim supported by
      altered evidence, a mismatched product or serial number, repeated misuse,
      or other reasonable indicators of fraud. This does not limit any right or
      remedy that cannot lawfully be excluded.
    </p>,
  ],
  [
    '15. Contact Us',
    <>
      <p><strong>Pride Electronics</strong></p>
      <p>Website: pridecircuit.in</p>
      <p>Email: support@pridecircuit.in</p>
      <p>
        Use the subject &quot;Cancellation&quot;, &quot;Return&quot;, or &quot;Refund&quot; and include
        your order number. Never send passwords, PINs, one-time passwords, or
        complete card details.
      </p>
    </>,
  ],
]

export default function RefundAndCancellationPolicy({ onBack }) {
  return (
    <LegalPageLayout
      title="Refund & Cancellation Policy"
      description="Cancellation, return eligibility, inspection, replacement, and original-method refund terms for pridecircuit.in orders."
      updatedAt="October 15, 2026"
      sections={sections}
      onBack={onBack}
      icon={RefreshCcw}
      eyebrow="Returns & refunds"
    />
  )
}
