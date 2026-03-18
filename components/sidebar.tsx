'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navGroups = [
  {
    title: 'Übersicht',
    items: [
      { href: '/', label: 'Home' },
      { href: '/admin', label: 'Büro-Dashboard' },
      { href: '/foreman', label: 'Vorarbeiter-Dashboard' },
    ],
  },
  {
    title: 'Operativ',
    items: [
      { href: '/datensammlung', label: 'Datensammlung' },
      { href: '/travel-expenses', label: 'Reisekosten' },
    ],
  },
  {
    title: 'Stammdaten',
    items: [
      { href: '/employees', label: 'Mitarbeiter' },
      { href: '/projects', label: 'Aufträge' },
      { href: '/travel-master', label: 'Reisekosten Stammdaten' },
    ],
  },
  {
    title: 'Auswertung',
    items: [{ href: '/kpi-dashboard', label: 'KPI Dashboard' }],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  function isActivePath(href: string) {
    if (href === '/') {
      return pathname === '/'
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="w-76 border-r border-white/30 bg-white/35 backdrop-blur-2xl">
      <div className="flex h-full flex-col p-5">
        <div className="mb-6 rounded-[28px] border border-white/40 bg-white/50 p-5 shadow-sm backdrop-blur-xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
            Auftragstool
          </p>

          <div className="mt-4 flex justify-center">
            <Image
              src="/Logo.jpeg"
              alt="Logo"
              width={180}
              height={180}
              className="h-auto w-[180px] object-contain"
              priority
            />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
                {group.title}
              </p>

              <div className="space-y-2">
                {group.items.map((item) => {
                  const isActive = isActivePath(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? 'border border-blue-200/80 bg-blue-100/70 text-blue-950 shadow-sm backdrop-blur-xl'
                          : 'border border-transparent bg-transparent text-slate-700 hover:border-white/40 hover:bg-white/60 hover:text-slate-900'
                      }`}
                    >
                      <span>{item.label}</span>

                      <span
                        className={`h-2.5 w-2.5 rounded-full transition ${
                          isActive
                            ? 'bg-blue-950'
                            : 'bg-transparent group-hover:bg-blue-200'
                        }`}
                      />
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-6 rounded-[28px] border border-white/20 bg-blue-950/95 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
          <p className="text-sm font-semibold">Systemstatus</p>
          <p className="mt-2 text-sm leading-6 text-blue-100">
            Zentrale Oberfläche für Büro, Vorarbeiter, Reisekosten und
            Controlling.
          </p>
        </div>
      </div>
    </aside>
  )
}