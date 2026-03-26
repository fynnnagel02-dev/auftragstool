'use server'

import { requireCompanyContext } from '@/lib/auth'
import {
  ensureCompanyRecordExists,
  ensureCompanyRecordsExist,
} from '@/lib/company-ownership'
import { revalidatePaths, REVALIDATE_SETTINGS } from '@/lib/revalidate-paths'

export async function createEmployeeFilterGroup(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

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

  revalidatePaths(REVALIDATE_SETTINGS)
}

export async function updateEmployeeFilterGroup(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

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

  revalidatePaths(REVALIDATE_SETTINGS)
}

export async function deleteEmployeeFilterGroup(groupId: string) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

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

  revalidatePaths(REVALIDATE_SETTINGS)
}

export async function saveEmployeeFilterGroupMembers(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  const groupId = formData.get('groupId')?.toString().trim()

  if (!groupId) {
    throw new Error('Keine Filtergruppe angegeben.')
  }

  await ensureCompanyRecordExists(
    supabase,
    'employee_filter_groups',
    companyId,
    groupId,
    'Die Filtergruppe gehört nicht zu deiner Firma.'
  )

  const selectedEmployeeIds = formData.getAll('employeeIds').map(String)

  if (selectedEmployeeIds.length > 0) {
    await ensureCompanyRecordsExist(
      supabase,
      'employees',
      companyId,
      selectedEmployeeIds,
      'Mindestens ein ausgewählter Mitarbeiter gehört nicht zu deiner Firma.'
    )
  }

  const { error: replaceError } = await supabase.rpc(
    'replace_employee_filter_group_members',
    {
      p_company_id: companyId,
      p_group_id: groupId,
      p_employee_ids: selectedEmployeeIds,
    }
  )

  if (replaceError) {
    throw new Error(replaceError.message)
  }

  revalidatePaths(REVALIDATE_SETTINGS)
}
