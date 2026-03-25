export function getErrorMessage(
  error: unknown,
  fallback = 'Es ist ein unerwarteter Fehler aufgetreten.'
) {
  if (!(error instanceof Error)) {
    return fallback
  }

  const rawMessage = error.message || ''
  const message = rawMessage.toLowerCase().trim()

  if (!message) {
    return fallback
  }

  if (message.includes('row-level security')) {
    return 'Aktion nicht erlaubt. Bitte Berechtigungen prüfen.'
  }

  if (message.includes('permission denied')) {
    return 'Zugriff nicht erlaubt.'
  }

  if (message.includes('duplicate key')) {
    return 'Der Datensatz existiert bereits.'
  }

  if (message.includes('already exists')) {
    return 'Der Datensatz existiert bereits.'
  }

  if (message.includes('invalid input syntax')) {
    return 'Ein eingegebener Wert hat ein ungültiges Format.'
  }

  if (message.includes('violates foreign key constraint')) {
    return 'Der Datensatz verweist auf einen ungültigen oder nicht mehr vorhandenen Eintrag.'
  }

  if (message.includes('network')) {
    return 'Verbindung fehlgeschlagen. Bitte erneut versuchen.'
  }

  if (message.includes('failed to fetch')) {
    return 'Verbindung fehlgeschlagen. Bitte erneut versuchen.'
  }

  if (message.includes('jwt')) {
    return 'Die Sitzung ist nicht mehr gültig. Bitte erneut anmelden.'
  }

  if (message.includes('session')) {
    return 'Die Sitzung ist abgelaufen. Bitte erneut anmelden.'
  }

  return rawMessage || fallback
}