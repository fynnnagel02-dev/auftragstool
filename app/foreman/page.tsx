import { createClient } from '@/lib/supabase/server'
import ForemanAssignmentForm from '@/components/foreman-assignment-form'

function getCurrentWeekString() {
  const now = new Date()
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(
    (((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7
  )

  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getWeekDateRange(weekString: string) {
  const [yearPart, weekPart] = weekString.split('-W')
  const year = Number(yearPart)
  const week = Number(weekPart)

  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dayOfWeek = simple.getDay()
  const monday = new Date(simple)

  if (dayOfWeek <= 4) {
    monday.setDate(simple.getDate() - simple.getDay() + 1)
  } else {
    monday.setDate(simple.getDate() + 8 - simple.getDay())
  }

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 7)

  const from = monday.toISOString().split('T')[0]
  const to = sunday.toISOString().split('T')[0]

  return { from, to }
}

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
}

type FilterGroup = {
  id: string
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
  employee_label: string
}

export default async function ForemanPage({
  searchParams,
}: {
  searchParams?: Promise<{
    employeeId?: string
    groupId?: string
    week?: string
  }>
}) {
  const resolvedSearchParams = await searchParams
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

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_number, full_name')
    .eq('company_id', companyId)
    .order('employee_number', { ascending: true })

  const { data: filterGroups } = await supabase
    .from('employee_filter_groups')
    .select('id, name')
    .eq('company_id', companyId)
    .order('name', { ascending: true })

  const selectedWeek = resolvedSearchParams?.week || getCurrentWeekString()
  const { from, to } = getWeekDateRange(selectedWeek)

  const selectedGroupId = resolvedSearchParams?.groupId || ''
  const selectedEmployeeId =
    resolvedSearchParams?.employeeId || employees?.[0]?.id || ''

  let selectedEmployeeIds: string[] = []

  if (selectedGroupId) {
    const { data: groupMembers } = await supabase
      .from('employee_filter_group_members')
      .select('employee_id')
      .eq('group_id', selectedGroupId)

    selectedEmployeeIds = (groupMembers ?? []).map((member) => member.employee_id)
  } else if (selectedEmployeeId) {
    selectedEmployeeIds = [selectedEmployeeId]
  }

  let workdays: Workday[] = []

  if (selectedEmployeeIds.length > 0) {
    const { data: workdaysData } = await supabase
      .from('employee_workdays')
      .select(
        `
        id,
        employee_id,
        work_date,
        start_time,
        end_time,
        calculated_hours,
        absence_type
      `
      )
      .in('employee_id', selectedEmployeeIds)
      .gte('work_date', from)
      .lt('work_date', to)
      .order('work_date', { ascending: true })

    const employeeMap = new Map<string, string>()
    ;(employees ?? []).forEach((employee) => {
      employeeMap.set(
        employee.id,
        `${employee.employee_number} – ${employee.full_name}`
      )
    })

    workdays = (workdaysData ?? []).map((workday) => ({
      ...workday,
      employee_label: employeeMap.get(workday.employee_id) || 'Unbekannter Mitarbeiter',
    }))
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_number, name')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('project_number', { ascending: true })

  const { data: lvPositions } = await supabase
    .from('project_lv_positions')
    .select('id, project_id, order_position, lv_position, lv_description, is_active')
    .order('order_position', { ascending: true })

  const workdayIds = workdays.map((w) => w.id)

  const { data: existingEntries } = await supabase
    .from('workday_project_entries')
    .select('workday_id, project_id, project_lv_position_id, assigned_hours')
    .in('workday_id', workdayIds.length > 0 ? workdayIds : ['00000000-0000-0000-0000-000000000000'])

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Vorarbeiter
      </p>

      <h1 className="mt-2 text-3xl font-semibold text-slate-900">
        Vorarbeiter-Dashboard
      </h1>

      <p className="mt-4 max-w-2xl text-slate-600">
        Ordne die erfassten Arbeitszeiten eines Mitarbeiters oder einer
        Filtergruppe innerhalb einer Kalenderwoche den passenden Aufträgen und
        LV-Positionen zu.
      </p>

      {employees && projects && lvPositions && existingEntries && filterGroups && (
        <div className="mt-8">
          <ForemanAssignmentForm
            employees={employees}
            filterGroups={filterGroups}
            selectedEmployeeId={selectedEmployeeId}
            selectedGroupId={selectedGroupId}
            selectedWeek={selectedWeek}
            workdays={workdays}
            projects={projects}
            lvPositions={lvPositions}
            existingEntries={existingEntries}
          />
        </div>
      )}
    </div>
  )
}