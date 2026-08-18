import { useState } from 'react'
import { Check, Image, Megaphone, Package, Sparkles, Zap } from 'lucide-react'
import { PageHeader } from '../components/ui/AdminUI'

const inputClass =
  'mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10'
const textareaClass = `${inputClass} h-24 resize-none py-3`

const copySettings = (settings) => JSON.parse(JSON.stringify(settings))

function Field({ label, children }) {
  return (
    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
      {label}
      {children}
    </label>
  )
}

function Toggle({ checked, onChange, label = 'Enabled' }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[10px] font-bold text-slate-600">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#397a4a]" />
      {label}
    </label>
  )
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="grid size-10 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]"><Icon size={18} /></span>
        <div><h3 className="text-sm font-extrabold text-slate-900">{title}</h3><p className="mt-0.5 text-[9px] text-slate-400">{description}</p></div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function OffersPage({ settings, products = [], onUpdate }) {
  const [form, setForm] = useState(() => copySettings(settings))
  const [saved, setSaved] = useState(false)

  const updateSection = (section, patch) =>
    setForm((current) => ({
      ...current,
      [section]: { ...current[section], ...patch },
    }))

  const save = () => {
    onUpdate(copySettings(form))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const productOptions = products.filter((product) => product.enabled !== false)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Merchandising"
        title="Offers & banners"
        description="Manage storefront banners, featured products, flash sales, deals, and category promotions without editing code."
        actions={<button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#ff5c35]">{saved ? <Check size={15} /> : <Sparkles size={15} />}{saved ? 'Saved' : 'Save changes'}</button>}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Section icon={Image} title="Home banner" description="Primary storefront hero content and image.">
          <div className="mb-4"><Toggle checked={form.homeBanner.enabled} onChange={(enabled) => updateSection('homeBanner', { enabled })} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow"><input className={inputClass} value={form.homeBanner.eyebrow} onChange={(e) => updateSection('homeBanner', { eyebrow: e.target.value })} /></Field>
            <Field label="Title"><input className={inputClass} value={form.homeBanner.title} onChange={(e) => updateSection('homeBanner', { title: e.target.value })} /></Field>
            <Field label="Accent text"><input className={inputClass} value={form.homeBanner.accent} onChange={(e) => updateSection('homeBanner', { accent: e.target.value })} /></Field>
            <Field label="Primary action"><input className={inputClass} value={form.homeBanner.primaryAction} onChange={(e) => updateSection('homeBanner', { primaryAction: e.target.value })} /></Field>
            <Field label="Secondary action"><input className={inputClass} value={form.homeBanner.secondaryAction} onChange={(e) => updateSection('homeBanner', { secondaryAction: e.target.value })} /></Field>
            <Field label="Product label"><input className={inputClass} value={form.homeBanner.productLabel} onChange={(e) => updateSection('homeBanner', { productLabel: e.target.value })} /></Field>
            <Field label="Product name"><input className={inputClass} value={form.homeBanner.productName} onChange={(e) => updateSection('homeBanner', { productName: e.target.value })} /></Field>
            <Field label="Product price"><input className={inputClass} value={form.homeBanner.productPrice} onChange={(e) => updateSection('homeBanner', { productPrice: e.target.value })} /></Field>
            <Field label="Discount label"><input className={inputClass} value={form.homeBanner.discountLabel} onChange={(e) => updateSection('homeBanner', { discountLabel: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Description"><textarea className={textareaClass} value={form.homeBanner.description} onChange={(e) => updateSection('homeBanner', { description: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Image URL"><input className={inputClass} value={form.homeBanner.image} onChange={(e) => updateSection('homeBanner', { image: e.target.value })} /></Field></div>
          </div>
        </Section>

        <Section icon={Megaphone} title="Promotional banner" description="Membership or campaign message below the catalog.">
          <div className="mb-4"><Toggle checked={form.promotionalBanner.enabled} onChange={(enabled) => updateSection('promotionalBanner', { enabled })} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow"><input className={inputClass} value={form.promotionalBanner.eyebrow} onChange={(e) => updateSection('promotionalBanner', { eyebrow: e.target.value })} /></Field>
            <Field label="Action label"><input className={inputClass} value={form.promotionalBanner.actionLabel} onChange={(e) => updateSection('promotionalBanner', { actionLabel: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Title"><input className={inputClass} value={form.promotionalBanner.title} onChange={(e) => updateSection('promotionalBanner', { title: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Description"><textarea className={textareaClass} value={form.promotionalBanner.description} onChange={(e) => updateSection('promotionalBanner', { description: e.target.value })} /></Field></div>
          </div>
        </Section>

        <Section icon={Package} title="Featured products" description="Select the products promoted by the recommended catalog order.">
          <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {productOptions.map((product) => {
              const selected = form.featuredProductIds.some((id) => String(id) === String(product.id))
              return <label key={product.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${selected ? 'border-[#75916f] bg-[#f4f8f4]' : 'border-slate-100 bg-[#fafbfa]'}`}><input type="checkbox" checked={selected} onChange={() => setForm((current) => ({ ...current, featuredProductIds: selected ? current.featuredProductIds.filter((id) => String(id) !== String(product.id)) : [...current.featuredProductIds, product.id] }))} className="size-4 accent-[#397a4a]" /><img src={product.image} alt="" className="size-10 rounded-xl object-cover" /><span className="min-w-0"><strong className="block truncate text-[10px] text-slate-800">{product.name}</strong><span className="text-[8px] text-slate-400">{product.category}</span></span></label>
            })}
          </div>
        </Section>

        <Section icon={Zap} title="Flash sale & deal" description="Configure the two promotional catalog panels.">
          {['flashSale', 'deal'].map((section) => (
            <div key={section} className="border-b border-slate-100 py-4 first:pt-0 last:border-0 last:pb-0">
              <div className="flex items-center justify-between"><strong className="text-xs text-slate-800">{section === 'flashSale' ? 'Flash sale' : 'Deal'}</strong><Toggle checked={form[section].enabled} onChange={(enabled) => updateSection(section, { enabled })} /></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Title"><input className={inputClass} value={form[section].title} onChange={(e) => updateSection(section, { title: e.target.value })} /></Field>
                <Field label="Product"><select className={inputClass} value={form[section].productId} onChange={(e) => updateSection(section, { productId: e.target.value })}>{productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field>
                <Field label="Eyebrow"><input className={inputClass} value={form[section].eyebrow} onChange={(e) => updateSection(section, { eyebrow: e.target.value })} /></Field>
                <Field label="Action label"><input className={inputClass} value={form[section].actionLabel} onChange={(e) => updateSection(section, { actionLabel: e.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Description"><textarea className={textareaClass} value={form[section].description} onChange={(e) => updateSection(section, { description: e.target.value })} /></Field></div>
                {section === 'flashSale' && <><Field label="Start date"><input type="date" className={inputClass} value={form.flashSale.startDate} onChange={(e) => updateSection('flashSale', { startDate: e.target.value })} /></Field><Field label="End date"><input type="date" className={inputClass} value={form.flashSale.endDate} onChange={(e) => updateSection('flashSale', { endDate: e.target.value })} /></Field></>}
              </div>
            </div>
          ))}
        </Section>
      </div>

      <Section icon={Sparkles} title="Category promotions" description="Control which category shortcuts appear and the label shown to customers.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {form.categoryPromotions.map((promotion, index) => (
            <div key={promotion.name} className="rounded-2xl border border-slate-100 bg-[#fafbfa] p-4">
              <div className="flex items-center justify-between"><strong className="text-[10px] text-slate-800">{promotion.name}</strong><Toggle checked={promotion.enabled} onChange={(enabled) => setForm((current) => ({ ...current, categoryPromotions: current.categoryPromotions.map((item, itemIndex) => itemIndex === index ? { ...item, enabled } : item) }))} /></div>
              <Field label="Display label"><input className={inputClass} value={promotion.label} onChange={(event) => setForm((current) => ({ ...current, categoryPromotions: current.categoryPromotions.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} /></Field>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
