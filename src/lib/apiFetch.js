import { apiUrl } from './apiUrl'

export function apiFetch(path, { method = 'GET', headers = {}, body, cache } = {}) {
  return fetch(apiUrl(path), { method, headers, body, cache })
}
