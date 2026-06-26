import { useOnline } from '../hooks/useOnline'

// Thin fixed banner shown only while offline. Sits above app chrome and
// respects the top safe-area inset so it clears the notch on native.
export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      paddingTop: 'calc(7px + env(safe-area-inset-top))',
      paddingBottom: 7,
      paddingLeft: 16,
      paddingRight: 16,
      background: '#14171c',
      color: '#fff',
      fontSize: 12,
      fontWeight: 600,
      textAlign: 'center',
      letterSpacing: '0.01em',
    }}>
      You're offline. Changes won't save until you reconnect.
    </div>
  )
}
