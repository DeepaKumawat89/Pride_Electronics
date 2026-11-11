const { updateUserProfile } = require('./authentication/update-user-profile')
const {
  releaseExpiredStockReservations,
} = require('./payments/release-expired-stock-reservations')
const { placeOrder } = require('./orders/place-order')
const { saveAccountState } = require('./account/save-account-state')
const { removeCartItems } = require('./account/remove-cart-items')
const { getMyCouponUsage } = require('./account/get-my-coupon-usage')
const { getOrderInvoice } = require('./orders/get-order-invoice')
const { createReturn } = require('./orders/create-return')
const { cancelOrder } = require('./orders/cancel-order')
const { submitOrderFeedback } = require('./orders/submit-order-feedback')
const {
  updateInvoiceSettings,
} = require('./admin/update-invoice-settings')
const {
  updateCustomerStatus,
} = require('./admin/update-customer-status')
const { sitemap } = require('./sitemap')

module.exports = {
  updateUserProfile,
  releaseExpiredStockReservations,
  placeOrder,
  saveAccountState,
  removeCartItems,
  getMyCouponUsage,
  getOrderInvoice,
  createReturn,
  cancelOrder,
  submitOrderFeedback,
  updateInvoiceSettings,
  updateCustomerStatus,
  sitemap,
}
