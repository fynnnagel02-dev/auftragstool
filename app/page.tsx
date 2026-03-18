import Link from 'next/link'

const primaryActions = [
  {
    title: 'Büro-Dashboard',
    description:
      'Arbeitszeiten erfassen, Vollständigkeit prüfen, Reisekosten exportieren und zentrale Steuerungsaufgaben übernehmen.',
    href: '/admin',
  },
  {
    title: 'Vorarbeiter-Dashboard',
    description:
      'Arbeitszeiten auf Aufträge und LV-Positionen zuordnen und operative Tagesdaten strukturiert pflegen.',
    href: '/foreman',
  },
]

const moduleCards = [
  {
    eyebrow: 'Operativ',
    title: 'Arbeitszeiten & Aufträge',
    text: 'Tageszeiten werden zentral gepflegt und anschließend fachlich auf Aufträge und LV-Positionen verschrieben.',
    href: '/datensammlung',
    linkLabel: 'Datensammlung öffnen',
  },
  {
    eyebrow: 'Reisekosten',
    title: 'Stammdaten, Erfassung und Export',
    text: 'Reisekosten können pro Mitarbeiter vorbereitet, monatlich erfasst und anschließend als PDF oder Excel exportiert werden.',
    href: '/travel-expenses',
    linkLabel: 'Reisekosten öffnen',
  },
  {
    eyebrow: 'Controlling',
    title: 'Monitoring & KPI Dashboard',
    text: 'Stunden, Fehlzeiten, interne vs. externe Leistung und Reisekosten werden übersichtlich ausgewertet.',
    href: '/kpi-dashboard',
    linkLabel: 'KPI Dashboard öffnen',
  },
]

const quickLinks = [
  {
    title: 'Mitarbeiter',
    href: '/employees',
  },
  {
    title: 'Aufträge',
    href: '/projects',
  },
  {
    title: 'Reisekosten Stammdaten',
    href: '/travel-master',
  },
  {
    title: 'Reisekosten Erfassung',
    href: '/travel-expenses',
  },
  {
    title: 'KPI Dashboard',
    href: '/kpi-dashboard',
  },
]

const workflowSteps = [
  {
    step: '01',
    title: 'Tagesdaten erfassen',
    text: 'Arbeitszeiten oder Fehlzeiten werden zentral und nachvollziehbar gepflegt.',
  },
  {
    step: '02',
    title: 'Aufträge verschreiben',
    text: 'Vorarbeiter ordnen die geleisteten Stunden sauber den passenden Aufträgen und LV-Positionen zu.',
  },
  {
    step: '03',
    title: 'Auswerten & exportieren',
    text: 'Monitoring, KPIs, Reisekosten und Reports schaffen Übersicht für Büro und Projektsteuerung.',
  },
]

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[36px] border border-white/40 bg-white/60 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.10),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.08),transparent_34%)]" />

        <div className="relative grid gap-10 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">
              Zentrales System
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Arbeitszeiten, Aufträge, Reisekosten und Controlling in einem
              System.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Dieses Tool verbindet operative Erfassung, kaufmännische
              Nachvollziehbarkeit und Auswertung in einer modernen Oberfläche
              für Büro, Vorarbeiter und Projektverantwortliche.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {primaryActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-2xl bg-blue-950 px-5 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900"
                >
                  {action.title}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 bg-white/75 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-slate-900"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/50 bg-white/75 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Fokus</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Operative Steuerung
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Zeiten, Auftragsverschreibung und Reisekosten werden nicht mehr
                getrennt gedacht, sondern in einem zusammenhängenden Prozess
                gepflegt.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-100/80 bg-blue-50/70 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Nutzen</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Transparenz & Nachvollziehbarkeit
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Vollständigkeit, Stundenverteilung, interne und externe Leistung
                sowie Reisekosten bleiben jederzeit sichtbar.
              </p>
            </div>

            <div className="rounded-3xl border border-white/50 bg-white/75 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Ausblick</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Skalierbar für Wachstum
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Die Struktur ist bereits so aufgebaut, dass Rollen, weitere
                Freigaben, Exporte und zusätzliche KPIs später sauber ergänzt
                werden können.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
            Kernmodule
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">
            Die wichtigsten Bereiche des Tools.
          </h2>

          <div className="mt-6 grid gap-4">
            {moduleCards.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-500">
                  {card.eyebrow}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {card.text}
                </p>
                <Link
                  href={card.href}
                  className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-white"
                >
                  {card.linkLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
            Workflow
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">
            So greift alles ineinander.
          </h2>

          <div className="mt-8 space-y-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step.step}
                className="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-sm font-semibold text-white shadow-sm">
                    {step.step}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {step.text}
                    </p>
                  </div>
                </div>

                {index < workflowSteps.length - 1 && (
                  <div className="ml-6 mt-4 h-6 w-px bg-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}