import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ProjectLvCreateModal from '@/components/project-lv-create-modal'
import ProjectLvEditModal from '@/components/project-lv-edit-modal'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  const { data: lvPositions, error: lvError } = await supabase
    .from('project_lv_positions')
    .select('*')
    .eq('project_id', id)
    .order('order_position', { ascending: true })

  if (error) {
    return <p className="text-red-600">Fehler: {error.message}</p>
  }

  if (!project) {
    return <p>Kein Auftrag gefunden.</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Aufträge
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            {project.project_number} – {project.name}
          </h1>
        </div>

        <Link
          href="/projects"
          className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2 text-sm font-medium text-blue-950 transition hover:bg-blue-100/80"
        >
          ← Zurück zu Aufträge
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
        <p className="text-sm text-slate-500">Status</p>
        <p className="mt-1 text-lg font-medium text-slate-900">
          {project.status || '—'}
        </p>

        <p className="mt-4 text-sm text-slate-500">Projekt-ID</p>
        <p className="mt-1 text-sm text-slate-700">{project.id}</p>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">
            LV-Positionen
          </h2>

          <ProjectLvCreateModal projectId={project.id} />
        </div>

        {lvError && (
          <p className="mt-4 text-red-600">
            Fehler LV-Positionen: {lvError.message}
          </p>
        )}

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/40 bg-slate-50/60 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Auftragsposition</th>
                <th className="px-4 py-3 font-medium">LV-Position</th>
                <th className="px-4 py-3 font-medium">
                  Bezeichnung LV-Position
                </th>
                <th className="px-4 py-3 font-medium">Aktiv</th>
                <th className="px-4 py-3 font-medium">Aktion</th>
              </tr>
            </thead>

            <tbody>
              {lvPositions?.map((position) => (
                <tr
                  key={position.id}
                  className="border-b border-white/30 hover:bg-blue-50/40"
                >
                  <td className="px-4 py-3">{position.order_position}</td>
                  <td className="px-4 py-3">{position.lv_position}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {position.lv_description}
                  </td>
                  <td className="px-4 py-3">
                    {position.is_active ? 'Ja' : 'Nein'}
                  </td>
                  <td className="px-4 py-3">
                    <ProjectLvEditModal
                      projectId={project.id}
                      position={position}
                    />
                  </td>
                </tr>
              ))}

              {lvPositions && lvPositions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Für diesen Auftrag sind noch keine LV-Positionen vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}