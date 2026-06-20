import * as Sentry from '@sentry/node'

// Initialize once at module load. Each Vercel serverless function that imports this
// module triggers this init in its own isolate — that is the correct serverless pattern
// (there is no shared long-running process, so the docs' instrument.js + server.listen
// approach does not apply here).
//
// If SENTRY_DSN is unset (e.g. local dev), init is a safe no-op and nothing is sent.
// tracesSampleRate: 0 keeps this to pure error capture with minimal cold-start cost.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
})

// Report an unexpected error to Sentry, then flush before the handler returns.
// The flush is critical in serverless: Vercel freezes the lambda after the response is
// sent, dropping any events still in the buffer. flush(2000) waits up to 2s for delivery.
// When no DSN is configured this is effectively a no-op.
export async function reportError(err, context = {}) {
  Sentry.captureException(err, context)
  await Sentry.flush(2000)
}

export { Sentry }
