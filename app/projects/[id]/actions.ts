'use server'

import { requireCompanyContext } from '@/lib/auth'
import {
  ensureCompanyRecordExists,
  ensureCompanyRecordsExist,
} from '@/lib/company-ownership'
import { revalidatePaths, REVALIDATE_PROJECTS } from '@/lib/revalidate-paths'

type ImportRow = {
  order_position: string
  lv_position: string
  lv_description: string
}

function normalizeValue(value: string) {
  return value.trim()
}

export async function createProjectLvPosition(
  projectId: string,
  formData: FormData
) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  const orderPosition = formData.get('orderPosition')?.toString().trim()
  const lvPosition = formData.get('lvPosition')?.toString().trim()
  const lvDescription = formData.get('lvDescription')?.toString().trim()
  const isActive = formData.get('isActive') === 'on'

  if (!projectId || !orderPosition || !lvPosition || !lvDescription) {
    throw new Error(
      'Bitte Auftragsposition, LV-Position und Bezeichnung ausfüllen.'
    )
  }

  await ensureCompanyRecordExists(
    supabase,
    'projects',
    companyId,
    projectId,
    'Der ausgewählte Auftrag gehört nicht zu deiner Firma.'
  )

  const { error } = await supabase.from('project_lv_positions').insert({
    company_id: companyId,
    project_id: projectId,
    order_position: orderPosition,
    lv_position: lvPosition,
    lv_description: lvDescription,
    is_active: isActive,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePaths([...REVALIDATE_PROJECTS, `/projects/${projectId}`])
}

export async function updateProjectLvPosition(
  positionId: string,
  projectId: string,
  formData: FormData
) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  const orderPosition = formData.get('orderPosition')?.toString().trim()
  const lvPosition = formData.get('lvPosition')?.toString().trim()
  const lvDescription = formData.get('lvDescription')?.toString().trim()
  const isActive = formData.get('isActive') === 'on'

  if (!positionId || !projectId || !orderPosition || !lvPosition || !lvDescription) {
    throw new Error(
      'Bitte Auftragsposition, LV-Position und Bezeichnung ausfüllen.'
    )
  }

  await ensureCompanyRecordExists(
    supabase,
    'projects',
    companyId,
    projectId,
    'Der ausgewählte Auftrag gehört nicht zu deiner Firma.'
  )

  const { error } = await supabase
    .from('project_lv_positions')
    .update({
      order_position: orderPosition,
      lv_position: lvPosition,
      lv_description: lvDescription,
      is_active: isActive,
    })
    .eq('id', positionId)
    .eq('project_id', projectId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePaths([...REVALIDATE_PROJECTS, `/projects/${projectId}`])
}

export async function deleteProjectLvPosition(
  positionId: string,
  projectId: string
) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  if (!positionId || !projectId) {
    throw new Error('Keine LV-Position angegeben.')
  }

  await ensureCompanyRecordExists(
    supabase,
    'projects',
    companyId,
    projectId,
    'Der ausgewählte Auftrag gehört nicht zu deiner Firma.'
  )

  const { error } = await supabase
    .from('project_lv_positions')
    .delete()
    .eq('id', positionId)
    .eq('project_id', projectId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePaths([...REVALIDATE_PROJECTS, `/projects/${projectId}`])
}

export async function importProjectLvPositions(
  projectId: string,
  rows: ImportRow[]
) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  if (!projectId) {
    throw new Error('Kein Auftrag angegeben.')
  }

  if (!rows || rows.length === 0) {
    throw new Error('Es wurden keine LV-Positionen zum Import übergeben.')
  }

  await ensureCompanyRecordExists(
    supabase,
    'projects',
    companyId,
    projectId,
    'Der ausgewählte Auftrag gehört nicht zu deiner Firma.'
  )

  const cleanedRows = rows.map((row, index) => {
    const orderPosition = normalizeValue(row.order_position || '')
    const lvPosition = normalizeValue(row.lv_position || '')
    const lvDescription = normalizeValue(row.lv_description || '')

    if (!orderPosition) {
      throw new Error(`Zeile ${index + 1}: Auftragsposition fehlt.`)
    }

    if (!lvPosition) {
      throw new Error(`Zeile ${index + 1}: LV-Position fehlt.`)
    }

    if (!lvDescription) {
      throw new Error(`Zeile ${index + 1}: Bezeichnung fehlt.`)
    }

    return {
      company_id: companyId,
      project_id: projectId,
      order_position: orderPosition,
      lv_position: lvPosition,
      lv_description: lvDescription,
      is_active: true,
    }
  })

  const orderPositionSet = new Set<string>()
  const lvPositionSet = new Set<string>()

  for (let i = 0; i < cleanedRows.length; i += 1) {
    const row = cleanedRows[i]

    if (orderPositionSet.has(row.order_position)) {
      throw new Error(
        `Importfehler: Auftragsposition "${row.order_position}" ist innerhalb der Datei doppelt vorhanden.`
      )
    }

    if (lvPositionSet.has(row.lv_position)) {
      throw new Error(
        `Importfehler: LV-Position "${row.lv_position}" ist innerhalb der Datei doppelt vorhanden.`
      )
    }

    orderPositionSet.add(row.order_position)
    lvPositionSet.add(row.lv_position)
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('project_lv_positions')
    .select('order_position, lv_position')
    .eq('company_id', companyId)
    .eq('project_id', projectId)

  if (existingError) {
    throw new Error(existingError.message)
  }

  const existingOrderPositions = new Set(
    (existingRows ?? []).map((row) => row.order_position)
  )
  const existingLvPositions = new Set(
    (existingRows ?? []).map((row) => row.lv_position)
  )

  for (const row of cleanedRows) {
    if (existingOrderPositions.has(row.order_position)) {
      throw new Error(
        `Importfehler: Auftragsposition "${row.order_position}" existiert in diesem Auftrag bereits.`
      )
    }

    if (existingLvPositions.has(row.lv_position)) {
      throw new Error(
        `Importfehler: LV-Position "${row.lv_position}" existiert in diesem Auftrag bereits.`
      )
    }
  }

  await ensureCompanyRecordsExist(
    supabase,
    'projects',
    companyId,
    [projectId],
    'Der ausgewählte Auftrag gehört nicht zu deiner Firma.'
  )

  const { error: insertError } = await supabase
    .from('project_lv_positions')
    .insert(cleanedRows)

  if (insertError) {
    throw new Error(insertError.message)
  }

  revalidatePaths([...REVALIDATE_PROJECTS, `/projects/${projectId}`])
}
