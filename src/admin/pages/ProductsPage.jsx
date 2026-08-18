import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import SelectMenu from '../../components/ui/SelectMenu'
import { EmptyState, Modal, PageHeader } from '../components/ui/AdminUI'
import { formatCurrency, parsePrice } from '../../user/utils/currency'
import {
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_IMAGE_SIZE,
  PRODUCT_IMAGE_TYPES,
} from '../../firebase/productImages'

const blankProduct = {
  name: '',
  sku: '',
  brand: 'Pride',
  category: '',
  price: '',
  originalPrice: '',
  stock: 0,
  rating: 0,
  reviewsCount: 0,
  badge: '',
  discount: '',
  taxRate: 18,
  lowStockThreshold: 10,
  enabled: true,
  image: '',
  description: '',
  specs: '',
  modelNumber: '',
  warranty: '',
  weight: '',
  dimensions: '',
  deliveryInformation: '',
}

const parseList = (value) =>
  String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)

const createDuplicateProduct = (product) => {
  const duplicateId = Date.now()
  return {
    ...product,
    id: duplicateId,
    name: `${product.name} Copy`,
    sku: `${product.sku || `PE-${product.id}`}-COPY-${String(duplicateId).slice(-4)}`,
    createdAt: new Date().toISOString().slice(0, 10),
    featured: false,
    enabled: false,
  }
}

export default function ProductsPage({
  products = [],
  categories: managedCategories = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  searchQuery = '',
  loading = false,
  loadError = '',
}) {
  const categoryOptions = managedCategories.map((category) => ({
    value: category.name,
    label: category.name,
  }))
  const [category, setCategory] = useState('All')
  const [viewMode, setViewMode] = useState('table')
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(blankProduct)
  const [formErrors, setFormErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const productFormOpen = creatingProduct || Boolean(editingProduct)
  const categories = [
    'All',
    ...new Set(products.map((product) => product.category)),
  ]
  const filtered = products.filter(
    (product) =>
      (category === 'All' || product.category === category) &&
      (!searchQuery ||
        `${product.name} ${product.sku || ''} ${product.brand || ''} ${product.category}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())),
  )

  useEffect(
    () => () => imagePreviews.forEach((preview) => URL.revokeObjectURL(preview)),
    [imagePreviews],
  )

  const clearImageSelection = () => {
    setSelectedImages([])
    setImagePreviews([])
  }

  const selectImages = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length > MAX_PRODUCT_IMAGES) {
      event.target.value = ''
      clearImageSelection()
      setFormErrors((current) => ({
        ...current,
        images: `Select between 1 and ${MAX_PRODUCT_IMAGES} images per product.`,
      }))
      return
    }
    setSelectedImages(files)
    setImagePreviews(files.map((file) => URL.createObjectURL(file)))
    setFormErrors((current) => {
      const next = { ...current }
      delete next.images
      return next
    })
  }

  const openAdd = () => {
    clearImageSelection()
    setEditingProduct(null)
    setForm({
      ...blankProduct,
      category: categoryOptions[0]?.value || blankProduct.category,
    })
    setFormErrors({})
    setSaveError('')
    setCreatingProduct(true)
  }
  const openEdit = (product) => {
    clearImageSelection()
    setEditingProduct(product)
    setForm({
      ...blankProduct,
      ...product,
      specs: Array.isArray(product.specs)
        ? product.specs.join(', ')
        : String(product.specs || ''),
    })
    setFormErrors({})
    setSaveError('')
  }
  const closeProductForm = () => {
    clearImageSelection()
    setCreatingProduct(false)
    setEditingProduct(null)
    setFormErrors({})
    setSaveError('')
  }
  const validateForm = () => {
    const errors = {}
    const sellingPrice = parsePrice(form.price)
    const mrp = parsePrice(form.originalPrice)
    if (form.name.trim().length < 3)
      errors.name = 'Enter at least 3 characters.'
    if (!form.brand.trim()) errors.brand = 'Brand is required.'
    if (!form.category) errors.category = 'Select a category.'
    if (form.description.trim().length < 20)
      errors.description = 'Enter at least 20 characters.'
    if (sellingPrice <= 0) errors.price = 'Enter a valid selling price.'
    if (mrp <= 0) errors.originalPrice = 'Enter a valid MRP.'
    if (sellingPrice > mrp) errors.price = 'Selling price cannot exceed MRP.'
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0)
      errors.stock = 'Stock must be a non-negative whole number.'
    if (
      !Number.isInteger(Number(form.lowStockThreshold)) ||
      Number(form.lowStockThreshold) < 0
    )
      errors.lowStockThreshold =
        'Threshold must be a non-negative whole number.'
    if (Number(form.rating) < 0 || Number(form.rating) > 5)
      errors.rating = 'Rating must be between 0 and 5.'
    if (
      Number(form.reviewsCount) < 0 ||
      !Number.isInteger(Number(form.reviewsCount))
    )
      errors.reviewsCount =
        'Review count must be a non-negative whole number.'
    if (Number(form.taxRate) < 0 || Number(form.taxRate) > 100)
      errors.taxRate = 'Tax must be between 0 and 100.'
    const hasExistingImages = Boolean(
      editingProduct?.image || editingProduct?.images?.length,
    )
    if (!selectedImages.length && !hasExistingImages)
      errors.images = 'Select at least one product image.'
    if (selectedImages.length > MAX_PRODUCT_IMAGES)
      errors.images = `Select between 1 and ${MAX_PRODUCT_IMAGES} images per product.`
    const invalidImage = selectedImages.find(
      (file) =>
        !PRODUCT_IMAGE_TYPES.includes(file.type) ||
        file.size > MAX_PRODUCT_IMAGE_SIZE,
    )
    if (invalidImage)
      errors.images = PRODUCT_IMAGE_TYPES.includes(invalidImage.type)
        ? `${invalidImage.name} must be smaller than 20 MB.`
        : `${invalidImage.name} must be a JPG, PNG, or WebP image.`
    if (
      form.sku.trim() &&
      products.some(
        (product) =>
          product.id !== editingProduct?.id &&
          String(product.sku).toLowerCase() ===
            form.sku.trim().toLowerCase(),
      )
    )
      errors.sku = 'This SKU is already in use.'
    return errors
  }
  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm()
    setFormErrors(nextErrors)
    setSaveError('')
    if (Object.keys(nextErrors).length) return
    const nextProduct = {
      ...editingProduct,
      ...form,
      id: editingProduct?.id || '',
      price: formatCurrency(parsePrice(form.price)),
      originalPrice: formatCurrency(parsePrice(form.originalPrice)),
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
      taxRate: Number(form.taxRate),
      rating: Number(form.rating),
      reviewsCount: Number(form.reviewsCount),
      sku: form.sku.trim() || `PE-${Date.now().toString().slice(-6)}`,
      specs: parseList(form.specs),
      imageFiles: selectedImages,
      image: editingProduct?.image || '',
      images: editingProduct?.images || [editingProduct?.image].filter(Boolean),
      videos: [],
      featured: editingProduct?.featured ?? true,
      enabled: form.enabled !== false,
    }
    setSaving(true)
    try {
      if (editingProduct) {
        await onUpdateProduct(nextProduct)
        closeProductForm()
      } else {
        await onAddProduct(nextProduct)
        closeProductForm()
      }
    } catch (error) {
      setSaveError(error.message || 'Unable to save the product to Firestore.')
    } finally {
      setSaving(false)
    }
  }
  const duplicateProduct = async (product) => {
    setSaveError('')
    try {
      await onAddProduct(createDuplicateProduct(product))
    } catch (error) {
      setSaveError(error.message || 'Unable to duplicate the product.')
    }
  }
  const toggleProduct = async (product) => {
    setSaveError('')
    try {
      await onUpdateProduct({ ...product, enabled: product.enabled === false })
    } catch (error) {
      setSaveError(error.message || 'Unable to update the product.')
    }
  }
  const deleteProduct = (product) => {
    setDeleteError('')
    setDeleteTarget(product)
  }
  const closeDeleteConfirmation = () => {
    if (deleting) return
    setDeleteTarget(null)
    setDeleteError('')
  }
  const confirmDeleteProduct = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await onDeleteProduct(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      setDeleteError(error.message || 'Unable to delete the product.')
    } finally {
      setDeleting(false)
    }
  }
  const field = (key) => ({
    value: form[key],
    onChange: (event) =>
      setForm((current) => ({ ...current, [key]: event.target.value })),
  })

  return (
    <div className="space-y-6">
      {productFormOpen && (
        <button type="button" onClick={closeProductForm} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[10px] font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-950 hover:text-white">
          <ArrowLeft size={14} /> Back to Products
        </button>
      )}
      {!productFormOpen && <>
      <PageHeader
        eyebrow="Catalog management"
        title="All Products"
        description={`${filtered.length} products in view. Create products, update prices and specifications, and keep inventory healthy across the storefront.`}
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

      {(saveError || loadError) && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-bold text-red-700">{saveError || loadError}</p>}

      {loading ? (
        <EmptyState title="Loading products" text="Fetching the latest catalog from Firestore." />
      ) : !filtered.length ? (
        <EmptyState title="No matching products" />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductGridCard
              key={product.id}
              product={product}
              onEdit={() => openEdit(product)}
              onDuplicate={() => duplicateProduct(product)}
              onToggle={() => toggleProduct(product)}
              onDelete={() => deleteProduct(product)}
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
                    onDuplicate={() => duplicateProduct(product)}
                    onToggle={() => toggleProduct(product)}
                    onDelete={() => deleteProduct(product)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>}

      <Modal
        open={productFormOpen}
        onClose={closeProductForm}
        eyebrow={editingProduct ? 'Update catalog item' : 'Create catalog item'}
        title={editingProduct ? 'Edit product' : 'Add new product'}
        maxWidth="max-w-4xl"
        inline
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
              {imagePreviews[0] || form.image ? <img
                  src={imagePreviews[0] || form.image}
                  alt="Product preview"
                  className="aspect-square size-full rounded-[19px] object-cover"
                /> : <div className="grid aspect-square size-full place-items-center rounded-[19px] bg-slate-100 text-[9px] font-bold text-slate-400">Image preview</div>}
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
            {(saveError || Object.keys(formErrors).length > 0) && (
              <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[9px] font-bold text-red-700 sm:col-span-2">
                {saveError || `Please correct: ${Object.values(formErrors).join(' ')}`}
              </div>
            )}
            <FormSectionTitle title="Basic Information" />
            <FormField label="Product name" wide>
              <input required {...field('name')} className={inputClass} />
            </FormField>
            <FormField label="SKU">
              <input {...field('sku')} placeholder="Generated if left blank" className={inputClass} />
            </FormField>
            <FormField label="Brand">
              <input required {...field('brand')} className={inputClass} />
            </FormField>
            <FormField label="Category">
              <SelectMenu
                value={form.category}
                onChange={(category) =>
                  setForm((current) => ({ ...current, category }))
                }
                options={categoryOptions}
                ariaLabel="Product category"
                buttonClassName={inputClass}
              />
            </FormField>
            <FormField label="Badge">
              <input {...field('badge')} className={inputClass} />
            </FormField>
            <FormField label="Description" wide>
              <textarea
                required
                {...field('description')}
                className={`${inputClass} min-h-24 py-3`}
              />
            </FormField>

            <FormSectionTitle title="Pricing" />
            <FormField label="MRP">
              <input required {...field('originalPrice')} className={inputClass} />
            </FormField>
            <FormField label="Selling price">
              <input required {...field('price')} className={inputClass} />
            </FormField>
            <FormField label="Discount">
              <input {...field('discount')} className={inputClass} />
            </FormField>
            <FormField label="Tax / GST (%)">
              <input required type="number" min="0" max="100" step="0.01" {...field('taxRate')} className={inputClass} />
            </FormField>

            <FormSectionTitle title="Inventory" />
            <FormField label="Stock">
              <input
                required
                type="number"
                min="0"
                {...field('stock')}
                className={inputClass}
              />
            </FormField>
            <FormField label="Low stock threshold">
              <input required type="number" min="0" {...field('lowStockThreshold')} className={inputClass} />
            </FormField>

            <FormSectionTitle title="Catalog Display" />
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
            <FormField label="Review count">
              <input required type="number" min="0" {...field('reviewsCount')} className={inputClass} />
            </FormField>

            <FormSectionTitle title="Media" />
            <FormField label="Product images" wide>
              <input
                required={!editingProduct?.image && !editingProduct?.images?.length}
                type="file"
                accept={PRODUCT_IMAGE_TYPES.join(',')}
                multiple
                onChange={selectImages}
                className={`${inputClass} py-2 file:mr-3 file:rounded-full file:border-0 file:bg-[#e4f1e7] file:px-3 file:py-1.5 file:text-[9px] file:font-extrabold file:text-[#397a4a]`}
              />
              <span className="mt-1.5 block text-[8px] font-bold text-slate-400">
                JPG, PNG or WebP · minimum 1 and maximum {MAX_PRODUCT_IMAGES} images per product · 20 MB each. Images are optimized automatically.
                {selectedImages.length ? ` ${selectedImages.length} selected.` : ''}
              </span>
            </FormField>

            <FormSectionTitle title="Specifications" />
            <FormField label="Model">
              <input {...field('modelNumber')} className={inputClass} />
            </FormField>
            <FormField label="Warranty">
              <input {...field('warranty')} className={inputClass} />
            </FormField>
            <FormField label="Technical specifications (comma separated)" wide>
              <textarea
                {...field('specs')}
                className={`${inputClass} min-h-20 py-3`}
              />
            </FormField>

            <FormSectionTitle title="Shipping" />
            <FormField label="Weight">
              <input {...field('weight')} placeholder="For example, 1.2 kg" className={inputClass} />
            </FormField>
            <FormField label="Dimensions">
              <input {...field('dimensions')} placeholder="L × W × H" className={inputClass} />
            </FormField>
            <FormField label="Delivery information" wide>
              <textarea {...field('deliveryInformation')} className={`${inputClass} min-h-20 py-3`} />
            </FormField>
            <button
              type="submit"
              disabled={saving}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#397a4a] text-xs font-extrabold text-white transition hover:bg-[#2f663d] disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
            >
              <Check size={16} />{' '}
              {saving ? 'Saving to Firestore…' : editingProduct ? 'Save product changes' : 'Publish product'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={closeDeleteConfirmation}
        eyebrow="Confirm deletion"
        title="Delete product?"
        maxWidth="max-w-md"
      >
        <div className="p-5 sm:p-7">
          <p className="text-sm font-bold leading-6 text-slate-700">
            Are you sure you want to delete{' '}
            <span className="text-slate-950">{deleteTarget?.name}</span>?
          </p>
          <p className="mt-2 text-[10px] font-semibold leading-5 text-slate-500">
            This permanently removes the product and its uploaded images. This action cannot be undone.
          </p>
          {deleteError && (
            <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-bold text-red-700">
              {deleteError}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={deleting}
              onClick={closeDeleteConfirmation}
              className="h-11 rounded-full border border-slate-200 bg-white px-5 text-[10px] font-extrabold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={confirmDeleteProduct}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-[10px] font-extrabold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
            >
              <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete product'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs outline-none transition focus:border-[#75916f] focus:ring-4 focus:ring-[#75916f]/10'
function FormSectionTitle({ title }) {
  return (
    <div className="border-b border-slate-200 pb-2 pt-2 sm:col-span-2">
      <h4 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#397a4a]">
        {title}
      </h4>
    </div>
  )
}
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
function ProductRow({ product, onEdit, onDuplicate, onToggle, onDelete }) {
  const lowStockThreshold = Number(product.lowStockThreshold ?? 10)
  const stockTone =
    product.stock <= lowStockThreshold
      ? 'bg-red-500'
      : product.stock <= lowStockThreshold * 2
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
            <span className="mt-0.5 block text-[8px] font-semibold text-slate-400">
              {product.sku || `PE-${String(product.id).padStart(4, '0')}`}
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="inline-flex rounded-full bg-[#e4f1e7] px-2 py-1 text-[7px] font-extrabold text-[#397a4a]">
                {product.badge}
              </span>
              {product.enabled === false && <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[7px] font-extrabold text-slate-500">Disabled</span>}
            </div>
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
        <p className="mt-0.5 text-[7px] font-semibold text-slate-400">
          Low stock at {lowStockThreshold}
        </p>
        <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${stockTone}`}
            style={{
              width: `${Math.min(100, Math.max(5, (product.stock / Math.max(1, lowStockThreshold * 3)) * 100))}%`,
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
          <IconButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
          <IconButton
            icon={product.enabled === false ? Eye : EyeOff}
            label={product.enabled === false ? 'Enable' : 'Disable'}
            onClick={onToggle}
          />
          <IconButton icon={Trash2} label="Delete" onClick={onDelete} danger />
        </div>
      </td>
    </tr>
  )
}
function ProductGridCard({ product, onEdit, onDuplicate, onToggle, onDelete }) {
  const lowStock = product.stock <= Number(product.lowStockThreshold ?? 10)
  return (
    <article className="group overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="aspect-[4/3] size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[8px] font-extrabold text-slate-700 backdrop-blur">
          {product.enabled === false ? 'DISABLED' : product.badge}
        </span>
        <span
          className={`absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1.5 text-[8px] font-extrabold backdrop-blur ${lowStock ? 'text-red-600' : 'text-emerald-700'}`}
        >
          {product.stock} in stock
        </span>
      </div>
      <div className="p-4">
        <p className="text-[8px] font-extrabold uppercase tracking-wider text-[#397a4a]">
          {product.category} · {product.sku || `PE-${String(product.id).padStart(4, '0')}`}
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
            onClick={onDuplicate}
            className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-[#397a4a] hover:text-white"
            aria-label="Duplicate product"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-[#397a4a] hover:text-white"
            aria-label={product.enabled === false ? 'Enable product' : 'Disable product'}
          >
            {product.enabled === false ? <Eye size={14} /> : <EyeOff size={14} />}
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
