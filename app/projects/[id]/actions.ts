'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'

export async function createProjectLvPosition(
  projectId: string,
  formData: FormData
) {
  const orderPosition = formData.get('orderPosition')?.toString().trim()
  const lvPosition = formData.get('lvPosition')?.toString().trim()
  const lvDescription = formData.get('lvDescription')?.toString().trim()
  const isActive = formData.get('isActive') === 'on'

  if (!projectId || !orderPosition || !lvPosition || !lvDescription) {
    throw new Error(
      'Bitte Auftragsposition, LV-Position und Bezeichnung ausfüllen.'
    )
  }

  const { error } = await supabase.from('project_lv_positions').insert({
    project_id: projectId,
    order_position: orderPosition,
    lv_position: lvPosition,
    lv_description: lvDescription,
    is_active: isActive,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/projects/${projectId}`)
}

export async function updateProjectLvPosition(
  positionId: string,
  projectId: string,
  formData: FormData
) {
  const orderPosition = formData.get('orderPosition')?.toString().trim()
  const lvPosition = formData.get('lvPosition')?.toString().trim()
  const lvDescription = formData.get('lvDescription')?.toString().trim()
  const isActive = formData.get('isActive') === 'on'

  if (!positionId || !projectId || !orderPosition || !lvPosition || !lvDescription) {
    throw new Error(
      'Bitte Auftragsposition, LV-Position und Bezeichnung ausfüllen.'
    )
  }

  const { error } = await supabase
    .from('project_lv_positions')
    .update({
      order_position: orderPosition,
      lv_position: lvPosition,
      lv_description: lvDescription,
      is_active: isActive,
    })
    .eq('id', positionId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/projects/${projectId}`)
}

export async function deleteProjectLvPosition(
  positionId: string,
  projectId: string
) {
  if (!positionId || !projectId) {
    throw new Error('Keine LV-Position angegeben.')
  }

  const { error } = await supabase
    .from('project_lv_positions')
    .delete()
    .eq('id', positionId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/projects/${projectId}`)
}