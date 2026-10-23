const COLORS = {
  dark: [37, 51, 41],
  orange: [255, 92, 53],
  green: [83, 106, 80],
  muted: [103, 114, 108],
  line: [219, 225, 217],
  light: [246, 248, 244],
  white: [255, 255, 255],
}

const INVOICE_LOGO_URL = new URL(
  '../../../../images/Background removed.png',
  import.meta.url,
)

const loadInvoiceLogo = async () => {
  try {
    const response = await fetch(INVOICE_LOGO_URL)
    if (!response.ok) return null
    return new Uint8Array(await response.arrayBuffer())
  } catch {
    // Node-based PDF checks cannot fetch a file URL. The browser build resolves this
    // asset through Vite, while the text fallback keeps non-browser generation valid.
    return null
  }
}

const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const moneyValue = (value) => ({ type: 'money', value: Number(value) || 0 })

const formatTaxPercentage = (value) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

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

const normalizeHsnCode = (value) => {
  const hsnCode = String(value || '').trim()
  return /^[0-9]{8}$/.test(hsnCode) ? hsnCode : ''
}

const isSameOrderItem = (invoiceItem, orderItem) => {
  if (!orderItem) return false
  const productId = String(invoiceItem?.productId || '')
  const storedProductId = String(orderItem.productId || '')
  if (productId) {
    return (
      productId === storedProductId &&
      String(invoiceItem?.variantId || '') === String(orderItem.variantId || '')
    )
  }
  const sku = String(invoiceItem?.sku || '').trim()
  return Boolean(sku) && sku === String(orderItem.sku || '').trim()
}

const invoiceItemsWithStoredHsn = (invoiceItems, orderItems) => {
  const storedItems = Array.isArray(orderItems) ? orderItems : []
  return (Array.isArray(invoiceItems) ? invoiceItems : []).map((invoiceItem, index) => {
    const invoiceHsnCode = normalizeHsnCode(invoiceItem?.hsnCode)
    if (invoiceHsnCode) return { ...invoiceItem, hsnCode: invoiceHsnCode }

    const indexedItem = storedItems[index]
    const matchingItem =
      isSameOrderItem(invoiceItem, indexedItem)
        ? indexedItem
        : storedItems.find((item) => isSameOrderItem(invoiceItem, item))

    return {
      ...invoiceItem,
      hsnCode: normalizeHsnCode(matchingItem?.hsnCode),
    }
  })
}

export async function createInvoicePdfDocument(
  order,
) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  })
  const serverInvoice = order.invoice
  if (
    serverInvoice?.generatedBy !== 'server' ||
    ![1, 2, 3, 4, 5, 6, 7, 8].includes(serverInvoice?.schemaVersion)
  ) {
    throw new Error('A verified server invoice is not available for this order.')
  }
  const data = {
    items: invoiceItemsWithStoredHsn(serverInvoice.lineItems, order.items),
    delivery: serverInvoice.amounts?.shipping || 0,
    tax: serverInvoice.amounts?.totalGst || 0,
    total: serverInvoice.amounts?.total || 0,
    taxDetails: serverInvoice.tax || {},
  }
  const invoiceNumber = serverInvoice.invoiceNumber
  const orderNumber = serverInvoice.orderId || order.orderNumber || order.id
  const invoiceDate = serverInvoice.invoiceDate
  const invoiceBusiness = {
    legalName: String(serverInvoice.seller?.legalName || 'Business name unavailable'),
    addressLines: String(serverInvoice.seller?.address || 'Address unavailable'),
    phone: String(serverInvoice.seller?.phone || 'Phone unavailable'),
    email: String(serverInvoice.seller?.email || 'Email unavailable'),
    gstin: String(serverInvoice.seller?.gstin || 'Not available'),
  }
  const billing = {
    name: serverInvoice.buyer?.gst?.legalName || serverInvoice.buyer?.billing?.fullName || serverInvoice.buyer?.name,
    phone: serverInvoice.buyer?.billing?.phone || serverInvoice.buyer?.phone || 'Not available',
    email: serverInvoice.buyer?.email || 'Not available',
    address: serverInvoice.buyer?.billing?.formatted || serverInvoice.buyer?.billingAddress,
    gstin: serverInvoice.buyer?.gst?.gstin || '',
  }
  const shipping = {
    name: serverInvoice.buyer?.shipping?.fullName || serverInvoice.buyer?.name,
    phone: serverInvoice.buyer?.shipping?.phone || serverInvoice.buyer?.phone || 'Not available',
    email: serverInvoice.buyer?.email || 'Not available',
    address: serverInvoice.buyer?.shipping?.formatted || serverInvoice.buyer?.shippingAddress,
    gstin: '',
  }
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 13
  const contentWidth = pageWidth - margin * 2
  const footerTop = pageHeight - 18
  const termsTop = footerTop - 30
  const invoiceLogo = await loadInvoiceLogo()
  let y = 0

  // jsPDF's core fonts do not contain U+20B9. Draw the rupee as a vector
  // glyph so it remains sharp in print and can never become a missing-glyph box.
  const drawMoney = (value, x, baselineY, options = {}) => {
    const text = formatMoney(value)
    const align = options.align || 'left'
    const color = options.color || COLORS.dark
    const fontSize = Number(options.fontSize || pdf.getFontSize())
    const glyphHeight = fontSize * 25.4 / 72
    const glyphWidth = glyphHeight * 0.55
    const gap = Math.max(0.45, glyphHeight * 0.18)
    const textWidth = pdf.getTextWidth(text)
    const totalWidth = glyphWidth + gap + textWidth
    const startX = align === 'right'
      ? x - totalWidth
      : align === 'center' ? x - totalWidth / 2 : x
    const top = baselineY - glyphHeight * 0.78
    const middle = top + glyphHeight * 0.35

    pdf.setDrawColor(...color)
    pdf.setLineWidth(Math.max(0.16, glyphHeight * 0.055))
    pdf.line(startX, top, startX + glyphWidth, top)
    pdf.line(startX, top + glyphHeight * 0.18, startX + glyphWidth, top + glyphHeight * 0.18)
    pdf.line(startX + glyphWidth * 0.16, top, startX + glyphWidth * 0.67, middle)
    pdf.line(startX + glyphWidth * 0.67, middle, startX + glyphWidth * 0.16, middle)
    pdf.line(startX + glyphWidth * 0.2, middle, startX + glyphWidth * 0.88, baselineY)
    pdf.setTextColor(...color)
    pdf.text(text, startX + glyphWidth + gap, baselineY)
  }

  const drawBusinessHeader = () => {
    const topLineY = 4
    const titleY = 9.5
    const detailsTop = 14.5
    const logoWidth = 82
    const logoHeight = logoWidth * (289 / 865)
    const businessX = 146
    const contactTextX = businessX + 3.5

    pdf.setDrawColor(...COLORS.green)
    pdf.setLineWidth(0.75)
    pdf.line(margin, topLineY, pageWidth - margin, topLineY)

    pdf.setFont('times', 'bold')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...COLORS.muted)
    pdf.text('TAX INVOICE', pageWidth / 2, titleY, {
      align: 'center',
    })

    if (invoiceLogo) {
      pdf.addImage(invoiceLogo, 'PNG', margin, detailsTop - 1, logoWidth, logoHeight, 'pride-circuit-logo')
    } else {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.setTextColor(...COLORS.dark)
      pdf.text('PRIDE', margin, detailsTop + 8)
      pdf.setTextColor(...COLORS.orange)
      pdf.text('CIRCUIT', margin + 19, detailsTop + 8)
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(0, 0, 0)
    pdf.text(invoiceBusiness.legalName, businessX, detailsTop + 3)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.8)
    pdf.setTextColor(...COLORS.muted)
    const addressLines = pdf.splitTextToSize(invoiceBusiness.addressLines, 49).slice(0, 2)
    pdf.text(addressLines, contactTextX, detailsTop + 8)
    pdf.text(invoiceBusiness.phone, contactTextX, detailsTop + 16.5)
    pdf.text(invoiceBusiness.email, contactTextX, detailsTop + 21)

    pdf.setDrawColor(0, 0, 0)
    pdf.setLineWidth(0.35)
    pdf.circle(businessX + 0.8, detailsTop + 7.1, 0.8, 'S')
    pdf.circle(businessX + 0.8, detailsTop + 7.1, 0.2, 'F')
    pdf.line(businessX + 0.35, detailsTop + 7.8, businessX + 0.8, detailsTop + 9.1)
    pdf.line(businessX + 1.25, detailsTop + 7.8, businessX + 0.8, detailsTop + 9.1)
    pdf.line(businessX, detailsTop + 15.6, businessX + 1.6, detailsTop + 17.3)
    pdf.line(businessX, detailsTop + 15.6, businessX + 0.5, detailsTop + 15.4)
    pdf.line(businessX + 1.6, detailsTop + 17.3, businessX + 1.85, detailsTop + 16.8)
    pdf.rect(businessX - 0.15, detailsTop + 19.6, 2.2, 1.6)
    pdf.line(businessX - 0.15, detailsTop + 19.6, businessX + 0.95, detailsTop + 20.5)
    pdf.line(businessX + 2.05, detailsTop + 19.6, businessX + 0.95, detailsTop + 20.5)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.9)
    pdf.setTextColor(0, 0, 0)
    pdf.text(`GSTIN: ${invoiceBusiness.gstin}`, businessX, detailsTop + 25.5)

    y = 46.5
    pdf.setDrawColor(...COLORS.line)
    pdf.setLineWidth(0.35)
    pdf.line(margin, y, pageWidth - margin, y)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.2)
    pdf.setTextColor(...COLORS.dark)
    pdf.text(`Invoice No.: ${invoiceNumber}`, margin, y + 6)
    pdf.text(`Invoice Date: ${formatDate(invoiceDate)}`, pageWidth - margin, y + 6, {
      align: 'right',
    })
    pdf.text(`Order ID: ${orderNumber}`, margin, y + 10)

    y += 16
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
      if (party.gstin) {
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(...COLORS.dark)
        pdf.text(`GSTIN: ${party.gstin}`, x, sectionTop + 23)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...COLORS.muted)
      }
      const addressY = party.gstin
        ? sectionTop + 27.5
        : title === 'BILL TO' ? sectionTop + 23 : sectionTop + 18.5
      const lines = pdf.splitTextToSize(party.address, columnWidth - 3)
      pdf.text(lines.slice(0, 4), x, addressY)
    }
    drawParty('BILL TO', billing, margin)
    drawParty('SHIP TO', shipping, rightX)
    pdf.setDrawColor(...COLORS.line)
    const partyHeight = billing.gstin ? 40 : 33
    pdf.line(margin + columnWidth + gap / 2, sectionTop, margin + columnWidth + gap / 2, sectionTop + partyHeight)
    y += partyHeight + 5
  }

  const addPage = (continued = false) => {
    pdf.addPage('a4', 'portrait')
    drawBusinessHeader()
    drawPartyDetails()
    if (continued) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.setTextColor(...COLORS.green)
      pdf.text('ITEMS CONTINUED', margin, y)
      y += 5
    }
  }

  const intraStateSupply = data.taxDetails.supplyType === 'intra-state'
  const interStateSupply = data.taxDetails.supplyType === 'inter-state'
  const columns = intraStateSupply
    ? [
        { label: '#', width: 7, align: 'left' },
        { label: 'Product Description', width: 55, align: 'left', paddingLeft: 2, paddingRight: 4 },
        { label: 'HSN', width: 18, align: 'left', paddingLeft: 2, paddingRight: 2 },
        { label: 'Qty', width: 9, align: 'right' },
        { label: 'Amount', width: 24, align: 'right' },
        { label: 'CGST', width: 21, align: 'right' },
        { label: 'SGST', width: 21, align: 'right' },
        { label: 'Total', width: 29, align: 'right' },
      ]
    : [
        { label: '#', width: 7, align: 'left' },
        { label: 'Product Description', width: 70, align: 'left', paddingLeft: 2, paddingRight: 4 },
        { label: 'HSN', width: 20, align: 'left', paddingLeft: 2, paddingRight: 2 },
        { label: 'Qty', width: 10, align: 'right' },
        { label: 'Amount', width: 25, align: 'right' },
        { label: interStateSupply ? 'IGST' : 'GST', width: 23, align: 'right' },
        { label: 'Total', width: 29, align: 'right' },
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
    pdf.setFontSize(5.8)
    pdf.setTextColor(...COLORS.white)
    columns.forEach((column) => {
      const x =
        column.align === 'right'
          ? column.x + column.width - 2
          : column.x + (column.paddingLeft ?? 2)
      pdf.text(column.label.toUpperCase(), x, y + 6.3, {
        align: column.align,
      })
    })
    y += 10
  }

  const drawItems = () => {
    drawTableHeader()
    data.items.forEach((item, index) => {
      const descriptionColumn = columns[1]
      const descriptionWidth =
        descriptionColumn.width -
        descriptionColumn.paddingLeft -
        descriptionColumn.paddingRight
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(6.8)
      const descriptionLines = [
        item.productName || 'Product',
        item.variant || item.specification,
      ]
        .filter(Boolean)
        .flatMap((part) => pdf.splitTextToSize(String(part), descriptionWidth))
      const rowHeight = Math.max(
        15,
        descriptionLines.length * 3.6 + 6,
      )
      if (y + rowHeight > footerTop) {
        addPage(true)
        drawTableHeader()
      }
      if (index % 2 === 1) {
        pdf.setFillColor(249, 250, 248)
        pdf.rect(margin, y, contentWidth, rowHeight, 'F')
      }

      const taxableAmount = Number(
        item.productTotal ??
          item.taxableValue ??
          Number(item.quantity || 0) * Number(item.unitPrice || 0),
      )
      const lineTax = Number(item.lineTax || 0)
      const cgst = Number(item.cgst ?? (intraStateSupply ? lineTax / 2 : 0))
      const sgst = Number(item.sgst ?? (intraStateSupply ? lineTax - cgst : 0))
      const igst = Number(item.igst ?? (interStateSupply ? lineTax : 0))
      const values = [
        String(index + 1),
        descriptionLines,
        item.hsnCode || '-',
        String(item.quantity),
        moneyValue(item.unitPrice ?? item.unitSellingPrice),
        ...(intraStateSupply
          ? [
              { type: 'tax', value: cgst, percentage: Number(item.gstRate || 0) / 2 },
              { type: 'tax', value: sgst, percentage: Number(item.gstRate || 0) / 2 },
            ]
          : [{
              type: 'tax',
              value: interStateSupply ? igst : lineTax,
              percentage: Number(item.gstRate || 0),
            }]),
        moneyValue(item.lineTotal ?? taxableAmount + lineTax),
      ]
      columns.forEach((column, valueIndex) => {
        pdf.setFont(
          'helvetica',
          valueIndex === 1 || valueIndex === values.length - 1 ? 'bold' : 'normal',
        )
        pdf.setFontSize(valueIndex === 1 ? 6.8 : 5.7)
        pdf.setTextColor(...COLORS.dark)
        const x =
          column.align === 'right'
            ? column.x + column.width - 2
            : column.x + (column.paddingLeft ?? 2)
        const value = values[valueIndex]
        if (value?.type === 'money') {
          drawMoney(value.value, x, y + 5, {
            align: column.align,
            color: COLORS.dark,
            fontSize: valueIndex === values.length - 1 ? 5.7 : 5.7,
          })
        } else if (value?.type === 'tax') {
          drawMoney(value.value, x, y + 4.7, {
            align: column.align,
            color: COLORS.dark,
            fontSize: 5.7,
          })
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(4.7)
          pdf.setTextColor(...COLORS.muted)
          pdf.text(`(${formatTaxPercentage(value.percentage)}%)`, x, y + 9, {
            align: column.align,
          })
        } else {
          pdf.text(value, x, y + 5, {
            align: column.align,
            lineHeightFactor: 1.2,
          })
        }
      })
      pdf.setDrawColor(...COLORS.line)
      pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight)
      y += rowHeight
    })
  }

  const drawAmountSummary = () => {
    if (y + 62 > termsTop - 4) addPage(false)
    y += 7
    const summaryWidth = 96
    const summaryX = pageWidth - margin - summaryWidth
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...COLORS.dark)
    pdf.text('AMOUNT SUMMARY', summaryX, y)
    y += 4
    const taxableSubtotal = data.items.reduce(
      (sum, item) => sum + Number(
        item.productTotal ??
          item.taxableValue ??
          Number(item.quantity || 0) * Number(item.unitPrice || 0),
      ),
      0,
    )
    const deliveryIdentifier = String(
      serverInvoice.delivery?.id
      || serverInvoice.delivery?.code
      || order.deliveryId
      || order.deliveryMethodId
      || order.deliveryMethod
      || order.deliveryOption
      || serverInvoice.delivery?.method
      || ''
    ).trim().toLowerCase()

    let deliveryMethod = serverInvoice.delivery?.method || order.deliveryMethod || order.deliveryOption || 'Delivery'
    let showDeliveryCharges = Number(data.delivery) > 0

    if (deliveryIdentifier === 'porter' || deliveryIdentifier.includes('through porter')) {
      deliveryMethod = 'Through Porter'
      showDeliveryCharges = false
    } else if (
      deliveryIdentifier === 'office_pickup'
      || deliveryIdentifier === 'office-pickup'
      || deliveryIdentifier.includes('collect from office')
    ) {
      deliveryMethod = 'Collect from Office'
      showDeliveryCharges = false
    } else if (
      deliveryIdentifier === 'delivery_express'
      || deliveryIdentifier === 'delivery-express'
      || deliveryIdentifier.includes('delivery express')
      || deliveryIdentifier.includes('express delivery')
    ) {
      deliveryMethod = 'Express Delivery'
      showDeliveryCharges = true
    }

    const rows = [
      ['Subtotal (excluding GST)', moneyValue(taxableSubtotal)],
      ['Delivery Method', deliveryMethod],
    ]

    if (showDeliveryCharges) {
      rows.push(['Delivery Charges (excluding GST)', moneyValue(data.delivery)])
    }
    if (data.taxDetails.supplyType === 'intra-state') {
      rows.push(
        ['Total CGST', moneyValue(data.taxDetails.cgst)],
        ['Total SGST', moneyValue(data.taxDetails.sgst)],
      )
    } else if (data.taxDetails.supplyType === 'inter-state') {
      rows.push(['Total IGST', moneyValue(data.taxDetails.igst)])
    } else {
      rows.push(['GST', moneyValue(data.tax)])
    }
    rows.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.4)
      pdf.setTextColor(...COLORS.muted)
      pdf.text(label, summaryX, y + 5)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...COLORS.dark)
      if (value?.type === 'money') {
        drawMoney(value.value, pageWidth - margin, y + 5, {
          align: 'right',
          color: COLORS.dark,
          fontSize: 7.4,
        })
      } else {
        pdf.text(value, pageWidth - margin, y + 5, { align: 'right' })
      }
      y += 7
    })
    pdf.setFillColor(...COLORS.dark)
    pdf.rect(summaryX - 3, y, summaryWidth + 3, 13, 'F')
    pdf.setTextColor(...COLORS.white)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.2)
    pdf.text('FINAL TOTAL AMOUNT', summaryX + 2, y + 8.3)
    drawMoney(data.total, pageWidth - margin - 2, y + 8.3, {
      align: 'right',
      color: COLORS.white,
      fontSize: 9.2,
    })
    y += 19
  }

  const drawTermsAndConditions = () => {
    if (y > termsTop - 4) addPage(false)
    y = termsTop
    pdf.setDrawColor(...COLORS.line)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 7
    const terms = [
      'Goods once sold are subject to the applicable return and refund policy.',
      "Warranty is provided according to the manufacturer's terms, where applicable.",
      'Please retain this invoice for warranty, returns, and future reference.',
    ]
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...COLORS.dark)
    pdf.text('TERMS & CONDITIONS', margin, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(...COLORS.muted)
    let lineY = y + 5
    terms.forEach((term, index) => {
      const lines = pdf.splitTextToSize(`${index + 1}. ${term}`, contentWidth)
      pdf.text(lines, margin, lineY)
      lineY += lines.length * 3.2 + 1
    })
    y = lineY
  }

  drawBusinessHeader()
  drawPartyDetails()
  drawItems()
  drawAmountSummary()
  drawTermsAndConditions()

  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    pdf.setDrawColor(...COLORS.line)
    pdf.line(margin, footerTop, pageWidth - margin, footerTop)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.2)
    pdf.setTextColor(...COLORS.muted)
    pdf.text(
      'This is a computer-generated invoice and does not require a physical signature.',
      pageWidth / 2,
      footerTop + 6,
      { align: 'center' },
    )
  }

  pdf.setProperties({
    title: `${invoiceNumber} - ${invoiceBusiness.legalName} Tax Invoice`,
    subject: `Tax invoice for order ${orderNumber}`,
    author: invoiceBusiness.legalName,
    creator: invoiceBusiness.legalName,
    keywords: `tax invoice, electronics, GST, ${invoiceBusiness.legalName}`,
  })
  return { pdf, invoiceNumber }
}

export const createInvoiceDownloadName = (invoiceNumber) => {
  const safeInvoiceNumber = String(invoiceNumber || 'invoice')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return `${safeInvoiceNumber || 'invoice'}.pdf`
}

export default async function downloadInvoicePdf(
  order,
) {
  const { pdf, invoiceNumber } = await createInvoicePdfDocument(order)
  const blob = pdf.output('blob')
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = createInvoiceDownloadName(invoiceNumber)
  link.style.display = 'none'
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  }
}
