// lib/fuelGate.js
// Branch-life safety gate for v2 fuel-coach delivery.
//
// Once the Strava webhook subscription is registered against the branch
// preview, real athletes' activities hit this code. Without a gate, briefs
// (and web pushes) would go to production users. FUEL_COACH_ALLOWLIST is a
// comma-separated list of Supabase user ids; events for anyone else are
// logged and dropped.
//
// MERGE CHECKLIST: remove this gate (and the env var) when v2 ships.

export function isFuelCoachUser(userId) {
  const allow = (process.env.FUEL_COACH_ALLOWLIST || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return allow.includes(userId)
}
