'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)

    const supabase = createClient()
    await supabase.auth.signOut()

    window.location.href = '/login'
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Abmelden...' : 'Abmelden'}
    </button>
  )
}