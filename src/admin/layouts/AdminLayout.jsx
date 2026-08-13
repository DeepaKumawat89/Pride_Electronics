import AdminHeader from './AdminHeader'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout({
  children,
  activeTab,
  admin,
  searchQuery,
  onSearch,
  sidebarOpen,
  onOpenSidebar,
  onCloseSidebar,
  onSelectTab,
  onLogout,
  onSwitchToStore,
}) {
  return (
    <div className="min-h-screen bg-[#f7f8f5] text-slate-950 lg:grid lg:grid-cols-[278px_minmax(0,1fr)]">
      <AdminSidebar
        activeTab={activeTab}
        isOpen={sidebarOpen}
        onClose={onCloseSidebar}
        onSelectTab={onSelectTab}
        onLogout={onLogout}
        onSwitchToStore={onSwitchToStore}
      />
      <section className="min-w-0">
        <AdminHeader
          activeTab={activeTab}
          admin={admin}
          searchQuery={searchQuery}
          onSearch={onSearch}
          onOpenSidebar={onOpenSidebar}
        />
        <main className="mx-auto max-w-[1480px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </section>
    </div>
  )
}
