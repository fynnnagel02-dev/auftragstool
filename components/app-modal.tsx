'use client'

import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type AppModalProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  maxWidthClassName?: string
}

export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidthClassName = 'max-w-2xl',
}: AppModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!mounted || !open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div
          className={`relative flex h-[min(92dvh,900px)] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-[28px] border border-white/40 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
              {subtitle && (
                <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              ✕
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {children}
          </div>

          {footer && (
            <div className="border-t border-slate-200/70 px-5 py-4 sm:px-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}