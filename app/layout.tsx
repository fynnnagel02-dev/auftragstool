import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/sidebar'

export const metadata: Metadata = {
  title: 'Auftragstool',
  description: 'NKS Auftrags- und Zeiterfassung',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_25%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] text-slate-900">
        <div className="flex min-h-screen">
          <Sidebar />

          <main className="flex-1 p-6 md:p-8">
            <div className="rounded-[28px] border border-white/40 bg-white/55 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}