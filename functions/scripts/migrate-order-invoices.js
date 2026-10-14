const { initializeApp } = require('firebase-admin/app')
const {
  FieldPath,
  FieldValue,
  getFirestore,
} = require('firebase-admin/firestore')

initializeApp()

const db = getFirestore()
const PAGE_SIZE = 200

async function migrateOrderInvoices() {
  let lastOrderId = ''
  let migrated = 0

  while (true) {
    let ordersQuery = db
      .collection('orders')
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE)
    if (lastOrderId) ordersQuery = ordersQuery.startAfter(lastOrderId)

    const orders = await ordersQuery.get()
    if (orders.empty) break

    const legacyOrders = orders.docs.filter((document) =>
      Object.prototype.hasOwnProperty.call(document.data(), 'invoice'),
    )
    if (legacyOrders.length) {
      const invoiceReferences = legacyOrders.map((document) =>
        db.doc(`invoices/${document.id}`),
      )
      const existingInvoices = await db.getAll(...invoiceReferences)
      const batch = db.batch()

      legacyOrders.forEach((orderDocument, index) => {
        const order = orderDocument.data()
        if (
          !existingInvoices[index].exists &&
          order.invoice &&
          typeof order.invoice === 'object'
        ) {
          batch.create(invoiceReferences[index], {
            orderId: orderDocument.id,
            userId: order.userId,
            invoice: order.invoice,
            createdAt: order.invoice.invoiceDate || order.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
        batch.update(orderDocument.ref, { invoice: FieldValue.delete() })
      })

      await batch.commit()
      migrated += legacyOrders.length
      console.log(`Migrated ${migrated} legacy order invoices.`)
    }

    lastOrderId = orders.docs.at(-1).id
    if (orders.size < PAGE_SIZE) break
  }

  console.log(`Invoice migration complete. ${migrated} order(s) migrated.`)
}

migrateOrderInvoices().catch((error) => {
  console.error('Invoice migration failed.', error)
  process.exitCode = 1
})
