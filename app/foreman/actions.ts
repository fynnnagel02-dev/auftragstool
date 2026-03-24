'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ForemanEntry = {
  workday_id: string
  project_id: string
  project_lv_position_id: string
  order_position_snapshot: string
  lv_position_snapshot: string
  lv_description_snapshot: string
  assigned_hours: number
}

async function getCurrentCompanyContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Nicht eingeloggt.')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (error || !profile?.company_id) {
    throw new Error('Company konnte nicht ermittelt werden.')
  }

  return {
    supabase,
    companyId: profile.company_id,
  }
}

export async function saveForemanAssignments(formData: FormData) {
  const { supabase, companyId } = await getCurrentCompanyContext()

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
      !entry.assigned_hours
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
    .select('id')
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
    .select('id')
    .eq('company_id', companyId)
    .in('id', uniqueLvPositionIds)

  if (lvError) {
    throw new Error(lvError.message)
  }

  if ((validLvPositions ?? []).length !== uniqueLvPositionIds.length) {
    throw new Error('Mindestens eine LV-Position gehört nicht zu deiner Firma.')
  }

  for (const workdayId of uniqueWorkdayIds) {
    const { error: deleteError } = await supabase
      .from('workday_project_entries')
      .delete()
      .eq('company_id', companyId)
      .eq('workday_id', workdayId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }

  const { error: insertError } = await supabase
    .from('workday_project_entries')
    .insert(
      entries.map((entry) => ({
        company_id: companyId,
        workday_id: entry.workday_id,
        project_id: entry.project_id,
        project_lv_position_id: entry.project_lv_position_id,
        order_position_snapshot: entry.order_position_snapshot,
        lv_position_snapshot: entry.lv_position_snapshot,
        lv_description_snapshot: entry.lv_description_snapshot,
        assigned_hours: entry.assigned_hours,
      }))
    )

  if (insertError) {
    throw new Error(insertError.message)
  }

  revalidatePath('/foreman')
  revalidatePath('/datensammlung')
  revalidatePath('/admin')
  revalidatePath('/kpi-dashboard')
}