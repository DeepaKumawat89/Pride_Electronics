import { Plus, Trash2 } from 'lucide-react'
import {
  SPECIFICATION_FIELD_TYPES,
  createCustomSpecification,
  createSpecificationField,
  normalizeSpecificationField,
} from '../../utils/productSpecifications'

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs outline-none transition focus:border-[#75916f] focus:ring-4 focus:ring-[#75916f]/10'

export function SpecificationTemplateEditor({
  fields = [],
  onChange,
  errors = {},
  recommendedTemplate = null,
  onApplyRecommendedTemplate,
}) {
  const updateField = (index, changes) => {
    onChange(fields.map((field, itemIndex) =>
      itemIndex === index
        ? normalizeSpecificationField({ ...field, ...changes }, itemIndex)
        : field,
    ))
  }

  const removeField = (index) => onChange(fields.filter((_, itemIndex) => itemIndex !== index))

  return (
    <section className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#397a4a]">Technical field template</h3>
          <p className="mt-1 text-[9px] font-semibold leading-4 text-slate-400">These fields appear automatically when this subcategory is selected on a product.</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {recommendedTemplate && onApplyRecommendedTemplate && (
            <button type="button" onClick={onApplyRecommendedTemplate} className="h-9 rounded-full border border-[#9bcaa6] bg-white px-3 text-[9px] font-extrabold text-[#397a4a]">
              Load recommended template
            </button>
          )}
          <button type="button" onClick={() => onChange([...fields, createSpecificationField()])} className="flex h-9 items-center gap-1.5 rounded-full bg-[#397a4a] px-3 text-[9px] font-extrabold text-white">
            <Plus size={13} /> Add field
          </button>
        </div>
      </div>

      {!fields.length && (
        <p className="rounded-2xl bg-white px-4 py-4 text-center text-[9px] font-bold text-slate-400">No dynamic fields configured. Products can still use common and custom specifications.</p>
      )}
      {recommendedTemplate && (
        <p className="rounded-2xl bg-[#eef6ef] px-4 py-3 text-[9px] font-bold text-[#397a4a]">Recommended template: {recommendedTemplate.name} · {recommendedTemplate.fields.length} relevant fields</p>
      )}

      {fields.map((field, index) => (
        <article key={field.id} className="grid gap-3 rounded-[20px] bg-white p-4 shadow-sm sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Field label</span>
            <input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} placeholder="For example, RAM" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Field type</span>
            <select value={field.type} onChange={(event) => updateField(index, { type: event.target.value })} className={inputClass}>
              {SPECIFICATION_FIELD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          {(field.type === 'select' || field.type === 'multi-select') && (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Options (comma or line separated)</span>
              <textarea value={field.options.join(', ')} onChange={(event) => updateField(index, { options: event.target.value })} placeholder="8 GB, 16 GB, 32 GB" className={`${inputClass} min-h-20 py-3`} />
            </label>
          )}
          {field.type !== 'boolean' && (
            <label className="block">
              <span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Placeholder</span>
              <input value={field.placeholder} onChange={(event) => updateField(index, { placeholder: event.target.value })} className={inputClass} />
            </label>
          )}
          {(field.type === 'number' || field.type === 'text') && (
            <label className="block">
              <span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Unit (optional)</span>
              <input value={field.unit} onChange={(event) => updateField(index, { unit: event.target.value })} placeholder="GB, W, Hz" className={inputClass} />
            </label>
          )}
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <label className="flex items-center gap-2 text-[9px] font-extrabold text-slate-600">
              <input type="checkbox" checked={field.required} onChange={(event) => updateField(index, { required: event.target.checked })} className="size-4 accent-[#397a4a]" /> Required field
            </label>
            <button type="button" onClick={() => removeField(index)} className="flex h-9 items-center gap-1.5 rounded-full bg-red-50 px-3 text-[9px] font-extrabold text-red-600">
              <Trash2 size={12} /> Remove
            </button>
          </div>
          {errors[field.id] && <p role="alert" className="text-[9px] font-bold text-red-600 sm:col-span-2">{errors[field.id]}</p>}
        </article>
      ))}
    </section>
  )
}

function SpecificationInput({ field, value, onChange, error }) {
  const label = `${field.label}${field.unit ? ` (${field.unit})` : ''}`
  const commonProps = {
    value: value ?? '',
    onChange: (event) => onChange(event.target.value),
    placeholder: field.placeholder,
    className: inputClass,
  }

  return (
    <div className={field.type === 'textarea' || field.type === 'multi-select' ? 'sm:col-span-2' : ''}>
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
        {field.required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
      </span>
      {field.type === 'textarea' && <textarea {...commonProps} className={`${inputClass} min-h-24 py-3`} />}
      {field.type === 'text' && <input type="text" {...commonProps} />}
      {field.type === 'number' && <input type="number" step="any" {...commonProps} />}
      {field.type === 'select' && (
        <select {...commonProps}>
          <option value="">Select {field.label}</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      )}
      {field.type === 'boolean' && (
        <select
          value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={(event) => onChange(event.target.value === '' ? '' : event.target.value === 'true')}
          className={inputClass}
        >
          <option value="">Select {field.label}</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )}
      {field.type === 'multi-select' && (
        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
          {field.options.map((option) => {
            const selected = Array.isArray(value) && value.includes(option)
            return (
              <label key={option} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold transition ${selected ? 'bg-[#e4f1e7] text-[#397a4a]' : 'bg-slate-50 text-slate-600'}`}>
                <input type="checkbox" checked={selected} onChange={() => onChange(selected ? value.filter((item) => item !== option) : [...(Array.isArray(value) ? value : []), option])} className="size-4 accent-[#397a4a]" />
                {option}
              </label>
            )
          })}
        </div>
      )}
      {error && <p role="alert" className="mt-1.5 text-[9px] font-bold text-red-600">{error}</p>}
    </div>
  )
}

export function DynamicProductSpecifications({
  fields = [],
  values = {},
  onValueChange,
  customSpecifications = [],
  onCustomSpecificationsChange,
  fieldErrors = {},
  customErrors = {},
}) {
  const updateCustom = (index, changes) => onCustomSpecificationsChange(
    customSpecifications.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item),
  )

  return (
    <div className="space-y-4 sm:col-span-2">
      {fields.length ? (
        <div className="grid gap-4 rounded-[24px] border border-[#dcebdd] bg-[#f8faf7] p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#397a4a]">Subcategory technical fields</p>
            <p className="mt-1 text-[9px] font-semibold text-slate-400">Fields are loaded from the selected subcategory.</p>
          </div>
          {fields.map((field) => (
            <SpecificationInput key={field.id} field={field} value={values[field.id]} onChange={(value) => onValueChange(field.id, value)} error={fieldErrors[field.id]} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[9px] font-bold text-slate-400">Select a configured subcategory to load its technical fields.</p>
      )}

      <div className="space-y-3">
        {customSpecifications.map((item, index) => (
          <div key={item.id} className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto]">
            <input value={item.label} onChange={(event) => updateCustom(index, { label: event.target.value })} placeholder="Specification name" aria-label="Custom specification name" className={inputClass} />
            <input value={item.value} onChange={(event) => updateCustom(index, { value: event.target.value })} placeholder="Value" aria-label="Custom specification value" className={inputClass} />
            <button type="button" onClick={() => onCustomSpecificationsChange(customSpecifications.filter((_, itemIndex) => itemIndex !== index))} className="grid size-11 place-items-center rounded-2xl bg-red-50 text-red-600" aria-label="Remove custom specification"><Trash2 size={14} /></button>
            {customErrors[item.id] && <p role="alert" className="text-[9px] font-bold text-red-600 sm:col-span-3">{customErrors[item.id]}</p>}
          </div>
        ))}
        <button type="button" onClick={() => onCustomSpecificationsChange([...customSpecifications, createCustomSpecification()])} className="flex h-10 items-center gap-2 rounded-full border border-[#9bcaa6] bg-white px-4 text-[9px] font-extrabold text-[#397a4a] transition hover:bg-[#eef6ef]">
          <Plus size={14} /> Add Custom Specification
        </button>
      </div>
    </div>
  )
}
