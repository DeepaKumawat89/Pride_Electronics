import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Edit3,
  FileText,
  LockKeyhole,
  MapPin,
  Minus,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
} from 'lucide-react'
import { formatCurrency, hasValidPrice } from '../../utils/currency'
import { getApplicablePricingTier } from '../../../utils/productPricing'
import {
  calculateCartPricing,
  paymentAmountMatchesCheckout,
  toRazorpayAmount,
} from '../../utils/cart'
import { getAddressValidationError, normalizeAddress } from '../../utils/address'
import { loadRazorpayCheckout, postRazorpayApi } from '../../utils/razorpay'
import {
  createRazorpayDisplayConfig,
  preferredRazorpayMethod,
} from '../../utils/razorpayOptions'
import { initialShippingSettings } from '../../../data/shipping'
import {
  getGstDetailsError,
  initialInvoiceSettings,
  normalizeGstin,
} from '../../../data/invoice'
import { initialAdminSettings } from '../../../data/adminSettings'

const createPaymentReceipt = () => `pride_${Date.now()}`
const createCheckoutRequestId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`

const reservationTimeoutSeconds = (expiresAt) => {
  const remaining = Math.floor(
    (new Date(expiresAt || 0).getTime() - Date.now()) / 1000,
  )
  return remaining >= 180 ? Math.min(900, remaining) : 0
}

const createEstimatedDeliveryDate = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const createCheckoutAddress = (user, address = {}) => {
  const normalizedAddress = normalizeAddress(address)
  return {
    id: normalizedAddress.id || '',
    type: normalizedAddress.type || 'Shipping',
    label: normalizedAddress.label || 'Home',
    fullName: normalizedAddress.fullName || user?.name || '',
    phone: normalizedAddress.phone || user?.mobile || '',
    houseFlat: normalizedAddress.houseFlat || '',
    street: normalizedAddress.street || '',
    area: normalizedAddress.area || '',
    line1: normalizedAddress.line1 || '',
    landmark: normalizedAddress.landmark || '',
    city: normalizedAddress.city || '',
    state: normalizedAddress.state || '',
    pincode: normalizedAddress.pincode || '',
    isDefault: Boolean(normalizedAddress.isDefault),
  }
}

export default function CheckoutPage({
  items = [],
  initialCouponCode = '',
  coupons = [],
  savedAddresses = [],
  savedPayments = [],
  user,
  onSaveAddress,
  onPrepareCheckout,
  onBack,
  onPlaceOrder,
  onUpdateQuantity,
  onRemoveItem,
  onOpenPolicy,
  checkoutMode = 'cart',
  shippingSettings = initialShippingSettings,
  taxSettings = initialInvoiceSettings.tax,
  paymentSettings = initialAdminSettings.payment,
  storeName = initialAdminSettings.store.name,
}) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const checkoutRequestId = useRef(createCheckoutRequestId())
  const paymentInFlight = useRef(false)
  const [orderConfirmationAttempt, setOrderConfirmationAttempt] = useState(null)

  const releaseCheckoutReservation = async (
    reason,
    requestId = checkoutRequestId.current,
  ) => {
    if (checkoutRequestId.current === requestId) {
      checkoutRequestId.current = createCheckoutRequestId()
    }
    try {
      await postRazorpayApi('release', { requestId, reason })
    } catch {
      // The scheduled backend cleanup remains the backstop if this best-effort
      // release cannot reach Firebase (for example, when the browser is offline).
    }
  }

  // 2 separate page view state ('address' = Page 1: Address & GST, 'summary' = Page 2: Order Summary)
  const [activePage, setActivePage] = useState('address')
  const [checkoutAddresses, setCheckoutAddresses] = useState(null)

  // Delivery Address State
  const defaultDeliveryAddress = savedAddresses.find((address) => address.isDefault) || savedAddresses[0]
  const [deliveryAddressId, setDeliveryAddressId] = useState(defaultDeliveryAddress?.id || '')
  const [useManualDeliveryAddress, setUseManualDeliveryAddress] = useState(savedAddresses.length === 0)
  const [deliveryAddressForm, setDeliveryAddressForm] = useState(() => createCheckoutAddress(user))
  const [deliveryAddressError, setDeliveryAddressError] = useState('')

  // Billing Address State
  const [billingSameAsDelivery, setBillingSameAsDelivery] = useState(true)
  const [billingAddressId, setBillingAddressId] = useState(defaultDeliveryAddress?.id || '')
  const [useManualBillingAddress, setUseManualBillingAddress] = useState(false)
  const [billingAddressForm, setBillingAddressForm] = useState(() => createCheckoutAddress(user))
  const [billingAddressError, setBillingAddressError] = useState('')

  // Optional business tax identity. Billing and delivery remain independent,
  // which covers both bill-to/ship-to GST purchase variants.
  const [businessPurchase, setBusinessPurchase] = useState(
    Boolean(taxSettings.gstEnabled && user?.gstDetails?.gstin),
  )
  const [gstDetails, setGstDetails] = useState({
    legalName: user?.gstDetails?.legalName || '',
    tradeName: user?.gstDetails?.tradeName || '',
    gstin: normalizeGstin(user?.gstDetails?.gstin),
  })
  const [gstDetailsError, setGstDetailsError] = useState('')

  // Page 1 global error
  const [page1Error, setPage1Error] = useState('')

  // Coupon & Payment State
  const [coupon, setCoupon] = useState(initialCouponCode)
  const [appliedCoupon, setAppliedCoupon] = useState(initialCouponCode)
  const [couponAttempted, setCouponAttempted] = useState(Boolean(initialCouponCode))
  const [paymentError, setPaymentError] = useState('')
  const [paying, setPaying] = useState(false)

  const defaultPayment = savedPayments.find((payment) => payment.isDefault) || savedPayments[0]
  const onlinePaymentEnabled = paymentSettings.razorpayEnabled && [
    paymentSettings.cardsEnabled,
    paymentSettings.upiEnabled,
    paymentSettings.netBankingEnabled,
    paymentSettings.walletsEnabled,
  ].some(Boolean)

  const paymentMode = onlinePaymentEnabled ? 'online' : 'cod'
  const primaryActionLabel = orderConfirmationAttempt
    ? 'Confirm Order'
    : paymentMode === 'online'
      ? 'Pay Now'
      : 'Place Order'

  // Active delivery address computation
  const selectedDeliveryAddress = useManualDeliveryAddress
    ? normalizeAddress(deliveryAddressForm)
    : (savedAddresses.find((address) => address.id === deliveryAddressId) || defaultDeliveryAddress)

  // Active billing address computation
  const selectedBillingAddress = billingSameAsDelivery
    ? selectedDeliveryAddress
    : (useManualBillingAddress
        ? normalizeAddress(billingAddressForm)
        : (savedAddresses.find((address) => address.id === billingAddressId) || selectedDeliveryAddress))

  // Pricing computation
  const pricing = calculateCartPricing(
    items,
    appliedCoupon,
    new Date(),
    coupons,
    user?.email,
    shippingSettings,
    taxSettings,
  )

  const checkoutTotal = pricing.total

  const hasUnavailableItems = items.some(
    ({ product, quantity }) =>
      !hasValidPrice(product.price) ||
      Number(product.stock) <= 0 ||
      quantity > Number(product.stock),
  )

  // Coupon handling
  const handleApplyCoupon = (codeToApply = coupon) => {
    const trimmed = String(codeToApply || '').trim().toUpperCase()
    setCoupon(trimmed)
    setAppliedCoupon(trimmed)
    setCouponAttempted(true)
  }

  const handleClearCoupon = () => {
    setCoupon('')
    setAppliedCoupon('')
    setCouponAttempted(false)
  }

  // Address form toggles
  const openDeliveryAddressForm = (address) => {
    setDeliveryAddressForm(createCheckoutAddress(user, address))
    setDeliveryAddressError('')
    setUseManualDeliveryAddress(true)
  }

  const closeDeliveryAddressForm = () => {
    setDeliveryAddressForm(createCheckoutAddress(user))
    setDeliveryAddressError('')
    if (savedAddresses.length > 0) {
      setUseManualDeliveryAddress(false)
    }
  }

  const openBillingAddressForm = (address) => {
    setBillingAddressForm(createCheckoutAddress(user, address))
    setBillingAddressError('')
    setGstDetailsError('')
    setUseManualBillingAddress(true)
  }

  const closeBillingAddressForm = () => {
    setBillingAddressForm(createCheckoutAddress(user))
    setBillingAddressError('')
    setUseManualBillingAddress(false)
  }

  const editCheckoutDetails = () => {
    const deliveryAddress = checkoutAddresses?.delivery
    const billingAddress = checkoutAddresses?.billing

    if (deliveryAddress) {
      setDeliveryAddressId(deliveryAddress.id || '')
      setDeliveryAddressForm(createCheckoutAddress(user, deliveryAddress))
      setDeliveryAddressError('')
      setUseManualDeliveryAddress(true)
    }

    if (!billingSameAsDelivery && billingAddress) {
      setBillingAddressId(billingAddress.id || '')
      setBillingAddressForm(createCheckoutAddress(user, billingAddress))
      setBillingAddressError('')
      setUseManualBillingAddress(true)
    }

    setCheckoutAddresses(null)
    setPage1Error('')
    setActivePage('address')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Save Delivery Address inline
  const saveDeliveryAddressInline = () => {
    const validationError = getAddressValidationError(deliveryAddressForm, {
      requireStructured: true,
      addressType: 'delivery',
    })
    if (validationError) {
      setDeliveryAddressError(validationError)
      return null
    }
    const saved = onSaveAddress?.(normalizeAddress({
      ...deliveryAddressForm,
      fullName: deliveryAddressForm.fullName.trim(),
      phone: deliveryAddressForm.phone.trim(),
      houseFlat: deliveryAddressForm.houseFlat.trim(),
      street: deliveryAddressForm.street.trim(),
      area: deliveryAddressForm.area.trim(),
      landmark: deliveryAddressForm.landmark.trim(),
      city: deliveryAddressForm.city.trim(),
      state: deliveryAddressForm.state.trim(),
      pincode: deliveryAddressForm.pincode.trim(),
    }))
    if (saved?.id) {
      setDeliveryAddressId(saved.id)
      setDeliveryAddressForm(createCheckoutAddress(user, saved))
      setDeliveryAddressError('')
      setUseManualDeliveryAddress(false)
      return saved
    }
    return null
  }

  // Save Billing Address inline
  const saveBillingAddressInline = () => {
    const validationError = getAddressValidationError(billingAddressForm, {
      requireStructured: true,
      addressType: 'billing',
    })
    if (validationError) {
      setBillingAddressError(validationError)
      return null
    }
    const saved = onSaveAddress?.(normalizeAddress({
      ...billingAddressForm,
      fullName: billingAddressForm.fullName.trim(),
      phone: billingAddressForm.phone.trim(),
      houseFlat: billingAddressForm.houseFlat.trim(),
      street: billingAddressForm.street.trim(),
      area: billingAddressForm.area.trim(),
      landmark: billingAddressForm.landmark.trim(),
      city: billingAddressForm.city.trim(),
      state: billingAddressForm.state.trim(),
      pincode: billingAddressForm.pincode.trim(),
    }))
    if (saved?.id) {
      setBillingAddressId(saved.id)
      setBillingAddressForm(createCheckoutAddress(user, saved))
      setBillingAddressError('')
      setUseManualBillingAddress(false)
      return saved
    }
    return null
  }

  // Validate Page 1 & Navigate to Page 2
  const handleProceedToSummary = () => {
    setDeliveryAddressError('')
    setBillingAddressError('')
    setGstDetailsError('')
    setPage1Error('')

    // Capture immutable checkout addresses before Firebase account snapshots or
    // later form edits can change the saved-address collection beneath step 2.
    let checkoutDeliveryAddress = selectedDeliveryAddress
    if (useManualDeliveryAddress) {
      const saved = saveDeliveryAddressInline()
      if (!saved) {
        setPage1Error('Please fix delivery address errors before proceeding.')
        return
      }
      checkoutDeliveryAddress = saved
    } else {
      if (!checkoutDeliveryAddress) {
        setPage1Error('Please select a delivery address.')
        return
      }
      const validationError = getAddressValidationError(checkoutDeliveryAddress)
      if (validationError) {
        setPage1Error(validationError)
        return
      }
    }

    let checkoutBillingAddress = checkoutDeliveryAddress
    if (!billingSameAsDelivery) {
      if (useManualBillingAddress) {
        const saved = saveBillingAddressInline()
        if (!saved) {
          setPage1Error('Please fix billing address errors before proceeding.')
          return
        }
        checkoutBillingAddress = saved
      } else if (!selectedBillingAddress) {
        setPage1Error('Please select a billing address.')
        return
      } else {
        const validationError = getAddressValidationError(selectedBillingAddress, {
          addressType: 'billing',
        })
        if (validationError) {
          setPage1Error(validationError)
          return
        }
        checkoutBillingAddress = selectedBillingAddress
      }
    }


    let gstProfile = null
    if (businessPurchase) {
      const validationError = getGstDetailsError(gstDetails)
      if (validationError) {
        setGstDetailsError(validationError)
        setPage1Error('Please fix the GST details before proceeding.')
        return
      }
      gstProfile = {
        legalName: gstDetails.legalName.trim(),
        tradeName: gstDetails.tradeName.trim(),
        gstin: normalizeGstin(gstDetails.gstin),
      }
    }

    setCheckoutAddresses({
      delivery: normalizeAddress(checkoutDeliveryAddress),
      billing: normalizeAddress(checkoutBillingAddress),
      gstProfile,
    })
    setActivePage('summary')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  // Submit Order (Page 2)
  const submitOrder = async (event) => {
    if (event) event.preventDefault()
    if (paymentInFlight.current) return
    setPaymentError('')

    const checkoutDeliveryAddress = checkoutAddresses?.delivery
    const checkoutBillingAddress = checkoutAddresses?.billing
    if (!checkoutDeliveryAddress) {
      setPaymentError('Select or save a delivery address before placing your order.')
      setActivePage('address')
      return
    }
    const addressValidationError = getAddressValidationError(checkoutDeliveryAddress)
    if (addressValidationError) {
      setPaymentError(addressValidationError)
      setActivePage('address')
      return
    }
    const billingValidationError = getAddressValidationError(checkoutBillingAddress, {
      addressType: 'billing',
    })
    if (billingValidationError) {
      setPaymentError(billingValidationError)
      setActivePage('address')
      return
    }

    if (orderConfirmationAttempt) {
      paymentInFlight.current = true
      setPaying(true)
      try {
        await onPlaceOrder(orderConfirmationAttempt)
      } catch (error) {
        setPaymentError(
          orderConfirmationAttempt.cod
            ? `${error.message || 'Order confirmation is temporarily unavailable.'} Retry confirmation; the same order will not be created twice.`
            : `${error.message || 'Order confirmation is temporarily unavailable.'} Your payment is already verified; retry confirmation without paying again.`,
        )
        paymentInFlight.current = false
        setPaying(false)
      }
      return
    }

    if (!items.length || hasUnavailableItems) {
      setPaymentError('Your cart contains unavailable or invalid items. Return to your cart and review them before placing the order.')
      return
    }

    const checkoutDetails = {
      requestId: checkoutRequestId.current,
      checkoutMode: checkoutMode === 'buy-now' ? 'buy-now' : 'cart',
      address: checkoutDeliveryAddress,
      billingAddress: checkoutBillingAddress,
      gstProfile: checkoutAddresses?.gstProfile || null,
      payment: { type: paymentMode === 'online' ? 'Online Payment' : 'Cash on Delivery' },
      discount: pricing.couponDiscount,
      shipping: pricing.shipping,
      tax: pricing.tax,
      total: checkoutTotal,
      expectedTotalPaise: Math.round(checkoutTotal * 100),
      couponCode: pricing.coupon.status === 'applied' ? appliedCoupon : '',
      delivery: {
        id: 'standard',
        name: 'Standard Delivery',
        estimatedDate: createEstimatedDeliveryDate(3),
      },
    }

    paymentInFlight.current = true
    setPaying(true)

    try {
      await onPrepareCheckout?.()
    } catch (error) {
      setPaymentError(error.message || 'Unable to save your checkout details. Please try again.')
      paymentInFlight.current = false
      setPaying(false)
      return
    }

    if (paymentMode === 'cod' || !onlinePaymentEnabled) {
      const codCheckout = { ...checkoutDetails, cod: true }
      setOrderConfirmationAttempt(codCheckout)
      try {
        await onPlaceOrder(codCheckout)
      } catch (error) {
        setPaymentError(
          `${error.message || 'Unable to confirm the order.'} Retry confirmation; the same order will not be created twice.`,
        )
        paymentInFlight.current = false
        setPaying(false)
      }
      return
    }

    try {
      const loaded = await loadRazorpayCheckout()
      if (!loaded) {
        throw new Error(
          'Secure payment checkout could not be loaded. Check your connection or browser settings and try again.',
        )
      }

      const { environment, keyId, order, quote, reservation } = await postRazorpayApi('orders', {
        amount: toRazorpayAmount(checkoutTotal),
        requestId: checkoutRequestId.current,
        checkoutMode: checkoutMode === 'buy-now' ? 'buy-now' : 'cart',
        items: items.map(({ product, quantity }) => ({
          productId: product.id,
          ...(product.selectedVariantId ? { variantId: product.selectedVariantId } : {}),
          quantity,
        })),
        couponCode: pricing.coupon.status === 'applied' ? appliedCoupon : '',
        deliveryId: 'standard',
        deliveryDate: checkoutDetails.delivery.estimatedDate,
        shippingAddress: checkoutDetails.address,
        billingAddress: checkoutDetails.billingAddress,
        gstProfile: checkoutDetails.gstProfile,
        receipt: createPaymentReceipt(),
      })

      if (!paymentAmountMatchesCheckout(
        checkoutTotal,
        order.amount,
        quote?.totalPaise,
      )) {
        throw new Error(
          'Your cart total changed while checking out. Review the updated cart and try again.',
        )
      }
      const checkoutTimeout = reservationTimeoutSeconds(reservation?.expiresAt)
      if (!checkoutTimeout) {
        throw new Error('The stock reservation expired before payment could begin. Try again.')
      }

      const preferredMethod = preferredRazorpayMethod(
        defaultPayment,
        paymentSettings,
      )
      const razorpay = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: storeName,
        description: `Order checkout for ${items.length} ${items.length === 1 ? 'item' : 'items'}`,
        order_id: order.id,
        prefill: {
          name: user?.name || checkoutDeliveryAddress.fullName || '',
          email: user?.email || '',
          contact: user?.mobile || checkoutDeliveryAddress.phone || '',
        },
        ...(preferredMethod ? { method: preferredMethod } : {}),
        notes: { checkout: `${storeName} ${environment === 'test' ? 'Test Mode' : 'Checkout'}` },
        theme: { color: '#253329', backdrop_color: '#17211d' },
        retry: { enabled: false },
        timeout: checkoutTimeout,
        config: createRazorpayDisplayConfig(paymentSettings),
        modal: {
          backdropclose: false,
          escape: true,
          ondismiss: () => {
            setPaymentError('Payment was cancelled. Your order was not placed.')
            paymentInFlight.current = false
            setPaying(false)
            void releaseCheckoutReservation(
              'Customer dismissed Razorpay checkout',
              checkoutDetails.requestId,
            )
          },
        },
        handler: async (response) => {
          let paymentVerified = false
          try {
            const verification = await postRazorpayApi('verify', response)
            if (!verification.verified) {
              throw new Error(
                'Payment verification failed. Your order was not placed; contact support if an amount was debited.',
              )
            }
            paymentVerified = true
            const verifiedCheckout = {
              ...checkoutDetails,
              razorpay: response,
              verifiedPayment: verification.payment,
            }
            setOrderConfirmationAttempt(verifiedCheckout)
            await onPlaceOrder(verifiedCheckout)
          } catch (error) {
            setPaymentError(
              paymentVerified
                ? `${error.message || 'Order confirmation is temporarily unavailable.'} Your payment is already verified; retry confirmation without paying again.`
                : error.message,
            )
            paymentInFlight.current = false
            setPaying(false)
            if (!paymentVerified) {
              void releaseCheckoutReservation(
                'Payment verification did not complete',
                checkoutDetails.requestId,
              )
            }
          }
        },
      })

      razorpay.on('payment.failed', () => {
        setPaymentError('Payment failed. No order was placed. Please try again.')
        paymentInFlight.current = false
        setPaying(false)
        void releaseCheckoutReservation(
          'Razorpay reported payment failure',
          checkoutDetails.requestId,
        )
      })
      razorpay.open()
    } catch (error) {
      await releaseCheckoutReservation(
        'Payment checkout could not be started',
        checkoutDetails.requestId,
      )
      setPaymentError(error.message || 'Unable to place the order.')
      paymentInFlight.current = false
      setPaying(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#f8faf7] text-slate-800">
      <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 sm:py-8">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          {activePage === 'address' ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#397a4a] transition"
            >
              <ArrowLeft size={16} /> Back to Cart
            </button>
          ) : (
            <button
              type="button"
              onClick={editCheckoutDetails}
              className="inline-flex items-center gap-2 text-xs font-extrabold text-[#397a4a] hover:underline transition"
            >
              <ArrowLeft size={16} /> Back to Address & GST Details
            </button>
          )}
        </div>

        {/* Page Title & Subtitle */}
        <div className="mt-5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#397a4a]">
            {activePage === 'address' ? 'Page 1 of 2' : 'Page 2 of 2'}
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {activePage === 'address' ? 'Address & GST Details' : 'Order Summary & Checkout'}
          </h1>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 1: ADDRESS & GST DETAILS                                             */}
        {/* ========================================================================= */}
        {activePage === 'address' && (
          <div className="mt-6 space-y-6">
            
            {/* Delivery Address Section (Mandatory) */}
            <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <MapPin size={18} className="text-[#397a4a]" />
                  <h2 className="text-base font-extrabold text-slate-900">Delivery Address <span className="text-xs font-bold text-red-600">*</span></h2>
                </div>

                {Boolean(savedAddresses.length) && (
                  <button
                    type="button"
                    onClick={() => useManualDeliveryAddress ? closeDeliveryAddressForm() : openDeliveryAddressForm()}
                    className="text-xs font-bold text-[#397a4a] hover:underline"
                  >
                    {useManualDeliveryAddress ? 'Select from saved addresses' : '+ Add new address'}
                  </button>
                )}
              </div>

              {/* Saved Addresses List */}
              {!useManualDeliveryAddress && Boolean(savedAddresses.length) && (
                <div className="mt-4 space-y-3">
                  {savedAddresses.map((address) => {
                    const isSelected = selectedDeliveryAddress?.id === address.id
                    return (
                      <label
                        key={address.id}
                        className={`block cursor-pointer rounded-xl border-2 p-4 transition ${
                          isSelected
                            ? 'border-[#397a4a] bg-[#f5f9f5]'
                            : 'border-slate-100 bg-[#fafbfa] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="delivery-address"
                              value={address.id}
                              checked={isSelected}
                              onChange={() => {
                                setDeliveryAddressId(address.id)
                                setPage1Error('')
                              }}
                              className="mt-0.5 size-4 border-slate-300 text-[#397a4a] focus:ring-[#397a4a]"
                            />
                            <div>
                              <strong className="text-xs font-extrabold text-slate-900">{address.label === 'Office' ? 'Work' : address.label} — {address.fullName}</strong>
                              <span className="ml-2 text-[11px] font-semibold text-slate-500">({address.phone})</span>
                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                {address.line1 || address.houseFlat || address.street}, {address.city}, {address.state} — <strong>{address.pincode}</strong>
                              </p>
                              {address.landmark && <p className="mt-0.5 text-[11px] text-slate-500">Landmark: {address.landmark}</p>}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openDeliveryAddressForm(address)
                            }}
                            className="p-1 text-slate-400 hover:text-[#397a4a]"
                            title="Edit Address"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Manual Delivery Address Form */}
              {(useManualDeliveryAddress || !savedAddresses.length) && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {deliveryAddressForm.id ? 'Edit Delivery Address' : 'Add Delivery Address'}
                    </h3>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">Full Name *</label>
                    <input
                      value={deliveryAddressForm.fullName}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, fullName: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">Mobile Number *</label>
                    <input
                      value={deliveryAddressForm.phone}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      inputMode="tel"
                      pattern="[6-9][0-9]{9}"
                      placeholder="e.g. 9876543210"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">PIN Code *</label>
                    <input
                      inputMode="numeric"
                      pattern="[1-9][0-9]{5}"
                      value={deliveryAddressForm.pincode}
                      onChange={(e) => setDeliveryAddressForm({
                        ...deliveryAddressForm,
                        pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                      })}
                      placeholder="6-digit PIN code"
                      autoComplete="postal-code"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">City *</label>
                    <input
                      value={deliveryAddressForm.city}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, city: e.target.value })}
                      placeholder="City"
                      autoComplete="address-level2"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">State *</label>
                    <input
                      value={deliveryAddressForm.state}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, state: e.target.value })}
                      placeholder="State"
                      autoComplete="address-level1"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">Flat / House No., Building, Street *</label>
                    <input
                      value={deliveryAddressForm.line1}
                      onChange={(e) => setDeliveryAddressForm({
                        ...deliveryAddressForm,
                        houseFlat: e.target.value,
                        street: '',
                        area: '',
                        line1: e.target.value,
                      })}
                      placeholder="Flat 102, Green Apartments, MG Road"
                      autoComplete="street-address"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">Landmark (Optional)</label>
                    <input
                      value={deliveryAddressForm.landmark}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, landmark: e.target.value })}
                      placeholder="Near a well-known place"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-[11px] font-bold text-slate-700">Address Type</label>
                    <select
                      value={deliveryAddressForm.label}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, label: e.target.value })}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Work</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    {deliveryAddressError && <p className="mb-2 text-xs font-bold text-red-600">{deliveryAddressError}</p>}

                    {Boolean(savedAddresses.length) && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={closeDeliveryAddressForm}
                          className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveDeliveryAddressInline}
                          className="rounded-lg bg-[#253329] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#397a4a]"
                        >
                          Save Address
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Billing Address Section (Optional) */}
            <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 sm:p-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
                <FileText size={18} className="text-[#397a4a]" />
                <h2 className="text-base font-extrabold text-slate-900">Billing Address <span className="text-xs font-normal text-slate-400">(Optional)</span></h2>
              </div>

              {/* Checkbox toggle: Billing address same as delivery */}
              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer rounded-xl bg-[#f8faf7] p-3.5 border border-slate-200/60">
                  <input
                    type="checkbox"
                    checked={billingSameAsDelivery}
                    onChange={(e) => {
                      setBillingSameAsDelivery(e.target.checked)
                      setBillingAddressError('')
                    }}
                    className="size-4 rounded border-slate-300 text-[#397a4a] focus:ring-[#397a4a]"
                  />
                  <div>
                    <strong className="text-xs font-bold text-slate-900">Billing address is same as delivery address</strong>
                    <p className="text-[11px] text-slate-500">Uncheck if you need the invoice sent to a different address.</p>
                  </div>
                </label>
              </div>

              {/* Separate Billing Address options when unchecked */}
              {!billingSameAsDelivery && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Select Billing Address</h3>
                    {Boolean(savedAddresses.length) && (
                      <button
                        type="button"
                        onClick={() => useManualBillingAddress ? closeBillingAddressForm() : openBillingAddressForm()}
                        className="text-xs font-bold text-[#397a4a] hover:underline"
                      >
                        {useManualBillingAddress ? 'Select saved address' : '+ Add custom billing address'}
                      </button>
                    )}
                  </div>

                  {!useManualBillingAddress && Boolean(savedAddresses.length) && (
                    <div className="space-y-2">
                      {savedAddresses.map((address) => {
                        const isSelected = selectedBillingAddress?.id === address.id
                        return (
                          <label
                            key={address.id}
                            className={`block cursor-pointer rounded-xl border-2 p-3 transition ${
                              isSelected
                                ? 'border-[#397a4a] bg-[#f5f9f5]'
                                : 'border-slate-100 bg-[#fafbfa] hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name="billing-address"
                                value={address.id}
                                checked={isSelected}
                                onChange={() => setBillingAddressId(address.id)}
                                className="size-4 border-slate-300 text-[#397a4a] focus:ring-[#397a4a]"
                              />
                              <div>
                                <strong className="text-xs font-bold text-slate-900">{address.label === 'Office' ? 'Work' : address.label} — {address.fullName}</strong>
                                <p className="text-xs text-slate-600">
                                  {address.line1 || address.houseFlat || address.street}, {address.city} ({address.pincode})
                                </p>
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {(useManualBillingAddress || !savedAddresses.length) && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        value={billingAddressForm.fullName}
                        onChange={(e) => setBillingAddressForm({ ...billingAddressForm, fullName: e.target.value })}
                        placeholder="Full Name *"
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none"
                      />
                      <input
                        value={billingAddressForm.phone}
                        onChange={(e) => setBillingAddressForm({ ...billingAddressForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="10-digit Phone Number *"
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none"
                      />
                      <input
                        value={billingAddressForm.houseFlat}
                        onChange={(e) => setBillingAddressForm({ ...billingAddressForm, houseFlat: e.target.value })}
                        placeholder="House / Flat / Building *"
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none"
                      />
                      <input
                        value={billingAddressForm.street}
                        onChange={(e) => setBillingAddressForm({ ...billingAddressForm, street: e.target.value, line1: '' })}
                        placeholder="Street / Area *"
                        autoComplete="street-address"
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none"
                      />
                      <input
                        value={billingAddressForm.area}
                        onChange={(e) => setBillingAddressForm({ ...billingAddressForm, area: e.target.value })}
                        placeholder="Locality / Area *"
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none"
                      />
                      <input
                        value={billingAddressForm.state}
                        onChange={(e) => setBillingAddressForm({ ...billingAddressForm, state: e.target.value })}
                        placeholder="State *"
                        autoComplete="address-level1"
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none"
                      />
                      <input
                        value={billingAddressForm.city}
                        onChange={(e) => setBillingAddressForm({ ...billingAddressForm, city: e.target.value })}
                        placeholder="City *"
                        autoComplete="address-level2"
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none"
                      />
                      <input
                        inputMode="numeric"
                        pattern="[1-9][0-9]{5}"
                        value={billingAddressForm.pincode}
                        onChange={(e) => setBillingAddressForm({
                          ...billingAddressForm,
                          pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                        })}
                        placeholder="6-digit PIN code *"
                        autoComplete="postal-code"
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none sm:col-span-2"
                      />
                      {billingAddressError && <p className="text-xs font-bold text-red-600 sm:col-span-2">{billingAddressError}</p>}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Optional GST details; combined with the two address choices this
                explicitly supports all four personal/business invoice cases. */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
                <Building2 size={18} className="text-[#397a4a]" />
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Business GST Details</h2>
                  <p className="text-[11px] text-slate-500">Optional — add these details only when claiming input tax credit.</p>
                </div>
              </div>

              <label className={`mt-4 flex items-center gap-3 rounded-xl border border-slate-200/60 bg-[#f8faf7] p-3.5 ${taxSettings.gstEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                <input
                  type="checkbox"
                  disabled={!taxSettings.gstEnabled}
                  checked={businessPurchase}
                  onChange={(event) => {
                    setBusinessPurchase(event.target.checked)
                    setGstDetailsError('')
                  }}
                  className="size-4 rounded border-slate-300 text-[#397a4a] focus:ring-[#397a4a]"
                />
                <div>
                  <strong className="text-xs font-bold text-slate-900">This is a business purchase</strong>
                  <p className="text-[11px] text-slate-500">
                    {taxSettings.gstEnabled
                      ? 'Your GSTIN and registered name will appear on the tax invoice.'
                      : 'Business GST invoicing is unavailable while GST is disabled by the store.'}
                  </p>
                </div>
              </label>

              {businessPurchase && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Registered legal name <span className="sr-only">required</span>
                    <input
                      required
                      maxLength={200}
                      value={gstDetails.legalName}
                      onChange={(event) => setGstDetails((current) => ({ ...current, legalName: event.target.value }))}
                      placeholder="Business name as registered under GST"
                      className="h-11 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-[#397a4a]"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    GSTIN <span className="sr-only">required</span>
                    <input
                      required
                      inputMode="text"
                      autoCapitalize="characters"
                      maxLength={15}
                      value={gstDetails.gstin}
                      onChange={(event) => setGstDetails((current) => ({ ...current, gstin: normalizeGstin(event.target.value) }))}
                      placeholder="27ABCDE1234F1Z5"
                      className="h-11 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-900 outline-none focus:border-[#397a4a]"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sm:col-span-2">
                    Trade name <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span>
                    <input
                      maxLength={200}
                      value={gstDetails.tradeName}
                      onChange={(event) => setGstDetails((current) => ({ ...current, tradeName: event.target.value }))}
                      placeholder="Brand or trading name"
                      className="h-11 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-[#397a4a]"
                    />
                  </label>
                  <p className="text-[10px] leading-4 text-slate-500 sm:col-span-2">
                    The GSTIN state code must match the selected billing address. The delivery state determines CGST/SGST or IGST.
                  </p>
                  {gstDetailsError && <p className="text-xs font-bold text-red-600 sm:col-span-2">{gstDetailsError}</p>}
                </div>
              )}
            </section>

            {/* Page 1 Global Error Notice */}
            {page1Error && (
              <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs font-bold text-red-700 border border-red-200">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{page1Error}</span>
              </div>
            )}

            {/* Proceed to Page 2 Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleProceedToSummary}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#253329] px-7 text-xs font-extrabold text-white shadow-md transition hover:bg-[#397a4a]"
              >
                Continue to Order Summary →
              </button>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2: ORDER SUMMARY & PLACE ORDER                                       */}
        {/* ========================================================================= */}
        {activePage === 'summary' && (
          <div className="mt-6 space-y-6">

            {/* Delivery & Billing Address Snippet Box */}
            <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Address & Tax Details</span>
                <button
                  type="button"
                  onClick={editCheckoutDetails}
                  className="flex items-center gap-1 text-xs font-extrabold text-[#397a4a] hover:underline"
                >
                  <Edit3 size={13} /> Edit Address & GST
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl bg-[#f8faf7] p-3 border border-slate-200/60">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#397a4a]">Delivery Address</span>
                  <strong className="block font-bold text-slate-900 mt-0.5">
                    {checkoutAddresses?.delivery?.fullName} ({checkoutAddresses?.delivery?.phone})
                  </strong>
                  <p className="mt-0.5 text-slate-600 leading-4">
                    {checkoutAddresses?.delivery?.line1 || checkoutAddresses?.delivery?.street}, {checkoutAddresses?.delivery?.city}, {checkoutAddresses?.delivery?.state} — <strong>{checkoutAddresses?.delivery?.pincode}</strong>
                  </p>
                  {checkoutAddresses?.delivery?.landmark && <p className="mt-0.5 text-slate-500">Landmark: {checkoutAddresses.delivery.landmark}</p>}
                </div>

                <div className="rounded-xl bg-[#f8faf7] p-3 border border-slate-200/60">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Billing & Tax</span>
                  {billingSameAsDelivery ? (
                    <p className="font-bold text-slate-800 mt-0.5">Same as Delivery Address</p>
                  ) : (
                    <p className="text-slate-600 mt-0.5">
                      {checkoutAddresses?.billing?.fullName} — {checkoutAddresses?.billing?.line1 || checkoutAddresses?.billing?.street}, {checkoutAddresses?.billing?.city}
                    </p>
                  )}

                  {checkoutAddresses?.gstProfile ? (
                    <div className="mt-2 border-t border-slate-200 pt-2">
                      <p className="font-bold text-slate-900">{checkoutAddresses.gstProfile.legalName}</p>
                      <p className="mt-0.5 font-mono text-[10px] font-bold tracking-wide text-[#397a4a]">
                        GSTIN {checkoutAddresses.gstProfile.gstin}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Personal purchase · {taxSettings.gstEnabled ? 'GST invoice without buyer GSTIN' : 'standard invoice'}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Cart Products List with Real-Time Quantity Controls */}
            <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-[#397a4a]" />
                  <h2 className="text-base font-extrabold text-slate-900">Products in Order</h2>
                </div>
                <span className="rounded-full bg-[#f4f7f4] px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {items.length} {items.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {!items.length && (
                  <div className="rounded-xl bg-amber-50 p-3.5 text-xs font-bold text-amber-800 border border-amber-200">
                    No items in checkout. Return to your cart or store.
                  </div>
                )}

                {items.map(({ key, product, quantity }) => {
                  const stock = Math.max(0, Number(product.stock) || 0)
                  const available = stock > 0
                  const applicableTier = getApplicablePricingTier(product, quantity)
                  const unitPrice = applicableTier.unitPrice
                  const validPrice = hasValidPrice(unitPrice)
                  const lineTotal = unitPrice * quantity

                  return (
                    <article
                      key={key}
                      className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-[#fafbfa] p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3.5">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="size-14 shrink-0 rounded-lg border border-slate-200/60 object-cover bg-white"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-xs font-extrabold text-slate-900 sm:text-sm">
                            {product.name}
                          </h3>
                          {product.selectedVariantName && (
                            <span className="mt-0.5 inline-block rounded bg-[#e4f1e7] px-1.5 py-0.5 text-[9px] font-bold text-[#366643]">
                              Variant: {product.selectedVariantName}
                            </span>
                          )}
                          <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                            Unit: {validPrice ? formatCurrency(unitPrice) : 'N/A'}
                            {applicableTier.isBulkTier && (
                              <span className="ml-1.5 rounded bg-[#e4f1e7] px-1.5 py-0.5 text-[9px] font-extrabold text-[#366643]">
                                Bulk Tier ({applicableTier.tierLabel})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Real-time Quantity Adjuster & Line Price */}
                      <div className="flex items-center justify-between gap-4 border-t border-slate-200/60 pt-2.5 sm:border-t-0 sm:pt-0 sm:justify-end">
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-0.5 shadow-sm">
                          <button
                            type="button"
                            onClick={() => {
                              if (quantity > 1) {
                                onUpdateQuantity?.(key, -1)
                              } else {
                                onRemoveItem?.(key)
                              }
                            }}
                            className="grid size-6 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                            title={quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                          >
                            {quantity === 1 ? <Trash2 size={12} className="text-red-600" /> : <Minus size={12} />}
                          </button>
                          <span className="min-w-[1.5rem] text-center text-xs font-extrabold text-slate-900">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            disabled={quantity >= stock}
                            onClick={() => onUpdateQuantity?.(key, 1)}
                            className="grid size-6 place-items-center rounded-full bg-[#253329] text-white transition hover:bg-[#397a4a] disabled:opacity-30"
                            title="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right">
                          <strong className="block text-xs font-black text-slate-900 sm:text-sm">
                            {validPrice ? formatCurrency(lineTotal) : 'N/A'}
                          </strong>
                          <span className={`text-[9px] font-bold ${available ? 'text-emerald-700' : 'text-red-600'}`}>
                            {available ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            {/* Offers & Coupons Section */}
            <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Tag size={15} className="text-[#397a4a]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Apply Offers & Coupons</h3>
                </div>
                {pricing.coupon.status === 'applied' && (
                  <button
                    type="button"
                    onClick={handleClearCoupon}
                    className="text-xs font-bold text-red-600 hover:underline"
                  >
                    Remove Coupon
                  </button>
                )}
              </div>

              {/* Available Coupons Cards */}
              {Boolean(coupons.length) && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {coupons.map((c) => {
                    const isApplied = appliedCoupon === c.code
                    return (
                      <div
                        key={c.code || c.id}
                        className={`flex shrink-0 items-center justify-between gap-3 rounded-xl border p-2.5 min-w-[200px] transition ${
                          isApplied ? 'border-[#397a4a] bg-[#e4f1e7]/40' : 'border-slate-200 bg-[#fbfdfb]'
                        }`}
                      >
                        <div>
                          <strong className="block text-xs font-extrabold uppercase text-[#397a4a]">{c.code}</strong>
                          <p className="text-[10px] font-semibold text-slate-500">{c.description || `${c.discountPercentage || 10}% Off`}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition ${
                            isApplied
                              ? 'bg-emerald-700 text-white'
                              : 'bg-[#253329] text-white hover:bg-[#397a4a]'
                          }`}
                        >
                          {isApplied ? 'Applied' : 'Apply'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Promo Input */}
              <div className="mt-2.5 flex gap-2">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="COUPON CODE"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-bold uppercase tracking-wider outline-none focus:border-[#397a4a] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon(coupon)}
                  className="rounded-lg bg-[#253329] px-4 text-xs font-extrabold text-white transition hover:bg-[#397a4a]"
                >
                  Apply
                </button>
              </div>

              {couponAttempted && pricing.coupon.message && (
                <p className={`mt-2 text-xs font-bold ${
                  pricing.coupon.status === 'applied' ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {pricing.coupon.message}
                </p>
              )}
            </section>

            {/* Price Breakdown Card */}
            <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#397a4a]">Price Breakdown</span>
                <ShoppingBag size={18} className="text-slate-400" />
              </div>

              {/* Complete Price Breakdown (Indian Rupees ₹) */}
              <div className="mt-4 space-y-2.5 text-xs text-slate-600">
                <SummaryRow label="Item Subtotal (Base Price)" value={formatCurrency(pricing.mrpSubtotal)} />

                {pricing.productDiscount > 0 && (
                  <SummaryRow label="Product Savings" value={`−${formatCurrency(pricing.productDiscount)}`} accent />
                )}

                {pricing.couponDiscount > 0 && (
                  <SummaryRow label="Coupon Discount" value={`−${formatCurrency(pricing.couponDiscount)}`} accent />
                )}

                <SummaryRow
                  label="Shipping Fee"
                  value={pricing.shipping ? formatCurrency(pricing.shipping) : 'FREE'}
                  accent={!pricing.shipping}
                />

                <SummaryRow
                  label="GST / Tax Amount"
                  value={`${formatCurrency(pricing.tax)} ${taxSettings.pricesIncludeTax ? '(Inclusive)' : '(Calculated)'}`}
                />
              </div>

              <div className="my-4 h-px bg-slate-100" />

              {/* Final Payable Amount */}
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-500">Total Payable Amount</span>
                  <p className="text-[10px] font-bold text-slate-400">Includes taxes & charges</p>
                </div>
                <strong className="text-2xl font-black tracking-tight text-slate-950">
                  {formatCurrency(checkoutTotal)}
                </strong>
              </div>

              {/* Payment / Stock Errors */}
              {paymentError && (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-700 border border-red-200">
                  {paymentError}
                </div>
              )}
              {hasUnavailableItems && (
                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800 border border-amber-200">
                  Some products are out of stock. Please adjust quantities before placing your order.
                </div>
              )}

              {/* Terms & Conditions / Privacy Policy Notice */}
              <div className="mt-4 rounded-xl bg-[#f8faf7] p-3 border border-slate-200/60 text-[11px] text-slate-600">
                <div className="flex items-start gap-2">
                  <LockKeyhole size={14} className="mt-0.5 shrink-0 text-[#397a4a]" />
                  <p className="leading-4">
                    By clicking <strong>{primaryActionLabel}</strong>, you agree to Pride Electronics'{' '}
                    <button
                      type="button"
                      onClick={() => onOpenPolicy?.('terms')}
                      className="font-bold text-[#397a4a] hover:underline"
                    >
                      Terms & Conditions
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => onOpenPolicy?.('privacy')}
                      className="font-bold text-[#397a4a] hover:underline"
                    >
                      Privacy Policy
                    </button>
                    . Payments are securely processed via 256-bit SSL encryption.
                  </p>
                </div>
              </div>

              {/* Place Order Primary Action Button */}
              <button
                type="button"
                onClick={submitOrder}
                disabled={!items.length || hasUnavailableItems || paying}
                className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[#253329] px-6 text-sm font-extrabold text-white shadow-md transition hover:bg-[#397a4a] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                <LockKeyhole size={16} />
                {paying
                  ? orderConfirmationAttempt
                    ? 'Confirming Order…'
                    : paymentMode === 'online'
                      ? 'Opening Secure Payment…'
                      : 'Placing Order…'
                  : `${primaryActionLabel} · ${formatCurrency(checkoutTotal)}`}
              </button>
            </section>

          </div>
        )}

      </div>
    </div>
  )
}

function SummaryRow({ label, value, accent = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <strong className={accent ? 'text-emerald-700 font-extrabold' : 'text-slate-900 font-bold'}>
        {value}
      </strong>
    </div>
  )
}
