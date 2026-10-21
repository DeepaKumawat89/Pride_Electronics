import { useEffect, useRef, useState } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import UserApp from './user/UserApp'
import AdminApp from './admin/AdminApp'
import { initialMarketingSettings } from './data/marketing'
import { initialShippingSettings } from './data/shipping'
import { initialInvoiceSettings } from './data/invoice'
import { initialAdminSettings } from './data/adminSettings'
import {
  adjustProductStock,
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
  updateProductRatingStats,
} from './firebase/products'
import {
  copyProductImages,
  MAX_PRODUCT_IMAGES,
  MIN_PRODUCT_IMAGES,
  removeProductImages,
  uploadProductImages,
  uploadVariantImages,
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
import {
  categoryForProduct,
  legacySubcategoriesForProducts,
  legacyTaxonomyPatch,
  normalizeProductTaxonomy,
  productBelongsToCategory,
  productBelongsToSubcategory,
  subcategoryForProduct,
} from './utils/catalogTaxonomy'
import { productForStorefront } from './utils/productVariants'
import { createOrderMoment } from './utils/orderTimestamps'

const getChangedProducts = (currentProducts, nextProducts) =>
  nextProducts.filter((nextProduct) => {
    const currentProduct = currentProducts.find(
      (product) => product.id === nextProduct.id,
    )
    return JSON.stringify(currentProduct) !== JSON.stringify(nextProduct)
  })

const prepareProductVariants = async (productId, variants = [], currentVariants = []) => {
  const uploadedPaths = []
  const replacedPaths = []
  const prepared = []
  try {
    for (const variant of variants) {
      const { imageFiles = [], ...fields } = variant
      const current = currentVariants.find((item) => String(item.id) === String(variant.id))
      let media = {
        images: fields.images || current?.images || [],
        imageStoragePaths: fields.imageStoragePaths || current?.imageStoragePaths || [],
      }
      if (imageFiles.length) {
        const uploaded = await uploadVariantImages(productId, variant.id, imageFiles)
        uploadedPaths.push(...uploaded.paths)
        replacedPaths.push(...(current?.imageStoragePaths || []))
        media = { images: uploaded.urls, imageStoragePaths: uploaded.paths }
      }
      prepared.push({
        ...fields,
        ...media,
        image: media.images[0] || '',
        stock: Math.max(0, Number(fields.stock) || 0),
        reservedStock: current
          ? Math.max(
              Number(current.reservedStock || 0),
              Number(fields.reservedStock || 0),
            )
          : 0,
      })
    }
    const retainedIds = new Set(prepared.map((variant) => String(variant.id)))
    currentVariants.forEach((variant) => {
      if (!retainedIds.has(String(variant.id))) {
        replacedPaths.push(...(variant.imageStoragePaths || []))
      }
    })
    return { variants: prepared, uploadedPaths, replacedPaths }
  } catch (error) {
    await removeProductImages(uploadedPaths, {
      ignoreErrors: true,
      skipAuthorizationCheck: true,
    })
    throw error
  }
}
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
  const [activePortal, setActivePortal] = useState(() =>
    window.location.pathname.startsWith('/admin') ? 'admin' : 'user',
  ) // 'user' | 'admin'
  const [productsList, setProductsList] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [ordersList, setOrdersList] = useState([])
  const [refundsList, setRefundsList] = useState([])
  const [customersList, setCustomersList] = useState([])
  const [returnsList, setReturnsList] = useState([])
  const [couponsList, setCouponsList] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [subcategoriesList, setSubcategoriesList] = useState([])
  const [publicReviews, setPublicReviews] = useState([])
  const [adminReviews, setAdminReviews] = useState([])
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [marketingSettings, setMarketingSettings] = useState(initialMarketingSettings)
  const [shippingSettings, setShippingSettings] = useState(initialShippingSettings)
  const [invoiceSettings, setInvoiceSettings] = useState(initialInvoiceSettings)
  const [adminSettings, setAdminSettings] = useState(initialAdminSettings)
  const taxonomyMigrationKey = useRef('')

  useEffect(() => {
    const syncPortalWithLocation = () =>
      setActivePortal(
        window.location.pathname.startsWith('/admin') ? 'admin' : 'user',
      )
    window.addEventListener('popstate', syncPortalWithLocation)
    return () => window.removeEventListener('popstate', syncPortalWithLocation)
  }, [])

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
      subscribeToCollection('subcategories', setSubcategoriesList, reportError),
      subscribeToPublishedReviews(setPublicReviews, reportError),
      subscribeToSetting('marketing', (value) =>
        setMarketingSettings(mergeSetting(initialMarketingSettings, value)), reportError),
      subscribeToSetting('shipping', (value) =>
        setShippingSettings(mergeSetting(initialShippingSettings, value)), reportError),
      subscribeToSetting('invoice', (value) => {
        const settings = mergeSetting(initialInvoiceSettings, value)
        setInvoiceSettings({
          ...settings,
          tax: { ...settings.tax, gstEnabled: true, pricesIncludeTax: false },
        })
      }, reportError),
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
    if (!adminAuthenticated || productsLoading || !categoriesList.length) return
    const legacySubcategories = legacySubcategoriesForProducts(
      productsList,
      categoriesList,
      subcategoriesList,
    )
    const effectiveSubcategories = [
      ...subcategoriesList,
      ...legacySubcategories,
    ]
    const productsToMigrate = productsList.flatMap((product) => {
      const patch = legacyTaxonomyPatch(
        product,
        categoriesList,
        effectiveSubcategories,
      )
      return Object.keys(patch).length ? [{ ...product, ...patch }] : []
    })
    if (!productsToMigrate.length && !legacySubcategories.length) return

    const migrationKey = [
      ...productsToMigrate.map(
        (product) =>
          `${product.id}:${product.categoryId}:${product.category}:${product.subcategoryId}:${product.subcategory}`,
      ),
      ...legacySubcategories.map((subcategory) => subcategory.id),
    ]
      .sort()
      .join('|')
    if (taxonomyMigrationKey.current === migrationKey) return
    taxonomyMigrationKey.current = migrationKey
    void Promise.all([
      productsToMigrate.length ? saveProducts(productsToMigrate) : Promise.resolve(),
      legacySubcategories.length
        ? saveRecords('subcategories', legacySubcategories)
        : Promise.resolve(),
    ]).catch((error) => {
      taxonomyMigrationKey.current = ''
      setProductsError(
        error.message || 'Unable to migrate legacy product category references.',
      )
    })
  }, [
    adminAuthenticated,
    categoriesList,
    productsList,
    productsLoading,
    subcategoriesList,
  ])

  useEffect(() => {
    let restrictedUnsubscribers = []
    let authRevision = 0
    const stopRestrictedListeners = () => {
      restrictedUnsubscribers.forEach((unsubscribe) => unsubscribe())
      restrictedUnsubscribers = []
    }
    const clearRestrictedData = () => {
      setOrdersList([])
      setRefundsList([])
      setCustomersList([])
      setReturnsList([])
      setAdminReviews([])
    }
    const unsubscribeAuth = onIdTokenChanged(auth, async (user) => {
      const revision = ++authRevision
      stopRestrictedListeners()
      if (!user) {
        setAdminAuthenticated(false)
        clearRestrictedData()
        return
      }
      const authorized = await user
        .getIdTokenResult()
        .then((token) => token.claims.admin === true)
        .catch(() => false)
      if (revision !== authRevision) return
      setAdminAuthenticated(authorized)
      if (!authorized) {
        clearRestrictedData()
        return
      }
      const ignoreUnauthorized = () => {}
      restrictedUnsubscribers = [
        subscribeToCollection('orders', setOrdersList, ignoreUnauthorized, { sort: true }),
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

  const switchPortal = (portal) => {
    const path = portal === 'admin' ? '/admin' : '/'
    if (window.location.pathname !== path || window.location.hash) {
      window.history.pushState({ pridePortal: portal }, '', path)
    }
    setActivePortal(portal)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

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
  const updateInvoiceSettings = persistSettings(
    setInvoiceSettings,
    'invoice',
  )
  const updateAdminSettings = (valueOrUpdater) =>
    setAdminSettings((current) => {
      const next = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(current)
        : valueOrUpdater
      const safeEmailSettings = Object.fromEntries(
        Object.entries(next.email || {}).filter(([key]) => key !== 'password'),
      )
      const persisted = {
        ...next,
        email: safeEmailSettings,
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
    const sourceImages = Array.isArray(productFields.images)
      ? productFields.images.filter(Boolean)
      : [productFields.image].filter(Boolean)
    const sourceImagePaths = Array.isArray(productFields.imageStoragePaths)
      ? productFields.imageStoragePaths.slice(0, sourceImages.length)
      : []
    const productId = createProductId()
    let uploadedImages = { paths: [], urls: [] }
    let preparedVariants = { variants: [], uploadedPaths: [], replacedPaths: [] }

    try {
      if (imageFiles.length) {
        uploadedImages = await uploadProductImages(productId, imageFiles)
      } else if (sourceImages.length) {
        uploadedImages = await copyProductImages(
          productId,
          sourceImages,
          sourceImagePaths,
        )
      }
      preparedVariants = await prepareProductVariants(
        productId,
        productFields.variants,
      )
      const images = uploadedImages.urls.length
        ? uploadedImages.urls
        : sourceImages
      if (
        images.length < MIN_PRODUCT_IMAGES ||
        images.length > MAX_PRODUCT_IMAGES
      ) {
        throw new Error(
          `A product must have between ${MIN_PRODUCT_IMAGES} and ${MAX_PRODUCT_IMAGES} unique images.`,
        )
      }
      const openingStock = preparedVariants.variants.length
        ? preparedVariants.variants.reduce((total, variant) => total + Number(variant.stock || 0), 0)
        : Math.max(0, Number(productFields.stock) || 0)
      const reservedStock = preparedVariants.variants.reduce(
        (total, variant) => total + Number(variant.reservedStock || 0),
        0,
      )
      const product = await createProduct({
        ...productFields,
        variants: preparedVariants.variants,
        id: productId,
        image: images[0] || '',
        images,
        imageStoragePaths: uploadedImages.paths.length
          ? uploadedImages.paths
          : images.map(() => ''),
        videos: [],
        stock: openingStock,
        reservedStock,
      })
      const result = preparedVariants.variants.length
        ? { history: [] }
        : adjustProductStock(
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
      void saveRecords('inventoryHistory', result.history).catch((error) =>
        setProductsError(error.message || 'Unable to save inventory history.'),
      )
      return product
    } catch (error) {
      await removeProductImages(uploadedImages.paths, {
        ignoreErrors: true,
        skipAuthorizationCheck: true,
      })
      await removeProductImages(preparedVariants.uploadedPaths, {
        ignoreErrors: true,
        skipAuthorizationCheck: true,
      })
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
    let preparedVariants = { variants: [], uploadedPaths: [], replacedPaths: [] }
    try {
      if (imageFiles.length) {
        uploadedImages = await uploadProductImages(currentProduct.id, imageFiles)
      }
      preparedVariants = await prepareProductVariants(
        currentProduct.id,
        productFields.variants,
        currentProduct.variants || [],
      )
      const retainedImages = Array.isArray(productFields.images)
        ? productFields.images.filter(Boolean)
        : [productFields.image].filter(Boolean)
      const retainedImagePaths = Array.isArray(productFields.imageStoragePaths)
        ? productFields.imageStoragePaths.slice(0, retainedImages.length)
        : []
      const images = [...retainedImages, ...uploadedImages.urls]
      const imageStoragePaths = [
        ...retainedImages.map((_, index) => retainedImagePaths[index] || ''),
        ...uploadedImages.paths,
      ]
      if (
        images.length < MIN_PRODUCT_IMAGES ||
        images.length > MAX_PRODUCT_IMAGES
      ) {
        throw new Error(
          `A product must have between ${MIN_PRODUCT_IMAGES} and ${MAX_PRODUCT_IMAGES} unique images.`,
        )
      }
      const mediaFields = {
        image: images[0] || '',
        images,
        imageStoragePaths,
      }
      const retainedPathSet = new Set(retainedImagePaths.filter(Boolean))
      const removedImagePaths = (currentProduct.imageStoragePaths || [])
        .filter(Boolean)
        .filter((path) => !retainedPathSet.has(path))
      const hasVariants = preparedVariants.variants.length > 0
      const reservedStock = hasVariants
        ? preparedVariants.variants.reduce((total, variant) => total + Number(variant.reservedStock || 0), 0)
        : Number(currentProduct.reservedStock || 0)
      const requestedStock = Math.max(
        reservedStock,
        hasVariants
          ? preparedVariants.variants.reduce((total, variant) => total + Number(variant.stock || 0), 0)
          : Number(productFields.stock) || 0,
      )
      const updatedProducts = productsList.map((product) =>
        product.id === productFields.id
          ? {
              ...productFields,
              variants: preparedVariants.variants,
              ...mediaFields,
              videos: [],
              stock: currentProduct.stock,
              reservedStock,
            }
          : product,
      )
      let savedProduct
      if (hasVariants || requestedStock === Number(currentProduct.stock)) {
        savedProduct = await saveProduct(
          {
            ...updatedProducts.find((product) => product.id === productFields.id),
            ...(hasVariants ? { stock: requestedStock, reservedStock } : {}),
          },
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
        void saveRecords('inventoryHistory', result.history).catch((error) =>
          setProductsError(error.message || 'Unable to save inventory history.'),
        )
      }
      setProductsList((current) =>
        current.map((product) =>
          product.id === savedProduct.id ? savedProduct : product,
        ),
      )
      try {
        await removeProductImages(removedImagePaths)
        await removeProductImages(preparedVariants.replacedPaths)
      } catch (cleanupError) {
        setProductsError(
          cleanupError.message || 'The product was saved, but an old image could not be removed.',
        )
      }
      return savedProduct
    } catch (error) {
      await removeProductImages(uploadedImages.paths, {
        ignoreErrors: true,
        skipAuthorizationCheck: true,
      })
      await removeProductImages(preparedVariants.uploadedPaths, {
        ignoreErrors: true,
        skipAuthorizationCheck: true,
      })
      throw error
    }
  }

  const handleDeleteProduct = async (productId) => {
    const product = productsList.find((item) => item.id === productId)
    await removeProduct(productId)
    setProductsList((prev) => prev.filter((p) => p.id !== productId))
    try {
      await removeProductImages(product?.imageStoragePaths)
      await removeProductImages(
        (product?.variants || []).flatMap((variant) => variant.imageStoragePaths || []),
      )
    } catch (cleanupError) {
      setProductsError(
        cleanupError.message || 'The product was deleted, but an image could not be removed.',
      )
    }
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
    void saveRecords('inventoryHistory', history).catch((error) =>
      setProductsError(error.message || 'Unable to save inventory history.'),
    )
    const statusChanged = order.status !== newStatus
    const updatedAt = new Date()
    const statusMoment = createOrderMoment(updatedAt)
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
      updatedAt: statusMoment.timestamp,
      statusHistory: statusChanged
        ? [
            ...(order.statusHistory || []),
            {
              status: newStatus,
              ...statusMoment,
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
    void saveRecord('coupons', coupon).catch((error) =>
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
      const previousCategory = { ...category, name: previousName }
      const renamedProducts = productsList.map((product) =>
        productBelongsToCategory(product, previousCategory)
          ? {
              ...product,
              categoryId: category.id,
              category: category.name,
            }
          : product,
      )
      setProductsList(renamedProducts)
      void saveProducts(
        getChangedProducts(productsList, renamedProducts),
      ).catch((error) =>
        setProductsError(error.message || 'Unable to update product categories.'),
      )
      const renamedSubcategories = subcategoriesList.map((subcategory) =>
        String(subcategory.categoryId) === String(category.id)
          ? { ...subcategory, categoryName: category.name }
          : subcategory,
      )
      setSubcategoriesList(renamedSubcategories)
      void saveRecords(
        'subcategories',
        renamedSubcategories.filter(
          (subcategory) => String(subcategory.categoryId) === String(category.id),
        ),
      ).catch((error) =>
        setProductsError(error.message || 'Unable to update subcategories.'),
      )
    }
  }
  const handleDeleteCategory = (categoryId) => {
    const category = categoriesList.find((item) => item.id === categoryId)
    if (!category) return 'Category not found.'
    if (productsList.some((product) => productBelongsToCategory(product, category))) {
      return 'Move or delete products in this category before deleting it.'
    }
    if (
      subcategoriesList.some(
        (subcategory) => String(subcategory.categoryId) === String(category.id),
      )
    ) {
      return 'Delete or move this category\'s subcategories before deleting it.'
    }
    setCategoriesList((current) =>
      current.filter((item) => item.id !== categoryId),
    )
    void removeRecord('categories', categoryId).catch((error) =>
      setProductsError(error.message || 'Unable to delete the category.'),
    )
    return ''
  }

  const handleAddSubcategory = (subcategory) => {
    setSubcategoriesList((current) => [...current, subcategory])
    void saveRecord('subcategories', subcategory).catch((error) =>
      setProductsError(error.message || 'Unable to add the subcategory.'),
    )
  }
  const handleUpdateSubcategory = (subcategory, previousSubcategory) => {
    setSubcategoriesList((current) =>
      current.map((item) => (item.id === subcategory.id ? subcategory : item)),
    )
    void saveRecord('subcategories', subcategory, { merge: true }).catch((error) =>
      setProductsError(error.message || 'Unable to update the subcategory.'),
    )

    if (!previousSubcategory) return
    const category = categoriesList.find(
      (item) => String(item.id) === String(subcategory.categoryId),
    )
    if (!category) return
    const updatedProducts = productsList.map((product) =>
      productBelongsToSubcategory(product, previousSubcategory)
        ? {
            ...product,
            categoryId: category.id,
            category: category.name,
            subcategoryId: subcategory.id,
            subcategory: subcategory.name,
          }
        : product,
    )
    const changedProducts = getChangedProducts(productsList, updatedProducts)
    if (!changedProducts.length) return
    setProductsList(updatedProducts)
    void saveProducts(changedProducts).catch((error) =>
      setProductsError(error.message || 'Unable to update product subcategories.'),
    )
  }
  const handleDeleteSubcategory = (subcategoryId) => {
    const subcategory = subcategoriesList.find(
      (item) => String(item.id) === String(subcategoryId),
    )
    if (!subcategory) return 'Subcategory not found.'
    if (
      productsList.some((product) =>
        productBelongsToSubcategory(product, subcategory),
      )
    ) {
      return 'Move or delete products in this subcategory before deleting it.'
    }
    setSubcategoriesList((current) =>
      current.filter((item) => String(item.id) !== String(subcategoryId)),
    )
    void removeRecord('subcategories', subcategoryId).catch((error) =>
      setProductsError(error.message || 'Unable to delete the subcategory.'),
    )
    return ''
  }

  const handleUpdateReview = (review) => {
    const updatedReviews = adminReviews.map((item) =>
      item.id === review.id ? review : item,
    )
    setAdminReviews(updatedReviews)
    void saveRecord('reviews', review, { merge: true })
      .then(() => {
        if (review.productId) {
          void updateProductRatingStats(review.productId, updatedReviews)
        }
      })
      .catch((error) =>
        setProductsError(error.message || 'Unable to update the review.'),
      )
  }
  const handleDeleteReview = (reviewId) => {
    const targetReview = adminReviews.find((r) => r.id === reviewId)
    const updatedReviews = adminReviews.filter((review) => review.id !== reviewId)
    setAdminReviews(updatedReviews)
    void removeRecord('reviews', reviewId)
      .then(() => {
        if (targetReview?.productId) {
          void updateProductRatingStats(targetReview.productId, updatedReviews)
        }
      })
      .catch((error) =>
        setProductsError(error.message || 'Unable to delete the review.'),
      )
  }

  const handleUpdateCustomer = async (customerId, status) => {
    await updateCustomerAccountStatus(customerId, status)
    setCustomersList((current) =>
      current.map((customer) =>
        customer.id === customerId ? { ...customer, status } : customer,
      ),
    )
  }

  const handleAdjustStock = async (productId, adjustment) => {
    const result = adjustProductStock(productsList, productId, adjustment)
    if (result.error) return result.error
    const product = result.products.find((item) => item.id === productId)
    await saveProduct(product)
    setProductsList(result.products)
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
  const managedSubcategories = subcategoriesList
  const publishedReviewsList = (reviewsList || []).filter(
    (review) => review.status === 'Published',
  )
  const productRatingsMap = new Map()
  publishedReviewsList.forEach((review) => {
    if (!review.productId) return
    const pid = String(review.productId)
    const existing = productRatingsMap.get(pid) || { count: 0, sum: 0 }
    existing.count += 1
    existing.sum += Number(review.rating || 0)
    productRatingsMap.set(pid, existing)
  })

  const catalogProducts = productsList.map((product) => {
    const normalized = normalizeProductTaxonomy(
      product,
      managedCategories,
      managedSubcategories,
    )
    const stats = productRatingsMap.get(String(product.id))
    const count = stats ? stats.count : 0
    const rating = count > 0 ? Math.round((stats.sum / count) * 10) / 10 : 0
    return {
      ...normalized,
      rating,
      reviewsCount: count,
    }
  })
  const storefrontProducts = catalogProducts
    .filter(
      (product) => {
        const category = categoryForProduct(product, managedCategories)
        const subcategory = subcategoryForProduct(
          product,
          managedSubcategories,
          category,
        )
        return (
          product.enabled !== false &&
          category?.enabled !== false &&
          subcategory?.enabled !== false
        )
      },
    )
    .map((product) => ({
      ...productForStorefront(product),
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
          productsLoading={productsLoading}
          productsError={productsError}
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
          onBeSellerClick={() => switchPortal('admin')}
        />
      ) : (
        <AdminApp
          products={catalogProducts}
          orders={ordersList}
          refunds={refundsList}
          returns={returnsList}
          coupons={couponsList}
          customers={customersList}
          productsLoading={productsLoading}
          productsError={productsError}
          categories={managedCategories}
          subcategories={managedSubcategories}
          reviews={reviewsList}
          marketingSettings={marketingSettings}
          shippingSettings={shippingSettings}
          invoiceSettings={invoiceSettings}
          adminSettings={adminSettings}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onAdjustStock={handleAdjustStock}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateReturn={handleUpdateReturn}
          onAddCoupon={handleAddCoupon}
          onUpdateCoupon={handleUpdateCoupon}
          onDeleteCoupon={handleDeleteCoupon}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddSubcategory={handleAddSubcategory}
          onUpdateSubcategory={handleUpdateSubcategory}
          onDeleteSubcategory={handleDeleteSubcategory}
          onUpdateReview={handleUpdateReview}
          onDeleteReview={handleDeleteReview}
          onUpdateCustomer={handleUpdateCustomer}
          onUpdateMarketingSettings={updateMarketingSettings}
          onUpdateInvoiceSettings={updateInvoiceSettings}
          onUpdateAdminSettings={updateAdminSettings}
        />
      )}
    </div>
  )
}

export default App
