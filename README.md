# Auftragstool

Webbasierte Anwendung zur Erfassung, Zuordnung und Auswertung von Arbeitszeiten, Aufträgen und Reisekosten.

## Projektziel

Das Auftragstool dient dazu, operative und kaufmännische Prozesse eines Unternehmens in einer zentralen Anwendung abzubilden. Dazu gehören insbesondere die Erfassung von Tagesarbeitszeiten und Fehlzeiten, die Zuordnung von Arbeitsstunden auf Aufträge und LV-Positionen, die Pflege von Reisekosten sowie die Bereitstellung von Export- und Auswertungsfunktionen.

## Technologien

- Next.js
- React
- TypeScript
- Supabase
- PostgreSQL
- Vercel

## Kernfunktionen

- Multi-Company Architektur
- Rollenbasiertes Berechtigungsmodell
- Mitarbeiterverwaltung
- Auftragsverwaltung
- Verwaltung von LV-Positionen
- Erfassung von Tagesarbeitszeiten und Fehlzeiten
- Vorarbeiter-Dashboard zur Stundenverschreibung
- Datensammlung mit Bearbeiten- und Löschfunktion
- Reisekosten-Stammdaten
- Reisekostenerfassung
- PDF-Export
- Excel-Export
- Filtergruppen / Einstellungen
- Grundlagen für KPI- und Management-Auswertungen

## Rollenmodell

- Geschäftsführer
- Admin
- Vorarbeiter

Jede Rolle sieht nur die für sie vorgesehenen Bereiche und Funktionen.

## Sicherheit

- Authentifizierung über Supabase Auth
- Row Level Security (RLS)
- Mandantentrennung über `company_id`
- Rollenbasierte Zugriffsbeschränkung in Anwendung und Datenbank

## Technischer Stand

Aktuell ist der Kernprozess erfolgreich umgesetzt und getestet, unter anderem:

- manuelle Erfassung
- Bearbeiten
- Löschen
- Import
- Export
- Rollentests
- Multi-Company Trennung
- verbessertes Error Handling

## Deployment

Das Deployment erfolgt über Vercel.  
Die Datenbank, Authentifizierung und Zugriffskontrolle laufen über Supabase.

## Status

Stabiler Entwicklungsstand, bereit für saubere Sicherung in GitHub und als Grundlage für das nächste produktive Deployment.