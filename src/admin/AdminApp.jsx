import { useEffect, useState } from 'react'
import { useAdminAuth } from './hooks/useAdminAuth'
import AdminLayout from './layouts/AdminLayout'
import AdminLoginPage from './pages/AdminLoginPage'
import CustomersPage from './pages/CustomersPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'

export default function AdminApp({
  products = [],
  orders = [],
  customers = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  inventoryHistory = [],
  onAdjustStock,
  onUpdateOrderStatus,
  onSwitchToStore,
}) {
  const { admin, loading, login, logout } = useAdminAuth()
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

      {activeTab === 'users' && (
        <CustomersPage customers={customers} searchQuery={searchQuery} />
      )}
    </AdminLayout>
  )
}
