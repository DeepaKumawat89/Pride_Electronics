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

export default function AdminApp({
  products = [],
  orders = [],
  refunds = [],
  returns = [],
  coupons = [],
  customers = [],
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
    setActiveTab(tab)
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

  const activeRole = adminSettings.roles.find((role) => role.name === admin.role)
  const permissions = activeRole?.permissions || ['dashboard']

  return (
    <AdminLayout
      activeTab={activeTab}
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
      {activeTab === 'dashboard' && (
        <DashboardPage
          products={products}
          orders={orders}
          customers={customers}
          onNavigate={handleSelectTab}
        />
      )}

      {activeTab === 'products' && (
        <ProductsPage
          products={products}
          onAddProduct={onAddProduct}
          onUpdateProduct={onUpdateProduct}
          onDeleteProduct={onDeleteProduct}
          searchQuery={searchQuery}
        />
      )}

      {activeTab === 'orders' && (
        <OrdersPage
          orders={orders}
          onUpdateOrderStatus={onUpdateOrderStatus}
          searchQuery={searchQuery}
          couriers={shippingSettings.couriers}
        />
      )}

      {activeTab === 'inventory' && (
        <InventoryPage
          products={products}
          history={inventoryHistory}
          searchQuery={searchQuery}
          onAdjustStock={onAdjustStock}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentsPage
          orders={orders}
          refunds={refunds}
          searchQuery={searchQuery}
        />
      )}

      {activeTab === 'returns' && (
        <ReturnsPage
          returns={returns}
          searchQuery={searchQuery}
          onUpdateReturn={onUpdateReturn}
          pickupSettings={shippingSettings.pickup}
        />
      )}

      {activeTab === 'coupons' && (
        <CouponsPage
          coupons={coupons}
          onAddCoupon={onAddCoupon}
          onUpdateCoupon={onUpdateCoupon}
          onDeleteCoupon={onDeleteCoupon}
          searchQuery={searchQuery}
        />
      )}

      {activeTab === 'users' && (
        <CustomersPage
          customers={customers}
          orders={orders}
          refunds={refunds}
          returns={returns}
          searchQuery={searchQuery}
        />
      )}

      {activeTab === 'offers' && (
        <OffersPage
          settings={marketingSettings}
          products={products}
          onUpdate={onUpdateMarketingSettings}
        />
      )}

      {activeTab === 'shipping' && (
        <ShippingPage
          settings={shippingSettings}
          onUpdate={onUpdateShippingSettings}
        />
      )}

      {activeTab === 'tax-invoice' && (
        <TaxInvoicePage
          settings={invoiceSettings}
          onUpdate={onUpdateInvoiceSettings}
        />
      )}

      {activeTab === 'settings' && (
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
