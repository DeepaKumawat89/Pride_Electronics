import { ScrollText } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const sections = [
  {
    title: '1. About These Terms',
    content: (
      <>
        <p>
          These Terms &amp; Conditions govern your access to pridecircuit.in and
          your purchase of products from Pride Electronics. References to
          &quot;we&quot;, &quot;us&quot;, and &quot;our&quot; mean Pride Electronics. References to
          &quot;you&quot; and &quot;your&quot; mean the customer or website visitor.
        </p>
        <p>
          By creating an account, placing an order, or otherwise using the
          website, you agree to these terms and acknowledge our Privacy Policy,
          Shipping &amp; Delivery Policy, and Refund &amp; Cancellation Policy. If you
          do not agree, please do not use the website or place an order.
        </p>
      </>
    ),
  },
  {
    title: '2. Eligibility and Customer Accounts',
    content: (
      <>
        <p>
          You must be legally capable of entering into a purchase transaction
          under applicable law. A parent or legal guardian must supervise use
          by a person who is not independently eligible to contract.
        </p>
        <p>When creating or using an account, you agree to:</p>
        <ul>
          <li>Provide accurate, current, and complete information.</li>
          <li>Keep your contact, billing, and delivery information updated.</li>
          <li>Protect your password and account access.</li>
          <li>Notify us promptly if you suspect unauthorized account activity.</li>
          <li>Accept responsibility for activity performed through your account, except where applicable law provides otherwise.</li>
        </ul>
        <p>
          We may restrict or suspend an account where reasonably necessary to
          investigate fraud, misuse, security risks, or a violation of these
          terms. Please contact customer support if you believe a restriction
          was applied incorrectly.
        </p>
      </>
    ),
  },
  {
    title: '3. Acceptable Use',
    content: (
      <>
        <p>You must not:</p>
        <ul>
          <li>Use the website for fraudulent, illegal, or unauthorized activity.</li>
          <li>Provide false identity, payment, billing, or delivery information.</li>
          <li>Attempt to gain unauthorized access to accounts, systems, or data.</li>
          <li>Interfere with the security, availability, or operation of the website.</li>
          <li>Use automated tools to scrape, overload, or misuse the website without permission.</li>
          <li>Copy or commercially exploit website content except as permitted by law or with our written authorization.</li>
        </ul>
      </>
    ),
  },
  {
    title: '4. Products and Product Information',
    content: (
      <>
        <p>
          We make reasonable efforts to present accurate product names,
          descriptions, images, specifications, model numbers, compatibility,
          prices, taxes, warranty information, and availability.
        </p>
        <ul>
          <li>Colours and appearance may vary because of lighting or device-display settings.</li>
          <li>Manufacturers may update specifications, packaging, or included accessories.</li>
          <li>Compatibility information should be checked before purchase.</li>
          <li>Availability may change before an order is confirmed.</li>
        </ul>
        <p>
          If a material listing error affects your order, we will contact you
          with available options, which may include correction, replacement, or
          cancellation with an applicable refund.
        </p>
      </>
    ),
  },
  {
    title: '5. Prices, Taxes, Discounts, and Charges',
    content: (
      <>
        <p>
          Product prices are displayed in Indian Rupees (INR). The product page
          or checkout will indicate whether taxes are included or calculated
          separately. Before payment, checkout displays the applicable product
          subtotal, discounts, shipping charges, taxes, and final payable amount.
        </p>
        <p>
          Coupons, promotional prices, bulk prices, and free-shipping offers are
          subject to their stated validity, product eligibility, minimum-order,
          usage, and account limits. Unless stated otherwise, offers cannot be
          exchanged for cash or combined with another offer.
        </p>
        <p>
          If a clear pricing or calculation error is discovered before
          fulfilment, we may place the order on hold and ask you to confirm the
          corrected amount, or cancel the affected item and process an
          applicable refund.
        </p>
      </>
    ),
  },
  {
    title: '6. Orders and Order Acceptance',
    content: (
      <>
        <p>
          Submitting an order is an offer to purchase the selected products. An
          acknowledgement of your request or payment attempt does not by itself
          mean that the order has been accepted. Acceptance occurs when we
          confirm the order after validating payment, product availability,
          pricing, and delivery information.
        </p>
        <p>We may refuse, hold, or cancel an order for reasons including:</p>
        <ul>
          <li>Insufficient stock or an unavailable product or variant.</li>
          <li>Incorrect product, price, tax, discount, or shipping information.</li>
          <li>Failed, incomplete, reversed, unauthorized, or suspicious payment.</li>
          <li>Incomplete, invalid, or unserviceable delivery information.</li>
          <li>Suspected fraud, resale abuse, or violation of purchase limits.</li>
          <li>A legal, regulatory, safety, or technical restriction.</li>
        </ul>
        <p>
          If we cancel an accepted prepaid order, the eligible amount will be
          returned through the original payment method in accordance with our
          Refund &amp; Cancellation Policy.
        </p>
      </>
    ),
  },
  {
    title: '7. Payments',
    content: (
      <>
        <p>
          Online payments may be processed by Cashfree Payments and its banking
          or payment-network partners. Available payment methods are displayed
          during checkout and may change according to provider availability,
          transaction risk, or account eligibility.
        </p>
        <p>
          You authorize the applicable payment provider to process the amount
          shown at checkout. Payment processing is also subject to the
          provider&apos;s terms, privacy policy, authentication requirements, and
          transaction limits.
        </p>
        <p>
          We do not ask you to disclose card security codes, UPI PINs,
          online-banking passwords, or one-time passwords to our staff. Never
          share these credentials by phone, email, message, or support request.
        </p>
        <p>
          An amount appearing as debited does not always mean we received a
          successful payment confirmation. If payment status is pending or an
          order is not created, contact us with the order or gateway reference
          so the transaction can be investigated.
        </p>
      </>
    ),
  },
  {
    title: '8. GST Invoices',
    content: (
      <>
        <p>
          You are responsible for entering accurate billing and GST details
          before placing an order. Where GST invoicing is available, the GSTIN
          and registered legal name must be valid and consistent with the
          billing information.
        </p>
        <p>
          Changes to tax invoices after an order is placed may be restricted by
          applicable tax requirements. We may request supporting information
          before correcting an invoice.
        </p>
      </>
    ),
  },
  {
    title: '9. Shipping and Delivery',
    content: (
      <>
        <p>
          We deliver to serviceable locations in India. Available shipping
          options, charges, and estimated delivery dates are displayed before
          order confirmation.
        </p>
        <p>
          Orders are generally processed within 1–2 business days and delivered
          within 3–7 business days after dispatch. These are estimates, not
          guarantees. Remote locations, public holidays, adverse weather,
          courier disruption, government restrictions, or other circumstances
          outside our reasonable control may cause delays.
        </p>
        <p>
          You are responsible for providing a complete and accurate delivery
          address and a reachable phone number. Please review our Shipping &amp;
          Delivery Policy for tracking, failed-delivery, damaged-package, and
          other fulfilment terms.
        </p>
      </>
    ),
  },
  {
    title: '10. Order Cancellation',
    content: (
      <>
        <p>
          You may request cancellation while an order is pending, confirmed, or
          being processed and before it has been shipped. Cancellation cannot
          be guaranteed after packing or dispatch has begun.
        </p>
        <p>
          Once an order has shipped, you may need to receive it and use the
          applicable return process. Approved refunds for prepaid cancellations
          are sent to the original payment method; cash refunds are not provided
          except where required by applicable law.
        </p>
      </>
    ),
  },
  {
    title: '11. Returns, Replacements, and Refunds',
    content: (
      <>
        <p>
          Eligible products may be returned within seven days of delivery,
          subject to the conditions, exclusions, and request procedure in our
          Refund &amp; Cancellation Policy. Product-specific terms displayed on the
          product page also apply.
        </p>
        <p>
          Damaged, defective, incorrect, or missing products should be reported
          within 48 hours of delivery with the order number and requested photos
          or other supporting information.
        </p>
        <p>
          Returned products may be inspected before a replacement or refund is
          approved. Approved refunds are generally initiated within 5–7 business
          days and routed to the original payment method. Your bank or payment
          provider may require additional time to credit the amount.
        </p>
      </>
    ),
  },
  {
    title: '12. Manufacturer Warranty and Service',
    content: (
      <>
        <p>
          Warranty coverage, duration, exclusions, and service arrangements vary
          by product and manufacturer. Any applicable warranty information is
          shown on the product page, packaging, invoice, or manufacturer
          documentation.
        </p>
        <p>
          Warranty claims may require the original invoice, serial number,
          packaging, accessories, or inspection by an authorized service centre.
          A manufacturer warranty does not automatically make every product
          eligible for return or refund.
        </p>
      </>
    ),
  },
  {
    title: '13. Reviews and Customer Content',
    content: (
      <>
        <p>
          If you submit a review, rating, image, or other content, you confirm
          that it is truthful, relevant, lawful, and does not violate another
          person&apos;s privacy or intellectual-property rights.
        </p>
        <p>
          We may moderate, reject, or remove content that is fraudulent,
          abusive, unlawful, unrelated to the product, or contains personal,
          confidential, or promotional information.
        </p>
      </>
    ),
  },
  {
    title: '14. Intellectual Property',
    content: (
      <p>
        The website design, software, text, graphics, branding, and original
        content are owned by or licensed to Pride Electronics and are protected
        by applicable intellectual-property laws. Manufacturer names, product
        marks, and third-party content belong to their respective owners. You
        may use the website only for personal, lawful shopping purposes unless
        we authorize another use in writing.
      </p>
    ),
  },
  {
    title: '15. Third-Party Services and Links',
    content: (
      <p>
        Payment providers, couriers, manufacturers, service centres, and linked
        websites operate independently and may apply their own terms and privacy
        policies. We remain responsible for our obligations to you under
        applicable law, but we do not control an independent third party&apos;s
        website, network, or service availability.
      </p>
    ),
  },
  {
    title: '16. Privacy and Electronic Communications',
    content: (
      <>
        <p>
          Our collection and use of personal information is described in our
          Privacy Policy. By providing your email address or phone number, you
          agree that we may send transactional communications concerning your
          account, payment, order, shipment, return, refund, or support request.
        </p>
        <p>
          Promotional communications are subject to your preferences and
          applicable law. Transactional or security messages may still be sent
          when necessary to provide the service you requested.
        </p>
      </>
    ),
  },
  {
    title: '17. Availability and Limitation of Liability',
    content: (
      <>
        <p>
          We use reasonable care to operate the website and fulfil accepted
          orders, but uninterrupted or error-free availability cannot be
          guaranteed. To the extent permitted by applicable law, we are not
          responsible for indirect or consequential loss caused solely by
          events outside our reasonable control.
        </p>
        <p>
          Nothing in these terms excludes or limits liability that cannot
          lawfully be excluded, or restricts any mandatory right or remedy
          available to a consumer under applicable law.
        </p>
      </>
    ),
  },
  {
    title: '18. Changes to These Terms',
    content: (
      <p>
        We may update these terms to reflect changes to our services, business,
        providers, or legal obligations. The revised version will be published
        on this page with an updated date. Terms applicable when your order was
        placed will continue to govern that order unless a change is required by
        law or agreed with you.
      </p>
    ),
  },
  {
    title: '19. Governing Law and Dispute Resolution',
    content: (
      <>
        <p>
          These terms are governed by the laws of India. We encourage you to
          contact customer support first so that we can try to resolve a concern
          promptly.
        </p>
        <p>
          Subject to mandatory consumer-protection rights and any forum provided
          by applicable law, disputes will be submitted to a court or other
          competent authority having lawful jurisdiction.
        </p>
      </>
    ),
  },
  {
    title: '20. Contact Us',
    content: (
      <>
        <p><strong>Pride Electronics</strong></p>
        <p>Website: pridecircuit.in</p>
        <p>Email: support@pridecircuit.in</p>
        <p>
          Include your order number when contacting us about an existing order.
          Never send passwords, PINs, one-time passwords, or complete card
          details.
        </p>
      </>
    ),
  },
]

export default function TermsAndConditions({ onBack }) {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      description="The terms governing accounts, purchases, payments, shipping, cancellations, returns, and use of pridecircuit.in."
      updatedAt="October 15, 2026"
      sections={sections}
      onBack={onBack}
      icon={ScrollText}
      eyebrow="Store terms"
    />
  )
}
