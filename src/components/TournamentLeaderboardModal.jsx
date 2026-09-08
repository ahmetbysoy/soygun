import React, { useState, useEffect } from 'react'
import { tournamentEngine } from '../core/TournamentLeaderboardEngine.js'
import { haptic } from '../core/HapticEngine.js'

/**
 * TournamentLeaderboardModal.jsx
 * Canlı Kartel Turnuva Lider Tablosu & Ödül Havuzu Modalı.
 */

export default function TournamentLeaderboardModal({ isOpen, onClose, currentUserName, userChips = 0 }) {
  const [data, setData] = useState({
    formattedTime: tournamentEngine.getFormattedTime(),
    prizePool: tournamentEngine.prizePool,
    leaderboard: tournamentEngine.leaderboard,
  })

  useEffect(() => {
    const unsub = tournamentEngine.subscribe((val) => {
      setData(val)
    })
    return () => unsub()
  }, [])

  if (!isOpen) return null

  return (
    <div className="financial-modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="financial-modal-content"
        style={{
          maxWidth: '560px',
          background: 'linear-gradient(180deg, #101626 0%, #070a12 100%)',
          border: '2px solid #38bdf8',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 0 40px rgba(56, 189, 248, 0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Başlık & Kalan Süre */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏆 KARTEL SAATLİK TURNUVASI</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Her el puan topla, saat bitiminde havuzdan aslan payını kap!
            </div>
          </div>

          <div style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid #38bdf8',
            borderRadius: '8px',
            padding: '4px 10px',
            textAlign: 'right',
          }}>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>BİTİŞE KALAN</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ffd700', fontFamily: 'monospace' }}>
              ⏳ {data.formattedTime}
            </div>
          </div>
        </div>

        {/* Toplam Ödül Havuzu Kartı */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(56, 189, 248, 0.08))',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#ffd700', fontWeight: 800 }}>TOPLAM GARANTİLİ HAVUZ:</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffd700', letterSpacing: '0.5px' }}>
              {data.prizePool.toLocaleString()} ÇİP 🪙
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800, textAlign: 'right' }}>
            🥇 1.lik Ödülü: 25.000 🪙<br />
            🥈 2.lik Ödülü: 15.000 🪙<br />
            🥉 3.lik Ödülü: 10.000 🪙
          </div>
        </div>

        {/* Canlı Liderler Tablosu */}
        <div style={{
          background: '#0a0e17',
          border: '1px solid #1f293d',
          borderRadius: '10px',
          maxHeight: '260px',
          overflowY: 'auto',
          marginBottom: '16px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 90px 90px',
            padding: '8px 12px',
            borderBottom: '1px solid #1f293d',
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#64748b',
          }}>
            <span>SIRA</span>
            <span>OYUNCU</span>
            <span style={{ textAlign: 'right' }}>KAZANÇ</span>
            <span style={{ textAlign: 'right' }}>ÖDÜL</span>
          </div>

          {data.leaderboard.map((item) => {
            const isMe = item.name === currentUserName
            return (
              <div
                key={item.rank}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 90px 90px',
                  padding: '8px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  alignItems: 'center',
                  background: isMe ? 'rgba(56, 189, 248, 0.12)' : (item.rank <= 3 ? 'rgba(255, 215, 0, 0.04)' : 'transparent'),
                  color: isMe ? '#38bdf8' : '#e2e8f0',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ fontWeight: 900 }}>
                  {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                </span>
                <span style={{ fontWeight: 700 }}>
                  {item.name} {isMe ? '(Sen)' : ''}
                </span>
                <span style={{ textAlign: 'right', color: '#00e575', fontWeight: 800 }}>
                  +{item.chipsWon?.toLocaleString()}
                </span>
                <span style={{ textAlign: 'right', color: '#ffd700', fontWeight: 800 }}>
                  {item.prize}
                </span>
              </div>
            )
          })}
        </div>

        <button
          className="btn ghost"
          style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
          onClick={onClose}
        >
          Kapat
        </button>
      </div>
    </div>
  )
}
