import { createClient } from '@/lib/supabase/server'
import FilterGroupCreateModal from '@/components/filter-group-create-modal'
import FilterGroupManageModal from '@/components/filter-group-manage-modal'

type Role = 'geschaeftsfuehrer' | 'admin' | 'vorarbeiter'

type GroupMember = {
  id: string
  group_id: string
  employee_id: string
}

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-red-600">Kein Benutzer gefunden.</p>
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, company_id, full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return <p className="text-red-600">Profil konnte nicht geladen werden.</p>
  }

  const role = profile.role as Role

  if (role !== 'admin' && role !== 'geschaeftsfuehrer') {
    return <p className="text-red-600">Kein Zugriff auf Einstellungen.</p>
  }

  const companyId = profile.company_id

  const { data: groups, error: groupsError } = await supabase
    .from('employee_filter_groups')
    .select('id, name, description, created_at')
    .eq('company_id', companyId)
    .order('name', { ascending: true })

  const { data: groupMembers, error: membersError } = await supabase
    .from('employee_filter_group_members')
    .select('id, group_id, employee_id')

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, employee_number, full_name')
    .eq('company_id', companyId)
    .order('employee_number', { ascending: true })

  const memberCountMap = new Map<string, number>()
  ;(groupMembers ?? []).forEach((member: GroupMember) => {
    memberCountMap.set(
      member.group_id,
      (memberCountMap.get(member.group_id) ?? 0) + 1
    )
  })

  const memberIdsByGroup = new Map<string, string[]>()
  ;(groupMembers ?? []).forEach((member: GroupMember) => {
    const current = memberIdsByGroup.get(member.group_id) ?? []
    current.push(member.employee_id)
    memberIdsByGroup.set(member.group_id, current)
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/40 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              Einstellungen
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Systemeinstellungen
            </h1>
            <p className="mt-3 max-w-3xl text-slate-600">
              Verwaltung zentraler Einstellungen für die Firma. Aktuell können
              hier Filtergruppen gepflegt werden. Weitere Bereiche wie Benutzer,
              Unternehmen und Regelwerke können später ergänzt werden.
            </p>
          </div>

          <FilterGroupCreateModal companyId={companyId} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.32fr_0.68fr]">
        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Bereiche
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm font-medium text-blue-950">
              Filtergruppen
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-4 py-3 text-sm text-slate-400">
              Benutzer & Rollen (später)
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-4 py-3 text-sm text-slate-400">
              Unternehmen (später)
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-4 py-3 text-sm text-slate-400">
              Arbeitszeit-Regeln (später)
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-4 py-3 text-sm text-slate-400">
              Reisekosten-Regeln (später)
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/40 bg-white/60 p-6 backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Filtergruppen
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Gruppenübersicht
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Gruppen helfen dabei, Mitarbeiter später gesammelt im
            Vorarbeiter-Dashboard zu laden.
          </p>

          {groupsError && (
            <p className="mt-4 text-red-600">
              Fehler Gruppen: {groupsError.message}
            </p>
          )}

          {membersError && (
            <p className="mt-4 text-red-600">
              Fehler Mitglieder: {membersError.message}
            </p>
          )}

          {employeesError && (
            <p className="mt-4 text-red-600">
              Fehler Mitarbeiter: {employeesError.message}
            </p>
          )}

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/40 bg-white/70">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/40 bg-slate-50/70 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Gruppenname</th>
                  <th className="px-4 py-3 font-medium">Beschreibung</th>
                  <th className="px-4 py-3 font-medium">Mitglieder</th>
                  <th className="px-4 py-3 font-medium">Erstellt am</th>
                  <th className="px-4 py-3 font-medium">Aktion</th>
                </tr>
              </thead>

              <tbody>
                {(groups ?? []).map((group) => (
                  <tr
                    key={group.id}
                    className="border-b border-white/30 hover:bg-slate-50/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {group.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {group.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {memberCountMap.get(group.id) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(group.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3">
                      {employees && (
                        <FilterGroupManageModal
                          group={group}
                          employees={employees}
                          selectedEmployeeIds={memberIdsByGroup.get(group.id) ?? []}
                        />
                      )}
                    </td>
                  </tr>
                ))}

                {(groups ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Es sind noch keine Filtergruppen angelegt.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}