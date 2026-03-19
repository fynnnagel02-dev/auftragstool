import { createClient } from '@/lib/supabase/server'

type Role = 'geschaeftsfuehrer' | 'admin' | 'vorarbeiter'

const roleContent: Record<
  Role,
  {
    label: string
    title: string
    subtitle: string
    focusTitle: string
    focusText: string
  }
> = {
  geschaeftsfuehrer: {
    label: 'Geschäftsführer',
    title: 'Steuerung, Transparenz und Auswertung in einer zentralen Oberfläche.',
    subtitle:
      'Das System verbindet operative Erfassung, kaufmännische Nachvollziehbarkeit und Management-Überblick in einem konsistenten Ablauf.',
    focusTitle: 'Ihr Fokus',
    focusText:
      'Sie erhalten einen strukturierten Überblick über Leistungen, Stundenverteilung, Reisekosten und den Reifegrad der Datenerfassung.',
  },
  admin: {
    label: 'Admin',
    title: 'Operative Pflege und kaufmännische Struktur in einem System.',
    subtitle:
      'Das System unterstützt die zentrale Pflege von Zeiten, Aufträgen, Reisekosten und Auswertungen in einem nachvollziehbaren Prozess.',
    focusTitle: 'Ihr Fokus',
    focusText:
      'Sie steuern die Datenqualität, pflegen Stammdaten, überwachen Vollständigkeit und stellen die saubere Grundlage für Exporte und KPIs sicher.',
  },
  vorarbeiter: {
    label: 'Vorarbeiter',
    title: 'Klare operative Erfassung ohne unnötige Komplexität.',
    subtitle:
      'Das System unterstützt die strukturierte Zuordnung von Arbeitszeiten auf Aufträge und LV-Positionen in einem einfachen, nachvollziehbaren Ablauf.',
    focusTitle: 'Ihr Fokus',
    focusText:
      'Sie konzentrieren sich auf die operative Erfassung und Zuordnung der Leistungen, während Auswertung und Verwaltung zentral weitergeführt werden.',
  },
}

const systemCards = [
  {
    eyebrow: 'Arbeitszeiten',
    title: 'Saubere Tagesdaten',
    text: 'Arbeitszeiten und Fehlzeiten werden zentral erfasst und bilden die verlässliche Grundlage für alle weiteren Prozesse.',
  },
  {
    eyebrow: 'Aufträge',
    title: 'Nachvollziehbare Verschreibung',
    text: 'Leistungen werden strukturiert auf Aufträge und LV-Positionen zugeordnet und bleiben dadurch jederzeit prüfbar.',
  },
  {
    eyebrow: 'Reisekosten',
    title: 'Erfassung bis Export',
    text: 'Reisekosten sind im selben System vorbereitet, erfassbar und als PDF oder Excel ausleitbar.',
  },
]

const workflowSteps = [
  {
    step: '01',
    title: 'Erfassen',
    text: 'Tageszeiten und Fehlzeiten werden strukturiert gepflegt.',
  },
  {
    step: '02',
    title: 'Zuordnen',
    text: 'Leistungen werden den passenden Aufträgen und LV-Positionen zugewiesen.',
  },
  {
    step: '03',
    title: 'Auswerten',
    text: 'Monitoring, KPIs und Exporte machen Fortschritt und Kosten transparent.',
  },
]

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: Role = 'admin'
  let fullName = 'Benutzer'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    if (profile?.full_name) {
      fullName = profile.full_name
    }

    if (
      profile?.role === 'geschaeftsfuehrer' ||
      profile?.role === 'admin' ||
      profile?.role === 'vorarbeiter'
    ) {
      role = profile.role
    }
  }

  const content = roleContent[role]

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[36px] border border-white/40 bg-white/60 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.10),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.08),transparent_34%)]" />

        <div className="relative grid gap-10 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">
              Willkommen
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              {content.title}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {content.subtitle}
            </p>

            <div className="mt-8 rounded-3xl border border-blue-100/80 bg-blue-50/70 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Angemeldet als</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {fullName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Rolle: {content.label}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/50 bg-white/75 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                {content.focusTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {content.focusText}
              </p>
            </div>

            <div className="rounded-3xl border border-blue-100/80 bg-blue-50/70 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Systemnutzen</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Alle zentralen Abläufe werden in einer konsistenten Struktur
                zusammengeführt — von der Erfassung bis zur Auswertung.
              </p>
            </div>

            <div className="rounded-3xl border border-white/50 bg-white/75 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Navigation</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Die für Ihre Rolle freigegebenen Bereiche finden Sie links in der
                Seitenleiste.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
            Kernbereiche
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">
            Die zentralen Funktionen des Systems.
          </h2>

          <div className="mt-6 grid gap-4">
            {systemCards.map((card) => (
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
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
            Systemablauf
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">
            So greifen die Prozesse ineinander.
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