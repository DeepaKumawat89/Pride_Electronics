import { Clock3, RefreshCw, ShieldCheck, Wrench } from 'lucide-react'
import prideCircuitLogo from '../../../../images/Prism_Circuit_Tech_Logo-removebg-preview.png'

export default function MaintenancePage({ loading = false, error = '' }) {
  const unavailable = Boolean(error)

  return (
    <main className="customer-shell relative grid min-h-[100dvh] overflow-hidden bg-[#f4f7f2] px-5 py-8 sm:px-8">
      <div className="pointer-events-none absolute -left-32 -top-36 size-[28rem] rounded-full bg-[#9bcaa6]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-36 size-[34rem] rounded-full bg-[#ff5c35]/10 blur-3xl" />

      <section className="relative mx-auto flex w-full max-w-5xl flex-col justify-between rounded-[32px] border border-white/80 bg-white/85 p-6 shadow-[0_30px_90px_rgba(23,37,28,0.12)] backdrop-blur-xl sm:p-10 lg:p-14">
        <header className="flex items-center justify-between gap-5 border-b border-slate-100 pb-6">
          <img
            src={prideCircuitLogo}
            alt="Pride Circuit"
            className="h-auto max-h-16 w-auto max-w-[190px] object-contain sm:max-w-[230px]"
          />
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e4f1e7] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#397a4a]">
            <ShieldCheck size={15} /> Secure maintenance
          </span>
        </header>

        <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center py-14 text-center sm:py-20">
          <span className="grid size-20 place-items-center rounded-[26px] bg-[#17251c] text-white shadow-xl shadow-[#17251c]/20">
            {loading ? (
              <RefreshCw className="animate-spin" size={32} />
            ) : unavailable ? (
              <RefreshCw size={32} />
            ) : (
              <Wrench size={32} />
            )}
          </span>

          <p className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#ff5c35]">
            {loading ? 'Checking store availability' : unavailable ? 'Store status unavailable' : 'We will be back shortly'}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-5xl">
            {loading
              ? 'Preparing your experience.'
              : unavailable
                ? 'We could not confirm the store status.'
                : 'We are making Pride Circuit even better.'}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
            {loading
              ? 'Please wait a moment while we connect securely.'
              : unavailable
                ? 'Please check your connection and refresh the page to try again.'
                : "We're currently performing scheduled maintenance. We'll be back shortly."}
          </p>

          {unavailable && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#253329] px-6 py-3 text-xs font-extrabold text-white transition hover:bg-[#397a4a]"
            >
              <RefreshCw size={16} /> Refresh status
            </button>
          )}
        </div>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-center text-[10px] font-semibold text-slate-400 sm:flex-row sm:text-left">
          <span className="inline-flex items-center gap-2">
            <Clock3 size={14} className="text-[#397a4a]" /> Thank you for your patience
          </span>
          <span>Quality electronics. Thoughtfully delivered.</span>
        </footer>
      </section>
    </main>
  )
}
