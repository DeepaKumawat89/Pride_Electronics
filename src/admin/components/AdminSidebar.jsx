import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  LogOut,
  X,
  Zap
} from 'lucide-react'

export default function AdminSidebar({
  activeTab,
  onSelectTab,
  onLogout,
  isOpen = false,
  onClose
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Hardware Catalog', icon: Package },
    { id: 'orders', label: 'Order Fulfillments', icon: ShoppingBag },
    { id: 'users', label: 'Customer Accounts', icon: Users },
  ]

  return (
    <>
      <button
        className={`admin-sidebar-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-label="Close navigation sidebar"
        tabIndex={isOpen ? 0 : -1}
      />

      <aside
        id="admin-management-panel"
        className={`admin-sidebar ${isOpen ? 'open' : ''}`}
        aria-label="Management panel"
      >
        <div className="admin-sidebar-content">
          <div className="admin-sidebar-brand">
            <span className="admin-sidebar-brand-mark"><Zap size={18} /></span>
            <span className="admin-sidebar-brand-name">Pride <strong>Electronics</strong></span>
            <button className="admin-sidebar-close" onClick={onClose} aria-label="Close navigation sidebar">
              <X size={20} />
            </button>
          </div>

          <nav className="admin-nav-list" aria-label="Admin sections">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  className={`admin-nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} style={{ color: '#ffffff', flexShrink: 0 }} />
                  <span
                    className="admin-nav-label"
                    style={{
                      color: '#ffffff',
                      display: 'inline-block',
                      visibility: 'visible',
                      opacity: 1,
                      fontWeight: isActive ? '800' : '600'
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="admin-sidebar-footer">
          <button className="admin-sidebar-logout-btn" onClick={onLogout} aria-label="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

