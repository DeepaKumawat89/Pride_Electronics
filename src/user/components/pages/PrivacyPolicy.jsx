import { ShieldCheck } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const sections = [
  [
    '1. Scope of This Privacy Policy',
    <>
      <p>
        This Privacy Policy explains how Pride Electronics collects, uses,
        stores, and shares personal information when you visit pridecircuit.in,
        create an account, place an order, contact customer support, or
        otherwise use our services.
      </p>
      <p>
        By using our website, you acknowledge the practices described in this
        policy. Where consent is required by applicable law, we will request it
        separately.
      </p>
    </>,
  ],
  [
    '2. Information We Collect',
    <>
      <p>Depending on how you use our website, we may collect:</p>
      <h3 className="mt-4 font-semibold text-gray-900">
        Account and contact information
      </h3>
      <ul>
        <li>Name, email address, and phone number.</li>
        <li>Account login and verification information.</li>
        <li>Billing, shipping, and saved-address details.</li>
        <li>Business name and GST details when you request a GST invoice.</li>
      </ul>
      <h3 className="mt-4 font-semibold text-gray-900">
        Order and support information
      </h3>
      <ul>
        <li>Products, quantities, prices, coupons, taxes, and order totals.</li>
        <li>Order, payment, delivery, cancellation, return, and refund status.</li>
        <li>Support messages and information submitted with a return request.</li>
        <li>Reviews, ratings, and other content you choose to submit.</li>
      </ul>
      <h3 className="mt-4 font-semibold text-gray-900">
        Device and usage information
      </h3>
      <ul>
        <li>IP address, browser, device, and operating-system information.</li>
        <li>Pages viewed, interactions, referring pages, and diagnostic data.</li>
        <li>Cookies, local storage, session storage, and similar technologies.</li>
      </ul>
      <p>
        Please do not send us sensitive personal information that is not needed
        to provide the requested service.
      </p>
    </>,
  ],
  [
    '3. How We Use Your Information',
    <>
      <p>We may use personal information to:</p>
      <ul>
        <li>Create, authenticate, secure, and manage customer accounts.</li>
        <li>Validate product availability, calculate prices, and process orders.</li>
        <li>Process payments and help prevent fraud or unauthorized activity.</li>
        <li>Prepare invoices and comply with applicable tax obligations.</li>
        <li>Arrange shipping, provide tracking, and complete delivery.</li>
        <li>Handle cancellations, returns, replacements, and refunds.</li>
        <li>Respond to product, order, payment, and account-related enquiries.</li>
        <li>Maintain and improve website performance, reliability, and security.</li>
        <li>Enforce our terms and comply with legal or regulatory obligations.</li>
        <li>
          Send promotional communications where you have opted in or where
          otherwise permitted by applicable law. You may opt out at any time.
        </li>
      </ul>
    </>,
  ],
  [
    '4. Payments and Cashfree',
    <>
      <p>
        Online payments may be processed by Cashfree Payments and its banking,
        payment-network, or processing partners. Cashfree may receive
        information necessary to initiate, authenticate, process, reconcile,
        or refund a transaction, including your name, contact details, order
        reference, payment amount, and payment-method information.
      </p>
      <p>
        Pride Electronics does not request or intentionally store complete card
        numbers, card security codes, UPI PINs, online-banking passwords, or
        one-time passwords. Payment credentials entered on a payment provider's
        interface are handled according to that provider's terms and privacy
        policy.
      </p>
      <p>
        We may retain gateway transaction identifiers, payment method type,
        payment status, refund status, and related reconciliation records for
        order support, accounting, fraud prevention, and legal compliance.
      </p>
    </>,
  ],
  [
    '5. Firebase and Other Service Providers',
    <>
      <p>
        We use service providers to operate the website and fulfil customer
        orders. These may include:
      </p>
      <ul>
        <li>Google Firebase for authentication, databases, cloud functions, storage, hosting, analytics, and security.</li>
        <li>Cashfree Payments and its partners for payment processing and refunds.</li>
        <li>Courier and logistics providers for shipment and delivery.</li>
        <li>Email, messaging, customer-support, security, and infrastructure providers.</li>
        <li>Professional advisers and government authorities where legally required.</li>
      </ul>
      <p>
        We share only the information reasonably necessary for the applicable
        service. Providers process information under their own terms and
        privacy obligations.
      </p>
    </>,
  ],
  [
    '6. Cookies and Similar Technologies',
    <>
      <p>We may use cookies and browser storage to:</p>
      <ul>
        <li>Keep you signed in and protect account sessions.</li>
        <li>Remember cart contents, checkout selections, and preferences.</li>
        <li>Measure website usage and diagnose technical problems.</li>
        <li>Help detect abuse, fraud, and unauthorized access.</li>
      </ul>
      <p>
        You can control cookies through your browser settings. Blocking
        essential storage may prevent account, cart, or checkout features from
        working correctly.
      </p>
    </>,
  ],
  [
    '7. When We Share Information',
    <>
      <p>We may share personal information:</p>
      <ul>
        <li>With payment providers to process, verify, or refund transactions.</li>
        <li>With delivery partners to fulfil and track orders.</li>
        <li>With vendors that host, secure, support, or analyse our services.</li>
        <li>When required to comply with law, legal process, or a lawful authority request.</li>
        <li>To investigate fraud, security incidents, or violations of our terms.</li>
        <li>As part of a lawful merger, acquisition, financing, or transfer of business assets.</li>
      </ul>
      <p>We do not sell or rent personal information for monetary consideration.</p>
    </>,
  ],
  [
    '8. Data Retention',
    <>
      <p>
        We retain information only for as long as reasonably necessary for the
        purposes described in this policy. Retention periods may vary according
        to the type of information and applicable legal requirements.
      </p>
      <ul>
        <li>Account information may be retained while your account remains active.</li>
        <li>Orders, invoices, payments, refunds, and tax records may be retained for legally required accounting and compliance periods.</li>
        <li>Support and security records may be retained while a request, dispute, fraud review, or legal matter remains relevant.</li>
        <li>Backups may retain information for a limited period after deletion from active systems.</li>
      </ul>
      <p>
        Information may be deleted, anonymized, or securely archived when it is
        no longer required.
      </p>
    </>,
  ],
  [
    '9. Data Security',
    <>
      <p>
        We use reasonable administrative, technical, and organizational
        safeguards intended to protect personal information against
        unauthorized access, alteration, disclosure, loss, or misuse. These may
        include access controls, authentication, encrypted connections, server-
        side payment verification, and activity monitoring.
      </p>
      <p>
        No website, transmission method, or storage system can be guaranteed to
        be completely secure. You are responsible for keeping your password and
        account access confidential.
      </p>
    </>,
  ],
  [
    '10. Your Choices and Requests',
    <>
      <p>Subject to applicable law, you may ask us to:</p>
      <ul>
        <li>Provide information about the personal information we hold about you.</li>
        <li>Correct inaccurate or incomplete account information.</li>
        <li>Delete your account or personal information where retention is not legally required.</li>
        <li>Withdraw consent for optional processing.</li>
        <li>Stop promotional communications.</li>
        <li>Address a privacy concern or complaint.</li>
      </ul>
      <p>
        We may need to verify your identity before completing a request. Some
        information may need to be retained for invoices, transactions, fraud
        prevention, disputes, or other legal obligations.
      </p>
    </>,
  ],
  [
    '11. Children\'s Privacy',
    <p>
      Our store is not intended for children who cannot legally enter into a
      purchase transaction. If you believe a child has provided personal
      information without appropriate authorization, please contact us so that
      we can review the matter.
    </p>,
  ],
  [
    '12. Third-Party Links and International Processing',
    <>
      <p>
        Our website may link to third-party websites or services. Their privacy
        practices are governed by their own policies, and we are not responsible
        for their independent content or practices.
      </p>
      <p>
        Some service providers may process or store information outside your
        state or country. Where applicable, we rely on appropriate contractual,
        organizational, or legal safeguards for such processing.
      </p>
    </>,
  ],
  [
    '13. Changes to This Privacy Policy',
    <p>
      We may update this Privacy Policy to reflect changes to our services,
      providers, or legal obligations. The revised policy will be published on
      this page with an updated "Last updated" date. Material changes may also
      be communicated through the website or your registered contact details
      where appropriate.
    </p>,
  ],
  [
    '14. Contact Us',
    <>
      <p><strong>Pride Electronics</strong></p>
      <p>Website: pridecircuit.in</p>
      <p>Email: support@pridecircuit.in</p>
      <p>
        Please use the subject "Privacy Request" and include enough information
        for us to identify and respond to your request. Do not include passwords,
        PINs, one-time passwords, or complete payment-card details.
      </p>
    </>,
  ],
]

export default function PrivacyPolicy({ onBack }) {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="How Pride Electronics collects, uses, shares, retains, and protects information when you use pridecircuit.in."
      updatedAt="October 15, 2026"
      sections={sections}
      onBack={onBack}
      icon={ShieldCheck}
      eyebrow="Privacy & data"
    />
  )
}
