// Opens an external URL.
//
// On the iOS / Android native app (Capacitor), Stripe URLs (checkout, customer
// portal, Founders payment link) must open in the DEVICE DEFAULT BROWSER (real
// Safari, leaving the app) via @capacitor/inappbrowser openInExternalBrowser.
// The previous @capacitor/browser Browser.open used SFSafariViewController, an
// in-app browser, which Apple rejected under Guideline 3.1.1 (external-purchase
// links on the US storefront must leave the app). On web, behavior is unchanged:
// same-tab navigation by default, or a new tab when target is '_blank'.
//
// Because the user fully leaves to Safari, return is handled by the static
// checkout-success.html / checkout-canceled.html pages, which deep-link back via
// truecalorie:// (caught by the single appUrlOpen listener in App.jsx), plus the
// appStateChange resume-refresh fallback for users who switch back manually.
//
// The native plugin import is dynamic, so it only loads on native (behind the
// isNativePlatform guard) and Vite splits it into a separate chunk that the web
// bundle never fetches.
export async function openExternal(url, opts = {}) {
  if (window.Capacitor?.isNativePlatform?.()) {
    try {
      const { InAppBrowser } = await import('@capacitor/inappbrowser')
      await InAppBrowser.openInExternalBrowser({ url })
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
