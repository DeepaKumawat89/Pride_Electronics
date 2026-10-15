import { Truck } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const sections = [
  [
    '1. Where We Deliver',
    <>
      <p>
        Pride Electronics delivers to serviceable locations within India.
        Serviceability depends on the destination PIN code, product, shipment
        size, courier network, and applicable legal or transport restrictions.
      </p>
      <p>
        Enter a complete delivery address during checkout. Acceptance of an
        order does not guarantee that every courier can serve every PIN code.
        We will contact you if the selected address cannot be serviced.
      </p>
    </>,
  ],
  [
    '2. Order Processing',
    <>
      <p>
        Orders are generally processed within 1–2 business days after successful
        payment verification and order confirmation. Cash on Delivery orders,
        where offered, may require additional confirmation.
      </p>
      <p>
        Processing includes payment review, inventory confirmation, quality
        checks, packing, and handover preparation. Processing may take longer
        during public holidays, promotions, high-demand periods, inventory
        checks, or exceptional operational disruption.
      </p>
    </>,
  ],
  [
    '3. Estimated Delivery Time',
    <>
      <p>
        Standard delivery is generally estimated at 3–7 business days after
        dispatch. If express delivery is offered for the order and destination,
        its separate estimate and charge will be shown during checkout.
      </p>
      <p>
        The order summary may show an estimated delivery date based on the
        selected service. Estimates are not guarantees and begin after dispatch,
        not when the order is placed.
      </p>
    </>,
  ],
  [
    '4. Shipping Charges',
    <>
      <p>
        Applicable shipping charges and any free-shipping eligibility are shown
        before order confirmation. Charges may depend on order value, delivery
        speed, product size or weight, destination, or a promotional offer.
      </p>
      <p>
        Additional charges will not be added after confirmation without your
        agreement. Refund treatment for shipping charges is described in our
        Refund &amp; Cancellation Policy.
      </p>
    </>,
  ],
  [
    '5. Delivery Address and Contact Information',
    <>
      <p>Please provide:</p>
      <ul>
        <li>The recipient's full name and reachable phone number.</li>
        <li>House, flat, building, street, locality, city, state, and six-digit PIN code.</li>
        <li>A useful landmark where needed for successful delivery.</li>
      </ul>
      <p>
        Review the address before placing the order. Contact support immediately
        if a correction is needed. We cannot guarantee an address change after
        packing or dispatch, and a change may affect serviceability or delivery
        time.
      </p>
    </>,
  ],
  [
    '6. Dispatch and Tracking',
    <>
      <p>
        When tracking is available, the courier name, tracking number, or
        tracking link may be provided through your account, registered email,
        phone number, or another order communication channel.
      </p>
      <p>
        Tracking information can take time to appear after the shipping label is
        created. A label or tracking number does not always mean the parcel has
        already been collected by the courier.
      </p>
    </>,
  ],
  [
    '7. Delivery Attempts',
    <>
      <p>
        The courier may contact the recipient or make more than one delivery
        attempt according to its operating policy. Please ensure that someone is
        available to receive the parcel and provide any permitted delivery
        confirmation.
      </p>
      <p>
        If delivery fails because the address or phone number is incorrect, the
        recipient is unavailable, or delivery is refused, the parcel may be
        returned to us. Re-dispatch may require payment of an additional
        shipping charge. Any refund will be handled under our Refund &amp;
        Cancellation Policy.
      </p>
    </>,
  ],
  [
    '8. Delivery Verification',
    <>
      <p>
        A courier may request a signature, delivery code, identity confirmation,
        or other proof of receipt. Share a delivery code only when you are ready
        to receive the parcel from the courier. Do not share payment PINs,
        banking passwords, or one-time passwords with a courier or our staff.
      </p>
    </>,
  ],
  [
    '9. Damaged or Tampered Packages',
    <>
      <p>
        Inspect the outer package before accepting it where reasonably possible.
        If it is visibly open, severely damaged, or tampered with, note the
        condition with the courier, take clear photos, and contact us promptly.
      </p>
      <p>
        Report transit damage within 48 hours of delivery. Preserve the product,
        packaging, shipping label, accessories, and any available unboxing
        evidence until the review is complete.
      </p>
    </>,
  ],
  [
    '10. Missing or Incorrect Items',
    <p>
      Report a missing item, incorrect product, or incorrect quantity within 48
      hours of delivery. Include your order number and clear photos or video of
      the parcel, shipping label, packaging, and contents where requested. We
      will review the fulfilment and shipment records before offering a
      resolution.
    </p>,
  ],
  [
    '11. Delivery Delays',
    <>
      <p>Delivery may be delayed by circumstances including:</p>
      <ul>
        <li>Remote-area routing or courier-capacity limitations.</li>
        <li>Public holidays, severe weather, natural disasters, or transport disruption.</li>
        <li>Government restrictions, security checks, strikes, or local emergencies.</li>
        <li>Incorrect addresses, failed delivery attempts, or recipient unavailability.</li>
        <li>Inventory verification, high demand, or unexpected technical issues.</li>
      </ul>
      <p>
        If a material delay occurs, contact support with your order number. We
        will review the latest available courier information and the options
        applicable to the order.
      </p>
    </>,
  ],
  [
    '12. Split Shipments',
    <p>
      Products in one order may be shipped separately because of inventory,
      packaging, safety, or courier requirements. Separate parcels may have
      different tracking numbers and delivery dates. Unless disclosed at
      checkout, you will not be charged an additional shipping fee solely
      because we split an order.
    </p>,
  ],
  [
    '13. Order Pickup',
    <p>
      Store or fulfilment-centre pickup is available only when it is expressly
      offered during checkout or confirmed by our support team. Do not travel to
      a pickup location until you receive confirmation that the order is ready,
      together with pickup instructions and any required verification details.
    </p>,
  ],
  [
    '14. Undeliverable or Lost Shipments',
    <>
      <p>
        If tracking indicates that a parcel is lost, returned, or delivered but
        you have not received it, contact us promptly. We may ask you to confirm
        the address, check with household members or building staff, and provide
        a written statement for the courier investigation.
      </p>
      <p>
        A replacement or refund for a verified lost shipment is subject to the
        investigation outcome and product availability. We will not require you
        to pay again for a verified loss attributable to us or the authorized
        courier.
      </p>
    </>,
  ],
  [
    '15. Contact Us',
    <>
      <p><strong>Pride Electronics</strong></p>
      <p>Website: pridecircuit.in</p>
      <p>Email: support@pridecircuit.in</p>
      <p>
        Use the subject &quot;Shipping&quot; or &quot;Delivery&quot; and include your order
        number and tracking number, if available. Never send passwords, PINs,
        one-time passwords, or complete card details.
      </p>
    </>,
  ],
]

export default function ShippingAndDeliveryPolicy({ onBack }) {
  return (
    <LegalPageLayout
      title="Shipping & Delivery Policy"
      description="Processing, dispatch, tracking, delivery estimates, failed deliveries, and shipment issue reporting for pridecircuit.in orders."
      updatedAt="October 15, 2026"
      sections={sections}
      onBack={onBack}
      icon={Truck}
      eyebrow="Shipping & delivery"
    />
  )
}
