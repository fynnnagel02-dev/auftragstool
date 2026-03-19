'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'

const DEFAULT_COMPANY_ID = '16757ba0-701f-4e64-98fa-eece23f8e7c4'

export async function createEmployee(formData: FormData) {
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
    company_id: DEFAULT_COMPANY_ID,
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

  revalidatePath('/employees')
}

export async function updateEmployee(employeeId: string, formData: FormData) {
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

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/employees')
}

export async function deleteEmployee(employeeId: string) {
  if (!employeeId) {
    throw new Error('Kein Mitarbeiter angegeben.')
  }

  const { error } = await supabase.from('employees').delete().eq('id', employeeId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/employees')
}