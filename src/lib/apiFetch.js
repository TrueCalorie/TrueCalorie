import { apiUrl } from './apiUrl'

// On native, call CapacitorHttp.request directly with an explicit method. The global fetch
// patch was downgrading POST to GET; the explicit plugin API sends the method reliably and
// still bypasses CORS via native networking. Returns a fetch-like object so callers keep
// using res.ok / res.status / res.json().
export async function apiFetch(path, { method = 'GET', headers = {}, body, cache } = {}) {
  const url = apiUrl(path)
  if (window.Capacitor?.isNativePlatform?.()) {
    const { CapacitorHttp } = await import('@capacitor/core')
    const data = body ? JSON.parse(body) : undefined
    const resp = await CapacitorHttp.request({ method, url, headers, data })
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: async () => (typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data),
    }
  }
  return fetch(url, { method, headers, body, cache })
}
