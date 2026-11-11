import { useEffect, useRef, useState } from 'react'
import { Building2, Hash, MapPin, Pencil, ReceiptText, Save, X } from 'lucide-react'
import { PageHeader } from '../components/ui/AdminUI'
import { DELIVERY_GST_TREATMENTS } from '../../data/invoice'

const inputClass =
  'mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs text-black outline-none transition disabled:cursor-default disabled:text-black disabled:opacity-100/10'
const copySettings = (settings) => JSON.parse(JSON.stringify(settings))

function Field({ label, children }) {
  return <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{label}{children}</label>
}

function Section({ icon: Icon, title, description, children }) {
  return <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-10 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]"><Icon size={18} /></span><div><h3 className="text-sm font-extrabold text-slate-900">{title}</h3><p className="mt-0.5 text-[9px] text-slate-400">{description}</p></div></div><div className="mt-5">{children}</div></section>
}

const operationalAddressFor = (storeSettings, pickupSettings) =>
  String(storeSettings?.operationalAddress || pickupSettings?.address || '')

export default function TaxInvoicePage({
  settings,
  storeSettings = {},
  pickupSettings = {},
  loading = false,
  loadError = '',
  onUpdate,
}) {
  const [form, setForm] = useState(() => copySettings(settings))
  const [operationalAddress, setOperationalAddress] = useState(() =>
    operationalAddressFor(storeSettings, pickupSettings),
  )
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState({ tone: '', text: '' })
  const saveInFlight = useRef(false)

  useEffect(() => {
    if (!isEditing) {
      setForm(copySettings(settings))
      setOperationalAddress(operationalAddressFor(storeSettings, pickupSettings))
    }
  }, [isEditing, pickupSettings, settings, storeSettings])

  const update = (section, patch) => setForm((current) => ({ ...current, [section]: { ...current[section], ...patch } }))
  const save = async () => {
    if (saveInFlight.current) return
    saveInFlight.current = true
    setIsSaving(true)
    setSaveMessage({ tone: '', text: '' })
    try {
      await onUpdate({
        ...copySettings(form),
        tax: { ...form.tax, gstEnabled: true, pricesIncludeTax: false },
      }, operationalAddress)
      setIsEditing(false)
      setSaveMessage({ tone: 'success', text: 'Tax and business details saved successfully.' })
    } catch (error) {
      setSaveMessage({
        tone: 'error',
        text: error.message || 'Unable to save changes. Please try again.',
      })
    } finally {
      saveInFlight.current = false
      setIsSaving(false)
    }
  }
  const cancel = () => {
    setForm(copySettings(settings))
    setOperationalAddress(operationalAddressFor(storeSettings, pickupSettings))
    setIsEditing(false)
    setSaveMessage({ tone: '', text: '' })
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finance settings" title="Tax & invoice" description="Configure GST, business identity, and invoice numbering used for newly placed orders and customer PDFs." actions={isEditing ? <div className="flex items-center gap-2"><button type="button" onClick={cancel} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"><X size={15} /> Cancel</button><button type="button" onClick={save} disabled={isSaving} aria-busy={isSaving} className="inline-flex items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#ff5c35] disabled:cursor-wait disabled:opacity-60"><Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}</button></div> : <button type="button" onClick={() => { setSaveMessage({ tone: '', text: '' }); setIsEditing(true) }} disabled={loading || Boolean(loadError)} className="inline-flex items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#397a4a] disabled:cursor-wait disabled:opacity-60"><Pencil size={15} /> {loading ? 'Loading...' : 'Edit Details'}</button>} />

      {(loadError || saveMessage.text) && <p role="status" className={`text-[10px] font-bold ${loadError || saveMessage.tone === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{loadError || saveMessage.text}</p>}

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
                {DELIVERY_GST_TREATMENTS.map((treatment) => (
                  <option key={treatment.value} value={treatment.value}>{treatment.label}</option>
                ))}
              </select>
            </Field>
            {(form.tax.shippingTaxTreatment || 'product-rates') === 'fixed' && (
              <Field label="Delivery GST rate (%)"><input readOnly={!isEditing} type="number" min="0" max="100" step="0.01" className={inputClass} value={form.tax.shippingTaxRate ?? 18} onChange={(e) => update('tax', { shippingTaxRate: Number(e.target.value) })} /></Field>
            )}
          </div>
          <p className="mt-4 text-[9px] leading-4 text-slate-400">Use a fixed rate only when the verified delivery-tax treatment requires it. Select product rates for ancillary freight that follows the supplied goods, or no GST where delivery is not taxable.</p>
        </Section>

        <Section icon={Building2} title="Business details" description="Store information printed in the invoice header and footer.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registered trade name"><input readOnly={!isEditing} className={inputClass} value={form.business.legalName} onChange={(e) => update('business', { legalName: e.target.value })} /></Field>
            <Field label="Customer-facing brand"><input readOnly={!isEditing} className={inputClass} value={form.business.displayName} onChange={(e) => update('business', { displayName: e.target.value })} /></Field>
            <Field label="Proprietor"><input readOnly={!isEditing} className={inputClass} value={form.business.proprietor || ''} onChange={(e) => update('business', { proprietor: e.target.value })} /></Field>
            <Field label="Phone"><input readOnly={!isEditing} className={inputClass} value={form.business.phone} onChange={(e) => update('business', { phone: e.target.value })} /></Field>
            <Field label="Email"><input readOnly={!isEditing} type="email" className={inputClass} value={form.business.email} onChange={(e) => update('business', { email: e.target.value })} /></Field>
            <Field label="Website"><input readOnly={!isEditing} className={inputClass} value={form.business.website} onChange={(e) => update('business', { website: e.target.value })} /></Field>
            <Field label="PAN"><input readOnly={!isEditing} className={inputClass} value={form.business.pan} onChange={(e) => update('business', { pan: e.target.value.toUpperCase() })} /></Field>
            <div className="sm:col-span-2"><Field label="Registered supplier address (invoice only)"><textarea readOnly={!isEditing} className={`${inputClass} h-24 resize-none py-3`} value={form.business.address} onChange={(e) => update('business', { address: e.target.value })} /></Field><p className="mt-1 text-[9px] text-slate-400">Private invoice/KYC data. The public website uses the operational office address instead.</p></div>
          </div>
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section icon={MapPin} title="Operational & pickup location" description="Public contact and customer collection address; not printed as the registered invoice address.">
          <Field label="Operational and pickup address"><textarea readOnly={!isEditing} className={`${inputClass} h-24 resize-none py-3`} value={operationalAddress} onChange={(event) => setOperationalAddress(event.target.value)} /></Field>
        </Section>

        <Section icon={ReceiptText} title="Invoice supplier preview" description="Preview of the registered supplier identity used for newly created invoice snapshots.">
          <div className="rounded-2xl border border-slate-200 bg-[#fafbfa] p-4 text-xs leading-5 text-slate-600">
            <p className="text-base font-black text-slate-900">{form.business.displayName || 'Brand name'}</p>
            <p className="font-extrabold text-slate-800">{form.business.legalName || 'Registered trade name'}</p>
            <p>Proprietor: {form.business.proprietor || 'Not configured'}</p>
            <p className="mt-2 whitespace-pre-line">{form.business.address || 'Registered supplier address not configured'}</p>
            <p className="mt-2">Phone: {form.business.phone || 'Not configured'}</p>
            <p>Email: {form.business.email || 'Not configured'}</p>
            <p>GSTIN: {form.tax.gstin || 'Not configured'}</p>
            <p>PAN: {form.business.pan || 'Not configured'}</p>
          </div>
        </Section>
      </div>

      <Section icon={Hash} title="Automatic numbering" description="Order and invoice sequences are issued securely by the backend.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#f3f7f2] px-4 py-3"><p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Order ID format</p><strong className="mt-1 block font-mono text-xs text-[#397a4a]">PC-YYYY-000001</strong><p className="mt-1 text-[9px] text-slate-500">Resets each calendar year.</p></div>
          <div className="rounded-2xl bg-[#f3f7f2] px-4 py-3"><p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Invoice format</p><strong className="mt-1 block font-mono text-xs text-[#397a4a]">{[form.numbering.prefix, form.numbering.includeFinancialYear ? 'YY-YY' : '', String(Math.max(1, Number(form.numbering.nextNumber) || 1)).padStart(Math.max(1, Number(form.numbering.padding) || 1), '0'), form.numbering.suffix].filter(Boolean).join('/')}</strong><p className="mt-1 text-[9px] text-slate-500">Uses the existing sequence and financial-year settings.</p></div>
        </div>
      </Section>
    </div>
  )
}
