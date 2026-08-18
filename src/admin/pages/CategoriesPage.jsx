import { useState } from 'react'
import { Edit2, Eye, EyeOff, Plus, Tags, Trash2 } from 'lucide-react'
import { EmptyState, Modal, PageHeader, StatCard } from '../components/ui/AdminUI'

const emptyCategory = { name: '', description: '', enabled: true }
const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs outline-none transition focus:border-[#75916f] focus:ring-4 focus:ring-[#75916f]/10'

export default function CategoriesPage({
  categories = [],
  products = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  searchQuery = '',
}) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyCategory)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const filtered = categories.filter((category) =>
    `${category.name} ${category.description || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  )
  const productCount = (name) =>
    products.filter((product) => product.category === name).length

  const openAdd = () => {
    setEditing(null)
    setForm(emptyCategory)
    setError('')
    setOpen(true)
  }
  const openEdit = (category) => {
    setEditing(category)
    setForm(category)
    setError('')
    setOpen(true)
  }
  const close = () => {
    setOpen(false)
    setEditing(null)
    setError('')
  }
  const submit = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const duplicate = categories.some(
      (category) =>
        category.id !== editing?.id &&
        category.name.toLowerCase() === name.toLowerCase(),
    )
    if (duplicate) {
      setError('A category with this name already exists.')
      return
    }
    const category = {
      ...editing,
      ...form,
      id: editing?.id || `category-${Date.now()}`,
      name,
      description: form.description.trim(),
    }
    if (editing) onUpdateCategory(category, editing.name)
    else onAddCategory(category)
    close()
  }
  const remove = (category) => {
    const message = onDeleteCategory(category.id)
    setError(message || '')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog structure"
        title={`${categories.length} product categories`}
        description="Manage storefront categories without changing product data or code. Categories containing products cannot be deleted."
        actions={
          <button type="button" onClick={openAdd} className="flex h-11 items-center gap-2 rounded-full bg-[#17251c] px-4 text-[10px] font-extrabold text-white transition hover:bg-[#397a4a]">
            <Plus size={15} /> Add category
          </button>
        }
      />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={Tags} label="Categories" value={categories.length} detail="Configured groups" />
        <StatCard icon={Eye} label="Enabled" value={categories.filter((category) => category.enabled !== false).length} detail="Visible on storefront" tone="amber" />
        <StatCard icon={EyeOff} label="Disabled" value={categories.filter((category) => category.enabled === false).length} detail="Hidden from storefront" tone="violet" />
      </section>
      {error && !open && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-bold text-red-700">{error}</p>
      )}
      {!filtered.length ? (
        <EmptyState title={categories.length ? 'No matching categories' : 'No categories yet'} text={categories.length ? 'Try a different search.' : 'Add the first category to organize products.'} />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]"><tr>{['Category', 'Products', 'Status', 'Actions'].map((head) => <th key={head} className={`px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ${head === 'Actions' ? 'text-right' : ''}`}>{head}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((category) => (
                  <tr key={category.id} className="transition hover:bg-[#fafcf9]">
                    <td className="px-5 py-4"><strong className="block text-[11px] text-slate-900">{category.name}</strong><span className="mt-1 block max-w-xl text-[9px] text-slate-400">{category.description || 'No description'}</span></td>
                    <td className="px-5 py-4 text-[10px] font-extrabold text-slate-700">{productCount(category.name)}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-[8px] font-extrabold ${category.enabled === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{category.enabled === false ? 'Disabled' : 'Enabled'}</span></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => onUpdateCategory({ ...category, enabled: category.enabled === false }, category.name)} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-[#397a4a]" aria-label={`${category.enabled === false ? 'Enable' : 'Disable'} ${category.name}`}>{category.enabled === false ? <Eye size={13} /> : <EyeOff size={13} />}</button><button type="button" onClick={() => openEdit(category)} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-[#397a4a]" aria-label={`Edit ${category.name}`}><Edit2 size={13} /></button><button type="button" onClick={() => remove(category)} className="grid size-9 place-items-center rounded-full bg-red-50 text-red-500 hover:bg-red-100" aria-label={`Delete ${category.name}`}><Trash2 size={13} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={close} eyebrow="Category management" title={editing ? 'Edit category' : 'Add category'} maxWidth="max-w-xl">
        <form onSubmit={submit} className="space-y-4 p-5 sm:p-7">
          <label className="block"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Category name</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} /></label>
          <label className="block"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Description</span><textarea rows="4" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none transition focus:border-[#75916f] focus:ring-4 focus:ring-[#75916f]/10" /></label>
          <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"><span className="text-[10px] font-bold text-slate-700">Enabled on storefront</span><input type="checkbox" checked={form.enabled !== false} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} className="size-4 accent-[#397a4a]" /></label>
          {error && <p role="alert" className="text-[10px] font-bold text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={close} className="h-11 rounded-full bg-white px-5 text-[10px] font-extrabold text-slate-500 shadow-sm">Cancel</button><button type="submit" className="h-11 rounded-full bg-[#397a4a] px-5 text-[10px] font-extrabold text-white">{editing ? 'Save changes' : 'Add category'}</button></div>
        </form>
      </Modal>
    </div>
  )
}
