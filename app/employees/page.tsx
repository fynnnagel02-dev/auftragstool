import { createClient } from '@/lib/supabase/server'
import EmployeeCreateModal from '@/components/employee-create-modal'
import EmployeeEditModal from '@/components/employee-edit-modal'

export default async function EmployeesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-red-600">Kein Benutzer gefunden.</p>
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    return <p className="text-red-600">Profil konnte nicht geladen werden.</p>
  }

  const companyId = profile.company_id

  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId)
    .order('employee_number', { ascending: true })

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Mitarbeiter
      </p>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">
          Mitarbeiterübersicht
        </h1>

        <EmployeeCreateModal />
      </div>

      {error && <p className="mt-4 text-red-600">Fehler: {error.message}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="border-b border-white/40 bg-slate-50/60 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Personalnummer</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Arbeitgeber / Firma</th>
              <th className="px-4 py-3 font-medium">Eintrittsdatum</th>
              <th className="px-4 py-3 font-medium">Kostenstelle</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Aktion</th>
            </tr>
          </thead>

          <tbody>
            {employees?.map((employee) => (
              <tr
                key={employee.id}
                className="border-b border-white/30 hover:bg-slate-50/50"
              >
                <td className="px-4 py-3">{employee.employee_number}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {employee.full_name}
                </td>
                <td className="px-4 py-3">{employee.employer || '—'}</td>
                <td className="px-4 py-3">{employee.entry_date || '—'}</td>
                <td className="px-4 py-3">{employee.cost_center || '—'}</td>
                <td className="px-4 py-3">
                  {employee.is_active ? 'Aktiv' : 'Inaktiv'}
                </td>
                <td className="px-4 py-3">
                  <EmployeeEditModal employee={employee} />
                </td>
              </tr>
            ))}

            {employees && employees.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Für diese Firma sind noch keine Mitarbeiter angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}