import { createClient } from '@/lib/supabase/server'

export type Role = 'geschaeftsfuehrer' | 'admin' | 'vorarbeiter'

type ProfileRow = {
  company_id: string | null
  role: Role | null
  full_name: string | null
}

export async function requireCompanyContext(allowedRoles?: Role[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Nicht eingeloggt.')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('company_id, role, full_name')
    .eq('id', user.id)
    .single<ProfileRow>()

  if (error || !profile?.company_id) {
    throw new Error('Company konnte nicht ermittelt werden.')
  }

  if (
    allowedRoles &&
    (!profile.role || !allowedRoles.includes(profile.role))
  ) {
    throw new Error('Keine Berechtigung für diese Aktion.')
  }

  return {
    supabase,
    user,
    companyId: profile.company_id,
    role: profile.role,
    fullName: profile.full_name,
  }
}
