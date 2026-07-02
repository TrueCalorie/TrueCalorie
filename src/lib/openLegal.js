// Opens a hosted legal page (Terms/Privacy). App.jsx routes /privacy and /terms by
// window.location.pathname on cold load and renders them before the auth gate, so these
// URLs resolve even for a logged-out browser. Native: in-app Safari sheet (dismisses back
// to the paywall). Web: new tab opened synchronously so the popup blocker allows it.
export async function openLegal(path) {
  const url = `https://www.truecalorie.net${path}`
  if (window.Capacitor?.isNativePlatform?.()) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
