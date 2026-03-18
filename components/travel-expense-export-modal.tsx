'use client'

import { useState } from 'react'
import ActionCard from './action-card'

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
}

const monthOptions = [
  { value: 1, label: 'Januar' },
  { value: 2, label: 'Februar' },
  { value: 3, label: 'März' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Dezember' },
]

function getCurrentMonthAndYear() {
  const now = new Date()
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

export default function TravelExpenseExportModal({
  employees,
}: {
  employees: Employee[]
}) {
  const current = getCurrentMonthAndYear()

  const [open, setOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  const [month, setMonth] = useState(String(current.month))
  const [year, setYear] = useState(String(current.year))
  const [format, setFormat] = useState('pdf')

  function handleExport() {
    if (!employeeId || !month || !year) return

    if (format === 'pdf') {
      const url = `/api/travel-expenses/report?employeeId=${employeeId}&month=${month}&year=${year}&autoprint=1`
      window.open(url, '_blank')
    }

    if (format === 'excel') {
      const url = `/api/travel-expenses/report-excel?employeeId=${employeeId}&month=${month}&year=${year}`
      window.open(url, '_blank')
    }

    setOpen(false)
  }

  return (
    <>
      <div className="h-full">
        <ActionCard
          title="Reisekosten exportieren"
          description="Monatsreport für einen Mitarbeiter als professionellen PDF- oder Excel-Report öffnen."
          onClick={() => setOpen(true)}
        />
      </div>

      {open && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/40 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                  Export
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Reisekosten exportieren
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Wähle Mitarbeiter, Monat, Jahr und Dateiformat.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Mitarbeiter
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.employee_number} – {employee.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Monat
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    {monthOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Jahr
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    {Array.from({ length: 7 }, (_, i) => 2024 + i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Dateiformat
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Abbrechen
              </button>

              <button
                type="button"
                onClick={handleExport}
                className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-900"
              >
                Export starten
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}