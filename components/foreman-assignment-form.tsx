'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveForemanAssignments } from '@/app/foreman/actions'

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
}

type FilterGroup = {
  id: string
  name: string
}

type Project = {
  id: string
  project_number: string | null
  name: string
}

type LvPosition = {
  id: string
  project_id: string
  order_position: string
  lv_position: string
  lv_description: string
  is_active: boolean
}

type Workday = {
  id: string
  employee_id: string
  work_date: string
  start_time: string | null
  end_time: string | null
  calculated_hours: number | null
  absence_type: string | null
  employee_label: string
}

type ExistingEntry = {
  workday_id: string
  project_id: string
  project_lv_position_id: string
  assigned_hours: number
}

type AssignmentEntry = {
  local_id: string
  project_id: string
  project_lv_position_id: string
  assigned_hours: string
}

type DayAssignments = {
  workday_id: string
  entries: AssignmentEntry[]
}

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function ForemanAssignmentForm({
  employees,
  filterGroups,
  selectedEmployeeId,
  selectedGroupId,
  selectedWeek,
  workdays,
  projects,
  lvPositions,
  existingEntries,
}: {
  employees: Employee[]
  filterGroups: FilterGroup[]
  selectedEmployeeId: string
  selectedGroupId: string
  selectedWeek: string
  workdays: Workday[]
  projects: Project[]
  lvPositions: LvPosition[]
  existingEntries: ExistingEntry[]
}) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const visibleWorkdays = workdays.filter(
    (day) => !day.absence_type && day.calculated_hours !== null
  )

  function buildInitialRows(): DayAssignments[] {
    return visibleWorkdays.map((day) => {
      const existingForDay = existingEntries.filter((e) => e.workday_id === day.id)

      if (existingForDay.length > 0) {
        return {
          workday_id: day.id,
          entries: existingForDay.map((entry) => ({
            local_id: createLocalId(),
            project_id: entry.project_id,
            project_lv_position_id: entry.project_lv_position_id,
            assigned_hours: entry.assigned_hours.toString(),
          })),
        }
      }

      return {
        workday_id: day.id,
        entries: [
          {
            local_id: createLocalId(),
            project_id: '',
            project_lv_position_id: '',
            assigned_hours: day.calculated_hours?.toString() ?? '',
          },
        ],
      }
    })
  }

  const [rows, setRows] = useState<DayAssignments[]>(buildInitialRows())

  useEffect(() => {
    setRows(buildInitialRows())
  }, [workdays, existingEntries])

  function updateEntry(
    workdayId: string,
    localId: string,
    field: keyof AssignmentEntry,
    value: string
  ) {
    setRows((prev) =>
      prev.map((day) =>
        day.workday_id === workdayId
          ? {
              ...day,
              entries: day.entries.map((entry) =>
                entry.local_id === localId ? { ...entry, [field]: value } : entry
              ),
            }
          : day
      )
    )
  }

  function addEntry(workdayId: string) {
    setRows((prev) =>
      prev.map((day) =>
        day.workday_id === workdayId
          ? {
              ...day,
              entries: [
                ...day.entries,
                {
                  local_id: createLocalId(),
                  project_id: '',
                  project_lv_position_id: '',
                  assigned_hours: '',
                },
              ],
            }
          : day
      )
    )
  }

  function removeEntry(workdayId: string, localId: string) {
    setRows((prev) =>
      prev.map((day) => {
        if (day.workday_id !== workdayId) return day

        if (day.entries.length === 1) {
          return {
            ...day,
            entries: [
              {
                local_id: createLocalId(),
                project_id: '',
                project_lv_position_id: '',
                assigned_hours: '',
              },
            ],
          }
        }

        return {
          ...day,
          entries: day.entries.filter((entry) => entry.local_id !== localId),
        }
      })
    )
  }

  const filteredLvOptions = useMemo(() => {
    const map: Record<string, LvPosition[]> = {}

    rows.forEach((day) => {
      day.entries.forEach((entry) => {
        map[entry.local_id] = lvPositions.filter(
          (lv) => lv.project_id === entry.project_id && lv.is_active
        )
      })
    })

    return map
  }, [rows, lvPositions])

  function handleFilterSubmit(formData: FormData) {
    const employeeId = formData.get('employeeId')?.toString() || ''
    const groupId = formData.get('groupId')?.toString() || ''
    const week = formData.get('week')?.toString()

    if (!week) return

    if (groupId) {
      router.push(`/foreman?groupId=${groupId}&week=${week}`)
      return
    }

    if (employeeId) {
      router.push(`/foreman?employeeId=${employeeId}&week=${week}`)
      return
    }

    router.push(`/foreman?week=${week}`)
  }

  function handleSave() {
    setError('')
    setSuccess('')

    const flattenedEntries = rows.flatMap((day) =>
      day.entries.map((entry) => {
        const selectedLv = lvPositions.find(
          (lv) => lv.id === entry.project_lv_position_id
        )

        return {
          workday_id: day.workday_id,
          project_id: entry.project_id,
          project_lv_position_id: entry.project_lv_position_id,
          order_position_snapshot: selectedLv?.order_position ?? '',
          lv_position_snapshot: selectedLv?.lv_position ?? '',
          lv_description_snapshot: selectedLv?.lv_description ?? '',
          assigned_hours: Number(entry.assigned_hours),
        }
      })
    )

    const invalid = flattenedEntries.find(
      (entry) =>
        !entry.workday_id ||
        !entry.project_id ||
        !entry.project_lv_position_id ||
        !entry.order_position_snapshot ||
        !entry.lv_position_snapshot ||
        !entry.lv_description_snapshot ||
        !entry.assigned_hours
    )

    if (invalid) {
      setError(
        'Bitte für alle Zeilen Auftrag, LV-Position und Auftragszeit vollständig ausfüllen.'
      )
      return
    }

    for (const day of rows) {
      const workday = visibleWorkdays.find((w) => w.id === day.workday_id)
      const targetHours = Number(workday?.calculated_hours ?? 0)

      const totalAssigned = day.entries.reduce(
        (sum, entry) => sum + Number(entry.assigned_hours || 0),
        0
      )

      if (Number(totalAssigned.toFixed(2)) !== Number(targetHours.toFixed(2))) {
        setError(
          `Die Summe der Auftragszeiten am ${workday?.work_date} für ${workday?.employee_label} muss exakt ${targetHours} h ergeben.`
        )
        return
      }
    }

    const formData = new FormData()
    formData.set('entries', JSON.stringify(flattenedEntries))

    startTransition(async () => {
      try {
        await saveForemanAssignments(formData)
        setSuccess('Die Auftragszuordnung wurde gespeichert.')
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
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-slate-900">Filter</h2>

        <form action={handleFilterSubmit} className="mt-4 grid gap-5 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Mitarbeiter
            </label>
            <select
              name="employeeId"
              defaultValue={selectedGroupId ? '' : selectedEmployeeId}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Mitarbeiter auswählen</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employee_number} – {employee.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Filtergruppe
            </label>
            <select
              name="groupId"
              defaultValue={selectedGroupId}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Keine Filtergruppe</option>
              {filterGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Kalenderwoche
            </label>
            <input
              name="week"
              type="week"
              defaultValue={selectedWeek}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900"
            >
              Woche laden
            </button>
          </div>
        </form>

        <p className="mt-3 text-sm text-slate-500">
          Wenn eine Filtergruppe gewählt ist, hat diese Vorrang. Es werden dann
          alle vorhandenen Arbeitszeiten der Gruppenmitglieder in der gewählten
          Woche geladen.
        </p>
      </div>

      <div className="rounded-3xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Arbeitszeit-Zuordnung
          </h2>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Speichern...' : 'Zuordnung speichern'}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mt-6 space-y-6">
          {visibleWorkdays.map((day) => {
            const dayRows = rows.find((r) => r.workday_id === day.id)
            const totalAssigned =
              dayRows?.entries.reduce(
                (sum, entry) => sum + Number(entry.assigned_hours || 0),
                0
              ) ?? 0

            const isBalanced =
              Number(totalAssigned.toFixed(2)) ===
              Number(Number(day.calculated_hours ?? 0).toFixed(2))

            return (
              <div
                key={day.id}
                className="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {day.work_date}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {day.employee_label}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {day.start_time} – {day.end_time} | Arbeitszeit:{' '}
                      {day.calculated_hours} h
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                      isBalanced
                        ? 'border border-green-200 bg-green-50 text-green-700'
                        : 'border border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    Summe Auftragszeiten: {totalAssigned.toFixed(2)} h
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/40 bg-white/60">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/40 bg-slate-50/60 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Auftrag</th>
                        <th className="px-4 py-3 font-medium">LV-Position</th>
                        <th className="px-4 py-3 font-medium">Auftragszeit</th>
                        <th className="px-4 py-3 font-medium">Aktion</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dayRows?.entries.map((entry) => (
                        <tr
                          key={entry.local_id}
                          className="border-b border-white/30 hover:bg-slate-50/50"
                        >
                          <td className="px-4 py-3">
                            <select
                              value={entry.project_id}
                              onChange={(e) =>
                                updateEntry(
                                  day.id,
                                  entry.local_id,
                                  'project_id',
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm"
                            >
                              <option value="">Auftrag wählen</option>
                              {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                  {project.project_number} – {project.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <select
                              value={entry.project_lv_position_id}
                              onChange={(e) =>
                                updateEntry(
                                  day.id,
                                  entry.local_id,
                                  'project_lv_position_id',
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm"
                            >
                              <option value="">LV wählen</option>
                              {(filteredLvOptions[entry.local_id] ?? []).map((lv) => (
                                <option key={lv.id} value={lv.id}>
                                  {lv.lv_position} – {lv.lv_description}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={entry.assigned_hours}
                              onChange={(e) =>
                                updateEntry(
                                  day.id,
                                  entry.local_id,
                                  'assigned_hours',
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => removeEntry(day.id, entry.local_id)}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                            >
                              Entfernen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => addEntry(day.id)}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-950 transition hover:bg-blue-100"
                  >
                    + Auftrag hinzufügen
                  </button>
                </div>
              </div>
            )
          })}

          {visibleWorkdays.length === 0 && (
            <div className="rounded-2xl border border-white/40 bg-white/60 px-4 py-6 text-center text-slate-500">
              Für die gewählte Auswahl und diese Woche liegen keine Arbeitstage vor.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}