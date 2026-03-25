'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProjectLvPosition } from '@/app/projects/[id]/actions'
import { getErrorMessage } from '@/lib/app-errors'

export default function ProjectLvCreateModal({
  projectId,
}: {
  projectId: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    setError('')

    startTransition(async () => {
      try {
        await createProjectLvPosition(projectId, formData)
        setOpen(false)
        router.refresh()
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            'Beim Speichern der LV-Position ist ein Fehler aufgetreten.'
          )
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
        + LV-Position anlegen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/40 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                  LV-Positionen
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  LV-Position anlegen
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Lege eine neue LV-Position für diesen Auftrag an.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <form action={handleSubmit} className="mt-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Auftragsposition *
                  </label>
                  <input
                    name="orderPosition"
                    type="text"
                    placeholder="z. B. 05"
                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    LV-Position *
                  </label>
                  <input
                    name="lvPosition"
                    type="text"
                    placeholder="z. B. 05.001"
                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Bezeichnung LV-Position *
                </label>
                <input
                  name="lvDescription"
                  type="text"
                  placeholder="z. B. Stahlbauarbeiten"
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 text-blue-950 focus:ring-blue-200"
                />
                LV-Position ist aktiv
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Abbrechen
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? 'Speichern...' : 'LV-Position speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}