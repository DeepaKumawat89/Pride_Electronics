import { useEffect } from 'react'
import { RefreshCcw } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const SUPPORT_EMAIL = 'Support@pridecircuit.in'
const SUPPORT_PHONE = '8574859658'

const sections = [
  [
    '1. Scope and Business Identity',
    <>
      <p>
        This Cancellation, Return &amp; Refund Policy applies to electronic
        components, modules, and related products purchased from Pride Circuit
        at pridecircuit.in. Pride Circuit is operated by Pride Automation.
      </p>
      <p>
        Product-specific return conditions displayed before purchase also form
        part of this policy. Nothing in this policy limits a customer right or
        remedy that cannot lawfully be excluded under applicable Indian law.
      </p>
    </>,
  ],
  [
    '2. Order Cancellation',
    <>
      <p>
        A customer may request cancellation while an order is marked Pending,
        Confirmed, or Processing. Use the cancellation option for the order in
        your Pride Circuit account, where available, or contact support with
        the order number and the email address or phone number used to order.
      </p>
      <p>
        Cancellation is no longer available after the order moves beyond those
        stages or has been dispatched. After dispatch, the customer may request
        a return after delivery if the product and reason are eligible under
        this policy. Refusing delivery does not by itself guarantee a refund.
      </p>
      <p>
        Pride Circuit may cancel an order where a product is unavailable, the
        price or tax is materially incorrect, payment cannot be verified, the
        delivery information is invalid or unserviceable, or fulfilment would
        breach a legal or safety requirement. Any refundable amount for a
        cancelled prepaid order will be returned through the original payment
        route.
      </p>
    </>,
  ],
  [
    '3. Return Request Period',
    <>
      <p>
        The customer account currently provides the return-request option for
        an eligible delivered order for up to 30 calendar days after the
        recorded delivery date. A request submitted during this period is not
        automatically approved.
      </p>
      <p>
        Pride Circuit reviews the reason, product condition, order record,
        supporting evidence, and any product-specific condition before
        approving a return, replacement, or refund. Rights available for a
        defective, damaged, misdescribed, missing, or incorrect product remain
        subject to applicable law even where a website option is unavailable.
      </p>
    </>,
  ],
  [
    '4. Eligible Returns',
    <>
      <p>A return may be eligible where:</p>
      <ul>
        <li>The product received is defective, damaged, materially different from its description, or not the product ordered.</li>
        <li>An item, part, or included accessory is missing from the delivered order.</li>
        <li>An unused product is otherwise shown as returnable and is approved after review.</li>
      </ul>
      <p>
        Unless the reported issue reasonably requires otherwise, the product
        must be unused and returned with its original packaging, labels,
        manuals, accessories, included parts, and intact serial or model
        identification. Proof of purchase and requested photographs or video
        may be required to assess the claim.
      </p>
    </>,
  ],
  [
    '5. Non-returnable or Ineligible Products',
    <>
      <p>Except where required by law, a return may be declined if the product:</p>
      <ul>
        <li>Has been used, installed, soldered, programmed, modified, repaired, or physically altered.</li>
        <li>Was damaged after delivery by incorrect voltage, polarity, wiring, installation, electrostatic discharge, liquid, misuse, neglect, or unsuitable storage.</li>
        <li>Has missing packaging, accessories, parts, labels, seals, or serial identification that prevents verification.</li>
        <li>Does not match the product supplied with the order.</li>
        <li>Was clearly identified as non-returnable or subject to a product-specific condition before purchase.</li>
      </ul>
      <p>
        These exclusions do not apply where the exclusion would improperly
        remove a statutory remedy for a product that was defective, damaged,
        misdescribed, missing, or incorrect when supplied.
      </p>
    </>,
  ],
  [
    '6. Damaged, Defective, Missing, or Incorrect Items',
    <>
      <p>
        Report the issue promptly after delivery through the return option in
        the relevant order or by contacting support. Keep the product and all
        packaging until the review is complete. The request should include:
      </p>
      <ul>
        <li>The order number and affected product.</li>
        <li>A clear description of the defect, damage, shortage, or mismatch.</li>
        <li>Photographs or video of the product, packaging, shipping label, and serial or model label where relevant.</li>
        <li>Any other information reasonably needed to verify the delivery and reported issue.</li>
      </ul>
      <p>
        Depending on the verified issue and stock availability, the resolution
        may be supply of a missing item, replacement, return and refund, or
        another remedy required by applicable law.
      </p>
    </>,
  ],
  [
    '7. Return Process and Shipping',
    <>
      <ol>
        <li>Open the delivered order in your account and submit a return request, or contact support if the option is unavailable.</li>
        <li>Provide the order details, reason, and requested evidence.</li>
        <li>Wait for approval and return instructions. Do not send the product without authorization.</li>
        <li>Package the approved product securely and follow the provided pickup or self-shipping instructions.</li>
        <li>The returned product may be inspected for identity, completeness, condition, and the reported issue before a resolution is confirmed.</li>
      </ol>
      <p>
        Pride Circuit will bear reasonable authorized return-shipping costs for
        a verified defect, transit damage, missing item, or incorrect product
        attributable to Pride Circuit. For another approved return, any
        customer-paid return cost or proposed deduction will be disclosed
        before the return is finalized. Damage caused by inadequate or
        unauthorized return packaging may affect the eligible refund, subject
        to applicable law.
      </p>
    </>,
  ],
  [
    '8. Full and Partial Refund Eligibility',
    <>
      <p>A full refund of the eligible product amount may apply when:</p>
      <ul>
        <li>A prepaid order is validly cancelled before fulfilment.</li>
        <li>A verified defective, damaged, or incorrect product is returned and a replacement is not selected or is unavailable.</li>
        <li>Pride Circuit cannot supply a paid product or another full refund is required by law.</li>
      </ul>
      <p>
        A partial refund may apply only to the affected item or quantity, or
        where an approved return has missing contents or customer-caused loss
        of value. The reason and calculation will be communicated before the
        refund is completed. No deduction will be used to remove a statutory
        customer right.
      </p>
    </>,
  ],
  [
    '9. Refund Method and Processing',
    <>
      <p>
        Online payments are currently processed through Razorpay. An approved
        prepaid refund is returned to the original payment method through the
        payment gateway. Pride Circuit will not ask for a card PIN, CVV, UPI
        PIN, one-time password, or complete card number to process a refund.
      </p>
      <p>
        For a return, refund processing begins after approval and any required
        receipt and inspection of the product. The current customer interface
        states that eligible refunds are processed within 5–7 business days.
        Once initiated, the bank, card issuer, UPI provider, or other payment
        provider may require additional time to show the credit. A gateway
        refund reference will be shared or investigated where available.
      </p>
      <p>
        The website records cancellations and approved return refunds for
        processing; cancellation of a paid order does not mean the bank credit
        is immediate. Contact support if the stated processing period has
        passed without a refund update.
      </p>
    </>,
  ],
  [
    '10. Delivery Charges, GST, and Return Costs',
    <>
      <p>
        Where an entire order is cancelled before dispatch, the eligible refund
        includes amounts collected for products and unperformed Pride Circuit
        delivery, together with the corresponding refundable GST. For a
        verified defect, damage, missing item, or incorrect product attributable
        to Pride Circuit, the affected product amount and applicable tax are
        refundable, and related Pride Circuit delivery charges will be
        considered as required by the circumstances and law.
      </p>
      <p>
        Original delivery charges and their tax may not be refundable for a
        discretionary return after delivery where the delivery service was
        completed. A Porter service independently arranged and paid for by the
        customer is a third-party cost and is not collected or refunded by
        Pride Circuit. Authorized return-shipping responsibility is described
        in Section 7.
      </p>
    </>,
  ],
  [
    '11. Failed, Pending, or Duplicate Payments',
    <>
      <p>
        A payment deduction without a successful Pride Circuit order
        confirmation should be reported with the payment date, amount, payment
        method, gateway transaction reference, and any order reference shown.
        Do not share confidential payment credentials.
      </p>
      <p>
        Pride Circuit will check the order and gateway records. A captured
        payment that cannot be matched to a completed order, including certain
        payments completed after a stock reservation expired, may be refunded
        automatically or escalated for review. A verified duplicate or excess
        captured payment will be refunded through its original payment route.
        Bank or provider posting time applies after initiation.
      </p>
    </>,
  ],
  [
    '12. Support and Policy Updates',
    <>
      <p>
        For cancellation, return, or refund assistance, include the order
        number and contact Pride Circuit using:
      </p>
      <p>
        <strong>Email:</strong>{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        <br />
        <strong>Phone:</strong>{' '}
        <a href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>
      </p>
      <p>
        This policy may be updated to reflect operational, legal, or payment
        processing changes. The version displayed when an order is placed will
        be considered together with any rights that apply by law.
      </p>
      <p><strong>Effective date:</strong> October 22, 2026</p>
    </>,
  ],
]

export default function RefundAndCancellationPolicy({ onBack }) {
  useEffect(() => {
    const previousTitle = document.title
    const description = document.querySelector('meta[name="description"]')
    const previousDescription = description?.getAttribute('content')

    document.title = 'Cancellation, Return & Refund Policy | Pride Circuit'
    description?.setAttribute(
      'content',
      'Read Pride Circuit cancellation, electronic product return eligibility, damaged-item reporting, and original-method refund terms.',
    )

    return () => {
      document.title = previousTitle
      if (description && previousDescription !== null) {
        description.setAttribute('content', previousDescription)
      }
    }
  }, [])

  return (
    <LegalPageLayout
      title="Cancellation, Return & Refund Policy"
      description="Cancellation, electronic product return eligibility, inspection, shipping-cost treatment, and original-method refund terms for Pride Circuit orders."
      updatedAt="October 22, 2026"
      sections={sections}
      onBack={onBack}
      icon={RefreshCcw}
      eyebrow="Returns & refunds"
      hideIntro
      hideSectionNavigation
      breadcrumbLabel="Cancellation, Return & Refund Policy"
    />
  )
}
