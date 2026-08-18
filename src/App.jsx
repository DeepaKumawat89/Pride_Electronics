import { useEffect, useState } from 'react'
import UserApp from './user/UserApp'
import AdminApp from './admin/AdminApp'
import { initialOrders, initialCustomers } from './data/adminData'
import { initialCoupons } from './data/coupons'
import { initialMarketingSettings } from './data/marketing'
import { initialShippingSettings } from './data/shipping'
import { initialInvoiceSettings } from './data/invoice'
import { initialAdminSettings } from './data/adminSettings'
import { initialCategories } from './data/categories'
import { customerReviews as initialReviews } from './user/components/products/productReviewData'
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
import {
  createProduct,
  createProductId,
  removeProduct,
  saveProduct,
  saveProducts,
  subscribeToProducts,
} from './firebase/products'
import {
  removeProductImages,
  uploadProductImages,
} from './firebase/productImages'

const initialInventory = initializeInventory([], initialOrders)
const getChangedProducts = (currentProducts, nextProducts) =>
  nextProducts.filter((nextProduct) => {
    const currentProduct = currentProducts.find(
      (product) => product.id === nextProduct.id,
    )
    return JSON.stringify(currentProduct) !== JSON.stringify(nextProduct)
  })
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
  const [productsList, setProductsList] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
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
  const [categoriesList, setCategoriesList] = useState(initialCategories)
  const [reviewsList, setReviewsList] = useState(initialReviews)
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

  useEffect(
    () =>
      subscribeToProducts(
        (products) => {
          setProductsList(products)
          setProductsError('')
          setProductsLoading(false)
        },
        (error) => {
          setProductsError(
            error.message || 'Unable to load products from Firestore.',
          )
          setProductsLoading(false)
        },
      ),
    [],
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
  const handleAddProduct = async (newProduct) => {
    const { imageFiles = [], ...productFields } = newProduct
    delete productFields.imageStoragePaths
    const productId = createProductId()
    let uploadedImages = { paths: [], urls: [] }

    try {
      if (imageFiles.length) {
        uploadedImages = await uploadProductImages(productId, imageFiles)
      }
      const existingImages = Array.isArray(productFields.images)
        ? productFields.images.filter(Boolean)
        : [productFields.image].filter(Boolean)
      const images = uploadedImages.urls.length
        ? uploadedImages.urls
        : existingImages
      const openingStock = Math.max(0, Number(productFields.stock) || 0)
      const product = await createProduct({
        ...productFields,
        id: productId,
        image: images[0] || '',
        images,
        imageStoragePaths: uploadedImages.paths,
        videos: [],
        stock: openingStock,
        reservedStock: 0,
      })
      const result = adjustProductStock(
        [{ ...product, stock: 0 }],
        product.id,
        {
          type: 'add',
          quantity: openingStock,
          note: 'Opening stock for newly created or duplicated product',
        },
      )
      setProductsList((current) =>
        current.some((item) => item.id === product.id)
          ? current
          : [product, ...current],
      )
      setInventoryHistory((current) => [...result.history, ...current])
      return product
    } catch (error) {
      await removeProductImages(uploadedImages.paths)
      throw error
    }
  }

  const handleUpdateProduct = async (updatedProduct) => {
    const { imageFiles = [], ...productFields } = updatedProduct
    const currentProduct = productsList.find(
      (product) => product.id === productFields.id,
    )
    if (!currentProduct) throw new Error('Product not found.')
    let uploadedImages = { paths: [], urls: [] }
    if (imageFiles.length) {
      uploadedImages = await uploadProductImages(currentProduct.id, imageFiles)
    }
    const mediaFields = uploadedImages.urls.length
      ? {
          image: uploadedImages.urls[0],
          images: uploadedImages.urls,
          imageStoragePaths: uploadedImages.paths,
        }
      : {
          image: productFields.image || currentProduct.image || '',
          images: productFields.images || currentProduct.images || [],
          imageStoragePaths:
            productFields.imageStoragePaths ||
            currentProduct.imageStoragePaths ||
            [],
        }
    const reservedStock = Number(currentProduct.reservedStock || 0)
    const requestedStock = Math.max(
      reservedStock,
      Number(productFields.stock) || 0,
    )
    const updatedProducts = productsList.map((product) =>
      product.id === productFields.id
        ? {
            ...productFields,
            ...mediaFields,
            videos: [],
            stock: currentProduct.stock,
            reservedStock,
          }
        : product,
    )
    try {
      let savedProduct
      if (requestedStock === Number(currentProduct.stock)) {
        savedProduct = await saveProduct(
          updatedProducts.find((product) => product.id === productFields.id),
        )
      } else {
        const result = adjustProductStock(
          updatedProducts,
          productFields.id,
          {
            type: 'adjust',
            quantity: requestedStock,
            note: 'Stock updated from product editor',
          },
        )
        const productToSave = result.products.find(
          (product) => product.id === productFields.id,
        )
        savedProduct = await saveProduct(productToSave)
        setInventoryHistory((current) => [...result.history, ...current])
      }
      setProductsList((current) =>
        current.map((product) =>
          product.id === savedProduct.id ? savedProduct : product,
        ),
      )
      if (uploadedImages.paths.length) {
        await removeProductImages(currentProduct.imageStoragePaths)
      }
      return savedProduct
    } catch (error) {
      await removeProductImages(uploadedImages.paths)
      throw error
    }
  }

  const handleDeleteProduct = async (productId) => {
    const product = productsList.find((item) => item.id === productId)
    await removeProduct(productId)
    await removeProductImages(product?.imageStoragePaths)
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
    void saveProducts(
      getChangedProducts(productsList, transition.products),
    ).catch((error) =>
      setProductsError(error.message || 'Unable to update Firestore inventory.'),
    )
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
    const order = ordersList.find((item) => item.id === orderId)
    setOrdersList((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, feedback } : order,
      ),
    )
    if (order && !reviewsList.some((review) => review.orderId === orderId)) {
      const productName = order.items?.[0]?.productName || 'Order purchase'
      setReviewsList((current) => [
        {
          id: `review-${Date.now()}`,
          orderId,
          productName,
          name: order.customer || 'Pride customer',
          initials: String(order.customer || 'PC')
            .split(/\s+/)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          rating: Number(feedback.rating) || 0,
          date: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          title: `Review for ${productName}`,
          text: feedback.review,
          status: 'Pending',
          tone: 'bg-[#dcebdd] text-[#366643]',
        },
        ...current,
      ])
    }
  }

  // Handler for User checkout order placement
  const handleNewOrder = (newOrder) => {
    const reservation = reserveOrderStock(productsList, newOrder)
    setProductsList(reservation.products)
    void saveProducts(
      getChangedProducts(productsList, reservation.products),
    ).catch((error) =>
      setProductsError(error.message || 'Unable to reserve Firestore inventory.'),
    )
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

  const handleAddCategory = (category) =>
    setCategoriesList((current) => [...current, category])
  const handleUpdateCategory = (category, previousName) => {
    setCategoriesList((current) =>
      current.map((item) => (item.id === category.id ? category : item)),
    )
    if (previousName && previousName !== category.name) {
      const renamedProducts = productsList.map((product) =>
          product.category === previousName
            ? { ...product, category: category.name }
            : product,
      )
      setProductsList(renamedProducts)
      void saveProducts(
        getChangedProducts(productsList, renamedProducts),
      ).catch((error) =>
        setProductsError(error.message || 'Unable to update product categories.'),
      )
    }
  }
  const handleDeleteCategory = (categoryId) => {
    const category = categoriesList.find((item) => item.id === categoryId)
    if (!category) return 'Category not found.'
    if (productsList.some((product) => product.category === category.name)) {
      return 'Move or delete products in this category before deleting it.'
    }
    setCategoriesList((current) =>
      current.filter((item) => item.id !== categoryId),
    )
    return ''
  }

  const handleUpdateReview = (review) =>
    setReviewsList((current) =>
      current.map((item) => (item.id === review.id ? review : item)),
    )
  const handleDeleteReview = (reviewId) =>
    setReviewsList((current) =>
      current.filter((review) => review.id !== reviewId),
    )

  const handleUpdatePaymentStatus = (orderId, paymentStatus) =>
    setOrdersList((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              paymentStatus,
              paymentDate:
                paymentStatus === 'Paid'
                  ? new Date().toISOString()
                  : order.paymentDate,
            }
          : order,
      ),
    )

  const handleUpdateCustomer = (customer) =>
    setCustomersList((current) =>
      current.map((item) => (item.id === customer.id ? customer : item)),
    )

  const handleAdjustStock = async (productId, adjustment) => {
    const result = adjustProductStock(productsList, productId, adjustment)
    if (result.error) return result.error
    const product = result.products.find((item) => item.id === productId)
    await saveProduct(product)
    setProductsList(result.products)
    setInventoryHistory((current) => [...result.history, ...current])
    return ''
  }

  const configuredFeaturedProductIds = (
    marketingSettings.featuredProductIds || []
  ).filter((productId) =>
    productsList.some((product) => String(product.id) === String(productId)),
  )
  const storefrontProducts = productsList
    .filter(
      (product) =>
        product.enabled !== false &&
        categoriesList.find((category) => category.name === product.category)
          ?.enabled !== false,
    )
    .map((product) => ({
      ...product,
      stock: getAvailableStock(product),
      featured: configuredFeaturedProductIds.length
        ? configuredFeaturedProductIds.some(
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
          categories={categoriesList}
          reviews={reviewsList.filter((review) => review.status === 'Published')}
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
          productsLoading={productsLoading}
          productsError={productsError}
          categories={categoriesList}
          reviews={reviewsList}
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
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onUpdateReview={handleUpdateReview}
          onDeleteReview={handleDeleteReview}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
          onUpdateCustomer={handleUpdateCustomer}
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
