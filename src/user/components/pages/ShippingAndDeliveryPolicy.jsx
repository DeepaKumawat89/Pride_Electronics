import { useEffect } from 'react'
import { Truck } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const pageTitle = 'Shipping & Delivery Policy | Pride Circuit'
const pageDescription = 'Review Pride Circuit office pickup, customer-arranged Porter pickup, Express Delivery charges, fulfilment, tracking, and delivery-support terms.'

const sections = [
  [
    '1. Scope of This Policy',
    <>
      <p>
        This Shipping &amp; Delivery Policy explains the fulfilment methods
        available for products purchased through <strong>Pride Circuit</strong>,
        operated by <strong>Pride Automation</strong>.
      </p>
      <p>
        The methods available for an order, applicable charges, GST, and any
        order-specific estimate are displayed during checkout or communicated
        during fulfilment. Customers should review those details before placing
        an order.
      </p>
    </>,
  ],
  [
    '2. Office Pickup (Free)',
    <>
      <p>
        Customers may collect an eligible order without a delivery charge from:
      </p>
      <p>
        <strong>Office No. 237, 2nd Floor, XION Mall, Hinjewadi, Pune, Maharashtra – 411057</strong>
      </p>
      <p>
        Select <strong>Collect From Office</strong> during checkout. After the
        order is confirmed, Pride Circuit will process the items and notify you
        when the order is ready. Do not travel to collect the order until you
        have received readiness confirmation.
      </p>
      <p>
        At collection, provide the order number and any reasonable order-holder
        verification requested to prevent an unauthorised handover. If another
        person will collect the order, contact support in advance with the
        relevant details. The customer is responsible for collecting the order
        and safely transporting it after handover.
      </p>
    </>,
  ],
  [
    '3. Porter (Customer Arranged)',
    <>
      <p>
        Select <strong>Through Porter</strong> during checkout if you want to
        arrange a Porter pickup. The customer independently books Porter and
        pays all Porter charges directly to Porter. <strong>Pride Circuit does
        not charge or collect a Porter delivery fee.</strong>
      </p>
      <p>
        Wait until Pride Circuit confirms that the order is ready before booking
        the pickup. Coordinate the pickup time with support and give Porter the
        correct pickup location, order reference, recipient details, and any
        instructions necessary for handover.
      </p>
      <p>
        The customer is responsible for selecting the Porter service, entering
        accurate booking information, monitoring the booking, paying Porter,
        and ensuring that the selected vehicle and handling method are suitable
        for the products. Porter&apos;s service terms and charges are separate
        from Pride Circuit&apos;s order.
      </p>
    </>,
  ],
  [
    '4. Express Delivery',
    <>
      <p>
        Select <strong>Delivery Express</strong> during checkout for express
        delivery arranged by Pride Circuit where fulfilment is available for the
        selected order and address.
      </p>
      <p>
        The Express Delivery charge is <strong>₹100 excluding applicable GST</strong>.
        Under the currently implemented checkout calculation, delivery GST is
        charged at <strong>18% (₹18)</strong> and displayed separately, making
        the current delivery total <strong>₹118</strong>. The checkout order
        summary displays the delivery charge, delivery GST, and final payable
        amount before payment.
      </p>
      <p>
        Express Delivery is subject to product readiness, order acceptance,
        address accuracy, fulfilment capacity, and practical serviceability.
        Pride Circuit may contact you if the address cannot reasonably be served
        or if coordination is required before dispatch.
      </p>
    </>,
  ],
  [
    '5. Order Confirmation and Processing',
    <>
      <p>
        An order enters fulfilment only after the website has completed the
        applicable order checks, including product availability, authoritative
        pricing, GST, delivery selection, customer information, and successful
        payment verification where required.
      </p>
      <p>
        Processing may include inventory confirmation, payment review, product
        verification, picking, packing, and preparation for pickup or dispatch.
        If a product or selected variant becomes unavailable, or a material
        order issue is identified, we will contact you with the available
        resolution under the applicable customer policies.
      </p>
    </>,
  ],
  [
    '6. Dispatch and Tracking',
    <>
      <p>
        For a delivery arranged by Pride Circuit, dispatch occurs when the
        prepared order is handed over for delivery. For Office Pickup or Porter,
        handover is coordinated after order-readiness confirmation.
      </p>
      <p>
        When tracking information is available, the courier or delivery status,
        tracking number, or tracking link may be shown in the customer account
        or communicated using the registered email address or phone number.
        Tracking can take time to update after a label or delivery booking is
        created.
      </p>
      <p>
        Porter tracking and delivery updates are provided through the Porter
        booking arranged by the customer and are not generated by Pride
        Circuit&apos;s checkout.
      </p>
    </>,
  ],
  [
    '7. Processing and Delivery Timelines',
    <>
      <p>
        Pride Circuit does not currently publish a fixed processing or delivery
        guarantee for every order. Timing depends on payment confirmation,
        inventory, product preparation, the selected fulfilment method,
        destination, coordination, and delivery-provider availability.
      </p>
      <p>
        Any readiness date, delivery date, or duration displayed at checkout or
        communicated for an order is an estimate unless expressly confirmed as
        a binding commitment. We will use reasonable efforts to provide updated
        information when a material delay becomes known.
      </p>
    </>,
  ],
  [
    '8. Customer Responsibilities',
    <>
      <p>Customers are responsible for:</p>
      <ul>
        <li>Providing a correct recipient name, reachable phone number, complete address, landmark where helpful, city, state, and six-digit PIN code.</li>
        <li>Reviewing the selected fulfilment method, delivery charges, GST, and order summary before payment.</li>
        <li>Responding to reasonable pickup or delivery coordination requests.</li>
        <li>Waiting for readiness confirmation before Office Pickup or arranging Porter.</li>
        <li>Providing correct booking and recipient details when arranging Porter.</li>
        <li>Ensuring that an authorised person is available to collect or receive the order.</li>
        <li>Inspecting the outer package at handover where reasonably possible and keeping the product, packaging, shipping label, and accessories if an issue is reported.</li>
      </ul>
      <p>
        Contact support promptly if an address correction is needed. A change
        may not be possible after preparation or dispatch and may affect
        fulfilment availability or timing.
      </p>
    </>,
  ],
  [
    '9. Delayed, Failed, or Incorrect Delivery',
    <>
      <p>
        If an arranged delivery is delayed, unsuccessful, sent to an incorrect
        location, or shown as delivered but not received, contact support with
        the order number and available delivery or tracking information.
      </p>
      <p>
        We may ask you to confirm the address, contact the recipient or building
        staff, review tracking events, or provide information needed for a
        delivery-provider investigation. Re-dispatch, cancellation, or refund
        treatment depends on the cause, product status, delivery-provider
        findings, and the published Refund &amp; Cancellation Policy.
      </p>
      <p>
        For customer-arranged Porter delivery, the customer should also raise
        the delivery issue through the Porter booking because Pride Circuit does
        not control that booking or collect its fee.
      </p>
    </>,
  ],
  [
    '10. Damaged, Missing, or Incorrect Products',
    <>
      <p>
        Report a damaged package, damaged or defective product, missing item,
        incorrect product, or incorrect quantity within <strong>48 hours of
        delivery or collection</strong>.
      </p>
      <p>Include, where relevant:</p>
      <ul>
        <li>The order number and affected product.</li>
        <li>A clear description of the issue.</li>
        <li>Photographs or video of the package, shipping label, product, serial or model label, and contents.</li>
        <li>The delivery or Porter reference and available tracking information.</li>
      </ul>
      <p>
        Keep the product, packaging, accessories, and labels until the review is
        complete. Do not return a product without receiving return instructions.
        Eligibility and resolution are governed by the{' '}
        <a href="/#refund-and-cancellation-policy">Refund &amp; Cancellation Policy</a>.
      </p>
    </>,
  ],
  [
    '11. Delivery Charges and Refunds',
    <>
      <p>
        Office Pickup has no delivery charge. Porter charges are paid by the
        customer directly to Porter and are not collected by Pride Circuit.
        Express Delivery is charged and taxed as described above and itemised in
        the checkout total.
      </p>
      <p>
        Whether an outbound delivery charge or delivery GST is refundable
        depends on the reason for cancellation, return, failed delivery, or
        order issue and the applicable legal requirements. See the{' '}
        <a href="/#refund-and-cancellation-policy">Refund &amp; Cancellation Policy</a>{' '}
        for the applicable treatment.
      </p>
    </>,
  ],
  [
    '12. Support and Policy Updates',
    <>
      <p><strong>Effective date:</strong> October 22, 2026</p>
      <p>
        For pickup, dispatch, tracking, or delivery assistance, email{' '}
        <a href="mailto:Support@pridecircuit.in">Support@pridecircuit.in</a>{' '}
        or call <a href="tel:8574859658">8574859658</a>. Include the order
        number and relevant delivery details.
      </p>
      <p>
        We may update this policy when fulfilment methods, charges, tax rules,
        service arrangements, or legal requirements change. The revised policy
        will be published on this page with an updated effective date. The
        fulfilment terms confirmed for an existing order will continue to apply
        unless a change is required by law or agreed with the customer.
      </p>
    </>,
  ],
]

export default function ShippingAndDeliveryPolicy({ onBack }) {
  useEffect(() => {
    const previousTitle = document.title
    const descriptionMeta = document.querySelector('meta[name="description"]')
    const previousDescription = descriptionMeta?.getAttribute('content')

    document.title = pageTitle
    descriptionMeta?.setAttribute('content', pageDescription)

    return () => {
      document.title = previousTitle
      if (descriptionMeta && previousDescription !== null) {
        descriptionMeta.setAttribute('content', previousDescription)
      }
    }
  }, [])

  return (
    <LegalPageLayout
      title="Shipping & Delivery Policy"
      description="Office pickup, customer-arranged Porter pickup, Express Delivery charges, fulfilment, tracking, and delivery support for Pride Circuit orders."
      updatedAt="October 22, 2026"
      sections={sections}
      onBack={onBack}
      icon={Truck}
      eyebrow="Shipping & delivery"
    />
  )
}
