'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  updateEmployeeFilterGroup,
  deleteEmployeeFilterGroup,
  saveEmployeeFilterGroupMembers,
} from '@/app/settings/actions'

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
}

type FilterGroup = {
  id: string
  name: string
  description: string | null
}

export default function FilterGroupManageModal({
  group,
  employees,
  selectedEmployeeIds,
}: {
  group: FilterGroup
  employees: Employee[]
  selectedEmployeeIds: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description || '')
  const [checkedIds, setCheckedIds] = useState<string[]>(selectedEmployeeIds)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setMounted(true)
  }, [])

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const aValue = a.employee_number || ''
      const bValue = b.employee_number || ''
      return aValue.localeCompare(bValue, 'de')
    })
  }, [employees])

  function toggleEmployee(employeeId: string) {
    setCheckedIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  function handleSaveGroup() {
    setError('')

    startTransition(async () => {
      try {
        const groupFormData = new FormData()
        groupFormData.set('groupId', group.id)
        groupFormData.set('name', name)
        groupFormData.set('description', description)

        await updateEmployeeFilterGroup(groupFormData)

        const memberFormData = new FormData()
        memberFormData.set('groupId', group.id)

        checkedIds.forEach((employeeId) => {
          memberFormData.append('employeeIds', employeeId)
        })

        await saveEmployeeFilterGroupMembers(memberFormData)

        setOpen(false)
        router.refresh()
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Beim Speichern ist ein Fehler aufgetreten.')
        }
      }
    })
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Soll die Filtergruppe "${group.name}" wirklich gelöscht werden?`
    )

    if (!confirmed) return

    setError('')

    startTransition(async () => {
      try {
        await deleteEmployeeFilterGroup(group.id)
        setOpen(false)
        router.refresh()
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Beim Löschen ist ein Fehler aufgetreten.')
        }
      }
    })
  }

  const modalContent =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/40 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
              <div className="border-b border-white/40 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                      Einstellungen
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                      Filtergruppe verwalten
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Bearbeite Name und Beschreibung und ordne Mitarbeiter der
                      Gruppe zu.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Gruppenname *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Beschreibung
                      </label>
                      <textarea
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
                      <p className="text-sm font-medium text-red-800">
                        Gruppe löschen
                      </p>
                      <p className="mt-2 text-sm text-red-700">
                        Diese Aktion entfernt die Gruppe inklusive aller
                        Zuordnungen.
                      </p>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isPending}
                        className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Gruppe löschen
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                      Mitarbeiterzuordnung
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">
                      Mitarbeiter auswählen
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Alle markierten Mitarbeiter werden dieser Filtergruppe
                      zugeordnet.
                    </p>

                    <div className="mt-5 max-h-[50vh] overflow-y-auto rounded-2xl border border-white/40 bg-white/70">
                      <div className="divide-y divide-white/30">
                        {sortedEmployees.map((employee) => {
                          const checked = checkedIds.includes(employee.id)

                          return (
                            <label
                              key={employee.id}
                              className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50/40"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {employee.employee_number} – {employee.full_name}
                                </p>
                              </div>

                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleEmployee(employee.id)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-950 focus:ring-blue-200"
                              />
                            </label>
                          )
                        })}

                        {sortedEmployees.length === 0 && (
                          <div className="px-4 py-6 text-center text-sm text-slate-500">
                            Keine Mitarbeiter vorhanden.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="border-t border-white/40 px-6 py-5">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white"
                  >
                    Abbrechen
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveGroup}
                    disabled={isPending}
                    className="rounded-2xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? 'Speichern...' : 'Änderungen speichern'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white"
      >
        Verwalten
      </button>

      {modalContent}
    </>
  )
}