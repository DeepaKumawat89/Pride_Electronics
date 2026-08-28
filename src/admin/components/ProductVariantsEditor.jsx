import { Plus, Trash2 } from 'lucide-react'
import { DynamicProductSpecifications } from './DynamicProductSpecifications'
import { PRODUCT_IMAGE_TYPES } from '../../firebase/productImages'
import {
  getProductSpecificationValues,
} from '../../utils/productSpecifications'
import { createVariantId } from '../../utils/productVariants'

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs outline-none transition focus:border-[#75916f] focus:ring-4 focus:ring-[#75916f]/10'

const createVariantForm = (fields) => ({
  id: createVariantId(),
  name: '',
  sku: '',
  price: '',
  discountPrice: '',
  stock: 0,
  reservedStock: 0,
  modelNumber: '',
  image: '',
  images: [],
  imageStoragePaths: [],
  imageFiles: [],
  imagePreviews: [],
  specificationValues: getProductSpecificationValues({}, fields),
  customSpecifications: [],
})

export default function ProductVariantsEditor({
  variants = [],
  fields = [],
  errors = {},
  onChange,
  onSelectImages,
}) {
  const updateVariant = (index, changes) => onChange(
    variants.map((variant, itemIndex) => itemIndex === index ? { ...variant, ...changes } : variant),
  )

  return (
    <section className="space-y-4 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[22px] bg-slate-50 px-4 py-3">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#397a4a]">Optional product variants</p>
          <p className="mt-1 text-[9px] font-semibold text-slate-400">Leave this empty for a standard product. Each variant maintains its own price, stock, media, and specifications.</p>
        </div>
        <button type="button" onClick={() => onChange([...variants, createVariantForm(fields)])} className="flex h-9 items-center gap-1.5 rounded-full bg-[#397a4a] px-3 text-[9px] font-extrabold text-white">
          <Plus size={13} /> Add variant
        </button>
      </div>

      {variants.map((variant, index) => (
        <article key={variant.id} className="space-y-4 rounded-[24px] border border-[#dcebdd] bg-[#f8faf7] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#397a4a]">Variant {index + 1}</p>
              <p className="mt-1 text-xs font-extrabold text-slate-800">{variant.name || 'Unnamed variant'}</p>
            </div>
            <button type="button" disabled={Number(variant.reservedStock || 0) > 0} onClick={() => onChange(variants.filter((_, itemIndex) => itemIndex !== index))} title={Number(variant.reservedStock || 0) > 0 ? 'This variant has stock reserved for an open order.' : 'Remove variant'} className="flex h-9 items-center gap-1.5 rounded-full bg-red-50 px-3 text-[9px] font-extrabold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={12} /> Remove</button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Variant name *</span><input value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} placeholder="For example, 16 GB / 512 GB" className={inputClass} /></label>
            <label><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Variant SKU *</span><input value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value })} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Price *</span><input type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, { price: event.target.value })} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Discount price</span><input type="number" min="0" step="0.01" value={variant.discountPrice} onChange={(event) => updateVariant(index, { discountPrice: event.target.value })} placeholder="Optional selling price" className={inputClass} /></label>
            <label><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Stock *</span><input type="number" min="0" step="1" value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Model number</span><input value={variant.modelNumber} onChange={(event) => updateVariant(index, { modelNumber: event.target.value })} className={inputClass} /></label>
            <label className="sm:col-span-2"><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Variant images</span><input type="file" accept={PRODUCT_IMAGE_TYPES.join(',')} multiple onChange={(event) => onSelectImages(index, event)} className={`${inputClass} py-2 file:mr-3 file:rounded-full file:border-0 file:bg-[#e4f1e7] file:px-3 file:py-1.5 file:text-[9px] file:font-extrabold file:text-[#397a4a]`} /></label>
            {!!(variant.imagePreviews?.length || variant.images?.length) && (
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                {(variant.imagePreviews?.length ? variant.imagePreviews : variant.images).map((image, imageIndex) => <img key={`${image}-${imageIndex}`} src={image} alt={`${variant.name || 'Variant'} preview ${imageIndex + 1}`} className="size-14 rounded-xl object-cover" />)}
              </div>
            )}
          </div>

          <DynamicProductSpecifications
            fields={fields}
            values={variant.specificationValues || {}}
            onValueChange={(fieldId, value) => updateVariant(index, { specificationValues: { ...(variant.specificationValues || {}), [fieldId]: value } })}
            customSpecifications={variant.customSpecifications || []}
            onCustomSpecificationsChange={(customSpecifications) => updateVariant(index, { customSpecifications })}
            fieldErrors={errors[variant.id]?.fields || {}}
            customErrors={errors[variant.id]?.custom || {}}
          />
          {errors[variant.id]?.message && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[9px] font-bold text-red-600">{errors[variant.id].message}</p>}
        </article>
      ))}
    </section>
  )
}
