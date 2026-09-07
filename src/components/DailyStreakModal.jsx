import React, { useState, useEffect } from 'react'
import { haptic } from '../core/HapticEngine.js'
import { spawnWinParticles } from '../core/PixiParticles.js'
import { playSpatialAudio } from '../core/SpatialAudioEngine.js'

/**
 * DailyStreakModal.jsx
 * 7 Günlük Bağımlılık & Dopamin Tetikleyici Günlük Giriş Ödülü (Daily Streak).
 * Her gün artan ödüller, 7. günde MEGA VURGUN kasası, kaybetme korkusu (loss aversion).
 */

const STREAK_DAYS = [
  { day: 1, reward: 250, label: 'Başlangıç', icon: '🪙' },
  { day: 2, reward: 500, label: 'Isınma', icon: '💰' },
  { day: 3, reward: 1000, label: 'Müdavim', icon: '🔥' },
  { day: 4, reward: 2000, label: 'Seri Katil', icon: '⚡' },
  { day: 5, reward: 3500, label: 'High Roller', icon: '💎' },
  { day: 6, reward: 5000, label: 'Kartel Ortağı', icon: '👑' },
  { day: 7, reward: 10000, label: 'KASA SOYGUNU (MEGA)', icon: '🏆' },
]

export default function DailyStreakModal({ isOpen, onClose, onClaimReward, currentStreak = 1 }) {
  const [streakDays, setStreakDays] = useState(currentStreak)
  const [hasClaimedToday, setHasClaimedToday] = useState(false)
  const [claimedReward, setClaimedReward] = useState(null)

  useEffect(() => {
    // LocalStorage kontrolü
    const lastClaimDate = localStorage.getItem('kartel_last_streak_claim')
    const savedStreak = parseInt(localStorage.getItem('kartel_streak_count') || '1', 10)
    setStreakDays(savedStreak)

    const todayStr = new Date().toDateString()
    if (lastClaimDate === todayStr) {
      setHasClaimedToday(true)
    } else {
      setHasClaimedToday(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleClaim = () => {
    if (hasClaimedToday) return

    const currentRewardObj = STREAK_DAYS[(streakDays - 1) % STREAK_DAYS.length]
    const todayStr = new Date().toDateString()

    localStorage.setItem('kartel_last_streak_claim', todayStr)
    const nextStreak = (streakDays >= 7) ? 1 : streakDays + 1
    localStorage.setItem('kartel_streak_count', nextStreak.toString())

    setHasClaimedToday(true)
    setClaimedReward(currentRewardObj.reward)

    haptic('jackpot')
    playSpatialAudio('jackpot_blast', 0, 0, 1)
    spawnWinParticles('gold_shower', 140)

    if (onClaimReward) {
      onClaimReward(currentRewardObj.reward)
    }
  }

  return (
    <div className="financial-modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="financial-modal-content"
        style={{
          maxWidth: '520px',
          background: 'linear-gradient(180deg, #0f1624 0%, #080c14 100%)',
          border: '2px solid #ffd700',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 0 35px rgba(255, 215, 0, 0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffd700', letterSpacing: '0.5px' }}>
            🔥 7 GÜNLÜK SERİ VURGUN ÖDÜLÜ
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
            Her gün gel, seriyi bozma! 7. günde tam <strong>10.000 ÇİP</strong> kasayı boşalt!
          </div>
        </div>

        {/* Günler Izgarası */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {STREAK_DAYS.slice(0, 4).map((item) => {
            const isDone = streakDays > item.day || (streakDays === item.day && hasClaimedToday)
            const isCurrent = streakDays === item.day && !hasClaimedToday
            return (
              <div
                key={item.day}
                style={{
                  background: isCurrent ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), #1a2233)' : isDone ? '#0c121d' : '#121927',
                  border: `1px solid ${isCurrent ? '#ffd700' : isDone ? '#00e575' : '#232e42'}`,
                  borderRadius: '10px',
                  padding: '10px 6px',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {isDone && (
                  <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '0.65rem', color: '#00e575' }}>
                    ✓
                  </span>
                )}
                <div style={{ fontSize: '0.68rem', color: isCurrent ? '#ffd700' : '#64748b', fontWeight: 800 }}>
                  GÜN {item.day}
                </div>
                <div style={{ fontSize: '1.2rem', margin: '4px 0' }}>{item.icon}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: isCurrent ? '#fff' : '#94a3b8' }}>
                  +{item.reward}
                </div>
              </div>
            )
          })}
        </div>

        {/* 5, 6, 7. Günler (7. Gün Mega Kart) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: '8px', marginBottom: '16px' }}>
          {STREAK_DAYS.slice(4, 7).map((item) => {
            const isDone = streakDays > item.day || (streakDays === item.day && hasClaimedToday)
            const isCurrent = streakDays === item.day && !hasClaimedToday
            const isMega = item.day === 7

            return (
              <div
                key={item.day}
                style={{
                  background: isMega
                    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 100, 0, 0.2), #1a2233)'
                    : isCurrent ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), #1a2233)' : isDone ? '#0c121d' : '#121927',
                  border: `2px solid ${isMega ? '#ffd700' : isCurrent ? '#ffd700' : isDone ? '#00e575' : '#232e42'}`,
                  borderRadius: '10px',
                  padding: '10px 6px',
                  textAlign: 'center',
                  position: 'relative',
                  boxShadow: isMega ? '0 0 15px rgba(255, 215, 0, 0.3)' : 'none',
                }}
              >
                {isMega && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ffd700',
                    color: '#000',
                    fontSize: '0.55rem',
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}>
                    MEGA ÖDÜL
                  </span>
                )}
                {isDone && (
                  <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '0.65rem', color: '#00e575' }}>
                    ✓
                  </span>
                )}
                <div style={{ fontSize: '0.68rem', color: isMega ? '#ffd700' : isCurrent ? '#ffd700' : '#64748b', fontWeight: 800 }}>
                  GÜN {item.day}
                </div>
                <div style={{ fontSize: isMega ? '1.5rem' : '1.2rem', margin: '4px 0' }}>{item.icon}</div>
                <div style={{ fontSize: isMega ? '0.9rem' : '0.75rem', fontWeight: 900, color: isMega ? '#ffd700' : isCurrent ? '#fff' : '#94a3b8' }}>
                  +{item.reward.toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Claim Butonu & Bilgi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="btn"
            disabled={hasClaimedToday}
            onClick={handleClaim}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.95rem',
              fontWeight: 900,
              background: hasClaimedToday ? '#1e293b' : 'linear-gradient(135deg, #ffd700 0%, #ff9900 100%)',
              color: hasClaimedToday ? '#64748b' : '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: hasClaimedToday ? 'not-allowed' : 'pointer',
              boxShadow: hasClaimedToday ? 'none' : '0 0 20px rgba(255, 215, 0, 0.4)',
            }}
          >
            {hasClaimedToday ? '✅ Bugünün Ödülü Alındı (Yarın Gel)' : `🎁 Gün ${streakDays} Ödülünü Al (+${STREAK_DAYS[(streakDays - 1) % 7].reward} Çip)`}
          </button>

          <button
            className="btn ghost"
            style={{ padding: '8px', fontSize: '0.8rem', color: '#94a3b8' }}
            onClick={onClose}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
