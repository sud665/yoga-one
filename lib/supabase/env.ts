// Single source for the two public Supabase connection values, shared by the
// browser, server, and middleware clients.
//
// Two things this centralizes:
//
// 1. Key naming. Supabase now issues `sb_publishable_...` keys under
//    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, replacing the legacy JWT-shaped
//    `anon` key. Both are accepted by the same client argument and both work
//    against a local `supabase start` stack (verified against this project's
//    local stack: identical 200s from PostgREST with either), so the fallback
//    below exists purely so an environment still carrying the old variable
//    name keeps working instead of failing at runtime.
//
// 2. Failing loudly. Every call site previously used `process.env.X!`, which
//    tells TypeScript the value exists and then hands `undefined` to
//    supabase-js when it doesn't -- surfacing later as an opaque
//    "supabaseKey is required" from inside the library, with nothing naming
//    the variable that was actually missing.
//
// Both values are public by design: the publishable/anon key ships in the
// browser bundle and RLS is what enforces access control. The service_role
// key is a real secret and is deliberately not read here.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in ` +
        `(run \`npx supabase status\` for local values).`
    )
  }
  return value
}

export function supabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
}

export function supabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', key)
}
