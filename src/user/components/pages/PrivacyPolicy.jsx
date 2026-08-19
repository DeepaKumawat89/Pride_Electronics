import { ShieldCheck } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const sections = [
  ["1. Information We Collect", <>
    <p>When you use our website, we may collect information such as:</p>
    <h3 className="mt-4 font-semibold text-gray-900">Personal Information</h3>
    <ul><li>Name</li><li>Email address</li><li>Phone number</li><li>Billing address</li><li>Shipping address</li><li>Account information</li></ul>
    <h3 className="mt-4 font-semibold text-gray-900">Order Information</h3>
    <ul><li>Products purchased</li><li>Order number</li><li>Order amount</li><li>Order status</li><li>Delivery information</li><li>Return and refund information</li></ul>
    <h3 className="mt-4 font-semibold text-gray-900">Technical Information</h3>
    <ul><li>IP address</li><li>Browser type</li><li>Device information</li><li>Operating system</li><li>Website usage information</li><li>Cookies and similar technologies</li></ul>
  </>],
  ["2. How We Use Your Information", <>
    <p>We may use your information to:</p>
    <ul><li>Create and manage your account.</li><li>Process orders and payments.</li><li>Deliver products.</li><li>Provide customer support.</li><li>Process returns and refunds.</li><li>Send order-related notifications.</li><li>Improve our website and services.</li><li>Prevent fraud and unauthorized activities.</li><li>Maintain website security.</li><li>Comply with applicable legal requirements.</li></ul>
  </>],
  ["3. Payment Information", <>
    <p>Payments may be processed through third-party payment providers such as Razorpay.</p>
    <p>Your payment may be processed directly by the applicable payment service provider.</p>
    <p>Pride Electronics does not intentionally store complete debit card or credit card numbers on its own systems.</p>
    <p>Payment providers may collect and process payment information according to their own privacy policies and terms.</p>
  </>],
  ["4. Firebase and Website Services", <>
    <p>Our website may use services such as Firebase for functionality including:</p>
    <ul><li>User authentication</li><li>Database services</li><li>Cloud storage</li><li>Website functionality</li><li>Security and infrastructure</li></ul>
    <p>Information processed through these services is handled according to the applicable service configuration and policies.</p>
  </>],
  ["5. Cookies", <>
    <p>We may use cookies or similar technologies to:</p>
    <ul><li>Keep users signed in.</li><li>Remember preferences.</li><li>Maintain shopping cart information.</li><li>Improve website functionality.</li><li>Understand website usage.</li></ul>
    <p>You may be able to manage cookies through your browser settings.</p>
  </>],
  ["6. Sharing of Information", <>
    <p>We may share necessary information with trusted third parties when required to provide our services.</p>
    <ul><li>Payment service providers</li><li>Shipping and courier partners</li><li>Technology and hosting providers</li><li>Customer-support service providers</li><li>Legal or regulatory authorities where required</li></ul>
    <p>We do not intend to sell your personal information to third parties.</p>
  </>],
  ["7. Data Security", <p>We use reasonable technical and organizational measures to protect information from unauthorized access, alteration, disclosure, or destruction. However, no online system can be guaranteed to be completely secure.</p>],
  ["8. Data Retention", <>
    <p>We may retain personal and transaction information for as long as reasonably necessary to:</p>
    <ul><li>Provide our services.</li><li>Maintain business records.</li><li>Resolve disputes.</li><li>Prevent fraud.</li><li>Comply with applicable legal obligations.</li></ul>
  </>],
  ["9. Your Information", <>
    <p>You may contact us to:</p>
    <ul><li>Request information about the personal information we hold.</li><li>Request correction of inaccurate information.</li><li>Request account-related assistance.</li><li>Ask questions regarding our privacy practices.</li></ul>
    <p>Certain requests may be subject to applicable legal requirements.</p>
  </>],
  ["10. Children's Privacy", <p>Our website is not intended for children who are unable to legally enter into transactions. We do not knowingly request unnecessary personal information from children.</p>],
  ["11. Third-Party Websites", <p>Our website may contain links to third-party websites or services. Pride Electronics is not responsible for the privacy practices or content of third-party websites. We recommend reviewing their privacy policies before providing personal information.</p>],
  ["12. Changes to This Privacy Policy", <p>We may update this Privacy Policy periodically. Any changes will be published on this page with an updated “Last Updated” date.</p>],
  ["13. Contact Us", <>
    <p><strong>Pride Electronics</strong></p>
    <p>123 Electronics Market, MG Road, Pune, Maharashtra, India – 411001</p>
    <p>Email: support@prideelectronics.example</p>
    <p>Phone: +91 98765 43210</p>
    <p>Business Hours: Monday–Saturday, 10:00 AM–6:00 PM</p>
  </>],
];

export default function PrivacyPolicy({ onBack }) {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="We respect your privacy and are committed to protecting the information you provide while using our website."
      updatedAt="August 19, 2026"
      sections={sections}
      onBack={onBack}
      icon={ShieldCheck}
      eyebrow="Privacy & data"
    />
  )
}
