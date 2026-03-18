'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { calculateWorkHours } from '@/lib/calculate-work-hours'

export async function upsertEmployeeWorkday(formData: FormData) {
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

  revalidatePath('/admin')
}

export async function updateEmployeeWorkday(
  workdayId: string,
  formData: FormData
) {
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
        employee_id: employeeId,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        calculated_hours: calculatedHours,
        absence_type: null,
        note: note || null,
      })
      .eq('id', workdayId)

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
        employee_id: employeeId,
        work_date: workDate,
        start_time: null,
        end_time: null,
        calculated_hours: null,
        absence_type: absenceType,
        note: note || null,
      })
      .eq('id', workdayId)

    if (error) {
      throw new Error(error.message)
    }
  }

  revalidatePath('/datensammlung')
}

export async function deleteEmployeeWorkday(workdayId: string) {
  if (!workdayId) {
    throw new Error('Kein Datensatz angegeben.')
  }

  const { error } = await supabase
    .from('employee_workdays')
    .delete()
    .eq('id', workdayId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/datensammlung')
}