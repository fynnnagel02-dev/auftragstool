'use server'

import { requireCompanyContext } from '@/lib/auth'
import { calculateWorkHours } from '@/lib/calculate-work-hours'
import { revalidatePaths, REVALIDATE_WORKDAYS } from '@/lib/revalidate-paths'

type ImportRow = {
  employee_number: string
  employee_name: string
  work_date: string
  start_time: string
  end_time: string
}

function normalize(value: string) {
  return value.trim()
}

function normalizeTime(value: string) {
  const trimmed = value.trim()

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return ''

  const hours = match[1].padStart(2, '0')
  const minutes = match[2]

  return `${hours}:${minutes}`
}

function normalizeDate(value: string) {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)

  if (!match) return ''

  const day = match[1]
  const month = match[2]
  const year = match[3]

  return `${year}-${month}-${day}`
}

export async function importEmployeeWorkdays(rows: ImportRow[]) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  if (!rows || rows.length === 0) {
    throw new Error('Es wurden keine Arbeitszeiten zum Import übergeben.')
  }

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, employee_number')
    .eq('company_id', companyId)

  if (employeesError) {
    throw new Error(employeesError.message)
  }

  const employeeMap = new Map<string, string>()
  ;(employees ?? []).forEach((employee) => {
    if (employee.employee_number) {
      employeeMap.set(employee.employee_number.trim(), employee.id)
    }
  })

  const preparedRows = rows.map((row, index) => {
    const employeeNumber = normalize(row.employee_number || '')
    const workDate = normalizeDate(row.work_date || '')
    const startTime = normalizeTime(row.start_time || '')
    const endTime = normalizeTime(row.end_time || '')

    if (!employeeNumber) {
      throw new Error(`Zeile ${index + 1}: Personalnummer fehlt.`)
    }

    if (!workDate) {
      throw new Error(
        `Zeile ${index + 1}: Datum ist ungültig. Erwartet wird DD.MM.YYYY.`
      )
    }

    if (!startTime) {
      throw new Error(
        `Zeile ${index + 1}: Startzeit ist ungültig. Erwartet wird HH:MM:SS oder HH:MM.`
      )
    }

    if (!endTime) {
      throw new Error(
        `Zeile ${index + 1}: Endzeit ist ungültig. Erwartet wird HH:MM:SS oder HH:MM.`
      )
    }

    const employeeId = employeeMap.get(employeeNumber)
    if (!employeeId) {
      throw new Error(
        `Zeile ${index + 1}: Personalnummer "${employeeNumber}" wurde nicht gefunden.`
      )
    }

    const calculatedHours = calculateWorkHours(startTime, endTime)

    if (calculatedHours === null) {
      throw new Error(
        `Zeile ${index + 1}: Die Arbeitszeit konnte nicht berechnet werden.`
      )
    }

    return {
      company_id: companyId,
      employee_id: employeeId,
      employee_number: employeeNumber,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      calculated_hours: calculatedHours,
      absence_type: null,
      note: row.employee_name?.trim()
        ? `Import Arbeitszeit (${row.employee_name.trim()})`
        : 'Import Arbeitszeit',
    }
  })

  const importKeySet = new Set<string>()
  for (let i = 0; i < preparedRows.length; i += 1) {
    const row = preparedRows[i]
    const key = `${row.employee_id}__${row.work_date}`

    if (importKeySet.has(key)) {
      throw new Error(
        `Importfehler: Für Personalnummer "${row.employee_number}" ist das Datum "${row.work_date}" innerhalb der Datei doppelt vorhanden.`
      )
    }

    importKeySet.add(key)
  }

  const employeeIds = [...new Set(preparedRows.map((row) => row.employee_id))]
  const workDates = [...new Set(preparedRows.map((row) => row.work_date))].sort()

  const minDate = workDates[0]
  const maxDate = workDates[workDates.length - 1]

  const { data: existingWorkdays, error: existingError } = await supabase
    .from('employee_workdays')
    .select('employee_id, work_date')
    .eq('company_id', companyId)
    .in('employee_id', employeeIds)
    .gte('work_date', minDate)
    .lte('work_date', maxDate)

  if (existingError) {
    throw new Error(existingError.message)
  }

  const existingKeySet = new Set(
    (existingWorkdays ?? []).map((row) => `${row.employee_id}__${row.work_date}`)
  )

  for (const row of preparedRows) {
    const key = `${row.employee_id}__${row.work_date}`
    if (existingKeySet.has(key)) {
      throw new Error(
        `Importfehler: Für Personalnummer "${row.employee_number}" existiert am ${row.work_date} bereits ein Eintrag.`
      )
    }
  }

  const { error: insertError } = await supabase.from('employee_workdays').insert(
    preparedRows.map((row) => ({
      company_id: row.company_id,
      employee_id: row.employee_id,
      work_date: row.work_date,
      start_time: row.start_time,
      end_time: row.end_time,
      calculated_hours: row.calculated_hours,
      absence_type: null,
      note: row.note,
    }))
  )

  if (insertError) {
    throw new Error(insertError.message)
  }

  revalidatePaths(REVALIDATE_WORKDAYS)
}
