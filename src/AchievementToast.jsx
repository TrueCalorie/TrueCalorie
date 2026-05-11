import { useEffect, useState } from 'react'

export default function AchievementToast({ achievement, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 50)
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 400)
    }, 3500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 24,
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : -80}px)`,
      opacity: visible ? 1 : 0,
      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      zIndex: 100,
      background: '#111',
      color: '#fff',
      borderRadius: 14,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      minWidth: 260,
      maxWidth: 340,
    }}>
      <span style={{ fontSize: 28 }}>{achievement.icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
          Achievement unlocked
        </div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{achievement.label}</div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{achievement.desc}</div>
      </div>
    </div>
  )
}