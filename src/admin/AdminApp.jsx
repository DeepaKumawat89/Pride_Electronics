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
import ShippingPage from './pages/ShippingPage'
import { initialMarketingSettings } from '../data/marketing'
import { initialShippingSettings } from '../data/shipping'
import { initialInvoiceSettings } from '../data/invoice'
import TaxInvoicePage from './pages/TaxInvoicePage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import { initialAdminSettings } from '../data/adminSettings'
import CategoriesPage from './pages/CategoriesPage'
import ReviewsPage from './pages/ReviewsPage'
import ReportsPage from './pages/ReportsPage'
import { EmptyState } from './components/ui/AdminUI'

export default function AdminApp({
  products = [],
  orders = [],
  refunds = [],
  returns = [],
  coupons = [],
  customers = [],
  categories = [],
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
  inventoryHistory = [],
  onAdjustStock,
  onUpdateOrderStatus,
  onUpdateReturn,
  onAddCoupon,
  onUpdateCoupon,
  onDeleteCoupon,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateReview,
  onDeleteReview,
  onUpdatePaymentStatus,
  onUpdateCustomer,
  onUpdateMarketingSettings,
  onUpdateShippingSettings,
  onUpdateInvoiceSettings,
  onUpdateAdminSettings,
  onSwitchToStore,
}) {
  const { admin, loading, login, logout, updateProfile, changePassword } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const activeRole = adminSettings.roles.find((role) => role.name === admin?.role)
  const permissions = activeRole?.permissions || []
  const canAccess = (tab) =>
    permissions.includes('*') || permissions.includes(tab)
  const firstPermittedTab = permissions.includes('*')
    ? 'dashboard'
    : permissions[0] || null
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

  const handleLogout = () => {
    setIsSidebarOpen(false)
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
        onSwitchToStore={onSwitchToStore}
      />
    )
  }

  return (
    <AdminLayout
      activeTab={permittedTab || 'unauthorized'}
      admin={admin}
      sidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      onLogout={handleLogout}
      onOpenSidebar={() => setIsSidebarOpen(true)}
      onSearch={setSearchQuery}
      onSelectTab={handleSelectTab}
      onSwitchToStore={onSwitchToStore}
      searchQuery={searchQuery}
      notificationSettings={adminSettings.notifications}
      permissions={permissions}
      storeName={adminSettings.store.name}
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
          loading={productsLoading}
          loadError={productsError}
        />
      )}

      {permittedTab === 'categories' && (
        <CategoriesPage
          categories={categories}
          products={products}
          onAddCategory={onAddCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
          searchQuery={searchQuery}
        />
      )}

      {permittedTab === 'orders' && (
        <OrdersPage
          orders={orders}
          onUpdateOrderStatus={onUpdateOrderStatus}
          searchQuery={searchQuery}
          couriers={shippingSettings.couriers}
        />
      )}

      {permittedTab === 'inventory' && (
        <InventoryPage
          products={products}
          history={inventoryHistory}
          searchQuery={searchQuery}
          onAdjustStock={onAdjustStock}
        />
      )}

      {permittedTab === 'payments' && (
        <PaymentsPage
          orders={orders}
          refunds={refunds}
          searchQuery={searchQuery}
          onUpdatePaymentStatus={onUpdatePaymentStatus}
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
          refunds={refunds}
          returns={returns}
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

      {permittedTab === 'shipping' && (
        <ShippingPage
          settings={shippingSettings}
          onUpdate={onUpdateShippingSettings}
        />
      )}

      {permittedTab === 'tax-invoice' && (
        <TaxInvoicePage
          settings={invoiceSettings}
          onUpdate={onUpdateInvoiceSettings}
        />
      )}

      {permittedTab === 'reports' && (
        <ReportsPage
          products={products}
          orders={orders}
          customers={customers}
          refunds={refunds}
          invoiceSettings={invoiceSettings}
          searchQuery={searchQuery}
        />
      )}

      {permittedTab === 'settings' && (
        <AdminSettingsPage
          settings={adminSettings}
          admin={admin}
          shippingSettings={shippingSettings}
          invoiceSettings={invoiceSettings}
          onUpdate={onUpdateAdminSettings}
          onUpdateAdmin={updateProfile}
          onChangePassword={changePassword}
          onNavigate={handleSelectTab}
        />
      )}
    </AdminLayout>
  )
}
