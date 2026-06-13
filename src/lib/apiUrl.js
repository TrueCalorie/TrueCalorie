export function apiUrl(path) {
  const base = window.Capacitor?.isNativePlatform?.() ? 'https://truecalorie.net' : ''
  return base + (path.startsWith('/') ? path : `/${path}`)
}
