'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/projects/actions'
import { getErrorMessage } from '@/lib/app-errors'
import AppModal from './app-modal'

export default function ProjectCreateModal() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    setError('')

    startTransition(async () => {
      try {
        await createProject(formData)
        setOpen(false)
        router.refresh()
      } catch (err) {
        setError(
          getErrorMessage(err, 'Beim Speichern des Auftrags ist ein Fehler aufgetreten.')
        )
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-900"
      >
        + Auftrag anlegen
      </button>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="Auftrag anlegen"
        subtitle="Lege einen neuen Auftrag für die aktuelle Firma an."
        maxWidthClassName="max-w-2xl"
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
              form="project-create-form"
              disabled={isPending}
              className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Speichern...' : 'Auftrag speichern'}
            </button>
          </div>
        }
      >
        <form id="project-create-form" action={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Auftragsnummer *
            </label>
            <input
              name="projectNumber"
              type="text"
              placeholder="z. B. A-2026-004"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Bezeichnung / Name *
            </label>
            <input
              name="name"
              type="text"
              placeholder="z. B. Erweiterung Werkhalle Süd"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status *
            </label>
            <select
              name="status"
              defaultValue="active"
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