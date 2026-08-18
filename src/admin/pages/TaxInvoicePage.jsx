import { useState } from 'react'
import { Building2, Check, Hash, ReceiptText, Save } from 'lucide-react'
import { createInvoiceNumber } from '../../data/invoice'
import { PageHeader } from '../components/ui/AdminUI'

const inputClass =
  'mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10'
const copySettings = (settings) => JSON.parse(JSON.stringify(settings))

function Field({ label, children }) {
  return <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{label}{children}</label>
}

function Toggle({ checked, onChange, label }) {
  return <label className="flex cursor-pointer items-center gap-2 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#397a4a]" />{label}</label>
}

function Section({ icon: Icon, title, description, children }) {
  return <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-10 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]"><Icon size={18} /></span><div><h3 className="text-sm font-extrabold text-slate-900">{title}</h3><p className="mt-0.5 text-[9px] text-slate-400">{description}</p></div></div><div className="mt-5">{children}</div></section>
}

export default function TaxInvoicePage({ settings, onUpdate }) {
  const [form, setForm] = useState(() => copySettings(settings))
  const [saved, setSaved] = useState(false)
  const update = (section, patch) => setForm((current) => ({ ...current, [section]: { ...current[section], ...patch } }))
  const save = () => {
    onUpdate(copySettings(form))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finance settings" title="Tax & invoice" description="Configure GST, business identity, and invoice numbering used for newly placed orders and customer PDFs." actions={<button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#ff5c35]">{saved ? <Check size={15} /> : <Save size={15} />}{saved ? 'Saved' : 'Save changes'}</button>} />

      <div className="grid gap-5 xl:grid-cols-2">
        <Section icon={ReceiptText} title="Tax configuration" description="GST calculation and registration information.">
          <div className="flex flex-wrap gap-5"><Toggle label="GST enabled" checked={form.tax.gstEnabled} onChange={(gstEnabled) => update('tax', { gstEnabled })} /><Toggle label="Prices include GST" checked={form.tax.pricesIncludeTax} onChange={(pricesIncludeTax) => update('tax', { pricesIncludeTax })} /></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN"><input className={inputClass} value={form.tax.gstin} onChange={(e) => update('tax', { gstin: e.target.value.toUpperCase() })} /></Field>
            <Field label="Default GST rate (%)"><input type="number" min="0" max="100" step="0.01" className={inputClass} value={form.tax.defaultRate} onChange={(e) => update('tax', { defaultRate: Number(e.target.value) })} /></Field>
            <Field label="Registration type"><select className={inputClass} value={form.tax.registrationType} onChange={(e) => update('tax', { registrationType: e.target.value })}><option>Regular</option><option>Composition</option><option>Unregistered</option></select></Field>
            <Field label="State"><input className={inputClass} value={form.tax.state} onChange={(e) => update('tax', { state: e.target.value })} /></Field>
            <Field label="State code"><input maxLength="2" className={inputClass} value={form.tax.stateCode} onChange={(e) => update('tax', { stateCode: e.target.value.replace(/\D/g, '').slice(0, 2) })} /></Field>
          </div>
        </Section>

        <Section icon={Building2} title="Business details" description="Store information printed in the invoice header and footer.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal business name"><input className={inputClass} value={form.business.legalName} onChange={(e) => update('business', { legalName: e.target.value })} /></Field>
            <Field label="Display name"><input className={inputClass} value={form.business.displayName} onChange={(e) => update('business', { displayName: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputClass} value={form.business.phone} onChange={(e) => update('business', { phone: e.target.value })} /></Field>
            <Field label="Email"><input type="email" className={inputClass} value={form.business.email} onChange={(e) => update('business', { email: e.target.value })} /></Field>
            <Field label="Website"><input className={inputClass} value={form.business.website} onChange={(e) => update('business', { website: e.target.value })} /></Field>
            <Field label="PAN"><input className={inputClass} value={form.business.pan} onChange={(e) => update('business', { pan: e.target.value.toUpperCase() })} /></Field>
            <div className="sm:col-span-2"><Field label="Business address"><textarea className={`${inputClass} h-24 resize-none py-3`} value={form.business.address} onChange={(e) => update('business', { address: e.target.value })} /></Field></div>
          </div>
        </Section>
      </div>

      <Section icon={Hash} title="Invoice numbering" description="The sequence advances automatically after each newly placed order.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Prefix"><input className={inputClass} value={form.numbering.prefix} onChange={(e) => update('numbering', { prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} /></Field>
          <Field label="Next number"><input type="number" min="1" className={inputClass} value={form.numbering.nextNumber} onChange={(e) => update('numbering', { nextNumber: Number(e.target.value) })} /></Field>
          <Field label="Number padding"><input type="number" min="1" max="12" className={inputClass} value={form.numbering.padding} onChange={(e) => update('numbering', { padding: Number(e.target.value) })} /></Field>
          <Field label="Suffix"><input className={inputClass} value={form.numbering.suffix} onChange={(e) => update('numbering', { suffix: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} /></Field>
          <div className="flex items-end pb-3"><Toggle label="Include financial year" checked={form.numbering.includeFinancialYear} onChange={(includeFinancialYear) => update('numbering', { includeFinancialYear })} /></div>
        </div>
        <div className="mt-5 rounded-2xl bg-[#f3f7f2] px-4 py-3"><p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Next invoice preview</p><strong className="mt-1 block font-mono text-xs text-[#397a4a]">{createInvoiceNumber(form)}</strong></div>
      </Section>
    </div>
  )
}
