import posthog from 'posthog-js'

let initialized = false

export function initPostHog(key) {
  if (!key) return
  posthog.init(key, { api_host: 'https://us.i.posthog.com', defaults: '2025-05-24' })
  initialized = true
}

export const capture = (event, props) => {
  if (!initialized) return
  try { posthog.capture(event, props) } catch {}
}

export const identify = (userId, props) => {
  if (!initialized) return
  try { posthog.identify(userId, props) } catch {}
}

export const reset = () => {
  if (!initialized) return
  try { posthog.reset() } catch {}
}
