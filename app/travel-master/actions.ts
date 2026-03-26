'use server'

import { requireCompanyContext } from '@/lib/auth'
import {
  ensureCompanyRecordExists,
  ensureCompanyRecordsExist,
} from '@/lib/company-ownership'
import {
  revalidatePaths,
  REVALIDATE_TRAVEL_MASTER,
} from '@/lib/revalidate-paths'

type RouteInput = {
  project_id: string
  distance_home_project_km: string
  time_home_project_min: string
}

export async function saveEmployeeTravelProfile(
  employeeId: string,
  formData: FormData
) {
  const { supabase, companyId } = await requireCompanyContext([
    'admin',
    'geschaeftsfuehrer',
  ])

  if (!employeeId) {
    throw new Error('Kein Mitarbeiter angegeben.')
  }

  await ensureCompanyRecordExists(
    supabase,
    'employees',
    companyId,
    employeeId,
    'Der ausgewählte Mitarbeiter gehört nicht zu deiner Firma.'
  )

  const homeAddress = formData.get('homeAddress')?.toString().trim() || null
  const licensePlate = formData.get('licensePlate')?.toString().trim() || null

  const distanceHomeCompanyRaw =
    formData.get('distanceHomeCompanyKm')?.toString().trim() || ''
  const timeHomeCompanyRaw =
    formData.get('timeHomeCompanyMin')?.toString().trim() || ''

  const routesRaw = formData.get('routes')?.toString() || '[]'

  let routes: RouteInput[] = []

  try {
    routes = JSON.parse(routesRaw)
  } catch {
    throw new Error('Die Auftragsrouten konnten nicht verarbeitet werden.')
  }

  const cleanedRoutes = routes
    .map((route) => ({
      project_id: route.project_id?.trim() || '',
      distance_home_project_km:
        route.distance_home_project_km?.toString().trim() || '',
      time_home_project_min: route.time_home_project_min?.toString().trim() || '',
    }))
    .filter(
      (route) =>
        route.project_id ||
        route.distance_home_project_km ||
        route.time_home_project_min
    )

  for (const route of cleanedRoutes) {
    if (!route.project_id) {
      throw new Error(
        'Bitte bei jeder Reisekosten-Route einen Auftrag auswählen.'
      )
    }
  }

  const projectIds = cleanedRoutes.map((route) => route.project_id)

  if (new Set(projectIds).size !== projectIds.length) {
    throw new Error('Ein Auftrag darf in den Reisekosten-Routen nur einmal vorkommen.')
  }

  await ensureCompanyRecordsExist(
    supabase,
    'projects',
    companyId,
    projectIds,
    'Mindestens ein Auftrag in den Reisekosten-Routen gehört nicht zu deiner Firma.'
  )

  const distanceHomeCompanyKm =
    distanceHomeCompanyRaw === '' ? null : Number(distanceHomeCompanyRaw)
  const timeHomeCompanyMin =
    timeHomeCompanyRaw === '' ? null : Number(timeHomeCompanyRaw)

  if (
    distanceHomeCompanyKm !== null &&
    (Number.isNaN(distanceHomeCompanyKm) || distanceHomeCompanyKm < 0)
  ) {
    throw new Error('Die Entfernung zum Unternehmen ist ungültig.')
  }

  if (
    timeHomeCompanyMin !== null &&
    (Number.isNaN(timeHomeCompanyMin) || timeHomeCompanyMin < 0)
  ) {
    throw new Error('Die Zeit zum Unternehmen ist ungültig.')
  }

  const { error: profileError } = await supabase
    .from('employee_travel_profiles')
    .upsert(
      {
        company_id: companyId,
        employee_id: employeeId,
        home_address: homeAddress,
        license_plate: licensePlate,
        distance_home_company_km: distanceHomeCompanyKm,
        time_home_company_min: timeHomeCompanyMin,
      },
      {
        onConflict: 'employee_id',
      }
    )

  if (profileError) {
    throw new Error(profileError.message)
  }

  const routeRows = cleanedRoutes.map((route) => {
    const distance =
      route.distance_home_project_km === ''
        ? null
        : Number(route.distance_home_project_km)

    const time =
      route.time_home_project_min === ''
        ? null
        : Number(route.time_home_project_min)

    if (distance !== null && (Number.isNaN(distance) || distance < 0)) {
      throw new Error('Eine Entfernung Wohnort → Auftrag ist ungültig.')
    }

    if (time !== null && (Number.isNaN(time) || time < 0)) {
      throw new Error('Eine Zeit Wohnort → Auftrag ist ungültig.')
    }

    return {
      project_id: route.project_id,
      distance_home_project_km: distance,
      time_home_project_min: time,
    }
  })

  const { error: replaceRoutesError } = await supabase.rpc(
    'replace_employee_travel_project_routes',
    {
      p_company_id: companyId,
      p_employee_id: employeeId,
      p_routes: routeRows,
    }
  )

  if (replaceRoutesError) {
    throw new Error(replaceRoutesError.message)
  }

  revalidatePaths(REVALIDATE_TRAVEL_MASTER)
}
