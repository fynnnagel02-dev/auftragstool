'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEmployeeFilterGroup } from '@/app/settings/actions'
import { getErrorMessage } from '@/lib/app-errors'
import AppModal from './app-modal'

export default function FilterGroupCreateModal() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    setError('')

    startTransition(async () => {
      try {
        await createEmployeeFilterGroup(formData)
        setOpen(false)
        router.refresh()
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            'Filtergruppe konnte nicht gespeichert werden.'
          )
        )
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-2xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900"
      >
        Filtergruppe anlegen
      </button>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="Filtergruppe anlegen"
        subtitle="Erstelle eine neue Gruppe, um Mitarbeiter später gesammelt auswählen zu können."
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white"
            >
              Abbrechen
            </button>

            <button
              type="submit"
              form="filter-group-create-form"
              disabled={isPending}
              className="rounded-2xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Speichern...' : 'Gruppe speichern'}
            </button>
          </div>
        }
      >
        <form id="filter-group-create-form" action={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Gruppenname *
            </label>
            <input
              name="name"
              type="text"
              placeholder="z. B. Vorarbeiter Müller"
              className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Beschreibung
            </label>
            <textarea
              name="description"
              rows={4}
              placeholder="optional"
              className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
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
