export const initialOrders = [
  {
    id: 'ORD-9482',
    customer: 'Alex Mercer',
    email: 'alex.m@techdev.com',
    date: '2026-08-07',
    total: '₹28,998.00',
    itemsCount: 2,
    status: 'Processing',
    paymentMethod: 'Credit Card',
    items: [
      { productName: 'Quantum NPU AI Accelerator Board', qty: 1, price: '₹16,499' },
      { productName: 'Aurora Pro ANC Wireless Headphones', qty: 1, price: '₹12,499' }
    ]
  },
  {
    id: 'ORD-9481',
    customer: 'Sarah Connor',
    email: 'sarah@cyberdyne.io',
    date: '2026-08-06',
    total: '₹49,999.00',
    itemsCount: 1,
    status: 'Shipped',
    paymentMethod: 'UPI / NetBanking',
    items: [
      { productName: 'Prism 34" Curved OLED Gaming Monitor', qty: 1, price: '₹49,999' }
    ]
  },
  {
    id: 'ORD-9480',
    customer: 'David Miller',
    email: 'dmiller@robotics.org',
    date: '2026-08-05',
    total: '₹14,999.00',
    itemsCount: 1,
    status: 'Delivered',
    paymentMethod: 'UPI / QR',
    items: [
      { productName: 'Velvet Smart Watch Ultra', qty: 1, price: '₹14,999' }
    ]
  },
  {
    id: 'ORD-9479',
    customer: 'Elena Rostova',
    email: 'elena@soundlabs.com',
    date: '2026-08-04',
    total: '₹18,499.00',
    itemsCount: 1,
    status: 'Delivered',
    paymentMethod: 'Credit Card',
    items: [
      { productName: 'Apex DAC Studio Amplifier', qty: 1, price: '₹18,499' }
    ]
  },
  {
    id: 'ORD-9478',
    customer: 'Marcus Vance',
    email: 'mvance@iotmaker.net',
    date: '2026-08-03',
    total: '₹10,498.00',
    itemsCount: 2,
    status: 'Pending',
    paymentMethod: 'Pay on Delivery',
    items: [
      { productName: 'Microcontroller IoT Starter Kit', qty: 1, price: '₹5,499' },
      { productName: 'GaN III 140W Ultra Fast Charger', qty: 1, price: '₹4,999' }
    ]
  }
]

export const initialCustomers = [
  {
    id: 'USR-101',
    name: 'Alex Mercer',
    email: 'alex.m@techdev.com',
    role: 'Customer',
    ordersCount: 4,
    totalSpent: '₹98,400.00',
    status: 'Active',
    joinedDate: '2025-11-12'
  },
  {
    id: 'USR-102',
    name: 'Sarah Connor',
    email: 'sarah@cyberdyne.io',
    role: 'VIP Buyer',
    ordersCount: 8,
    totalSpent: '₹3,12,900.00',
    status: 'Active',
    joinedDate: '2025-08-20'
  },
  {
    id: 'USR-103',
    name: 'David Miller',
    email: 'dmiller@robotics.org',
    role: 'Customer',
    ordersCount: 2,
    totalSpent: '₹34,500.00',
    status: 'Active',
    joinedDate: '2026-01-15'
  },
  {
    id: 'USR-104',
    name: 'Elena Rostova',
    email: 'elena@soundlabs.com',
    role: 'Pro Member',
    ordersCount: 6,
    totalSpent: '₹1,85,000.00',
    status: 'Active',
    joinedDate: '2025-09-04'
  },
  {
    id: 'USR-105',
    name: 'Marcus Vance',
    email: 'mvance@iotmaker.net',
    role: 'Customer',
    ordersCount: 1,
    totalSpent: '₹10,498.00',
    status: 'Pending Verification',
    joinedDate: '2026-08-01'
  }
]
