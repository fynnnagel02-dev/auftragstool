'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getCurrentCompanyContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Nicht eingeloggt.')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (error || !profile?.company_id) {
    throw new Error('Company konnte nicht ermittelt werden.')
  }

  return {
    supabase,
    companyId: profile.company_id,
  }
}

export async function createProject(formData: FormData) {
  const { supabase, companyId } = await getCurrentCompanyContext()

  const projectNumber = formData.get('projectNumber')?.toString().trim()
  const name = formData.get('name')?.toString().trim()
  const status = formData.get('status')?.toString().trim()

  if (!projectNumber || !name || !status) {
    throw new Error('Bitte Auftragsnummer, Name und Status ausfüllen.')
  }

  const { error } = await supabase.from('projects').insert({
    company_id: companyId,
    project_number: projectNumber,
    name,
    status,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/projects')
  revalidatePath('/admin')
  revalidatePath('/travel-master')
  revalidatePath('/travel-expenses')
}

export async function updateProject(projectId: string, formData: FormData) {
  const { supabase, companyId } = await getCurrentCompanyContext()

  const projectNumber = formData.get('projectNumber')?.toString().trim()
  const name = formData.get('name')?.toString().trim()
  const status = formData.get('status')?.toString().trim()

  if (!projectId) {
    throw new Error('Kein Auftrag angegeben.')
  }

  if (!projectNumber || !name || !status) {
    throw new Error('Bitte Auftragsnummer, Name und Status ausfüllen.')
  }

  const { error } = await supabase
    .from('projects')
    .update({
      project_number: projectNumber,
      name,
      status,
    })
    .eq('id', projectId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/admin')
  revalidatePath('/travel-master')
  revalidatePath('/travel-expenses')
  revalidatePath('/foreman')
}

export async function deleteProject(projectId: string) {
  const { supabase, companyId } = await getCurrentCompanyContext()

  if (!projectId) {
    throw new Error('Kein Auftrag angegeben.')
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/projects')
  revalidatePath('/admin')
  revalidatePath('/travel-master')
  revalidatePath('/travel-expenses')
  revalidatePath('/foreman')
}