'use client'

import { useRouter } from 'next/navigation'
import ProjectEditModal from './project-edit-modal'

type Project = {
  id: string
  project_number: string | null
  name: string
  status: string | null
}

export default function ProjectsTable({
  projects,
}: {
  projects: Project[]
}) {
  const router = useRouter()

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/40 bg-slate-50/60 text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Auftragsnummer</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Aktion</th>
          </tr>
        </thead>

        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
              className="cursor-pointer border-b border-white/30 transition hover:bg-blue-50/60"
            >
              <td className="px-4 py-3">{project.project_number}</td>

              <td className="px-4 py-3 font-medium text-slate-800">
                {project.name}
              </td>

              <td className="px-4 py-3">{project.status || '—'}</td>

              {/* WICHTIG: stopPropagation */}
              <td
                className="px-4 py-3 text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <ProjectEditModal project={project} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}