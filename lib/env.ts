function readRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: readRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  }
}
