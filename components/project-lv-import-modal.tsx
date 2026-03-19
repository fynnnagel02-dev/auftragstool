'use client'

import { useMemo, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import { importProjectLvPositions } from '@/app/projects/[id]/actions'

type ImportRow = {
  local_id: string
  order_position: string
  lv_position: string
  lv_description: string
}

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function cellToString(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export default function ProjectLvImportModal({
  projectId,
}: {
  projectId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isPending, startTransition] = useTransition()

  const hasRows = rows.length > 0

  const duplicateInfo = useMemo(() => {
    const orderMap = new Map<string, number>()
    const lvMap = new Map<string, number>()

    rows.forEach((row) => {
      const order = row.order_position.trim()
      const lv = row.lv_position.trim()

      if (order) orderMap.set(order, (orderMap.get(order) ?? 0) + 1)
      if (lv) lvMap.set(lv, (lvMap.get(lv) ?? 0) + 1)
    })

    const duplicateOrders = Array.from(orderMap.entries())
      .filter(([, count]) => count > 1)
      .map(([value]) => value)

    const duplicateLvs = Array.from(lvMap.entries())
      .filter(([, count]) => count > 1)
      .map(([value]) => value)

    return {
      duplicateOrders,
      duplicateLvs,
    }
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
        order_position: '',
        lv_position: '',
        lv_description: '',
      },
    ])
  }

  function parseSheetToRows(data: unknown[][]) {
    const parsedRows: ImportRow[] = []

    for (let i = 1; i < data.length; i += 1) {
      const row = data[i]

      const orderPosition = cellToString(row?.[0])
      const lvPosition = cellToString(row?.[1])
      const lvDescription = cellToString(row?.[2])

      const isCompletelyEmpty =
        !orderPosition && !lvPosition && !lvDescription

      if (isCompletelyEmpty) continue

      parsedRows.push({
        local_id: createLocalId(),
        order_position: orderPosition,
        lv_position: lvPosition,
        lv_description: lvDescription,
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
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
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
        }) as unknown[][]

        if (!rawRows.length) {
          setError('Die Datei ist leer.')
          return
        }

        const parsedRows = parseSheetToRows(rawRows)

        if (!parsedRows.length) {
          setError(
            'Es konnten keine importierbaren Zeilen gefunden werden. Erwartet werden Werte in Spalte A, B und C.'
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

    if (!hasRows) {
      setError('Bitte zuerst eine Datei laden oder Zeilen erfassen.')
      return
    }

    if (duplicateInfo.duplicateOrders.length > 0) {
      setError(
        `Doppelte Auftragspositionen in der Vorschau: ${duplicateInfo.duplicateOrders.join(
          ', '
        )}`
      )
      return
    }

    if (duplicateInfo.duplicateLvs.length > 0) {
      setError(
        `Doppelte LV-Positionen in der Vorschau: ${duplicateInfo.duplicateLvs.join(
          ', '
        )}`
      )
      return
    }

    startTransition(async () => {
      try {
        await importProjectLvPositions(
          projectId,
          rows.map((row) => ({
            order_position: row.order_position,
            lv_position: row.lv_position,
            lv_description: row.lv_description,
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2 text-sm font-medium text-blue-950 transition hover:bg-blue-100/80"
      >
        LV importieren
      </button>

      {open && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/40 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
            <div className="border-b border-white/40 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                    Auftrag
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    LV-Positionen importieren
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Lade eine Excel-Datei mit drei Spalten hoch:
                    Auftragsposition, LV Pos und Bezeichnung. Vor dem Import
                    kannst du alle Zeilen prüfen und korrigieren.
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
                <div>
                  <label className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white">
                    Excel-Datei auswählen
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

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

              {hasRows ? (
                <div className="mt-6 overflow-x-auto rounded-2xl border border-white/40 bg-white/70 max-h-[55vh]">
                  <table className="min-w-[1100px] w-full text-left text-sm">
                    <thead className="sticky top-0 z-20 border-b border-white/40 bg-slate-50/95 text-slate-500 backdrop-blur">
                      <tr>
                        <th className="px-4 py-3 font-medium">Auftragsposition</th>
                        <th className="px-4 py-3 font-medium">LV Pos</th>
                        <th className="px-4 py-3 font-medium">Bezeichnung</th>
                        <th className="px-4 py-3 font-medium">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.local_id}
                          className="border-b border-white/30 align-top hover:bg-slate-50/50"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.order_position}
                              onChange={(e) =>
                                updateRow(
                                  row.local_id,
                                  'order_position',
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.lv_position}
                              onChange={(e) =>
                                updateRow(
                                  row.local_id,
                                  'lv_position',
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.lv_description}
                              onChange={(e) =>
                                updateRow(
                                  row.local_id,
                                  'lv_description',
                                  e.target.value
                                )
                              }
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/50 px-6 py-8 text-sm text-slate-500">
                  Noch keine Importdaten geladen. Lade eine Excel-Datei hoch oder
                  erfasse Zeilen manuell.
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
                  disabled={isPending || !hasRows}
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