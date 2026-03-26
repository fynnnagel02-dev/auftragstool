import { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { requireCompanyContext } from '@/lib/auth'
import { formatWeekday, getTravelExpenseReportData } from '@/lib/travel-expense-report'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const employeeId = searchParams.get('employeeId') || ''
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))

  if (!employeeId || !month || !year) {
    return new Response('Fehlende Parameter', { status: 400 })
  }

  try {
    const { companyId } = await requireCompanyContext([
      'admin',
      'geschaeftsfuehrer',
    ])
    const { employee, travelProfile, projectMap, monthRows, sums } =
      await getTravelExpenseReportData(supabase, companyId, employeeId, month, year)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Reisekosten')

    sheet.properties.defaultRowHeight = 20
    sheet.views = [{ state: 'frozen', ySplit: 9 }]

    sheet.mergeCells('A1:F1')
    sheet.getCell('A1').value = `Reisekostenabrechnung ${month}/${year}`
    sheet.getCell('A1').font = { bold: true, size: 16 }

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

    header.forEach((value, index) => {
      const cell = sheet.getRow(headerRowIndex).getCell(index + 1)
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

    let currentRowIndex = headerRowIndex + 1

    for (const { entry_date: entryDate, entry } of monthRows) {
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

    currentRowIndex += 1
    sheet.getCell(`M${currentRowIndex}`).value = 'Summe steuerfrei'
    sheet.getCell(`O${currentRowIndex}`).value = sums.taxFree

    currentRowIndex += 1
    sheet.getCell(`M${currentRowIndex}`).value = 'Summe steuerpflichtig'
    sheet.getCell(`O${currentRowIndex}`).value = sums.taxable

    currentRowIndex += 1
    sheet.getCell(`M${currentRowIndex}`).value = 'Summe KM'
    sheet.getCell(`O${currentRowIndex}`).value = sums.kmAllowance

    currentRowIndex += 1
    sheet.getCell(`M${currentRowIndex}`).value = 'Erstattung'
    sheet.getCell(`O${currentRowIndex}`).value = sums.total

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

    sheet.columns = [
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 28 },
      { width: 28 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 18 },
      { width: 14 },
      { width: 14 },
      { width: 16 },
      { width: 14 },
    ]

    const buffer = await workbook.xlsx.writeBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="reisekosten_${employeeId}_${year}-${String(
          month
        ).padStart(2, '0')}.xlsx"`,
        'Cache-Control': 'no-store, private',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Excel-Export fehlgeschlagen'
    return new Response(message, { status: 500 })
  }
}
