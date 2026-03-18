'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'

type RouteInput = {
  project_id: string
  distance_home_project_km: string
  time_home_project_min: string
}

export async function saveEmployeeTravelProfile(
  employeeId: string,
  formData: FormData
) {
  if (!employeeId) {
    throw new Error('Kein Mitarbeiter angegeben.')
  }

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

  const { error: deleteRoutesError } = await supabase
    .from('employee_travel_project_routes')
    .delete()
    .eq('employee_id', employeeId)

  if (deleteRoutesError) {
    throw new Error(deleteRoutesError.message)
  }

  if (cleanedRoutes.length > 0) {
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
        employee_id: employeeId,
        project_id: route.project_id,
        distance_home_project_km: distance,
        time_home_project_min: time,
      }
    })

    const { error: insertRoutesError } = await supabase
      .from('employee_travel_project_routes')
      .insert(routeRows)

    if (insertRoutesError) {
      throw new Error(insertRoutesError.message)
    }
  }

  revalidatePath('/travel-master')
}