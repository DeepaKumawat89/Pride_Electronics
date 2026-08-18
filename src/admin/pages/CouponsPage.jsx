import { useState } from 'react'
import { Edit2, Plus, TicketPercent, Trash2 } from 'lucide-react'
import { EmptyState, Modal, PageHeader } from '../components/ui/AdminUI'
import { formatAdminCurrency } from '../utils/adminFormatters'

const emptyCoupon = {
  code: '',
  discountType: 'Percentage',
  amount: 10,
  minimumOrder: 999,
  maximumDiscount: 500,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '2026-12-31',
  usageLimit: 1000,
  perUserLimit: 1,
  usageCount: 0,
  applicableProducts: '',
  applicableCategories: '',
  enabled: true,
}

const fieldClass =
  'mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none transition focus:border-[#75916f] focus:ring-4 focus:ring-[#9bcaa6]/20'

const parseList = (value) =>
  String(value || '').split(',').map((item) => item.trim()).filter(Boolean)

const discountLabel = (coupon) => {
  if (coupon.discountType === 'Percentage') return `${coupon.amount}% OFF`
  if (coupon.discountType === 'Free Shipping') return 'FREE SHIPPING'
  return `${formatAdminCurrency(coupon.amount)} OFF`
}

export default function CouponsPage({
  coupons = [],
  onAddCoupon,
  onUpdateCoupon,
  onDeleteCoupon,
  searchQuery = '',
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [form, setForm] = useState(emptyCoupon)
  const filtered = coupons.filter(
    (coupon) =>
      !searchQuery ||
      `${coupon.code} ${coupon.discountType} ${(coupon.applicableProducts || []).join(' ')} ${(coupon.applicableCategories || []).join(' ')}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  )
  const openAdd = () => {
    setEditingCoupon(null)
    setForm(emptyCoupon)
    setModalOpen(true)
  }
  const openEdit = (coupon) => {
    setEditingCoupon(coupon)
    setForm({
      ...emptyCoupon,
      ...coupon,
      applicableProducts: (coupon.applicableProducts || []).join(', '),
      applicableCategories: (coupon.applicableCategories || []).join(', '),
    })
    setModalOpen(true)
  }
  const field = (key) => ({
    value: form[key],
    onChange: (event) =>
      setForm((current) => ({ ...current, [key]: event.target.value })),
  })
  const submit = (event) => {
    event.preventDefault()
    const nextCoupon = {
      ...editingCoupon,
      ...form,
      id: editingCoupon?.id || `coupon-${Date.now()}`,
      code: form.code.trim().toUpperCase(),
      amount: Number(form.amount),
      minimumOrder: Number(form.minimumOrder),
      maximumDiscount: Number(form.maximumDiscount),
      usageLimit: Number(form.usageLimit),
      perUserLimit: Number(form.perUserLimit),
      usageCount: Number(form.usageCount || 0),
      usageBy: editingCoupon?.usageBy || {},
      applicableProducts: parseList(form.applicableProducts),
      applicableCategories: parseList(form.applicableCategories),
      enabled: form.enabled !== false,
    }
    if (editingCoupon) onUpdateCoupon(nextCoupon)
    else onAddCoupon(nextCoupon)
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Promotion management" title={`${coupons.length} coupons`} description="Create and maintain discount rules, usage limits, validity, and product or category eligibility." actions={<button type="button" onClick={openAdd} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#397a4a] px-4 text-[9px] font-extrabold text-white shadow-sm hover:bg-[#2f663d]"><Plus size={15} /> Add coupon</button>} />
      {!filtered.length ? <EmptyState title="No matching coupons" /> : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] border-collapse text-left"><thead className="bg-[#f3f7f2]"><tr>{['Coupon', 'Discount', 'Minimum', 'Maximum', 'Validity', 'Usage', 'Per User', 'Applicable To', 'Status', 'Actions'].map((head) => <th key={head} className={`px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ${head === 'Actions' ? 'text-right' : ''}`}>{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((coupon) => (
          <tr key={coupon.id} className="transition hover:bg-[#fafcf9]">
            <td className="px-5 py-4"><span className="flex items-center gap-2 font-mono text-[10px] font-extrabold text-[#397a4a]"><TicketPercent size={13} /> {coupon.code}</span></td>
            <td className="px-5 py-4 text-[9px] font-extrabold text-slate-800">{discountLabel(coupon)}</td>
            <td className="px-5 py-4 text-[9px] font-semibold text-slate-500">{formatAdminCurrency(coupon.minimumOrder)}</td>
            <td className="px-5 py-4 text-[9px] font-semibold text-slate-500">{formatAdminCurrency(coupon.maximumDiscount)}</td>
            <td className="px-5 py-4 text-[8px] font-semibold text-slate-500">{coupon.startDate}<br />to {coupon.endDate}</td>
            <td className="px-5 py-4 text-[9px] font-bold text-slate-600">{coupon.usageCount || 0} / {coupon.usageLimit || '∞'}</td>
            <td className="px-5 py-4 text-[9px] font-bold text-slate-600">{coupon.perUserLimit || 'Unlimited'}</td>
            <td className="px-5 py-4"><span className="block max-w-48 truncate text-[8px] text-slate-500">{(coupon.applicableProducts || []).length ? `${coupon.applicableProducts.length} product(s)` : (coupon.applicableCategories || []).length ? coupon.applicableCategories.join(', ') : 'All products'}</span></td>
            <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-[8px] font-extrabold ${coupon.enabled === false ? 'bg-slate-100 text-slate-500' : new Date(`${coupon.endDate}T23:59:59`) < new Date() ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{coupon.enabled === false ? 'Disabled' : new Date(`${coupon.endDate}T23:59:59`) < new Date() ? 'Expired' : 'Active'}</span></td>
            <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(coupon)} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-[#e4f1e7] hover:text-[#397a4a]" aria-label={`Edit ${coupon.code}`}><Edit2 size={13} /></button><button type="button" onClick={() => onDeleteCoupon(coupon.id)} className="grid size-9 place-items-center rounded-full bg-red-50 text-red-500 hover:bg-red-100" aria-label={`Delete ${coupon.code}`}><Trash2 size={13} /></button></div></td>
          </tr>
        ))}</tbody></table></div></div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} eyebrow="Coupon configuration" title={editingCoupon ? `Edit ${editingCoupon.code}` : 'Add coupon'} maxWidth="max-w-3xl">
        <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
          <Field label="Coupon code"><input required {...field('code')} className={fieldClass} placeholder="PRIDE10" /></Field>
          <Field label="Discount type"><select {...field('discountType')} className={fieldClass}><option>Percentage</option><option>Fixed Amount</option><option>Free Shipping</option></select></Field>
          <Field label="Discount amount"><input required min="0" type="number" {...field('amount')} className={fieldClass} /></Field>
          <Field label="Maximum discount"><input required min="0" type="number" {...field('maximumDiscount')} className={fieldClass} /></Field>
          <Field label="Minimum order"><input required min="0" type="number" {...field('minimumOrder')} className={fieldClass} /></Field>
          <Field label="Per-user limit"><input required min="0" type="number" {...field('perUserLimit')} className={fieldClass} /></Field>
          <Field label="Start date"><input required type="date" {...field('startDate')} className={fieldClass} /></Field>
          <Field label="End date"><input required type="date" {...field('endDate')} className={fieldClass} /></Field>
          <Field label="Usage limit"><input required min="0" type="number" {...field('usageLimit')} className={fieldClass} /></Field>
          <Field label="Current usage"><input min="0" type="number" {...field('usageCount')} className={fieldClass} /></Field>
          <Field label="Applicable products" wide><input {...field('applicableProducts')} className={fieldClass} placeholder="Product IDs or names, comma separated" /></Field>
          <Field label="Applicable categories" wide><input {...field('applicableCategories')} className={fieldClass} placeholder="Audio, Wearables" /></Field>
          <label className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-500"><input type="checkbox" checked={form.enabled !== false} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} className="size-4 accent-[#397a4a]" /> Coupon enabled</label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-full border border-slate-200 px-4 py-2.5 text-[9px] font-extrabold text-slate-500">Cancel</button><button type="submit" className="rounded-full bg-[#397a4a] px-5 py-2.5 text-[9px] font-extrabold text-white">{editingCoupon ? 'Save changes' : 'Create coupon'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

function Field({ label, wide = false, children }) {
  return <label className={`text-[9px] font-extrabold uppercase tracking-wider text-slate-500 ${wide ? 'sm:col-span-2' : ''}`}>{label}{children}</label>
}
