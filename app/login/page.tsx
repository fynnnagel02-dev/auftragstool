import LoginForm from '@/components/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_25%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[36px] border border-white/40 bg-white/60 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.26em] text-slate-500">
              Auftragstool
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Arbeitszeiten, Aufträge, Reisekosten und Controlling in einem System.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Melde dich mit deinem Benutzerkonto an, um auf die für deine Rolle
              freigegebenen Bereiche zuzugreifen.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/40 bg-white/75 p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Büro</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  Steuerung & Vollständigkeit
                </p>
              </div>

              <div className="rounded-3xl border border-blue-100/80 bg-blue-50/70 p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Operativ</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  Vorarbeiter-Maske
                </p>
              </div>

              <div className="rounded-3xl border border-white/40 bg-white/75 p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Auswertung</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  KPI & Reporting
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[36px] border border-white/40 bg-white/70 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              Login
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">
              Willkommen zurück
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bitte melde dich mit deinem Benutzerkonto an.
            </p>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}