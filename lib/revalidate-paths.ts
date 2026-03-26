import { revalidatePath } from 'next/cache'

export const REVALIDATE_WORKDAYS = [
  '/admin',
  '/datensammlung',
  '/foreman',
  '/kpi-dashboard',
] as const

export const REVALIDATE_EMPLOYEES = [
  '/employees',
  '/settings',
  '/admin',
  '/foreman',
] as const

export const REVALIDATE_PROJECTS = [
  '/projects',
  '/admin',
  '/travel-master',
  '/travel-expenses',
  '/foreman',
] as const

export const REVALIDATE_TRAVEL_MASTER = [
  '/travel-master',
  '/travel-expenses',
  '/admin',
] as const

export const REVALIDATE_SETTINGS = ['/settings', '/foreman'] as const

export function revalidatePaths(paths: readonly string[]) {
  for (const path of new Set(paths)) {
    revalidatePath(path)
  }
}
