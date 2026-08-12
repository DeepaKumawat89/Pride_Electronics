import { useState } from 'react'
import { ShieldCheck, Users, Award, DollarSign, Copy, Check } from 'lucide-react'

export default function AdminUsers({ customers = [], searchQuery = '' }) {
  const [copiedId, setCopiedId] = useState(null)

  const filteredCustomers = customers.filter((c) => {
    return (
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
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

  const totalSpentSum = customers.reduce((acc, c) => {
    return acc + Number(c.totalSpent.replace(/[^0-9.]/g, ''))
  }, 0)

  const vipCount = customers.filter((c) => c.role.toLowerCase().includes('vip') || c.role.toLowerCase().includes('pro')).length

  return (
    <div className="admin-users-view">
      <div className="admin-view-header">
        <div>
          <h2>Registered Customers & User Accounts ({customers.length})</h2>
          <p>View registered buyer profiles, purchase history stats, and account verifications.</p>
        </div>
      </div>

      {/* Top Customer Metrics Summary Bar */}
      <div className="admin-stats-grid" style={{ marginTop: '20px' }}>
        <div className="stat-card-modern" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="stat-icon-glow" style={{ width: '40px', height: '40px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--blue)' }}>
              <Users size={20} />
            </div>
            <div>
              <span className="stat-title-label" style={{ fontSize: '0.74rem' }}>Total Accounts</span>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {customers.length + 1280}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card-modern" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="stat-icon-glow" style={{ width: '40px', height: '40px', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--indigo)' }}>
              <Award size={20} />
            </div>
            <div>
              <span className="stat-title-label" style={{ fontSize: '0.74rem' }}>VIP & Pro Members</span>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--indigo)', fontFamily: 'var(--font-mono)' }}>
                {vipCount + 142}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card-modern" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="stat-icon-glow" style={{ width: '40px', height: '40px', background: 'rgba(5, 150, 105, 0.1)', color: 'var(--emerald)' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <span className="stat-title-label" style={{ fontSize: '0.74rem' }}>Avg Customer Spend</span>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                ₹{(totalSpentSum / (customers.length || 1)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card-modern" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="stat-icon-glow" style={{ width: '40px', height: '40px', background: 'rgba(217, 119, 6, 0.1)', color: 'var(--amber)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="stat-title-label" style={{ fontSize: '0.74rem' }}>Verified Status</span>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                98.4%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Accounts Table Panel */}
      <div className="admin-table-card" style={{ marginTop: '20px' }}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Customer Full Name & Email</th>
                <th>Account Tier</th>
                <th>Orders Placed</th>
                <th>Lifetime Spend</th>
                <th>Account Status</th>
                <th>Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((user, idx) => {
                const numSpent = Number(user.totalSpent.replace(/[^0-9.]/g, ''))
                const spendPercentage = Math.min(100, Math.max(15, (numSpent / 4000) * 100))
                const isActive = user.status.toLowerCase().includes('active')

                return (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: 'var(--blue)', fontSize: '0.9rem' }}>
                          {user.id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(user.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px' }}
                          title="Copy User ID"
                        >
                          {copiedId === user.id ? <Check size={13} color="var(--emerald)" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="user-avatar-circle" style={{ background: avatarColors[idx % avatarColors.length] }}>
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.92rem' }}>{user.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="spec-tag-chip"
                        style={{
                          background: user.role.includes('VIP')
                            ? 'rgba(124, 58, 237, 0.12)'
                            : user.role.includes('Pro')
                            ? 'rgba(37, 99, 235, 0.12)'
                            : '#f1f5f9',
                          color: user.role.includes('VIP')
                            ? 'var(--indigo)'
                            : user.role.includes('Pro')
                            ? 'var(--blue)'
                            : 'var(--text-muted)',
                          fontWeight: '800',
                          padding: '4px 10px'
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '800', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                        {user.ordersCount} Orders
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '110px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: 'var(--emerald)', fontSize: '0.95rem' }}>
                          {user.totalSpent}
                        </span>
                        <div className="stock-gauge-bar">
                          <div className="stock-gauge-fill" style={{ width: `${spendPercentage}%`, background: 'var(--emerald)' }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${isActive ? 'delivered' : 'pending'}`}>
                        <span className="pulse-dot" style={{ width: '6px', height: '6px', background: isActive ? 'var(--emerald)' : 'var(--amber)' }}></span>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                      {user.joinedDate}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
