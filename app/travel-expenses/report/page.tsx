import { createClient } from '@/lib/supabase/server'
import AutoPrint from '@/components/auto-print'
import ReportPrintButton from '@/components/report-print-button'

const monthNames = [
  '',
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

function getMonthDateRange(month: number, year: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { from, to }
}

function formatWeekday(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`)
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date)
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return ''
  return value.toFixed(2).replace('.', ',')
}

type EmployeeRow = {
  id: string
  employee_number: string | null
  full_name: string
  cost_center: string | null
}

type TravelProfileRow = {
  home_address: string | null
  license_plate: string | null
}

type ProjectRow = {
  id: string
  project_number: string | null
  name: string
}

type TravelExpenseEntry = {
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

export default async function TravelExpenseReportPage({
  searchParams,
}: {
  searchParams?: Promise<{
    employeeId?: string
    month?: string
    year?: string
    autoprint?: string
  }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()

  const employeeId = resolvedSearchParams?.employeeId || ''
  const month = Number(resolvedSearchParams?.month)
  const year = Number(resolvedSearchParams?.year)
  const autoPrint = resolvedSearchParams?.autoprint === '1'

  if (!employeeId || !month || !year) {
    return <p className="p-8 text-red-600">Fehlende Exportparameter.</p>
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <p className="p-8 text-red-600">Nicht eingeloggt.</p>
  }

  const { data: profileRow, error: profileRowError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileRowError || !profileRow?.company_id) {
    return <p className="p-8 text-red-600">Profil konnte nicht geladen werden.</p>
  }

  const companyId = profileRow.company_id
  const { from, to } = getMonthDateRange(month, year)

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, employee_number, full_name, cost_center')
    .eq('company_id', companyId)
    .eq('id', employeeId)
    .single<EmployeeRow>()

  if (employeeError || !employee) {
    return (
      <p className="p-8 text-red-600">
        Fehler Mitarbeiter: {employeeError?.message || 'Nicht gefunden'}
      </p>
    )
  }

  const { data: travelProfile, error: profileError } = await supabase
    .from('employee_travel_profiles')
    .select('home_address, license_plate')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .maybeSingle<TravelProfileRow>()

  if (profileError) {
    return (
      <p className="p-8 text-red-600">
        Fehler Reisekosten-Profil: {profileError.message}
      </p>
    )
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
    .returns<TravelExpenseEntry[]>()

  if (entriesError) {
    return (
      <p className="p-8 text-red-600">
        Fehler Reisekosten-Einträge: {entriesError.message}
      </p>
    )
  }

  const projectIds = [
    ...new Set((entries ?? []).map((entry) => entry.project_id).filter(Boolean)),
  ] as string[]

  let projects: ProjectRow[] = []

  if (projectIds.length > 0) {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, project_number, name')
      .eq('company_id', companyId)
      .in('id', projectIds)

    if (projectError) {
      return (
        <p className="p-8 text-red-600">
          Fehler Aufträge: {projectError.message}
        </p>
      )
    }

    projects = projectData ?? []
  }

  const projectMap = new Map<string, ProjectRow>()
  projects.forEach((project) => {
    projectMap.set(project.id, project)
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

  const reimbursementTotal = sumTaxFree + sumTaxable + sumKmAllowance

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      <AutoPrint enabled={autoPrint} />

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1600px] p-6 print:max-w-none print:p-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-semibold text-slate-900">
            Reisekostenreport
          </h1>

          <div className="flex items-center gap-3">
            <ReportPrintButton />
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="border-b border-slate-200 pb-5">
            <div className="flex items-start justify-between gap-8">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                  Reisekostenabrechnung
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                  {monthNames[month]} {year}
                </h1>
              </div>

              <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="font-medium text-slate-500">Name: </span>
                  <span>{employee.full_name}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-500">
                    Personalnummer:{' '}
                  </span>
                  <span>{employee.employee_number || '—'}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-500">
                    Kostenstelle:{' '}
                  </span>
                  <span>{employee.cost_center || '—'}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-500">Wohnort: </span>
                  <span>{travelProfile?.home_address || '—'}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-500">
                    KFZ-Kennzeichen:{' '}
                  </span>
                  <span>{travelProfile?.license_plate || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[1800px] w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Wochentag
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Datum
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Abfahrt
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Baustelle / Zielort
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Auftrag
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Rückkehr
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Abwesen von
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Anwesen bis
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-right font-medium">
                    Private Kilometer
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-right font-medium">
                    Verpflegung steuerfrei
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-right font-medium">
                    Verpflegung steuerpflichtig
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Übernachtung
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Verkostung
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-left font-medium">
                    Datum steuerpfl. ab
                  </th>
                  <th className="border border-slate-200 px-2 py-2 text-right font-medium">
                    KM-Vergütung
                  </th>
                </tr>
              </thead>

              <tbody>
                {(entries ?? []).map((entry) => {
                  const project = entry.project_id
                    ? projectMap.get(entry.project_id)
                    : null

                  return (
                    <tr key={entry.entry_date}>
                      <td className="border border-slate-200 px-2 py-2">
                        {formatWeekday(entry.entry_date)}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {entry.entry_date}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {entry.departure_type || ''}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {entry.destination_text || ''}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {project
                          ? `${project.project_number} – ${project.name}`
                          : ''}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {entry.return_type || ''}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {entry.absence_from || ''}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {entry.presence_until || ''}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-right">
                        {formatNumber(entry.private_kilometers)}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-right">
                        {formatNumber(entry.meal_allowance_tax_free)}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-right">
                        {formatNumber(entry.meal_allowance_taxable)}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {entry.overnight_type || ''}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {entry.catering_type || ''}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {entry.taxable_from_date_text || ''}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-right">
                        {formatNumber(entry.km_allowance)}
                      </td>
                    </tr>
                  )
                })}

                {(entries ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={15}
                      className="border border-slate-200 px-2 py-6 text-center text-slate-500"
                    >
                      Für den gewählten Monat liegen keine Reisekostendaten vor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[1.6fr_1fr] border-b border-slate-200 bg-slate-50">
                <div className="px-4 py-3 text-sm font-medium text-slate-700">
                  Zwischensumme Verpflegungspauschale steuerfrei
                </div>
                <div className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                  {formatNumber(sumTaxFree)} €
                </div>
              </div>

              <div className="grid grid-cols-[1.6fr_1fr] border-b border-slate-200">
                <div className="px-4 py-3 text-sm font-medium text-slate-700">
                  Zwischensumme Verpflegungspauschale steuerpflichtig
                </div>
                <div className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                  {formatNumber(sumTaxable)} €
                </div>
              </div>

              <div className="grid grid-cols-[1.6fr_1fr] border-b border-slate-200">
                <div className="px-4 py-3 text-sm font-medium text-slate-700">
                  Zwischensumme KM-Vergütung
                </div>
                <div className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                  {formatNumber(sumKmAllowance)} €
                </div>
              </div>

              <div className="grid grid-cols-[1.6fr_1fr] bg-blue-50/70">
                <div className="px-4 py-3 text-base font-semibold text-slate-900">
                  Erstattungsbetrag
                </div>
                <div className="px-4 py-3 text-right text-base font-semibold text-blue-950">
                  {formatNumber(reimbursementTotal)} €
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {[
              'Abrechner',
              'direkter Vorgesetzter',
              'Geschäftsführer / Vertreter',
              'RK-Ersteller / Vertreter',
            ].map((label) => (
              <div key={label}>
                <div className="h-16 border-b border-slate-400" />
                <div className="mt-3 text-sm text-slate-700">{label}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Datum / Unterschrift
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}