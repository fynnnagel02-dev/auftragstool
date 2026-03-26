import { createClient } from '@/lib/supabase/server'
import WorkdayCreateModal from '@/components/workday-create-modal'
import WorkdayImportModal from '@/components/workday-import-modal'
import TravelExpenseExportModal from '@/components/travel-expense-export-modal'
import CompletenessCheckModal from '@/components/completeness-check-modal'

function getCurrentMonthAndYear() {
  const now = new Date()
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

function getMonthDateRange(month: number, year: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`

  const nextMonth = month === 12 ? 1 : month + 1
  const nextMonthYear = month === 12 ? year + 1 : year

  const to = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`

  return { from, to }
}

function getYearDateRange(year: number) {
  return {
    from: `${year}-01-01`,
    to: `${year + 1}-01-01`,
  }
}

function formatDateUTC(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDaysUTC(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function getEasterSundayUTC(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(Date.UTC(year, month - 1, day))
}

function getSchleswigHolsteinHolidays(year: number) {
  const easterSunday = getEasterSundayUTC(year)

  const holidays = [
    new Date(Date.UTC(year, 0, 1)),
    addDaysUTC(easterSunday, -2),
    addDaysUTC(easterSunday, 1),
    new Date(Date.UTC(year, 4, 1)),
    addDaysUTC(easterSunday, 39),
    addDaysUTC(easterSunday, 50),
    new Date(Date.UTC(year, 9, 3)),
    new Date(Date.UTC(year, 9, 31)),
    new Date(Date.UTC(year, 11, 25)),
    new Date(Date.UTC(year, 11, 26)),
  ]

  return new Set(holidays.map((date) => formatDateUTC(date)))
}

function getBusinessDaysForRange(from: string, to: string, year: number) {
  const holidays = getSchleswigHolsteinHolidays(year)
  const result: string[] = []

  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number)
  const [toYear, toMonth, toDay] = to.split('-').map(Number)

  let current = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay))
  const endExclusive = new Date(Date.UTC(toYear, toMonth - 1, toDay))

  while (current.getTime() < endExclusive.getTime()) {
    const day = current.getUTCDay()
    const dateString = formatDateUTC(current)

    const isWeekend = day === 0 || day === 6
    const isHoliday = holidays.has(dateString)

    if (!isWeekend && !isHoliday) {
      result.push(dateString)
    }

    current = addDaysUTC(current, 1)
  }

  return result
}

function getIsoWeekLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`)
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )

  const dayNr = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNr)

  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  )

  return `KW ${String(weekNo).padStart(2, '0')}`
}

const monthOptions = [
  { value: 'all', label: 'Alle Monate' },
  { value: 1, label: 'Januar' },
  { value: 2, label: 'Februar' },
  { value: 3, label: 'März' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Dezember' },
]

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
  is_active?: boolean | null
}

type Workday = {
  id: string
  employee_id: string
  work_date: string
  calculated_hours: number | null
  absence_type: string | null
}

type AssignmentEntry = {
  id: string
  workday_id: string
  project_id: string
  assigned_hours: number
}

type IncompleteDay = {
  employee_id: string
  employee_label: string
  date: string
  week_label: string
  reason: string
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string
    year?: string
  }>
}) {
  const resolvedSearchParams = await searchParams
  const current = getCurrentMonthAndYear()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-red-600">Kein Benutzer gefunden.</p>
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    return <p className="text-red-600">Profil konnte nicht geladen werden.</p>
  }

  const companyId = profile.company_id

  const selectedMonth = resolvedSearchParams?.month || String(current.month)
  const selectedYear = Number(resolvedSearchParams?.year) || current.year

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, employee_number, full_name, is_active')
    .eq('company_id', companyId)
    .order('employee_number', { ascending: true })

  const { data: allProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id, project_number, name, status')
    .eq('company_id', companyId)
    .order('project_number', { ascending: true })

  const range =
    selectedMonth === 'all'
      ? getYearDateRange(selectedYear)
      : getMonthDateRange(Number(selectedMonth), selectedYear)

  const { data: workdays, error: workdaysError } = await supabase
    .from('employee_workdays')
    .select('id, employee_id, work_date, calculated_hours, absence_type')
    .eq('company_id', companyId)
    .gte('work_date', range.from)
    .lt('work_date', range.to)

  const workdayIds = (workdays ?? []).map((w) => w.id)

  let assignments: AssignmentEntry[] = []

  if (workdayIds.length > 0) {
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('workday_project_entries')
      .select('id, workday_id, project_id, assigned_hours')
      .eq('company_id', companyId)
      .in('workday_id', workdayIds)

    if (assignmentsError) {
      return (
        <p className="text-red-600">
          Fehler Zuordnungen: {assignmentsError.message}
        </p>
      )
    }

    assignments = assignmentsData ?? []
  }

  const projectHoursMap = new Map<string, number>()

  ;(allProjects ?? []).forEach((project) => {
    projectHoursMap.set(project.id, 0)
  })

  assignments.forEach((assignment) => {
    const currentHours = projectHoursMap.get(assignment.project_id) ?? 0
    projectHoursMap.set(
      assignment.project_id,
      currentHours + Number(assignment.assigned_hours)
    )
  })

  const activeProjectHours = (allProjects ?? [])
    .filter((project) => project.status === 'active')
    .map((project) => ({
      project,
      hours: projectHoursMap.get(project.id) ?? 0,
    }))

  const assignmentsByWorkday = new Map<string, AssignmentEntry[]>()
  assignments.forEach((assignment) => {
    const currentEntries = assignmentsByWorkday.get(assignment.workday_id) ?? []
    currentEntries.push(assignment)
    assignmentsByWorkday.set(assignment.workday_id, currentEntries)
  })

  const workdayMap = new Map<string, Workday>()
  ;(workdays ?? []).forEach((workday) => {
    const key = `${workday.employee_id}__${workday.work_date}`
    workdayMap.set(key, workday)
  })

  const activeEmployees = (employees ?? []).filter((employee) => employee.is_active)

  const businessDays = getBusinessDaysForRange(range.from, range.to, selectedYear)

  const expectedPairs = activeEmployees.flatMap((employee) =>
    businessDays.map((date) => ({
      employeeId: employee.id,
      date,
    }))
  )

  const employeeLabelMap = new Map<string, string>()
  ;(employees ?? []).forEach((employee) => {
    employeeLabelMap.set(
      employee.id,
      `${employee.employee_number ?? '—'} – ${employee.full_name}`
    )
  })

  const completedPairs = expectedPairs.filter(({ employeeId, date }) => {
    const key = `${employeeId}__${date}`
    const workday = workdayMap.get(key)

    if (!workday) {
      return false
    }

    if (workday.absence_type && workday.absence_type !== 'wochenende_feiertag') {
      return true
    }

    if (workday.calculated_hours !== null) {
      const entries = assignmentsByWorkday.get(workday.id) ?? []
      const totalAssigned = entries.reduce(
        (sum, entry) => sum + Number(entry.assigned_hours),
        0
      )

      return (
        entries.length > 0 &&
        Number(totalAssigned.toFixed(2)) ===
          Number(Number(workday.calculated_hours).toFixed(2))
      )
    }

    return false
  })

  const incompleteDays: IncompleteDay[] =
    selectedMonth === 'all'
      ? []
      : expectedPairs
          .filter(({ employeeId, date }) => {
            const key = `${employeeId}__${date}`
            const workday = workdayMap.get(key)

            if (!workday) return true

            if (
              workday.absence_type &&
              workday.absence_type !== 'wochenende_feiertag'
            ) {
              return false
            }

            if (workday.calculated_hours !== null) {
              const entries = assignmentsByWorkday.get(workday.id) ?? []
              const totalAssigned = entries.reduce(
                (sum, entry) => sum + Number(entry.assigned_hours),
                0
              )

              const isComplete =
                entries.length > 0 &&
                Number(totalAssigned.toFixed(2)) ===
                  Number(Number(workday.calculated_hours).toFixed(2))

              return !isComplete
            }

            return true
          })
          .map(({ employeeId, date }) => {
            const key = `${employeeId}__${date}`
            const workday = workdayMap.get(key)

            let reason = 'Offener Tag'

            if (!workday) {
              reason = 'Kein Tagesdatensatz vorhanden'
            } else if (
              workday.absence_type &&
              workday.absence_type !== 'wochenende_feiertag'
            ) {
              reason = 'Fehlzeit vorhanden'
            } else if (workday.calculated_hours === null) {
              reason = 'Arbeitszeit unvollständig'
            } else {
              const entries = assignmentsByWorkday.get(workday.id) ?? []
              const totalAssigned = entries.reduce(
                (sum, entry) => sum + Number(entry.assigned_hours),
                0
              )

              if (entries.length === 0) {
                reason = 'Arbeitszeit vorhanden, aber keine Auftragszuordnung'
              } else if (
                Number(totalAssigned.toFixed(2)) !==
                Number(Number(workday.calculated_hours).toFixed(2))
              ) {
                reason = 'Auftragszeiten stimmen nicht mit Arbeitszeit überein'
              }
            }

            return {
              employee_id: employeeId,
              employee_label: employeeLabelMap.get(employeeId) ?? 'Unbekannter Mitarbeiter',
              date,
              week_label: getIsoWeekLabel(date),
              reason,
            }
          })
          .sort((a, b) => {
            if (a.employee_label !== b.employee_label) {
              return a.employee_label.localeCompare(b.employee_label, 'de')
            }

            return a.date.localeCompare(b.date)
          })

  const completionRate =
    expectedPairs.length > 0
      ? Math.round((completedPairs.length / expectedPairs.length) * 100)
      : 0

  const yearOptions = Array.from({ length: 7 }, (_, i) => current.year - 3 + i)

  const totalAssignedHours = assignments.reduce(
    (sum, item) => sum + Number(item.assigned_hours),
    0
  )

  const selectedMonthLabel =
    monthOptions.find((month) => String(month.value) === selectedMonth)?.label ??
    'Monat'

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/40 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              Büro
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Büro-Dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-slate-600">
              Operative Steuerung, zentrale Aktionen und Monitoring für die
              kaufmännische und administrative Pflege des Systems.
            </p>
          </div>

          <form
            method="GET"
            className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-4 backdrop-blur-xl md:grid-cols-3 xl:min-w-[520px]"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Monat
              </label>
              <select
                name="month"
                defaultValue={selectedMonth}
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
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
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-2xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900"
              >
                Anwenden
              </button>
            </div>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-2 text-sm font-medium text-blue-950">
            Gesamtstunden im Zeitraum: {totalAssignedHours.toFixed(2).replace('.', ',')} h
          </div>
          <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-2 text-sm text-slate-700">
            Erwartete Werktage: <span className="font-semibold">{expectedPairs.length}</span>
          </div>
          <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-2 text-sm text-slate-700">
            Vollständige Tage: <span className="font-semibold">{completedPairs.length}</span>
          </div>
          {selectedMonth !== 'all' && (
            <CompletenessCheckModal
              monthLabel={selectedMonthLabel}
              year={selectedYear}
              incompleteDays={incompleteDays}
            />
          )}
          {selectedMonth === 'all' && (
            <CompletenessCheckModal
              monthLabel={selectedMonthLabel}
              year={selectedYear}
              incompleteDays={[]}
              disabled
            />
          )}
        </div>
      </section>

      {employeesError && (
        <p className="text-red-600">Fehler Mitarbeiter: {employeesError.message}</p>
      )}

      {projectsError && (
        <p className="text-red-600">Fehler Aufträge: {projectsError.message}</p>
      )}

      {workdaysError && (
        <p className="text-red-600">Fehler Tagesdaten: {workdaysError.message}</p>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {employees && <WorkdayCreateModal employees={employees as Employee[]} />}

        {employees && <WorkdayImportModal employees={employees as Employee[]} />}

        {employees && (
          <TravelExpenseExportModal employees={employees as Employee[]} />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Monitoring
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Stunden pro Auftrag
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Summe aller verschriebenen Stunden im gewählten Zeitraum. Angezeigt
            werden hier nur aktive Aufträge.
          </p>

          <div className="mt-6 space-y-4">
            {activeProjectHours.length > 0 ? (
              activeProjectHours.map((item) => {
                const maxHours = Math.max(...activeProjectHours.map((p) => p.hours), 1)

                return (
                  <div key={item.project.id}>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-800">
                        {item.project.project_number} – {item.project.name}
                      </p>
                      <p className="text-sm font-semibold text-blue-950">
                        {item.hours.toFixed(2).replace('.', ',')} h
                      </p>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-950"
                        style={{ width: `${(item.hours / maxHours) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/50 px-4 py-6 text-sm text-slate-500">
                Für den gewählten Zeitraum liegen keine aktiven Aufträge vor.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Monitoring
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Vollständigkeit
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Anteil der erwarteten Werktage aktiver Mitarbeiter, die vollständig gepflegt sind.
          </p>

          <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50/60 p-6">
            <div className="flex items-end gap-4">
              <div className="text-5xl font-semibold tracking-tight text-blue-950">
                {completionRate}%
              </div>
              <div className="pb-1 text-sm text-slate-600">
                {completedPairs.length} von {expectedPairs.length} Tagen
              </div>
            </div>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-950 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm text-slate-600">
              Berücksichtigt werden alle Werktage (Mo–Fr) aller aktiven Mitarbeiter
              im gewählten Zeitraum, ausgenommen Feiertage in Schleswig-Holstein.
              Ein Tag zählt nur dann als vollständig, wenn entweder eine Fehlzeit
              gepflegt wurde oder die Arbeitszeit vollständig auf Aufträge
              verschrieben ist.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
