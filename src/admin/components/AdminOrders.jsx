import { useState } from 'react'
import { CheckCircle2, Truck, Eye, X, CreditCard, Copy, Check, Printer } from 'lucide-react'

export default function AdminOrders({ orders = [], onUpdateOrderStatus, searchQuery = '' }) {
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const getStatusCount = (st) => {
    if (st === 'All') return orders.length
    return orders.filter((o) => o.status === st).length
  }

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter
    const matchesSearch =
      !searchQuery ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getInitials = (name) => {
    if (!name) return 'CU'
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const avatarColors = [
    'linear-gradient(135deg, #10b981, #047857)',
    'linear-gradient(135deg, #059669, #047857)',
    'linear-gradient(135deg, #7c3aed, #6d28d9)',
    'linear-gradient(135deg, #d97706, #b45309)',
    'linear-gradient(135deg, #e11d48, #be123c)'
  ]

  return (
    <div className="admin-orders-view">
      <div className="admin-view-header">
        <div>
          <h2>Order Fulfillment Manager ({orders.length} Total Orders)</h2>
          <p>Review customer orders, update tracking statuses, and process hardware shipments.</p>
        </div>

        <div className="admin-view-actions" style={{ display: 'flex', gap: '10px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '12px', fontSize: '0.84rem', fontWeight: '700' }}>
            <span style={{ color: 'var(--text-dim)' }}>Pending Processing: </span>
            <span style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
              {orders.filter(o => o.status === 'Pending' || o.status === 'Processing').length}
            </span>
          </div>
        </div>
      </div>

      {/* Status Filter Scroll Tabs */}
      <div className="categories-scroll-modern" style={{ margin: '20px 0' }}>
        {['All', 'Pending', 'Processing', 'Shipped', 'Delivered'].map((st) => (
          <button
            key={st}
            className={`category-tab-modern ${statusFilter === st ? 'active' : ''}`}
            onClick={() => setStatusFilter(st)}
          >
            <span>{st}</span>
            <span className="tab-count">{getStatusCount(st)}</span>
          </button>
        ))}
      </div>

      {/* Orders Table Panel */}
      <div className="admin-table-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order Reference</th>
                <th>Customer Profile</th>
                <th>Order Date</th>
                <th>Purchased Hardware</th>
                <th>Total Price</th>
                <th>Payment Method</th>
                <th>Tracking Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, idx) => (
                <tr key={order.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: 'var(--blue)', fontSize: '0.92rem' }}>
                        {order.id}
                      </span>
                      <button
                        onClick={() => copyToClipboard(order.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px' }}
                        title="Copy Order ID"
                      >
                        {copiedId === order.id ? <Check size={13} color="var(--emerald)" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="user-avatar-circle" style={{ background: avatarColors[idx % avatarColors.length] }}>
                        {getInitials(order.customer)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.9rem' }}>{order.customer}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{order.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>{order.date}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600', maxWidth: '240px' }}>
                      {order.items
                        ? order.items.map((item, i) => (
                            <span
                              key={i}
                              className="spec-tag-chip"
                              style={{ display: 'inline-block', margin: '2px 4px 2px 0', fontSize: '0.74rem' }}
                            >
                              {item.productName} (x{item.qty})
                            </span>
                          ))
                        : `${order.itemsCount || 1} hardware item(s)`}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: 'var(--text-main)', fontSize: '1rem' }}>
                    {order.total}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                      <CreditCard size={14} color="var(--indigo)" />
                      <span>{order.paymentMethod || 'Credit Card'}</span>
                    </div>
                  </td>
                  <td>
                    <select
                      className="status-select-custom"
                      value={order.status}
                      onChange={(e) => onUpdateOrderStatus(order.id, e.target.value)}
                    >
                      <option value="Pending">🟡 Pending</option>
                      <option value="Processing">🔵 Processing</option>
                      <option value="Shipped">🟣 Shipped</option>
                      <option value="Delivered">🟢 Delivered</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="icon-btn"
                        style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye size={14} />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Order / Invoice Modal */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedOrder(null)}>
              <X size={20} />
            </button>

            <div className="admin-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="spec-tag-chip" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--blue)', fontWeight: '800' }}>
                    INVOICE & FULFILLMENT SLIP
                  </span>
                  <span className={`status-pill ${selectedOrder.status.toLowerCase()}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-main)', margin: 0, fontWeight: '800' }}>
                  Order {selectedOrder.id}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '2px' }}>
                  Placed on {selectedOrder.date} by {selectedOrder.customer}
                </p>
              </div>

              <button
                className="icon-btn"
                style={{ fontSize: '0.8rem' }}
                onClick={() => window.print && window.print()}
                title="Print Packing Slip"
              >
                <Printer size={15} /> Print
              </button>
            </div>

            {/* Customer Details Block */}
            <div className="admin-order-info-grid" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Customer Details
                </span>
                <div style={{ fontWeight: '800', fontSize: '0.92rem', color: 'var(--text-main)', marginTop: '4px' }}>
                  {selectedOrder.customer}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedOrder.email}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Shipping & Payment
                </span>
                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '4px' }}>
                  Express Air Delivery
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--indigo)', fontWeight: '700' }}>
                  {selectedOrder.paymentMethod || 'Credit Card'} (Verified)
                </div>
              </div>
            </div>

            {/* Items Summary Table */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--text-main)', fontSize: '0.92rem', marginBottom: '12px', fontWeight: '800' }}>Purchased Hardware Items</h4>
              {selectedOrder.items ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="admin-order-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: idx < selectedOrder.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          {item.productName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Quantity: x{item.qty}</div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: 'var(--blue)', fontSize: '0.95rem' }}>
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>1 Hardware Package Component</div>
              )}
            </div>

            <div className="admin-order-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0', borderRadius: '14px', marginBottom: '20px' }}>
              <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>Grand Total Amount</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '1.35rem', color: 'var(--blue)' }}>
                {selectedOrder.total}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="admin-modal-actions" style={{ display: 'flex', gap: '10px' }}>
              <button
                className="icon-btn primary btn-large"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  onUpdateOrderStatus(selectedOrder.id, 'Shipped')
                  setSelectedOrder({ ...selectedOrder, status: 'Shipped' })
                }}
              >
                <Truck size={18} />
                <span>Mark as Shipped</span>
              </button>

              <button
                className="icon-btn btn-large"
                style={{ flex: 1, justifyContent: 'center', background: 'rgba(5, 150, 105, 0.1)', color: 'var(--emerald)', borderColor: 'rgba(5, 150, 105, 0.3)' }}
                onClick={() => {
                  onUpdateOrderStatus(selectedOrder.id, 'Delivered')
                  setSelectedOrder({ ...selectedOrder, status: 'Delivered' })
                }}
              >
                <CheckCircle2 size={18} />
                <span>Mark as Delivered</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
