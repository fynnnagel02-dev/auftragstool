'use server'

import { requireCompanyContext } from '@/lib/auth'
import { calculateWorkHours } from '@/lib/calculate-work-hours'
import { ensureCompanyRecordExists } from '@/lib/company-ownership'
import { revalidatePaths, REVALIDATE_WORKDAYS } from '@/lib/revalidate-paths'

export async function upsertEmployeeWorkday(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  const employeeId = formData.get('employeeId')?.toString().trim()
  const workDate = formData.get('workDate')?.toString().trim()
  const mode = formData.get('mode')?.toString().trim()
  const startTime = formData.get('startTime')?.toString().trim()
  const endTime = formData.get('endTime')?.toString().trim()
  const absenceType = formData.get('absenceType')?.toString().trim()
  const note = formData.get('note')?.toString().trim()

  if (!employeeId || !workDate || !mode) {
    throw new Error('Bitte Mitarbeiter, Datum und Modus ausfüllen.')
  }

  await ensureCompanyRecordExists(
    supabase,
    'employees',
    companyId,
    employeeId,
    'Der ausgewählte Mitarbeiter gehört nicht zu deiner Firma.'
  )

  if (mode === 'work') {
    if (!startTime || !endTime) {
      throw new Error('Bitte Startzeit und Endzeit ausfüllen.')
    }

    const calculatedHours = calculateWorkHours(startTime, endTime)

    if (calculatedHours === null) {
      throw new Error('Die Arbeitszeit konnte nicht berechnet werden.')
    }

    const { error } = await supabase.from('employee_workdays').upsert(
      {
        company_id: companyId,
        employee_id: employeeId,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        calculated_hours: calculatedHours,
        absence_type: null,
        note: note || null,
      },
      {
        onConflict: 'employee_id,work_date',
      }
    )

    if (error) {
      throw new Error(error.message)
    }
  }

  if (mode === 'absence') {
    if (!absenceType) {
      throw new Error('Bitte eine Fehlzeit auswählen.')
    }

    const { error } = await supabase.from('employee_workdays').upsert(
      {
        company_id: companyId,
        employee_id: employeeId,
        work_date: workDate,
        start_time: null,
        end_time: null,
        calculated_hours: null,
        absence_type: absenceType,
        note: note || null,
      },
      {
        onConflict: 'employee_id,work_date',
      }
    )

    if (error) {
      throw new Error(error.message)
    }
  }

  revalidatePaths(REVALIDATE_WORKDAYS)
}

export async function updateEmployeeWorkday(
  workdayId: string,
  formData: FormData
) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  const employeeId = formData.get('employeeId')?.toString().trim()
  const workDate = formData.get('workDate')?.toString().trim()
  const mode = formData.get('mode')?.toString().trim()
  const startTime = formData.get('startTime')?.toString().trim()
  const endTime = formData.get('endTime')?.toString().trim()
  const absenceType = formData.get('absenceType')?.toString().trim()
  const note = formData.get('note')?.toString().trim()

  if (!workdayId || !employeeId || !workDate || !mode) {
    throw new Error('Bitte Mitarbeiter, Datum und Modus ausfüllen.')
  }

  await ensureCompanyRecordExists(
    supabase,
    'employees',
    companyId,
    employeeId,
    'Der ausgewählte Mitarbeiter gehört nicht zu deiner Firma.'
  )

  if (mode === 'work') {
    if (!startTime || !endTime) {
      throw new Error('Bitte Startzeit und Endzeit ausfüllen.')
    }

    const calculatedHours = calculateWorkHours(startTime, endTime)

    if (calculatedHours === null) {
      throw new Error('Die Arbeitszeit konnte nicht berechnet werden.')
    }

    const { error } = await supabase
      .from('employee_workdays')
      .update({
        company_id: companyId,
        employee_id: employeeId,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        calculated_hours: calculatedHours,
        absence_type: null,
        note: note || null,
      })
      .eq('id', workdayId)
      .eq('company_id', companyId)

    if (error) {
      throw new Error(error.message)
    }
  }

  if (mode === 'absence') {
    if (!absenceType) {
      throw new Error('Bitte eine Fehlzeit auswählen.')
    }

    const { error } = await supabase
      .from('employee_workdays')
      .update({
        company_id: companyId,
        employee_id: employeeId,
        work_date: workDate,
        start_time: null,
        end_time: null,
        calculated_hours: null,
        absence_type: absenceType,
        note: note || null,
      })
      .eq('id', workdayId)
      .eq('company_id', companyId)

    if (error) {
      throw new Error(error.message)
    }
  }

  revalidatePaths(REVALIDATE_WORKDAYS)
}

export async function deleteEmployeeWorkday(workdayId: string) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  if (!workdayId) {
    throw new Error('Kein Datensatz angegeben.')
  }

  const { error } = await supabase
    .from('employee_workdays')
    .delete()
    .eq('id', workdayId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePaths(REVALIDATE_WORKDAYS)
}
