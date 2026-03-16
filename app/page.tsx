import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('*')
    .order('employee_number', { ascending: true })

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('project_number', { ascending: true })

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Auftragstool</h1>
      <p className="mt-4 text-lg">Verbindung mit echten Mock-Daten</p>

      {employeesError && (
        <p className="mt-4 text-red-600">
          Fehler Mitarbeiter: {employeesError.message}
        </p>
      )}

      {projectsError && (
        <p className="mt-4 text-red-600">
          Fehler Aufträge: {projectsError.message}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Mitarbeiter</h2>
        <ul className="mt-4 space-y-2">
          {employees?.map((employee) => (
            <li key={employee.id} className="rounded border p-3">
              {employee.employee_number} – {employee.full_name}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Aufträge</h2>
        <ul className="mt-4 space-y-2">
          {projects?.map((project) => (
            <li key={project.id} className="rounded border p-3">
              {project.project_number} – {project.name}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}