import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createRequire } from 'node:module'
import { after, before, beforeEach, test } from 'node:test'

const functionsRequire = createRequire(
  new URL('../functions/package.json', import.meta.url),
)

let adminApp
let adminAuth
let AdminTimestamp
let db
let deployedFunctions
let orderSequence = 0

const address = {
  fullName: 'Inventory Test User',
  phone: '9876543210',
  line1: '42 Test Street',
  city: 'Jaipur',
  state: 'Rajasthan',
  pincode: '302001',
}

const checkoutPayload = (requestId) => ({
  requestId,
  checkoutMode: 'cart',
  items: [{ productId: 'LAST_UNIT', quantity: 1 }],
  deliveryId: 'standard',
  shippingAddress: address,
  billingAddress: address,
  receipt: `receipt_${requestId}`,
})

const invoke = (uid, operation, payload) =>
  deployedFunctions[operation].run({
    auth: { uid, token: {} },
    data: payload,
  })

before(async () => {
  process.env.GCLOUD_PROJECT = 'demo-pride-electronics'
  process.env.RAZORPAY_KEY_ID = 'rzp_test_inventory123'
  process.env.RAZORPAY_KEY_SECRET = 'inventory_test_secret'
  process.env.CASHFREE_CLIENT_ID = 'TEST_cashfree_client'
  process.env.CASHFREE_CLIENT_SECRET = 'cashfree_test_secret'
  process.env.CASHFREE_ENV = 'sandbox'

  const { getApp } = functionsRequire('firebase-admin/app')
  const { getAuth } = functionsRequire('firebase-admin/auth')
  const { getFirestore, Timestamp } = functionsRequire('firebase-admin/firestore')
  deployedFunctions = functionsRequire('./index.js')
  adminApp = getApp()
  adminAuth = getAuth(adminApp)
  AdminTimestamp = Timestamp
  db = getFirestore(adminApp)

  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/verification/gstin')) {
      return {
        ok: true,
        json: async () => ({
          reference_id: 19,
          GSTIN: '29AAICP2912R1ZR',
          legal_name_of_business: 'VERIFIED INDUSTRIES LIMITED',
          trade_name_of_business: 'VERIFIED INDUSTRIES',
          date_of_registration: '2017-09-30',
          taxpayer_type: 'Regular',
          gst_in_status: 'Active',
          principal_place_address: '1 Verified Road, Bengaluru, Karnataka 560001',
          valid: true,
        }),
      }
    }
    if (String(url).endsWith('/v1/orders')) {
      orderSequence += 1
      const id = `order_test${String(orderSequence).padStart(6, '0')}`
      return {
        ok: true,
        json: async () => ({
          id,
          amount: 10000,
          currency: 'INR',
          status: 'created',
          receipt: `receipt_${orderSequence}`,
        }),
      }
    }
    const refundMatch = String(url).match(
      /\/v1\/payments\/(pay_[a-zA-Z0-9]+)\/refund$/,
    )
    if (refundMatch) {
      return {
        ok: true,
        json: async () => ({
          id: `rfnd_${refundMatch[1].slice(4)}`,
          amount: 10000,
          status: 'processed',
          created_at: Math.floor(Date.now() / 1000),
        }),
      }
    }
    const paymentMatch = String(url).match(/\/v1\/payments\/(pay_[a-zA-Z0-9]+)$/)
    if (paymentMatch) {
      return {
        ok: true,
        json: async () => ({
          id: paymentMatch[1],
          order_id: globalThis.currentRazorpayOrderId,
          amount: 10000,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          created_at: Math.floor(Date.now() / 1000),
        }),
      }
    }
    throw new Error(`Unexpected Razorpay request: ${url}`)
  }
})

beforeEach(async () => {
  orderSequence = 0
  const collections = await db.listCollections()
  await Promise.all(
    collections.map(async (collection) => {
      const snapshot = await collection.get()
      await Promise.all(snapshot.docs.map((document) => document.ref.delete()))
    }),
  )
  for (const uid of ['BUYER_A', 'BUYER_B']) {
    try {
      await adminAuth.deleteUser(uid)
    } catch {
      // The Auth emulator is empty on the first run.
    }
    await adminAuth.createUser({
      uid,
      email: `${uid.toLowerCase()}@example.com`,
      displayName: uid,
    })
    await db.doc(`users/${uid}`).set({
      uid,
      name: uid,
      email: `${uid.toLowerCase()}@example.com`,
      role: 'customer',
      cartItems: [{ productId: 'LAST_UNIT', quantity: 1 }],
    })
  }
  await Promise.all([
    db.doc('products/LAST_UNIT').set({
      name: 'Last available unit',
      sku: 'LAST-1',
      price: 100,
      stock: 1,
      reservedStock: 0,
      enabled: true,
    }),
    db.doc('settings/storefront').set({
      payment: {
        razorpayEnabled: true,
        testMode: true,
        autoCapture: true,
        cardsEnabled: true,
        upiEnabled: true,
        netBankingEnabled: true,
        walletsEnabled: true,
      },
    }),
    db.doc('settings/shipping').set({
      freeShippingThreshold: 0,
      standardCharge: 0,
    }),
    db.doc('settings/invoice').set({
      tax: { gstEnabled: false },
      numbering: { prefix: 'TEST-', nextNumber: 1, padding: 4 },
    }),
  ])
})

after(async () => {
  const { deleteApp } = functionsRequire('firebase-admin/app')
  await deleteApp(adminApp)
})

test('two buyers competing for the last unit produce exactly one reservation', async () => {
  const attempts = await Promise.allSettled([
    invoke('BUYER_A', 'createRazorpayOrder', checkoutPayload('request_A_0001')),
    invoke('BUYER_B', 'createRazorpayOrder', checkoutPayload('request_B_0001')),
  ])
  const fulfilled = attempts.filter((attempt) => attempt.status === 'fulfilled')
  const rejected = attempts.filter((attempt) => attempt.status === 'rejected')

  assert.equal(fulfilled.length, 1)
  assert.equal(rejected.length, 1)
  assert.equal(rejected[0].reason.code, 'resource-exhausted')

  const product = (await db.doc('products/LAST_UNIT').get()).data()
  const reservations = await db.collection('stockReservations').get()
  assert.equal(product.reservedStock, 1)
  assert.equal(reservations.size, 1)
  assert.equal(reservations.docs[0].data().status, 'active')
})

test('GST verification saves only provider-returned details under the user', async () => {
  const result = await invoke('BUYER_A', 'verifyGstin', {
    gstin: '29AAICP2912R1ZR',
    legalName: 'FORGED CLIENT NAME',
    address: 'FORGED CLIENT ADDRESS',
  })
  const profile = (await db.doc('users/BUYER_A').get()).data()

  assert.equal(result.valid, true)
  assert.equal(result.legalName, 'VERIFIED INDUSTRIES LIMITED')
  assert.equal(profile.gstDetails.legalName, 'VERIFIED INDUSTRIES LIMITED')
  assert.equal(profile.gstDetails.address, '1 Verified Road, Bengaluru, Karnataka 560001')
  assert.equal(profile.gstDetails.verificationProvider, 'cashfree')
  assert.equal(profile.gstProfiles.length, 1)
})

test('failed checkout releases its reservation atomically', async () => {
  await invoke('BUYER_A', 'createRazorpayOrder', checkoutPayload('request_A_0002'))
  const result = await invoke('BUYER_A', 'releaseRazorpayReservation', {
    requestId: 'request_A_0002',
    reason: 'Test payment failure',
  })

  assert.equal(result.released, true)
  assert.equal((await db.doc('products/LAST_UNIT').get()).data().reservedStock, 0)
  assert.equal(
    (await db.doc('stockReservations/BUYER_A_request_A_0002').get()).data().status,
    'released',
  )
})

test('scheduled timeout cleanup releases abandoned reservations', async () => {
  const checkout = await invoke(
    'BUYER_A',
    'createRazorpayOrder',
    checkoutPayload('request_A_0004'),
  )
  await db.doc(`stockReservations/${checkout.reservation.id}`).update({
    expiresAt: AdminTimestamp.fromMillis(Date.now() - 1000),
  })

  await deployedFunctions.releaseExpiredStockReservations.run({})

  assert.equal((await db.doc('products/LAST_UNIT').get()).data().reservedStock, 0)
  assert.equal(
    (await db.doc(`stockReservations/${checkout.reservation.id}`).get()).data().status,
    'expired',
  )

  globalThis.currentRazorpayOrderId = checkout.order.id
  const latePaymentId = 'pay_late000001'
  const lateSignature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${checkout.order.id}|${latePaymentId}`)
    .digest('hex')
  await assert.rejects(
    invoke('BUYER_A', 'verifyRazorpayPayment', {
      razorpay_order_id: checkout.order.id,
      razorpay_payment_id: latePaymentId,
      razorpay_signature: lateSignature,
    }),
    (error) => error.code === 'failed-precondition',
  )
  assert.equal(
    (await db.doc(`paymentIntents/${checkout.order.id}`).get()).data().refundStatus,
    'processed',
  )
})

test('server verification consumes the existing hold without reserving twice', async () => {
  const checkout = await invoke(
    'BUYER_A',
    'createRazorpayOrder',
    checkoutPayload('request_A_0003'),
  )
  globalThis.currentRazorpayOrderId = checkout.order.id
  const paymentId = 'pay_test000001'
  const signature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${checkout.order.id}|${paymentId}`)
    .digest('hex')

  const verification = await invoke('BUYER_A', 'verifyRazorpayPayment', {
    razorpay_order_id: checkout.order.id,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  })
  assert.equal(verification.verified, true)

  const placed = await invoke('BUYER_A', 'placeOrder', {
    order: {
      clientRequestId: 'request_A_0003',
      checkoutMode: 'cart',
      items: [{ productId: 'LAST_UNIT', quantity: 1 }],
      shippingAddress: address,
      billingAddress: address,
      paymentMethod: 'UPI via Razorpay Test Mode',
      razorpayOrderId: checkout.order.id,
      razorpayPaymentId: paymentId,
    },
  })

  assert.equal(placed.order.paymentStatus, 'Paid')
  assert.equal(placed.order.invoice.generatedBy, 'server')
  assert.match(placed.order.invoice.invoiceNumber, /^TEST-\/\d{2}-\d{2}\/0001$/)
  assert.equal(placed.order.invoice.amounts.total, 100)
  assert.equal(placed.order.inventoryState, 'reserved')
  assert.equal((await db.doc('products/LAST_UNIT').get()).data().reservedStock, 1)
  assert.equal(
    (await db.doc(`stockReservations/${checkout.reservation.id}`).get()).data().status,
    'consumed',
  )
})
