'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  deleteProjectLvPosition,
  updateProjectLvPosition,
} from '@/app/projects/[id]/actions'
import AppModal from './app-modal'

type LvPosition = {
  id: string
  order_position: string
  lv_position: string
  lv_description: string
  is_active: boolean
}

export default function ProjectLvEditModal({
  projectId,
  position,
}: {
  projectId: string
  position: LvPosition
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
        await updateProjectLvPosition(position.id, projectId, formData)
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
      'Möchtest du diese LV-Position wirklich löschen?'
    )

    if (!confirmed) return

    setError('')

    startDeleteTransition(async () => {
      try {
        await deleteProjectLvPosition(position.id, projectId)
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
        title="LV-Position bearbeiten"
        subtitle="Passe Auftragsposition, LV-Position, Bezeichnung und Status an."
        maxWidthClassName="max-w-2xl"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Löschen...' : 'LV-Position löschen'}
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
                form={`lv-edit-form-${position.id}`}
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
          id={`lv-edit-form-${position.id}`}
          action={handleSubmit}
          className="space-y-5"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Auftragsposition *
              </label>
              <input
                name="orderPosition"
                type="text"
                defaultValue={position.order_position}
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                LV-Position *
              </label>
              <input
                name="lvPosition"
                type="text"
                defaultValue={position.lv_position}
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
              defaultValue={position.lv_description}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={position.is_active}
              className="h-4 w-4 rounded border-slate-300 text-blue-950 focus:ring-blue-200"
            />
            LV-Position ist aktiv
          </label>

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