const { createHash } = require('node:crypto')
const {
  db,
  indiaOrderMoment,
} = require('../shared/core')
const { cashfreeClientId, cashfreeClientSecret } = require('./cashfree-secrets')
const {
  createCashfreeRefund,
  getCashfreeRefund,
} = require('./cashfree-api')

const NONTERMINAL_REFUND_STATUSES = new Set([
  'PENDING', 'PENDING_APPROVAL', 'ONHOLD', 'PROCESSING', 'REQUEST_FAILED',
])
const TERMINAL_REFUND_FAILURES = new Set([
  'FAILED', 'CANCELLED', 'REJECTED',
])
const SUPPORTED_REFUND_STATUSES = new Set([
  'SUCCESS', ...NONTERMINAL_REFUND_STATUSES, ...TERMINAL_REFUND_FAILURES,
])

function refundIdentity(providerOrderId, paymentId, amountPaise) {
  const refundHash = createHash('sha256')
    .update(`${providerOrderId}:${paymentId}:${amountPaise}`)
    .digest('hex')
  // Deterministic UUID v4-shaped key: all retries of this logical refund reuse it.
  const idempotencyKey = `${refundHash.slice(0, 8)}-${refundHash.slice(8, 12)}-4${refundHash.slice(13, 16)}-a${refundHash.slice(17, 20)}-${refundHash.slice(20, 32)}`
  return {
    refundHash,
    refundId: `pcrf${refundHash.slice(0, 24)}`,
    idempotencyKey,
  }
}

function displayStatus(providerStatus) {
  if (providerStatus === 'SUCCESS') return 'Refunded'
  if (TERMINAL_REFUND_FAILURES.has(providerStatus) || providerStatus === 'REQUEST_FAILED') {
    return 'Action Required'
  }
  return 'Processing'
}

function statusRank(providerStatus) {
  if (providerStatus === 'SUCCESS') return 3
  if (TERMINAL_REFUND_FAILURES.has(providerStatus)) return 2
  return 1
}

async function applyCashfreeRefundStatus({
  refundReference,
  providerRefund,
  providerStatus: suppliedStatus,
  providerRefundId,
  eventReference = null,
}) {
  const providerStatus = String(
    suppliedStatus || providerRefund?.refund_status || '',
  ).toUpperCase()
  if (!SUPPORTED_REFUND_STATUSES.has(providerStatus) || providerStatus === 'REQUEST_FAILED') {
    throw new Error('Cashfree returned an unsupported refund status.')
  }

  const refundSnapshot = await refundReference.get()
  if (!refundSnapshot.exists) return null
  const refundBefore = refundSnapshot.data()
  const orderReference = db.doc(`orders/${refundBefore.orderId}`)
  const invoiceReference = db.doc(`invoices/${refundBefore.orderId}`)
  const returnQuery = providerStatus === 'SUCCESS'
    ? await db.collection('returns').where('orderId', '==', refundBefore.orderId).get()
    : { docs: [] }
  const now = new Date().toISOString()

  return db.runTransaction(async (transaction) => {
    const references = [refundReference, orderReference, invoiceReference]
    if (eventReference) references.push(eventReference)
    const returnReferences = returnQuery.docs.map((document) => document.ref)
    references.push(...returnReferences)
    const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)))
    const refundDocument = snapshots[0]
    const orderDocument = snapshots[1]
    const invoiceDocument = snapshots[2]
    const eventDocument = eventReference ? snapshots[3] : null
    const returnDocuments = snapshots.slice(eventReference ? 4 : 3)
    if (!refundDocument.exists) return null
    if (eventDocument?.exists) return refundDocument.data()

    const current = refundDocument.data()
    const currentStatus = String(current.providerStatus || '').toUpperCase()
    const incomingRank = statusRank(providerStatus)
    const currentRank = statusRank(currentStatus)
    const shouldAdvance = incomingRank >= currentRank
    if (eventReference) {
      transaction.create(eventReference, {
        provider: 'cashfree',
        providerRefundId: String(providerRefundId || providerRefund?.cf_refund_id || current.providerRefundId || ''),
        providerStatus,
        createdAt: now,
      })
    }
    if (!shouldAdvance) return current

    const resolvedProviderRefundId = String(
      providerRefundId || providerRefund?.cf_refund_id || current.providerRefundId || current.refundId || '',
    )
    transaction.set(refundReference, {
      ...(providerRefund || {}),
      provider: 'cashfree',
      providerRefundId: resolvedProviderRefundId,
      providerStatus,
      status: displayStatus(providerStatus),
      requestState: '',
      requestLeaseUntil: '',
      updatedAt: now,
      ...(providerRefund?.refund_arn ? { refundArn: String(providerRefund.refund_arn) } : {}),
    }, { merge: true })

    const isPrimaryPayment = orderDocument?.exists &&
      current.paymentId === orderDocument.data().transactionId
    if (isPrimaryPayment) {
      const order = orderDocument.data()
      const isSuccess = providerStatus === 'SUCCESS'
      const nextPaymentStatus = isSuccess
        ? 'Refunded'
        : TERMINAL_REFUND_FAILURES.has(providerStatus) || providerStatus === 'REQUEST_FAILED'
          ? 'Refund Action Required'
          : 'Refund Pending'
      transaction.update(orderReference, {
        paymentStatus: nextPaymentStatus,
        ...(isSuccess ? { status: 'Refunded' } : {}),
        ...(isSuccess && order.status !== 'Refunded' ? {
          statusHistory: [...(order.statusHistory || []), {
            status: 'Refunded', ...indiaOrderMoment(now),
          }],
        } : {}),
        updatedAt: now,
      })
      if (isSuccess && invoiceDocument?.exists) {
        const invoice = invoiceDocument.data().invoice || {}
        transaction.update(invoiceReference, {
          invoice: {
            ...invoice,
            payment: { ...(invoice.payment || {}), status: 'Refunded' },
          },
          updatedAt: now,
        })
      }
    }

    if (providerStatus === 'SUCCESS') {
      returnDocuments.forEach((returnDocument) => {
        if (!returnDocument?.exists || returnDocument.data().status !== 'Refund Processing') return
        const saved = returnDocument.data()
        transaction.update(returnDocument.ref, {
          status: 'Completed',
          refundStatus: 'Completed',
          updatedAt: now,
          history: [...(saved.history || []), {
            status: 'Completed',
            note: 'Cashfree confirmed the refund',
            timestamp: now,
          }],
        })
      })
    }
    return { ...current, providerRefundId: resolvedProviderRefundId, providerStatus, status: displayStatus(providerStatus), updatedAt: now }
  })
}

async function markRefundActionRequired(refundReference, orderReference, paymentId, message) {
  const now = new Date().toISOString()
  await db.runTransaction(async (transaction) => {
    const [refundDocument, orderDocument] = await Promise.all([
      transaction.get(refundReference), transaction.get(orderReference),
    ])
    if (!refundDocument.exists || String(refundDocument.data().providerStatus).toUpperCase() === 'SUCCESS') return
    transaction.set(refundReference, {
      providerStatus: 'REQUEST_FAILED',
      status: 'Action Required',
      requestState: '',
      requestLeaseUntil: '',
      reconciliationMessage: String(message || 'Cashfree refund status needs review.').slice(0, 160),
      updatedAt: now,
    }, { merge: true })
    if (orderDocument.exists && paymentId === orderDocument.data().transactionId) {
      transaction.update(orderReference, { paymentStatus: 'Refund Action Required', updatedAt: now })
    }
  })
}

async function requestVerifiedCashfreeRefund(orderReference, order, payment) {
  const paymentId = String(payment?.cf_payment_id || '')
  const amountPaise = Math.round(Number(payment?.payment_amount) * 100)
  if (
    String(payment?.payment_status || '').toUpperCase() !== 'SUCCESS' || !paymentId ||
    !Number.isSafeInteger(amountPaise) || amountPaise !== Number(order.totalPaise) ||
    String(payment?.payment_currency || '').toUpperCase() !== 'INR' ||
    !order.cashfreeOrderId
  ) throw new Error('Cashfree payment is not eligible for refund.')

  const identity = refundIdentity(order.cashfreeOrderId, paymentId, amountPaise)
  const refundReference = db.doc(`refunds/cashfree_${orderReference.id}_${identity.refundHash.slice(0, 12)}`)
  const now = new Date().toISOString()
  const requestLeaseUntil = new Date(Date.now() + 2 * 60 * 1000).toISOString()
  const note = `Pride Circuit refund ${order.orderNumber || orderReference.id}`.slice(0, 100)

  const claim = await db.runTransaction(async (transaction) => {
    const [refundDocument, orderDocument] = await Promise.all([
      transaction.get(refundReference), transaction.get(orderReference),
    ])
    if (!orderDocument.exists) throw new Error('Order not found while recording refund.')
    const existing = refundDocument.exists ? refundDocument.data() : null
    if (String(existing?.providerStatus || '').toUpperCase() === 'SUCCESS') {
      return { complete: true, activeLease: false, refund: existing, providerStatus: 'SUCCESS' }
    }
    const leaseTime = Date.parse(existing?.requestLeaseUntil || '')
    if (existing?.requestState === 'SUBMITTING' && Number.isFinite(leaseTime) && leaseTime > Date.now()) {
      return { complete: false, activeLease: true, refund: existing, providerStatus: String(existing.providerStatus || 'PENDING') }
    }
    const initial = {
      orderId: orderReference.id,
      paymentId,
      provider: 'cashfree',
      providerOrderId: order.cashfreeOrderId,
      refundId: existing?.refundId || identity.refundId,
      providerRefundId: existing?.providerRefundId || existing?.refundId || identity.refundId,
      idempotencyKey: identity.idempotencyKey,
      amountPaise,
      amount: amountPaise / 100,
      note,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      requestState: 'SUBMITTING',
      requestLeaseUntil,
      status: existing?.status || 'Processing',
      providerStatus: existing?.providerStatus || 'PENDING',
    }
    transaction.set(refundReference, initial, { merge: true })
    if (paymentId === orderDocument.data().transactionId) {
      transaction.update(orderReference, { paymentStatus: 'Refund Pending', updatedAt: now })
    }
    return {
      complete: false,
      activeLease: false,
      existing: Boolean(existing),
      providerStatus: String(initial.providerStatus).toUpperCase(),
      refund: initial,
    }
  })

  if (claim.complete || claim.activeLease) return claim.refund

  const merchantRefundId = String(claim.refund?.refundId || identity.refundId)
  try {
    const remoteRefund = await getCashfreeRefund(order.cashfreeOrderId, merchantRefundId, {
      cashfreeClientId, cashfreeClientSecret,
    })
    if (remoteRefund) {
      const result = await applyCashfreeRefundStatus({
        refundReference,
        providerRefund: remoteRefund,
        providerRefundId: remoteRefund.cf_refund_id,
      })
      return result || (await refundReference.get()).data()
    }

    const alreadyExists = claim.existing
    const previousStatus = claim.providerStatus
    if (alreadyExists && previousStatus !== 'REQUEST_FAILED') {
      await db.runTransaction(async (transaction) => {
        const current = await transaction.get(refundReference)
        if (current.exists && String(current.data().providerStatus).toUpperCase() !== 'SUCCESS') {
          transaction.set(refundReference, {
            requestState: '', requestLeaseUntil: '', updatedAt: new Date().toISOString(),
          }, { merge: true })
        }
      })
      return (await refundReference.get()).data()
    }

    const createdRefund = await createCashfreeRefund(order.cashfreeOrderId, {
      refundId: merchantRefundId,
      idempotencyKey: identity.idempotencyKey,
      amountPaise,
      note,
    }, { cashfreeClientId, cashfreeClientSecret })
    const providerStatus = String(createdRefund?.refund_status || '').toUpperCase()
    if (!SUPPORTED_REFUND_STATUSES.has(providerStatus)) {
      throw new Error('Cashfree refund response did not include a supported status.')
    }
    const result = await applyCashfreeRefundStatus({
      refundReference,
      providerRefund: createdRefund,
      providerRefundId: createdRefund.cf_refund_id,
    })
    return result || (await refundReference.get()).data()
  } catch (error) {
    await markRefundActionRequired(
      refundReference,
      orderReference,
      paymentId,
      error.message,
    )
    console.error('Cashfree refund initiation or reconciliation requires review', {
      orderId: orderReference.id,
      status: error.providerStatus || 0,
    })
    throw error
  }
}

async function reconcileCashfreeRefundWebhook({
  refundReference,
  providerRefundId,
  providerStatus,
  eventReference,
}) {
  return applyCashfreeRefundStatus({
    refundReference,
    providerRefundId,
    providerStatus,
    eventReference,
  })
}

async function reconcilePendingCashfreeRefunds() {
  const pendingStatuses = [
    'PENDING', 'PENDING_APPROVAL', 'ONHOLD', 'PROCESSING', 'REQUEST_FAILED',
    'FAILED', 'CANCELLED', 'REJECTED',
  ]
  const cursorReference = db.doc('_internalJobs/cashfreeRefundReconciliation')
  const cursorDocument = await cursorReference.get()
  const lastRefundId = String(cursorDocument.data()?.lastRefundId || '')
  let query = db.collection('refunds')
    .where('providerStatus', 'in', pendingStatuses)
    .limit(40)
  if (lastRefundId) {
    const cursor = await db.doc(`refunds/${lastRefundId}`).get()
    if (cursor.exists) query = query.startAfter(cursor)
  }
  let documents = await query.get()
  if (documents.empty && lastRefundId) {
    await cursorReference.set({ lastRefundId: '', updatedAt: new Date().toISOString() }, { merge: true })
    documents = await db.collection('refunds')
      .where('providerStatus', 'in', pendingStatuses)
      .limit(40)
      .get()
  }
  if (documents.empty) return { checked: 0 }

  let checked = 0
  for (const refundDocument of documents.docs) {
    await cursorReference.set({ lastRefundId: refundDocument.id, updatedAt: new Date().toISOString() }, { merge: true })
    const refund = refundDocument.data()
    if (refund.provider !== 'cashfree' || !refund.providerOrderId || !refund.refundId) continue
    const updatedAt = Date.parse(refund.updatedAt || '')
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt < 5 * 60 * 1000) continue
    checked += 1
    try {
      const providerRefund = await getCashfreeRefund(refund.providerOrderId, refund.refundId, {
        cashfreeClientId, cashfreeClientSecret,
      })
      if (!providerRefund) continue
      await applyCashfreeRefundStatus({
        refundReference: refundDocument.ref,
        providerRefund,
        providerRefundId: providerRefund.cf_refund_id,
      })
    } catch (error) {
      console.error('Cashfree refund reconciliation failed', {
        orderId: refund.orderId,
        status: error.providerStatus || 0,
      })
    }
  }
  return { checked }
}

module.exports = {
  NONTERMINAL_REFUND_STATUSES,
  TERMINAL_REFUND_FAILURES,
  SUPPORTED_REFUND_STATUSES,
  refundIdentity,
  applyCashfreeRefundStatus,
  requestVerifiedCashfreeRefund,
  reconcileCashfreeRefundWebhook,
  reconcilePendingCashfreeRefunds,
}
