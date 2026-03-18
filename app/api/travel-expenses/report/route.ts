import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

const monthNames = [
  '',
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

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

function formatDateCell(dateString: string) {
  const [year, month, day] = dateString.split('-')
  return `${day}.${month}.${year}`
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return ''
  return value.toFixed(2).replace('.', ',')
}

function escapeHtml(value: string | null | undefined) {
  if (!value) return ''
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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
  const { searchParams } = new URL(request.url)

  const employeeId = searchParams.get('employeeId') || ''
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))
  const autoPrint = searchParams.get('autoprint') === '1'

  if (!employeeId || !month || !year) {
    return new Response('<h1>Fehlende Exportparameter.</h1>', {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const { from, to } = getMonthDateRange(month, year)

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, employee_number, full_name, cost_center')
    .eq('id', employeeId)
    .single<EmployeeRow>()

  if (employeeError || !employee) {
    return new Response(
      `<h1>Fehler Mitarbeiter: ${escapeHtml(
        employeeError?.message || 'Nicht gefunden'
      )}</h1>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('employee_travel_profiles')
    .select('home_address, license_plate')
    .eq('employee_id', employeeId)
    .maybeSingle<TravelProfileRow>()

  if (profileError) {
    return new Response(
      `<h1>Fehler Reisekosten-Profil: ${escapeHtml(profileError.message)}</h1>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
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
    .gte('entry_date', from)
    .lt('entry_date', to)
    .order('entry_date', { ascending: true })
    .returns<TravelExpenseEntry[]>()

  if (entriesError) {
    return new Response(
      `<h1>Fehler Reisekosten-Einträge: ${escapeHtml(entriesError.message)}</h1>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
  }

  const projectIds = [
    ...new Set((entries ?? []).map((entry) => entry.project_id).filter(Boolean)),
  ] as string[]

  let projects: ProjectRow[] = []

  if (projectIds.length > 0) {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, project_number, name')
      .in('id', projectIds)

    if (projectError) {
      return new Response(
        `<h1>Fehler Aufträge: ${escapeHtml(projectError.message)}</h1>`,
        {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      )
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

  const monthRows: {
    entry_date: string
    weekday: string
    entry: TravelExpenseEntry | null
  }[] = []

  const daysInMonth = getDaysInMonth(year, month)

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day))
    const entryDate = date.toISOString().split('T')[0]

    monthRows.push({
      entry_date: entryDate,
      weekday: formatWeekday(entryDate),
      entry: entryMap.get(entryDate) ?? null,
    })
  }

  const sumTaxFree = (entries ?? []).reduce(
    (sum, entry) => sum + Number(entry.meal_allowance_tax_free ?? 0),
    0
  )

  const sumTaxable = (entries ?? []).reduce(
    (sum, entry) => sum + Number(entry.meal_allowance_taxable ?? 0),
    0
  )

  const sumKmAllowance = (entries ?? []).reduce(
    (sum, entry) => sum + Number(entry.km_allowance ?? 0),
    0
  )

  const reimbursementTotal = sumTaxFree + sumTaxable + sumKmAllowance

  const rowsHtml = monthRows
    .map((row) => {
      const entry = row.entry
      const project =
        entry?.project_id ? projectMap.get(entry.project_id) : null

      return `
        <tr>
          <td>${escapeHtml(row.weekday)}</td>
          <td>${escapeHtml(formatDateCell(row.entry_date))}</td>
          <td>${escapeHtml(entry?.departure_type)}</td>
          <td>${escapeHtml(entry?.destination_text)}</td>
          <td>${escapeHtml(
            project ? `${project.project_number} – ${project.name}` : ''
          )}</td>
          <td>${escapeHtml(entry?.return_type)}</td>
          <td>${escapeHtml(entry?.absence_from)}</td>
          <td>${escapeHtml(entry?.presence_until)}</td>
          <td class="num">${formatNumber(entry?.private_kilometers)}</td>
          <td class="num">${formatNumber(entry?.meal_allowance_tax_free)}</td>
          <td class="num">${formatNumber(entry?.meal_allowance_taxable)}</td>
          <td>${escapeHtml(entry?.overnight_type)}</td>
          <td>${escapeHtml(entry?.catering_type)}</td>
          <td>${escapeHtml(entry?.taxable_from_date_text)}</td>
          <td class="num">${formatNumber(entry?.km_allowance)}</td>
        </tr>
      `
    })
    .join('')

  const html = `
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>Reisekostenabrechnung ${escapeHtml(
          employee.full_name
        )} ${monthNames[month]} ${year}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            background: #ffffff;
          }

          .screen-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            border-bottom: 1px solid #e2e8f0;
            background: #ffffff;
          }

          .screen-title {
            font-size: 24px;
            font-weight: 700;
          }

          .print-button {
            border: none;
            background: #172554;
            color: white;
            padding: 10px 16px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          }

          .page {
            padding: 16px 20px 24px 20px;
          }

          .report {
            border: 1px solid #cbd5e1;
            border-radius: 18px;
            padding: 18px;
          }

          .header {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            gap: 20px;
            padding-bottom: 14px;
            border-bottom: 1px solid #cbd5e1;
          }

          .eyebrow {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: #64748b;
            font-weight: 700;
          }

          .headline {
            margin-top: 8px;
            font-size: 30px;
            font-weight: 700;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 20px;
            font-size: 13px;
            align-content: start;
          }

          .meta-label {
            color: #64748b;
            font-weight: 700;
          }

          .table-wrap {
            margin-top: 16px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 10px;
          }

          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 6px;
            vertical-align: top;
            word-wrap: break-word;
          }

          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 700;
            text-align: left;
          }

          .num {
            text-align: right;
          }

          .summary {
            margin-top: 16px;
            margin-left: auto;
            width: 430px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            overflow: hidden;
          }

          .summary-row {
            display: grid;
            grid-template-columns: 1.7fr 1fr;
            border-bottom: 1px solid #cbd5e1;
          }

          .summary-row:last-child {
            border-bottom: none;
          }

          .summary-row div {
            padding: 10px 12px;
            font-size: 13px;
          }

          .summary-row .label {
            font-weight: 700;
            color: #334155;
            background: #ffffff;
          }

          .summary-row .value {
            text-align: right;
            font-weight: 700;
          }

          .summary-row.total .label,
          .summary-row.total .value {
            background: #eff6ff;
            color: #172554;
            font-size: 15px;
          }

          .signatures {
            margin-top: 34px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 26px;
          }

          .signature-line {
            height: 58px;
            border-bottom: 1px solid #64748b;
          }

          .signature-label {
            margin-top: 10px;
            font-size: 12px;
            color: #334155;
          }

          .signature-sub {
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
          }

          @media print {
            .screen-bar {
              display: none !important;
            }

            .page {
              padding: 0;
            }

            .report {
              border: none;
              border-radius: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="screen-bar">
          <div class="screen-title">Reisekostenreport</div>
          <button class="print-button" onclick="window.print()">Drucken / Als PDF speichern</button>
        </div>

        <div class="page">
          <div class="report">
            <div class="header">
              <div>
                <div class="eyebrow">Reisekostenabrechnung</div>
                <div class="headline">${escapeHtml(monthNames[month])} ${year}</div>
              </div>

              <div class="meta-grid">
                <div><span class="meta-label">Name:</span> ${escapeHtml(employee.full_name)}</div>
                <div><span class="meta-label">Personalnummer:</span> ${escapeHtml(employee.employee_number)}</div>
                <div><span class="meta-label">Kostenstelle:</span> ${escapeHtml(employee.cost_center)}</div>
                <div><span class="meta-label">Wohnort:</span> ${escapeHtml(profile?.home_address)}</div>
                <div><span class="meta-label">KFZ-Kennzeichen:</span> ${escapeHtml(profile?.license_plate)}</div>
              </div>
            </div>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Wochentag</th>
                    <th>Datum</th>
                    <th>Abfahrt</th>
                    <th>Baustelle / Zielort</th>
                    <th>Auftrag</th>
                    <th>Rückkehr</th>
                    <th>Abwesen von</th>
                    <th>Anwesen bis</th>
                    <th>Private Kilometer</th>
                    <th>Verpflegung steuerfrei</th>
                    <th>Verpflegung steuerpflichtig</th>
                    <th>Übernachtung</th>
                    <th>Verkostung</th>
                    <th>Datum steuerpfl. ab</th>
                    <th>KM-Vergütung</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>

            <div class="summary">
              <div class="summary-row">
                <div class="label">Zwischensumme Verpflegungspauschale steuerfrei</div>
                <div class="value">${formatNumber(sumTaxFree)} €</div>
              </div>
              <div class="summary-row">
                <div class="label">Zwischensumme Verpflegungspauschale steuerpflichtig</div>
                <div class="value">${formatNumber(sumTaxable)} €</div>
              </div>
              <div class="summary-row">
                <div class="label">Zwischensumme KM-Vergütung</div>
                <div class="value">${formatNumber(sumKmAllowance)} €</div>
              </div>
              <div class="summary-row total">
                <div class="label">Erstattungsbetrag</div>
                <div class="value">${formatNumber(reimbursementTotal)} €</div>
              </div>
            </div>

            <div class="signatures">
              <div>
                <div class="signature-line"></div>
                <div class="signature-label">Abrechner</div>
                <div class="signature-sub">Datum / Unterschrift</div>
              </div>
              <div>
                <div class="signature-line"></div>
                <div class="signature-label">direkter Vorgesetzter</div>
                <div class="signature-sub">Datum / Unterschrift</div>
              </div>
              <div>
                <div class="signature-line"></div>
                <div class="signature-label">Geschäftsführer / Vertreter</div>
                <div class="signature-sub">Datum / Unterschrift</div>
              </div>
              <div>
                <div class="signature-line"></div>
                <div class="signature-label">RK-Ersteller / Vertreter</div>
                <div class="signature-sub">Datum / Unterschrift</div>
              </div>
            </div>
          </div>
        </div>

        ${
          autoPrint
            ? `<script>
                window.addEventListener('load', function () {
                  setTimeout(function () {
                    window.print();
                  }, 400);
                });
              </script>`
            : ''
        }
      </body>
    </html>
  `

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}