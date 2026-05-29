import { useState, useEffect, useRef } from 'react'

/**
 * Smoothly animates a number from its previous value to `target`.
 * Returns the current display value.
 */
export function useCountUp(target, duration = 550) {
  const [display, setDisplay] = useState(target)
  const from  = useRef(target)
  const raf   = useRef(null)

  useEffect(() => {
    const start = from.current
    const end   = target
    if (start === end) return

    cancelAnimationFrame(raf.current)
    const startTime = performance.now()

    const tick = (now) => {
      const t      = Math.min((now - startTime) / duration, 1)
      const eased  = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplay(Math.round(start + (end - start) * eased))

      if (t < 1) {
        raf.current = requestAnimationFrame(tick)
      } else {
        setDisplay(end)
        from.current = end
      }
    }

    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return display
}
