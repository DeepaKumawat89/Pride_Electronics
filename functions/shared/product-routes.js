const productPath = (product) => {
  const identifier = product?.slug || product?.id || ''
  return `/product/${encodeURIComponent(String(identifier))}`
}

exports.productPath = productPath
