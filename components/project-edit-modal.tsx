'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject, updateProject } from '@/app/projects/actions'
import AppModal from './app-modal'

type Project = {
  id: string
  project_number: string | null
  name: string
  status: string | null
}

export default function ProjectEditModal({
  project,
}: {
  project: Project
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    setError('')

    startTransition(async () => {
      try {
        await updateProject(project.id, formData)
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
      'Möchtest du diesen Auftrag wirklich löschen?'
    )

    if (!confirmed) return

    setError('')

    startDeleteTransition(async () => {
      try {
        await deleteProject(project.id)
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
        title="Auftrag bearbeiten"
        subtitle="Passe Auftragsnummer, Bezeichnung und Status an."
        maxWidthClassName="max-w-2xl"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Löschen...' : 'Auftrag löschen'}
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Abbrechen
              </button>

              <button
                type="submit"
                form={`project-edit-form-${project.id}`}
                disabled={isPending || isDeleting}
                className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Speichern...' : 'Änderungen speichern'}
              </button>
            </div>
          </div>
        }
      >
        <form
          id={`project-edit-form-${project.id}`}
          action={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Auftragsnummer *
            </label>
            <input
              name="projectNumber"
              type="text"
              defaultValue={project.project_number ?? ''}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Bezeichnung / Name *
            </label>
            <input
              name="name"
              type="text"
              defaultValue={project.name}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status *
            </label>
            <select
              name="status"
              defaultValue={project.status ?? 'active'}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="archived">archived</option>
            </select>
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