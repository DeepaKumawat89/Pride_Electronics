import { useState } from 'react'
import {
  Check,
  Edit2,
  LayoutGrid,
  List,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { EmptyState, Modal, PageHeader } from '../components/ui/AdminUI'

const emptyProduct = {
  name: '',
  category: 'Components & DIY',
  price: '₹12,499',
  originalPrice: '₹15,999',
  stock: 20,
  rating: 4.8,
  reviewsCount: 15,
  badge: 'NEW',
  discount: '20% OFF',
  image:
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
  description:
    'High performance electronic hardware component built for precision engineering.',
  specs: 'High Speed Processing, USB-C 3.2, Low Power Consumption',
}

export default function ProductsPage({
  products = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  searchQuery = '',
}) {
  const [category, setCategory] = useState('All')
  const [viewMode, setViewMode] = useState('table')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const categories = [
    'All',
    ...new Set(products.map((product) => product.category)),
  ]
  const filtered = products.filter(
    (product) =>
      (category === 'All' || product.category === category) &&
      (!searchQuery ||
        `${product.name} ${product.category}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())),
  )

  const openAdd = () => {
    setEditingProduct(null)
    setForm(emptyProduct)
    setModalOpen(true)
  }
  const openEdit = (product) => {
    setEditingProduct(product)
    setForm({ ...product, specs: product.specs?.join(', ') || '' })
    setModalOpen(true)
  }
  const closeModal = () => {
    setModalOpen(false)
    setEditingProduct(null)
  }
  const submit = (event) => {
    event.preventDefault()
    const nextProduct = {
      ...editingProduct,
      ...form,
      id: editingProduct?.id || Date.now(),
      stock: Number(form.stock),
      rating: Number(form.rating),
      reviewsCount: Number(form.reviewsCount),
      specs: String(form.specs)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      featured: editingProduct?.featured ?? true,
    }
    if (editingProduct) onUpdateProduct(nextProduct)
    else onAddProduct(nextProduct)
    closeModal()
  }
  const field = (key) => ({
    value: form[key],
    onChange: (event) =>
      setForm((current) => ({ ...current, [key]: event.target.value })),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog management"
        title={`${filtered.length} products in view`}
        description="Create products, update prices and specifications, and keep inventory healthy across the storefront."
        actions={
          <>
            <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <ViewButton
                active={viewMode === 'table'}
                onClick={() => setViewMode('table')}
                icon={List}
                label="Table"
              />
              <ViewButton
                active={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                icon={LayoutGrid}
                label="Grid"
              />
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="flex h-11 items-center gap-2 rounded-full bg-[#17251c] px-4 text-[10px] font-extrabold text-white transition hover:bg-[#397a4a]"
            >
              <Plus size={15} /> Add product
            </button>
          </>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((item) => {
          const count =
            item === 'All'
              ? products.length
              : products.filter((product) => product.category === item).length
          return (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[9px] font-extrabold transition ${category === item ? 'bg-[#397a4a] text-white shadow-md' : 'border border-slate-200 bg-white text-slate-500 hover:border-[#75916f]'}`}
            >
              {item}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[7px] ${category === item ? 'bg-white/15' : 'bg-slate-100'}`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {!filtered.length ? (
        <EmptyState title="No matching products" />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductGridCard
              key={product.id}
              product={product}
              onEdit={() => openEdit(product)}
              onDelete={() => onDeleteProduct(product.id)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]">
                <tr>
                  {[
                    'Product',
                    'Category',
                    'Price',
                    'Inventory',
                    'Rating',
                    'Actions',
                  ].map((head) => (
                    <th
                      key={head}
                      className={`px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ${head === 'Actions' ? 'text-right' : ''}`}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onEdit={() => openEdit(product)}
                    onDelete={() => onDeleteProduct(product.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        eyebrow={editingProduct ? 'Update catalog item' : 'Create catalog item'}
        title={editingProduct ? 'Edit product' : 'Add new product'}
        maxWidth="max-w-4xl"
      >
        <form
          onSubmit={submit}
          className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[260px_minmax(0,1fr)]"
        >
          <div>
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
              Live preview
            </p>
            <div className="overflow-hidden rounded-[24px] bg-white p-2 shadow-sm">
              <img
                src={form.image}
                alt="Product preview"
                className="aspect-square size-full rounded-[19px] object-cover"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {String(form.specs)
                .split(',')
                .map(
                  (spec) =>
                    spec.trim() && (
                      <span
                        key={spec}
                        className="rounded-full bg-[#e4f1e7] px-2.5 py-1.5 text-[8px] font-bold text-[#397a4a]"
                      >
                        {spec.trim()}
                      </span>
                    ),
                )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Product name" wide>
              <input required {...field('name')} className={inputClass} />
            </FormField>
            <FormField label="Category">
              <select {...field('category')} className={inputClass}>
                {[
                  'Audio',
                  'Wearables',
                  'Components & DIY',
                  'Peripherals',
                  'Smart Power',
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Selling price">
              <input required {...field('price')} className={inputClass} />
            </FormField>
            <FormField label="Original price">
              <input {...field('originalPrice')} className={inputClass} />
            </FormField>
            <FormField label="Stock">
              <input
                required
                type="number"
                min="0"
                {...field('stock')}
                className={inputClass}
              />
            </FormField>
            <FormField label="Rating">
              <input
                required
                type="number"
                min="0"
                max="5"
                step="0.1"
                {...field('rating')}
                className={inputClass}
              />
            </FormField>
            <FormField label="Badge">
              <input {...field('badge')} className={inputClass} />
            </FormField>
            <FormField label="Discount">
              <input {...field('discount')} className={inputClass} />
            </FormField>
            <FormField label="Image URL" wide>
              <input required {...field('image')} className={inputClass} />
            </FormField>
            <FormField label="Description" wide>
              <textarea
                {...field('description')}
                className={`${inputClass} min-h-24 py-3`}
              />
            </FormField>
            <FormField label="Technical specifications (comma separated)" wide>
              <textarea
                {...field('specs')}
                className={`${inputClass} min-h-20 py-3`}
              />
            </FormField>
            <button
              type="submit"
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#397a4a] text-xs font-extrabold text-white transition hover:bg-[#2f663d] sm:col-span-2"
            >
              <Check size={16} />{' '}
              {editingProduct ? 'Save product changes' : 'Publish product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs outline-none transition focus:border-[#75916f] focus:ring-4 focus:ring-[#75916f]/10'
function FormField({ label, wide, children }) {
  return (
    <label className={wide ? 'sm:col-span-2' : ''}>
      <span className="mb-2 block text-[9px] font-extrabold text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}
function ViewButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[9px] font-extrabold transition ${active ? 'bg-[#397a4a] text-white' : 'text-slate-500'}`}
    >
      <Icon size={13} /> {label}
    </button>
  )
}
function ProductRow({ product, onEdit, onDelete }) {
  const stockTone =
    product.stock < 10
      ? 'bg-red-500'
      : product.stock < 25
        ? 'bg-amber-500'
        : 'bg-emerald-500'
  return (
    <tr className="transition hover:bg-[#fafcf9]">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <img
            src={product.image}
            alt=""
            className="size-12 rounded-2xl object-cover"
          />
          <div className="min-w-0">
            <strong className="block max-w-64 truncate text-[10px] text-slate-900">
              {product.name}
            </strong>
            <span className="mt-1 inline-flex rounded-full bg-[#e4f1e7] px-2 py-1 text-[7px] font-extrabold text-[#397a4a]">
              {product.badge}
            </span>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-[10px] font-bold text-slate-500">
        {product.category}
      </td>
      <td className="px-5 py-4">
        <strong className="block text-xs text-slate-900">
          {product.price}
        </strong>
        <span className="text-[8px] text-slate-400 line-through">
          {product.originalPrice}
        </span>
      </td>
      <td className="px-5 py-4">
        <p className="text-[9px] font-extrabold text-slate-700">
          {product.stock} units
        </p>
        <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${stockTone}`}
            style={{
              width: `${Math.min(100, Math.max(5, product.stock * 2))}%`,
            }}
          />
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="flex items-center gap-1 text-[10px] font-extrabold text-slate-700">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          {product.rating}
          <small className="font-semibold text-slate-400">
            ({product.reviewsCount})
          </small>
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <IconButton icon={Edit2} label="Edit" onClick={onEdit} />
          <IconButton icon={Trash2} label="Delete" onClick={onDelete} danger />
        </div>
      </td>
    </tr>
  )
}
function ProductGridCard({ product, onEdit, onDelete }) {
  return (
    <article className="group overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="aspect-[4/3] size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[8px] font-extrabold text-slate-700 backdrop-blur">
          {product.badge}
        </span>
        <span
          className={`absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1.5 text-[8px] font-extrabold backdrop-blur ${product.stock < 10 ? 'text-red-600' : 'text-emerald-700'}`}
        >
          {product.stock} in stock
        </span>
      </div>
      <div className="p-4">
        <p className="text-[8px] font-extrabold uppercase tracking-wider text-[#397a4a]">
          {product.category}
        </p>
        <h3 className="mt-2 min-h-10 line-clamp-2 text-xs font-extrabold leading-5 text-slate-900">
          {product.name}
        </h3>
        <div className="mt-3 flex items-center justify-between">
          <strong className="text-sm text-slate-950">{product.price}</strong>
          <span className="flex items-center gap-1 text-[9px] font-bold">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            {product.rating}
          </span>
        </div>
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#17251c] text-[9px] font-extrabold text-white hover:bg-[#397a4a]"
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="grid size-10 place-items-center rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
            aria-label="Delete product"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}
function IconButton({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[8px] font-extrabold transition ${danger ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#397a4a] hover:text-white'}`}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}
