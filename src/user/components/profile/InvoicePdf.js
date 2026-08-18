import { parsePrice } from '../../utils/currency'
import {
  createInvoiceNumber,
  initialInvoiceSettings,
} from '../../../data/invoice'

const COLORS = {
  dark: [37, 51, 41],
  orange: [255, 92, 53],
  green: [83, 106, 80],
  muted: [103, 114, 108],
  line: [219, 225, 217],
  light: [246, 248, 244],
  white: [255, 255, 255],
}

const formatMoney = (value) =>
  `INR ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`

const formatDate = (value) => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const normalizeParty = (source, customer, order) => {
  if (typeof source === 'string') {
    return {
      name: customer?.name || order.customer || 'Pride Customer',
      phone: customer?.mobile || 'Not available',
      email: customer?.email || order.email || 'Not available',
      address: source,
    }
  }

  return {
    name:
      source?.fullName || customer?.name || order.customer || 'Pride Customer',
    phone: source?.phone || customer?.mobile || 'Not available',
    email: customer?.email || order.email || 'Not available',
    address:
      [
        source?.line1,
        source?.line2,
        [source?.city, source?.state, source?.pincode]
          .filter(Boolean)
          .join(', '),
      ]
        .filter(Boolean)
        .join(', ') || 'Address not available',
  }
}

const toWordsBelowThousand = (value) => {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ]
  const parts = []
  let remaining = value

  if (remaining >= 100) {
    parts.push(`${ones[Math.floor(remaining / 100)]} Hundred`)
    remaining %= 100
  }
  if (remaining >= 20) {
    parts.push(tens[Math.floor(remaining / 10)])
    remaining %= 10
  }
  if (remaining > 0) parts.push(ones[remaining])
  return parts.join(' ')
}

const numberToIndianWords = (value) => {
  let amount = Math.round(Number(value) || 0)
  if (amount === 0) return 'Indian Rupees Zero Only'

  const groups = [
    [10000000, 'Crore'],
    [100000, 'Lakh'],
    [1000, 'Thousand'],
  ]
  const parts = []
  groups.forEach(([divisor, label]) => {
    if (amount >= divisor) {
      const count = Math.floor(amount / divisor)
      parts.push(`${toWordsBelowThousand(count)} ${label}`)
      amount %= divisor
    }
  })
  if (amount > 0) parts.push(toWordsBelowThousand(amount))
  return `Indian Rupees ${parts.join(' ')} Only`
}

const createInvoiceData = (order, taxSettings) => {
  const items = (order.items || []).map((item, index) => {
    const quantity = Number(item.qty || 1)
    const unitPrice = parsePrice(item.unitPrice ?? item.price)
    return {
      ...item,
      quantity,
      unitPrice,
      gross: unitPrice * quantity,
      directDiscount: parsePrice(item.discount || 0),
      sku:
        item.sku ||
        (item.productId ? `PE-${String(item.productId).padStart(4, '0')}` : '') ||
        `PE-${String(index + 1).padStart(4, '0')}`,
    }
  })
  const subtotal = items.reduce((sum, item) => sum + item.gross, 0)
  const directDiscount = items.reduce(
    (sum, item) => sum + item.directDiscount,
    0,
  )
  const orderDiscount = parsePrice(order.discount || 0)
  const discount = directDiscount + orderDiscount
  const delivery = parsePrice(
    order.deliveryCharges ?? order.shipping ?? order.deliveryFee ?? 0,
  )
  const taxableValue = Math.max(0, subtotal - discount)
  const explicitTax = parsePrice(order.taxAmount ?? order.tax ?? 0)
  const defaultTaxRate = taxSettings.gstEnabled === false
    ? 0
    : Number(taxSettings.defaultRate || 0)
  const tax = taxSettings.gstEnabled === false
    ? 0
    : explicitTax || Math.round(
        taxSettings.pricesIncludeTax
          ? (taxableValue * defaultTaxRate) / (100 + defaultTaxRate || 100)
          : (taxableValue * defaultTaxRate) / 100,
      )
  const total =
    parsePrice(order.total) || Math.max(
      0,
      subtotal - discount + delivery + (taxSettings.pricesIncludeTax ? 0 : tax),
    )

  let allocatedDiscount = 0
  const detailedItems = items.map((item, index) => {
    const proportionalDiscount =
      index === items.length - 1
        ? Math.max(0, orderDiscount - allocatedDiscount)
        : subtotal
          ? Math.round((orderDiscount * item.gross) / subtotal)
          : 0
    allocatedDiscount += proportionalDiscount
    const lineDiscount = item.directDiscount + proportionalDiscount
    const lineAmount = Math.max(0, item.gross - lineDiscount)
    const lineTaxRate = taxSettings.gstEnabled === false
      ? 0
      : Number(item.taxRate ?? defaultTaxRate)
    const lineTax = Math.round(
      taxSettings.pricesIncludeTax
        ? (lineAmount * lineTaxRate) / (100 + lineTaxRate || 100)
        : (lineAmount * lineTaxRate) / 100,
    )
    return { ...item, lineDiscount, lineAmount, lineTax }
  })

  return {
    items: detailedItems,
    subtotal,
    discount,
    delivery,
    tax,
    total,
  }
}

async function createInvoicePdfDocument(
  order,
  customer,
  address,
  invoiceSettings = initialInvoiceSettings,
) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  })
  const business = invoiceSettings.business || initialInvoiceSettings.business
  const taxSettings = invoiceSettings.tax || initialInvoiceSettings.tax
  const data = createInvoiceData(order, taxSettings)
  const legacySequence = Number(String(order.id || '').replace(/\D/g, ''))
  const invoiceNumber =
    order.invoiceNumber ||
    createInvoiceNumber(
      {
        ...invoiceSettings,
        numbering: {
          ...invoiceSettings.numbering,
          nextNumber: legacySequence || invoiceSettings.numbering.nextNumber,
        },
      },
      order.date,
    )
  const billing = normalizeParty(
    order.billingAddress || order.shippingAddress || address,
    customer,
    order,
  )
  const shipping = normalizeParty(
    order.shippingAddress || address,
    customer,
    order,
  )
  const paymentMethod = order.paymentMethod || 'Online payment'
  const isCod = /cash|cod/i.test(paymentMethod)
  const paymentStatus =
    order.paymentStatus ||
    (isCod
      ? order.status === 'Delivered'
        ? 'Paid'
        : 'Payment due on delivery'
      : 'Paid')
  const transactionId =
    order.razorpayPaymentId || order.transactionId || (isCod ? 'Not applicable' : 'Not available')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 13
  const contentWidth = pageWidth - margin * 2
  const footerTop = pageHeight - 24
  let y = 0

  const drawBusinessHeader = (continued = false) => {
    y = 11
    pdf.setFillColor(...COLORS.orange)
    pdf.roundedRect(margin, y, 15, 15, 2.5, 2.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    pdf.setTextColor(...COLORS.white)
    pdf.text('PE', margin + 7.5, y + 9.8, { align: 'center' })

    pdf.setTextColor(...COLORS.dark)
    pdf.setFontSize(14)
    pdf.text(business.legalName, margin + 20, y + 4)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.8)
    pdf.setTextColor(...COLORS.muted)
    pdf.text(business.address, margin + 20, y + 8.5)
    pdf.text(`${business.phone}  |  ${business.email}`, margin + 20, y + 12)
    pdf.text(
      `${business.website}${taxSettings.gstEnabled ? `  |  GSTIN: ${taxSettings.gstin}` : ''}`,
      margin + 20,
      y + 15.5,
    )

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(...COLORS.dark)
    pdf.text('TAX INVOICE', pageWidth - margin, y + 4, { align: 'right' })
    pdf.setFontSize(7.3)
    pdf.text(`Invoice No: ${invoiceNumber}`, pageWidth - margin, y + 9, {
      align: 'right',
    })
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...COLORS.muted)
    pdf.text(`Invoice Date: ${formatDate(order.date)}`, pageWidth - margin, y + 12.5, {
      align: 'right',
    })
    pdf.text(`Order ID: #${order.id}`, pageWidth - margin, y + 16, {
      align: 'right',
    })

    y += 22
    pdf.setDrawColor(...COLORS.line)
    pdf.setLineWidth(0.35)
    pdf.line(margin, y, pageWidth - margin, y)
    y += continued ? 7 : 6
    if (continued) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.setTextColor(...COLORS.green)
      pdf.text('ITEMS CONTINUED', margin, y)
      y += 5
    }
  }

  const addPage = (continued = false) => {
    pdf.addPage('a4', 'portrait')
    drawBusinessHeader(continued)
  }

  const ensureSpace = (requiredHeight, continued = false) => {
    if (y + requiredHeight > footerTop) addPage(continued)
  }

  const drawPartyDetails = () => {
    const gap = 12
    const columnWidth = (contentWidth - gap) / 2
    const rightX = margin + columnWidth + gap
    const sectionTop = y
    const drawParty = (title, party, x) => {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7.2)
      pdf.setTextColor(...COLORS.green)
      pdf.text(title, x, sectionTop + 3)
      pdf.setFontSize(8.7)
      pdf.setTextColor(...COLORS.dark)
      pdf.text(party.name, x, sectionTop + 9)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.1)
      pdf.setTextColor(...COLORS.muted)
      pdf.text(`Phone: ${party.phone}`, x, sectionTop + 14)
      if (title === 'BILL TO') pdf.text(`Email: ${party.email}`, x, sectionTop + 18.5)
      const addressY = title === 'BILL TO' ? sectionTop + 23 : sectionTop + 18.5
      const lines = pdf.splitTextToSize(party.address, columnWidth - 3)
      pdf.text(lines.slice(0, 4), x, addressY)
    }
    drawParty('BILL TO', billing, margin)
    drawParty('SHIP TO', shipping, rightX)
    pdf.setDrawColor(...COLORS.line)
    pdf.line(margin + columnWidth + gap / 2, sectionTop, margin + columnWidth + gap / 2, sectionTop + 33)
    y += 38
  }

  const drawOrderBar = () => {
    const fields = [
      ['Order ID', `#${order.id}`],
      ['Order Date', formatDate(order.date)],
      ['Payment Method', paymentMethod],
      ['Payment Status', paymentStatus],
    ]
    const fieldWidth = contentWidth / fields.length
    pdf.setFillColor(...COLORS.light)
    pdf.rect(margin, y, contentWidth, 16, 'F')
    fields.forEach(([label, value], index) => {
      const x = margin + index * fieldWidth
      if (index) {
        pdf.setDrawColor(...COLORS.line)
        pdf.line(x, y + 3, x, y + 13)
      }
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(6.3)
      pdf.setTextColor(...COLORS.muted)
      pdf.text(label.toUpperCase(), x + 4, y + 5.5)
      pdf.setFontSize(7.5)
      pdf.setTextColor(...COLORS.dark)
      const clipped = pdf.splitTextToSize(String(value), fieldWidth - 8)[0]
      pdf.text(clipped, x + 4, y + 11.5)
    })
    y += 22
  }

  const columns = [
    { label: '#', width: 7, align: 'left' },
    { label: 'Product Description', width: 49, align: 'left' },
    { label: 'SKU', width: 22, align: 'left' },
    { label: 'Qty', width: 10, align: 'right' },
    { label: 'Unit Price', width: 25, align: 'right' },
    { label: 'Discount', width: 22, align: 'right' },
    { label: 'Tax', width: 21, align: 'right' },
    { label: 'Amount', width: 28, align: 'right' },
  ]
  let columnX = margin
  columns.forEach((column) => {
    column.x = columnX
    columnX += column.width
  })

  const drawTableHeader = () => {
    pdf.setFillColor(...COLORS.dark)
    pdf.rect(margin, y, contentWidth, 10, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.1)
    pdf.setTextColor(...COLORS.white)
    columns.forEach((column) => {
      const x =
        column.align === 'right'
          ? column.x + column.width - 2
          : column.x + 2
      pdf.text(column.label.toUpperCase(), x, y + 6.3, {
        align: column.align,
      })
    })
    y += 10
  }

  const drawItems = () => {
    drawTableHeader()
    data.items.forEach((item, index) => {
      const description = [item.productName || 'Product', item.variant || item.specification]
        .filter(Boolean)
        .join(' - ')
      const descriptionLines = pdf.splitTextToSize(description, columns[1].width - 4)
      const rowHeight = Math.max(13, descriptionLines.length * 3.5 + 6)
      if (y + rowHeight > footerTop) {
        addPage(true)
        drawTableHeader()
      }
      if (index % 2 === 1) {
        pdf.setFillColor(249, 250, 248)
        pdf.rect(margin, y, contentWidth, rowHeight, 'F')
      }

      const values = [
        String(index + 1),
        descriptionLines,
        item.sku,
        String(item.quantity),
        formatMoney(item.unitPrice),
        formatMoney(item.lineDiscount),
        formatMoney(item.lineTax),
        formatMoney(item.lineAmount),
      ]
      columns.forEach((column, valueIndex) => {
        pdf.setFont(
          'helvetica',
          valueIndex === 1 || valueIndex === values.length - 1 ? 'bold' : 'normal',
        )
        pdf.setFontSize(valueIndex === 1 ? 6.8 : 6.5)
        pdf.setTextColor(...COLORS.dark)
        const x =
          column.align === 'right'
            ? column.x + column.width - 2
            : column.x + 2
        pdf.text(values[valueIndex], x, y + 5, { align: column.align })
      })
      pdf.setDrawColor(...COLORS.line)
      pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight)
      y += rowHeight
    })
  }

  const drawAmountSummary = () => {
    ensureSpace(66)
    y += 7
    const summaryWidth = 83
    const summaryX = pageWidth - margin - summaryWidth
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...COLORS.dark)
    pdf.text('AMOUNT SUMMARY', summaryX, y)
    y += 4
    const rows = [
      ['Subtotal', formatMoney(data.subtotal)],
      ['Discount', `- ${formatMoney(data.discount)}`],
      ['Delivery Charges', data.delivery ? formatMoney(data.delivery) : 'FREE'],
      ['GST / Tax', formatMoney(data.tax)],
    ]
    rows.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.4)
      pdf.setTextColor(...COLORS.muted)
      pdf.text(label, summaryX, y + 5)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...COLORS.dark)
      pdf.text(value, pageWidth - margin, y + 5, { align: 'right' })
      y += 7
    })
    pdf.setFillColor(...COLORS.dark)
    pdf.rect(summaryX - 3, y, summaryWidth + 3, 13, 'F')
    pdf.setTextColor(...COLORS.white)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.2)
    pdf.text('TOTAL AMOUNT', summaryX + 2, y + 8.3)
    pdf.text(formatMoney(data.total), pageWidth - margin - 2, y + 8.3, {
      align: 'right',
    })
    y += 20

    pdf.setFontSize(7)
    pdf.setTextColor(...COLORS.green)
    pdf.text('AMOUNT IN WORDS', margin, y)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.7)
    pdf.setTextColor(...COLORS.dark)
    const words = pdf.splitTextToSize(numberToIndianWords(data.total), contentWidth - 36)
    pdf.text(words, margin + 31, y)
    y += Math.max(10, words.length * 4 + 3)
  }

  const drawPaymentDetails = () => {
    ensureSpace(35)
    pdf.setDrawColor(...COLORS.line)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 7
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...COLORS.dark)
    pdf.text('PAYMENT DETAILS', margin, y)
    y += 6
    const fields = [
      ['Payment Method', paymentMethod],
      ['Transaction ID', transactionId],
      ['Payment Date', formatDate(order.paymentDate || order.date)],
      ['Payment Status', paymentStatus],
    ]
    const fieldWidth = contentWidth / 4
    fields.forEach(([label, value], index) => {
      const x = margin + index * fieldWidth
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6.3)
      pdf.setTextColor(...COLORS.muted)
      pdf.text(label.toUpperCase(), x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.setTextColor(...COLORS.dark)
      const lines = pdf.splitTextToSize(String(value), fieldWidth - 5)
      pdf.text(lines.slice(0, 2), x, y + 5)
    })
    y += 16
  }

  const drawPoliciesAndNotes = () => {
    ensureSpace(44)
    pdf.setDrawColor(...COLORS.line)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 7
    const gap = 10
    const columnWidth = (contentWidth - gap) / 2
    const policy = [
      'Return eligibility is subject to the product return policy.',
      'Refunds follow the applicable payment and return terms.',
      'Contact customer support for return or refund assistance.',
    ]
    const notes = [
      'Thank you for shopping with Pride Electronics.',
      'Please retain this invoice for warranty, return, and service purposes.',
    ]
    const drawList = (title, items, x) => {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7.5)
      pdf.setTextColor(...COLORS.dark)
      pdf.text(title, x, y)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6.5)
      pdf.setTextColor(...COLORS.muted)
      let lineY = y + 5
      items.forEach((item) => {
        const lines = pdf.splitTextToSize(`- ${item}`, columnWidth - 2)
        pdf.text(lines, x, lineY)
        lineY += lines.length * 3.2 + 1
      })
    }
    drawList('RETURN & REFUND POLICY', policy, margin)
    drawList('NOTES', notes, margin + columnWidth + gap)
  }

  drawBusinessHeader()
  drawPartyDetails()
  drawOrderBar()
  drawItems()
  drawAmountSummary()
  drawPaymentDetails()
  drawPoliciesAndNotes()

  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    pdf.setDrawColor(...COLORS.line)
    pdf.line(margin, footerTop, pageWidth - margin, footerTop)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.3)
    pdf.setTextColor(...COLORS.dark)
    pdf.text(business.displayName, margin, footerTop + 5)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.2)
    pdf.setTextColor(...COLORS.muted)
    pdf.text('Power your build with Pride Electronics.', margin, footerTop + 9)
    pdf.text(
      `${business.website}  |  ${business.email}  |  ${business.phone}`,
      margin,
      footerTop + 13,
    )
    pdf.setFontSize(5.9)
    pdf.text(
      'This is a computer-generated invoice and does not require a physical signature.',
      pageWidth - margin,
      footerTop + 7,
      { align: 'right' },
    )
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin, footerTop + 13, {
      align: 'right',
    })
  }

  pdf.setProperties({
    title: `${invoiceNumber} - Pride Electronics Tax Invoice`,
    subject: `Tax invoice for order ${order.id}`,
    author: business.legalName,
    creator: business.legalName,
    keywords: 'tax invoice, electronics, GST, Pride Electronics',
  })
  return { pdf, invoiceNumber }
}

export async function viewInvoicePdf(
  order,
  customer,
  address,
  invoiceSettings = initialInvoiceSettings,
) {
  const previewWindow = window.open('', '_blank')
  if (previewWindow) {
    previewWindow.document.title = 'Preparing invoice preview…'
    previewWindow.document.body.textContent = 'Preparing invoice preview…'
  }
  let pdf
  try {
    const document = await createInvoicePdfDocument(
      order,
      customer,
      address,
      invoiceSettings,
    )
    pdf = document.pdf
  } catch (error) {
    previewWindow?.close()
    throw error
  }
  const previewUrl = pdf.output('bloburl')
  if (previewWindow) {
    previewWindow.opener = null
    previewWindow.location.href = previewUrl
  } else {
    const fallbackWindow = window.open(
      previewUrl,
      '_blank',
      'noopener,noreferrer',
    )
    if (!fallbackWindow) throw new Error('Invoice preview was blocked.')
  }
}

export default async function downloadInvoicePdf(
  order,
  customer,
  address,
  invoiceSettings = initialInvoiceSettings,
) {
  const { pdf, invoiceNumber } = await createInvoicePdfDocument(
    order,
    customer,
    address,
    invoiceSettings,
  )
  pdf.save(`${invoiceNumber}.pdf`)
}
