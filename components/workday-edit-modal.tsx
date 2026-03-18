'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  deleteEmployeeWorkday,
  updateEmployeeWorkday,
} from '@/app/admin/actions'
import { calculateWorkHours } from '@/lib/calculate-work-hours'
import AppModal from './app-modal'

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
}

type Workday = {
  id: string
  employee_id: string
  work_date: string
  start_time: string | null
  end_time: string | null
  calculated_hours: number | null
  absence_type: string | null
  note: string | null
}

const absenceOptions = [
  { value: 'urlaub', label: 'Urlaub' },
  { value: 'k1', label: 'K1' },
  { value: 'krank', label: 'Krank' },
  { value: 'nicht_angestellt', label: 'Nicht angestellt' },
  { value: 'arztbesuch', label: 'Arztbesuch' },
  { value: 'wochenende_feiertag', label: 'Wochenende / Feiertag' },
]

export default function WorkdayEditModal({
  workday,
  employees,
}: {
  workday: Workday
  employees: Employee[]
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [mode, setMode] = useState<'work' | 'absence'>(
    workday.absence_type ? 'absence' : 'work'
  )
  const [startTime, setStartTime] = useState(workday.start_time ?? '')
  const [endTime, setEndTime] = useState(workday.end_time ?? '')
  const router = useRouter()

  const previewHours = useMemo(() => {
    if (mode !== 'work' || !startTime || !endTime) return null
    return calculateWorkHours(startTime, endTime)
  }, [mode, startTime, endTime])

  function handleSubmit(formData: FormData) {
    setError('')

    startTransition(async () => {
      try {
        await updateEmployeeWorkday(workday.id, formData)
        setOpen(false)
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

  function handleDelete() {
    const confirmed = window.confirm(
      'Möchtest du diesen Tagesdatensatz wirklich löschen?'
    )

    if (!confirmed) return

    setError('')

    startDeleteTransition(async () => {
      try {
        await deleteEmployeeWorkday(workday.id)
        setOpen(false)
        router.refresh()
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Beim Löschen ist ein Fehler aufgetreten.')
        }
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-medium text-blue-950 transition hover:bg-blue-100/80"
      >
        Bearbeiten
      </button>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="Tagesdatensatz bearbeiten"
        subtitle="Hier kannst du Arbeitszeit und Fehlzeit gegenseitig umstellen und den Datensatz löschen."
        maxWidthClassName="max-w-3xl"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Löschen...' : 'Datensatz löschen'}
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Abbrechen
              </button>

              <button
                type="submit"
                form={`workday-edit-form-${workday.id}`}
                disabled={isPending || isDeleting}
                className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Speichern...' : 'Änderungen speichern'}
              </button>
            </div>
          </div>
        }
      >
        <form
          id={`workday-edit-form-${workday.id}`}
          action={handleSubmit}
          className="space-y-5"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mitarbeiter *
              </label>
              <select
                name="employeeId"
                defaultValue={workday.employee_id}
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
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
                defaultValue={workday.work_date}
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
                defaultValue={workday.absence_type ?? ''}
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
              rows={4}
              defaultValue={workday.note ?? ''}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
        </form>
      </AppModal>
    </>
  )
}