import React from 'react'

/**
 * LiveRankingBadge.jsx
 * Masadaki oyuncuların anlık çip/servet sıralamasını ve VIP rütbesini hesaplayıp rozet olarak basar.
 * @param {number} chips - Masadaki çip miktarı
 * @param {number} rank - Masadaki servet sıralaması (1: En zengin, 2, 3...)
 */

export default function LiveRankingBadge({ chips = 0, rank = 1, isWhale = false }) {
  let badgeText = ''
  let badgeColor = ''
  let badgeBg = ''
  let badgeBorder = ''

  if (chips >= 50000 || isWhale || rank === 1) {
    badgeText = '👑 KARTEL BARONU'
    badgeColor = '#ffd700'
    badgeBg = 'rgba(255, 215, 0, 0.15)'
    badgeBorder = '#ffd700'
  } else if (chips >= 15000 || rank === 2) {
    badgeText = '🦈 KÖPEKBALIĞI'
    badgeColor = '#00e5ff'
    badgeBg = 'rgba(0, 229, 255, 0.15)'
    badgeBorder = '#00e5ff'
  } else if (chips >= 5000 || rank <= 4) {
    badgeText = '🎯 KURT OYUNCU'
    badgeColor = '#34d399'
    badgeBg = 'rgba(52, 211, 153, 0.15)'
    badgeBorder = '#34d399'
  } else if (chips < 500) {
    badgeText = '🐣 SOKAK ÇIRAĞI'
    badgeColor = '#94a3b8'
    badgeBg = 'rgba(148, 163, 184, 0.1)'
    badgeBorder = '#475569'
  } else {
    badgeText = '🎲 KUMARBAZ'
    badgeColor = '#c084fc'
    badgeBg = 'rgba(192, 132, 252, 0.15)'
    badgeBorder = '#c084fc'
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        fontSize: '0.58rem',
        fontWeight: 900,
        color: badgeColor,
        background: badgeBg,
        border: `1px solid ${badgeBorder}`,
        borderRadius: '3px',
        padding: '1px 4px',
        letterSpacing: '-0.2px',
        whiteSpace: 'nowrap',
      }}
    >
      {badgeText}
    </span>
  )
}
