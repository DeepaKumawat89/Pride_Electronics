import { useEffect, useState } from 'react'
import { Building2, Hash, Pencil, ReceiptText, Save, X } from 'lucide-react'
import { PageHeader } from '../components/ui/AdminUI'

const inputClass =
  'mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs text-black outline-none transition disabled:cursor-default disabled:text-black disabled:opacity-100 focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10'
const copySettings = (settings) => JSON.parse(JSON.stringify(settings))

function Field({ label, children }) {
  return <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{label}{children}</label>
}

function Section({ icon: Icon, title, description, children }) {
  return <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-10 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]"><Icon size={18} /></span><div><h3 className="text-sm font-extrabold text-slate-900">{title}</h3><p className="mt-0.5 text-[9px] text-slate-400">{description}</p></div></div><div className="mt-5">{children}</div></section>
}

export default function TaxInvoicePage({ settings, onUpdate }) {
  const [form, setForm] = useState(() => copySettings(settings))
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!isEditing) setForm(copySettings(settings))
  }, [isEditing, settings])

  const update = (section, patch) => setForm((current) => ({ ...current, [section]: { ...current[section], ...patch } }))
  const save = () => {
    onUpdate({
      ...copySettings(form),
      tax: { ...form.tax, gstEnabled: true, pricesIncludeTax: false },
    })
    setIsEditing(false)
  }
  const cancel = () => {
    setForm(copySettings(settings))
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finance settings" title="Tax & invoice" description="Configure GST, business identity, and invoice numbering used for newly placed orders and customer PDFs." actions={isEditing ? <div className="flex items-center gap-2"><button type="button" onClick={cancel} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50"><X size={15} /> Cancel</button><button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#ff5c35]"><Save size={15} /> Save Changes</button></div> : <button type="button" onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#397a4a]"><Pencil size={15} /> Edit Details</button>} />

      <div className="grid gap-5 xl:grid-cols-2">
        <Section icon={ReceiptText} title="Tax configuration" description="GST calculation and registration information.">
          <p className="text-[10px] font-bold text-slate-600">Product selling prices exclude GST. The applicable product GST is calculated and added automatically.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN"><input readOnly={!isEditing} className={inputClass} value={form.tax.gstin} onChange={(e) => update('tax', { gstin: e.target.value.toUpperCase() })} /></Field>
            <Field label="Registration type"><select disabled={!isEditing} className={inputClass} value={form.tax.registrationType} onChange={(e) => update('tax', { registrationType: e.target.value })}><option>Regular</option><option>Composition</option><option>Unregistered</option></select></Field>
            <Field label="State"><input readOnly={!isEditing} className={inputClass} value={form.tax.state} onChange={(e) => update('tax', { state: e.target.value })} /></Field>
            <Field label="State code"><input readOnly={!isEditing} maxLength="2" className={inputClass} value={form.tax.stateCode} onChange={(e) => update('tax', { stateCode: e.target.value.replace(/\D/g, '').slice(0, 2) })} /></Field>
            <Field label="Delivery GST treatment">
              <select disabled={!isEditing} className={inputClass} value={form.tax.shippingTaxTreatment || 'product-rates'} onChange={(e) => update('tax', { shippingTaxTreatment: e.target.value })}>
                <option value="fixed">Configured delivery GST rate</option>
                <option value="product-rates">Follow product GST rates</option>
                <option value="exempt">No GST on delivery charges</option>
              </select>
            </Field>
            {(form.tax.shippingTaxTreatment || 'product-rates') === 'fixed' && (
              <Field label="Delivery GST rate (%)"><input readOnly={!isEditing} type="number" min="0" max="100" step="0.01" className={inputClass} value={form.tax.shippingTaxRate ?? 18} onChange={(e) => update('tax', { shippingTaxRate: Number(e.target.value) })} /></Field>
            )}
          </div>
          <p className="mt-4 text-[9px] leading-4 text-slate-400">Use the configured 18% rate only when delivery is independently taxable at that rate. Select product rates for ancillary freight that follows the supplied goods, or no GST where delivery is not taxable.</p>
        </Section>

        <Section icon={Building2} title="Business details" description="Store information printed in the invoice header and footer.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal business name"><input readOnly={!isEditing} className={inputClass} value={form.business.legalName} onChange={(e) => update('business', { legalName: e.target.value })} /></Field>
            <Field label="Display name"><input readOnly={!isEditing} className={inputClass} value={form.business.displayName} onChange={(e) => update('business', { displayName: e.target.value })} /></Field>
            <Field label="Phone"><input readOnly={!isEditing} className={inputClass} value={form.business.phone} onChange={(e) => update('business', { phone: e.target.value })} /></Field>
            <Field label="Email"><input readOnly={!isEditing} type="email" className={inputClass} value={form.business.email} onChange={(e) => update('business', { email: e.target.value })} /></Field>
            <Field label="Website"><input readOnly={!isEditing} className={inputClass} value={form.business.website} onChange={(e) => update('business', { website: e.target.value })} /></Field>
            <Field label="PAN"><input readOnly={!isEditing} className={inputClass} value={form.business.pan} onChange={(e) => update('business', { pan: e.target.value.toUpperCase() })} /></Field>
            <div className="sm:col-span-2"><Field label="Business address"><textarea readOnly={!isEditing} className={`${inputClass} h-24 resize-none py-3`} value={form.business.address} onChange={(e) => update('business', { address: e.target.value })} /></Field></div>
          </div>
        </Section>
      </div>

      <Section icon={Hash} title="Automatic numbering" description="Order and invoice sequences are issued securely by the backend.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#f3f7f2] px-4 py-3"><p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Order ID format</p><strong className="mt-1 block font-mono text-xs text-[#397a4a]">PC-YYYY-000001</strong><p className="mt-1 text-[9px] text-slate-500">Resets each calendar year.</p></div>
          <div className="rounded-2xl bg-[#f3f7f2] px-4 py-3"><p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Invoice format</p><strong className="mt-1 block font-mono text-xs text-[#397a4a]">PC/YY-YY/000001</strong><p className="mt-1 text-[9px] text-slate-500">Resets each Indian financial year.</p></div>
        </div>
      </Section>
    </div>
  )
}
