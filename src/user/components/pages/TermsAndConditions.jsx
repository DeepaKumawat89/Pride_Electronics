import { useEffect } from 'react'
import { ScrollText } from 'lucide-react'
import LegalPageLayout from './LegalPageLayout'

const pageTitle = 'Terms & Conditions | Pride Circuit'
const pageDescription = 'Read the terms governing accounts, orders, pricing, GST, payments, delivery, cancellations, returns, refunds, and use of pridecircuit.in.'

const sections = [
  {
    title: '1. Introduction',
    content: (
      <>
        <p>
          These Terms &amp; Conditions govern access to pridecircuit.in and
          purchases made through <strong>Pride Circuit</strong>, an e-commerce
          platform operated by <strong>Pride Automation</strong> for the online
          sale of electronic components, modules, and related products.
        </p>
        <p>
          References to &quot;Pride Circuit&quot;, &quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot; mean the store operated by Pride
          Automation. References to &quot;you&quot; or &quot;your&quot; mean a
          customer or website visitor.
        </p>
        <p>
          By creating an account, placing an order, or using the website, you
          agree to these terms and the policies linked from them. If you do not
          agree, do not place an order or continue using account-based services.
        </p>
      </>
    ),
  },
  {
    title: '2. Customer Eligibility and Accounts',
    content: (
      <>
        <p>
          You must be legally capable of entering into a purchase transaction
          under applicable law. A person who is not independently eligible to
          contract must use the website with the involvement of a parent or
          lawful guardian.
        </p>
        <p>You are responsible for:</p>
        <ul>
          <li>Providing accurate, current, and complete account, billing, delivery, and contact information.</li>
          <li>Keeping your password, devices, and account access secure.</li>
          <li>Notifying us promptly if you suspect unauthorised account activity.</li>
          <li>Using the website and purchasing products only for lawful purposes.</li>
          <li>Reviewing product compatibility and order information before checkout.</li>
        </ul>
        <p>
          We may temporarily restrict an account or transaction when reasonably
          necessary to investigate suspected fraud, abuse, security risk, or a
          material violation of these terms, subject to applicable law.
        </p>
      </>
    ),
  },
  {
    title: '3. Products and Product Information',
    content: (
      <>
        <p>
          We make reasonable efforts to display accurate product names,
          descriptions, images, specifications, model or variant details,
          prices, tax rates, stock status, and applicable warranty information.
        </p>
        <p>
          Product appearance may vary slightly because of screen settings,
          lighting, packaging revisions, or manufacturer updates that do not
          materially change the product. Customers should verify voltage,
          dimensions, model, interface, compatibility, and intended use before
          ordering electronic components or modules.
        </p>
        <p>
          Stock status can change before checkout is completed. If a material
          listing or specification error affects an order, we will provide the
          available lawful resolution, which may include clarification,
          correction, replacement, cancellation, or an applicable refund.
        </p>
      </>
    ),
  },
  {
    title: '4. Minimum Order Value',
    content: (
      <>
        <p>
          The minimum order value is a <strong>₹100 product subtotal</strong>,
          excluding GST and delivery charges. The checkout validates this
          minimum against the eligible product subtotal after applicable
          discounts.
        </p>
        <p>
          GST, delivery charges, or amounts payable directly to a third-party
          delivery provider do not count toward the ₹100 minimum. The website
          will not permit order placement when the applicable product subtotal
          is below the minimum.
        </p>
      </>
    ),
  },
  {
    title: '5. Pricing, Discounts, GST, and Charges',
    content: (
      <>
        <p>
          Prices are displayed in Indian Rupees. Under the currently implemented
          pricing model, product prices are taxable values and applicable GST is
          calculated separately. Before order confirmation, checkout displays
          the product subtotal, eligible discounts, taxable subtotal, applicable
          GST, delivery charges and delivery-related GST, and the final payable
          amount.
        </p>
        <p>
          The applicable GST rate may vary by product. Intra-state supplies may
          show CGST and SGST, while inter-state supplies may show IGST, according
          to the billing or supply information and applicable tax rules.
        </p>
        <p>
          Coupons and promotions are subject to the eligibility, validity,
          usage, minimum-order, product, account, and maximum-discount conditions
          displayed for the offer. If a material calculation or pricing error is
          identified before fulfilment, we may pause the order and seek your
          confirmation of the corrected amount or cancel the affected item and
          issue an applicable refund.
        </p>
      </>
    ),
  },
  {
    title: '6. Orders and Acceptance',
    content: (
      <>
        <p>
          Placing an order is your request to purchase the selected products at
          the checkout amount. A payment attempt, payment authorisation, or
          automated acknowledgement does not by itself constitute final order
          acceptance.
        </p>
        <p>
          An order is accepted after the system validates the authoritative
          price, minimum order value, tax, discount, selected delivery method,
          inventory, customer information, and successful payment where
          required, and creates the confirmed order record.
        </p>
        <p>We may refuse, hold, or cancel an order for reasons including:</p>
        <ul>
          <li>Insufficient stock or an unavailable product or variant.</li>
          <li>A material product, price, tax, discount, delivery, or calculation error.</li>
          <li>A failed, incomplete, reversed, unauthorised, mismatched, or suspicious payment.</li>
          <li>Incomplete, invalid, or unusable customer or delivery information.</li>
          <li>Suspected fraud, misuse, unlawful activity, or a security risk.</li>
          <li>A legal, regulatory, safety, or technical restriction.</li>
        </ul>
        <p>
          If we cancel an accepted prepaid order, any eligible refund will be
          handled under the published Refund &amp; Cancellation Policy.
        </p>
      </>
    ),
  },
  {
    title: '7. Online Payments',
    content: (
      <>
        <p>
          The website&apos;s currently integrated online payment gateway is
          <strong> Razorpay</strong>. Available payment methods are shown during
          checkout and may depend on configured options, provider availability,
          authentication requirements, transaction limits, and risk checks.
        </p>
        <p>
          By proceeding with payment, you authorise the payment provider and
          relevant bank, card network, UPI service, wallet, or other payment
          participant to process the final amount displayed at checkout. Their
          terms and privacy practices also apply to information processed on
          their systems.
        </p>
        <p>
          Pride Circuit verifies payment status before completing a prepaid
          order. A bank debit or payment authorisation does not necessarily mean
          the website has received a successful, verified payment. Contact
          support with the available transaction reference if a payment is
          pending, failed, duplicated, or debited without an order confirmation.
        </p>
        <p>
          Never disclose a card security code, UPI PIN, online-banking password,
          or one-time password to Pride Circuit staff or through a support
          message.
        </p>
      </>
    ),
  },
  {
    title: '8. GST Invoices',
    content: (
      <>
        <p>
          If you request a GST invoice, you are responsible for providing a
          valid GSTIN, registered name, billing address, and other required tax
          information before placing the order.
        </p>
        <p>
          Invoice corrections after order placement may be limited by applicable
          tax requirements. We may request supporting information before making
          an available correction.
        </p>
      </>
    ),
  },
  {
    title: '9. Shipping, Delivery, and Pickup',
    content: (
      <>
        <p>The checkout currently offers these fulfilment methods:</p>
        <ul>
          <li><strong>Office Pickup (Collect From Office):</strong> collect the order from the displayed Pride Circuit pickup location only after we confirm that it is ready.</li>
          <li><strong>Porter (Through Porter):</strong> you arrange and pay Porter directly. Pride Circuit does not collect the Porter delivery charge.</li>
          <li><strong>Express Delivery (Delivery Express):</strong> Pride Circuit arranges delivery to the selected address, subject to the charge, GST, availability, and details shown during checkout.</li>
        </ul>
        <p>
          Available methods, serviceability, delivery charges, and estimates are
          those displayed for the order at checkout. Delivery estimates are not
          guarantees and may be affected by readiness, destination,
          availability, weather, traffic, public restrictions, or events beyond
          reasonable control.
        </p>
        <p>
          You must provide accurate contact and delivery information. Review the{' '}
          <a href="/#shipping-and-delivery-policy">Shipping &amp; Delivery Policy</a>{' '}
          for processing, pickup, dispatch, tracking, delivery, failed-delivery,
          and shipment-issue terms.
        </p>
      </>
    ),
  },
  {
    title: '10. Cancellations, Returns, and Refunds',
    content: (
      <>
        <p>
          Cancellation eligibility depends on the order status and whether
          packing or dispatch has begun. Return eligibility depends on the
          product, condition, issue, timing, supporting information, and any
          product-specific terms displayed before purchase.
        </p>
        <p>
          Approved refunds for prepaid orders are generally routed through the
          original payment method. Processing and bank-credit timing may depend
          on the circumstances and the payment provider.
        </p>
        <p>
          Full eligibility, exclusions, request steps, inspection requirements,
          refund treatment, and expected processing information are stated in
          the{' '}
          <a href="/#refund-and-cancellation-policy">Refund &amp; Cancellation Policy</a>,
          which covers cancellations, returns, replacements, and refunds.
        </p>
      </>
    ),
  },
  {
    title: '11. Warranty and Service',
    content: (
      <>
        <p>
          Warranty availability, duration, exclusions, and service arrangements
          depend on the product and manufacturer. Applicable information may be
          shown on the product page, packaging, invoice, or manufacturer
          documentation.
        </p>
        <p>
          A warranty request may require an invoice, serial or model number,
          accessories, packaging, troubleshooting, or inspection. Warranty
          coverage does not automatically make a product eligible for return,
          and nothing in these terms limits a mandatory consumer remedy.
        </p>
      </>
    ),
  },
  {
    title: '12. Acceptable Website Use',
    content: (
      <>
        <p>You must not:</p>
        <ul>
          <li>Use the website for fraudulent, illegal, or unauthorised activity.</li>
          <li>Provide false identity, payment, billing, tax, pickup, or delivery information.</li>
          <li>Attempt to access another customer&apos;s account, protected systems, or restricted data.</li>
          <li>Interfere with website security, availability, checkout, inventory, pricing, or payment verification.</li>
          <li>Use automated tools to scrape, overload, or misuse the website without permission.</li>
          <li>Submit unlawful, misleading, abusive, infringing, confidential, or unrelated reviews or content.</li>
        </ul>
      </>
    ),
  },
  {
    title: '13. Intellectual Property and Third-Party Services',
    content: (
      <>
        <p>
          Pride Circuit&apos;s original website software, design, text, graphics,
          and branding are owned by or licensed to Pride Automation and are
          protected by applicable law. Product names, manufacturer marks, and
          third-party material belong to their respective owners.
        </p>
        <p>
          Payment providers, delivery providers, manufacturers, service centres,
          and linked websites may apply their own terms and privacy practices.
          We do not control their independent systems, but this does not remove
          any responsibility that Pride Circuit cannot lawfully exclude.
        </p>
      </>
    ),
  },
  {
    title: '14. Privacy, Communications, and Website Availability',
    content: (
      <>
        <p>
          Personal-data handling is described in the{' '}
          <a href="/#privacy-policy">Privacy Policy</a>. We may send service
          communications needed for authentication, account security, payments,
          orders, pickup, delivery, cancellations, returns, refunds, or support.
        </p>
        <p>
          We use reasonable care to operate the website, but temporary outages,
          maintenance, network failures, provider disruption, or technical
          errors may occur. Nothing in these terms excludes liability or limits
          a right or remedy that cannot lawfully be excluded under Indian law.
        </p>
      </>
    ),
  },
  {
    title: '15. Governing Law and Complaints',
    content: (
      <>
        <p>
          These terms are governed by the laws of India, including applicable
          consumer-protection and e-commerce requirements. Mandatory rights and
          access to a legally competent consumer commission, court, or other
          authority are not restricted by these terms.
        </p>
        <p>
          Please contact customer support first with sufficient information and
          the relevant order number so the concern can be reviewed. This does
          not prevent you from using any remedy available under applicable law.
        </p>
      </>
    ),
  },
  {
    title: '16. Updates and Contact',
    content: (
      <>
        <p><strong>Effective date:</strong> October 22, 2026</p>
        <p>
          We may update these terms when the website, products, providers,
          fulfilment methods, business operations, or legal requirements change.
          The revised terms will be published on this page with a new effective
          date. The terms in effect when an order was accepted will ordinarily
          continue to govern that order unless a change is required by law or
          agreed with you.
        </p>
        <p>
          Pride Circuit is operated by <strong>Pride Automation</strong>.
        </p>
        <p>
          For questions, complaints, or order support, email{' '}
          <a href="mailto:Support@pridecircuit.in">Support@pridecircuit.in</a>.
          Include the order number for an order-related request, but do not send
          passwords, PINs, one-time passwords, or complete payment-card details.
        </p>
      </>
    ),
  },
]

export default function TermsAndConditions({ onBack }) {
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
      title="Terms & Conditions"
      description="The terms governing accounts, orders, pricing, GST, payments, delivery, cancellations, returns, refunds, and use of pridecircuit.in."
      updatedAt="October 22, 2026"
      sections={sections}
      onBack={onBack}
      icon={ScrollText}
      eyebrow="Store terms"
      hideIntro
      hideSectionNavigation
      breadcrumbLabel="Terms & Conditions"
    />
  )
}
