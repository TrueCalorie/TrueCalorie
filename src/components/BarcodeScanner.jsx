import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

const lookupBarcode = async (barcode) => {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
  const data = await res.json()
  if (data.status !== 1 || !data.product) return null
  const p = data.product
  const n = p.nutriments || {}
  const qty = parseFloat(p.serving_quantity) || 100

  const perServing = (key100) => {
    const servingVal = n[`${key100}_serving`]
    if (servingVal !== undefined) return Math.round(servingVal)
    const per100 = n[`${key100}_100g`]
    if (per100 !== undefined) return Math.round(per100 / 100 * qty)
    return 0
  }

  return {
    food_name: p.product_name || 'Unknown Product',
    brand_name: p.brands || null,
    nf_calories: Math.round(n['energy-kcal_serving'] ?? (n['energy-kcal_100g'] ?? 0) / 100 * qty),
    nf_protein: perServing('proteins'),
    nf_total_carbohydrate: perServing('carbohydrates'),
    nf_total_fat: perServing('fat'),
    verified: false,
    source: 'barcode',
  }
}

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [status, setStatus] = useState('scanning') // 'scanning' | 'found' | 'not_found' | 'error'
  const [foundName, setFoundName] = useState('')
  const scannedRef = useRef(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    reader.decodeFromVideoDevice(null, videoRef.current, async (result, err) => {
      if (!result || scannedRef.current) return
      scannedRef.current = true

      const barcode = result.getText()
      setStatus('found')

      try {
        const food = await lookupBarcode(barcode)
        if (food) {
          setFoundName(food.food_name)
          setTimeout(() => onResult(food), 400) // brief "found" feedback
        } else {
          setStatus('not_found')
        }
      } catch {
        setStatus('error')
      }
    })

    return () => {
      try { reader.reset() } catch {}
    }
  }, [])

  const reset = () => {
    scannedRef.current = false
    setStatus('scanning')
    setFoundName('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Camera Viewfinder */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 380,
        aspectRatio: '1', borderRadius: 16, overflow: 'hidden',
        background: '#000',
      }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
          playsInline
        />

        {/* Scan Frame Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Corner brackets */}
          {[
            { top: '20%', left: '20%', borderTop: '3px solid var(--text)', borderLeft: '3px solid var(--text)', borderRadius: '4px 0 0 0' },
            { top: '20%', right: '20%', borderTop: '3px solid var(--text)', borderRight: '3px solid var(--text)', borderRadius: '0 4px 0 0' },
            { bottom: '20%', left: '20%', borderBottom: '3px solid var(--text)', borderLeft: '3px solid var(--text)', borderRadius: '0 0 0 4px' },
            { bottom: '20%', right: '20%', borderBottom: '3px solid var(--text)', borderRight: '3px solid var(--text)', borderRadius: '0 0 4px 0' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }} />
          ))}

          {/* Status feedback */}
          {status === 'found' && (
            <div style={{
              background: 'rgba(29,158,117,0.9)',
              borderRadius: 12, padding: '10px 20px',
              color: '#fff', fontSize: 14, fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}>
              ✓ Found
            </div>
          )}
        </div>
      </div>

      {/* Status Text */}
      <div style={{ textAlign: 'center' }}>
        {status === 'scanning' && (
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
            Point camera at a barcode
          </p>
        )}
        {status === 'found' && foundName && (
          <p style={{ color: 'var(--text)', fontSize: 14, margin: 0, fontWeight: 500 }}>
            {foundName}
          </p>
        )}
        {status === 'not_found' && (
          <>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 12px' }}>
              Product not found in database
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'none', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--text)', color: 'var(--bg)', fontSize: 13, cursor: 'pointer',
                }}
              >
                Search Manually
              </button>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 12px' }}>
              Something went wrong
            </p>
            <button
              onClick={reset}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'none', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
