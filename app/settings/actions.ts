'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createEmployeeFilterGroup(formData: FormData) {
  const supabase = await createClient()

  const companyId = formData.get('companyId')?.toString().trim()
  const name = formData.get('name')?.toString().trim()
  const description = formData.get('description')?.toString().trim() || null

  if (!companyId || !name) {
    throw new Error('Bitte Gruppennamen ausfüllen.')
  }

  const { error } = await supabase.from('employee_filter_groups').insert({
    company_id: companyId,
    name,
    description,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/settings')
}

export async function updateEmployeeFilterGroup(formData: FormData) {
  const supabase = await createClient()

  const groupId = formData.get('groupId')?.toString().trim()
  const name = formData.get('name')?.toString().trim()
  const description = formData.get('description')?.toString().trim() || null

  if (!groupId || !name) {
    throw new Error('Bitte Gruppennamen ausfüllen.')
  }

  const { error } = await supabase
    .from('employee_filter_groups')
    .update({
      name,
      description,
    })
    .eq('id', groupId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/settings')
}

export async function deleteEmployeeFilterGroup(groupId: string) {
  const supabase = await createClient()

  if (!groupId) {
    throw new Error('Keine Filtergruppe angegeben.')
  }

  const { error } = await supabase
    .from('employee_filter_groups')
    .delete()
    .eq('id', groupId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/settings')
}

export async function saveEmployeeFilterGroupMembers(formData: FormData) {
  const supabase = await createClient()

  const groupId = formData.get('groupId')?.toString().trim()

  if (!groupId) {
    throw new Error('Keine Filtergruppe angegeben.')
  }

  const selectedEmployeeIds = formData.getAll('employeeIds').map(String)

  const { error: deleteError } = await supabase
    .from('employee_filter_group_members')
    .delete()
    .eq('group_id', groupId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (selectedEmployeeIds.length > 0) {
    const rows = selectedEmployeeIds.map((employeeId) => ({
      group_id: groupId,
      employee_id: employeeId,
    }))

    const { error: insertError } = await supabase
      .from('employee_filter_group_members')
      .insert(rows)

    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  revalidatePath('/settings')
}