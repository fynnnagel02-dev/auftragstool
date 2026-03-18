'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'

const DEFAULT_COMPANY_ID = '16757ba0-701f-4e64-98fa-eece23f8e7c4'

export async function createProject(formData: FormData) {
  const projectNumber = formData.get('projectNumber')?.toString().trim()
  const name = formData.get('name')?.toString().trim()
  const status = formData.get('status')?.toString().trim()

  if (!projectNumber || !name || !status) {
    throw new Error('Bitte Auftragsnummer, Name und Status ausfüllen.')
  }

  const { error } = await supabase.from('projects').insert({
    company_id: DEFAULT_COMPANY_ID,
    project_number: projectNumber,
    name,
    status,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/projects')
}

export async function updateProject(projectId: string, formData: FormData) {
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

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/projects')
}

export async function deleteProject(projectId: string) {
  if (!projectId) {
    throw new Error('Kein Auftrag angegeben.')
  }

  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/projects')
}