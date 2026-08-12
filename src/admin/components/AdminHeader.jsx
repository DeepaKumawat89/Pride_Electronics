import { Bell, Menu, Search, X } from 'lucide-react'

export default function AdminHeader({ onSearch, searchQuery, onOpenSidebar }) {
  return (
    <header className="admin-header">
      <div className="admin-title-box">
        <span className="admin-header-eyebrow">Pride Electronics</span>
        <h1>Welcome, <span>Pride Admin</span></h1>
      </div>

      <div className="admin-header-actions">
        <button
          className="icon-btn admin-menu-btn"
          onClick={onOpenSidebar}
          aria-label="Open management panel"
          aria-controls="admin-management-panel"
        >
          <Menu size={20} />
        </button>

        <div className="search-box-enhanced">
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search for products..."
            value={searchQuery}
            onChange={(event) => onSearch?.(event.target.value)}
          />
          {searchQuery && (
            <button className="admin-search-clear" onClick={() => onSearch?.('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <button className="icon-btn admin-notification-btn" title="System notifications" aria-label="System notifications">
          <Bell size={18} />
          <span className="badge-count" style={{ background: 'var(--amber)' }}>3</span>
        </button>
      </div>
    </header>
  )
}
