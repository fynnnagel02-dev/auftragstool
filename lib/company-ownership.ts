import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function ensureCompanyRecordExists(
  supabase: SupabaseServerClient,
  table: string,
  companyId: string,
  id: string,
  errorMessage: string,
  idColumn = 'id'
) {
  const { data, error } = await supabase
    .from(table)
    .select(idColumn)
    .eq('company_id', companyId)
    .eq(idColumn, id)
    .maybeSingle()

  if (error || !data) {
    throw new Error(errorMessage)
  }
}

export async function ensureCompanyRecordsExist(
  supabase: SupabaseServerClient,
  table: string,
  companyId: string,
  ids: string[],
  errorMessage: string,
  idColumn = 'id'
) {
  const uniqueIds = [...new Set(ids.filter(Boolean))]

  if (uniqueIds.length === 0) {
    return
  }

  const { data, error } = await supabase
    .from(table)
    .select(idColumn)
    .eq('company_id', companyId)
    .in(idColumn, uniqueIds)

  if (error) {
    throw new Error(error.message)
  }

  if ((data ?? []).length !== uniqueIds.length) {
    throw new Error(errorMessage)
  }
}
