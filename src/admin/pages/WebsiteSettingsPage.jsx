import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, Settings2, Wrench } from 'lucide-react'
import { PageHeader } from '../components/ui/AdminUI'

export default function WebsiteSettingsPage({
  maintenanceEnabled = false,
  maintenanceLoading = false,
  maintenanceError = '',
  onUpdateMaintenance,
}) {
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', text: '' })

  useEffect(() => {
    if (maintenanceError) {
      setFeedback({ tone: 'error', text: maintenanceError })
    }
  }, [maintenanceError])

  const toggleMaintenance = async () => {
    if (saving || maintenanceLoading || maintenanceError) return
    const nextEnabled = !maintenanceEnabled
    setSaving(true)
    setFeedback({ tone: '', text: '' })
    try {
      await onUpdateMaintenance(nextEnabled)
      setFeedback({
        tone: 'success',
        text: nextEnabled
          ? 'Maintenance Mode is enabled. Customer-facing pages are now hidden.'
          : 'Maintenance Mode is disabled. The storefront is available normally.',
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error?.message || 'Unable to update Maintenance Mode. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const statusLabel = maintenanceLoading
    ? 'Loading status'
    : maintenanceError
      ? 'Unavailable'
      : maintenanceEnabled
        ? 'Enabled'
        : 'Disabled'
  const statusTone = maintenanceError
    ? 'bg-red-50 text-red-700'
    : maintenanceEnabled
      ? 'bg-amber-50 text-amber-700'
      : 'bg-[#e4f1e7] text-[#397a4a]'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Website settings"
        title="Store availability"
        description="Control whether customers see the Pride Circuit storefront or the scheduled maintenance screen."
      />

      <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${statusTone}`}>
              {maintenanceLoading ? <LoaderCircle className="animate-spin" size={20} /> : maintenanceError ? <AlertCircle size={20} /> : <Wrench size={20} />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-950">Maintenance Mode</h3>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] ${statusTone}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
                When enabled, all customer-facing URLs show the branded maintenance screen. The admin panel remains available so an administrator can turn it off.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={maintenanceEnabled}
            aria-label="Toggle Maintenance Mode"
            aria-busy={saving}
            disabled={saving || maintenanceLoading || Boolean(maintenanceError)}
            onClick={toggleMaintenance}
            className={`relative inline-flex h-12 w-[94px] shrink-0 items-center rounded-full p-1.5 transition disabled:cursor-not-allowed disabled:opacity-55 ${maintenanceEnabled ? 'bg-[#ff5c35]' : 'bg-slate-200'}`}
          >
            <span className={`grid size-9 place-items-center rounded-full bg-white text-[9px] font-extrabold shadow-md transition-transform ${maintenanceEnabled ? 'translate-x-[46px] text-[#d84220]' : 'translate-x-0 text-slate-500'}`}>
              {saving ? <LoaderCircle className="animate-spin" size={15} /> : maintenanceEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div className="border-t border-slate-100 bg-[#f8faf7] px-5 py-4 sm:px-7">
          <div className="flex items-start gap-3">
            <Settings2 size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <p className="text-[10px] leading-5 text-slate-500">
              Stored in <code className="rounded bg-white px-1.5 py-1 font-mono text-[9px] text-slate-700">settings/maintenance</code> as the Boolean field <code className="rounded bg-white px-1.5 py-1 font-mono text-[9px] text-slate-700">enabled</code>.
            </p>
          </div>
        </div>
      </section>

      {feedback.text && (
        <div
          aria-live="polite"
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}
        >
          {feedback.tone === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  )
}
