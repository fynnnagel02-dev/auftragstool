'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'

export async function saveForemanAssignments(formData: FormData) {
  const entriesRaw = formData.get('entries')?.toString()

  if (!entriesRaw) {
    throw new Error('Keine Einträge zum Speichern erhalten.')
  }

  const entries = JSON.parse(entriesRaw) as Array<{
    workday_id: string
    project_id: string
    project_lv_position_id: string
    order_position_snapshot: string
    lv_position_snapshot: string
    lv_description_snapshot: string
    assigned_hours: number
  }>

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

  for (const workdayId of uniqueWorkdayIds) {
    const { error: deleteError } = await supabase
      .from('workday_project_entries')
      .delete()
      .eq('workday_id', workdayId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }

  const { error: insertError } = await supabase
    .from('workday_project_entries')
    .insert(entries)

  if (insertError) {
    throw new Error(insertError.message)
  }

  revalidatePath('/foreman')
  revalidatePath('/datensammlung')
}