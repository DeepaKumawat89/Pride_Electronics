import { Truck } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const sections = [
  ["1. Shipping Locations", <><p>Pride Electronics currently delivers products across India.</p><p>Delivery availability may depend on the serviceability of the customer's address and the courier network.</p></>],
  ["2. Order Processing", <><p>Orders are generally processed within <strong>1–2 business days</strong> after successful payment and order confirmation.</p><p>Orders may take longer to process during public holidays, promotional periods, high-demand periods, or unexpected operational issues.</p></>],
  ["3. Delivery Timeline", <><p>Orders are generally delivered within <strong>3–7 business days after dispatch</strong>.</p><p>Actual delivery time may vary depending on customer location, courier availability, weather, public holidays, remote-area delivery, and transportation conditions.</p></>],
  ["4. Shipping Charges", <p>Applicable shipping charges, if any, will be clearly displayed to the customer before completing the order. Where free shipping is available, the applicable eligibility conditions will be displayed on the website.</p>],
  ["5. Order Tracking", <p>Where tracking is available, customers may receive shipment tracking information through the registered email address, phone number, account, or other applicable communication channel.</p>],
  ["6. Delivery Address", <><p>Customers are responsible for providing accurate delivery information.</p><p>Please verify your full name, house/building number, street/locality, city, state, PIN code, and contact phone number before placing an order.</p><p>Pride Electronics may not be responsible for delays or failed deliveries caused by incorrect or incomplete addresses.</p></>],
  ["7. Failed Delivery", <p>If a delivery attempt is unsuccessful, the courier partner may attempt redelivery or contact the customer. Additional delivery attempts may depend on the courier's policies.</p>],
  ["8. Damaged Package", <><p>If the package appears visibly damaged at the time of delivery, customers should check the package before accepting it where possible, take photographs, contact Pride Electronics, and report the issue within <strong>48 hours of delivery</strong>.</p></>],
  ["9. Missing or Incorrect Products", <p>If an order is missing an item or contains an incorrect product, contact us within <strong>48 hours of delivery</strong>. Please provide your order number and relevant photographs so we can investigate the issue.</p>],
  ["10. Delivery Delays", <><p>Delivery timelines are estimates and are not guaranteed in circumstances outside our reasonable control.</p><ul><li>Severe weather</li><li>Natural disasters</li><li>Transportation disruptions</li><li>Courier delays</li><li>Public holidays</li><li>Government restrictions</li><li>Technical issues</li><li>Other unforeseen events</li></ul></>],
  ["11. Product Availability", <p>If a purchased product becomes unavailable after an order has been placed, we may contact the customer regarding available options. If the order cannot be fulfilled and payment has already been received, an eligible refund will be processed according to our Refund &amp; Cancellation Policy.</p>],
  ["12. Contact Us", <><p><strong>Pride Electronics</strong></p><p>123 Electronics Market, MG Road, Pune, Maharashtra, India – 411001</p><p>Email: support@prideelectronics.example</p><p>Phone: +91 98765 43210</p><p>Business Hours: Monday–Saturday, 10:00 AM–6:00 PM</p></>],
];

export default function ShippingAndDeliveryPolicy({ onBack }) {
  return (
    <LegalPageLayout
      title="Shipping & Delivery Policy"
      description="Learn how orders are processed, dispatched, tracked, and delivered across India."
      updatedAt="August 19, 2026"
      sections={sections}
      onBack={onBack}
      icon={Truck}
      eyebrow="Shipping & delivery"
    />
  )
}
