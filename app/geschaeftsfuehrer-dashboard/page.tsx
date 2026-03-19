export default function GeschaeftsfuehrerDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/40 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
          Geschäftsführer
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Geschäftsführer Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Dieser Bereich ist vorbereitet und kann später um Management-Exporte,
          Freigaben und strategische Übersichten erweitert werden.
        </p>
      </section>

      <section className="rounded-[32px] border border-dashed border-slate-300 bg-white/50 p-8 backdrop-blur-xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Status
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">
          Bereich vorbereitet
        </h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Die Seite ist absichtlich noch leer und dient als Basis für spätere
          Geschäftsführer-Funktionen.
        </p>
      </section>
    </div>
  )
}