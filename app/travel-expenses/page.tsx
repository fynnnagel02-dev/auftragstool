import { createClient } from '@/lib/supabase/server'
import TravelExpenseMonthForm from '@/components/travel-expense-month-form'

function getCurrentMonthAndYear() {
  const now = new Date()
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

export default async function TravelExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    employeeId?: string
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

  const { data: profileRow, error: profileRowError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileRowError || !profileRow?.company_id) {
    return <p className="text-red-600">Profil konnte nicht geladen werden.</p>
  }

  const companyId = profileRow.company_id

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, employee_number, full_name')
    .eq('company_id', companyId)
    .order('employee_number', { ascending: true })

  if (employeesError) {
    return (
      <p className="text-red-600">Fehler Mitarbeiter: {employeesError.message}</p>
    )
  }

  const selectedEmployeeId =
    resolvedSearchParams?.employeeId || employees?.[0]?.id || ''
  const selectedMonth = Number(resolvedSearchParams?.month) || current.month
  const selectedYear = Number(resolvedSearchParams?.year) || current.year

  const monthFrom = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1
  const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear
  const monthTo = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, project_number, name')
    .eq('company_id', companyId)
    .order('project_number', { ascending: true })

  if (projectsError) {
    return <p className="text-red-600">Fehler Aufträge: {projectsError.message}</p>
  }

  const { data: travelProfile, error: profileError } = await supabase
    .from('employee_travel_profiles')
    .select('distance_home_company_km')
    .eq('company_id', companyId)
    .eq('employee_id', selectedEmployeeId)
    .maybeSingle()

  if (profileError) {
    return (
      <p className="text-red-600">Fehler Reisekosten-Profil: {profileError.message}</p>
    )
  }

  const { data: routes, error: routesError } = await supabase
    .from('employee_travel_project_routes')
    .select('project_id, distance_home_project_km')
    .eq('company_id', companyId)
    .eq('employee_id', selectedEmployeeId)

  if (routesError) {
    return (
      <p className="text-red-600">Fehler Reisekosten-Routen: {routesError.message}</p>
    )
  }

  const { data: existingEntries, error: entriesError } = await supabase
    .from('travel_expense_entries')
    .select(
      `
        entry_date,
        project_id,
        departure_type,
        destination_text,
        return_type,
        absence_from,
        presence_until,
        overnight_type,
        catering_type,
        private_kilometers,
        meal_allowance_tax_free,
        meal_allowance_taxable,
        taxable_from_date_text,
        km_allowance
      `
    )
    .eq('company_id', companyId)
    .eq('employee_id', selectedEmployeeId)
    .gte('entry_date', monthFrom)
    .lt('entry_date', monthTo)
    .order('entry_date', { ascending: true })

  if (entriesError) {
    return (
      <p className="text-red-600">Fehler Reisekosten-Einträge: {entriesError.message}</p>
    )
  }

  const { data: workdays, error: workdaysError } = await supabase
    .from('employee_workdays')
    .select('id, work_date')
    .eq('company_id', companyId)
    .eq('employee_id', selectedEmployeeId)
    .gte('work_date', monthFrom)
    .lt('work_date', monthTo)

  if (workdaysError) {
    return <p className="text-red-600">Fehler Tagesdaten: {workdaysError.message}</p>
  }

  const workdayIds = (workdays ?? []).map((workday) => workday.id)

  let defaultProjectByDate: Record<string, string> = {}

  if (workdayIds.length > 0) {
    const { data: assignmentEntries, error: assignmentError } = await supabase
      .from('workday_project_entries')
      .select('workday_id, project_id, created_at')
      .eq('company_id', companyId)
      .in('workday_id', workdayIds)
      .order('created_at', { ascending: true })

    if (assignmentError) {
      return (
        <p className="text-red-600">
          Fehler Auftragszuordnung: {assignmentError.message}
        </p>
      )
    }

    const workdayDateMap = new Map<string, string>()
    ;(workdays ?? []).forEach((workday) => {
      workdayDateMap.set(workday.id, workday.work_date)
    })

    for (const assignment of assignmentEntries ?? []) {
      const date = workdayDateMap.get(assignment.workday_id)
      if (!date) continue

      if (!defaultProjectByDate[date]) {
        defaultProjectByDate[date] = assignment.project_id
      }
    }
  }

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Reisekosten
      </p>

      <div className="mt-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          Reisekosten-Erfassung
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Hier werden die operativen Monatsdaten für Reisekosten gepflegt.
          Wochentag und Datum sind vorausgefüllt, Aufträge werden aus der
          Datensammlung vorgeschlagen und Kilometer automatisch berechnet.
        </p>
      </div>

      <div className="mt-8">
        <TravelExpenseMonthForm
          employees={employees ?? []}
          projects={projects ?? []}
          selectedEmployeeId={selectedEmployeeId}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          profile={travelProfile}
          routes={routes ?? []}
          existingEntries={existingEntries ?? []}
          defaultProjectByDate={defaultProjectByDate}
        />
      </div>
    </div>
  )
}