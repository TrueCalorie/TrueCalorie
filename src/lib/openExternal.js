// Opens an external URL.
//
// On the iOS / Android native app (Capacitor), Stripe URLs (checkout, customer
// portal, Founders payment link) must open in the system browser sheet via the
// Capacitor Browser plugin instead of navigating the WKWebView. On web, behavior
// is unchanged: same-tab navigation by default, or a new tab when target is '_blank'.
//
// The native plugin import is dynamic and the plugin is externalized in
// vite.config.js, so this never pulls Capacitor into the web bundle.
export async function openExternal(url, opts = {}) {
  if (window.Capacitor?.isNativePlatform?.()) {
    try {
      const { Browser } = await import(/* @vite-ignore */ '@capacitor/browser')
      await Browser.open({ url })
      return
    } catch {
      // Plugin failed to load or open — fall through to standard web behavior.
    }
  }
  if (opts.target === '_blank') {
    window.open(url, '_blank')
  } else {
    window.location.href = url
  }
}
