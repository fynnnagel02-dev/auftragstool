'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type RouteInput = {
  project_id: string
  distance_home_project_km: string
  time_home_project_min: string
}

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

export async function saveEmployeeTravelProfile(
  employeeId: string,
  formData: FormData
) {
  const { supabase, companyId } = await getCurrentCompanyContext()

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

  const { error: deleteRoutesError } = await supabase
    .from('employee_travel_project_routes')
    .delete()
    .eq('company_id', companyId)
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
        company_id: companyId,
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
  revalidatePath('/travel-expenses')
  revalidatePath('/admin')
}