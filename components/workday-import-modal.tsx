'use client'

import { useMemo, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import { importEmployeeWorkdays } from '@/app/admin/import-actions'
import ActionCard from './action-card'

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
}

type ImportRow = {
  local_id: string
  employee_number: string
  employee_name: string
  work_date: string
  start_time: string
  end_time: string
}

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function cellToString(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeDate(value: unknown) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)

    if (!parsed) return ''

    return `${pad(parsed.d)}.${pad(parsed.m)}.${parsed.y}`
  }

  const trimmed = cellToString(value)
  if (!trimmed) return ''

  const germanMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (germanMatch) {
    return `${germanMatch[1]}.${germanMatch[2]}.${germanMatch[3]}`
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`
  }

  return ''
}

function normalizeTime(value: unknown) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)

    if (!parsed) return ''

    return `${pad(parsed.H)}:${pad(parsed.M)}:${pad(parsed.S)}`
  }

  const trimmed = cellToString(value)
  if (!trimmed) return ''

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return ''

  const hours = match[1].padStart(2, '0')
  const minutes = match[2]
  const seconds = match[3] ?? '00'

  return `${hours}:${minutes}:${seconds}`
}

function looksLikeTime(value: string) {
  return /^\d{2}:\d{2}:\d{2}$/.test(value)
}

export default function WorkdayImportModal({
  employees,
}: {
  employees: Employee[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isPending, startTransition] = useTransition()

  const employeeNumberMap = useMemo(() => {
    const map = new Map<string, string>()
    employees.forEach((employee) => {
      if (employee.employee_number) {
        map.set(employee.employee_number.trim(), employee.full_name)
      }
    })
    return map
  }, [employees])

  const duplicateInfo = useMemo(() => {
    const seen = new Map<string, number>()

    rows.forEach((row) => {
      const key = `${row.employee_number.trim()}__${row.work_date.trim()}`
      if (row.employee_number.trim() && row.work_date.trim()) {
        seen.set(key, (seen.get(key) ?? 0) + 1)
      }
    })

    return Array.from(seen.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  }, [rows])

  function resetState() {
    setRows([])
    setError('')
    setInfo('')
  }

  function handleClose() {
    setOpen(false)
    resetState()
  }

  function updateRow(localId: string, field: keyof ImportRow, value: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.local_id === localId ? { ...row, [field]: value } : row
      )
    )
  }

  function removeRow(localId: string) {
    setRows((prev) => prev.filter((row) => row.local_id !== localId))
  }

  function addEmptyRow() {
    setRows((prev) => [
      ...prev,
      {
        local_id: createLocalId(),
        employee_number: '',
        employee_name: '',
        work_date: '',
        start_time: '',
        end_time: '',
      },
    ])
  }

  function parseSheetToRows(data: unknown[][]) {
    const parsedRows: ImportRow[] = []

    for (let i = 1; i < data.length; i += 1) {
      const row = data[i]

      const employeeNumber = cellToString(row?.[0])
      const employeeName = cellToString(row?.[1])
      const workDate = normalizeDate(row?.[2])

      const startFromD = normalizeTime(row?.[3])
      const endFromE = normalizeTime(row?.[4])

      const startFromE = normalizeTime(row?.[4])
      const endFromF = normalizeTime(row?.[5])

      let startTime = ''
      let endTime = ''

      if (looksLikeTime(startFromD) && looksLikeTime(endFromE)) {
        startTime = startFromD
        endTime = endFromE
      } else if (looksLikeTime(startFromE) && looksLikeTime(endFromF)) {
        startTime = startFromE
        endTime = endFromF
      }

      const isCompletelyEmpty =
        !employeeNumber && !employeeName && !workDate && !startTime && !endTime

      if (isCompletelyEmpty) continue

      parsedRows.push({
        local_id: createLocalId(),
        employee_number: employeeNumber,
        employee_name: employeeName,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
      })
    }

    return parsedRows
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    setInfo('')

    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (loadEvent) => {
      try {
        const arrayBuffer = loadEvent.target?.result as ArrayBuffer
        const workbook = XLSX.read(arrayBuffer, {
          type: 'array',
          cellDates: false,
          raw: true,
        })

        const sheetName = workbook.SheetNames[0]

        if (!sheetName) {
          setError('Die Datei enthält kein lesbares Tabellenblatt.')
          return
        }

        const worksheet = workbook.Sheets[sheetName]
        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: false,
          defval: '',
          raw: true,
        }) as unknown[][]

        if (!rawRows.length) {
          setError('Die Datei ist leer.')
          return
        }

        const parsedRows = parseSheetToRows(rawRows)

        if (!parsedRows.length) {
          setError(
            'Es konnten keine importierbaren Zeilen gefunden werden. Erwartet werden Personalnummer, Name, Datum sowie Start- und Endzeit.'
          )
          return
        }

        setRows(parsedRows)
        setInfo(
          `${parsedRows.length} Zeile(n) geladen. Bitte prüfen und anschließend importieren.`
        )
      } catch {
        setError('Die Excel-Datei konnte nicht gelesen werden.')
      }
    }

    reader.readAsArrayBuffer(file)
    event.target.value = ''
  }

  function handleImport() {
    setError('')
    setInfo('')

    if (rows.length === 0) {
      setError('Bitte zuerst eine Datei laden oder Zeilen erfassen.')
      return
    }

    if (duplicateInfo.length > 0) {
      setError(
        `Doppelte Kombinationen aus Personalnummer und Datum in der Vorschau: ${duplicateInfo.join(
          ', '
        )}`
      )
      return
    }

    startTransition(async () => {
      try {
        await importEmployeeWorkdays(
          rows.map((row) => ({
            employee_number: row.employee_number,
            employee_name: row.employee_name,
            work_date: row.work_date,
            start_time: row.start_time,
            end_time: row.end_time,
          }))
        )

        handleClose()
        router.refresh()
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Beim Import ist ein Fehler aufgetreten.')
        }
      }
    })
  }

  return (
    <>
      <div className="h-full">
        <ActionCard
          title="Arbeitszeiten importieren"
          description="Excel-Datei laden, Vorschau prüfen und Arbeitszeiten gesammelt importieren."
          onClick={() => setOpen(true)}
          eyebrow="Import"
          accent="neutral"
        />
      </div>

      {open && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/40 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
            <div className="border-b border-white/40 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                    Büro
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Arbeitszeiten importieren
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Header in Zeile 1 wird ignoriert. Erwartet werden
                    Personalnummer, Name, Datum sowie Start- und Endzeit.
                    Excel-Datums- und Zeitformate werden automatisch erkannt.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <label className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white">
                  Excel-Datei auswählen
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={addEmptyRow}
                  className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white"
                >
                  Zeile hinzufügen
                </button>
              </div>

              {info && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                  {info}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {rows.length > 0 ? (
                <div className="mt-6 overflow-x-auto rounded-2xl border border-white/40 bg-white/70 max-h-[55vh]">
                  <table className="min-w-[1350px] w-full text-left text-sm">
                    <thead className="sticky top-0 z-20 border-b border-white/40 bg-slate-50/95 text-slate-500 backdrop-blur">
                      <tr>
                        <th className="px-4 py-3 font-medium">Personalnummer</th>
                        <th className="px-4 py-3 font-medium">Name aus Datei</th>
                        <th className="px-4 py-3 font-medium">Zuordnung System</th>
                        <th className="px-4 py-3 font-medium">Datum</th>
                        <th className="px-4 py-3 font-medium">Startzeit</th>
                        <th className="px-4 py-3 font-medium">Endzeit</th>
                        <th className="px-4 py-3 font-medium">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const matchedEmployee =
                          employeeNumberMap.get(row.employee_number.trim()) || 'Nicht gefunden'

                        return (
                          <tr
                            key={row.local_id}
                            className="border-b border-white/30 align-top hover:bg-slate-50/50"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={row.employee_number}
                                onChange={(e) =>
                                  updateRow(
                                    row.local_id,
                                    'employee_number',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={row.employee_name}
                                onChange={(e) =>
                                  updateRow(
                                    row.local_id,
                                    'employee_name',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {matchedEmployee}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={row.work_date}
                                onChange={(e) =>
                                  updateRow(row.local_id, 'work_date', e.target.value)
                                }
                                placeholder="DD.MM.YYYY"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={row.start_time}
                                onChange={(e) =>
                                  updateRow(row.local_id, 'start_time', e.target.value)
                                }
                                placeholder="HH:MM:SS"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={row.end_time}
                                onChange={(e) =>
                                  updateRow(row.local_id, 'end_time', e.target.value)
                                }
                                placeholder="HH:MM:SS"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => removeRow(row.local_id)}
                                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                              >
                                Entfernen
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/50 px-6 py-8 text-sm text-slate-500">
                  Noch keine Importdaten geladen. Lade eine Excel-Datei hoch oder
                  ergänze Zeilen manuell.
                </div>
              )}
            </div>

            <div className="border-t border-white/40 px-6 py-5">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white"
                >
                  Abbrechen
                </button>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isPending || rows.length === 0}
                  className="rounded-2xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? 'Import läuft...' : 'Import speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}