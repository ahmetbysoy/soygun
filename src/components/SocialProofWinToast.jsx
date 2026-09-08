import React, { useState, useEffect } from 'react'
import { darkPatternEngine } from '../core/DarkPatternAntiFraudEngine.js'

/**
 * SocialProofWinToast.jsx
 * Ekranın sol veya sağ alt köşesinde dönen canlı sosyal kanıt ("X az önce 12.000 Çip kazandı") bildirimi.
 */

export default function SocialProofWinToast() {
  const [toast, setToast] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const unsub = darkPatternEngine.subscribeSocialProof((data) => {
      setToast(data)
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
      }, 4200)
      return () => clearTimeout(timer)
    })
    return () => unsub()
  }, [])

  if (!toast || !visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 9998,
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
        border: '1px solid rgba(52, 211, 153, 0.5)',
        borderRadius: '12px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 12px rgba(52, 211, 153, 0.25)',
        animation: 'slideIn 0.3s ease-out',
        maxWidth: '280px',
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{
        fontSize: '1.2rem',
        background: 'rgba(0, 229, 117, 0.15)',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {toast.type === 'JACKPOT' || toast.type === 'MEGA_VURGUN' ? '🏆' : '💰'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e2e8f0' }}>
          {toast.user}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#00e575' }}>
          +{toast.amount.toLocaleString()} ÇİP kazandı!
        </span>
        <span style={{ fontSize: '0.58rem', color: '#64748b' }}>
          {toast.timeAgo} • {toast.type === 'MEGA_VURGUN' ? '🔥 Kasa Boşaltma' : 'Canlı Masa'}
        </span>
      </div>
    </div>
  )
}
