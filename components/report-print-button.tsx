'use client'

export default function ReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-900"
    >
      Drucken / Als PDF speichern
    </button>
  )
}