import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCompanyContext } from '@/lib/auth'
import { getTravelExpenseReportData } from '@/lib/travel-expense-report'

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

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const employeeId = searchParams.get('employeeId') || ''
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))
  const autoPrint = searchParams.get('autoprint') === '1'

  if (!employeeId || !month || !year) {
    return new Response('<h1>Fehlende Exportparameter.</h1>', {
      status: 400,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, private',
      },
    })
  }

  try {
    const { companyId } = await requireCompanyContext([
      'admin',
      'geschaeftsfuehrer',
    ])
    const { employee, travelProfile, projectMap, monthRows, sums } =
      await getTravelExpenseReportData(supabase, companyId, employeeId, month, year)

    const rowsHtml = monthRows
      .map((row) => {
        const entry = row.entry
        const project = entry?.project_id ? projectMap.get(entry.project_id) : null

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

            * { box-sizing: border-box; }
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
              padding: 18px 24px;
              border-bottom: 1px solid #e2e8f0;
            }
            .screen-bar button {
              border: 0;
              border-radius: 10px;
              background: #0f172a;
              color: white;
              padding: 10px 14px;
              cursor: pointer;
            }
            .page {
              padding: 20px 24px 24px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 16px;
            }
            .meta {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px 20px;
              font-size: 13px;
            }
            .label {
              color: #475569;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 18px;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 8px;
              vertical-align: top;
            }
            th {
              background: #f8fafc;
              text-align: left;
            }
            .num {
              text-align: right;
            }
            .summary {
              margin-top: 18px;
              margin-left: auto;
              width: 260px;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 14px 16px;
              background: #f8fafc;
            }
            .summary-total {
              font-size: 22px;
              font-weight: 700;
              margin-top: 4px;
            }
            @media print {
              .screen-bar { display: none; }
              .page { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="screen-bar">
            <h1>Reisekostenreport</h1>
            <button onclick="window.print()">Drucken</button>
          </div>

          <div class="page">
            <div class="header">
              <div>
                <div class="label">Reisekostenabrechnung</div>
                <h1>${escapeHtml(monthNames[month])} ${year}</h1>
              </div>

              <div class="meta">
                <div><span class="label">Name:</span> ${escapeHtml(employee.full_name)}</div>
                <div><span class="label">Personalnummer:</span> ${escapeHtml(
                  employee.employee_number
                )}</div>
                <div><span class="label">Kostenstelle:</span> ${escapeHtml(
                  employee.cost_center
                )}</div>
                <div><span class="label">Wohnort:</span> ${escapeHtml(
                  travelProfile?.home_address
                )}</div>
                <div><span class="label">KFZ-Kennzeichen:</span> ${escapeHtml(
                  travelProfile?.license_plate
                )}</div>
              </div>
            </div>

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

            <div class="summary">
              <div><span class="label">Steuerfrei:</span> ${formatNumber(sums.taxFree)} €</div>
              <div><span class="label">Steuerpflichtig:</span> ${formatNumber(sums.taxable)} €</div>
              <div><span class="label">KM-Vergütung:</span> ${formatNumber(sums.kmAllowance)} €</div>
              <div class="summary-total">${formatNumber(sums.total)} €</div>
            </div>
          </div>

          ${
            autoPrint
              ? '<script>window.addEventListener("load", () => window.print())</script>'
              : ''
          }
        </body>
      </html>
    `

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, private',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export fehlgeschlagen.'
    return new Response(`<h1>${escapeHtml(message)}</h1>`, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, private',
      },
    })
  }
}
