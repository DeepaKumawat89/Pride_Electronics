import { useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  Package,
  Plus,
  SlidersHorizontal,
} from 'lucide-react'
import { EmptyState, Modal, PageHeader, StatCard } from '../components/ui/AdminUI'
import { getAvailableStock } from '../utils/inventory'

const adjustmentLabels = {
  add: 'Add Stock',
  remove: 'Remove Stock',
  adjust: 'Stock Adjustment',
}

export default function InventoryPage({
  products = [],
  searchQuery = '',
  onAdjustStock,
}) {
  const [adjustment, setAdjustment] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const filtered = products.filter((product) =>
    `${product.name} ${product.sku || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  )
  const totalStock = products.reduce(
    (sum, product) => sum + Number(product.stock || 0),
    0,
  )
  const reservedStock = products.reduce(
    (sum, product) => sum + Number(product.reservedStock || 0),
    0,
  )
  const availableStock = products.reduce(
    (sum, product) => sum + getAvailableStock(product),
    0,
  )
  const lowStockProducts = products.filter((product) => {
    const available = getAvailableStock(product)
    return (
      available > 0 &&
      available <= Number(product.lowStockThreshold ?? 10)
    )
  }).length

  const openAdjustment = (product) => {
    setAdjustment({ product, type: 'adjust' })
    setQuantity(String(product.stock))
    setNote('')
    setError('')
  }

  const updateAdjustmentType = (type) => {
    setAdjustment((current) => ({ ...current, type }))
    setQuantity(type === 'adjust' ? String(adjustment.product.stock) : '')
    setError('')
  }

  const closeAdjustment = () => {
    setAdjustment(null)
    setQuantity('')
    setNote('')
    setError('')
  }

  const submitAdjustment = async (event) => {
    event.preventDefault()
    try {
      const nextError = await onAdjustStock(adjustment.product.id, {
        type: adjustment.type,
        quantity: Number(quantity),
        note: note.trim(),
      })
      if (nextError) {
        setError(nextError)
        return
      }
      closeAdjustment()
    } catch (nextError) {
      setError(nextError.message || 'Unable to save the stock adjustment.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stock control"
        title="Inventory Management"
        description="Monitor current, reserved, and available inventory and manage product stock."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Boxes} label="Current stock" value={totalStock} detail="Physical units on hand" />
        <StatCard icon={Package} label="Reserved stock" value={reservedStock} detail="Allocated to open orders" tone="amber" />
        <StatCard icon={Plus} label="Available stock" value={availableStock} detail="Sellable units" tone="green" />
        <StatCard icon={AlertTriangle} label="Low stock" value={lowStockProducts} detail="Products at threshold" tone="violet" />
      </section>

      {!filtered.length ? (
        <EmptyState title="No matching inventory" />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]">
                <tr>
                  {['Product', 'SKU', 'Current Stock', 'Reserved Stock', 'Available Stock', 'Status', 'Actions'].map((head) => (
                    <th key={head} className={`px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ${head === 'Actions' ? 'text-right' : ''}`}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((product) => {
                  const available = getAvailableStock(product)
                  const threshold = Number(product.lowStockThreshold ?? 10)
                  const status = available <= 0 ? 'Out of Stock' : available <= threshold ? 'Low Stock' : 'In Stock'
                  return (
                    <tr key={product.id} className="transition hover:bg-[#fafcf9]">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><img src={product.image} alt="" className="size-11 rounded-2xl object-cover" /><strong className="max-w-56 truncate text-[10px] text-slate-900">{product.name}</strong></div></td>
                      <td className="px-5 py-4 text-[9px] font-bold text-slate-500">{product.sku || `PE-${String(product.id).padStart(4, '0')}`}</td>
                      <td className="px-5 py-4 text-xs font-extrabold text-slate-900">{product.stock}</td>
                      <td className="px-5 py-4 text-xs font-extrabold text-amber-700">{product.reservedStock || 0}</td>
                      <td className="px-5 py-4 text-xs font-extrabold text-[#397a4a]">{available}</td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-[8px] font-extrabold ${status === 'Out of Stock' ? 'bg-red-50 text-red-600' : status === 'Low Stock' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{status}</span></td>
                      <td className="px-5 py-4"><div className="flex justify-end"><InventoryAction icon={SlidersHorizontal} label="Manage Stock" onClick={() => openAdjustment(product)} /></div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={Boolean(adjustment)} onClose={closeAdjustment} eyebrow="Inventory action" title={adjustment ? `${adjustmentLabels[adjustment.type]} · ${adjustment.product.name}` : ''} maxWidth="max-w-lg">
        {adjustment && (
          <form onSubmit={submitAdjustment} className="space-y-4 p-5 sm:p-7">
            <div className="grid grid-cols-3 gap-2 rounded-[20px] bg-white p-4 text-center"><StockValue label="Current" value={adjustment.product.stock} /><StockValue label="Reserved" value={adjustment.product.reservedStock || 0} /><StockValue label="Available" value={getAvailableStock(adjustment.product)} /></div>
            <label className="block"><span className="mb-2 block text-[9px] font-extrabold text-slate-500">Stock action</span><select value={adjustment.type} onChange={(event) => updateAdjustmentType(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs outline-none"><option value="add">Add Stock</option><option value="remove">Remove Stock</option><option value="adjust">Stock Adjustment</option></select></label>
            <label className="block"><span className="mb-2 block text-[9px] font-extrabold text-slate-500">{adjustment.type === 'adjust' ? 'New current stock' : 'Quantity'}</span><input required type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs outline-none" /></label>
            <label className="block"><span className="mb-2 block text-[9px] font-extrabold text-slate-500">Reason / note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none" /></label>
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-[9px] font-bold text-red-600">{error}</p>}
            <button type="submit" className="h-12 w-full rounded-full bg-[#397a4a] text-xs font-extrabold text-white transition hover:bg-[#2f663d]">Confirm {adjustmentLabels[adjustment.type]}</button>
          </form>
        )}
      </Modal>
    </div>
  )
}

function InventoryAction({ icon: Icon, label, onClick }) {
  return <button type="button" onClick={onClick} className="flex h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[8px] font-extrabold text-slate-600 transition hover:bg-[#397a4a] hover:text-white"><Icon size={12} /> {label}</button>
}

function StockValue({ label, value }) {
  return <div><span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">{label}</span><strong className="mt-1 block text-lg text-slate-900">{value}</strong></div>
}
