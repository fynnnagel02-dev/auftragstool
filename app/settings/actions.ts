'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (error || !profile?.company_id) {
    throw new Error('Company konnte nicht ermittelt werden.')
  }

  if (profile.role !== 'admin' && profile.role !== 'geschaeftsfuehrer') {
    throw new Error('Keine Berechtigung für Einstellungen.')
  }

  return {
    supabase,
    companyId: profile.company_id,
  }
}

export async function createEmployeeFilterGroup(formData: FormData) {
  const { supabase, companyId } = await getCurrentCompanyContext()

  const name = formData.get('name')?.toString().trim()
  const description = formData.get('description')?.toString().trim() || null

  if (!name) {
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
  revalidatePath('/foreman')
}

export async function updateEmployeeFilterGroup(formData: FormData) {
  const { supabase, companyId } = await getCurrentCompanyContext()

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
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/settings')
  revalidatePath('/foreman')
}

export async function deleteEmployeeFilterGroup(groupId: string) {
  const { supabase, companyId } = await getCurrentCompanyContext()

  if (!groupId) {
    throw new Error('Keine Filtergruppe angegeben.')
  }

  const { error } = await supabase
    .from('employee_filter_groups')
    .delete()
    .eq('id', groupId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/settings')
  revalidatePath('/foreman')
}

export async function saveEmployeeFilterGroupMembers(formData: FormData) {
  const { supabase, companyId } = await getCurrentCompanyContext()

  const groupId = formData.get('groupId')?.toString().trim()

  if (!groupId) {
    throw new Error('Keine Filtergruppe angegeben.')
  }

  const { data: group, error: groupError } = await supabase
    .from('employee_filter_groups')
    .select('id')
    .eq('id', groupId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (groupError || !group) {
    throw new Error('Die Filtergruppe gehört nicht zu deiner Firma.')
  }

  const selectedEmployeeIds = formData.getAll('employeeIds').map(String)

  if (selectedEmployeeIds.length > 0) {
    const { data: validEmployees, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .in('id', selectedEmployeeIds)

    if (employeeError) {
      throw new Error(employeeError.message)
    }

    if ((validEmployees ?? []).length !== selectedEmployeeIds.length) {
      throw new Error('Mindestens ein ausgewählter Mitarbeiter gehört nicht zu deiner Firma.')
    }
  }

  const { error: deleteError } = await supabase
    .from('employee_filter_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('company_id', companyId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (selectedEmployeeIds.length > 0) {
    const rows = selectedEmployeeIds.map((employeeId) => ({
      company_id: companyId,
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
  revalidatePath('/foreman')
}