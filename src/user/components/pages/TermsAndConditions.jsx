import { ScrollText } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const sections = [
  {
    title: "1. About Pride Electronics",
    content: (
      <>
        <p>Pride Electronics is an e-commerce store offering electronic products and related accessories to customers in India.</p>
        <p><strong>Business Address:</strong> 123 Electronics Market, MG Road, Pune, Maharashtra, India – 411001</p>
        <p><strong>Email:</strong> support@prideelectronics.example</p>
        <p><strong>Phone:</strong> +91 98765 43210</p>
        <p><strong>Business Hours:</strong> Monday–Saturday, 10:00 AM–6:00 PM</p>
      </>
    ),
  },
  {
    title: "2. Use of Our Website",
    content: (
      <>
        <p>You agree to use our website only for lawful purposes.</p>
        <ul><li>Do not use the website for fraudulent or unlawful activities.</li><li>Do not attempt to gain unauthorized access to our systems.</li><li>Do not submit false or misleading information.</li><li>Do not interfere with the operation or security of the website.</li><li>Do not copy, reproduce, or distribute website content without permission.</li></ul>
      </>
    ),
  },
  {
    title: "3. User Accounts",
    content: (
      <>
        <p>Some features may require you to create an account.</p>
        <ul><li>Provide accurate information.</li><li>Maintain the confidentiality of your account credentials.</li><li>Keep your account information updated.</li><li>Do not share your account credentials with unauthorized persons.</li></ul>
        <p>If you believe your account has been accessed without authorization, please contact us immediately.</p>
      </>
    ),
  },
  {
    title: "4. Products and Product Information",
    content: (
      <>
        <p>We make reasonable efforts to ensure that product information, descriptions, images, specifications, and availability displayed on our website are accurate.</p>
        <ul><li>Product colors may vary slightly depending on your device display.</li><li>Product specifications may be updated by manufacturers.</li><li>Product availability may change without prior notice.</li><li>We reserve the right to correct errors in product information.</li></ul>
      </>
    ),
  },
  {
    title: "5. Product Pricing",
    content: (
      <>
        <p>All product prices displayed on the website will be clearly shown before checkout.</p>
        <ul><li>Selling price</li><li>Original/MRP price</li><li>Discount amount</li><li>Applicable taxes</li><li>Shipping charges</li><li>Final payable amount</li></ul>
        <p>The final amount payable by the customer will be displayed before payment is completed.</p>
      </>
    ),
  },
  {
    title: "6. Orders",
    content: (
      <>
        <p>When you place an order, you are submitting a request to purchase the selected products.</p>
        <p>An order may be cancelled by us in circumstances including product availability issues, pricing or product information errors, payment issues, suspicious or fraudulent transactions, or incorrect customer information.</p>
        <p>If we cancel an order after payment has been successfully received, an eligible refund will be processed according to our Refund & Cancellation Policy.</p>
      </>
    ),
  },
  {
    title: "7. Payments",
    content: (
      <>
        <p>Payments may be processed through third-party payment service providers such as Razorpay.</p>
        <p>We do not knowingly request or store your complete debit card, credit card, or banking credentials on our website.</p>
        <p>Payment processing is subject to the terms and policies of the applicable payment service provider.</p>
      </>
    ),
  },
  {
    title: "8. Order Cancellation",
    content: <p>Customers may request cancellation before their order has been shipped. Once an order has been shipped, cancellation may no longer be possible and the customer may need to follow our applicable return or replacement procedure.</p>,
  },
  {
    title: "9. Shipping and Delivery",
    content: (
      <>
        <p>We currently deliver products across India.</p>
        <p>Orders are generally processed within <strong>1–2 business days</strong> and delivered within <strong>3–7 business days after dispatch</strong>, depending on the delivery location and courier service.</p>
      </>
    ),
  },
  {
    title: "10. Returns and Refunds",
    content: (
      <>
        <p>Eligible products may be returned within <strong>7 days of delivery</strong>, subject to the applicable return conditions.</p>
        <p>Refunds for approved cancellations or returns are generally processed within <strong>5–7 business days</strong> after approval.</p>
      </>
    ),
  },
  {
    title: "11. Damaged or Incorrect Products",
    content: (
      <>
        <p>If you receive a damaged, defective, or incorrect product, please contact us within <strong>48 hours of delivery</strong>.</p>
        <p>We may request your order number, product details, photographs of the product and packaging, and a description of the issue.</p>
      </>
    ),
  },
  {
    title: "12. Intellectual Property",
    content: <p>All website content, including logos, brand names, product descriptions, images, graphics, website design, text, and software, is owned by or licensed to Pride Electronics unless otherwise stated. You may not reproduce, modify, distribute, or commercially use our content without prior written permission.</p>,
  },
  {
    title: "13. Third-Party Services",
    content: <p>Our website may use third-party services for payment processing, shipping, analytics, authentication, cloud storage, and website hosting. Third-party services may have their own terms and privacy policies.</p>,
  },
  {
    title: "14. Limitation of Liability",
    content: <p>Pride Electronics will make reasonable efforts to maintain the availability and accuracy of the website. However, we are not responsible for losses caused by circumstances beyond our reasonable control, including internet failures, courier delays, payment gateway failures, natural disasters, technical failures, or third-party service interruptions.</p>,
  },
  {
    title: "15. Changes to These Terms",
    content: <p>We may update these Terms & Conditions from time to time. Updated terms will be published on this page with a revised “Last Updated” date.</p>,
  },
  {
    title: "16. Contact Us",
    content: (
      <>
        <p><strong>Pride Electronics</strong></p>
        <p>123 Electronics Market, MG Road, Pune, Maharashtra, India – 411001</p>
        <p>Email: support@prideelectronics.example</p>
        <p>Phone: +91 98765 43210</p>
        <p>Business Hours: Monday–Saturday, 10:00 AM–6:00 PM</p>
      </>
    ),
  },
];

export default function TermsAndConditions({ onBack }) {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      description="These terms govern your access to the Pride Electronics website and purchases made through our store."
      updatedAt="August 19, 2026"
      sections={sections}
      onBack={onBack}
      icon={ScrollText}
      eyebrow="Store terms"
    />
  )
}
