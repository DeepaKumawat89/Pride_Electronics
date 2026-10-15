import { Headphones } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const sections = [
  [
    '1. Customer Support',
    <>
      <p>
        Pride Electronics provides support for products, accounts, payments,
        orders, shipping, cancellations, returns, replacements, refunds, and
        invoices associated with pridecircuit.in.
      </p>
      <p>
        Email us at{' '}
        <a href="mailto:support@pridecircuit.in">
          support@pridecircuit.in
        </a>
        .
      </p>
    </>,
  ],
  [
    '2. Information to Include',
    <>
      <p>To help us locate and resolve your request, include:</p>
      <ul>
        <li>Your full name and registered email address.</li>
        <li>Your order number for an order-related request.</li>
        <li>The product name, model, and serial number where relevant.</li>
        <li>A concise description of the issue and the resolution requested.</li>
        <li>Photos, video, tracking information, or payment reference where reasonably required.</li>
      </ul>
      <p>
        Send requests from the email address associated with your account where
        possible. We may ask for additional information to verify account or
        order ownership before disclosing information or making changes.
      </p>
    </>,
  ],
  [
    '3. Suggested Email Subjects',
    <>
      <p>Use a clear subject so your request can be routed correctly:</p>
      <ul>
        <li>&quot;Product Question&quot; for specifications, compatibility, or availability.</li>
        <li>&quot;Payment Issue&quot; for failed, pending, or debited transactions.</li>
        <li>&quot;Order Status&quot; for processing or fulfilment questions.</li>
        <li>&quot;Shipping&quot; or &quot;Delivery&quot; for tracking and courier issues.</li>
        <li>&quot;Cancellation&quot;, &quot;Return&quot;, or &quot;Refund&quot; for after-order assistance.</li>
        <li>&quot;Invoice&quot; for billing or GST invoice assistance.</li>
        <li>&quot;Privacy Request&quot; for access, correction, deletion, or privacy concerns.</li>
      </ul>
    </>,
  ],
  [
    '4. Payment Support',
    <>
      <p>
        For a pending, failed, or debited payment, include the order number,
        payment date, amount, payment method, and Cashfree payment or bank
        reference if available. Do not initiate repeated payments while an
        earlier transaction remains pending unless the website clearly confirms
        that no successful payment exists.
      </p>
      <p>
        Never send a card number, card security code, UPI PIN, online-banking
        password, or one-time password. Pride Electronics and Cashfree support
        will not require these credentials to investigate a transaction.
      </p>
    </>,
  ],
  [
    '5. Shipping, Damage, and Returns',
    <>
      <p>
        Report a damaged package, defective product, incorrect product, or
        missing item within 48 hours of delivery. Keep the product, accessories,
        packaging, and shipping label while the issue is reviewed.
      </p>
      <p>
        Eligible return requests must generally be submitted within seven days
        of delivery. Review the Shipping &amp; Delivery Policy and Refund &amp;
        Cancellation Policy before sending a product back. Do not ship a return
        without authorization and return instructions.
      </p>
    </>,
  ],
  [
    '6. Response and Resolution',
    <>
      <p>
        Support requests are reviewed on business days. Response and resolution
        time depends on the issue, information supplied, courier or payment-
        provider investigation, product inspection, and any manufacturer input.
      </p>
      <p>
        Please reply within the same email thread and avoid opening duplicate
        requests for the same issue, as duplicates can delay investigation.
      </p>
    </>,
  ],
  [
    '7. Safety and Fraud Prevention',
    <>
      <p>
        Official support communication will not ask you to install remote-access
        software, transfer money to receive a refund, scan an unrelated QR code,
        or disclose passwords, PINs, or one-time passwords.
      </p>
      <p>
        If you receive a suspicious message claiming to represent Pride
        Electronics, do not follow its instructions. Forward the details to
        support@pridecircuit.in for review.
      </p>
    </>,
  ],
  [
    '8. Contact Details',
    <>
      <p><strong>Pride Electronics</strong></p>
      <p>Website: pridecircuit.in</p>
      <p>
        Email:{' '}
        <a href="mailto:support@pridecircuit.in">
          support@pridecircuit.in
        </a>
      </p>
    </>,
  ],
]

export default function ContactUs({ onBack }) {
  return (
    <LegalPageLayout
      title="Contact Us"
      description="Contact Pride Electronics for product, account, payment, order, delivery, return, refund, or privacy assistance."
      updatedAt="October 15, 2026"
      sections={sections}
      onBack={onBack}
      icon={Headphones}
      eyebrow="Customer support"
    />
  )
}
