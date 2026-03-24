import { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

function getMonthDateRange(month: number, year: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { from, to }
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function formatWeekday(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`)
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date)
}

type EmployeeRow = {
  id: string
  employee_number: string | null
  full_name: string
  cost_center: string | null
}

type TravelProfileRow = {
  home_address: string | null
  license_plate: string | null
}

type ProjectRow = {
  id: string
  project_number: string | null
  name: string
}

type TravelExpenseEntry = {
  entry_date: string
  project_id: string | null
  departure_type: string | null
  destination_text: string | null
  return_type: string | null
  absence_from: string | null
  presence_until: string | null
  overnight_type: string | null
  catering_type: string | null
  private_kilometers: number | null
  meal_allowance_tax_free: number | null
  meal_allowance_taxable: number | null
  taxable_from_date_text: string | null
  km_allowance: number | null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Nicht eingeloggt', { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    return new Response('Firma konnte nicht ermittelt werden', { status: 403 })
  }

  const companyId = profile.company_id
  const { searchParams } = new URL(request.url)

  const employeeId = searchParams.get('employeeId') || ''
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))

  if (!employeeId || !month || !year) {
    return new Response('Fehlende Parameter', { status: 400 })
  }

  const { from, to } = getMonthDateRange(month, year)

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, employee_number, full_name, cost_center')
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .single<EmployeeRow>()

  if (employeeError || !employee) {
    return new Response('Mitarbeiter nicht gefunden', { status: 404 })
  }

  const { data: travelProfile, error: travelProfileError } = await supabase
    .from('employee_travel_profiles')
    .select('home_address, license_plate')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .maybeSingle<TravelProfileRow>()

  if (travelProfileError) {
    return new Response(travelProfileError.message, { status: 500 })
  }

  const { data: entries, error: entriesError } = await supabase
    .from('travel_expense_entries')
    .select(
      `
        entry_date,
        project_id,
        departure_type,
        destination_text,
        return_type,
        absence_from,
        presence_until,
        overnight_type,
        catering_type,
        private_kilometers,
        meal_allowance_tax_free,
        meal_allowance_taxable,
        taxable_from_date_text,
        km_allowance
      `
    )
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .gte('entry_date', from)
    .lt('entry_date', to)
    .order('entry_date', { ascending: true })
    .returns<TravelExpenseEntry[]>()

  if (entriesError) {
    return new Response(entriesError.message, { status: 500 })
  }

  const projectIds = [
    ...new Set((entries ?? []).map((entry) => entry.project_id).filter(Boolean)),
  ] as string[]

  let projects: ProjectRow[] = []

  if (projectIds.length > 0) {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, project_number, name')
      .eq('company_id', companyId)
      .in('id', projectIds)

    if (projectError) {
      return new Response(projectError.message, { status: 500 })
    }

    projects = projectData ?? []
  }

  const projectMap = new Map<string, ProjectRow>()
  projects.forEach((project) => {
    projectMap.set(project.id, project)
  })

  const entryMap = new Map<string, TravelExpenseEntry>()
  ;(entries ?? []).forEach((entry) => {
    entryMap.set(entry.entry_date, entry)
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Reisekosten')

  sheet.properties.defaultRowHeight = 20
  sheet.views = [{ state: 'frozen', ySplit: 9 }]

  sheet.mergeCells('A1:F1')
  sheet.getCell('A1').value = `Reisekostenabrechnung ${month}/${year}`
  sheet.getCell('A1').font = { bold: true, size: 16 }
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' }

  sheet.getCell('A3').value = 'Name'
  sheet.getCell('B3').value = employee.full_name
  sheet.getCell('D3').value = 'Personalnummer'
  sheet.getCell('E3').value = employee.employee_number || ''

  sheet.getCell('A4').value = 'Kostenstelle'
  sheet.getCell('B4').value = employee.cost_center || ''
  sheet.getCell('D4').value = 'Wohnort'
  sheet.getCell('E4').value = travelProfile?.home_address || ''

  sheet.getCell('A5').value = 'KFZ-Kennzeichen'
  sheet.getCell('B5').value = travelProfile?.license_plate || ''

  const headerRowIndex = 8
  const header = [
    'Wochentag',
    'Datum',
    'Abfahrt',
    'Baustelle / Zielort',
    'Auftrag',
    'Rückkehr',
    'Abwesen von',
    'Anwesen bis',
    'Private Kilometer',
    'Verpflegung steuerfrei',
    'Verpflegung steuerpflichtig',
    'Übernachtung',
    'Verkostung',
    'Datum steuerpfl. ab',
    'KM-Vergütung',
  ]

  const headerRow = sheet.getRow(headerRowIndex)
  header.forEach((value, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = value
    cell.font = { bold: true }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFF6FF' },
    }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  const daysInMonth = getDaysInMonth(year, month)
  let currentRowIndex = headerRowIndex + 1

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day))
    const entryDate = date.toISOString().split('T')[0]
    const entry = entryMap.get(entryDate)
    const project = entry?.project_id ? projectMap.get(entry.project_id) : null

    const row = sheet.getRow(currentRowIndex)
    row.values = [
      formatWeekday(entryDate),
      entryDate,
      entry?.departure_type || '',
      entry?.destination_text || '',
      project ? `${project.project_number} - ${project.name}` : '',
      entry?.return_type || '',
      entry?.absence_from || '',
      entry?.presence_until || '',
      entry?.private_kilometers ?? '',
      entry?.meal_allowance_tax_free ?? '',
      entry?.meal_allowance_taxable ?? '',
      entry?.overnight_type || '',
      entry?.catering_type || '',
      entry?.taxable_from_date_text || '',
      entry?.km_allowance ?? '',
    ]

    for (let colIndex = 1; colIndex <= 15; colIndex += 1) {
      const cell = row.getCell(colIndex)
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIndex >= 9 ? 'right' : 'left',
        wrapText: true,
      }
    }

    currentRowIndex += 1
  }

  const sumTaxFree = (entries ?? []).reduce(
    (sum, entry) => sum + Number(entry.meal_allowance_tax_free ?? 0),
    0
  )
  const sumTaxable = (entries ?? []).reduce(
    (sum, entry) => sum + Number(entry.meal_allowance_taxable ?? 0),
    0
  )
  const sumKm = (entries ?? []).reduce(
    (sum, entry) => sum + Number(entry.km_allowance ?? 0),
    0
  )
  const total = sumTaxFree + sumTaxable + sumKm

  currentRowIndex += 1
  sheet.getCell(`M${currentRowIndex}`).value = 'Summe steuerfrei'
  sheet.getCell(`O${currentRowIndex}`).value = sumTaxFree

  currentRowIndex += 1
  sheet.getCell(`M${currentRowIndex}`).value = 'Summe steuerpflichtig'
  sheet.getCell(`O${currentRowIndex}`).value = sumTaxable

  currentRowIndex += 1
  sheet.getCell(`M${currentRowIndex}`).value = 'Summe KM'
  sheet.getCell(`O${currentRowIndex}`).value = sumKm

  currentRowIndex += 1
  sheet.getCell(`M${currentRowIndex}`).value = 'Erstattung'
  sheet.getCell(`O${currentRowIndex}`).value = total

  for (let rowIndex = currentRowIndex - 3; rowIndex <= currentRowIndex; rowIndex += 1) {
    for (const column of ['M', 'N', 'O']) {
      const cell = sheet.getCell(`${column}${rowIndex}`)
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
      if (rowIndex === currentRowIndex) {
        cell.font = { bold: true }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEFF6FF' },
        }
      }
    }
  }

  currentRowIndex += 4

  const signatureLabels = [
    'Abrechner',
    'direkter Vorgesetzter',
    'Geschäftsführer / Vertreter',
    'RK-Ersteller / Vertreter',
  ]

  signatureLabels.forEach((label, index) => {
    const startCol = 1 + index * 4
    const lineRow = currentRowIndex
    const labelRow = currentRowIndex + 1
    sheet.mergeCells(lineRow, startCol, lineRow, startCol + 2)
    sheet.mergeCells(labelRow, startCol, labelRow, startCol + 2)

    const lineCell = sheet.getCell(lineRow, startCol)
    lineCell.border = {
      bottom: { style: 'thin' },
    }

    const labelCell = sheet.getCell(labelRow, startCol)
    labelCell.value = `${label} – Datum / Unterschrift`
    labelCell.alignment = { horizontal: 'left' }
    labelCell.font = { size: 10 }
  })

  const widths = [12, 12, 14, 24, 28, 14, 12, 12, 14, 16, 18, 16, 12, 16, 14]
  for (let i = 0; i < widths.length; i += 1) {
    sheet.getColumn(i + 1).width = widths[i]
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const fileName = `Reisekosten_${employee.full_name.replace(/\s+/g, '_')}_${month}_${year}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}