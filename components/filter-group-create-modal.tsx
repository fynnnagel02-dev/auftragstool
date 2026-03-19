'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createEmployeeFilterGroup } from '@/app/settings/actions'

export default function FilterGroupCreateModal({
  companyId,
}: {
  companyId: string
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleSubmit(formData: FormData) {
    setError('')

    startTransition(async () => {
      try {
        await createEmployeeFilterGroup(formData)
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

  const modalContent =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[32px] border border-white/40 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                    Einstellungen
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Filtergruppe anlegen
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Erstelle eine neue Gruppe, um Mitarbeiter später gesammelt
                    auswählen zu können.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>

              <form action={handleSubmit} className="mt-6 space-y-5">
                <input type="hidden" name="companyId" value={companyId} />

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

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white"
                  >
                    Abbrechen
                  </button>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-2xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? 'Speichern...' : 'Gruppe speichern'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-2xl bg-blue-950 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-900"
      >
        Filtergruppe anlegen
      </button>

      {modalContent}
    </>
  )
}