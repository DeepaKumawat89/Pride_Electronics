const {
  db,
  onCall,
  callableOptions,
  requireActiveCustomer,
} = require('../shared/core')

async function getMyCouponUsageHandler(request) {
  const uid = await requireActiveCustomer(request)
  const usageDocuments = await db.collection('couponUsages').where('userId', '==', uid).get()
  return {
    usage: Object.fromEntries(
      usageDocuments.docs.map((usageDocument) => {
        const usage = usageDocument.data()
        return [String(usage.code || usage.couponId), Number(usage.count || 0)]
      }),
    ),
  }
}

const getMyCouponUsage = onCall(callableOptions, getMyCouponUsageHandler)


module.exports = { getMyCouponUsage, getMyCouponUsageHandler }

