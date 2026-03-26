'use server'

import { requireCompanyContext } from '@/lib/auth'
import { revalidatePaths, REVALIDATE_WORKDAYS } from '@/lib/revalidate-paths'

type ForemanEntry = {
  workday_id: string
  project_id: string
  project_lv_position_id: string
  order_position_snapshot: string
  lv_position_snapshot: string
  lv_description_snapshot: string
  assigned_hours: number
}

export async function saveForemanAssignments(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
    'vorarbeiter',
  ])

  const entriesRaw = formData.get('entries')?.toString()

  if (!entriesRaw) {
    throw new Error('Keine Einträge zum Speichern erhalten.')
  }

  let entries: ForemanEntry[]

  try {
    entries = JSON.parse(entriesRaw) as ForemanEntry[]
  } catch {
    throw new Error('Die Auftragszuordnungen konnten nicht verarbeitet werden.')
  }

  if (!entries.length) {
    throw new Error('Es wurden keine gültigen Einträge übergeben.')
  }

  for (const entry of entries) {
    if (
      !entry.workday_id ||
      !entry.project_id ||
      !entry.project_lv_position_id ||
      !entry.order_position_snapshot ||
      !entry.lv_position_snapshot ||
      !entry.lv_description_snapshot ||
      !Number.isFinite(entry.assigned_hours) ||
      entry.assigned_hours <= 0
    ) {
      throw new Error('Ein oder mehrere Einträge sind unvollständig.')
    }
  }

  const uniqueWorkdayIds = [...new Set(entries.map((entry) => entry.workday_id))]
  const uniqueProjectIds = [...new Set(entries.map((entry) => entry.project_id))]
  const uniqueLvPositionIds = [
    ...new Set(entries.map((entry) => entry.project_lv_position_id)),
  ]

  const { data: validWorkdays, error: workdaysError } = await supabase
    .from('employee_workdays')
    .select('id, calculated_hours')
    .eq('company_id', companyId)
    .in('id', uniqueWorkdayIds)

  if (workdaysError) {
    throw new Error(workdaysError.message)
  }

  if ((validWorkdays ?? []).length !== uniqueWorkdayIds.length) {
    throw new Error('Mindestens ein Arbeitstag gehört nicht zu deiner Firma.')
  }

  const { data: validProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .eq('company_id', companyId)
    .in('id', uniqueProjectIds)

  if (projectsError) {
    throw new Error(projectsError.message)
  }

  if ((validProjects ?? []).length !== uniqueProjectIds.length) {
    throw new Error('Mindestens ein Auftrag gehört nicht zu deiner Firma.')
  }

  const { data: validLvPositions, error: lvError } = await supabase
    .from('project_lv_positions')
    .select('id, project_id')
    .eq('company_id', companyId)
    .in('id', uniqueLvPositionIds)

  if (lvError) {
    throw new Error(lvError.message)
  }

  if ((validLvPositions ?? []).length !== uniqueLvPositionIds.length) {
    throw new Error('Mindestens eine LV-Position gehört nicht zu deiner Firma.')
  }

  const workdayHoursMap = new Map<string, number>()
  ;(validWorkdays ?? []).forEach((workday) => {
    workdayHoursMap.set(workday.id, Number(workday.calculated_hours ?? 0))
  })

  const lvProjectMap = new Map<string, string>()
  ;(validLvPositions ?? []).forEach((position) => {
    lvProjectMap.set(position.id, position.project_id)
  })

  const seenAssignmentKeys = new Set<string>()
  const totalHoursByWorkday = new Map<string, number>()

  for (const entry of entries) {
    const expectedProjectId = lvProjectMap.get(entry.project_lv_position_id)

    if (expectedProjectId !== entry.project_id) {
      throw new Error('Mindestens eine LV-Position passt nicht zum gewählten Auftrag.')
    }

    const assignmentKey = `${entry.workday_id}__${entry.project_lv_position_id}`
    if (seenAssignmentKeys.has(assignmentKey)) {
      throw new Error('Eine LV-Position wurde an einem Arbeitstag mehrfach zugeordnet.')
    }

    seenAssignmentKeys.add(assignmentKey)

    totalHoursByWorkday.set(
      entry.workday_id,
      (totalHoursByWorkday.get(entry.workday_id) ?? 0) + entry.assigned_hours
    )
  }

  for (const [workdayId, assignedHours] of totalHoursByWorkday.entries()) {
    const availableHours = workdayHoursMap.get(workdayId) ?? 0

    if (assignedHours > availableHours + 0.01) {
      throw new Error(
        'Die Summe der zugeordneten Stunden überschreitet bei mindestens einem Arbeitstag die erfasste Arbeitszeit.'
      )
    }
  }

  const { error: replaceError } = await supabase.rpc(
    'replace_workday_project_entries',
    {
      p_company_id: companyId,
      p_workday_ids: uniqueWorkdayIds,
      p_entries: entries,
    }
  )

  if (replaceError) {
    throw new Error(replaceError.message)
  }

  revalidatePaths(REVALIDATE_WORKDAYS)
}
