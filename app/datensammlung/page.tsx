import { supabase } from '@/lib/supabase'
import WorkdayEditModal from '@/components/workday-edit-modal'

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

const monthOptions = [
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
}

type Project = {
  id: string
  project_number: string | null
  name: string
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
  employees:
    | {
        employee_number: string | null
        full_name: string
      }
    | {
        employee_number: string | null
        full_name: string
      }[]
    | null
}

type WorkdayProjectEntry = {
  id: string
  workday_id: string
  project_id: string
  order_position_snapshot: string
  lv_position_snapshot: string
  lv_description_snapshot: string
  assigned_hours: number
}

export default async function DatensammlungPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string
    year?: string
    employeeId?: string
  }>
}) {
  const resolvedSearchParams = await searchParams
  const current = getCurrentMonthAndYear()

  const selectedMonth = Number(resolvedSearchParams?.month) || current.month
  const selectedYear = Number(resolvedSearchParams?.year) || current.year
  const selectedEmployeeId = resolvedSearchParams?.employeeId || 'all'

  const { from, to } = getMonthDateRange(selectedMonth, selectedYear)

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, employee_number, full_name')
    .order('employee_number', { ascending: true })

  let workdaysQuery = supabase
    .from('employee_workdays')
    .select(
      `
        id,
        employee_id,
        work_date,
        start_time,
        end_time,
        calculated_hours,
        absence_type,
        note,
        employees (
          employee_number,
          full_name
        )
      `
    )
    .gte('work_date', from)
    .lt('work_date', to)
    .order('work_date', { ascending: false })

  if (selectedEmployeeId !== 'all') {
    workdaysQuery = workdaysQuery.eq('employee_id', selectedEmployeeId)
  }

  const { data: workdays, error } = await workdaysQuery

  const workdayIds = (workdays ?? []).map((w) => w.id)

  let assignmentEntries: WorkdayProjectEntry[] = []
  let projects: Project[] = []

  if (workdayIds.length > 0) {
    const { data: entriesData, error: entriesError } = await supabase
      .from('workday_project_entries')
      .select(
        `
          id,
          workday_id,
          project_id,
          order_position_snapshot,
          lv_position_snapshot,
          lv_description_snapshot,
          assigned_hours
        `
      )
      .in('workday_id', workdayIds)

    if (entriesError) {
      return (
        <p className="text-red-600">
          Fehler Zuordnungen: {entriesError.message}
        </p>
      )
    }

    assignmentEntries = entriesData ?? []

    const projectIds = [...new Set(assignmentEntries.map((entry) => entry.project_id))]

    if (projectIds.length > 0) {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_number, name')
        .in('id', projectIds)

      if (projectsError) {
        return (
          <p className="text-red-600">
            Fehler Aufträge: {projectsError.message}
          </p>
        )
      }

      projects = projectsData ?? []
    }
  }

  const assignmentMap = new Map<string, WorkdayProjectEntry[]>()

  assignmentEntries.forEach((entry) => {
    const currentEntries = assignmentMap.get(entry.workday_id) ?? []
    currentEntries.push(entry)
    assignmentMap.set(entry.workday_id, currentEntries)
  })

  const projectMap = new Map<string, Project>()
  projects.forEach((project) => {
    projectMap.set(project.id, project)
  })

  const yearOptions = Array.from({ length: 7 }, (_, i) => current.year - 3 + i)

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Datensammlung
      </p>

      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Tagesdatenübersicht
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Übersicht aller erfassten Arbeitszeiten, Fehlzeiten und
            Auftragszuordnungen für den ausgewählten Monat.
          </p>
        </div>

        <form
          method="GET"
          className="flex flex-col gap-3 rounded-3xl border border-white/40 bg-white/60 p-4 backdrop-blur-xl sm:flex-row sm:flex-wrap sm:items-end"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Monat
            </label>
            <select
              name="month"
              defaultValue={String(selectedMonth)}
              className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
              className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Mitarbeiter
            </label>
            <select
              name="employeeId"
              defaultValue={selectedEmployeeId}
              className="min-w-[240px] rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Alle anzeigen</option>
              {(employees ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employee_number} – {employee.full_name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900"
          >
            Anzeigen
          </button>
        </form>
      </div>

      {error && (
        <p className="mt-6 text-red-600">Fehler Tagesdaten: {error.message}</p>
      )}

      {employeesError && (
        <p className="mt-6 text-red-600">
          Fehler Mitarbeiter: {employeesError.message}
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl max-h-[70vh]">
        <table className="min-w-[1900px] w-full text-left text-sm">
          <thead className="sticky top-0 z-20 border-b border-white/40 bg-slate-50/95 text-slate-500 backdrop-blur">
            <tr>
              <th className="px-4 py-3 font-medium">Mitarbeiter</th>
              <th className="px-4 py-3 font-medium">Datum</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">Ende</th>
              <th className="px-4 py-3 font-medium">Arbeitszeit</th>
              <th className="px-4 py-3 font-medium">Fehlzeit</th>

              <th className="px-4 py-3 font-medium">Auftrag 1</th>
              <th className="px-4 py-3 font-medium">LV 1</th>
              <th className="px-4 py-3 font-medium">Bezeichnung 1</th>
              <th className="px-4 py-3 font-medium">Auftragszeit 1</th>

              <th className="px-4 py-3 font-medium">Auftrag 2</th>
              <th className="px-4 py-3 font-medium">LV 2</th>
              <th className="px-4 py-3 font-medium">Bezeichnung 2</th>
              <th className="px-4 py-3 font-medium">Auftragszeit 2</th>

              <th className="px-4 py-3 font-medium">Notiz</th>
              <th className="px-4 py-3 font-medium">Aktion</th>
            </tr>
          </thead>

          <tbody>
            {(workdays ?? []).map((workday) => {
              const employee = Array.isArray(workday.employees)
                ? workday.employees[0]
                : workday.employees

              const assignments = assignmentMap.get(workday.id) ?? []
              const first = assignments[0]
              const second = assignments[1]

              const firstProject = first ? projectMap.get(first.project_id) : null
              const secondProject = second ? projectMap.get(second.project_id) : null

              return (
                <tr
                  key={workday.id}
                  className="border-b border-white/30 align-top hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3">
                    {employee
                      ? `${employee.employee_number} – ${employee.full_name}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{workday.work_date}</td>
                  <td className="px-4 py-3">{workday.start_time || '—'}</td>
                  <td className="px-4 py-3">{workday.end_time || '—'}</td>
                  <td className="px-4 py-3">
                    {workday.calculated_hours !== null
                      ? `${workday.calculated_hours} h`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{workday.absence_type || '—'}</td>

                  <td className="px-4 py-3">
                    {firstProject
                      ? `${firstProject.project_number} – ${firstProject.name}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {first?.lv_position_snapshot || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {first?.lv_description_snapshot || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {first ? `${first.assigned_hours} h` : '—'}
                  </td>

                  <td className="px-4 py-3">
                    {secondProject
                      ? `${secondProject.project_number} – ${secondProject.name}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {second?.lv_position_snapshot || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {second?.lv_description_snapshot || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {second ? `${second.assigned_hours} h` : '—'}
                  </td>

                  <td className="px-4 py-3">{workday.note || '—'}</td>
                  <td className="px-4 py-3">
                    {employees && (
                      <WorkdayEditModal
                        employees={employees as Employee[]}
                        workday={{
                          id: workday.id,
                          employee_id: workday.employee_id,
                          work_date: workday.work_date,
                          start_time: workday.start_time,
                          end_time: workday.end_time,
                          calculated_hours: workday.calculated_hours,
                          absence_type: workday.absence_type,
                          note: workday.note,
                        }}
                      />
                    )}
                  </td>
                </tr>
              )
            })}

            {(workdays ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={16}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Für den gewählten Filter sind keine Daten vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}