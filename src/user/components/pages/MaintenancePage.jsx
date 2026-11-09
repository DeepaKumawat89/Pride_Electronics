import { Clock3, RefreshCw, ShieldCheck, Wrench } from 'lucide-react'
import prideCircuitLogo from '../../../../images/Prism_Circuit_Tech_Logo-removebg-preview.png'

export default function MaintenancePage({ loading = false, error = '' }) {
  const unavailable = Boolean(error)

  const statusLabel = loading
    ? 'Checking store availability'
    : unavailable
      ? 'Store status unavailable'
      : 'We will be back shortly'

  const dotColor = unavailable && !loading ? 'bg-[#ff5c35]' : 'bg-[#397a4a]'

  return (
    <main className="customer-shell relative grid min-h-[100dvh] overflow-hidden bg-[#f4f7f2] px-4 py-6 sm:px-8 sm:py-10">
      {/* Background: soft glows + faint dotted grid */}
      <div className="pointer-events-none absolute -left-32 -top-36 size-[28rem] rounded-full bg-[#9bcaa6]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-36 size-[34rem] rounded-full bg-[#ff5c35]/10 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: 'radial-gradient(#17251c1a 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      <section className="relative mx-auto flex w-full max-w-5xl flex-col self-center overflow-hidden rounded-[32px] border border-white/80 bg-white/90 shadow-[0_30px_90px_rgba(23,37,28,0.12)] backdrop-blur-xl">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-10 lg:px-14">
          <img
            src={prideCircuitLogo}
            alt="Pride Circuit"
            className="h-auto max-h-14 w-auto max-w-[170px] object-contain sm:max-h-16 sm:max-w-[230px]"
          />
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#397a4a]/15 bg-[#e4f1e7] px-3.5 py-2 text-[11px] font-bold tracking-wide text-[#2f6a3f]">
            <ShieldCheck size={15} /> Secure maintenance
          </span>
        </header>

        {/* Body */}
        <div className="grid flex-1 items-stretch lg:grid-cols-[1.15fr_0.85fr]">
          {/* Copy */}
          <div className="flex flex-col justify-center px-6 py-12 text-center sm:px-10 sm:py-16 lg:px-14 lg:text-left">
            <span
              className="mx-auto inline-flex w-fit items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm lg:mx-0"
              role="status"
              aria-live="polite"
            >
              <span className="relative flex size-2.5">
                <span className={`absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping ${dotColor}`} />
                <span className={`relative inline-flex size-2.5 rounded-full ${dotColor}`} />
              </span>
              {statusLabel}
            </span>

            <h1 className="mt-6 text-balance text-[2rem] font-extrabold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.4rem]">
              {loading
                ? 'Preparing your experience.'
                : unavailable
                  ? 'We could not confirm the store status.'
                  : 'We are making Pride Circuit even better.'}
            </h1>

            <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-slate-500 sm:text-base lg:mx-0">
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
                className="group mt-8 inline-flex w-fit items-center gap-2 self-center rounded-full bg-[#253329] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#17251c]/20 transition hover:bg-[#397a4a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5c35] lg:self-start"
              >
                <RefreshCw size={16} className="transition-transform duration-500 group-hover:rotate-180" />
                Refresh status
              </button>
            )}
          </div>

          {/* Circuit visual */}
          <div
            className="relative isolate flex min-h-[260px] items-center justify-center overflow-hidden bg-[#17251c] lg:min-h-full"
            aria-hidden="true"
          >
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-[#397a4a]/40 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-[#ff5c35]/20 blur-3xl" />

            <svg
              viewBox="0 0 400 400"
              className="absolute inset-0 size-full object-cover"
              preserveAspectRatio="xMidYMid slice"
              fill="none"
            >
              <g stroke="#9bcaa6" strokeOpacity="0.28" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M200 200 H120 V120 H40" />
                <path d="M200 200 H280 V90 H360" />
                <path d="M200 200 V300 H110 V370" />
                <path d="M200 200 V320 H300 V390" />
                <path d="M200 200 H90 V270 H20" />
                <path d="M200 200 H330 V250 H390" />
                <path d="M200 200 V110 H150 V20" />
                <path d="M200 200 V70 H260 V10" />
              </g>
              <g fill="#17251c" stroke="#9bcaa6" strokeOpacity="0.55" strokeWidth="1.5">
                <circle cx="40" cy="120" r="4" />
                <circle cx="360" cy="90" r="4" />
                <circle cx="110" cy="370" r="4" />
                <circle cx="300" cy="390" r="4" />
                <circle cx="20" cy="270" r="4" />
                <circle cx="390" cy="250" r="4" />
                <circle cx="150" cy="20" r="4" />
                <circle cx="260" cy="10" r="4" />
              </g>
              <g fill="#ff5c35">
                <circle cx="120" cy="120" r="3" className="motion-safe:animate-pulse" />
                <circle cx="280" cy="90" r="3" className="motion-safe:animate-pulse" />
                <circle cx="110" cy="300" r="3" className="motion-safe:animate-pulse" />
              </g>
            </svg>

            {/* Center node */}
            <div className="relative grid place-items-center py-10">
              <span className="absolute size-40 rounded-full border border-[#9bcaa6]/20 motion-safe:animate-pulse" />
              <span className="absolute size-28 rounded-full border border-[#9bcaa6]/30" />
              <span className="relative grid size-24 place-items-center rounded-[30px] border border-white/10 bg-gradient-to-br from-[#2f4636] to-[#1d3024] text-white shadow-2xl shadow-black/40 ring-1 ring-white/10">
                {loading ? (
                  <RefreshCw className="animate-spin" size={34} />
                ) : unavailable ? (
                  <RefreshCw size={34} />
                ) : (
                  <Wrench size={34} />
                )}
                <span className="absolute -right-1.5 -top-1.5 size-4 rounded-full border-[3px] border-[#17251c] bg-[#ff5c35]" />
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-5 text-center text-xs font-semibold text-slate-400 sm:flex-row sm:px-10 sm:text-left lg:px-14">
          <span className="inline-flex items-center gap-2">
            <Clock3 size={14} className="text-[#397a4a]" /> Thank you for your patience
          </span>
          <span>Quality electronics. Thoughtfully delivered.</span>
        </footer>
      </section>
    </main>
  )
}
