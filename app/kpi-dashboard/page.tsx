import { supabase } from '@/lib/supabase'

type EmployeeRow = {
  id: string
  full_name: string
  employer: string | null
  is_active: boolean | null
}

type WorkdayRow = {
  id: string
  employee_id: string
  work_date: string
  calculated_hours: number | null
  absence_type: string | null
}

type AssignmentRow = {
  workday_id: string
  project_id: string
  assigned_hours: number
}

type ProjectRow = {
  id: string
  project_number: string | null
  name: string
}

type TravelExpenseRow = {
  entry_date: string
  project_id: string | null
  meal_allowance_tax_free: number | null
  meal_allowance_taxable: number | null
  km_allowance: number | null
}

type RangeOption =
  | 'all_time'
  | 'current_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'current_year'
  | 'custom'

function getTodayUtc() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function formatDateISO(date: Date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function addDaysUtc(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function startOfYearUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
}

function getDateRange(
  range: RangeOption,
  startDate?: string,
  endDate?: string
): {
  from: string | null
  to: string | null
  label: string
} {
  const today = getTodayUtc()

  if (range === 'all_time') {
    return {
      from: null,
      to: null,
      label: 'All Time',
    }
  }

  if (range === 'current_month') {
    const fromDate = startOfMonthUtc(today)
    const toDate = addMonthsUtc(fromDate, 1)

    return {
      from: formatDateISO(fromDate),
      to: formatDateISO(toDate),
      label: 'Aktueller Monat',
    }
  }

  if (range === 'last_3_months') {
    const currentMonthStart = startOfMonthUtc(today)
    const fromDate = addMonthsUtc(currentMonthStart, -2)
    const toDate = addMonthsUtc(currentMonthStart, 1)

    return {
      from: formatDateISO(fromDate),
      to: formatDateISO(toDate),
      label: 'Letzte 3 Monate',
    }
  }

  if (range === 'last_6_months') {
    const currentMonthStart = startOfMonthUtc(today)
    const fromDate = addMonthsUtc(currentMonthStart, -5)
    const toDate = addMonthsUtc(currentMonthStart, 1)

    return {
      from: formatDateISO(fromDate),
      to: formatDateISO(toDate),
      label: 'Letzte 6 Monate',
    }
  }

  if (range === 'current_year') {
    const fromDate = startOfYearUtc(today)
    const toDate = new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1))

    return {
      from: formatDateISO(fromDate),
      to: formatDateISO(toDate),
      label: 'Aktuelles Jahr',
    }
  }

  if (range === 'custom' && startDate && endDate) {
    const endExclusive = addDaysUtc(new Date(`${endDate}T00:00:00Z`), 1)

    return {
      from: startDate,
      to: formatDateISO(endExclusive),
      label: `Benutzerdefiniert: ${startDate} bis ${endDate}`,
    }
  }

  const fallbackFrom = startOfMonthUtc(today)
  const fallbackTo = addMonthsUtc(fallbackFrom, 1)

  return {
    from: formatDateISO(fallbackFrom),
    to: formatDateISO(fallbackTo),
    label: 'Aktueller Monat',
  }
}

function formatHours(value: number) {
  return `${value.toFixed(2).replace('.', ',')} h`
}

function formatEuro(value: number) {
  return `${value.toFixed(2).replace('.', ',')} €`
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace('.', ',')} %`
}

function isInternalEmployer(employer: string | null) {
  const normalized = (employer ?? '').trim().toLowerCase()

  if (!normalized) return true

  const internalKeywords = [
    'intern',
    'internal',
    'inhouse',
    'in-house',
    'eigene firma',
    'eigen',
    'nks',
  ]

  return internalKeywords.some((keyword) => normalized.includes(keyword))
}

function monthLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`)
  return new Intl.DateTimeFormat('de-DE', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

function dayLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`)
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

function buildTrendSeries(
  assignments: Array<{ date: string; hours: number }>,
  range: RangeOption,
  from: string | null,
  to: string | null
) {
  const daily =
    range === 'current_month' ||
    (range === 'custom' && from && to && daysBetween(from, to) <= 45)

  const map = new Map<string, number>()

  assignments.forEach((item) => {
    const key = daily ? item.date : item.date.slice(0, 7)
    map.set(key, (map.get(key) ?? 0) + item.hours)
  })

  const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  return entries.map(([key, value]) => ({
    label: daily ? dayLabel(key) : monthLabel(`${key}-01`),
    value,
  }))
}

function daysBetween(from: string, toExclusive: string) {
  const start = new Date(`${from}T00:00:00Z`).getTime()
  const end = new Date(`${toExclusive}T00:00:00Z`).getTime()
  return Math.round((end - start) / 86400000)
}

function buildPolyline(values: number[], width = 640, height = 220) {
  if (values.length === 0) return ''
  if (values.length === 1) return `0,${height / 2} ${width},${height / 2}`

  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 20) - 10
      return `${x},${y}`
    })
    .join(' ')
}

export default async function KpiDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    range?: string
    startDate?: string
    endDate?: string
  }>
}) {
  const resolvedSearchParams = await searchParams

  const selectedRange = (resolvedSearchParams?.range as RangeOption) || 'current_month'
  const selectedStartDate = resolvedSearchParams?.startDate || ''
  const selectedEndDate = resolvedSearchParams?.endDate || ''

  const { from, to, label } = getDateRange(
    selectedRange,
    selectedStartDate,
    selectedEndDate
  )

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, full_name, employer, is_active')
    .order('full_name', { ascending: true })
    .returns<EmployeeRow[]>()

  if (employeesError) {
    return <p className="text-red-600">Fehler Mitarbeiter: {employeesError.message}</p>
  }

  let workdaysQuery = supabase
    .from('employee_workdays')
    .select('id, employee_id, work_date, calculated_hours, absence_type')

  if (from) workdaysQuery = workdaysQuery.gte('work_date', from)
  if (to) workdaysQuery = workdaysQuery.lt('work_date', to)

  const { data: workdays, error: workdaysError } = await workdaysQuery.returns<WorkdayRow[]>()

  if (workdaysError) {
    return <p className="text-red-600">Fehler Tagesdaten: {workdaysError.message}</p>
  }

  const workdayIds = (workdays ?? []).map((w) => w.id)

  let assignments: AssignmentRow[] = []
  if (workdayIds.length > 0) {
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('workday_project_entries')
      .select('workday_id, project_id, assigned_hours')
      .in('workday_id', workdayIds)
      .returns<AssignmentRow[]>()

    if (assignmentError) {
      return (
        <p className="text-red-600">
          Fehler Auftragszuordnungen: {assignmentError.message}
        </p>
      )
    }

    assignments = assignmentData ?? []
  }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, project_number, name')
    .order('project_number', { ascending: true })
    .returns<ProjectRow[]>()

  if (projectsError) {
    return <p className="text-red-600">Fehler Aufträge: {projectsError.message}</p>
  }

  let travelQuery = supabase
    .from('travel_expense_entries')
    .select(
      'entry_date, project_id, meal_allowance_tax_free, meal_allowance_taxable, km_allowance'
    )

  if (from) travelQuery = travelQuery.gte('entry_date', from)
  if (to) travelQuery = travelQuery.lt('entry_date', to)

  const { data: travelEntries, error: travelError } = await travelQuery.returns<
    TravelExpenseRow[]
  >()

  if (travelError) {
    return (
      <p className="text-red-600">Fehler Reisekosten: {travelError.message}</p>
    )
  }

  const employeeMap = new Map<string, EmployeeRow>()
  ;(employees ?? []).forEach((employee) => {
    employeeMap.set(employee.id, employee)
  })

  const projectMap = new Map<string, ProjectRow>()
  ;(projects ?? []).forEach((project) => {
    projectMap.set(project.id, project)
  })

  const workdayMap = new Map<string, WorkdayRow>()
  ;(workdays ?? []).forEach((workday) => {
    workdayMap.set(workday.id, workday)
  })

  const projectHoursMap = new Map<string, number>()
  assignments.forEach((assignment) => {
    projectHoursMap.set(
      assignment.project_id,
      (projectHoursMap.get(assignment.project_id) ?? 0) +
        Number(assignment.assigned_hours)
    )
  })

  const hoursPerProject = Array.from(projectHoursMap.entries())
    .map(([projectId, hours]) => ({
      label: projectMap.get(projectId)
        ? `${projectMap.get(projectId)?.project_number} – ${projectMap.get(projectId)?.name}`
        : 'Unbekannter Auftrag',
      value: hours,
    }))
    .sort((a, b) => b.value - a.value)

  const maxProjectHours = Math.max(...hoursPerProject.map((item) => item.value), 1)

  const assignmentTimeline = assignments
    .map((assignment) => {
      const workday = workdayMap.get(assignment.workday_id)
      if (!workday) return null

      return {
        date: workday.work_date,
        hours: Number(assignment.assigned_hours),
      }
    })
    .filter(Boolean) as Array<{ date: string; hours: number }>

  const trendSeries = buildTrendSeries(assignmentTimeline, selectedRange, from, to)
  const trendValues = trendSeries.map((item) => item.value)
  const trendPolyline = buildPolyline(trendValues)

  const relevantAbsenceTypes = new Set(['k1', 'krank', 'arztbesuch'])
  const excludedAbsenceTypes = new Set(['wochenende_feiertag', 'nicht_angestellt'])

  const relevantRecordedDays = (workdays ?? []).filter(
    (workday) => !excludedAbsenceTypes.has(workday.absence_type ?? '')
  )

  const absenceDays = relevantRecordedDays.filter((workday) =>
    relevantAbsenceTypes.has(workday.absence_type ?? '')
  )

  const absenceRate =
    relevantRecordedDays.length > 0
      ? (absenceDays.length / relevantRecordedDays.length) * 100
      : 0

  let internalHours = 0
  let externalHours = 0

  assignments.forEach((assignment) => {
    const workday = workdayMap.get(assignment.workday_id)
    if (!workday) return

    const employee = employeeMap.get(workday.employee_id)
    const hours = Number(assignment.assigned_hours)

    if (isInternalEmployer(employee?.employer ?? null)) {
      internalHours += hours
    } else {
      externalHours += hours
    }
  })

  const totalInternalExternal = internalHours + externalHours || 1
  const internalPercent = (internalHours / totalInternalExternal) * 100
  const externalPercent = (externalHours / totalInternalExternal) * 100

  const totalTravelExpenses = (travelEntries ?? []).reduce((sum, entry) => {
    return (
      sum +
      Number(entry.meal_allowance_tax_free ?? 0) +
      Number(entry.meal_allowance_taxable ?? 0) +
      Number(entry.km_allowance ?? 0)
    )
  }, 0)

  const travelPerProjectMap = new Map<string, number>()
  ;(travelEntries ?? []).forEach((entry) => {
    const amount =
      Number(entry.meal_allowance_tax_free ?? 0) +
      Number(entry.meal_allowance_taxable ?? 0) +
      Number(entry.km_allowance ?? 0)

    const key = entry.project_id ?? 'ohne_auftrag'
    travelPerProjectMap.set(key, (travelPerProjectMap.get(key) ?? 0) + amount)
  })

  const travelPerProject = Array.from(travelPerProjectMap.entries())
    .map(([projectId, amount]) => ({
      label:
        projectId === 'ohne_auftrag'
          ? 'Ohne Auftrag'
          : projectMap.get(projectId)
          ? `${projectMap.get(projectId)?.project_number} – ${projectMap.get(projectId)?.name}`
          : 'Unbekannter Auftrag',
      value: amount,
    }))
    .sort((a, b) => b.value - a.value)

  const maxTravelPerProject = Math.max(
    ...travelPerProject.map((item) => item.value),
    1
  )

  const totalAssignedHours = assignments.reduce(
    (sum, item) => sum + Number(item.assigned_hours),
    0
  )

  const totalTravelRows = (travelEntries ?? []).length
  const totalProjectsWithHours = hoursPerProject.length

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/40 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              KPI Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Controlling & Leistungsübersicht
            </h1>
            <p className="mt-3 max-w-3xl text-slate-600">
              Strategische Auswertung von Stunden, Fehlzeiten und Reisekosten für
              den gewählten Zeitraum.
            </p>
          </div>

          <form
            method="GET"
            className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-4 backdrop-blur-xl md:grid-cols-4 xl:min-w-[760px]"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Zeitraum
              </label>
              <select
                name="range"
                defaultValue={selectedRange}
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all_time">All Time</option>
                <option value="current_month">Aktueller Monat</option>
                <option value="last_3_months">Letzte 3 Monate</option>
                <option value="last_6_months">Letzte 6 Monate</option>
                <option value="current_year">Aktuelles Jahr</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Startdatum
              </label>
              <input
                name="startDate"
                type="date"
                defaultValue={selectedStartDate}
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Enddatum
              </label>
              <input
                name="endDate"
                type="date"
                defaultValue={selectedEndDate}
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-2xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900"
              >
                Filter anwenden
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
            <p className="text-sm font-medium text-slate-500">Gesamtstunden</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-blue-950">
              {formatHours(totalAssignedHours)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/40 bg-white/75 p-5">
            <p className="text-sm font-medium text-slate-500">Reisekosten gesamt</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {formatEuro(totalTravelExpenses)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/40 bg-white/75 p-5">
            <p className="text-sm font-medium text-slate-500">Aufträge mit Stunden</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {totalProjectsWithHours}
            </p>
          </div>

          <div className="rounded-3xl border border-white/40 bg-white/75 p-5">
            <p className="text-sm font-medium text-slate-500">Zeitraum</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{label}</p>
            <p className="mt-2 text-sm text-slate-500">
              Reisekosten-Einträge: {totalTravelRows}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            KPI 1
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Stunden pro Auftrag
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Verteilung der verschriebenen Stunden auf die Aufträge im Zeitraum.
          </p>

          <div className="mt-6 space-y-4">
            {hoursPerProject.length > 0 ? (
              hoursPerProject.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-sm font-semibold text-blue-950">
                      {formatHours(item.value)}
                    </p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-950"
                      style={{ width: `${(item.value / maxProjectHours) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/50 px-4 py-6 text-sm text-slate-500">
                Für den Zeitraum liegen keine Stunden auf Aufträgen vor.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            KPI 2
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Stundenentwicklung
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Entwicklung der verschriebenen Stunden über den gewählten Zeitraum.
          </p>

          {trendSeries.length > 0 ? (
            <>
              <div className="mt-6 rounded-3xl border border-white/40 bg-white/75 p-4 shadow-sm">
                <svg viewBox="0 0 640 220" className="h-[240px] w-full">
                  <polyline
                    fill="none"
                    stroke="#172554"
                    strokeWidth="4"
                    points={trendPolyline}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                {trendSeries.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/40 bg-white/75 px-3 py-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatHours(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/50 px-4 py-6 text-sm text-slate-500">
              Für den Zeitraum sind noch keine Stunden vorhanden.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            KPI 3
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Fehlzeitquote gesamt
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Zählt nur K1, krank und Arztbesuch. Urlaub zählt bewusst nicht als Fehlzeit.
          </p>

          <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50/60 p-6">
            <div className="flex items-end gap-4">
              <div className="text-5xl font-semibold tracking-tight text-blue-950">
                {formatPercent(absenceRate)}
              </div>
              <div className="pb-1 text-sm text-slate-600">
                {absenceDays.length} von {relevantRecordedDays.length} relevanten Tagen
              </div>
            </div>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-950 transition-all"
                style={{ width: `${Math.min(absenceRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            KPI 4
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Stunden intern vs. nicht intern
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Gegenüberstellung der Stunden auf Basis des Arbeitgeber-Felds der Mitarbeiter.
          </p>

          <div className="mt-8 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">Intern</span>
                <span className="text-sm font-semibold text-blue-950">
                  {formatHours(internalHours)} · {formatPercent(internalPercent)}
                </span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-950"
                  style={{ width: `${internalPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">
                  Nicht intern
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {formatHours(externalHours)} · {formatPercent(externalPercent)}
                </span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-500"
                  style={{ width: `${externalPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/40 bg-white/75 px-4 py-3 text-sm text-slate-600">
            Die interne Zuordnung basiert aktuell auf typischen Begriffen wie
            „intern“, „internal“, „inhouse“ oder „nks“ im Arbeitgeber-Feld.
          </div>
        </div>

        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            KPI 5
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Reisekosten gesamt
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Summe aus steuerfrei, steuerpflichtig und KM-Vergütung im Zeitraum.
          </p>

          <div className="mt-10 rounded-3xl border border-blue-100 bg-blue-50/70 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
              Gesamt
            </p>
            <p className="mt-3 text-5xl font-semibold tracking-tight text-blue-950">
              {formatEuro(totalTravelExpenses)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          KPI 6
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Reisekosten pro Auftrag
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Verteilung der Reisekosten auf die Aufträge im gewählten Zeitraum.
        </p>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {travelPerProject.length > 0 ? (
            travelPerProject.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/40 bg-white/75 p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-sm font-semibold text-blue-950">
                    {formatEuro(item.value)}
                  </p>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-950"
                    style={{ width: `${(item.value / maxTravelPerProject) * 100}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/50 px-4 py-6 text-sm text-slate-500">
              Für den gewählten Zeitraum sind keine Reisekosten vorhanden.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}