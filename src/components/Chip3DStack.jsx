import React from 'react'

/**
 * Chip3DStack.jsx
 * Masadaki veya oyuncunun seçili bahsini 3D katmanlı izometrik çip yığını olarak görselleştirir.
 */

const CHIP_COLORS = {
  10: { bg: '#2563eb', border: '#60a5fa', text: '#fff' },
  25: { bg: '#059669', border: '#34d399', text: '#fff' },
  50: { bg: '#dc2626', border: '#f87171', text: '#fff' },
  100: { bg: '#111827', border: '#ffd700', text: '#ffd700' },
  500: { bg: '#7c3aed', border: '#c084fc', text: '#fff' },
  1000: { bg: '#d97706', border: '#fef08a', text: '#000' },
}

export default function Chip3DStack({ amount = 0, chipValue = 50 }) {
  if (!amount || amount <= 0) return null

  // Çip adedi (max 8 görsel katman)
  const chipCount = Math.min(8, Math.max(1, Math.ceil(amount / (chipValue || 50))))
  const colorConfig = CHIP_COLORS[chipValue] || CHIP_COLORS[50]

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        height: `${28 + (chipCount - 1) * 4}px`,
        width: '42px',
        margin: '0 auto',
      }}
    >
      {Array.from({ length: chipCount }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: `${i * 4}px`,
            width: '38px',
            height: '18px',
            borderRadius: '50%',
            background: colorConfig.bg,
            border: `2px dashed ${colorConfig.border}`,
            boxShadow:
              i === 0
                ? '0 6px 12px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.4)'
                : '0 2px 4px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,255,255,0.3)',
            zIndex: i + 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease-out',
          }}
        >
          {i === chipCount - 1 && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: '900',
                color: colorConfig.text,
                letterSpacing: '-0.5px',
              }}
            >
              {amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
