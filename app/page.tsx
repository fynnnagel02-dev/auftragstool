import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase
    .from('test_entries')
    .select('*')
    .order('id', { ascending: true })

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Auftragstool</h1>
      <p className="mt-4 text-lg">Supabase-Verbindungstest</p>

      {error && (
        <p className="mt-4 text-red-600">Fehler: {error.message}</p>
      )}

      <ul className="mt-6 space-y-2">
        {data?.map((entry) => (
          <li key={entry.id} className="rounded border p-3">
            {entry.title}
          </li>
        ))}
      </ul>
    </main>
  )
}