import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  LockKeyhole,
  MapPin,
  Minus,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
} from 'lucide-react'
import { formatCurrency, hasValidPrice } from '../../utils/currency'
import { getApplicablePricingTier } from '../../../utils/productPricing'
import { verifyGstinDetails } from '../../../firebase/customerData'
import { isValidGstinFormat } from '../../utils/gstinVerification'
import {
  calculateCartPricing,
  paymentAmountMatchesCheckout,
  toRazorpayAmount,
} from '../../utils/cart'
import {
  getPinDeliveryAvailability,
  normalizeAddress,
} from '../../utils/address'
import { loadRazorpayCheckout, postRazorpayApi } from '../../utils/razorpay'
import {
  createRazorpayDisplayConfig,
  preferredRazorpayMethod,
} from '../../utils/razorpayOptions'
import { initialShippingSettings } from '../../../data/shipping'
import { initialInvoiceSettings } from '../../../data/invoice'
import { initialAdminSettings } from '../../../data/adminSettings'
import {
  AddressAutocompleteInput,
  CitySelectionInput,
  CurrentLocationControl,
  PincodeAutocompleteInput,
  StateSelectionInput,
} from '../address/AddressAssist'
import { useAddressEntryAssist } from '../../hooks/useAddressEntryAssist'

const createPaymentReceipt = () => `pride_${Date.now()}`
const GST_PROFILE_FRESH_AFTER = Date.now() - 30 * 24 * 60 * 60 * 1000
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
    city: normalizedAddress.city || '',
    state: normalizedAddress.state || '',
    pincode: normalizedAddress.pincode || '',
    coordinates: normalizedAddress.coordinates || null,
    latitude: normalizedAddress.latitude ?? null,
    longitude: normalizedAddress.longitude ?? null,
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

  // Only provider-verified server records are reusable. Legacy client-authored
  // gstDetails values intentionally require verification again.
  const initialGstProfiles = [
    ...(Array.isArray(user?.gstProfiles) ? user.gstProfiles : []),
    ...(user?.gstDetails ? [user.gstDetails] : []),
  ].filter((profile, index, profiles) =>
    profile?.verificationProvider === 'cashfree' &&
    profile?.verificationStatus === 'verified' &&
    new Date(profile.verifiedAt || 0).getTime() >= GST_PROFILE_FRESH_AFTER &&
    profiles.findIndex((item) => item?.gstin === profile.gstin) === index,
  )
  const savedGst = initialGstProfiles[0] || null
  const [gstProfiles, setGstProfiles] = useState(initialGstProfiles)
  const [isGstInvoice, setIsGstInvoice] = useState(() => Boolean(savedGst?.gstin))
  const [gstin, setGstin] = useState(() => savedGst?.gstin || '')
  const [gstError, setGstError] = useState('')
  const [gstinVerifying, setGstinVerifying] = useState(false)
  const [gstVerifiedDetails, setGstVerifiedDetails] = useState(() => savedGst || null)
  const [gstConfirmed, setGstConfirmed] = useState(() => Boolean(savedGst?.gstin))

  // Cashfree GSTIN verification action handler
  const handleVerifyGstin = async () => {
    const cleanGstin = gstin.trim().toUpperCase()
    setGstError('')
    if (!cleanGstin) {
      setGstError('Please enter your 15-character GSTIN.')
      return
    }
    if (!isValidGstinFormat(cleanGstin)) {
      setGstError('Enter a valid 15-character Indian GSTIN format (e.g. 22AAAAA0000A1Z5).')
      return
    }

    setGstinVerifying(true)
    try {
      const details = await verifyGstinDetails(cleanGstin)
      setGstVerifiedDetails(details)
      setGstProfiles((current) => [
        details,
        ...current.filter((profile) => profile.gstin !== details.gstin),
      ].slice(0, 5))
      setGstConfirmed(true)
    } catch (err) {
      setGstVerifiedDetails(null)
      setGstConfirmed(false)
      setGstError(err.message || 'GSTIN verification failed. Please check your GSTIN and try again.')
    } finally {
      setGstinVerifying(false)
    }
  }

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

  // Address entry assist hooks
  const deliveryAssist = useAddressEntryAssist(
    deliveryAddressForm,
    setDeliveryAddressForm,
    useManualDeliveryAddress,
  )
  const billingAssist = useAddressEntryAssist(
    billingAddressForm,
    setBillingAddressForm,
    useManualBillingAddress,
  )

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

  // Delivery Availability Computation (pincode based)
  const deliveryAddressAvailability = getPinDeliveryAvailability(
    selectedDeliveryAddress?.pincode,
    new Date(),
    shippingSettings,
  )
  const formDeliveryAvailability = getPinDeliveryAvailability(
    deliveryAddressForm.pincode,
    new Date(),
    shippingSettings,
  )

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
    deliveryAssist.reset()
    setDeliveryAddressForm(createCheckoutAddress(user, address))
    setDeliveryAddressError('')
    setUseManualDeliveryAddress(true)
  }

  const closeDeliveryAddressForm = () => {
    deliveryAssist.reset()
    setDeliveryAddressForm(createCheckoutAddress(user))
    setDeliveryAddressError('')
    if (savedAddresses.length > 0) {
      setUseManualDeliveryAddress(false)
    }
  }

  const openBillingAddressForm = (address) => {
    billingAssist.reset()
    setBillingAddressForm(createCheckoutAddress(user, address))
    setBillingAddressError('')
    setUseManualBillingAddress(true)
  }

  const closeBillingAddressForm = () => {
    billingAssist.reset()
    setBillingAddressForm(createCheckoutAddress(user))
    setBillingAddressError('')
    setUseManualBillingAddress(false)
  }

  // Save Delivery Address inline
  const saveDeliveryAddressInline = () => {
    const requiredFields = [
      'fullName',
      'phone',
      'houseFlat',
      'street',
      'area',
      'city',
      'state',
      'pincode',
    ]
    if (requiredFields.some((field) => !String(deliveryAddressForm[field] || '').trim())) {
      setDeliveryAddressError('Please fill in all mandatory delivery address fields.')
      return null
    }
    if (!/^[6-9]\d{9}$/.test(deliveryAddressForm.phone)) {
      setDeliveryAddressError('Enter a valid 10-digit Indian mobile number.')
      return null
    }
    if (!formDeliveryAvailability.available) {
      setDeliveryAddressError(formDeliveryAvailability.message)
      return null
    }
    if (deliveryAssist.pincodeLookup.invalid) {
      setDeliveryAddressError(deliveryAssist.pincodeLookup.message)
      return null
    }
    const saved = onSaveAddress?.(normalizeAddress({
      ...deliveryAddressForm,
      fullName: deliveryAddressForm.fullName.trim(),
      phone: deliveryAddressForm.phone.trim(),
      houseFlat: deliveryAddressForm.houseFlat.trim(),
      street: deliveryAddressForm.street.trim(),
      area: deliveryAddressForm.area.trim(),
      city: deliveryAddressForm.city.trim(),
      state: deliveryAddressForm.state.trim(),
      pincode: deliveryAddressForm.pincode.trim(),
    }))
    if (saved?.id) {
      setDeliveryAddressId(saved.id)
      closeDeliveryAddressForm()
      return saved
    }
    return null
  }

  // Save Billing Address inline
  const saveBillingAddressInline = () => {
    const requiredFields = [
      'fullName',
      'phone',
      'houseFlat',
      'street',
      'area',
      'city',
      'state',
      'pincode',
    ]
    if (requiredFields.some((field) => !String(billingAddressForm[field] || '').trim())) {
      setBillingAddressError('Please fill in all mandatory billing address fields.')
      return null
    }
    if (!/^[6-9]\d{9}$/.test(billingAddressForm.phone)) {
      setBillingAddressError('Enter a valid 10-digit Indian mobile number.')
      return null
    }
    const saved = onSaveAddress?.(normalizeAddress({
      ...billingAddressForm,
      fullName: billingAddressForm.fullName.trim(),
      phone: billingAddressForm.phone.trim(),
      houseFlat: billingAddressForm.houseFlat.trim(),
      street: billingAddressForm.street.trim(),
      area: billingAddressForm.area.trim(),
      city: billingAddressForm.city.trim(),
      state: billingAddressForm.state.trim(),
      pincode: billingAddressForm.pincode.trim(),
    }))
    if (saved?.id) {
      setBillingAddressId(saved.id)
      closeBillingAddressForm()
      return saved
    }
    return null
  }

  // Validate Page 1 & Navigate to Page 2
  const handleProceedToSummary = () => {
    setDeliveryAddressError('')
    setBillingAddressError('')
    setGstError('')
    setPage1Error('')

    // 1. Delivery Address Validation
    if (useManualDeliveryAddress) {
      const saved = saveDeliveryAddressInline()
      if (!saved) {
        setPage1Error('Please fix delivery address errors before proceeding.')
        return
      }
    } else {
      if (!selectedDeliveryAddress) {
        setPage1Error('Please select a delivery address.')
        return
      }
      if (!deliveryAddressAvailability.available) {
        setPage1Error(`Selected delivery address issue: ${deliveryAddressAvailability.message}`)
        return
      }
    }

    // 2. Billing Address Validation (if different)
    if (!billingSameAsDelivery) {
      if (useManualBillingAddress) {
        const saved = saveBillingAddressInline()
        if (!saved) {
          setPage1Error('Please fix billing address errors before proceeding.')
          return
        }
      } else if (!selectedBillingAddress) {
        setPage1Error('Please select a billing address.')
        return
      }
    }

    // 3. GST Details Validation (if requested)
    if (isGstInvoice) {
      const cleanGstin = gstin.trim().toUpperCase()
      if (!cleanGstin) {
        setGstError('Please enter your 15-character GSTIN.')
        setPage1Error('GSTIN is required when requesting a GST Invoice.')
        return
      }
      if (!isValidGstinFormat(cleanGstin)) {
        setGstError('Enter a valid 15-character Indian GSTIN format (e.g. 22AAAAA0000A1Z5).')
        setPage1Error('Invalid GSTIN format. Example: 22AAAAA0000A1Z5')
        return
      }
      if (!gstVerifiedDetails || gstVerifiedDetails.gstin !== cleanGstin) {
        setGstError('Please click "Verify GSTIN" to verify your GST details with Cashfree before proceeding.')
        setPage1Error('GSTIN verification is required before proceeding.')
        return
      }
      if (!gstConfirmed) {
        setGstError('Please confirm that the verified business details belong to you.')
        setPage1Error('Please confirm your GST business details.')
        return
      }
      if (!gstVerifiedDetails.legalName?.trim()) {
        setGstError('Registered Business / Company Name is required.')
        setPage1Error('Registered Business Name is required for GST Invoice.')
        return
      }
    }

    // Switch page view to Page 2: Order Summary
    setActivePage('summary')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  // Submit Order (Page 2)
  const submitOrder = async (event) => {
    if (event) event.preventDefault()
    if (paymentInFlight.current) return
    setPaymentError('')

    if (!selectedDeliveryAddress) {
      setPaymentError('Select or save a delivery address before placing your order.')
      setActivePage('address')
      return
    }
    if (!deliveryAddressAvailability.available) {
      setPaymentError(deliveryAddressAvailability.message)
      setActivePage('address')
      return
    }
    if (!items.length || hasUnavailableItems) {
      setPaymentError('Your cart contains unavailable or invalid items. Return to your cart and review them before placing the order.')
      return
    }

    const checkoutDetails = {
      requestId: checkoutRequestId.current,
      checkoutMode: checkoutMode === 'buy-now' ? 'buy-now' : 'cart',
      address: selectedDeliveryAddress,
      billingAddress: selectedBillingAddress,
      gstin: isGstInvoice && gstVerifiedDetails && gstConfirmed
        ? gstin.trim().toUpperCase()
        : '',
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
        estimatedDate: deliveryAddressAvailability.estimatedDate || createEstimatedDeliveryDate(3),
      },
    }

    paymentInFlight.current = true
    setPaying(true)

    if (paymentMode === 'cod' || !onlinePaymentEnabled) {
      try {
        await onPlaceOrder({ ...checkoutDetails, cod: true })
      } catch (error) {
        setPaymentError(error.message || 'Unable to place the order.')
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
        gstin: checkoutDetails.gstin,
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
          name: user?.name || selectedDeliveryAddress?.fullName || '',
          email: user?.email || '',
          contact: user?.mobile || selectedDeliveryAddress?.phone || '',
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
            await onPlaceOrder({
              ...checkoutDetails,
              razorpay: response,
              verifiedPayment: verification.payment,
            })
          } catch (error) {
            setPaymentError(error.message)
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
              onClick={() => {
                setActivePage('address')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="inline-flex items-center gap-2 text-xs font-extrabold text-[#397a4a] hover:underline transition"
            >
              <ArrowLeft size={16} /> Back to Address & GST Details
            </button>
          )}

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <ShieldCheck size={14} className="text-[#397a4a]" /> Real-time Firebase Sync
          </div>
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
                    const avail = getPinDeliveryAvailability(address.pincode, new Date(), shippingSettings)
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
                              <strong className="text-xs font-extrabold text-slate-900">{address.label} — {address.fullName}</strong>
                              <span className="ml-2 text-[11px] font-semibold text-slate-500">({address.phone})</span>
                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                {address.houseFlat ? `${address.houseFlat}, ` : ''}{address.line1 || address.street}, {address.city}, {address.state} — <strong>{address.pincode}</strong>
                              </p>
                              <p className={`mt-1 text-[10px] font-bold ${avail.available ? 'text-emerald-700' : 'text-red-600'}`}>
                                {avail.message}
                              </p>
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
                  <CurrentLocationControl assist={deliveryAssist} className="sm:col-span-2" />
                  
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
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">10-Digit Mobile Phone *</label>
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
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">Flat / House / Building *</label>
                    <input
                      value={deliveryAddressForm.houseFlat}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, houseFlat: e.target.value })}
                      placeholder="Flat 102, Green Apartments"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">Street / Road *</label>
                    <AddressAutocompleteInput
                      assist={deliveryAssist}
                      value={deliveryAddressForm.street}
                      placeholder="MG Road, 4th Block"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">Locality / Area *</label>
                    <input
                      value={deliveryAddressForm.area}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, area: e.target.value })}
                      placeholder="Koramangala, Near Forum Mall"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">State *</label>
                    <StateSelectionInput
                      assist={deliveryAssist}
                      value={deliveryAddressForm.state}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">City *</label>
                    <CitySelectionInput
                      assist={deliveryAssist}
                      value={deliveryAddressForm.city}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">PIN Code *</label>
                    <PincodeAutocompleteInput
                      assist={deliveryAssist}
                      value={deliveryAddressForm.pincode}
                      placeholder="6-digit PIN code"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">Label</label>
                    <select
                      value={deliveryAddressForm.label}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, label: e.target.value })}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work / Office</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    {deliveryAddressError && <p className="mb-2 text-xs font-bold text-red-600">{deliveryAddressError}</p>}
                    {deliveryAssist.pincodeLookup.invalid && (
                      <p className="mb-2 text-xs font-bold text-red-600">{deliveryAssist.pincodeLookup.message}</p>
                    )}
                    <p className={`mb-3 rounded-lg px-3 py-2 text-xs font-bold ${
                      formDeliveryAvailability.available ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {formDeliveryAvailability.message}
                    </p>

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
                          disabled={!formDeliveryAvailability.available || deliveryAssist.pincodeLookup.invalid}
                          onClick={saveDeliveryAddressInline}
                          className="rounded-lg bg-[#253329] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#397a4a] disabled:opacity-40"
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
                                <strong className="text-xs font-bold text-slate-900">{address.label} — {address.fullName}</strong>
                                <p className="text-xs text-slate-600">
                                  {address.houseFlat ? `${address.houseFlat}, ` : ''}{address.line1 || address.street}, {address.city} ({address.pincode})
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
                      <AddressAutocompleteInput
                        assist={billingAssist}
                        value={billingAddressForm.street}
                        placeholder="Street / Area *"
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none"
                      />
                      <StateSelectionInput
                        assist={billingAssist}
                        value={billingAddressForm.state}
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none"
                      />
                      <CitySelectionInput
                        assist={billingAssist}
                        value={billingAddressForm.city}
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none"
                      />
                      <PincodeAutocompleteInput
                        assist={billingAssist}
                        value={billingAddressForm.pincode}
                        placeholder="6-digit PIN code *"
                        className="h-10 rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none sm:col-span-2"
                      />
                      {billingAddressError && <p className="text-xs font-bold text-red-600 sm:col-span-2">{billingAddressError}</p>}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* GSTIN & Business Details Section (Optional) */}
            <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 sm:p-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
                <Building2 size={18} className="text-[#397a4a]" />
                <h2 className="text-base font-extrabold text-slate-900">GST Invoice Details <span className="text-xs font-normal text-slate-400">(Optional)</span></h2>
              </div>

              {/* Checkbox toggle: GST Invoice required */}
              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer rounded-xl bg-[#f8faf7] p-3.5 border border-slate-200/60">
                  <input
                    type="checkbox"
                    checked={isGstInvoice}
                    onChange={(e) => {
                      setIsGstInvoice(e.target.checked)
                      setGstError('')
                    }}
                    className="size-4 rounded border-slate-300 text-[#397a4a] focus:ring-[#397a4a]"
                  />
                  <div>
                    <strong className="text-xs font-bold text-slate-900">I require a GST Invoice for business purchase</strong>
                    <p className="text-[11px] text-slate-500">Claim GST input credit with your GSTIN and registered company name.</p>
                  </div>
                </label>
              </div>

              {/* GSTIN Input & Cashfree Verification Section */}
              {isGstInvoice && (
                <div className="mt-4 space-y-4">
                  {gstProfiles.length > 0 && (
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-700">
                        Saved GST registrations
                      </label>
                      <select
                        value={gstProfiles.some((profile) => profile.gstin === gstin) ? gstin : ''}
                        onChange={(event) => {
                          const profile = gstProfiles.find((item) => item.gstin === event.target.value)
                          if (!profile) return
                          setGstin(profile.gstin)
                          setGstVerifiedDetails(profile)
                          setGstConfirmed(true)
                          setGstError('')
                        }}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-semibold outline-none focus:border-[#397a4a] focus:bg-white"
                      >
                        <option value="">Enter another GSTIN</option>
                        {gstProfiles.map((profile) => (
                          <option key={profile.gstin} value={profile.gstin}>
                            {profile.gstin} — {profile.tradeName || profile.legalName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">GSTIN (15-character GST Number) *</label>
                        {gstin && (
                          <span className={`text-[10px] font-bold ${isValidGstinFormat(gstin) ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {isValidGstinFormat(gstin) ? '✓ Format Valid' : 'Format: 15 Alphanumeric'}
                          </span>
                        )}
                      </div>
                      <input
                        value={gstin}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().slice(0, 15)
                          setGstin(val)
                          setGstError('')
                          if (gstVerifiedDetails && gstVerifiedDetails.gstin !== val) {
                            setGstVerifiedDetails(null)
                            setGstConfirmed(false)
                          }
                        }}
                        maxLength={15}
                        placeholder="e.g. 22AAAAA0000A1Z5"
                        className="h-10 w-full uppercase tracking-wider rounded-lg border border-slate-200 bg-[#fafbfa] px-3 text-xs font-bold outline-none focus:border-[#397a4a] focus:bg-white"
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        disabled={gstinVerifying || !isValidGstinFormat(gstin) || (gstVerifiedDetails && gstVerifiedDetails.gstin === gstin.trim().toUpperCase())}
                        onClick={handleVerifyGstin}
                        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#253329] px-4 text-xs font-extrabold text-white transition hover:bg-[#397a4a] disabled:opacity-40 shadow-sm"
                      >
                        {gstinVerifying ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : gstVerifiedDetails && gstVerifiedDetails.gstin === gstin.trim().toUpperCase() ? (
                          <>
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span>Verified</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={14} />
                            <span>Verify GSTIN</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Cashfree Verified Business Details Card */}
                  {gstVerifiedDetails && gstVerifiedDetails.gstin === gstin.trim().toUpperCase() && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={18} className="text-emerald-600" />
                          <span className="text-xs font-extrabold text-emerald-950 tracking-wide">GST Portal Verified Details</span>
                          <span className="rounded-full bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Cashfree Verified
                          </span>
                        </div>
                        <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider">
                          {gstVerifiedDetails.status || 'Active'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Legal Registered Business Name</span>
                          <strong className="text-slate-900 font-extrabold text-sm block">{gstVerifiedDetails.legalName}</strong>
                        </div>
                        {gstVerifiedDetails.tradeName && (
                          <div>
                            <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Trade Name</span>
                            <span className="text-slate-800 font-bold">{gstVerifiedDetails.tradeName}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Taxpayer Type</span>
                          <span className="text-slate-800 font-bold">{gstVerifiedDetails.taxpayerType || 'Regular'}</span>
                        </div>
                        {gstVerifiedDetails.registrationDate && (
                          <div>
                            <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Registration Date</span>
                            <span className="text-slate-800 font-bold">{gstVerifiedDetails.registrationDate}</span>
                          </div>
                        )}
                        {gstVerifiedDetails.address && (
                          <div className="sm:col-span-2 bg-white/80 rounded-lg p-2.5 border border-emerald-100">
                            <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Registered Business Address</span>
                            <span className="text-slate-800 font-medium leading-relaxed">{gstVerifiedDetails.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Business Confirmation Checkbox */}
                      <div className="pt-2.5 border-t border-emerald-200/80">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={gstConfirmed}
                            onChange={(e) => {
                              setGstConfirmed(e.target.checked)
                              if (e.target.checked) setGstError('')
                            }}
                            className="mt-0.5 size-4 rounded border-emerald-400 text-[#397a4a] focus:ring-[#397a4a]"
                          />
                          <span className="text-xs font-semibold text-emerald-950 leading-tight">
                            I confirm that this GSTIN belongs to my business and details match my tax registration.
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Invoice identity is locked to the provider-verified record. */}
                  {gstVerifiedDetails && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] leading-4 text-slate-500">
                      The business name and registered address on the invoice come directly from
                      Cashfree verification and cannot be edited at checkout.
                    </div>
                  )}

                  {gstError && (
                    <div className="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-600 border border-red-100 flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0 text-red-500" />
                      <span>{gstError}</span>
                    </div>
                  )}
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
                  onClick={() => {
                    setActivePage('address')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="flex items-center gap-1 text-xs font-extrabold text-[#397a4a] hover:underline"
                >
                  <Edit3 size={13} /> Edit Address & GST
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl bg-[#f8faf7] p-3 border border-slate-200/60">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#397a4a]">Delivery Address</span>
                  <strong className="block font-bold text-slate-900 mt-0.5">
                    {selectedDeliveryAddress?.fullName} ({selectedDeliveryAddress?.phone})
                  </strong>
                  <p className="mt-0.5 text-slate-600 leading-4">
                    {selectedDeliveryAddress?.houseFlat ? `${selectedDeliveryAddress.houseFlat}, ` : ''}
                    {selectedDeliveryAddress?.line1 || selectedDeliveryAddress?.street}, {selectedDeliveryAddress?.city}, {selectedDeliveryAddress?.state} — <strong>{selectedDeliveryAddress?.pincode}</strong>
                  </p>
                </div>

                <div className="rounded-xl bg-[#f8faf7] p-3 border border-slate-200/60">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Billing & Tax</span>
                  {billingSameAsDelivery ? (
                    <p className="font-bold text-slate-800 mt-0.5">Same as Delivery Address</p>
                  ) : (
                    <p className="text-slate-600 mt-0.5">
                      {selectedBillingAddress?.fullName} — {selectedBillingAddress?.line1 || selectedBillingAddress?.street}, {selectedBillingAddress?.city}
                    </p>
                  )}

                  {isGstInvoice ? (
                    <p className="mt-1 font-bold text-[#366643]">
                      GSTIN: {gstin} ({gstVerifiedDetails?.legalName})
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-0.5">Regular Invoice</p>
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
                    By clicking <strong>Place Order</strong>, you agree to Pride Electronics'{' '}
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
                {paying ? 'Placing Order…' : `Place Order · ${formatCurrency(checkoutTotal)}`}
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
