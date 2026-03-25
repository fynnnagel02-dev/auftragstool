'use client'

import { useState } from 'react'
import AppModal from './app-modal'

type IncompleteDay = {
  employee_id: string
  employee_label: string
  date: string
  week_label: string
  reason: string
}

export default function CompletenessCheckModal({
  monthLabel,
  year,
  incompleteDays,
  disabled = false,
}: {
  monthLabel: string
  year: number
  incompleteDays: IncompleteDay[]
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Vollständigkeit prüfen
      </button>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="Vollständigkeit prüfen"
        subtitle={`Offene bzw. unvollständige Tage für ${monthLabel} ${year}`}
        maxWidthClassName="max-w-5xl"
        footer={
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Schließen
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm text-slate-600">
            Ein Tag gilt als <span className="font-semibold">vollständig</span>,
            wenn entweder eine Fehlzeit erfasst wurde oder eine Arbeitszeit
            vorhanden ist und diese vollständig auf Aufträge verschrieben wurde.
          </div>

          {incompleteDays.length === 0 ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-6 text-sm text-green-700">
              Für den gewählten Monat wurden keine offenen Tage gefunden.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-950">
                Gefundene offene Tage: <span className="font-semibold">{incompleteDays.length}</span>
              </div>

              <div className="max-h-[60vh] overflow-x-auto overflow-y-auto rounded-2xl border border-white/40 bg-white/70">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-white/40 bg-slate-50/95 text-slate-500 backdrop-blur">
                    <tr>
                      <th className="px-4 py-3 font-medium">Mitarbeiter</th>
                      <th className="px-4 py-3 font-medium">Datum</th>
                      <th className="px-4 py-3 font-medium">Kalenderwoche</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {incompleteDays.map((item, index) => (
                      <tr
                        key={`${item.employee_id}-${item.date}-${index}`}
                        className="border-b border-white/30 hover:bg-slate-50/40"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.employee_label}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.date}</td>
                        <td className="px-4 py-3 text-slate-700">{item.week_label}</td>
                        <td className="px-4 py-3 text-slate-700">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </AppModal>
    </>
  )
}