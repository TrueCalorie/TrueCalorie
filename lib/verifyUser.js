import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// Returns the verified user id from the request's Bearer token, or null.
// Works for both Node.js (req.headers.authorization) and Edge Runtime
// (req.headers.get('authorization')).
export async function verifyUser(req) {
  const headerVal = typeof req.headers.get === 'function'
    ? req.headers.get('authorization')
    : req.headers.authorization
  const header = headerVal || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user.id
}
