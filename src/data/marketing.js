export const initialMarketingSettings = {
  homeBanner: {
    enabled: true,
    eyebrow: 'New season tech',
    title: 'Power your',
    accent: 'everyday.',
    description:
      'Thoughtfully selected electronics for work, play, and everything in between. Premium performance without the premium markup.',
    primaryAction: 'Shop collection',
    secondaryAction: 'Watch the story',
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1100&q=90',
    productLabel: "Editor’s pick",
    productName: 'Sonic Pulse Pro',
    productPrice: 'From ₹8,999',
    discountLabel: '25%',
  },
  promotionalBanner: {
    enabled: true,
    eyebrow: 'Members get more',
    title: 'Join Pride+ and get ₹500 off your first order.',
    description:
      'Early access to drops, members-only prices, and free express delivery. No subscription needed.',
    actionLabel: 'Get started',
  },
  featuredProductIds: [1, 2, 3, 4],
  flashSale: {
    enabled: true,
    eyebrow: 'Everyday intelligence',
    title: 'Smarter tech for every move.',
    description:
      'Stay connected, active, and effortlessly in control throughout your day.',
    actionLabel: 'Explore the edit',
    productId: 2,
    startDate: '2026-08-01',
    endDate: '2026-12-31',
  },
  deal: {
    enabled: true,
    eyebrow: 'Performance lab',
    title: 'Build without limits.',
    description:
      'High-performance components selected for ambitious setups and bold ideas.',
    actionLabel: 'Discover performance',
    productId: 3,
  },
  categoryPromotions: [
    { name: 'Audio', label: 'Audio & sound', enabled: true },
    { name: 'Wearables', label: 'Smart wearables', enabled: true },
    { name: 'Peripherals', label: 'Workspace gear', enabled: true },
    { name: 'Components & DIY', label: 'Components & DIY', enabled: true },
    { name: 'Smart Power', label: 'Power & charging', enabled: true },
  ],
}
