'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveTravelExpenseMonth } from '@/app/travel-expenses/actions'

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
}

type Project = {
  id: string
  project_number: string | null
  name: string
}

type TravelProfile = {
  distance_home_company_km: number | null
}

type TravelRoute = {
  project_id: string
  distance_home_project_km: number | null
}

type MonthDayRow = {
  entry_date: string
  weekday_label: string
  is_weekend: boolean
  project_id: string
  departure_type: string
  destination_text: string
  return_type: string
  absence_from: string
  presence_until: string
  overnight_type: string
  catering_type: string
  private_kilometers: string
  meal_allowance_tax_free: string
  meal_allowance_taxable: string
  taxable_from_date_text: string
  km_allowance: string
}

type ExistingEntry = {
  entry_date: string
  project_id: string | null
  departure_type: string | null
  destination_text: string | null
  return_type: string | null
  absence_from: string | null
  presence_until: string | null
  overnight_type: string | null
  catering_type: string | null
  private_kilometers: number | null
  meal_allowance_tax_free: number | null
  meal_allowance_taxable: number | null
  taxable_from_date_text: string | null
  km_allowance: number | null
}

type DefaultProjectByDate = Record<string, string>

const weekdayFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  timeZone: 'UTC',
})

function buildMonthRows(
  year: number,
  month: number,
  existingEntries: ExistingEntry[],
  defaultProjectByDate: DefaultProjectByDate,
  profile: TravelProfile | null,
  routes: TravelRoute[]
): MonthDayRow[] {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const entryMap = new Map<string, ExistingEntry>()
  existingEntries.forEach((entry) => {
    entryMap.set(entry.entry_date, entry)
  })

  const routeMap = new Map<string, TravelRoute>()
  routes.forEach((route) => {
    routeMap.set(route.project_id, route)
  })

  const rows: MonthDayRow[] = []

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day))
    const entryDate = date.toISOString().split('T')[0]
    const weekday = date.getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6
    const existing = entryMap.get(entryDate)
    const projectId = existing?.project_id ?? defaultProjectByDate[entryDate] ?? ''

    const route = projectId ? routeMap.get(projectId) : undefined
    const homeCompanyKm = profile?.distance_home_company_km ?? null
    const homeProjectKm = route?.distance_home_project_km ?? null

    let privateKm = existing?.private_kilometers ?? null
    let kmAllowance = existing?.km_allowance ?? null

    if (
      privateKm === null &&
      homeCompanyKm !== null &&
      homeProjectKm !== null &&
      homeProjectKm >= homeCompanyKm
    ) {
      privateKm = Number(((homeProjectKm - homeCompanyKm) * 2).toFixed(2))
    }

    if (kmAllowance === null && privateKm !== null) {
      kmAllowance = Number((privateKm * 0.3).toFixed(2))
    }

    rows.push({
      entry_date: entryDate,
      weekday_label: weekdayFormatter.format(date),
      is_weekend: isWeekend,
      project_id: projectId,
      departure_type: existing?.departure_type ?? '',
      destination_text: existing?.destination_text ?? '',
      return_type: existing?.return_type ?? '',
      absence_from: existing?.absence_from ?? '',
      presence_until: existing?.presence_until ?? '',
      overnight_type: existing?.overnight_type ?? '',
      catering_type: existing?.catering_type ?? '',
      private_kilometers: privateKm !== null ? String(privateKm) : '',
      meal_allowance_tax_free:
        existing?.meal_allowance_tax_free !== null &&
        existing?.meal_allowance_tax_free !== undefined
          ? String(existing.meal_allowance_tax_free)
          : '',
      meal_allowance_taxable:
        existing?.meal_allowance_taxable !== null &&
        existing?.meal_allowance_taxable !== undefined
          ? String(existing.meal_allowance_taxable)
          : '',
      taxable_from_date_text: existing?.taxable_from_date_text ?? '',
      km_allowance: kmAllowance !== null ? String(kmAllowance) : '',
    })
  }

  return rows
}

export default function TravelExpenseMonthForm({
  employees,
  projects,
  selectedEmployeeId,
  selectedMonth,
  selectedYear,
  profile,
  routes,
  existingEntries,
  defaultProjectByDate,
}: {
  employees: Employee[]
  projects: Project[]
  selectedEmployeeId: string
  selectedMonth: number
  selectedYear: number
  profile: TravelProfile | null
  routes: TravelRoute[]
  existingEntries: ExistingEntry[]
  defaultProjectByDate: DefaultProjectByDate
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()

  const createInitialRows = () =>
    buildMonthRows(
      selectedYear,
      selectedMonth,
      existingEntries,
      defaultProjectByDate,
      profile,
      routes
    )

  const [rows, setRows] = useState<MonthDayRow[]>(createInitialRows())

  useEffect(() => {
    setRows(createInitialRows())
  }, [
    selectedEmployeeId,
    selectedMonth,
    selectedYear,
    existingEntries,
    profile,
    routes,
    defaultProjectByDate,
  ])

  const routeMap = useMemo(() => {
    const map = new Map<string, TravelRoute>()
    routes.forEach((route) => map.set(route.project_id, route))
    return map
  }, [routes])

  function updateRow(
    entryDate: string,
    field: keyof MonthDayRow,
    value: string
  ) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.entry_date !== entryDate) return row

        const nextRow = { ...row, [field]: value }

        if (field === 'project_id') {
          const homeCompanyKm = profile?.distance_home_company_km ?? null
          const route = value ? routeMap.get(value) : undefined
          const homeProjectKm = route?.distance_home_project_km ?? null

          let privateKm = ''
          let kmAllowance = ''

          if (
            homeCompanyKm !== null &&
            homeProjectKm !== null &&
            homeProjectKm >= homeCompanyKm
          ) {
            const computedPrivateKm = Number(
              ((homeProjectKm - homeCompanyKm) * 2).toFixed(2)
            )
            privateKm = String(computedPrivateKm)
            kmAllowance = String(Number((computedPrivateKm * 0.3).toFixed(2)))
          }

          nextRow.private_kilometers = privateKm
          nextRow.km_allowance = kmAllowance
        }

        return nextRow
      })
    )
  }

  function handleFilterSubmit(formData: FormData) {
    const employeeId = formData.get('employeeId')?.toString()
    const month = formData.get('month')?.toString()
    const year = formData.get('year')?.toString()

    if (!employeeId || !month || !year) return

    router.push(
      `/travel-expenses?employeeId=${employeeId}&month=${month}&year=${year}`
    )
  }

  function handleSave() {
    setError('')
    setSuccess('')

    if (!selectedEmployeeId) {
      setError('Bitte zuerst einen Mitarbeiter auswählen.')
      return
    }

    startTransition(async () => {
      try {
        await saveTravelExpenseMonth(
          selectedEmployeeId,
          selectedYear,
          selectedMonth,
          rows.map((row) => ({
            entry_date: row.entry_date,
            project_id: row.project_id,
            departure_type: row.departure_type,
            destination_text: row.destination_text,
            return_type: row.return_type,
            absence_from: row.absence_from,
            presence_until: row.presence_until,
            overnight_type: row.overnight_type,
            catering_type: row.catering_type,
            private_kilometers: row.private_kilometers,
            meal_allowance_tax_free: row.meal_allowance_tax_free,
            meal_allowance_taxable: row.meal_allowance_taxable,
            taxable_from_date_text: row.taxable_from_date_text,
            km_allowance: row.km_allowance,
          }))
        )

        setSuccess('Reisekosten-Monat wurde gespeichert.')
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
              defaultValue={selectedEmployeeId}
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
              Monat
            </label>
            <select
              name="month"
              defaultValue={String(selectedMonth)}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Jahr
            </label>
            <select
              name="year"
              defaultValue={String(selectedYear)}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              {Array.from({ length: 7 }, (_, i) => 2024 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900"
            >
              Monat laden
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Reisekosten-Erfassung
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Vorarbeiter- und Admin-Felder werden hier gemeinsam gepflegt.
              Automatische Vorschläge und Berechnungen sind bereits hinterlegt.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Speichern...' : 'Monat speichern'}
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

        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/40 bg-white/70 max-h-[70vh]">
          <table className="min-w-[2100px] w-full text-left text-sm">
            <thead className="sticky top-0 z-20 border-b border-white/40 bg-slate-50/95 text-slate-500 backdrop-blur">
              <tr>
                <th className="px-4 py-3 font-medium">Wochentag</th>
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium">Abfahrt</th>
                <th className="px-4 py-3 font-medium">Baustelle / Zielort</th>
                <th className="px-4 py-3 font-medium">Auftrag</th>
                <th className="px-4 py-3 font-medium">Rückkehr</th>
                <th className="px-4 py-3 font-medium">Abwesen von</th>
                <th className="px-4 py-3 font-medium">Anwesen bis</th>
                <th className="px-4 py-3 font-medium">Private Kilometer</th>
                <th className="px-4 py-3 font-medium">
                  Verpflegung steuerfrei
                </th>
                <th className="px-4 py-3 font-medium">
                  Verpflegung steuerpflichtig
                </th>
                <th className="px-4 py-3 font-medium">Übernachtung</th>
                <th className="px-4 py-3 font-medium">Verkostung</th>
                <th className="px-4 py-3 font-medium">Datum steuerpfl. ab</th>
                <th className="px-4 py-3 font-medium">KM-Vergütung</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.entry_date}
                  className={`border-b border-white/30 align-top ${
                    row.is_weekend ? 'bg-slate-50/60' : 'hover:bg-slate-50/40'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {row.weekday_label}
                  </td>

                  <td className="px-4 py-3 text-slate-700">{row.entry_date}</td>

                  <td className="px-4 py-3">
                    <select
                      value={row.departure_type}
                      onChange={(e) =>
                        updateRow(row.entry_date, 'departure_type', e.target.value)
                      }
                      className="w-[140px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="Wohnort">Wohnort</option>
                      <option value="Unternehmen">Unternehmen</option>
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.destination_text}
                      onChange={(e) =>
                        updateRow(
                          row.entry_date,
                          'destination_text',
                          e.target.value
                        )
                      }
                      className="w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={row.project_id}
                      onChange={(e) =>
                        updateRow(row.entry_date, 'project_id', e.target.value)
                      }
                      className="w-[250px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.project_number} – {project.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={row.return_type}
                      onChange={(e) =>
                        updateRow(row.entry_date, 'return_type', e.target.value)
                      }
                      className="w-[140px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="Wohnort">Wohnort</option>
                      <option value="Unternehmen">Unternehmen</option>
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={row.absence_from}
                      onChange={(e) =>
                        updateRow(row.entry_date, 'absence_from', e.target.value)
                      }
                      className="w-[130px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={row.presence_until}
                      onChange={(e) =>
                        updateRow(row.entry_date, 'presence_until', e.target.value)
                      }
                      className="w-[130px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={row.private_kilometers}
                      onChange={(e) =>
                        updateRow(
                          row.entry_date,
                          'private_kilometers',
                          e.target.value
                        )
                      }
                      className="w-[140px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={row.meal_allowance_tax_free}
                      onChange={(e) =>
                        updateRow(
                          row.entry_date,
                          'meal_allowance_tax_free',
                          e.target.value
                        )
                      }
                      className="w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={row.meal_allowance_taxable}
                      onChange={(e) =>
                        updateRow(
                          row.entry_date,
                          'meal_allowance_taxable',
                          e.target.value
                        )
                      }
                      className="w-[170px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={row.overnight_type}
                      onChange={(e) =>
                        updateRow(row.entry_date, 'overnight_type', e.target.value)
                      }
                      className="w-[170px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="Hotel">Hotel</option>
                      <option value="keine Übernachtung">
                        keine Übernachtung
                      </option>
                      <option value="Container">Container</option>
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={row.catering_type}
                      onChange={(e) =>
                        updateRow(row.entry_date, 'catering_type', e.target.value)
                      }
                      className="w-[110px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="F">F</option>
                      <option value="FM">FM</option>
                      <option value="FMA">FMA</option>
                      <option value="MA">MA</option>
                      <option value="M">M</option>
                      <option value="A">A</option>
                      <option value="FA">FA</option>
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.taxable_from_date_text}
                      onChange={(e) =>
                        updateRow(
                          row.entry_date,
                          'taxable_from_date_text',
                          e.target.value
                        )
                      }
                      className="w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={row.km_allowance}
                      onChange={(e) =>
                        updateRow(row.entry_date, 'km_allowance', e.target.value)
                      }
                      className="w-[140px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}