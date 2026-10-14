import { useState } from 'react'
import { Edit2, Eye, EyeOff, Plus, Tags, Trash2 } from 'lucide-react'
import SelectMenu from '../../components/ui/SelectMenu'
import { EmptyState, Modal, PageHeader, StatCard } from '../components/ui/AdminUI'
import {
  productBelongsToCategory,
  productBelongsToSubcategory,
} from '../../utils/catalogTaxonomy'

const emptyCategory = { name: '', enabled: true }
const emptySubcategory = {
  name: '',
  enabled: true,
  categoryId: '',
}
const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs outline-none transition focus:border-[#75916f] focus:ring-4 focus:ring-[#75916f]/10'

export default function CategoriesPage({
  categories = [],
  subcategories = [],
  products = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  searchQuery = '',
}) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyCategory)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [editingSubcategory, setEditingSubcategory] = useState(null)
  const [subcategoryForm, setSubcategoryForm] = useState(emptySubcategory)
  const [subcategoryOpen, setSubcategoryOpen] = useState(false)
  const [subcategoryError, setSubcategoryError] = useState('')
  const categoryOptions = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }))
  const filtered = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )
  const filteredSubcategories = subcategories.filter((subcategory) => {
    const category = categories.find(
      (item) => String(item.id) === String(subcategory.categoryId),
    )
    return `${subcategory.name} ${category?.name || subcategory.categoryName || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  })
  const productCount = (category) =>
    products.filter((product) => productBelongsToCategory(product, category)).length
  const subcategoryProductCount = (subcategory) =>
    products.filter((product) =>
      productBelongsToSubcategory(product, subcategory),
    ).length

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
    }
    if (editing) onUpdateCategory(category, editing.name)
    else onAddCategory(category)
    close()
  }
  const remove = (category) => {
    const message = onDeleteCategory(category.id)
    setError(message || '')
  }

  const openAddSubcategory = (categoryId = categories[0]?.id || '') => {
    setEditingSubcategory(null)
    setSubcategoryForm({ ...emptySubcategory, categoryId })
    setSubcategoryError('')
    setSubcategoryOpen(true)
  }
  const openEditSubcategory = (subcategory) => {
    setEditingSubcategory(subcategory)
    setSubcategoryForm(subcategory)
    setSubcategoryError('')
    setSubcategoryOpen(true)
  }
  const closeSubcategory = () => {
    setSubcategoryOpen(false)
    setEditingSubcategory(null)
    setSubcategoryError('')
  }
  const submitSubcategory = (event) => {
    event.preventDefault()
    const name = subcategoryForm.name.trim()
    const category = categories.find(
      (item) => String(item.id) === String(subcategoryForm.categoryId),
    )
    if (!category) {
      setSubcategoryError('Select a valid parent category.')
      return
    }
    const duplicate = subcategories.some(
      (subcategory) =>
        subcategory.id !== editingSubcategory?.id &&
        String(subcategory.categoryId) === String(category.id) &&
        subcategory.name.toLowerCase() === name.toLowerCase(),
    )
    if (duplicate) {
      setSubcategoryError(
        'A subcategory with this name already exists in the selected category.',
      )
      return
    }
    const subcategory = {
      ...editingSubcategory,
      ...subcategoryForm,
      id: editingSubcategory?.id || `subcategory-${Date.now()}`,
      categoryId: category.id,
      categoryName: category.name,
      name,
    }
    if (editingSubcategory) {
      onUpdateSubcategory(subcategory, editingSubcategory)
    } else {
      onAddSubcategory(subcategory)
    }
    closeSubcategory()
  }
  const removeSubcategory = (subcategory) => {
    const message = onDeleteSubcategory(subcategory.id)
    setSubcategoryError(message || '')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog structure"
        title={`${categories.length} product categories`}
        description="Manage stable category and subcategory relationships without splitting the product catalog into separate collections."
        actions={
          <button type="button" onClick={openAdd} className="flex h-11 items-center gap-2 rounded-full bg-[#17251c] px-4 text-[10px] font-extrabold text-white transition hover:bg-[#397a4a]">
            <Plus size={15} /> Add category
          </button>
        }
      />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Tags} label="Categories" value={categories.length} detail="Configured groups" />
        <StatCard icon={Tags} label="Subcategories" value={subcategories.length} detail="Nested catalog groups" tone="violet" />
        <StatCard icon={Eye} label="Enabled" value={categories.filter((category) => category.enabled !== false).length} detail="Visible categories" tone="amber" />
        <StatCard icon={EyeOff} label="Disabled" value={categories.filter((category) => category.enabled === false).length} detail="Hidden categories" tone="violet" />
      </section>
      {error && !open && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-bold text-red-700">{error}</p>
      )}
      {!filtered.length ? (
        <EmptyState title={categories.length ? 'No matching categories' : 'No categories yet'} text={categories.length ? 'Try a different search.' : 'Add the first category to organize products.'} />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]"><tr>{['Category', 'Products', 'Subcategories', 'Status', 'Actions'].map((head) => <th key={head} className={`px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ${head === 'Actions' ? 'text-right' : ''}`}>{head}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((category) => (
                  <tr key={category.id} className="transition hover:bg-[#fafcf9]">
                    <td className="px-5 py-4"><strong className="block text-[11px] text-slate-900">{category.name}</strong></td>
                    <td className="px-5 py-4 text-[10px] font-extrabold text-slate-700">{productCount(category)}</td>
                    <td className="px-5 py-4"><button type="button" onClick={() => openAddSubcategory(category.id)} className="rounded-full bg-[#eef6ef] px-3 py-1.5 text-[9px] font-extrabold text-[#397a4a]">{subcategories.filter((item) => String(item.categoryId) === String(category.id)).length} · Add</button></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-[8px] font-extrabold ${category.enabled === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{category.enabled === false ? 'Disabled' : 'Enabled'}</span></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => onUpdateCategory({ ...category, enabled: category.enabled === false }, category.name)} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-[#397a4a]" aria-label={`${category.enabled === false ? 'Enable' : 'Disable'} ${category.name}`}>{category.enabled === false ? <Eye size={13} /> : <EyeOff size={13} />}</button><button type="button" onClick={() => openEdit(category)} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-[#397a4a]" aria-label={`Edit ${category.name}`}><Edit2 size={13} /></button><button type="button" onClick={() => remove(category)} className="grid size-9 place-items-center rounded-full bg-red-50 text-red-500 hover:bg-red-100" aria-label={`Delete ${category.name}`}><Trash2 size={13} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#397a4a]">Nested catalog structure</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">Subcategories</h2></div>
          <button type="button" disabled={!categories.length} onClick={() => openAddSubcategory()} className="flex h-10 items-center gap-2 rounded-full bg-[#397a4a] px-4 text-[9px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"><Plus size={14} /> Add subcategory</button>
        </div>
        {subcategoryError && !subcategoryOpen && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-bold text-red-700">{subcategoryError}</p>}
        {!filteredSubcategories.length ? (
          <EmptyState title={subcategories.length ? 'No matching subcategories' : 'No subcategories yet'} text={subcategories.length ? 'Try a different search.' : 'Add optional subcategories beneath the existing categories.'} />
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-[#f3f7f2]"><tr>{['Subcategory', 'Parent category', 'Products', 'Status', 'Actions'].map((head) => <th key={head} className={`px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ${head === 'Actions' ? 'text-right' : ''}`}>{head}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubcategories.map((subcategory) => {
                    const category = categories.find((item) => String(item.id) === String(subcategory.categoryId))
                    return <tr key={subcategory.id} className="transition hover:bg-[#fafcf9]"><td className="px-5 py-4"><strong className="block text-[11px] text-slate-900">{subcategory.name}</strong></td><td className="px-5 py-4 text-[10px] font-bold text-slate-600">{category?.name || subcategory.categoryName || 'Unknown category'}</td><td className="px-5 py-4 text-[10px] font-extrabold text-slate-700">{subcategoryProductCount(subcategory)}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-[8px] font-extrabold ${subcategory.enabled === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{subcategory.enabled === false ? 'Disabled' : 'Enabled'}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => onUpdateSubcategory({ ...subcategory, enabled: subcategory.enabled === false }, subcategory)} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-[#397a4a]" aria-label={`${subcategory.enabled === false ? 'Enable' : 'Disable'} ${subcategory.name}`}>{subcategory.enabled === false ? <Eye size={13} /> : <EyeOff size={13} />}</button><button type="button" onClick={() => openEditSubcategory(subcategory)} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-[#397a4a]" aria-label={`Edit ${subcategory.name}`}><Edit2 size={13} /></button><button type="button" onClick={() => removeSubcategory(subcategory)} className="grid size-9 place-items-center rounded-full bg-red-50 text-red-500 hover:bg-red-100" aria-label={`Delete ${subcategory.name}`}><Trash2 size={13} /></button></div></td></tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <Modal open={open} onClose={close} eyebrow="Category management" title={editing ? 'Edit category' : 'Add category'} maxWidth="max-w-xl">
        <form onSubmit={submit} className="space-y-4 p-5 sm:p-7">
          <label className="block"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Category name</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} /></label>
          <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"><span className="text-[10px] font-bold text-slate-700">Enabled on storefront</span><input type="checkbox" checked={form.enabled !== false} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} className="size-4 accent-[#397a4a]" /></label>
          {error && <p role="alert" className="text-[10px] font-bold text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={close} className="h-11 rounded-full bg-white px-5 text-[10px] font-extrabold text-slate-500 shadow-sm">Cancel</button><button type="submit" className="h-11 rounded-full bg-[#397a4a] px-5 text-[10px] font-extrabold text-white">{editing ? 'Save changes' : 'Add category'}</button></div>
        </form>
      </Modal>

      <Modal open={subcategoryOpen} onClose={closeSubcategory} eyebrow="Subcategory management" title={editingSubcategory ? 'Edit subcategory' : 'Add subcategory'} maxWidth="max-w-3xl">
        <form onSubmit={submitSubcategory} className="space-y-4 p-5 sm:p-7">
          <label className="block"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Parent category</span><SelectMenu value={subcategoryForm.categoryId} onChange={(categoryId) => setSubcategoryForm((current) => ({ ...current, categoryId }))} options={categoryOptions} ariaLabel="Parent category" buttonClassName={inputClass} /></label>
          <label className="block"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Subcategory name</span><input required value={subcategoryForm.name} onChange={(event) => setSubcategoryForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} /></label>
          <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"><span className="text-[10px] font-bold text-slate-700">Enabled on storefront</span><input type="checkbox" checked={subcategoryForm.enabled !== false} onChange={(event) => setSubcategoryForm((current) => ({ ...current, enabled: event.target.checked }))} className="size-4 accent-[#397a4a]" /></label>
          {subcategoryError && <p role="alert" className="text-[10px] font-bold text-red-600">{subcategoryError}</p>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={closeSubcategory} className="h-11 rounded-full bg-white px-5 text-[10px] font-extrabold text-slate-500 shadow-sm">Cancel</button><button type="submit" className="h-11 rounded-full bg-[#397a4a] px-5 text-[10px] font-extrabold text-white">{editingSubcategory ? 'Save changes' : 'Add subcategory'}</button></div>
        </form>
      </Modal>
    </div>
  )
}
