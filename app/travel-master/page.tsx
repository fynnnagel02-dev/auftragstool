import { supabase } from '@/lib/supabase'
import TravelProfileEditModal from '@/components/travel-profile-edit-modal'

type Employee = {
  id: string
  employee_number: string | null
  full_name: string
}

type TravelProfile = {
  employee_id: string
  home_address: string | null
  license_plate: string | null
  distance_home_company_km: number | null
  time_home_company_min: number | null
}

type TravelRoute = {
  employee_id: string
  project_id: string
  distance_home_project_km: number | null
  time_home_project_min: number | null
}

type Project = {
  id: string
  project_number: string | null
  name: string
}

export default async function TravelMasterPage() {
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, employee_number, full_name')
    .order('employee_number', { ascending: true })

  const { data: profiles, error: profilesError } = await supabase
    .from('employee_travel_profiles')
    .select(
      'employee_id, home_address, license_plate, distance_home_company_km, time_home_company_min'
    )

  const { data: routes, error: routesError } = await supabase
    .from('employee_travel_project_routes')
    .select(
      'employee_id, project_id, distance_home_project_km, time_home_project_min'
    )

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, project_number, name')
    .order('project_number', { ascending: true })

  if (employeesError) {
    return <p className="text-red-600">Fehler Mitarbeiter: {employeesError.message}</p>
  }

  if (profilesError) {
    return <p className="text-red-600">Fehler Reisekosten-Profile: {profilesError.message}</p>
  }

  if (routesError) {
    return <p className="text-red-600">Fehler Reisekosten-Routen: {routesError.message}</p>
  }

  if (projectsError) {
    return <p className="text-red-600">Fehler Aufträge: {projectsError.message}</p>
  }

  const profileMap = new Map<string, TravelProfile>()
  ;(profiles ?? []).forEach((profile) => {
    profileMap.set(profile.employee_id, profile)
  })

  const routesMap = new Map<string, TravelRoute[]>()
  ;(routes ?? []).forEach((route) => {
    const current = routesMap.get(route.employee_id) ?? []
    current.push(route)
    routesMap.set(route.employee_id, current)
  })

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Reisekosten
      </p>

      <div className="mt-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          Reisekosten Stammdaten
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Pflege Wohnort, KFZ-Kennzeichen sowie die Entfernungen und Zeiten zum
          Unternehmen und zu einzelnen Aufträgen pro Mitarbeiter.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead className="border-b border-white/40 bg-slate-50/60 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Personalnummer</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Wohnort</th>
              <th className="px-4 py-3 font-medium">KFZ</th>
              <th className="px-4 py-3 font-medium">Entfernung Unternehmen</th>
              <th className="px-4 py-3 font-medium">Zeit Unternehmen</th>
              <th className="px-4 py-3 font-medium">Auftragsrouten</th>
              <th className="px-4 py-3 font-medium">Aktion</th>
            </tr>
          </thead>

          <tbody>
            {(employees ?? []).map((employee) => {
              const profile = profileMap.get(employee.id) ?? null
              const employeeRoutes = routesMap.get(employee.id) ?? []

              return (
                <tr
                  key={employee.id}
                  className="border-b border-white/30 hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3">{employee.employee_number || '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {employee.full_name}
                  </td>
                  <td className="px-4 py-3">{profile?.home_address || '—'}</td>
                  <td className="px-4 py-3">{profile?.license_plate || '—'}</td>
                  <td className="px-4 py-3">
                    {profile?.distance_home_company_km !== null &&
                    profile?.distance_home_company_km !== undefined
                      ? `${profile.distance_home_company_km} km`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {profile?.time_home_company_min !== null &&
                    profile?.time_home_company_min !== undefined
                      ? `${profile.time_home_company_min} Min.`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{employeeRoutes.length}</td>
                  <td className="px-4 py-3">
                    <TravelProfileEditModal
                      employee={employee}
                      profile={profile}
                      routes={employeeRoutes}
                      projects={projects ?? []}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}