import { createClient } from '@/lib/supabase/server'

export type TravelExpenseEmployeeRow = {
  id: string
  employee_number: string | null
  full_name: string
  cost_center: string | null
}

export type TravelExpenseProfileRow = {
  home_address: string | null
  license_plate: string | null
}

export type TravelExpenseProjectRow = {
  id: string
  project_number: string | null
  name: string
}

export type TravelExpenseEntryRow = {
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

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export function getMonthDateRange(month: number, year: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { from, to }
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function formatWeekday(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`)
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date)
}

export async function getTravelExpenseReportData(
  supabase: SupabaseServerClient,
  companyId: string,
  employeeId: string,
  month: number,
  year: number
) {
  const { from, to } = getMonthDateRange(month, year)

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, employee_number, full_name, cost_center')
    .eq('company_id', companyId)
    .eq('id', employeeId)
    .single<TravelExpenseEmployeeRow>()

  if (employeeError || !employee) {
    throw new Error(employeeError?.message || 'Mitarbeiter nicht gefunden.')
  }

  const { data: travelProfile, error: profileError } = await supabase
    .from('employee_travel_profiles')
    .select('home_address, license_plate')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .maybeSingle<TravelExpenseProfileRow>()

  if (profileError) {
    throw new Error(profileError.message)
  }

  const { data: entries, error: entriesError } = await supabase
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
    .eq('employee_id', employeeId)
    .gte('entry_date', from)
    .lt('entry_date', to)
    .order('entry_date', { ascending: true })
    .returns<TravelExpenseEntryRow[]>()

  if (entriesError) {
    throw new Error(entriesError.message)
  }

  const projectIds = [
    ...new Set((entries ?? []).map((entry) => entry.project_id).filter(Boolean)),
  ] as string[]

  let projects: TravelExpenseProjectRow[] = []

  if (projectIds.length > 0) {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, project_number, name')
      .eq('company_id', companyId)
      .in('id', projectIds)

    if (projectError) {
      throw new Error(projectError.message)
    }

    projects = projectData ?? []
  }

  const projectMap = new Map<string, TravelExpenseProjectRow>()
  projects.forEach((project) => {
    projectMap.set(project.id, project)
  })

  const entryMap = new Map<string, TravelExpenseEntryRow>()
  ;(entries ?? []).forEach((entry) => {
    entryMap.set(entry.entry_date, entry)
  })

  const monthRows = Array.from({ length: getDaysInMonth(year, month) }, (_, index) => {
    const day = index + 1
    const date = new Date(Date.UTC(year, month - 1, day))
    const entryDate = date.toISOString().split('T')[0]

    return {
      entry_date: entryDate,
      weekday: formatWeekday(entryDate),
      entry: entryMap.get(entryDate) ?? null,
    }
  })

  const sumTaxFree = (entries ?? []).reduce(
    (sum, entry) => sum + Number(entry.meal_allowance_tax_free ?? 0),
    0
  )
  const sumTaxable = (entries ?? []).reduce(
    (sum, entry) => sum + Number(entry.meal_allowance_taxable ?? 0),
    0
  )
  const sumKmAllowance = (entries ?? []).reduce(
    (sum, entry) => sum + Number(entry.km_allowance ?? 0),
    0
  )

  return {
    companyId,
    from,
    to,
    employee,
    travelProfile,
    entries: entries ?? [],
    projects,
    projectMap,
    monthRows,
    sums: {
      taxFree: sumTaxFree,
      taxable: sumTaxable,
      kmAllowance: sumKmAllowance,
      total: sumTaxFree + sumTaxable + sumKmAllowance,
    },
  }
}
