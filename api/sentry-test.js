// api/sentry-test.js
// TEMPORARY debug endpoint — verifies Sentry capture works end to end.
// Hit it (any method) and it deliberately throws, reports to Sentry via the same
// reportError path the real handlers use, then returns 500. Confirm the event lands
// in the Sentry issues stream (filter by tag endpoint:sentry-test), then DELETE this file.
import { reportError } from '../lib/sentry.js'

export default async function handler(req, res) {
  try {
    throw new Error('Sentry end-to-end test error — safe to ignore')
  } catch (err) {
    console.error('[sentry-test] deliberate test throw:', err)
    await reportError(err, { tags: { endpoint: 'sentry-test' } })
    return res.status(500).json({ error: 'Sentry test error thrown and reported' })
  }
}
