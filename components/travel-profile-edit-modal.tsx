'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveEmployeeTravelProfile } from '@/app/travel-master/actions'
import { getErrorMessage } from '@/lib/app-errors'
import AppModal from './app-modal'

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
}

type Project = {
  id: string
  project_number: string | null
  name: string
}

type ExistingRoute = {
  project_id: string
  distance_home_project_km: number | null
  time_home_project_min: number | null
}

type TravelProfile = {
  home_address: string | null
  license_plate: string | null
  distance_home_company_km: number | null
  time_home_company_min: number | null
}

type RouteRow = {
  local_id: string
  project_id: string
  distance_home_project_km: string
  time_home_project_min: string
}

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function TravelProfileEditModal({
  employee,
  profile,
  routes,
  projects,
}: {
  employee: Employee
  profile: TravelProfile | null
  routes: ExistingRoute[]
  projects: Project[]
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const initialRoutes = useMemo<RouteRow[]>(() => {
    if (routes.length === 0) {
      return []
    }

    return routes.map((route) => ({
      local_id: createLocalId(),
      project_id: route.project_id,
      distance_home_project_km:
        route.distance_home_project_km !== null
          ? String(route.distance_home_project_km)
          : '',
      time_home_project_min:
        route.time_home_project_min !== null
          ? String(route.time_home_project_min)
          : '',
    }))
  }, [routes])

  const [routeRows, setRouteRows] = useState<RouteRow[]>(initialRoutes)

  function addRoute() {
    setRouteRows((prev) => [
      ...prev,
      {
        local_id: createLocalId(),
        project_id: '',
        distance_home_project_km: '',
        time_home_project_min: '',
      },
    ])
  }

  function updateRoute(
    localId: string,
    field: keyof RouteRow,
    value: string
  ) {
    setRouteRows((prev) =>
      prev.map((row) =>
        row.local_id === localId ? { ...row, [field]: value } : row
      )
    )
  }

  function removeRoute(localId: string) {
    setRouteRows((prev) => prev.filter((row) => row.local_id !== localId))
  }

  function handleSubmit(formData: FormData) {
    setError('')
    formData.set(
      'routes',
      JSON.stringify(
        routeRows.map((row) => ({
          project_id: row.project_id,
          distance_home_project_km: row.distance_home_project_km,
          time_home_project_min: row.time_home_project_min,
        }))
      )
    )

    startTransition(async () => {
      try {
        await saveEmployeeTravelProfile(employee.id, formData)
        setOpen(false)
        router.refresh()
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            'Reisekosten-Stammdaten konnten nicht gespeichert werden.'
          )
        )
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-medium text-blue-950 transition hover:bg-blue-100/80"
      >
        Bearbeiten
      </button>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="Reisekosten-Stammdaten bearbeiten"
        subtitle={`${employee.employee_number ?? '—'} – ${employee.full_name}`}
        maxWidthClassName="max-w-4xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Abbrechen
            </button>

            <button
              type="submit"
              form={`travel-profile-form-${employee.id}`}
              disabled={isPending}
              className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Speichern...' : 'Änderungen speichern'}
            </button>
          </div>
        }
      >
        <form
          id={`travel-profile-form-${employee.id}`}
          action={handleSubmit}
          className="space-y-8"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Wohnort / Adresse
              </label>
              <input
                name="homeAddress"
                type="text"
                defaultValue={profile?.home_address ?? ''}
                placeholder="z. B. Musterstraße 12, 24103 Kiel"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                KFZ-Kennzeichen
              </label>
              <input
                name="licensePlate"
                type="text"
                defaultValue={profile?.license_plate ?? ''}
                placeholder="optional"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/40 bg-white/65 p-5">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Unternehmen
            </p>

            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Entfernung Wohnort → Unternehmen (km)
                </label>
                <input
                  name="distanceHomeCompanyKm"
                  type="number"
                  step="0.01"
                  defaultValue={profile?.distance_home_company_km ?? ''}
                  placeholder="optional"
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Zeit Wohnort → Unternehmen (Min.)
                </label>
                <input
                  name="timeHomeCompanyMin"
                  type="number"
                  step="1"
                  defaultValue={profile?.time_home_company_min ?? ''}
                  placeholder="optional"
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/40 bg-white/65 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                  Auftragsrouten
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Hinterlege optionale Entfernungen und Zeiten vom Wohnort zu
                  einzelnen Aufträgen.
                </p>
              </div>

              <button
                type="button"
                onClick={addRoute}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-950 transition hover:bg-blue-100"
              >
                + Auftrag hinzufügen
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {routeRows.length > 0 ? (
                routeRows.map((row) => (
                  <div
                    key={row.local_id}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-4"
                  >
                    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr_auto]">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Auftrag
                        </label>
                        <select
                          value={row.project_id}
                          onChange={(e) =>
                            updateRoute(row.local_id, 'project_id', e.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">Auftrag wählen</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.project_number} – {project.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Entfernung (km)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={row.distance_home_project_km}
                          onChange={(e) =>
                            updateRoute(
                              row.local_id,
                              'distance_home_project_km',
                              e.target.value
                            )
                          }
                          placeholder="optional"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Zeit (Min.)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={row.time_home_project_min}
                          onChange={(e) =>
                            updateRoute(
                              row.local_id,
                              'time_home_project_min',
                              e.target.value
                            )
                          }
                          placeholder="optional"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeRoute(row.local_id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-4 py-5 text-sm text-slate-500">
                  Noch keine auftragsspezifischen Routen hinterlegt.
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>
      </AppModal>
    </>
  )
}