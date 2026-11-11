import { useEffect } from 'react'
import { Truck } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const pageTitle = 'Shipping & Delivery Policy | Pride Circuit'
const pageDescription = 'Review Pride Circuit processing times, Standard and Express Delivery, office pickup, customer-arranged Porter pickup, charges, estimates, and delivery support.'

const sections = [
  ['1. Scope', <><p>This policy explains the fulfilment methods available for purchases from <strong>Pride Circuit</strong>, operated by <strong>Pride Automation</strong>.</p><p>Available methods, base charges, applicable GST, and the final payable amount are shown at checkout. Delivery GST is calculated using the store&apos;s configured tax treatment and is not assumed at a fixed rate in this policy.</p></>],
  ['2. Processing Time', <><p>Orders normally require <strong>1–2 business days</strong> for inventory confirmation, order review, picking, packing, and preparation for dispatch or collection.</p><p>The delivery estimates below begin after dispatch. Office Pickup and Porter collection begin after Pride Circuit sends a readiness notice.</p></>],
  ['3. Standard Delivery', <><p>Standard Delivery is enabled at a base charge of <strong>₹80 plus applicable GST</strong>. The estimated delivery time is <strong>3–5 business days after dispatch</strong>.</p><p>Estimates may be affected by destination serviceability, courier operations, holidays, weather, address accuracy, or circumstances outside reasonable control.</p></>],
  ['4. Express Delivery — Pune Only', <><p>Express Delivery is enabled at a base charge of <strong>₹100 plus applicable GST</strong> and is available only for delivery addresses whose city is <strong>Pune</strong>.</p><p>The estimated delivery time is <strong>1–2 business days after dispatch</strong>. Checkout verifies Pune eligibility from the selected address before the order can be placed.</p></>],
  ['5. Office Pickup', <><p>Office Pickup has no delivery charge. Orders are prepared within <strong>12 hours</strong> of confirmation and may be collected <strong>Monday–Saturday, 10:00 AM–6:00 PM</strong> from:</p><p><strong>Office No. 237, 2nd Floor, XION Mall, Hinjawadi, Pune – 411057</strong></p><p>Do not travel until Pride Circuit confirms that the order is ready. Bring the order number and any reasonable order-holder verification requested for a safe handover.</p></>],
  ['6. Porter — Customer Booked and Paid', <><p>If Porter is selected, the <strong>customer books Porter and pays all Porter charges directly to Porter</strong>. Pride Circuit does not collect a Porter fee and Porter is not represented as a free delivery service.</p><p>Wait for the readiness notice before booking. The customer is responsible for the booking details, suitable vehicle and handling method, tracking, and payment under Porter&apos;s separate terms.</p></>],
  ['7. Dispatch, Tracking, and Estimates', <><p>For Standard or Express Delivery, dispatch occurs when the prepared order is handed over for delivery. When available, tracking details may appear in the customer account or be sent to the registered email address or phone number.</p><p>All published readiness and delivery durations are estimates, not guarantees. Pride Circuit will use reasonable efforts to communicate a material known delay.</p></>],
  ['8. Customer Responsibilities', <><p>Customers must provide an accurate recipient name, reachable phone number, complete address, city, state, and six-digit PIN code; review the selected method, charge, GST, and total; and respond to reasonable coordination requests.</p><p>Wait for readiness confirmation before Office Pickup or Porter. Contact support promptly if an address correction is needed; changes may not be possible after preparation or dispatch.</p></>],
  ['9. Delivery Problems', <><p>For a delayed, failed, incorrect, or missing arranged delivery, contact support with the order number and available tracking information. For customer-arranged Porter delivery, also raise the issue through the Porter booking.</p><p>Report damaged, missing, defective, or incorrect products within <strong>48 hours of delivery or collection</strong> and keep the product, packaging, labels, and accessories while the issue is reviewed. Resolution is governed by the <a href="/#refund-and-cancellation-policy">Refund &amp; Cancellation Policy</a>.</p></>],
  ['10. Charges, GST, and Refunds', <><p>Standard Delivery is ₹80 plus applicable GST. Pune Express Delivery is ₹100 plus applicable GST. Office Pickup has no delivery charge. Porter is booked and paid for directly by the customer and is not included in the website total.</p><p>Whether an outbound delivery charge or its GST is refundable depends on the cause, product status, applicable policy, and legal requirements.</p></>],
  ['11. Support and Updates', <><p><strong>Effective date:</strong> November 11, 2026</p><p>For assistance, email <a href="mailto:support@pridecircuit.in">support@pridecircuit.in</a> or call <a href="tel:9607126969">9607126969</a>. Include the order number and relevant delivery details.</p><p>This policy may be updated when fulfilment methods, charges, tax rules, service arrangements, or legal requirements change.</p></>],
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
      if (descriptionMeta && previousDescription !== null) descriptionMeta.setAttribute('content', previousDescription)
    }
  }, [])

  return <LegalPageLayout title="Shipping & Delivery Policy" description="Processing, delivery methods, charges, estimates, pickup, Porter arrangements, and support for Pride Circuit orders." updatedAt="November 11, 2026" sections={sections} onBack={onBack} icon={Truck} eyebrow="Shipping & delivery" hideIntro hideSectionNavigation breadcrumbLabel="Shipping & Delivery Policy" />
}
