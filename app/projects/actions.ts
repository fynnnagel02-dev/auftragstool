'use server'

import { requireCompanyContext } from '@/lib/auth'
import { revalidatePaths, REVALIDATE_PROJECTS } from '@/lib/revalidate-paths'

export async function createProject(formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

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

  revalidatePaths(REVALIDATE_PROJECTS.filter((path) => path !== '/foreman'))
}

export async function updateProject(projectId: string, formData: FormData) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

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

  revalidatePaths([...REVALIDATE_PROJECTS, `/projects/${projectId}`])
}

export async function deleteProject(projectId: string) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

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

  revalidatePaths(REVALIDATE_PROJECTS)
}
