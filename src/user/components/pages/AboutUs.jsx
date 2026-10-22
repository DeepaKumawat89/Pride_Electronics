import { useEffect } from 'react'
import LegalPageLayout from './LegalPageLayout'

const pageTitle = 'About Pride Circuit | Electronics Store Operated by Pride Automation'
const pageDescription = 'Learn about Pride Circuit, an online electronics store operated by Pride Automation, its products, purchasing process, business details, and customer support.'

const sections = [
  [
    '1. About Pride Circuit',
    <>
      <p>
        <strong>Pride Circuit</strong> is an online store for electronic
        components, modules, and related products. The website helps customers
        review available products, specifications, prices, and other product
        information before placing an order online.
      </p>
      <p>
        Pride Circuit is operated by <strong>Pride Automation</strong>, a
        registered proprietorship. Pride Circuit is the customer-facing brand,
        while Pride Automation is the registered trade name under which the
        business operates.
      </p>
    </>,
  ],
  [
    '2. What We Sell',
    <>
      <p>
        Our business activity is the online sale of electronic components,
        electronic modules, and related products. The storefront may also
        include PC components, audio products, wearables, smart-power products,
        and other electronics listed in the current catalogue.
      </p>
      <p>
        Product availability, specifications, variants, prices, applicable
        offers, and stock status are shown on the relevant product or catalogue
        page. Customers should review those details and compatibility
        information before ordering.
      </p>
    </>,
  ],
  [
    '3. How to Purchase',
    <>
      <p>Customers can purchase products through pridecircuit.in by:</p>
      <ul>
        <li>Browsing or searching the online product catalogue.</li>
        <li>Opening a product page to review its description, specifications, price, and availability.</li>
        <li>Selecting an available variant or quantity and using Add to Cart or Buy Now.</li>
        <li>Signing in when requested and providing the required billing and delivery information.</li>
        <li>Reviewing the order total, applicable taxes, shipping charges, and available payment options before confirming payment.</li>
        <li>Completing checkout and retaining the order confirmation for future reference.</li>
      </ul>
      <p>
        The products, amounts, and payment options applicable to an order are
        those displayed during checkout at the time the order is placed.
      </p>
    </>,
  ],
  [
    '4. Our Purpose and Service Commitment',
    <>
      <p>
        Our purpose is to make relevant electronic products easier to discover
        and purchase online with clear product information and a straightforward
        ordering process.
      </p>
      <p>
        We aim to present product prices and applicable charges transparently
        before payment, process orders responsibly, and provide practical
        support for product, payment, shipping, cancellation, return, refund,
        and account-related questions. Fulfilment, cancellation, return, and
        refund requests are handled according to the policies published on this
        website and the circumstances of the relevant order.
      </p>
    </>,
  ],
  [
    '5. Business Identification',
    <>
      <p><strong>Brand name:</strong> Pride Circuit</p>
      <p><strong>Registered trade name:</strong> Pride Automation</p>
      <p><strong>Legal name / Proprietor:</strong> Pravin Rameshrao Banait</p>
      <p><strong>Business type:</strong> Proprietorship</p>
      <p><strong>GSTIN:</strong> 27AFUPB6009F2ZG</p>
      <p><strong>Business activity:</strong> Online sale of electronic components, modules, and related products.</p>
      <p>
        <strong>Office address:</strong> Office No. 237, 2nd Floor, XION Mall,
        Hinjewadi, Pune, Maharashtra – 411057
      </p>
      <p><strong>Website:</strong> pridecircuit.in</p>
    </>,
  ],
  [
    '6. Customer Support and Policies',
    <>
      <p>
        For product, order, payment, delivery, return, refund, or account
        assistance, contact Pride Circuit using the details below:
      </p>
      <p>
        <strong>Email:</strong>{' '}
        <a href="mailto:Support@pridecircuit.in">Support@pridecircuit.in</a>
      </p>
      <p>
        <strong>Phone:</strong>{' '}
        <a href="tel:8574859658">8574859658</a>
      </p>
      <p>
        Customers can also review our <a href="/#shipping-and-delivery-policy">Shipping &amp; Delivery Policy</a>,{' '}
        <a href="/#refund-and-cancellation-policy">Refund &amp; Cancellation Policy</a>,{' '}
        <a href="/#privacy-policy">Privacy Policy</a>, and{' '}
        <a href="/#terms-and-conditions">Terms &amp; Conditions</a>. These pages
        explain the terms that apply to purchases and the handling of customer
        information.
      </p>
    </>,
  ],
]

export default function AboutUs({ onBack }) {
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
      title="About Us"
      sections={sections}
      onBack={onBack}
      hideIntro
      hideSectionNavigation
      showAboutBreadcrumb
    />
  )
}
