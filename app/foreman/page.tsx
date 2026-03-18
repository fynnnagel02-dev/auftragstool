import { supabase } from '@/lib/supabase'
import ForemanAssignmentForm from '@/components/foreman-assignment-form'

function getCurrentWeekString() {
  const now = new Date()
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)

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

export default async function ForemanPage({
  searchParams,
}: {
  searchParams?: Promise<{
    employeeId?: string
    week?: string
  }>
}) {
  const resolvedSearchParams = await searchParams

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_number, full_name')
    .order('employee_number', { ascending: true })

  const selectedEmployeeId =
    resolvedSearchParams?.employeeId || employees?.[0]?.id || ''

  const selectedWeek = resolvedSearchParams?.week || getCurrentWeekString()
  const { from, to } = getWeekDateRange(selectedWeek)

  const { data: workdays } = await supabase
    .from('employee_workdays')
    .select('id, work_date, start_time, end_time, calculated_hours, absence_type')
    .eq('employee_id', selectedEmployeeId)
    .gte('work_date', from)
    .lt('work_date', to)
    .order('work_date', { ascending: true })

  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_number, name')
    .eq('status', 'active')
    .order('project_number', { ascending: true })

  const { data: lvPositions } = await supabase
    .from('project_lv_positions')
    .select('id, project_id, order_position, lv_position, lv_description, is_active')
    .order('order_position', { ascending: true })

  const { data: existingEntries } = await supabase
    .from('workday_project_entries')
    .select('workday_id, project_id, project_lv_position_id, assigned_hours')
    .in('workday_id', (workdays ?? []).map((w) => w.id))

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Vorarbeiter
      </p>

      <h1 className="mt-2 text-3xl font-semibold text-slate-900">
        Vorarbeiter-Dashboard
      </h1>

      <p className="mt-4 max-w-2xl text-slate-600">
        Ordne die erfassten Arbeitszeiten eines Mitarbeiters und einer Kalenderwoche
        den passenden Aufträgen und LV-Positionen zu.
      </p>

      {employees && projects && lvPositions && workdays && existingEntries && (
        <div className="mt-8">
          <ForemanAssignmentForm
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
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