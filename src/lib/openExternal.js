// Opens an external URL.
//
// On the iOS / Android native app (Capacitor), Stripe URLs (checkout, customer
// portal, Founders payment link) must open in the system browser sheet via the
// Capacitor Browser plugin instead of navigating the WKWebView. On web, behavior
// is unchanged: same-tab navigation by default, or a new tab when target is '_blank'.
//
// The native plugin import is dynamic, so it only loads on native (behind the
// isNativePlatform guard) and Vite splits it into a separate chunk that the web
// bundle never fetches.
export async function openExternal(url, opts = {}) {
  if (window.Capacitor?.isNativePlatform?.()) {
    try {
      const { Browser } = await import('@capacitor/browser')
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
