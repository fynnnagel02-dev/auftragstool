export function calculateWorkHours(
  startTime: string,
  endTime: string
): number | null {
  if (!startTime || !endTime) {
    return null
  }

  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)

  if (start === null || end === null) {
    return null
  }

  let durationMinutes = end - start

  // Schicht über Mitternacht
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60
  }

  // Bis 6:00 Stunden keine Pause
  if (durationMinutes <= 360) {
    return roundToTwoDecimals(durationMinutes / 60)
  }

  // Bis 9:30 Stunden 30 Minuten Pause
  if (durationMinutes <= 570) {
    return roundToTwoDecimals((durationMinutes - 30) / 60)
  }

  // Bis 9:45 Stunden immer exakt 9,00 Stunden
  if (durationMinutes <= 585) {
    return 9.0
  }

  // Über 9:45 Stunden 45 Minuten Pause
  return roundToTwoDecimals((durationMinutes - 45) / 60)
}

function parseTimeToMinutes(time: string): number | null {
  const parts = time.split(':')

  if (parts.length < 2) {
    return null
  }

  const hours = Number(parts[0])
  const minutes = Number(parts[1])

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}