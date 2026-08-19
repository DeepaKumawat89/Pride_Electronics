import { ArrowLeft, ChevronDown, FileText } from 'lucide-react'

function getSectionId(title, index) {
  const slug = title
    .replace(/^\d+\.\s*/, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `legal-section-${slug || index + 1}`
}

const getSectionLabel = (title) => title.replace(/^\d+\.\s*/, '')

export default function LegalPageLayout({
  title,
  description,
  updatedAt,
  sections,
  onBack,
  icon: Icon = FileText,
  eyebrow = 'Pride Electronics',
}) {
  const sectionLinks = sections.map((section, index) => ({
    title: getSectionLabel(
      Array.isArray(section) ? section[0] : section.title,
    ),
    id: getSectionId(
      Array.isArray(section) ? section[0] : section.title,
      index,
    ),
  }))

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <main className="min-h-[75vh] overflow-x-hidden bg-[#f7f8f5] text-slate-800">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-9">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-700 transition hover:border-[#ff5c35] hover:text-[#ff5c35]"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <header className="relative mt-4 isolate overflow-hidden rounded-[24px] bg-[#dcebdd] px-5 py-7 sm:rounded-[28px] sm:px-8 sm:py-9 md:px-10 lg:px-12 lg:py-11">
          <div className="absolute -right-32 -top-44 -z-10 size-96 rounded-full bg-[#9bcaa6]/40 blur-3xl sm:-right-20" />
          <div className="absolute -bottom-40 left-1/4 -z-10 size-80 rounded-full bg-white/45 blur-3xl" />
          <div className="relative max-w-4xl">
            <span className="grid size-10 place-items-center rounded-2xl bg-white/75 text-[#397a4a] shadow-sm sm:size-12">
              <Icon size={21} />
            </span>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#397a4a] sm:mt-5 sm:text-xs">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-[2rem] font-extrabold leading-[1.08] tracking-[-0.05em] text-[#17211d] sm:text-4xl md:text-[2.75rem] lg:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#526559] sm:mt-4 sm:text-base sm:leading-7">
              {description}
            </p>
            {updatedAt && (
              <p className="mt-5 inline-flex rounded-full border border-[#397a4a]/15 bg-white/65 px-3 py-1.5 text-[10px] font-extrabold text-[#526559] backdrop-blur sm:mt-6 sm:text-xs">
                Last updated: {updatedAt}
              </p>
            )}
          </div>
        </header>

        <div className="mt-5 lg:hidden">
          <label
            htmlFor="legal-section-selector"
            className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#ff5c35]"
          >
            On this page
          </label>
          <div className="relative mt-2">
            <select
              id="legal-section-selector"
              defaultValue=""
              onChange={(event) => {
                scrollToSection(event.target.value)
                event.target.value = ''
              }}
              className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-11 text-sm font-bold text-slate-700 outline-none transition focus:border-[#397a4a] focus:ring-4 focus:ring-[#397a4a]/10"
            >
              <option value="" disabled>
                Jump to a section
              </option>
              {sectionLinks.map((section) => (
                <option
                  key={section.id}
                  value={section.id}
                >
                  {section.title}
                </option>
              ))}
            </select>
            <ChevronDown
              size={17}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        <div className="mt-5 grid items-start gap-7 sm:mt-6 lg:mt-9 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="sticky top-28 hidden lg:block">
            <p className="border-b border-slate-200 pb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#ff5c35]">
              On this page
            </p>
            <nav
              aria-label={`${title} sections`}
              className="mt-2 grid max-h-[calc(100vh-11rem)] gap-0.5 overflow-y-auto pr-2"
            >
              {sectionLinks.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className="group flex w-full items-start gap-2.5 rounded-xl px-2 py-2.5 text-left text-[11px] font-bold leading-4 text-slate-500 transition hover:bg-white hover:text-[#397a4a]"
                >
                  <span className="mt-px text-[9px] font-extrabold text-slate-300 group-hover:text-[#ff5c35]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>
          </aside>

          <article className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm sm:rounded-[26px]">
            {sections.map((section, index) => {
              const titleText = Array.isArray(section)
                ? section[0]
                : section.title
              const content = Array.isArray(section)
                ? section[1]
                : section.content
              const id = getSectionId(titleText, index)

              return (
                <section
                  key={titleText}
                  id={id}
                  className="scroll-mt-28 border-b border-slate-100 px-5 py-6 last:border-b-0 sm:px-7 sm:py-8 md:px-9 lg:px-10 lg:py-9"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[#eef5ef] text-[9px] font-extrabold text-[#397a4a] sm:size-8 sm:rounded-xl sm:text-[10px]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-extrabold tracking-[-0.025em] text-slate-950 sm:text-xl">
                        {getSectionLabel(titleText)}
                      </h2>
                      <div className="mt-3 break-words space-y-3 text-[13px] leading-6 text-slate-600 sm:mt-4 sm:text-sm sm:leading-7 [&_a]:break-all [&_a]:font-bold [&_a]:text-[#397a4a] [&_a]:underline-offset-4 [&_a:hover]:underline [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.62rem] [&_li]:before:size-1.5 [&_li]:before:rounded-full [&_li]:before:bg-[#9bcaa6] sm:[&_li]:before:top-[0.72rem] [&_strong]:font-extrabold [&_strong]:text-slate-800 [&_ul]:space-y-2">
                        {content}
                      </div>
                    </div>
                  </div>
                </section>
              )
            })}
          </article>
        </div>
      </div>
    </main>
  )
}
