const manufacturerByBrand = {
  Pride: 'Pride Electronics Pvt. Ltd.',
  CoreForge: 'CoreForge Technologies Pvt. Ltd.',
  NovaTech: 'NovaTech Consumer Electronics Pvt. Ltd.',
  VoltEdge: 'VoltEdge Power Systems Pvt. Ltd.',
}

const includedItemsByType = {
  'Over-ear': [
    'Wireless headphones',
    'USB-C charging cable',
    '3.5 mm audio cable',
    'Travel case',
  ],
  'In-ear': [
    'Wireless earbuds with charging case',
    'USB-C charging cable',
    'Three pairs of ear tips',
  ],
  Smartwatch: [
    'Smart watch',
    'Magnetic charging cable',
    'Adjustable watch strap',
  ],
  'Expansion card': [
    'AI accelerator board',
    'Low-profile mounting bracket',
    'Installation guide',
  ],
  'Liquid cooler': [
    '360 mm radiator and pump assembly',
    'Three 120 mm fans',
    'Intel and AMD mounting hardware',
    'Thermal compound',
  ],
  'Smart glasses': [
    'AR smart glasses',
    'USB-C connection cable',
    'Protective case',
    'Cleaning cloth',
  ],
  'Desktop DAC': [
    'Desktop DAC and amplifier',
    'Power adapter',
    'USB-C cable',
    'Quick-start guide',
  ],
  'OLED monitor': [
    'OLED monitor and stand',
    'DisplayPort cable',
    'USB-C cable',
    'Power cable',
  ],
  'Mechanical keyboard': [
    'Mechanical keyboard',
    'USB-C cable',
    'Keycap and switch puller',
    '2.4 GHz receiver',
  ],
  'Development kit': [
    'ESP32-S3 development board',
    'Sensor and actuator modules',
    'Breadboard and jumper wires',
    'USB-C cable',
  ],
  'Smart ring': [
    'Smart ring',
    'Wireless charging dock',
    'USB-C charging cable',
  ],
  'Wall charger': [
    '140W GaN wall charger',
    'USB-C to USB-C cable',
    'Travel pouch',
  ],
}

const createModelNumber = (product) => {
  const nameCode = product.name
    .replace(/[^a-z0-9 ]/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.slice(0, 3).toUpperCase())
    .join('-')
  return `PE-${nameCode}-${String(product.id).padStart(3, '0')}`
}

export function getProductDetailInformation(product) {
  const type = product.attributes?.type
  const highlights = product.highlights?.length
    ? product.highlights
    : product.features?.length
      ? product.features
      : product.specs?.length
        ? product.specs.slice(0, 4)
        : [
            'Quality-tested for dependable everyday use',
            'Designed to work with the listed product specifications',
          ]
  const includedItems = product.inTheBox?.length
    ? product.inTheBox
    : includedItemsByType[type] || [
        product.name,
        'Quick-start guide',
        'Warranty documentation',
      ]

  return {
    highlights,
    includedItems,
    brand: product.brand || 'Pride',
    modelNumber: product.modelNumber || createModelNumber(product),
    sku: product.sku || `PE-${String(product.id).padStart(4, '0')}`,
    manufacturer:
      product.manufacturer ||
      manufacturerByBrand[product.brand] ||
      'Pride Electronics Pvt. Ltd.',
    countryOfOrigin: product.countryOfOrigin || 'India',
    warranty:
      product.warranty ||
      '2-year limited manufacturer warranty covering manufacturing defects.',
    returnPolicy:
      product.returnPolicy ||
      'Eligible for return or replacement within 7 days of delivery when unused and retained with the original packaging and accessories.',
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
