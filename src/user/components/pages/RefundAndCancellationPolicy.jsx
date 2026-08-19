import { RefreshCcw } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const sections = [
  ["1. Order Cancellation", <>
    <p>Customers can request cancellation before their order has been shipped.</p>
    <p>To request cancellation, contact us as soon as possible with your order number, customer name, registered email address, phone number, and reason for cancellation.</p>
    <p>Once an order has been shipped, cancellation may no longer be possible.</p>
  </>],
  ["2. When We May Cancel an Order", <>
    <p>Pride Electronics may cancel an order in situations including:</p>
    <ul><li>Product becoming unavailable.</li><li>Incorrect product pricing or information.</li><li>Payment failure.</li><li>Suspicious or fraudulent activity.</li><li>Incorrect or incomplete shipping information.</li><li>Technical errors.</li><li>Other circumstances that prevent successful order fulfillment.</li></ul>
    <p>If payment has already been received for an order cancelled by us, an eligible refund will be initiated.</p>
  </>],
  ["3. Return Eligibility", <>
    <p>Eligible products may be returned within <strong>7 days of delivery</strong>.</p>
    <p>To qualify for a return:</p>
    <ul><li>The product should generally be unused.</li><li>The product should be in its original condition.</li><li>Original packaging should be retained where applicable.</li><li>Accessories and included components should be returned.</li><li>Proof of purchase/order information should be available.</li></ul>
    <p>Some products may have different return conditions depending on their nature, manufacturer warranty, or product-specific terms.</p>
  </>],
  ["4. Non-Returnable Products", <>
    <p>Certain products may not be eligible for return where applicable, including products that:</p>
    <ul><li>Have been damaged by misuse.</li><li>Have been modified or altered by the customer.</li><li>Are missing essential components.</li><li>Are returned without required accessories.</li><li>Have been damaged after delivery due to improper handling.</li></ul>
  </>],
  ["5. Damaged Products", <>
    <p>If you receive a damaged product, contact us within <strong>48 hours of delivery</strong>.</p>
    <p>Please provide the order number, photos of the product, photos of the packaging, and a description of the damage.</p>
    <p>Our team will review the request and determine the appropriate resolution.</p>
  </>],
  ["6. Incorrect Product", <>
    <p>If you receive a product different from the one you ordered, contact us within <strong>48 hours of delivery</strong>.</p>
    <p>After verification, we may provide an appropriate solution such as replacement, return, or refund depending on product availability and the circumstances of the order.</p>
  </>],
  ["7. Refund Processing", <p>Once a cancellation or return is approved, the refund will generally be processed within <strong>5–7 business days</strong>. The actual time for the amount to appear in the customer's account may depend on the payment provider or financial institution.</p>],
  ["8. Refund Method", <p>Where possible, refunds will be processed through the original payment method used for the transaction.</p>],
  ["9. Shipping Charges", <p>Refund treatment for shipping charges may depend on the reason for the return or cancellation. Where a product is returned because of an incorrect, damaged, or defective item attributable to Pride Electronics, applicable shipping charges may be considered for refund according to the circumstances.</p>],
  ["10. Refund Not Received", <>
    <p>If your refund has been approved but you have not received it within the expected period, please contact us with:</p>
    <ul><li>Order number</li><li>Refund reference, if available</li><li>Payment method</li><li>Date of refund approval</li></ul>
  </>],
  ["11. How to Request a Return or Refund", <>
    <p>Contact our support team:</p>
    <p><strong>Email:</strong> support@prideelectronics.example</p>
    <p><strong>Phone:</strong> +91 98765 43210</p>
    <p>Please include your order number and a description of the issue.</p>
  </>],
  ["12. Policy Changes", <p>Pride Electronics may update this Refund &amp; Cancellation Policy from time to time. Changes will be published on this page with an updated “Last Updated” date.</p>],
  ["13. Contact Information", <>
    <p><strong>Pride Electronics</strong></p>
    <p>123 Electronics Market, MG Road, Pune, Maharashtra, India – 411001</p>
    <p>Email: support@prideelectronics.example</p>
    <p>Phone: +91 98765 43210</p>
    <p>Business Hours: Monday–Saturday, 10:00 AM–6:00 PM</p>
  </>],
];

export default function RefundAndCancellationPolicy({ onBack }) {
  return (
    <LegalPageLayout
      title="Refund & Cancellation Policy"
      description="Understand order cancellations, eligible returns, refund timelines, and how to request support."
      updatedAt="August 19, 2026"
      sections={sections}
      onBack={onBack}
      icon={RefreshCcw}
      eyebrow="Returns & refunds"
    />
  )
}
