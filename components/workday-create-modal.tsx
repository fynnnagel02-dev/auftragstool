'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upsertEmployeeWorkday } from '@/app/admin/actions'
import { calculateWorkHours } from '@/lib/calculate-work-hours'
import ActionCard from './action-card'

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
}

const absenceOptions = [
  { value: 'urlaub', label: 'Urlaub' },
  { value: 'k1', label: 'K1' },
  { value: 'krank', label: 'Krank' },
  { value: 'nicht_angestellt', label: 'Nicht angestellt' },
  { value: 'arztbesuch', label: 'Arztbesuch' },
  { value: 'wochenende_feiertag', label: 'Wochenende / Feiertag' },
]

export default function WorkdayCreateModal({
  employees,
}: {
  employees: Employee[]
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'work' | 'absence'>('work')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const previewHours = useMemo(() => {
    if (mode !== 'work' || !startTime || !endTime) return null
    return calculateWorkHours(startTime, endTime)
  }, [mode, startTime, endTime])

  function handleSubmit(formData: FormData) {
    setError('')

    startTransition(async () => {
      try {
        await upsertEmployeeWorkday(formData)
        setOpen(false)
        setMode('work')
        setStartTime('')
        setEndTime('')
        router.refresh()
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Beim Speichern ist ein Fehler aufgetreten.')
        }
      }
    })
  }

  return (
    <>
      <div className="h-full">
        <ActionCard
          title="Tagesarbeitszeit erfassen"
          description="Arbeitszeiten oder Fehlzeiten für Mitarbeiter erfassen und berechnen."
          onClick={() => setOpen(true)}
        />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[28px] border border-white/40 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                  Büro
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Tagesarbeitszeit / Fehlzeit erfassen
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Erfasse für einen Mitarbeiter entweder Arbeitszeit oder eine Fehlzeit.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <form action={handleSubmit} className="mt-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Mitarbeiter *
                  </label>
                  <select
                    name="employeeId"
                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Mitarbeiter auswählen
                    </option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.employee_number} – {employee.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Datum *
                  </label>
                  <input
                    name="workDate"
                    type="date"
                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Modus *
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode('work')}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      mode === 'work'
                        ? 'border-blue-200 bg-blue-50 text-blue-950'
                        : 'border-slate-200 bg-white/70 text-slate-700'
                    }`}
                  >
                    Arbeitszeit
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('absence')}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      mode === 'absence'
                        ? 'border-blue-200 bg-blue-50 text-blue-950'
                        : 'border-slate-200 bg-white/70 text-slate-700'
                    }`}
                  >
                    Fehlzeit
                  </button>
                </div>

                <input type="hidden" name="mode" value={mode} />
              </div>

              {mode === 'work' && (
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Startzeit *
                    </label>
                    <input
                      name="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Endzeit *
                    </label>
                    <input
                      name="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              )}

              {mode === 'absence' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Fehlzeit *
                  </label>
                  <select
                    name="absenceType"
                    defaultValue=""
                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="" disabled>
                      Fehlzeit auswählen
                    </option>
                    {absenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Notiz
                </label>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="optional"
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {mode === 'work' && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-950">
                  Berechnete Arbeitszeit:{' '}
                  <span className="font-semibold">
                    {previewHours !== null ? `${previewHours} h` : '—'}
                  </span>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Abbrechen
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? 'Speichern...' : 'Eintrag speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}