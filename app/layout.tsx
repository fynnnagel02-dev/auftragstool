import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Auftragstool',
  description: 'Auftrags-, Reisekosten- und Controllingtool',
}

type Role = 'geschaeftsfuehrer' | 'admin' | 'vorarbeiter'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: Role | null = null
  let fullName: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profile?.role) {
      role = profile.role as Role
      fullName = profile.full_name ?? null
    }
  }

  return (
    <html lang="de">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_25%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] text-slate-900">
        {role ? (
          <div className="flex min-h-screen overflow-x-hidden">
            <Sidebar role={role} fullName={fullName} />

            <main className="min-w-0 flex-1 p-6 md:p-8">
              <div className="rounded-[28px] border border-white/40 bg-white/55 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
                {children}
              </div>
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  )
}