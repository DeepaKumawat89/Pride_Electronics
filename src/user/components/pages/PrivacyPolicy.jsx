import { useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const pageTitle = 'Privacy Policy | Pride Circuit'
const pageDescription = 'Learn how Pride Circuit, operated by Pride Automation, collects, uses, stores, shares, and protects personal data when you use pridecircuit.in.'

const sections = [
  [
    '1. Scope and Who We Are',
    <>
      <p>
        This Privacy Policy explains how <strong>Pride Circuit</strong>, operated
        by <strong>Pride Automation</strong> (&quot;Pride Circuit&quot;,
        &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), handles personal data
        when you visit pridecircuit.in, create an account, place an order, make
        a payment, submit content, or contact us.
      </p>
      <p>
        We process personal data for lawful purposes connected with operating
        the store and providing its services. Where applicable law requires
        consent, we will request it through the relevant collection point. This
        policy should be read together with the website&apos;s Terms &amp;
        Conditions and customer policies.
      </p>
    </>,
  ],
  [
    '2. Personal Data We Collect',
    <>
      <p>Depending on the features you use, we collect or process:</p>
      <ul>
        <li><strong>Account data:</strong> name, email address, mobile number, email-verification status, login provider, profile photograph, date of birth, and gender when voluntarily added.</li>
        <li><strong>Authentication data:</strong> Firebase account identifiers and authentication/session information. Passwords are handled by Firebase Authentication and are not stored in Pride Circuit&apos;s Firestore records.</li>
        <li><strong>Order and delivery data:</strong> billing and shipping names, phone numbers, addresses, cart and wishlist items, products, quantities, prices, coupons, taxes, order status, and delivery details.</li>
        <li><strong>Invoice data:</strong> business name and GST-related information when supplied for an invoice.</li>
        <li><strong>Payment data:</strong> payment method category, gateway order and transaction identifiers, amount, payment status, refund status, and reconciliation information.</li>
        <li><strong>Saved payment preferences:</strong> UPI ID or cardholder name, card type, last four digits, and expiry when you choose to save them. The website does not save complete card numbers or card security codes.</li>
        <li><strong>Customer content:</strong> ratings, reviews, feedback, return reasons, support details, and photographs uploaded for a profile or return request.</li>
        <li><strong>Technical and usage data:</strong> IP address, browser and device information, pages or features used, referring information, diagnostics, analytics events, security signals, and similar log data collected by the website and its providers.</li>
      </ul>
      <p>
        Please provide only information that is relevant to the requested
        service and do not send passwords, PINs, one-time passwords, or complete
        payment-card details to customer support.
      </p>
    </>,
  ],
  [
    '3. How We Use Personal Data',
    <>
      <p>We use personal data to:</p>
      <ul>
        <li>Create, authenticate, verify, secure, and maintain customer accounts.</li>
        <li>Maintain carts, wishlists, saved addresses, and selected account preferences.</li>
        <li>Show products, validate stock, calculate prices, taxes, shipping charges, and coupons, and process orders.</li>
        <li>Initiate, verify, reconcile, capture, or refund payments and help detect fraud or payment abuse.</li>
        <li>Prepare invoices, arrange fulfilment, and handle delivery, cancellation, return, replacement, refund, and support requests.</li>
        <li>Display and administer customer ratings, reviews, and feedback.</li>
        <li>Operate, troubleshoot, secure, measure, and improve the website and its services.</li>
        <li>Maintain business, accounting, tax, security, dispute, and compliance records.</li>
        <li>Send account, verification, password-reset, order, payment, and other service communications.</li>
      </ul>
    </>,
  ],
  [
    '4. Firebase and Google Services',
    <>
      <p>The website uses Google Firebase services, including:</p>
      <ul>
        <li><strong>Firebase Authentication</strong> for email-and-password accounts, email verification, password resets, persistent sign-in, and optional Google sign-in.</li>
        <li><strong>Cloud Firestore</strong> for customer profiles, account preferences, carts, wishlists, addresses, orders, invoices, returns, reviews, and related store records.</li>
        <li><strong>Cloud Functions for Firebase</strong> for protected server-side operations such as account updates, pricing, order placement, inventory handling, and payment verification.</li>
        <li><strong>Cloud Storage for Firebase</strong> for uploaded profile photographs and return-request images.</li>
        <li><strong>Firebase Hosting</strong> to deliver the website.</li>
        <li><strong>Google Analytics for Firebase</strong> to collect usage and performance information.</li>
        <li><strong>Firebase App Check with reCAPTCHA Enterprise</strong>, when configured, to help distinguish legitimate requests from abuse and protect backend resources.</li>
      </ul>
      <p>
        If you choose Google sign-in, Google provides Firebase with information
        associated with that sign-in, such as your account identifier, name,
        email address, and profile photograph, according to your Google account
        settings and Google&apos;s privacy terms.
      </p>
    </>,
  ],
  [
    '5. Payments',
    <>
      <p>
        The website&apos;s currently implemented online checkout uses
        <strong> Razorpay</strong>. Razorpay and participating banks, card
        networks, UPI services, wallet providers, or other payment participants
        may process the information required to create, authenticate, complete,
        verify, reconcile, or refund a transaction.
      </p>
      <p>
        Pride Circuit receives and retains transaction references and status
        information needed to connect a payment to an order. Complete card
        numbers, card security codes, UPI PINs, online-banking passwords, and
        one-time passwords entered in the payment interface are handled by the
        payment provider and are not intentionally collected or stored by Pride
        Circuit.
      </p>
    </>,
  ],
  [
    '6. Cookies, Browser Storage, and Analytics',
    <>
      <p>
        Firebase, Google Analytics, Google sign-in, App Check, Razorpay, and
        related services may use cookies, browser storage, device identifiers,
        or similar technologies for authentication, security, fraud prevention,
        checkout, analytics, and service operation.
      </p>
      <p>
        Pride Circuit also uses browser session storage for limited temporary
        information such as intended navigation, checkout selections, payment
        confirmation state, and order-success state. Firebase Authentication
        uses browser persistence to keep signed-in customers authenticated.
      </p>
      <p>
        You can restrict cookies or clear browser storage through your browser.
        Blocking storage required for authentication, fraud protection, or
        checkout may prevent parts of the website from working correctly.
      </p>
    </>,
  ],
  [
    '7. When We Share Personal Data',
    <>
      <p>We may share personal data only as reasonably necessary with:</p>
      <ul>
        <li>Google and Firebase for authentication, hosting, databases, functions, storage, analytics, and service protection.</li>
        <li>Razorpay and payment participants for payment processing, verification, reconciliation, disputes, and refunds.</li>
        <li>Shipping, courier, and fulfilment providers for dispatch, delivery, tracking, returns, and pickup.</li>
        <li>Service providers supporting communications, infrastructure, security, accounting, or professional advice.</li>
        <li>Government, regulatory, judicial, law-enforcement, or tax authorities when disclosure is legally required.</li>
        <li>A successor or authorised participant in a lawful restructuring, financing, sale, or transfer of the business, subject to applicable safeguards.</li>
      </ul>
      <p>
        We do not claim to sell or rent customer personal data for monetary
        consideration. Third-party providers process information under their own
        terms, privacy policies, and legal obligations.
      </p>
    </>,
  ],
  [
    '8. Data Security',
    <>
      <p>
        We use reasonable technical and organisational measures intended to
        protect personal data. Depending on the service, these include Firebase
        Authentication, access-control rules, protected Cloud Functions,
        server-side price and payment verification, payment-signature checks,
        HTTPS connections, and App Check when configured.
      </p>
      <p>
        No internet transmission or storage system is completely secure. Keep
        your password and devices secure, sign out on shared devices, and notify
        us if you suspect unauthorised account activity.
      </p>
    </>,
  ],
  [
    '9. Data Retention',
    <>
      <p>
        We retain personal data for as long as needed for the purpose for which
        it was collected and for legitimate operational, accounting, tax,
        security, fraud-prevention, dispute-resolution, and legal requirements.
      </p>
      <ul>
        <li>Account and preference data may remain while an account is active or until a valid deletion request is completed.</li>
        <li>Orders, invoices, payments, refunds, returns, and related records may be retained for applicable tax, accounting, contractual, fraud-prevention, and dispute periods.</li>
        <li>Security, analytics, and technical logs may be retained according to operational need and provider settings.</li>
        <li>Backups and provider systems may retain residual copies for a limited period after deletion from active records.</li>
      </ul>
      <p>
        The website does not currently publish one fixed retention period for
        every record category. Data is deleted, anonymised, or restricted when
        it is no longer reasonably required, subject to legal obligations.
      </p>
    </>,
  ],
  [
    '10. Your Privacy Rights and Choices',
    <>
      <p>
        Subject to applicable Indian law and relevant exceptions, you may ask
        for information about the personal data being processed, correction or
        completion of inaccurate data, erasure of data no longer required,
        withdrawal of consent for consent-based processing, and review of a
        privacy grievance.
      </p>
      <p>
        You can update certain profile, address, and saved-payment-preference
        information through your account. For other requests, email{' '}
        <a href="mailto:Support@pridecircuit.in">Support@pridecircuit.in</a>{' '}
        with the subject &quot;Privacy Request&quot;. We may request reasonable
        information to verify your identity and protect the account before
        acting on a request.
      </p>
      <p>
        Withdrawal or deletion does not affect processing already lawfully
        completed. We may retain information required for invoices, completed
        transactions, refunds, fraud prevention, disputes, or compliance with
        law, and will explain an applicable limitation when responding.
      </p>
    </>,
  ],
  [
    '11. Account Deletion',
    <>
      <p>
        The website does not currently provide a self-service account-deletion
        control. To request deletion of your customer account and eligible
        personal data, email{' '}
        <a href="mailto:Support@pridecircuit.in">Support@pridecircuit.in</a>{' '}
        from the email address associated with the account using the subject
        &quot;Account Deletion Request&quot;.
      </p>
      <p>
        After identity verification, we will assess and process the request
        subject to records that must be retained for completed orders, invoices,
        taxes, payments, refunds, security, fraud prevention, disputes, or other
        legal obligations.
      </p>
    </>,
  ],
  [
    '12. Children',
    <p>
      Pride Circuit is not directed to children. A person under 18 should use
      the website only with the involvement and authorisation of a parent or
      lawful guardian. If you believe a child&apos;s personal data was provided
      without appropriate authorisation, contact us so we can review the matter
      and take action required by applicable law.
    </p>,
  ],
  [
    '13. Third-Party Services and Processing Locations',
    <>
      <p>
        The website may link to or use third-party services. Those providers
        have their own privacy terms and independently control some processing
        performed through their services.
      </p>
      <p>
        Firebase, Google, Razorpay, and other providers may process or store data
        in India or other locations where they or their service providers
        operate, subject to their service configuration, contractual terms, and
        applicable legal restrictions.
      </p>
    </>,
  ],
  [
    '14. Policy Updates',
    <p>
      We may update this Privacy Policy when our services, providers, data
      practices, or legal obligations change. The revised version will be
      published on this page with a new effective date. Where required, we will
      provide additional notice or seek consent for materially different
      processing.
    </p>,
  ],
  [
    '15. Privacy Contact',
    <>
      <p>
        Pride Circuit is operated by <strong>Pride Automation</strong>.
      </p>
      <p>
        For privacy questions, rights requests, account-deletion requests, or
        grievances, email{' '}
        <a href="mailto:Support@pridecircuit.in">Support@pridecircuit.in</a>.
      </p>
      <p>
        Include enough information to identify the relevant account or request,
        but do not include passwords, PINs, one-time passwords, or complete
        payment-card details.
      </p>
    </>,
  ],
]

export default function PrivacyPolicy({ onBack }) {
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
      title="Privacy Policy"
      description="How Pride Circuit, operated by Pride Automation, collects, uses, stores, shares, and protects personal data when you use pridecircuit.in."
      updatedAt="October 22, 2026"
      sections={sections}
      onBack={onBack}
      icon={ShieldCheck}
      eyebrow="Privacy & data"
      hideIntro
      hideSectionNavigation
      breadcrumbLabel="Privacy Policy"
    />
  )
}
