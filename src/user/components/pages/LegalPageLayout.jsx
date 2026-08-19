import { ArrowLeft, FileText } from 'lucide-react'

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
    <main className="min-h-[75vh] bg-[#f7f8f5] text-slate-800">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-9">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-700 transition hover:border-[#ff5c35] hover:text-[#ff5c35]"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <header className="relative mt-4 isolate overflow-hidden rounded-[28px] bg-[#dcebdd] px-5 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
          <div className="absolute -right-24 -top-36 -z-10 size-96 rounded-full bg-[#9bcaa6]/40 blur-3xl" />
          <div className="absolute -bottom-36 left-1/3 -z-10 size-80 rounded-full bg-white/45 blur-3xl" />
          <span className="grid size-11 place-items-center rounded-2xl bg-white/75 text-[#397a4a] shadow-sm sm:size-12">
            <Icon size={22} />
          </span>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#397a4a] sm:text-xs">
            {eyebrow}
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-extrabold leading-tight tracking-[-0.05em] text-[#17211d] sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-[#526559] sm:text-base">
            {description}
          </p>
          {updatedAt && (
            <p className="mt-6 inline-flex rounded-full border border-[#397a4a]/15 bg-white/65 px-3 py-1.5 text-[10px] font-extrabold text-[#526559] backdrop-blur sm:text-xs">
              Last updated: {updatedAt}
            </p>
          )}
        </header>

        <div className="mt-6 grid items-start gap-6 lg:mt-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          <aside className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-28 lg:p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#ff5c35]">
              On this page
            </p>
            <nav
              aria-label={`${title} sections`}
              className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:grid lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pb-0"
            >
              {sectionLinks.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className="shrink-0 rounded-full bg-[#f4f7ef] px-3 py-2 text-left text-[10px] font-bold text-slate-600 transition hover:bg-[#e3eee1] hover:text-[#397a4a] lg:w-full lg:rounded-xl lg:px-3 lg:py-2.5"
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </aside>

          <article className="space-y-4 sm:space-y-5">
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
                  className="scroll-mt-28 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 hidden size-8 shrink-0 place-items-center rounded-xl bg-[#eef5ef] text-[10px] font-extrabold text-[#397a4a] sm:grid">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-extrabold tracking-[-0.025em] text-slate-950 sm:text-xl">
                        {getSectionLabel(titleText)}
                      </h2>
                      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 [&_a]:font-bold [&_a]:text-[#397a4a] [&_a]:underline-offset-4 [&_a:hover]:underline [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.72rem] [&_li]:before:size-1.5 [&_li]:before:rounded-full [&_li]:before:bg-[#9bcaa6] [&_strong]:font-extrabold [&_strong]:text-slate-800 [&_ul]:space-y-2">
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
