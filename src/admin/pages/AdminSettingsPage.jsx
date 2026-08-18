import { useState } from 'react'
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  KeyRound,
  Mail,
  Plus,
  ReceiptText,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { adminPermissionOptions } from '../../data/adminSettings'
import { PageHeader } from '../components/ui/AdminUI'

const inputClass =
  'mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10'
const copySettings = (settings) => JSON.parse(JSON.stringify(settings))
const createId = () => `role-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const sections = [
  ['store', 'Store Settings', Building2],
  ['profile', 'Admin Profile', UserRound],
  ['payment', 'Payment Settings', CreditCard],
  ['shipping-tax', 'Shipping & Tax', Truck],
  ['notifications', 'Notifications', Bell],
  ['email', 'Email Settings', Mail],
  ['security', 'Security', ShieldCheck],
  ['roles', 'Roles & Permissions', UsersRound],
]

function Field({ label, children, wide = false }) {
  return <label className={`block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 ${wide ? 'sm:col-span-2' : ''}`}>{label}{children}</label>
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-[#fafbfa] p-4">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 accent-[#397a4a]" />
      <span><strong className="block text-[10px] text-slate-800">{label}</strong>{description && <span className="mt-1 block text-[8px] leading-4 text-slate-400">{description}</span>}</span>
    </label>
  )
}

function SettingsSection({ icon: Icon, title, description, children }) {
  return <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-10 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]"><Icon size={18} /></span><div><h3 className="text-sm font-extrabold text-slate-900">{title}</h3><p className="mt-0.5 text-[9px] text-slate-400">{description}</p></div></div><div className="mt-5">{children}</div></section>
}

export default function AdminSettingsPage({
  settings,
  admin,
  shippingSettings,
  invoiceSettings,
  onUpdate,
  onUpdateAdmin,
  onChangePassword,
  onNavigate,
}) {
  const [activeSection, setActiveSection] = useState('store')
  const [form, setForm] = useState(() => copySettings(settings))
  const [profile, setProfile] = useState(() => ({
    name: admin.name,
    email: admin.email,
    role: admin.role,
  }))
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordMessage, setPasswordMessage] = useState({ tone: '', text: '' })
  const [saved, setSaved] = useState(false)

  const update = (section, patch) => setForm((current) => ({ ...current, [section]: { ...current[section], ...patch } }))
  const save = async () => {
    onUpdate(copySettings(form))
    await onUpdateAdmin(profile)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const changePassword = async () => {
    setPasswordMessage({ tone: '', text: '' })
    if (passwords.next !== passwords.confirm) {
      setPasswordMessage({ tone: 'error', text: 'New passwords do not match.' })
      return
    }
    if (
      form.security.requireStrongPasswords &&
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(passwords.next)
    ) {
      setPasswordMessage({
        tone: 'error',
        text: 'Use at least 8 characters with uppercase, lowercase, and a number.',
      })
      return
    }
    try {
      await onChangePassword(passwords.current, passwords.next)
      setPasswords({ current: '', next: '', confirm: '' })
      setPasswordMessage({ tone: 'success', text: 'Password updated successfully.' })
    } catch (error) {
      setPasswordMessage({ tone: 'error', text: error.message })
    }
  }

  const updateRole = (roleId, patch) => setForm((current) => ({
    ...current,
    roles: current.roles.map((role) => role.id === roleId ? { ...role, ...patch } : role),
  }))

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Settings" description="Manage store operations, administrator access, communications, and permissions from one place." actions={<button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#ff5c35]">{saved ? <Check size={15} /> : <Save size={15} />}{saved ? 'Saved' : 'Save changes'}</button>} />

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="h-fit rounded-[24px] border border-slate-100 bg-white p-2 shadow-sm lg:sticky lg:top-24" aria-label="Settings sections">
          {sections.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setActiveSection(id)} className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left text-[10px] font-extrabold transition ${activeSection === id ? 'bg-[#e4f1e7] text-[#397a4a]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><Icon size={15} /><span className="flex-1">{label}</span><ChevronRight size={13} /></button>)}
        </nav>

        <div>
          {activeSection === 'store' && <SettingsSection icon={Building2} title="Store settings" description="Core store identity and order preferences."><div className="grid gap-4 sm:grid-cols-2"><Field label="Store name"><input className={inputClass} value={form.store.name} onChange={(e) => update('store', { name: e.target.value })} /></Field><Field label="Support email"><input type="email" className={inputClass} value={form.store.supportEmail} onChange={(e) => update('store', { supportEmail: e.target.value })} /></Field><Field label="Support phone"><input className={inputClass} value={form.store.supportPhone} onChange={(e) => update('store', { supportPhone: e.target.value })} /></Field><Field label="Order prefix"><input maxLength="8" className={inputClass} value={form.store.orderPrefix} onChange={(e) => update('store', { orderPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} /></Field><Field label="Timezone"><select className={inputClass} value={form.store.timezone} onChange={(e) => update('store', { timezone: e.target.value })}><option value="Asia/Kolkata">Asia/Kolkata</option><option value="UTC">UTC</option></select></Field><Field label="Currency"><select className={inputClass} value={form.store.currency} onChange={(e) => update('store', { currency: e.target.value })}><option value="INR">INR — Indian Rupee</option></select></Field></div></SettingsSection>}

          {activeSection === 'profile' && <SettingsSection icon={UserRound} title="Admin profile" description="Information shown in the admin header and active session."><div className="grid gap-4 sm:grid-cols-2"><Field label="Display name"><input className={inputClass} value={profile.name} onChange={(e) => setProfile((current) => ({ ...current, name: e.target.value }))} /></Field><Field label="Email address"><input type="email" className={inputClass} value={profile.email} onChange={(e) => setProfile((current) => ({ ...current, email: e.target.value.toLowerCase() }))} /></Field><Field label="Assigned role"><input disabled className={`${inputClass} cursor-not-allowed text-slate-500`} value={profile.role} /><span className="mt-1.5 block text-[8px] normal-case tracking-normal text-slate-400">The active store administrator role is protected.</span></Field></div></SettingsSection>}

          {activeSection === 'payment' && <SettingsSection icon={CreditCard} title="Payment settings" description="Configure checkout availability and payment processing preferences."><div className="grid gap-3 sm:grid-cols-2"><Toggle label="Razorpay checkout" description="Allow customers to complete online payments." checked={form.payment.razorpayEnabled} onChange={(razorpayEnabled) => update('payment', { razorpayEnabled })} /><Toggle label="Test mode" description="Use the existing Razorpay test environment." checked={form.payment.testMode} onChange={(testMode) => update('payment', { testMode })} /><Toggle label="Automatic capture" description="Capture authorized online payments automatically." checked={form.payment.autoCapture} onChange={(autoCapture) => update('payment', { autoCapture })} /><Toggle label="Cash on delivery" description="Make COD available when supported by checkout." checked={form.payment.codEnabled} onChange={(codEnabled) => update('payment', { codEnabled })} /><Toggle label="Cards" checked={form.payment.cardsEnabled} onChange={(cardsEnabled) => update('payment', { cardsEnabled })} /><Toggle label="UPI" checked={form.payment.upiEnabled} onChange={(upiEnabled) => update('payment', { upiEnabled })} /><Toggle label="Net banking" checked={form.payment.netBankingEnabled} onChange={(netBankingEnabled) => update('payment', { netBankingEnabled })} /><Toggle label="Wallets" checked={form.payment.walletsEnabled} onChange={(walletsEnabled) => update('payment', { walletsEnabled })} /></div><div className="mt-4 max-w-xs"><Field label="Refund processing window (days)"><input type="number" min="1" className={inputClass} value={form.payment.refundWindowDays} onChange={(e) => update('payment', { refundWindowDays: Number(e.target.value) })} /></Field></div></SettingsSection>}

          {activeSection === 'shipping-tax' && <div className="grid gap-5 xl:grid-cols-2"><SettingsSection icon={Truck} title="Shipping settings" description="Charges, service areas, couriers, estimates, and pickup."><dl className="space-y-3 text-[10px]"><div className="flex justify-between"><dt className="text-slate-400">Standard charge</dt><dd className="font-bold text-slate-700">₹{shippingSettings.standardCharge}</dd></div><div className="flex justify-between"><dt className="text-slate-400">Free shipping</dt><dd className="font-bold text-slate-700">Above ₹{shippingSettings.freeShippingThreshold}</dd></div><div className="flex justify-between"><dt className="text-slate-400">Delivery areas</dt><dd className="font-bold text-slate-700">{shippingSettings.deliveryAreas.length}</dd></div></dl><button type="button" onClick={() => onNavigate('shipping')} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#253329] px-4 py-2.5 text-[9px] font-extrabold text-white">Manage shipping <ChevronRight size={13} /></button></SettingsSection><SettingsSection icon={ReceiptText} title="Tax settings" description="GST registration, rates, business details, and invoices."><dl className="space-y-3 text-[10px]"><div className="flex justify-between"><dt className="text-slate-400">GST</dt><dd className="font-bold text-slate-700">{invoiceSettings.tax.gstEnabled ? 'Enabled' : 'Disabled'}</dd></div><div className="flex justify-between"><dt className="text-slate-400">Default rate</dt><dd className="font-bold text-slate-700">{invoiceSettings.tax.defaultRate}%</dd></div><div className="flex justify-between"><dt className="text-slate-400">GSTIN</dt><dd className="font-bold text-slate-700">{invoiceSettings.tax.gstin || 'Not configured'}</dd></div></dl><button type="button" onClick={() => onNavigate('tax-invoice')} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#253329] px-4 py-2.5 text-[9px] font-extrabold text-white">Manage tax & invoice <ChevronRight size={13} /></button></SettingsSection></div>}

          {activeSection === 'notifications' && <SettingsSection icon={Bell} title="Notification settings" description="Choose which operational events display admin alerts."><div className="grid gap-3 sm:grid-cols-2"><Toggle label="New orders" checked={form.notifications.newOrders} onChange={(newOrders) => update('notifications', { newOrders })} /><Toggle label="Low stock" checked={form.notifications.lowStock} onChange={(lowStock) => update('notifications', { lowStock })} /><Toggle label="Failed payments" checked={form.notifications.failedPayments} onChange={(failedPayments) => update('notifications', { failedPayments })} /><Toggle label="Return requests" checked={form.notifications.returns} onChange={(returns) => update('notifications', { returns })} /><Toggle label="Browser alerts" checked={form.notifications.browserAlerts} onChange={(browserAlerts) => update('notifications', { browserAlerts })} /><Toggle label="Daily summary" checked={form.notifications.dailySummary} onChange={(dailySummary) => update('notifications', { dailySummary })} /></div></SettingsSection>}

          {activeSection === 'email' && <SettingsSection icon={Mail} title="Email settings" description="Sender identity, SMTP connection, and transactional email preferences."><div className="mb-4"><Toggle label="Transactional email enabled" checked={form.email.enabled} onChange={(enabled) => update('email', { enabled })} /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Provider"><select className={inputClass} value={form.email.provider} onChange={(e) => update('email', { provider: e.target.value })}><option>SMTP</option><option>SendGrid</option><option>Amazon SES</option></select></Field><Field label="From name"><input className={inputClass} value={form.email.fromName} onChange={(e) => update('email', { fromName: e.target.value })} /></Field><Field label="From email"><input type="email" className={inputClass} value={form.email.fromEmail} onChange={(e) => update('email', { fromEmail: e.target.value })} /></Field><Field label="Reply-to email"><input type="email" className={inputClass} value={form.email.replyTo} onChange={(e) => update('email', { replyTo: e.target.value })} /></Field><Field label="SMTP host"><input className={inputClass} value={form.email.smtpHost} onChange={(e) => update('email', { smtpHost: e.target.value })} /></Field><Field label="SMTP port"><input type="number" className={inputClass} value={form.email.smtpPort} onChange={(e) => update('email', { smtpPort: Number(e.target.value) })} /></Field><Field label="Encryption"><select className={inputClass} value={form.email.encryption} onChange={(e) => update('email', { encryption: e.target.value })}><option>TLS</option><option>SSL</option><option>None</option></select></Field><Field label="SMTP username"><input autoComplete="off" className={inputClass} value={form.email.username} onChange={(e) => update('email', { username: e.target.value })} /></Field><Field label="SMTP password"><input type="password" autoComplete="new-password" className={inputClass} value={form.email.password} onChange={(e) => update('email', { password: e.target.value })} /></Field></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Toggle label="Order confirmations" checked={form.email.orderConfirmation} onChange={(orderConfirmation) => update('email', { orderConfirmation })} /><Toggle label="Shipping updates" checked={form.email.shippingUpdates} onChange={(shippingUpdates) => update('email', { shippingUpdates })} /><Toggle label="Refund updates" checked={form.email.refundUpdates} onChange={(refundUpdates) => update('email', { refundUpdates })} /></div></SettingsSection>}

          {activeSection === 'security' && <div className="space-y-5"><SettingsSection icon={ShieldCheck} title="Security preferences" description="Session and login protection for the admin console."><div className="grid gap-4 sm:grid-cols-2"><Field label="Session timeout (minutes)"><input type="number" min="5" max="1440" className={inputClass} value={form.security.sessionTimeoutMinutes} onChange={(e) => update('security', { sessionTimeoutMinutes: Number(e.target.value) })} /></Field><div className="grid gap-3"><Toggle label="Login alerts" checked={form.security.loginAlerts} onChange={(loginAlerts) => update('security', { loginAlerts })} /><Toggle label="Require strong passwords" checked={form.security.requireStrongPasswords} onChange={(requireStrongPasswords) => update('security', { requireStrongPasswords })} /></div></div></SettingsSection><SettingsSection icon={KeyRound} title="Change password" description="Update the credentials used for future admin sign-ins."><div className="grid gap-4 sm:grid-cols-3"><Field label="Current password"><input type="password" autoComplete="current-password" className={inputClass} value={passwords.current} onChange={(e) => setPasswords((current) => ({ ...current, current: e.target.value }))} /></Field><Field label="New password"><input type="password" autoComplete="new-password" className={inputClass} value={passwords.next} onChange={(e) => setPasswords((current) => ({ ...current, next: e.target.value }))} /></Field><Field label="Confirm password"><input type="password" autoComplete="new-password" className={inputClass} value={passwords.confirm} onChange={(e) => setPasswords((current) => ({ ...current, confirm: e.target.value }))} /></Field></div>{passwordMessage.text && <p className={`mt-3 text-[9px] font-bold ${passwordMessage.tone === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>{passwordMessage.text}</p>}<button type="button" disabled={!passwords.current || !passwords.next || !passwords.confirm} onClick={changePassword} className="mt-4 rounded-full bg-[#253329] px-5 py-2.5 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">Update password</button></SettingsSection></div>}

          {activeSection === 'roles' && <SettingsSection icon={UsersRound} title="Roles & permissions" description="Define which admin areas each team role can access."><div className="space-y-4">{form.roles.map((role) => <article key={role.id} className="rounded-[22px] border border-slate-100 bg-[#fafbfa] p-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><input disabled={role.protected} value={role.name} onChange={(e) => updateRole(role.id, { name: e.target.value })} className="w-full bg-transparent text-xs font-extrabold text-slate-800 outline-none disabled:opacity-100" /><input value={role.description} onChange={(e) => updateRole(role.id, { description: e.target.value })} className="mt-1 w-full bg-transparent text-[9px] text-slate-400 outline-none" /></div>{!role.protected && <button type="button" onClick={() => setForm((current) => ({ ...current, roles: current.roles.filter((item) => item.id !== role.id) }))} className="grid size-8 place-items-center rounded-full bg-white text-red-500 shadow-sm" aria-label={`Delete ${role.name}`}><Trash2 size={13} /></button>}</div>{role.protected ? <p className="mt-3 inline-flex rounded-full bg-[#e4f1e7] px-3 py-1.5 text-[8px] font-extrabold text-[#397a4a]">Full access · Protected role</p> : <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{adminPermissionOptions.map((permission) => { const checked = role.permissions.includes(permission.id); return <label key={permission.id} className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-[9px] font-bold text-slate-600"><input type="checkbox" checked={checked} onChange={() => updateRole(role.id, { permissions: checked ? role.permissions.filter((id) => id !== permission.id) : [...role.permissions, permission.id] })} className="size-3.5 accent-[#397a4a]" />{permission.label}</label> })}</div>}</article>)}<button type="button" onClick={() => setForm((current) => ({ ...current, roles: [...current.roles, { id: createId(), name: 'New Role', description: 'Custom admin access.', permissions: ['dashboard'] }] }))} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-extrabold text-slate-600"><Plus size={14} /> Add role</button></div></SettingsSection>}
        </div>
      </div>
    </div>
  )
}
