import { useState } from 'react'
import UserApp from './user/UserApp'
import AdminApp from './admin/AdminApp'
import { products as initialProducts } from './data/products'
import { initialOrders, initialCustomers } from './data/adminData'
import {
  adjustProductStock,
  getAvailableStock,
  initializeInventory,
  reserveOrderStock,
  transitionOrderInventory,
} from './admin/utils/inventory'
import {
  createRefundRecord,
  initializeRefundRecords,
} from './admin/utils/payments'
import { createCustomerFromUser } from './admin/utils/customers'
import { formatCurrency, parsePrice } from './user/utils/currency'

const initialInventory = initializeInventory(initialProducts, initialOrders)

function App() {
  const [activePortal, setActivePortal] = useState('user') // 'user' | 'admin'
  const [productsList, setProductsList] = useState(initialInventory.products)
  const [ordersList, setOrdersList] = useState(initialInventory.orders)
  const [inventoryHistory, setInventoryHistory] = useState(
    initialInventory.history,
  )
  const [refundsList, setRefundsList] = useState(() =>
    initializeRefundRecords(initialInventory.orders),
  )
  const [customersList, setCustomersList] = useState(initialCustomers)

  const handleCustomerAuthenticated = (user) => {
    setCustomersList((current) => {
      const email = String(user.email || '').trim().toLowerCase()
      const existing = current.find(
        (customer) => String(customer.email).toLowerCase() === email,
      )
      if (!existing) return [...current, createCustomerFromUser(user)]
      return current.map((customer) =>
        customer.id === existing.id
          ? {
              ...customer,
              name: user.name || customer.name,
              phone: user.phone || user.mobile || customer.phone,
            }
          : customer,
      )
    })
  }

  // Handlers for Admin actions on Products
  const handleAddProduct = (newProduct) => {
    const openingStock = Math.max(0, Number(newProduct.stock) || 0)
    const product = { ...newProduct, stock: 0, reservedStock: 0 }
    const result = adjustProductStock(
      [product, ...productsList],
      product.id,
      {
        type: 'add',
        quantity: openingStock,
        note: 'Opening stock for newly created or duplicated product',
      },
    )
    setProductsList(result.products)
    setInventoryHistory((current) => [...result.history, ...current])
  }

  const handleUpdateProduct = (updatedProduct) => {
    const currentProduct = productsList.find(
      (product) => product.id === updatedProduct.id,
    )
    if (!currentProduct) return
    const reservedStock = Number(currentProduct.reservedStock || 0)
    const requestedStock = Math.max(
      reservedStock,
      Number(updatedProduct.stock) || 0,
    )
    const updatedProducts = productsList.map((product) =>
      product.id === updatedProduct.id
        ? {
            ...updatedProduct,
            stock: currentProduct.stock,
            reservedStock,
          }
        : product,
    )
    if (requestedStock === Number(currentProduct.stock)) {
      setProductsList(updatedProducts)
      return
    }
    const result = adjustProductStock(
      updatedProducts,
      updatedProduct.id,
      {
        type: 'adjust',
        quantity: requestedStock,
        note: 'Stock updated from product editor',
      },
    )
    setProductsList(result.products)
    setInventoryHistory((current) => [...result.history, ...current])
  }

  const handleDeleteProduct = (productId) => {
    setProductsList((prev) => prev.filter((p) => p.id !== productId))
  }

  // Handler for Admin action on Order Status
  const handleUpdateOrderStatus = (orderId, newStatus, options = {}) => {
    const order = ordersList.find((item) => item.id === orderId)
    if (!order) return
    const transition = transitionOrderInventory(
      productsList,
      order,
      newStatus,
      options.returnDisposition,
    )
    setProductsList(transition.products)
    if (newStatus === 'Refunded') {
      setRefundsList((current) =>
        current.some((refund) => refund.orderId === orderId)
          ? current
          : [createRefundRecord(order), ...current],
      )
    }
    setInventoryHistory((current) => [
      ...transition.history.reverse(),
      ...current,
    ])
    setOrdersList((prev) =>
      prev.map((item) =>
        item.id === orderId
          ? (() => {
              const statusChanged = item.status !== newStatus
              const updatedAt = new Date()
              return {
              ...item,
              status: newStatus,
              inventoryState: transition.inventoryState,
              returnDisposition:
                options.returnDisposition || item.returnDisposition,
              trackingId:
                options.trackingId === undefined
                  ? item.trackingId
                  : options.trackingId,
              paymentStatus:
                newStatus === 'Refunded'
                  ? 'Refunded'
                  : item.paymentStatus,
                statusHistory: statusChanged
                  ? [
                      ...(item.statusHistory || []),
                      {
                        status: newStatus,
                        timestamp: updatedAt.toISOString(),
                        date: updatedAt.toISOString().slice(0, 10),
                        time: updatedAt.toLocaleTimeString('en-IN', {
                          hour: 'numeric',
                          minute: '2-digit',
                        }),
                      },
                    ]
                  : item.statusHistory,
              }
            })()
          : item,
      ),
    )
  }

  // Handler for User checkout order placement
  const handleNewOrder = (newOrder) => {
    const reservation = reserveOrderStock(productsList, newOrder)
    setProductsList(reservation.products)
    setInventoryHistory((current) => [
      ...reservation.history.reverse(),
      ...current,
    ])
    setOrdersList((prev) => [
      {
        ...newOrder,
        inventoryState: 'reserved',
        statusHistory: newOrder.statusHistory || [
          {
            status: newOrder.status || 'Pending',
            timestamp: new Date().toISOString(),
            date: newOrder.date,
            time: newOrder.orderTime,
          },
        ],
      },
      ...prev,
    ])
    setCustomersList((current) => {
      const email = String(newOrder.email || '').trim().toLowerCase()
      const existing = current.find(
        (customer) => String(customer.email).toLowerCase() === email,
      )
      const orderTotal = parsePrice(newOrder.total)
      if (!existing) {
        return [
          ...current,
          {
            ...createCustomerFromUser({
              name: newOrder.customer,
              email,
              phone: newOrder.shippingAddress?.phone,
            }),
            ordersCount: 1,
            totalSpent: formatCurrency(orderTotal),
            addresses: newOrder.shippingAddress
              ? [newOrder.shippingAddress]
              : [],
          },
        ]
      }
      return current.map((customer) =>
        customer.id === existing.id
          ? {
              ...customer,
              phone: newOrder.shippingAddress?.phone || customer.phone,
              ordersCount: Number(customer.ordersCount || 0) + 1,
              totalSpent: formatCurrency(
                parsePrice(customer.totalSpent) + orderTotal,
              ),
              addresses: newOrder.shippingAddress
                ? [...(customer.addresses || []), newOrder.shippingAddress]
                : customer.addresses,
            }
          : customer,
      )
    })
  }

  const handleAdjustStock = (productId, adjustment) => {
    const result = adjustProductStock(productsList, productId, adjustment)
    if (result.error) return result.error
    setProductsList(result.products)
    setInventoryHistory((current) => [...result.history, ...current])
    return ''
  }

  const storefrontProducts = productsList
    .filter((product) => product.enabled !== false)
    .map((product) => ({ ...product, stock: getAvailableStock(product) }))

  return (
    <div className="min-h-screen bg-[#f7f8f5] font-sans text-slate-950 antialiased">
      {/* Render Selected View */}
      {activePortal === 'user' ? (
        <UserApp
          products={storefrontProducts}
          orders={ordersList}
          onNewOrder={handleNewOrder}
          onCustomerAuthenticated={handleCustomerAuthenticated}
          onBeSellerClick={() => setActivePortal('admin')}
        />
      ) : (
        <AdminApp
          products={productsList}
          orders={ordersList}
          refunds={refundsList}
          customers={customersList}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          inventoryHistory={inventoryHistory}
          onAdjustStock={handleAdjustStock}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onSwitchToStore={() => setActivePortal('user')}
        />
      )}
    </div>
  )
}

export default App
