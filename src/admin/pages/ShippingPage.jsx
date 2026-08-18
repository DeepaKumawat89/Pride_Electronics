import { useState } from 'react'
import { Check, MapPin, Plus, Save, Trash2, Truck } from 'lucide-react'
import { PageHeader } from '../components/ui/AdminUI'

const inputClass =
  'mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10'
const copySettings = (settings) => JSON.parse(JSON.stringify(settings))
const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

function Field({ label, children }) {
  return <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{label}{children}</label>
}

function Toggle({ checked, onChange, label = 'Enabled' }) {
  return <label className="flex cursor-pointer items-center gap-2 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#397a4a]" />{label}</label>
}

function Section({ icon: Icon, title, description, children }) {
  return <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-10 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]"><Icon size={18} /></span><div><h3 className="text-sm font-extrabold text-slate-900">{title}</h3><p className="mt-0.5 text-[9px] text-slate-400">{description}</p></div></div><div className="mt-5">{children}</div></section>
}

export default function ShippingPage({ settings, onUpdate }) {
  const [form, setForm] = useState(() => copySettings(settings))
  const [saved, setSaved] = useState(false)
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const save = () => {
    onUpdate(copySettings(form))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fulfillment" title="Shipping management" description="Manage charges, serviceable PIN codes, delivery estimates, couriers, tracking links, and pickup operations." actions={<button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#ff5c35]">{saved ? <Check size={15} /> : <Save size={15} />}{saved ? 'Saved' : 'Save changes'}</button>} />

      <div className="grid gap-5 xl:grid-cols-2">
        <Section icon={Truck} title="Charges & estimates" description="Customer-facing standard and express delivery rules.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Standard charge (₹)"><input type="number" min="0" className={inputClass} value={form.standardCharge} onChange={(e) => setValue('standardCharge', Number(e.target.value))} /></Field>
            <Field label="Free shipping threshold (₹)"><input type="number" min="0" className={inputClass} value={form.freeShippingThreshold} onChange={(e) => setValue('freeShippingThreshold', Number(e.target.value))} /></Field>
            <Field label="Express charge (₹)"><input type="number" min="0" className={inputClass} value={form.expressCharge} onChange={(e) => setValue('expressCharge', Number(e.target.value))} /></Field>
            <div />
            <Field label="Standard minimum days"><input type="number" min="1" className={inputClass} value={form.standardMinDays} onChange={(e) => setValue('standardMinDays', Number(e.target.value))} /></Field>
            <Field label="Standard maximum days"><input type="number" min="1" className={inputClass} value={form.standardMaxDays} onChange={(e) => setValue('standardMaxDays', Number(e.target.value))} /></Field>
            <Field label="Express minimum days"><input type="number" min="1" className={inputClass} value={form.expressMinDays} onChange={(e) => setValue('expressMinDays', Number(e.target.value))} /></Field>
            <Field label="Express maximum days"><input type="number" min="1" className={inputClass} value={form.expressMaxDays} onChange={(e) => setValue('expressMaxDays', Number(e.target.value))} /></Field>
          </div>
        </Section>

        <Section icon={MapPin} title="Pickup" description="Configure return and fulfillment pickup availability.">
          <Toggle checked={form.pickup.enabled} onChange={(enabled) => setForm((current) => ({ ...current, pickup: { ...current.pickup, enabled } }))} label="Pickup service enabled" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Processing hours"><input type="number" min="1" className={inputClass} value={form.pickup.processingHours} onChange={(e) => setForm((current) => ({ ...current, pickup: { ...current.pickup, processingHours: Number(e.target.value) } }))} /></Field>
            <div className="sm:col-span-2"><Field label="Pickup / fulfillment address"><textarea className={`${inputClass} h-24 resize-none py-3`} value={form.pickup.address} onChange={(e) => setForm((current) => ({ ...current, pickup: { ...current.pickup, address: e.target.value } }))} /></Field></div>
          </div>
        </Section>
      </div>

      <Section icon={MapPin} title="Delivery areas & PIN availability" description="A PIN is serviceable when it starts with an enabled prefix below.">
        <div className="space-y-3">
          {form.deliveryAreas.map((area, index) => (
            <div key={area.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-[#fafbfa] p-4 md:grid-cols-[1fr_1.5fr_130px_auto] md:items-end">
              <Field label="Area name"><input className={inputClass} value={area.name} onChange={(e) => setForm((current) => ({ ...current, deliveryAreas: current.deliveryAreas.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item) }))} /></Field>
              <Field label="PIN prefixes (comma separated)"><input className={inputClass} value={area.pinPrefixes.join(', ')} onChange={(e) => setForm((current) => ({ ...current, deliveryAreas: current.deliveryAreas.map((item, itemIndex) => itemIndex === index ? { ...item, pinPrefixes: e.target.value.split(',').map((value) => value.trim()).filter(Boolean) } : item) }))} /></Field>
              <Field label="Lead days"><input type="number" min="1" className={inputClass} value={area.leadDays} onChange={(e) => setForm((current) => ({ ...current, deliveryAreas: current.deliveryAreas.map((item, itemIndex) => itemIndex === index ? { ...item, leadDays: Number(e.target.value) } : item) }))} /></Field>
              <div className="flex h-11 items-center gap-3"><Toggle checked={area.enabled} onChange={(enabled) => setForm((current) => ({ ...current, deliveryAreas: current.deliveryAreas.map((item, itemIndex) => itemIndex === index ? { ...item, enabled } : item) }))} /><button type="button" onClick={() => setForm((current) => ({ ...current, deliveryAreas: current.deliveryAreas.filter((item) => item.id !== area.id) }))} className="grid size-9 place-items-center rounded-full bg-white text-red-500 shadow-sm" aria-label={`Remove ${area.name}`}><Trash2 size={14} /></button></div>
            </div>
          ))}
          <button type="button" onClick={() => setForm((current) => ({ ...current, deliveryAreas: [...current.deliveryAreas, { id: createId('area'), name: 'New delivery area', pinPrefixes: [], leadDays: current.standardMinDays, enabled: true }] }))} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-extrabold text-slate-600"><Plus size={14} /> Add delivery area</button>
        </div>
      </Section>

      <Section icon={Truck} title="Courier integration & tracking" description="Assign enabled courier partners while shipping orders and store their tracking URL.">
        <div className="space-y-3">
          {form.couriers.map((courier, index) => (
            <div key={courier.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-[#fafbfa] p-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <Field label="Courier name"><input className={inputClass} value={courier.name} onChange={(e) => setForm((current) => ({ ...current, couriers: current.couriers.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item) }))} /></Field>
              <Field label="Tracking URL"><input type="url" className={inputClass} value={courier.trackingUrl} onChange={(e) => setForm((current) => ({ ...current, couriers: current.couriers.map((item, itemIndex) => itemIndex === index ? { ...item, trackingUrl: e.target.value } : item) }))} /></Field>
              <div className="flex h-11 items-center gap-3"><Toggle checked={courier.enabled} onChange={(enabled) => setForm((current) => ({ ...current, couriers: current.couriers.map((item, itemIndex) => itemIndex === index ? { ...item, enabled } : item) }))} /><Toggle checked={courier.pickupEnabled} onChange={(pickupEnabled) => setForm((current) => ({ ...current, couriers: current.couriers.map((item, itemIndex) => itemIndex === index ? { ...item, pickupEnabled } : item) }))} label="Pickup" /><button type="button" onClick={() => setForm((current) => ({ ...current, couriers: current.couriers.filter((item) => item.id !== courier.id) }))} className="grid size-9 place-items-center rounded-full bg-white text-red-500 shadow-sm" aria-label={`Remove ${courier.name}`}><Trash2 size={14} /></button></div>
            </div>
          ))}
          <button type="button" onClick={() => setForm((current) => ({ ...current, couriers: [...current.couriers, { id: createId('courier'), name: 'New courier', trackingUrl: '', enabled: true, pickupEnabled: true }] }))} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-extrabold text-slate-600"><Plus size={14} /> Add courier</button>
        </div>
      </Section>
    </div>
  )
}
