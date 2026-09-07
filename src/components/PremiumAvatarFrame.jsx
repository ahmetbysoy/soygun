import React from 'react'

/**
 * PremiumAvatarFrame.jsx
 * VIP Balina, High-Roller ve Kartel Baronları için dinamik NFT tarzı altın/zümrüt/ateş animasyonlu çerçeve.
 * @param {'none' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'whale'} tier
 */

export default function PremiumAvatarFrame({ tier = 'none', children, size = 42 }) {
  let frameStyle = {}
  let glowStyle = {}
  let badgeIcon = null

  switch (tier) {
    case 'whale':
    case 'baron':
      frameStyle = {
        border: '2.5px solid #ffd700',
        background: 'linear-gradient(135deg, #ffd700, #ff6b00, #ffd700)',
        boxShadow: '0 0 12px rgba(255, 215, 0, 0.7), inset 0 0 6px rgba(255, 215, 0, 0.5)',
        animation: 'pulse 1.5s infinite alternate',
      }
      badgeIcon = '👑'
      break
    case 'diamond':
    case 'shark':
      frameStyle = {
        border: '2px solid #00e5ff',
        background: 'linear-gradient(135deg, #00e5ff, #3b82f6)',
        boxShadow: '0 0 10px rgba(0, 229, 255, 0.6)',
      }
      badgeIcon = '💎'
      break
    case 'gold':
    case 'regular':
      frameStyle = {
        border: '2px solid #f59e0b',
        boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
      }
      badgeIcon = '⭐'
      break
    case 'silver':
      frameStyle = {
        border: '1.5px solid #94a3b8',
      }
      badgeIcon = '🥈'
      break
    default:
      frameStyle = {
        border: '1.5px solid #334155',
      }
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size + 8}px`,
        height: `${size + 8}px`,
        borderRadius: '50%',
        padding: '2px',
        ...frameStyle,
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
        }}
      >
        {children}
      </div>

      {badgeIcon && (
        <span
          style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            fontSize: '11px',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
          }}
        >
          {badgeIcon}
        </span>
      )}
    </div>
  )
}
