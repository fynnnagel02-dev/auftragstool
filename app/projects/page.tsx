import { createClient } from '@/lib/supabase/server'
import ProjectsTable from '@/components/projects-table'
import ProjectCreateModal from '@/components/project-create-modal'

export default async function ProjectsPage() {
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

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
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

      {error && <p className="mt-4 text-red-600">Fehler: {error.message}</p>}

      {projects && <ProjectsTable projects={projects} />}
    </div>
  )
}