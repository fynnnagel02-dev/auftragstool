'use server'

import { requireCompanyContext } from '@/lib/auth'
import {
  ensureCompanyRecordExists,
  ensureCompanyRecordsExist,
} from '@/lib/company-ownership'
import { revalidatePaths } from '@/lib/revalidate-paths'

type TravelExpenseRowInput = {
  entry_date: string
  project_id: string
  departure_type: string
  destination_text: string
  return_type: string
  absence_from: string
  presence_until: string
  overnight_type: string
  catering_type: string
  private_kilometers: string
  meal_allowance_tax_free: string
  meal_allowance_taxable: string
  taxable_from_date_text: string
  km_allowance: string
}

function isMeaningfulRow(row: TravelExpenseRowInput) {
  return Boolean(
    row.project_id ||
      row.departure_type ||
      row.destination_text ||
      row.return_type ||
      row.absence_from ||
      row.presence_until ||
      row.overnight_type ||
      row.catering_type ||
      row.meal_allowance_tax_free ||
      row.meal_allowance_taxable ||
      row.taxable_from_date_text ||
      row.private_kilometers ||
      row.km_allowance
  )
}

export async function saveTravelExpenseMonth(
  employeeId: string,
  year: number,
  month: number,
  rows: TravelExpenseRowInput[]
) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  if (!employeeId) {
    throw new Error('Kein Mitarbeiter gewählt.')
  }

  if (!year || !month) {
    throw new Error('Monat oder Jahr fehlt.')
  }

  await ensureCompanyRecordExists(
    supabase,
    'employees',
    companyId,
    employeeId,
    'Der ausgewählte Mitarbeiter gehört nicht zu deiner Firma.'
  )

  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const cleanedRows = rows
    .map((row) => ({
      entry_date: row.entry_date,
      project_id: row.project_id || null,
      departure_type: row.departure_type || null,
      destination_text: row.destination_text || null,
      return_type: row.return_type || null,
      absence_from: row.absence_from || null,
      presence_until: row.presence_until || null,
      overnight_type: row.overnight_type || null,
      catering_type: row.catering_type || null,
      private_kilometers:
        row.private_kilometers === '' ? null : Number(row.private_kilometers),
      meal_allowance_tax_free:
        row.meal_allowance_tax_free === ''
          ? null
          : Number(row.meal_allowance_tax_free),
      meal_allowance_taxable:
        row.meal_allowance_taxable === ''
          ? null
          : Number(row.meal_allowance_taxable),
      taxable_from_date_text: row.taxable_from_date_text || null,
      km_allowance: row.km_allowance === '' ? null : Number(row.km_allowance),
    }))
    .filter((row) =>
      isMeaningfulRow({
        entry_date: row.entry_date,
        project_id: row.project_id ?? '',
        departure_type: row.departure_type ?? '',
        destination_text: row.destination_text ?? '',
        return_type: row.return_type ?? '',
        absence_from: row.absence_from ?? '',
        presence_until: row.presence_until ?? '',
        overnight_type: row.overnight_type ?? '',
        catering_type: row.catering_type ?? '',
        private_kilometers:
          row.private_kilometers !== null ? String(row.private_kilometers) : '',
        meal_allowance_tax_free:
          row.meal_allowance_tax_free !== null
            ? String(row.meal_allowance_tax_free)
            : '',
        meal_allowance_taxable:
          row.meal_allowance_taxable !== null
            ? String(row.meal_allowance_taxable)
            : '',
        taxable_from_date_text: row.taxable_from_date_text ?? '',
        km_allowance: row.km_allowance !== null ? String(row.km_allowance) : '',
      })
    )

  const projectIds = cleanedRows
    .map((row) => row.project_id)
    .filter((projectId): projectId is string => Boolean(projectId))

  await ensureCompanyRecordsExist(
    supabase,
    'projects',
    companyId,
    projectIds,
    'Mindestens ein ausgewählter Auftrag gehört nicht zu deiner Firma.'
  )

  const dateSet = new Set<string>()

  for (const row of cleanedRows) {
    if (!row.entry_date || row.entry_date < from || row.entry_date >= to) {
      throw new Error('Mindestens ein Reisekosten-Eintrag liegt außerhalb des gewählten Monats.')
    }

    if (dateSet.has(row.entry_date)) {
      throw new Error(`Das Datum ${row.entry_date} ist mehrfach vorhanden.`)
    }

    dateSet.add(row.entry_date)

    if (row.private_kilometers !== null && Number.isNaN(row.private_kilometers)) {
      throw new Error('Private Kilometer enthalten einen ungültigen Wert.')
    }

    if (
      row.meal_allowance_tax_free !== null &&
      Number.isNaN(row.meal_allowance_tax_free)
    ) {
      throw new Error(
        'Verpflegungspauschale steuerfrei enthält einen ungültigen Wert.'
      )
    }

    if (
      row.meal_allowance_taxable !== null &&
      Number.isNaN(row.meal_allowance_taxable)
    ) {
      throw new Error(
        'Verpflegungspauschale steuerpflichtig enthält einen ungültigen Wert.'
      )
    }

    if (row.km_allowance !== null && Number.isNaN(row.km_allowance)) {
      throw new Error('KM-Vergütung enthält einen ungültigen Wert.')
    }
  }

  const { error: replaceError } = await supabase.rpc(
    'replace_travel_expense_entries',
    {
      p_company_id: companyId,
      p_employee_id: employeeId,
      p_from: from,
      p_to: to,
      p_entries: cleanedRows,
    }
  )

  if (replaceError) {
    throw new Error(replaceError.message)
  }

  revalidatePaths(['/travel-expenses', '/admin'])
}
