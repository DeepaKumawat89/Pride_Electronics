import {
  AlertTriangle, ArrowUpRight, Clock, DollarSign, Package,
  Plus, ShoppingBag, Users
} from 'lucide-react'

const moneyValue = (value) => Number(String(value || '').replace(/[^0-9.]/g, '')) || 0

export default function AdminDashboard({ products = [], orders = [], customers = [], onNavigate }) {
  const totalRevenue = orders.reduce((sum, order) => sum + moneyValue(order.total), 482900)
  const lowStockProducts = products.filter((product) => product.stock < 10)
  const pendingOrders = orders.filter((order) => order.status === 'Pending' || order.status === 'Processing').length
  const topProducts = products.slice(0, 4)
  const categoryCount = new Set(products.map((product) => product.category)).size

  const getInitials = (name) => String(name || 'Customer')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const avatarColors = ['#5b3cc4', '#16a6b6', '#e58cae', '#f0a438', '#765bd1']

  return (
    <div className="admin-dashboard-view reference-dashboard">
      <div className="reference-dashboard-grid">
        <div className="reference-dashboard-primary">
          <div className="reference-kpi-grid">
            <article className="reference-kpi-card orders-card">
              <div className="reference-kpi-icon"><ShoppingBag size={24} /></div>
              <div><div className="reference-kpi-value">{orders.length + 42}</div><div className="reference-kpi-label">Orders</div></div>
              <span className="reference-kpi-trend">+20</span>
            </article>

            <article className="reference-kpi-card profit-card">
              <div className="reference-kpi-icon"><DollarSign size={24} /></div>
              <div><div className="reference-kpi-value">₹{totalRevenue.toLocaleString('en-IN')}</div><div className="reference-kpi-label">Profit</div></div>
              <span className="reference-kpi-trend">+18.4%</span>
            </article>
          </div>

          <section className="reference-chart-card sales-chart-card">
            <div className="reference-section-heading">
              <div><span className="reference-section-kicker">Performance overview</span><h2>Sales statistics</h2></div>
              <span className="reference-period">Monthly</span>
            </div>

            <div className="reference-line-chart sales-lines" aria-label="Monthly sales chart">
              <div className="chart-y-labels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
              <svg viewBox="0 0 720 250" preserveAspectRatio="none" role="img">
                <g className="reference-grid-lines">
                  <line x1="0" y1="25" x2="720" y2="25" /><line x1="0" y1="75" x2="720" y2="75" />
                  <line x1="0" y1="125" x2="720" y2="125" /><line x1="0" y1="175" x2="720" y2="175" />
                  <line x1="0" y1="225" x2="720" y2="225" />
                </g>
                <path className="sales-path sales-path-pink" d="M0 205 C80 180 115 145 180 150 S280 115 350 104 S455 105 520 70 S640 70 720 20" />
                <path className="sales-path sales-path-blue" d="M0 220 C72 207 120 175 180 168 S275 152 350 146 S445 132 520 116 S650 103 720 68" />
                {[0, 180, 350, 520, 720].map((x, index) => <circle key={`pink-${x}`} className="sales-dot pink" cx={x} cy={[205, 150, 104, 70, 20][index]} r="5" />)}
                {[0, 180, 350, 520, 720].map((x, index) => <circle key={`blue-${x}`} className="sales-dot blue" cx={x} cy={[220, 168, 146, 116, 68][index]} r="5" />)}
              </svg>
              <div className="chart-x-labels"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div>
            </div>
          </section>
        </div>

        <aside className="reference-top-products">
          <div className="reference-section-heading compact">
            <div><span className="reference-section-kicker">Store ranking</span><h2>Top selling products</h2></div>
            <button onClick={() => onNavigate('products')}>See all <ArrowUpRight size={13} /></button>
          </div>

          <div className="reference-product-list">
            {topProducts.map((product, index) => (
              <button className="reference-product-row" key={product.id} onClick={() => onNavigate('products')}>
                <span className="reference-product-rank">{index + 1}</span>
                <img src={product.image} alt="" />
                <span className="reference-product-copy"><strong>{product.name}</strong><small>{product.category}</small></span>
                <span className="reference-product-price">{product.price}</span>
              </button>
            ))}
          </div>

          <div className="reference-catalog-summary">
            <Package size={18} /><span><strong>{products.length}</strong> products across {categoryCount} categories</span>
          </div>
        </aside>
      </div>

      <div className="reference-dashboard-lower">
        <section className="reference-chart-card visitors-chart-card">
          <div className="reference-section-heading">
            <div><span className="reference-section-kicker">Audience activity</span><h2>Unique visitors</h2></div>
            <span className="reference-period">Weekly</span>
          </div>
          <div className="reference-line-chart visitors-lines">
            <svg viewBox="0 0 720 150" preserveAspectRatio="none" role="img" aria-label="Weekly visitors chart">
              <path className="visitor-fill" d="M0 70 C70 25 110 120 180 75 S280 40 350 85 S460 95 530 45 S640 35 720 80 L720 150 L0 150 Z" />
              <path className="sales-path visitor-path" d="M0 70 C70 25 110 120 180 75 S280 40 350 85 S460 95 530 45 S640 35 720 80" />
            </svg>
            <div className="visitor-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          </div>
          <div className="reference-visitor-total"><strong>{customers.length + 1280}</strong><span>registered customers</span></div>
        </section>

        <section className="reference-quick-panel">
          <div className="reference-section-heading compact"><div><span className="reference-section-kicker">Shortcuts</span><h2>Quick actions</h2></div></div>
          <button onClick={() => onNavigate('products')}><span className="quick-action-icon purple"><Plus size={17} /></span><span>Add new hardware</span><ArrowUpRight size={15} /></button>
          <button onClick={() => onNavigate('orders')}><span className="quick-action-icon amber"><Clock size={17} /></span><span>Process pending orders</span><b>{pendingOrders}</b></button>
          <button onClick={() => onNavigate('users')}><span className="quick-action-icon cyan"><Users size={17} /></span><span>Customer accounts</span><ArrowUpRight size={15} /></button>
        </section>
      </div>

      <div className="admin-grid-2col reference-operations-grid">
        <section className="admin-table-card">
          <div className="admin-panel-header">
            <div><span className="reference-section-kicker">Order activity</span><h3>Recent customer orders</h3></div>
            <button className="back-link-btn" onClick={() => onNavigate('orders')}>View all <ArrowUpRight size={14} /></button>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {orders.slice(0, 5).map((order, index) => (
                  <tr key={order.id} onClick={() => onNavigate('orders')}>
                    <td className="reference-order-id">{order.id}</td>
                    <td><div className="reference-customer-cell"><span style={{ background: avatarColors[index % avatarColors.length] }}>{getInitials(order.customer)}</span><div><strong>{order.customer}</strong><small>{order.email}</small></div></div></td>
                    <td className="reference-order-total">{order.total}</td>
                    <td><span className={`status-pill ${order.status.toLowerCase()}`}>{order.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-table-card">
          <div className="admin-panel-header">
            <div><span className="reference-section-kicker warning"><AlertTriangle size={12} /> Inventory alerts</span><h3>Low stock products</h3></div>
            <button className="back-link-btn" onClick={() => onNavigate('products')}>Manage <ArrowUpRight size={14} /></button>
          </div>
          <div className="reference-stock-list">
            {lowStockProducts.slice(0, 5).map((product) => (
              <button key={product.id} onClick={() => onNavigate('products')}>
                <img src={product.image} alt="" />
                <span><strong>{product.name}</strong><small>{product.category}</small></span>
                <b>{product.stock} left</b>
              </button>
            ))}
            {!lowStockProducts.length && <div className="reference-empty-stock">All products have healthy stock levels.</div>}
          </div>
        </section>
      </div>
    </div>
  )
}
