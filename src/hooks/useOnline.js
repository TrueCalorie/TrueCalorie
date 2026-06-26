import { useState, useEffect } from 'react'

// Tracks browser/WebView connectivity. Initializes from navigator.onLine
// (defaults to true when undefined) and stays in sync via the window
// 'online' / 'offline' events.
export function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true
  )

  useEffect(() => {
    const goOnline  = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
