'use server'

import { requireCompanyContext } from '@/lib/auth'
import { revalidatePaths, REVALIDATE_EMPLOYEES } from '@/lib/revalidate-paths'

export async function createEmployee(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  const employeeNumber = formData.get('employeeNumber')?.toString().trim()
  const fullName = formData.get('fullName')?.toString().trim()
  const employer = formData.get('employer')?.toString().trim()
  const entryDate = formData.get('entryDate')?.toString().trim()
  const costCenter = formData.get('costCenter')?.toString().trim()
  const isActive = formData.get('isActive') === 'on'

  if (!employeeNumber || !fullName || !employer || !entryDate) {
    throw new Error(
      'Bitte Personalnummer, Name, Arbeitgeber und Eintrittsdatum ausfüllen.'
    )
  }

  const { error } = await supabase.from('employees').insert({
    company_id: companyId,
    employee_number: employeeNumber,
    full_name: fullName,
    employer,
    entry_date: entryDate,
    cost_center: costCenter || null,
    is_active: isActive,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePaths(REVALIDATE_EMPLOYEES)
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  const employeeNumber = formData.get('employeeNumber')?.toString().trim()
  const fullName = formData.get('fullName')?.toString().trim()
  const employer = formData.get('employer')?.toString().trim()
  const entryDate = formData.get('entryDate')?.toString().trim()
  const costCenter = formData.get('costCenter')?.toString().trim()
  const isActive = formData.get('isActive') === 'on'

  if (!employeeId) {
    throw new Error('Kein Mitarbeiter angegeben.')
  }

  if (!employeeNumber || !fullName || !employer || !entryDate) {
    throw new Error(
      'Bitte Personalnummer, Name, Arbeitgeber und Eintrittsdatum ausfüllen.'
    )
  }

  const { error } = await supabase
    .from('employees')
    .update({
      employee_number: employeeNumber,
      full_name: fullName,
      employer,
      entry_date: entryDate,
      cost_center: costCenter || null,
      is_active: isActive,
    })
    .eq('id', employeeId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePaths(REVALIDATE_EMPLOYEES)
}

export async function deleteEmployee(employeeId: string) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  if (!employeeId) {
    throw new Error('Kein Mitarbeiter angegeben.')
  }

  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', employeeId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePaths(REVALIDATE_EMPLOYEES)
}
