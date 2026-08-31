export function getProductDetailInformation(product) {
  const highlights = product.highlights?.length
    ? product.highlights
    : product.features?.length
      ? product.features
      : []
  const includedItems = product.inTheBox?.length ? product.inTheBox : []

  return {
    highlights,
    includedItems,
    brand: product.brand || '',
    modelNumber: product.modelNumber || '',
    sku: product.sku || '',
    manufacturer: product.manufacturer || '',
    countryOfOrigin: product.countryOfOrigin || '',
    warranty: product.warranty || '',
    returnPolicy: product.returnPolicy || '',
  }
}

export function getDeliveryEstimate(stock, now = new Date()) {
  if (stock <= 0) return null
  const minimumDays = stock <= 10 ? 3 : 2
  const maximumDays = stock <= 10 ? 5 : 4
  const start = new Date(now)
  const end = new Date(now)
  start.setDate(start.getDate() + minimumDays)
  end.setDate(end.getDate() + maximumDays)
  const formatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  })
  return `${formatter.format(start)}–${formatter.format(end)}`
}
