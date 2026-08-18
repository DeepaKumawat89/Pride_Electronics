import { useState } from 'react'
import UserApp from './user/UserApp'
import AdminApp from './admin/AdminApp'
import { products as initialProducts } from './data/products'
import { initialOrders, initialCustomers } from './data/adminData'
import { initialCoupons } from './data/coupons'
import { initialMarketingSettings } from './data/marketing'
import { initialShippingSettings } from './data/shipping'
import { initialInvoiceSettings } from './data/invoice'
import { initialAdminSettings } from './data/adminSettings'
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
import {
  createReturnRequest,
  initializeReturnRequests,
  transitionReturnRequest,
} from './admin/utils/returns'
import { formatCurrency, parsePrice } from './user/utils/currency'

const initialInventory = initializeInventory(initialProducts, initialOrders)
const SETTINGS_KEYS = {
  marketing: 'pride_marketing_settings',
  shipping: 'pride_shipping_settings',
  invoice: 'pride_invoice_settings',
  admin: 'pride_admin_settings',
}

const loadSettings = (key, fallback) => {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}')
    return Object.fromEntries(
      Object.entries(fallback).map(([section, defaultValue]) => [
        section,
        Array.isArray(defaultValue)
          ? stored[section] || defaultValue
          : typeof defaultValue === 'object'
            ? { ...defaultValue, ...(stored[section] || {}) }
            : stored[section] ?? defaultValue,
      ]),
    )
  } catch {
    return fallback
  }
}

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
  const [returnsList, setReturnsList] = useState(() =>
    initializeReturnRequests(initialInventory.orders),
  )
  const [couponsList, setCouponsList] = useState(initialCoupons)
  const [marketingSettings, setMarketingSettings] = useState(
    () => loadSettings(SETTINGS_KEYS.marketing, initialMarketingSettings),
  )
  const [shippingSettings, setShippingSettings] = useState(
    () => loadSettings(SETTINGS_KEYS.shipping, initialShippingSettings),
  )
  const [invoiceSettings, setInvoiceSettings] = useState(() =>
    loadSettings(SETTINGS_KEYS.invoice, initialInvoiceSettings),
  )
  const [adminSettings, setAdminSettings] = useState(() =>
    loadSettings(SETTINGS_KEYS.admin, initialAdminSettings),
  )

  const persistSettings = (setter, key) => (valueOrUpdater) =>
    setter((current) => {
      const next = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(current)
        : valueOrUpdater
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  const updateMarketingSettings = persistSettings(
    setMarketingSettings,
    SETTINGS_KEYS.marketing,
  )
  const updateShippingSettings = persistSettings(
    setShippingSettings,
    SETTINGS_KEYS.shipping,
  )
  const updateInvoiceSettings = persistSettings(
    setInvoiceSettings,
    SETTINGS_KEYS.invoice,
  )
  const updateAdminSettings = (valueOrUpdater) =>
    setAdminSettings((current) => {
      const next = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(current)
        : valueOrUpdater
      const persisted = {
        ...next,
        email: { ...next.email, password: '' },
      }
      localStorage.setItem(SETTINGS_KEYS.admin, JSON.stringify(persisted))
      return next
    })

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
              courier:
                options.courier === undefined ? item.courier : options.courier,
              paymentStatus:
                newStatus === 'Refunded'
                  ? 'Refunded'
                  : options.paymentStatus || item.paymentStatus,
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

  const handleCreateReturnRequest = (orderId, details) => {
    const order = ordersList.find((item) => item.id === orderId)
    if (!order) return null
    const request = createReturnRequest(order, details)
    setReturnsList((current) =>
      current.some(
        (item) =>
          item.orderId === orderId &&
          !['Completed', 'Rejected'].includes(item.status),
      )
        ? current
        : [request, ...current],
    )
    return request
  }

  const handleUpdateReturn = (requestId, action, options = {}) => {
    const currentRequest = returnsList.find((item) => item.id === requestId)
    if (!currentRequest) return
    const result = transitionReturnRequest(
      returnsList,
      requestId,
      action,
      options,
    )
    if (result.error) return
    setReturnsList(result.requests)
    if (action === 'inspect') {
      handleUpdateOrderStatus(currentRequest.orderId, 'Returned', {
        returnDisposition:
          options.inspectionResult === 'Sellable' ? 'restock' : 'damaged',
      })
    }
    if (action === 'complete_refund') {
      handleUpdateOrderStatus(currentRequest.orderId, 'Refunded')
    }
  }

  const handleCancelOrder = (orderId) => {
    const order = ordersList.find((item) => item.id === orderId)
    if (!order || !['Pending', 'Confirmed', 'Processing'].includes(order.status)) {
      return false
    }
    const paymentStatus = /cash|cod/i.test(order.paymentMethod || '')
      ? 'Cancelled'
      : 'Refund Pending'
    handleUpdateOrderStatus(orderId, 'Cancelled', { paymentStatus })
    return true
  }

  const handleSubmitOrderFeedback = (orderId, feedback) => {
    setOrdersList((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, feedback } : order,
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
    updateInvoiceSettings((current) => ({
      ...current,
      numbering: {
        ...current.numbering,
        nextNumber: Math.max(1, Number(current.numbering.nextNumber) || 1) + 1,
      },
    }))
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
    if (newOrder.couponCode) {
      const userKey = String(newOrder.email || '').trim().toLowerCase()
      setCouponsList((current) =>
        current.map((coupon) =>
          coupon.code === newOrder.couponCode
            ? {
                ...coupon,
                usageCount: Number(coupon.usageCount || 0) + 1,
                usageBy: userKey
                  ? {
                      ...(coupon.usageBy || {}),
                      [userKey]: Number(coupon.usageBy?.[userKey] || 0) + 1,
                    }
                  : coupon.usageBy,
              }
            : coupon,
        ),
      )
    }
  }

  const handleAddCoupon = (coupon) =>
    setCouponsList((current) => [coupon, ...current])
  const handleUpdateCoupon = (coupon) =>
    setCouponsList((current) =>
      current.map((item) => (item.id === coupon.id ? coupon : item)),
    )
  const handleDeleteCoupon = (couponId) =>
    setCouponsList((current) =>
      current.filter((coupon) => coupon.id !== couponId),
    )

  const handleAdjustStock = (productId, adjustment) => {
    const result = adjustProductStock(productsList, productId, adjustment)
    if (result.error) return result.error
    setProductsList(result.products)
    setInventoryHistory((current) => [...result.history, ...current])
    return ''
  }

  const storefrontProducts = productsList
    .filter((product) => product.enabled !== false)
    .map((product) => ({
      ...product,
      stock: getAvailableStock(product),
      featured: marketingSettings.featuredProductIds?.length
        ? marketingSettings.featuredProductIds.some(
            (productId) => String(productId) === String(product.id),
          )
        : product.featured,
    }))

  return (
    <div className="min-h-screen bg-[#f7f8f5] font-sans text-slate-950 antialiased">
      {/* Render Selected View */}
      {activePortal === 'user' ? (
        <UserApp
          products={storefrontProducts}
          orders={ordersList}
          returns={returnsList}
          coupons={couponsList}
          marketingSettings={marketingSettings}
          shippingSettings={shippingSettings}
          invoiceSettings={invoiceSettings}
          adminSettings={adminSettings}
          onNewOrder={handleNewOrder}
          onCreateReturnRequest={handleCreateReturnRequest}
          onCancelOrder={handleCancelOrder}
          onSubmitOrderFeedback={handleSubmitOrderFeedback}
          onCustomerAuthenticated={handleCustomerAuthenticated}
          onBeSellerClick={() => setActivePortal('admin')}
        />
      ) : (
        <AdminApp
          products={productsList}
          orders={ordersList}
          refunds={refundsList}
          returns={returnsList}
          coupons={couponsList}
          customers={customersList}
          marketingSettings={marketingSettings}
          shippingSettings={shippingSettings}
          invoiceSettings={invoiceSettings}
          adminSettings={adminSettings}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          inventoryHistory={inventoryHistory}
          onAdjustStock={handleAdjustStock}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateReturn={handleUpdateReturn}
          onAddCoupon={handleAddCoupon}
          onUpdateCoupon={handleUpdateCoupon}
          onDeleteCoupon={handleDeleteCoupon}
          onUpdateMarketingSettings={updateMarketingSettings}
          onUpdateShippingSettings={updateShippingSettings}
          onUpdateInvoiceSettings={updateInvoiceSettings}
          onUpdateAdminSettings={updateAdminSettings}
          onSwitchToStore={() => setActivePortal('user')}
        />
      )}
    </div>
  )
}

export default App
