import { useEffect } from 'react'
import { Headphones } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const pageTitle = 'Contact Pride Circuit | Customer Support & Business Details'
const pageDescription = 'Contact Pride Circuit for product, order, payment, delivery, return, refund, or account support. View Pride Automation business details and the Pune operational office and pickup location.'
const directionsUrl = 'https://www.google.com/maps/search/?api=1&query=Office%20No.%20237%2C%202nd%20Floor%2C%20XION%20Mall%2C%20Hinjewadi%2C%20Pune%2C%20Maharashtra%20411057'

const sections = [
  [
    '1. Contact Pride Circuit',
    <>
      <p>
        Pride Circuit provides customer support for product questions, orders,
        payments, shipping, cancellations, returns, refunds, invoices, and
        account-related assistance for purchases made through pridecircuit.in.
      </p>
      <p>
        <strong>Support email:</strong>{' '}
        <a href="mailto:Support@pridecircuit.in">Support@pridecircuit.in</a>
      </p>
      <p>
        <strong>Contact number:</strong>{' '}
        <a href="tel:8574859658">8574859658</a>
      </p>
      <p>
        When contacting support about an order, include your name, registered
        email address, order number, and a concise description of the issue.
        Include product details, payment references, photographs, or delivery
        information only where relevant to the request.
      </p>
    </>,
  ],
  [
    '2. Operational Office & Product Pickup Location',
    <>
      <p>
        <strong>Office No. 237, 2nd Floor, XION Mall, Hinjewadi, Pune, Maharashtra – 411057</strong>
      </p>
      <p>
        This is Pride Circuit&apos;s <strong>Operational Office &amp; Product
        Pickup Location</strong>. It is not presented as the GST-registered
        address of the proprietorship.
      </p>
      <p>
        For product pickup, contact support before visiting so the relevant
        order and pickup availability can be confirmed.
      </p>
      <p>
        <a href={directionsUrl} target="_blank" rel="noreferrer">
          Get Directions on Google Maps
        </a>
      </p>
    </>,
  ],
  [
    '3. Business Information',
    <>
      <p><strong>Website brand:</strong> Pride Circuit</p>
      <p><strong>Registered trade name:</strong> Pride Automation</p>
      <p><strong>Legal business name / Proprietor:</strong> Pravin Rameshrao Banait</p>
      <p><strong>Business type:</strong> Proprietorship</p>
      <p><strong>GSTIN:</strong> 27AFUPB6009F2ZG</p>
      <p><strong>Website:</strong> pridecircuit.in</p>
      <p>
        <strong>Business activity:</strong> Online sale of electronic
        components, modules, and related products.
      </p>
      <p>
        Pride Circuit is the customer-facing website brand operated by Pride
        Automation.
      </p>
    </>,
  ],
  [
    '4. Payment and Order Support',
    <>
      <p>
        For a pending, failed, duplicate, or debited payment, provide the order
        number, payment date, amount, payment method, and the payment or bank
        reference shown for the transaction, where available.
      </p>
      <p>
        Never send your complete card number, card security code, UPI PIN,
        online-banking password, or one-time password. Pride Circuit support
        does not require these credentials to review a transaction.
      </p>
      <p>
        For shipping, cancellation, return, or refund assistance, review the
        applicable website policy and contact support before sending a product
        back.
      </p>
    </>,
  ],
  [
    '5. Customer Policies',
    <>
      <p>
        Customers can review the{' '}
        <a href="/#shipping-and-delivery-policy">Shipping &amp; Delivery Policy</a>,{' '}
        <a href="/#refund-and-cancellation-policy">Refund &amp; Cancellation Policy</a>,{' '}
        <a href="/#privacy-policy">Privacy Policy</a>, and{' '}
        <a href="/#terms-and-conditions">Terms &amp; Conditions</a> for information
        relevant to purchases, fulfilment, customer data, and use of the website.
      </p>
    </>,
  ],
]

export default function ContactUs({ onBack }) {
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
      title="Contact Us"
      description="Contact Pride Circuit for product, account, payment, order, delivery, return, refund, or privacy assistance."
      updatedAt="October 22, 2026"
      sections={sections}
      onBack={onBack}
      icon={Headphones}
      eyebrow="Customer support"
      hideIntro
      hideSectionNavigation
      breadcrumbLabel="Contact Us"
    />
  )
}
