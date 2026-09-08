import React, { useState, useEffect } from 'react'
import { viralGrowthEngine } from '../core/ViralGrowthEngine.js'
import { haptic } from '../core/HapticEngine.js'

/**
 * FakeJackpotFOMOTimer.jsx
 * Masanın tepesinde duran, oyuncuya sürekli aciliyet basan FOMO Jackpot Sayacı.
 */

export default function FakeJackpotFOMOTimer({ currentPot = 12500 }) {
  const [fomoData, setFomoData] = useState({
    formattedTime: viralGrowthEngine.getFormattedFOMOTime(),
    fomoTimerSeconds: viralGrowthEngine.fomoTimerSeconds,
  })

  useEffect(() => {
    const unsub = viralGrowthEngine.subscribe((data) => {
      setFomoData(data)
    })
    return () => unsub()
  }, [])

  const isUrgent = fomoData.fomoTimerSeconds < 45

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: isUrgent
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(18, 23, 34, 0.9))'
          : 'linear-gradient(135deg, rgba(245, 179, 1, 0.15), rgba(18, 23, 34, 0.9))',
        border: `1px solid ${isUrgent ? '#ef4444' : '#f5b301'}`,
        borderRadius: '20px',
        padding: '3px 10px',
        animation: isUrgent ? 'pulse 0.8s infinite alternate' : 'none',
        boxShadow: isUrgent ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none',
      }}
    >
      <span style={{ fontSize: '0.85rem' }}>{isUrgent ? '💣' : '⚡'}</span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          {isUrgent ? 'JACKPOT PATLAMASINA SON:' : 'MEGA VURGUN SAYACI:'}
        </span>
        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: isUrgent ? '#ef4444' : '#ffd700', fontFamily: 'monospace' }}>
          {fomoData.formattedTime}
        </span>
      </div>
    </div>
  )
}
