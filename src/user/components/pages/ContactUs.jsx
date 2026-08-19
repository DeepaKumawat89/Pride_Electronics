import { Headphones } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const sections = [
  [
    '1. Get in Touch',
    <p key="introduction">
      We&apos;re here to help with questions about products, orders, payments,
      shipping, returns, refunds, and other website-related issues.
    </p>,
  ],
  [
    '2. Contact Details',
    <div key="contact-details" className="space-y-3">
      <p><strong>Pride Electronics</strong></p>
      <p>123 Electronics Market, MG Road, Pune, Maharashtra, India – 411001</p>
      <p><strong>Email:</strong>{' '}<a href="mailto:support@prideelectronics.example">support@prideelectronics.example</a></p>
      <p><strong>Phone:</strong>{' '}<a href="tel:+919876543210">+91 98765 43210</a></p>
      <p><strong>Business Hours:</strong> Monday–Saturday, 10:00 AM–6:00 PM</p>
    </div>,
  ],
  [
    '3. Customer Support',
    <div key="customer-support" className="space-y-3">
      <p>For faster assistance, please include your order number when contacting us about an existing order. Our team can help with:</p>
      <ul>
        <li>Product information and availability</li>
        <li>Order status and payment issues</li>
        <li>Shipping and delivery</li>
        <li>Order cancellation</li>
        <li>Returns and refunds</li>
        <li>Damaged or incorrect products</li>
        <li>Account-related issues</li>
      </ul>
    </div>,
  ],
  [
    '4. Response Time',
    <p key="response-time">We generally respond to customer queries during our business hours. For order-related issues, please provide sufficient information so that we can verify and assist with your request.</p>,
  ],
  [
    '5. Important Information',
    <p key="important-information">For returns, refunds, cancellations, and shipping-related queries, please also review the relevant policies available on our website.</p>,
  ],
]

export default function ContactUs({ onBack }) {
  return (
    <LegalPageLayout
      title="Contact Us"
      description="Our support team is here to help with products, orders, payments, delivery, returns, and your account."
      sections={sections}
      onBack={onBack}
      icon={Headphones}
      eyebrow="Customer support"
    />
  )
}
