import { supabase } from '@/lib/supabase'
import ProjectsTable from '@/components/projects-table'
import ProjectCreateModal from '@/components/project-create-modal'

export default async function ProjectsPage() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('project_number', { ascending: true })

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Aufträge
      </p>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">
          Auftragsübersicht
        </h1>

        <ProjectCreateModal />
      </div>

      {error && (
        <p className="mt-4 text-red-600">Fehler: {error.message}</p>
      )}

      {projects && <ProjectsTable projects={projects} />}
    </div>
  )
}