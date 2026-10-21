import { useEffect, useState } from 'react'
import { useAdminAuth } from './hooks/useAdminAuth'
import AdminLayout from './layouts/AdminLayout'
import AdminLoginPage from './pages/AdminLoginPage'
import CustomersPage from './pages/CustomersPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'
import PaymentsPage from './pages/PaymentsPage'
import ReturnsPage from './pages/ReturnsPage'
import CouponsPage from './pages/CouponsPage'
import OffersPage from './pages/OffersPage'
import { initialMarketingSettings } from '../data/marketing'
import { initialShippingSettings } from '../data/shipping'
import { initialInvoiceSettings } from '../data/invoice'
import TaxInvoicePage from './pages/TaxInvoicePage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import { initialAdminSettings } from '../data/adminSettings'
import CategoriesPage from './pages/CategoriesPage'
import ReviewsPage from './pages/ReviewsPage'
import { EmptyState } from './components/ui/AdminUI'
import AdminLogoutConfirmation from './components/AdminLogoutConfirmation'

export default function AdminApp({
  products = [],
  orders = [],
  refunds = [],
  returns = [],
  coupons = [],
  customers = [],
  categories = [],
  subcategories = [],
  reviews = [],
  productsLoading = false,
  productsError = '',
  marketingSettings = initialMarketingSettings,
  shippingSettings = initialShippingSettings,
  invoiceSettings = initialInvoiceSettings,
  adminSettings = initialAdminSettings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAdjustStock,
  onUpdateOrderStatus,
  onUpdateReturn,
  onAddCoupon,
  onUpdateCoupon,
  onDeleteCoupon,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onUpdateReview,
  onDeleteReview,
  onUpdateCustomer,
  onUpdateMarketingSettings,
  onUpdateInvoiceSettings,
  onUpdateAdminSettings,
}) {
  const {
    admin,
    loading,
    login,
    logout,
    resetPassword,
    updateProfile,
    changePassword,
  } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false)
  const permissions = admin?.permissions || []
  const availableTabs = new Set([
    'dashboard', 'products', 'categories', 'orders', 'inventory', 'payments',
    'returns', 'coupons', 'users', 'reviews', 'offers', 'tax-invoice', 'settings',
  ])
  const canAccess = (tab) =>
    availableTabs.has(tab) &&
    (permissions.includes('*') || permissions.includes(tab))
  const firstPermittedTab = permissions.includes('*')
    ? 'dashboard'
    : permissions.find((permission) => availableTabs.has(permission)) || null
  const permittedTab = canAccess(activeTab) ? activeTab : firstPermittedTab

  useEffect(() => {
    if (!isSidebarOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsSidebarOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSidebarOpen])

  useEffect(() => {
    if (!admin) return undefined
    const timeout = Math.max(
      5,
      Number(adminSettings.security.sessionTimeoutMinutes) || 60,
    ) * 60000
    let timer
    const resetTimer = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(logout, timeout)
    }
    const events = ['pointerdown', 'keydown', 'scroll']
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      window.clearTimeout(timer)
      events.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [admin, adminSettings.security.sessionTimeoutMinutes, logout])

  const handleLogin = async (email, password) => {
    await login(email, password)
    setActiveTab('dashboard')
  }

  const confirmLogout = () => {
    setIsSidebarOpen(false)
    setLogoutConfirmationOpen(false)
    logout()
  }

  const handleSelectTab = (tab) => {
    setActiveTab(canAccess(tab) ? tab : firstPermittedTab || 'unauthorized')
    setSearchQuery('')
    setIsSidebarOpen(false)
  }

  if (!admin) {
    return (
      <AdminLoginPage
        loading={loading}
        onLogin={handleLogin}
        onResetPassword={resetPassword}
        products={products}
        orders={orders}
      />
    )
  }

  return (
    <AdminLayout
      activeTab={permittedTab || 'unauthorized'}
      admin={admin}
      sidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      onLogout={() => {
        setIsSidebarOpen(false)
        setLogoutConfirmationOpen(true)
      }}
      onOpenSidebar={() => setIsSidebarOpen(true)}
      onSearch={setSearchQuery}
      onSelectTab={handleSelectTab}
      searchQuery={searchQuery}
      permissions={permissions}
    >
      {!permittedTab && (
        <EmptyState title="Access restricted" text="Your admin role does not have permission to open a management section. Contact a store administrator." />
      )}
      {permittedTab === 'dashboard' && (
        <DashboardPage
          products={products}
          orders={orders}
          customers={customers}
          onNavigate={handleSelectTab}
        />
      )}

      {permittedTab === 'products' && (
        <ProductsPage
          products={products}
          onAddProduct={onAddProduct}
          onUpdateProduct={onUpdateProduct}
          onDeleteProduct={onDeleteProduct}
          searchQuery={searchQuery}
          categories={categories}
          subcategories={subcategories}
          loading={productsLoading}
          loadError={productsError}
        />
      )}

      {permittedTab === 'categories' && (
        <CategoriesPage
          categories={categories}
          subcategories={subcategories}
          products={products}
          onAddCategory={onAddCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
          onAddSubcategory={onAddSubcategory}
          onUpdateSubcategory={onUpdateSubcategory}
          onDeleteSubcategory={onDeleteSubcategory}
          searchQuery={searchQuery}
        />
      )}

      {permittedTab === 'orders' && (
        <OrdersPage
          orders={orders}
          onUpdateOrderStatus={onUpdateOrderStatus}
          searchQuery={searchQuery}
        />
      )}

      {permittedTab === 'inventory' && (
        <InventoryPage
          products={products}
          searchQuery={searchQuery}
          onAdjustStock={onAdjustStock}
        />
      )}

      {permittedTab === 'payments' && (
        <PaymentsPage
          orders={orders}
          refunds={refunds}
          searchQuery={searchQuery}
        />
      )}

      {permittedTab === 'returns' && (
        <ReturnsPage
          returns={returns}
          searchQuery={searchQuery}
          onUpdateReturn={onUpdateReturn}
          pickupSettings={shippingSettings.pickup}
        />
      )}

      {permittedTab === 'coupons' && (
        <CouponsPage
          coupons={coupons}
          onAddCoupon={onAddCoupon}
          onUpdateCoupon={onUpdateCoupon}
          onDeleteCoupon={onDeleteCoupon}
          searchQuery={searchQuery}
        />
      )}

      {permittedTab === 'users' && (
        <CustomersPage
          customers={customers}
          orders={orders}
          searchQuery={searchQuery}
          onUpdateCustomer={onUpdateCustomer}
        />
      )}

      {permittedTab === 'reviews' && (
        <ReviewsPage
          reviews={reviews}
          onUpdateReview={onUpdateReview}
          onDeleteReview={onDeleteReview}
          searchQuery={searchQuery}
        />
      )}

      {permittedTab === 'offers' && (
        <OffersPage
          settings={marketingSettings}
          products={products}
          onUpdate={onUpdateMarketingSettings}
        />
      )}

      {permittedTab === 'tax-invoice' && (
        <TaxInvoicePage
          settings={invoiceSettings}
          onUpdate={onUpdateInvoiceSettings}
        />
      )}

      {permittedTab === 'settings' && (
        <AdminSettingsPage
          settings={adminSettings}
          admin={admin}
          invoiceSettings={invoiceSettings}
          onUpdate={onUpdateAdminSettings}
          onUpdateAdmin={updateProfile}
          onChangePassword={changePassword}
          onNavigate={handleSelectTab}
        />
      )}
      {logoutConfirmationOpen && (
        <AdminLogoutConfirmation
          onCancel={() => setLogoutConfirmationOpen(false)}
          onConfirm={confirmLogout}
        />
      )}
    </AdminLayout>
  )
}
