'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_25%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] text-slate-900">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/40 bg-white/70 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              Fehler
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">
              Die Seite konnte nicht geladen werden
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Es ist ein unerwarteter Fehler aufgetreten. Du kannst die Aktion
              erneut versuchen oder zur vorherigen Ansicht zurückkehren.
            </p>

            {error.digest && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Referenz: {error.digest}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-2xl bg-blue-950 px-5 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900"
              >
                Erneut versuchen
              </button>

              <button
                type="button"
                onClick={() => window.history.back()}
                className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-white"
              >
                Zurück
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
