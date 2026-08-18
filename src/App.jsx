import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import UserApp from './user/UserApp'
import AdminApp from './admin/AdminApp'
import { initialMarketingSettings } from './data/marketing'
import { initialShippingSettings } from './data/shipping'
import { initialInvoiceSettings } from './data/invoice'
import { initialAdminSettings } from './data/adminSettings'
import {
  adjustProductStock,
  getAvailableStock,
  transitionOrderInventory,
} from './admin/utils/inventory'
import { createRefundRecord } from './admin/utils/payments'
import {
  transitionReturnRequest,
} from './admin/utils/returns'
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
import { auth } from './firebase/firebase'
import {
  removeRecord,
  saveRecord,
  saveRecords,
  saveSetting,
  subscribeToCollection,
  subscribeToPublishedReviews,
  subscribeToSetting,
} from './firebase/storeData'
import {
  cancelCustomerOrder,
  createCustomerReturn,
  placeCustomerOrder,
  submitCustomerOrderFeedback,
} from './firebase/customerData'
import { updateCustomerAccountStatus } from './firebase/adminData'

const getChangedProducts = (currentProducts, nextProducts) =>
  nextProducts.filter((nextProduct) => {
    const currentProduct = currentProducts.find(
      (product) => product.id === nextProduct.id,
    )
    return JSON.stringify(currentProduct) !== JSON.stringify(nextProduct)
  })
const mergeSetting = (fallback, stored) =>
  stored
    ? Object.fromEntries(
        Object.entries(fallback).map(([section, defaultValue]) => [
          section,
          Array.isArray(defaultValue)
            ? stored[section] || defaultValue
            : typeof defaultValue === 'object'
              ? { ...defaultValue, ...(stored[section] || {}) }
              : stored[section] ?? defaultValue,
        ]),
      )
    : fallback

const dateValue = (value) =>
  value?.toDate?.().toISOString().slice(0, 10) ||
  String(value || '').slice(0, 10)

const customerFromUserRecord = (user) => ({
  ...user,
  id: user.id,
  name: user.name || 'Pride Customer',
  phone: user.phone || user.mobile || '',
  role: user.membershipRole || (user.role === 'customer' ? 'Customer' : user.role) || 'Customer',
  status: user.status || 'Active',
  joinedDate: user.joinedDate || dateValue(user.createdAt),
  registrationDate: user.registrationDate || user.joinedDate || dateValue(user.createdAt),
  ordersCount: Number(user.ordersCount || 0),
  totalSpent: user.totalSpent || `₹${Number(user.totalSpentValue || 0).toLocaleString('en-IN')}`,
  addresses: user.addresses || [],
  wishlist: user.wishlistIds || user.wishlist || [],
})

function App() {
  const [activePortal, setActivePortal] = useState('user') // 'user' | 'admin'
  const [productsList, setProductsList] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [ordersList, setOrdersList] = useState([])
  const [inventoryHistory, setInventoryHistory] = useState([])
  const [refundsList, setRefundsList] = useState([])
  const [customersList, setCustomersList] = useState([])
  const [returnsList, setReturnsList] = useState([])
  const [couponsList, setCouponsList] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [publicReviews, setPublicReviews] = useState([])
  const [adminReviews, setAdminReviews] = useState([])
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [marketingSettings, setMarketingSettings] = useState(initialMarketingSettings)
  const [shippingSettings, setShippingSettings] = useState(initialShippingSettings)
  const [invoiceSettings, setInvoiceSettings] = useState(initialInvoiceSettings)
  const [adminSettings, setAdminSettings] = useState(initialAdminSettings)

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

  useEffect(() => {
    const reportError = (error) =>
      setProductsError(error.message || 'Unable to load store data from Firestore.')
    const unsubscribers = [
      subscribeToCollection('coupons', setCouponsList, reportError),
      subscribeToCollection('categories', setCategoriesList, reportError),
      subscribeToPublishedReviews(setPublicReviews, reportError),
      subscribeToSetting('marketing', (value) =>
        setMarketingSettings(mergeSetting(initialMarketingSettings, value)), reportError),
      subscribeToSetting('shipping', (value) =>
        setShippingSettings(mergeSetting(initialShippingSettings, value)), reportError),
      subscribeToSetting('invoice', (value) =>
        setInvoiceSettings(mergeSetting(initialInvoiceSettings, value)), reportError),
      subscribeToSetting('storefront', (value) =>
        setAdminSettings((current) => ({
          ...current,
          store: { ...initialAdminSettings.store, ...(value?.store || {}) },
          payment: { ...initialAdminSettings.payment, ...(value?.payment || {}) },
        })), reportError),
    ]
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [])

  useEffect(() => {
    let restrictedUnsubscribers = []
    const stopRestrictedListeners = () => {
      restrictedUnsubscribers.forEach((unsubscribe) => unsubscribe())
      restrictedUnsubscribers = []
    }
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      stopRestrictedListeners()
      setAdminAuthenticated(Boolean(user))
      if (!user) {
        setOrdersList([])
        setInventoryHistory([])
        setRefundsList([])
        setCustomersList([])
        setReturnsList([])
        setAdminReviews([])
        return
      }
      const ignoreUnauthorized = () => {}
      restrictedUnsubscribers = [
        subscribeToCollection('orders', setOrdersList, ignoreUnauthorized, { sort: true }),
        subscribeToCollection('inventoryHistory', setInventoryHistory, ignoreUnauthorized, { sort: true }),
        subscribeToCollection('refunds', setRefundsList, ignoreUnauthorized, { sort: true }),
        subscribeToCollection('returns', setReturnsList, ignoreUnauthorized, { sort: true }),
        subscribeToCollection('users', (users) => setCustomersList(users.map(customerFromUserRecord)), ignoreUnauthorized),
        subscribeToCollection('reviews', setAdminReviews, ignoreUnauthorized, { sort: true }),
        subscribeToSetting('admin', (value) =>
          setAdminSettings(mergeSetting(initialAdminSettings, value)), ignoreUnauthorized),
      ]
    })
    return () => {
      unsubscribeAuth()
      stopRestrictedListeners()
    }
  }, [])

  const reviewsList = adminAuthenticated ? adminReviews : publicReviews

  const persistSettings = (setter, settingName) => (valueOrUpdater) =>
    setter((current) => {
      const next = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(current)
        : valueOrUpdater
      void saveSetting(settingName, next).catch((error) =>
        setProductsError(error.message || `Unable to save ${settingName} settings.`),
      )
      return next
    })
  const updateMarketingSettings = persistSettings(
    setMarketingSettings,
    'marketing',
  )
  const updateShippingSettings = persistSettings(
    setShippingSettings,
    'shipping',
  )
  const updateInvoiceSettings = persistSettings(
    setInvoiceSettings,
    'invoice',
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
      void saveSetting('admin', persisted).catch((error) =>
        setProductsError(error.message || 'Unable to save admin settings.'),
      )
      void saveSetting('storefront', {
        store: persisted.store,
        payment: persisted.payment,
      }).catch((error) =>
        setProductsError(error.message || 'Unable to save storefront settings.'),
      )
      return next
    })

  const handleCustomerAuthenticated = () => {}

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
      void saveRecords('inventoryHistory', result.history).catch((error) =>
        setProductsError(error.message || 'Unable to save inventory history.'),
      )
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
        void saveRecords('inventoryHistory', result.history).catch((error) =>
          setProductsError(error.message || 'Unable to save inventory history.'),
        )
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
      const refund = createRefundRecord(order)
      if (!refundsList.some((item) => item.orderId === orderId)) {
        setRefundsList((current) => [refund, ...current])
        void saveRecord('refunds', refund).catch((error) =>
          setProductsError(error.message || 'Unable to save refund record.'),
        )
      }
    }
    const history = [...transition.history].reverse()
    setInventoryHistory((current) => [...history, ...current])
    void saveRecords('inventoryHistory', history).catch((error) =>
      setProductsError(error.message || 'Unable to save inventory history.'),
    )
    const statusChanged = order.status !== newStatus
    const updatedAt = new Date()
    const updatedOrder = {
      ...order,
      status: newStatus,
      inventoryState: transition.inventoryState,
      returnDisposition: options.returnDisposition || order.returnDisposition,
      trackingId:
        options.trackingId === undefined ? order.trackingId : options.trackingId,
      courier: options.courier === undefined ? order.courier : options.courier,
      paymentStatus:
        newStatus === 'Refunded'
          ? 'Refunded'
          : options.paymentStatus || order.paymentStatus,
      statusHistory: statusChanged
        ? [
            ...(order.statusHistory || []),
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
        : order.statusHistory,
    }
    setOrdersList((current) =>
      current.map((item) => (item.id === orderId ? updatedOrder : item)),
    )
    void saveRecord('orders', updatedOrder, { merge: true }).catch((error) =>
      setProductsError(error.message || 'Unable to update the order.'),
    )
  }

  const handleCreateReturnRequest = createCustomerReturn

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
    if (result.updatedRequest) {
      void saveRecord('returns', result.updatedRequest, { merge: true }).catch(
        (error) =>
          setProductsError(error.message || 'Unable to update the return request.'),
      )
    }
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

  const handleCancelOrder = cancelCustomerOrder

  const handleSubmitOrderFeedback = submitCustomerOrderFeedback

  // Handler for User checkout order placement
  const handleNewOrder = placeCustomerOrder

  const handleAddCoupon = (coupon) => {
    setCouponsList((current) => [coupon, ...current])
    void saveRecord('coupons', coupon).catch((error) =>
      setProductsError(error.message || 'Unable to add the coupon.'),
    )
  }
  const handleUpdateCoupon = (coupon) => {
    setCouponsList((current) =>
      current.map((item) => (item.id === coupon.id ? coupon : item)),
    )
    void saveRecord('coupons', coupon, { merge: true }).catch((error) =>
      setProductsError(error.message || 'Unable to update the coupon.'),
    )
  }
  const handleDeleteCoupon = (couponId) => {
    setCouponsList((current) =>
      current.filter((coupon) => coupon.id !== couponId),
    )
    void removeRecord('coupons', couponId).catch((error) =>
      setProductsError(error.message || 'Unable to delete the coupon.'),
    )
  }

  const handleAddCategory = (category) => {
    setCategoriesList((current) => [...current, category])
    void saveRecord('categories', category).catch((error) =>
      setProductsError(error.message || 'Unable to add the category.'),
    )
  }
  const handleUpdateCategory = (category, previousName) => {
    setCategoriesList((current) =>
      current.map((item) => (item.id === category.id ? category : item)),
    )
    void saveRecord('categories', category, { merge: true }).catch((error) =>
      setProductsError(error.message || 'Unable to update the category.'),
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
    void removeRecord('categories', categoryId).catch((error) =>
      setProductsError(error.message || 'Unable to delete the category.'),
    )
    return ''
  }

  const handleUpdateReview = (review) => {
    setAdminReviews((current) =>
      current.map((item) => (item.id === review.id ? review : item)),
    )
    void saveRecord('reviews', review, { merge: true }).catch((error) =>
      setProductsError(error.message || 'Unable to update the review.'),
    )
  }
  const handleDeleteReview = (reviewId) => {
    setAdminReviews((current) =>
      current.filter((review) => review.id !== reviewId),
    )
    void removeRecord('reviews', reviewId).catch((error) =>
      setProductsError(error.message || 'Unable to delete the review.'),
    )
  }

  const handleUpdatePaymentStatus = (orderId, paymentStatus) => {
    const order = ordersList.find((item) => item.id === orderId)
    if (!order) return
    const updatedOrder = {
      ...order,
      paymentStatus,
      paymentDate:
        paymentStatus === 'Paid' ? new Date().toISOString() : order.paymentDate,
    }
    setOrdersList((current) =>
      current.map((item) => (item.id === orderId ? updatedOrder : item)),
    )
    void saveRecord('orders', updatedOrder, { merge: true }).catch((error) =>
      setProductsError(error.message || 'Unable to update payment status.'),
    )
  }

  const handleUpdateCustomer = (customer) => {
    setCustomersList((current) =>
      current.map((item) => (item.id === customer.id ? customer : item)),
    )
    void saveRecord(
      'users',
      {
        id: customer.id,
        status: customer.status,
        membershipRole: customer.membershipRole || customer.role,
      },
      { merge: true },
    ).catch((error) =>
      setProductsError(error.message || 'Unable to update the customer.'),
    )
    void updateCustomerAccountStatus(customer.id, customer.status).catch(
      (error) =>
        setProductsError(error.message || 'Unable to update Firebase Authentication.'),
    )
  }

  const handleAdjustStock = async (productId, adjustment) => {
    const result = adjustProductStock(productsList, productId, adjustment)
    if (result.error) return result.error
    const product = result.products.find((item) => item.id === productId)
    await saveProduct(product)
    setProductsList(result.products)
    setInventoryHistory((current) => [...result.history, ...current])
    await saveRecords('inventoryHistory', result.history)
    return ''
  }

  const configuredFeaturedProductIds = (
    marketingSettings.featuredProductIds || []
  ).filter((productId) =>
    productsList.some((product) => String(product.id) === String(productId)),
  )
  const managedCategories = categoriesList.length
    ? categoriesList
    : [...new Set(productsList.map((product) => product.category).filter(Boolean))].map(
        (name) => ({
          id: `category-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name,
          description: '',
          enabled: true,
        }),
      )
  const storefrontProducts = productsList
    .filter(
      (product) =>
        product.enabled !== false &&
        managedCategories.find((category) => category.name === product.category)
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
          categories={managedCategories}
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
          categories={managedCategories}
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
