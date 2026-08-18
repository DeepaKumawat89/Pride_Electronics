export const initialShippingSettings = {
  standardCharge: 99,
  freeShippingThreshold: 999,
  expressCharge: 199,
  standardMinDays: 3,
  standardMaxDays: 5,
  expressMinDays: 1,
  expressMaxDays: 2,
  deliveryAreas: [
    {
      id: 'area-india',
      name: 'India service area',
      pinPrefixes: ['1', '2', '3', '4', '5', '6', '7', '8'],
      leadDays: 3,
      enabled: true,
    },
  ],
  couriers: [
    {
      id: 'courier-delhivery',
      name: 'Delhivery',
      trackingUrl: 'https://www.delhivery.com/track/package/',
      enabled: true,
      pickupEnabled: true,
    },
    {
      id: 'courier-bluedart',
      name: 'Blue Dart',
      trackingUrl: 'https://www.bluedart.com/tracking',
      enabled: true,
      pickupEnabled: true,
    },
  ],
  pickup: {
    enabled: true,
    processingHours: 24,
    address: 'Pride Electronics Fulfillment Centre, Pune, Maharashtra',
  },
}
