import { useEffect, useState } from 'react'
import AdminHeader from './components/AdminHeader'
import AdminSidebar from './components/AdminSidebar'
import AdminDashboard from './components/AdminDashboard'
import AdminProducts from './components/AdminProducts'
import AdminOrders from './components/AdminOrders'
import AdminUsers from './components/AdminUsers'
import AdminLogin from './components/AdminLogin'
import '../styles/admin.css'

export default function AdminApp({
  products = [],
  orders = [],
  customers = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onSwitchToStore
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    setActiveTab('dashboard')
  }

  const handleLogout = () => {
    setIsSidebarOpen(false)
    setIsAuthenticated(false)
  }

  const handleSelectTab = (tab) => {
    setActiveTab(tab)
    setIsSidebarOpen(false)
  }

  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onSwitchToStore={onSwitchToStore}
      />
    )
  }

  return (
    <div className="admin-app-layout">
      <div className="admin-body-layout">
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <section className="admin-content-shell">
          <AdminHeader
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />

          <main className="admin-main-content">
            {activeTab === 'dashboard' && (
              <AdminDashboard
                products={products}
                orders={orders}
                customers={customers}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'products' && (
              <AdminProducts
                products={products}
                onAddProduct={onAddProduct}
                onUpdateProduct={onUpdateProduct}
                onDeleteProduct={onDeleteProduct}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'orders' && (
              <AdminOrders
                orders={orders}
                onUpdateOrderStatus={onUpdateOrderStatus}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'users' && (
              <AdminUsers
                customers={customers}
                searchQuery={searchQuery}
              />
            )}
          </main>
        </section>
      </div>
    </div>
  )
}
