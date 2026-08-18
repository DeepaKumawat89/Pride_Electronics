import { Inbox, X } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#ff5c35]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
          {description}
        </p>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, detail, tone = 'green' }) {
  const tones = {
    green: 'bg-[#e4f1e7] text-[#397a4a]',
    orange: 'bg-[#ffe9e2] text-[#d84220]',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <article className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
      <div className="flex items-center gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}
        >
          <Icon size={19} />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 truncate text-xl font-extrabold tracking-tight text-slate-950">
            {value}
          </p>
          {detail && (
            <p className="mt-1 text-[9px] font-semibold text-slate-400">
              {detail}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  maxWidth = 'max-w-3xl',
  inline = false,
}) {
  if (!open) return null
  if (inline) {
    return (
      <section className={`mx-auto w-full overflow-hidden rounded-[30px] bg-[#f7f8f5] ${maxWidth}`}>
        <header className="flex items-center justify-between border-b border-slate-200 bg-[#f7f8f5] px-5 py-4 sm:px-7">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-[#ff5c35]">{eyebrow}</p>
            <h3 className="mt-1 text-xl font-extrabold text-slate-950">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-slate-950 hover:text-white"><X size={17} /></button>
        </header>
        {children}
      </section>
    )
  }
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={`max-h-[94vh] w-full overflow-y-auto rounded-t-[30px] bg-[#f7f8f5] shadow-2xl sm:rounded-[30px] ${maxWidth}`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-[#f7f8f5]/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-[#ff5c35]">
              {eyebrow}
            </p>
            <h3 className="mt-1 text-xl font-extrabold text-slate-950">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-slate-950 hover:text-white"
          >
            <X size={17} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

export function EmptyState({
  title = 'Nothing to show',
  text = 'Try adjusting your search or filters.',
}) {
  return (
    <div className="rounded-[26px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]">
        <Inbox size={20} />
      </span>
      <h3 className="mt-4 text-sm font-extrabold text-slate-800">{title}</h3>
      <p className="mt-2 text-xs text-slate-500">{text}</p>
    </div>
  )
}
