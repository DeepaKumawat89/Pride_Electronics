import { useState } from 'react'
import { Plus, Edit2, Trash2, Search, X, Check, Eye, LayoutGrid, List, Sparkles, AlertCircle } from 'lucide-react'

export default function AdminProducts({
  products = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  searchQuery = ''
}) {
  const [filterCategory, setFilterCategory] = useState('All')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  const categories = ['All', ...new Set(products.map((p) => p.category))]

  const getCategoryCount = (cat) => {
    if (cat === 'All') return products.length
    return products.filter((p) => p.category === cat).length
  }

  const [formData, setFormData] = useState({
    name: '',
    category: 'Components & DIY',
    price: '₹12,499',
    originalPrice: '₹15,999',
    stock: 20,
    rating: 4.8,
    reviewsCount: 15,
    badge: 'NEW',
    discount: '23% OFF',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
    description: 'High performance electronic hardware component built for precision engineering.',
    specs: 'High Speed Processing, USB-C 3.2, Low Power Consumption'
  })

  const filteredProducts = products.filter((p) => {
    const matchesCat = filterCategory === 'All' || p.category === filterCategory
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      category: 'Components & DIY',
      price: '₹12,499',
      originalPrice: '₹15,999',
      stock: 20,
      rating: 4.8,
      reviewsCount: 15,
      badge: 'NEW',
      discount: '20% OFF',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
      description: 'High performance electronic hardware component built for precision engineering.',
      specs: 'High Speed Processing, USB-C 3.2, Low Power Consumption'
    })
    setIsAddModalOpen(true)
  }

  const handleOpenEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice || '',
      stock: product.stock,
      rating: product.rating,
      reviewsCount: product.reviewsCount,
      badge: product.badge || '',
      discount: product.discount || '',
      image: product.image,
      description: product.description,
      specs: product.specs ? product.specs.join(', ') : ''
    })
  }

  const handleSubmitForm = (e) => {
    e.preventDefault()
    const specsArray = formData.specs.split(',').map((s) => s.trim()).filter(Boolean)

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        ...formData,
        stock: Number(formData.stock),
        specs: specsArray
      })
      setEditingProduct(null)
    } else {
      onAddProduct({
        id: Date.now(),
        ...formData,
        stock: Number(formData.stock),
        specs: specsArray,
        featured: true
      })
      setIsAddModalOpen(false)
    }
  }

  return (
    <div className="admin-products-view">
      <div className="admin-view-header">
        <div>
          <h2>Hardware Component Catalog ({filteredProducts.length} Items)</h2>
          <p>Add new electronic items, update pricing, manage stock levels, or remove items.</p>
        </div>

        <div className="admin-view-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Switcher Toggle */}
          <div style={{ display: 'flex', background: '#ffffff', border: '1px solid #e2e8f0', padding: '4px', borderRadius: '12px', gap: '4px' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? 'var(--blue)' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--text-dim)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: '700'
              }}
            >
              <List size={16} /> Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? 'var(--blue)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--text-dim)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: '700'
              }}
            >
              <LayoutGrid size={16} /> Visual Grid
            </button>
          </div>

          <button className="icon-btn primary btn-large" onClick={handleOpenAdd}>
            <Plus size={18} />
            <span>Add New Hardware</span>
          </button>
        </div>
      </div>

      {/* Category Scroll Tabs */}
      <div className="categories-scroll-modern" style={{ margin: '20px 0' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-tab-modern ${filterCategory === cat ? 'active' : ''}`}
            onClick={() => setFilterCategory(cat)}
          >
            <span>{cat}</span>
            <span className="tab-count">{getCategoryCount(cat)}</span>
          </button>
        ))}
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="admin-table-card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock Inventory</th>
                  <th>Rating</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stockColor =
                    product.stock < 10 ? 'var(--rose)' : product.stock < 25 ? 'var(--amber)' : 'var(--emerald)'
                  const stockPercentage = Math.min(100, Math.max(10, (product.stock / 50) * 100))

                  return (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img
                            src={product.image}
                            alt={product.name}
                            style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                          />
                          <div>
                            <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.94rem' }}>{product.name}</div>
                            {product.badge && (
                              <span className="spec-tag-chip" style={{ marginTop: '2px', display: 'inline-block' }}>
                                {product.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--text-muted)' }}>{product.category}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: 'var(--blue)', fontSize: '1rem' }}>
                          {product.price}
                        </div>
                        {product.originalPrice && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                            {product.originalPrice}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="stock-gauge-wrap">
                          <span style={{ fontWeight: '800', fontSize: '0.84rem', color: stockColor, fontFamily: 'var(--font-mono)' }}>
                            {product.stock} units
                          </span>
                          <div className="stock-gauge-bar">
                            <div className="stock-gauge-fill" style={{ width: `${stockPercentage}%`, background: stockColor }}></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--amber)', fontWeight: '800', fontSize: '0.88rem' }}>
                          ★ <span>{product.rating}</span>
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.76rem', fontWeight: '600' }}>({product.reviewsCount})</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="icon-btn" onClick={() => handleOpenEdit(product)} title="Edit Hardware Item">
                            <Edit2 size={15} />
                            <span>Edit</span>
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => onDeleteProduct(product.id)}
                            style={{ color: 'var(--rose)', borderColor: 'rgba(225, 29, 72, 0.2)' }}
                            title="Delete Hardware Item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visual Grid View */
        <div className="products-grid-layout">
          {filteredProducts.map((product) => {
            const isLowStock = product.stock < 10

            return (
              <div className="product-card-admin" key={product.id}>
                <div className="product-img-wrapper">
                  <img src={product.image} alt={product.name} />
                  {product.badge && <span className="product-badge-overlay">{product.badge}</span>}
                  <span
                    className="product-stock-overlay"
                    style={{ color: isLowStock ? 'var(--rose)' : 'var(--emerald)' }}
                  >
                    {product.stock} in stock
                  </span>
                </div>
                <div className="product-card-body">
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase' }}>
                      {product.category}
                    </div>
                    <h4 className="product-card-title">{product.name}</h4>
                  </div>

                  <div className="product-card-meta">
                    <span className="product-card-price">{product.price}</span>
                    <span style={{ color: 'var(--amber)', fontWeight: '800', fontSize: '0.85rem' }}>★ {product.rating}</span>
                  </div>

                  <div className="product-card-actions">
                    <button className="icon-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleOpenEdit(product)}>
                      <Edit2 size={15} /> Edit
                    </button>
                    <button
                      className="icon-btn"
                      style={{ color: 'var(--rose)' }}
                      onClick={() => onDeleteProduct(product.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <div className="modal-backdrop" onClick={() => { setIsAddModalOpen(false); setEditingProduct(null); }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => { setIsAddModalOpen(false); setEditingProduct(null); }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '16px', fontWeight: '800' }}>
              {editingProduct ? 'Edit Hardware Component' : 'Add New Hardware Component'}
            </h2>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="admin-modal-grid">
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                    Media Live Preview
                  </label>
                  <img src={formData.image} alt="Preview" className="media-preview-tile" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label>Product Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-grid admin-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        className="sort-dropdown"
                        style={{ width: '100%' }}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="Audio">Audio</option>
                        <option value="Wearables">Wearables</option>
                        <option value="Components & DIY">Components & DIY</option>
                        <option value="Peripherals">Peripherals</option>
                        <option value="Smart Power">Smart Power</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Price</label>
                      <input
                        type="text"
                        required
                        placeholder="₹12,499"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-form-grid admin-form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Original Price</label>
                  <input
                    type="text"
                    placeholder="₹15,999"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Stock Count</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Badge Highlight</label>
                  <input
                    type="text"
                    placeholder="HOT DEAL"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Image URL (Direct Unsplash / Web URL)</label>
                <input
                  type="text"
                  required
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  style={{ minHeight: '70px' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Technical Specs (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="32 TOPS AI Compute, USB-C 3.2, Low Power"
                  value={formData.specs}
                  onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
                />
                <div className="spec-chips-container">
                  {formData.specs.split(',').map((s, idx) => s.trim() && (
                    <span key={idx} className="spec-tag-chip">{s.trim()}</span>
                  ))}
                </div>
              </div>

              <button className="icon-btn primary btn-large" type="submit" style={{ marginTop: '8px' }}>
                <Check size={18} />
                <span>{editingProduct ? 'Save Product Changes' : 'Publish Product to Store'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
