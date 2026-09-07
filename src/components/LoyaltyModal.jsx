import React, { useState, useEffect } from 'react'
import { getUserLoyalty, claimRakeback, claimDailyStreak } from '../economy.js'
import { VIP_TIERS } from '../core/MathEngine.js'

export default function LoyaltyModal({ isOpen, onClose, uid, onClaimed }) {
  const [loyalty, setLoyalty] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const loadData = async () => {
    if (!uid) return
    const data = await getUserLoyalty(uid)
    setLoyalty(data)
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
      setMsg('')
    }
  }, [isOpen, uid])

  if (!isOpen) return null

  const handleClaimRakeback = async () => {
    setLoading(true)
    const res = await claimRakeback(uid)
    setLoading(false)
    if (res.ok) {
      setMsg(`💰 Harika! ${res.claimed} çip rakeback bakiyene aktarıldı!`)
      loadData()
      if (onClaimed) onClaimed()
    } else {
      setMsg(res.msg)
    }
  }

  const handleClaimStreak = async () => {
    setLoading(true)
    const res = await claimDailyStreak(uid)
    setLoading(false)
    if (res.ok) {
      setMsg(`🎁 Tebrikler! ${res.streak}. Gün ganimetinden +${res.give} çip kazandın!`)
      loadData()
      if (onClaimed) onClaimed()
    } else {
      setMsg(res.msg)
    }
  }

  const streakDays = [1, 2, 3, 4, 5, 6, 7]
  const currentStreak = loyalty?.streak || 0
  const todayStr = new Date().toISOString().slice(0, 10)
  const isClaimedToday = loyalty?.lastDaily === todayStr

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👑 VIP KULÜBÜ & GANİMET KASASI</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loyalty && (
          <>
            {/* VIP Rütbe Kartı */}
            <div className="vip-status-card">
              <div className="vip-header">
                <div className="vip-badge-big">{loyalty.vipTier.badge}</div>
                <div>
                  <div className="vip-title">{loyalty.vipTier.name}</div>
                  <div className="vip-sub">Kayıp İadesi (Rakeback): %{Math.round(loyalty.vipTier.rakebackRate * 100)}</div>
                </div>
              </div>

              <div className="progress-wrap">
                <div className="progress-labels">
                  <span>Hacim: {loyalty.totalWagered.toLocaleString()} Çip</span>
                  {loyalty.vipTier.nextTier && (
                    <span>Sonraki: {loyalty.vipTier.nextTier.name} ({loyalty.vipTier.nextTier.minWager.toLocaleString()} Çip)</span>
                  )}
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${loyalty.vipTier.progress}%` }} />
                </div>
              </div>

              {/* Rakeback Tahsilat Bölümü */}
              <div className="rakeback-claim-row">
                <div>
                  <div className="rb-label">Biriken Nakit/Çip İadesi</div>
                  <div className="rb-val">💰 {loyalty.accumulatedRakeback} Çip</div>
                </div>
                <button
                  className="btn"
                  style={{ background: 'var(--gold)', color: '#000', fontWeight: 800 }}
                  disabled={loading || loyalty.accumulatedRakeback <= 0}
                  onClick={handleClaimRakeback}
                >
                  Tahsil Et
                </button>
              </div>
            </div>

            {/* Günlük Ganimet Kasası (Streak Engine) */}
            <div className="streak-box">
              <div className="streak-title">
                <span>🔥 GÜNLÜK SERİ (STREAK: {currentStreak} GÜN)</span>
                <span style={{ fontSize: '0.75rem', color: isClaimedToday ? '#00e575' : '#ffd75e' }}>
                  {isClaimedToday ? '✓ Bugün Alındı' : '⚡ Kasa Açılmaya Hazır!'}
                </span>
              </div>

              <div className="streak-grid">
                {streakDays.map(day => {
                  const isDone = currentStreak >= day
                  const isCurrent = currentStreak + 1 === day && !isClaimedToday
                  return (
                    <div
                      key={day}
                      className={`streak-cell ${isDone ? 'done' : ''} ${isCurrent ? 'active-pulse' : ''}`}
                    >
                      <div className="day-label">{day}. Gün</div>
                      <div className="day-icon">{day === 7 ? '👑' : '🎁'}</div>
                      <div className="day-val">{day === 7 ? '650' : `${50 + (day - 1) * 40}`}</div>
                    </div>
                  )
                })}
              </div>

              <button
                className="btn"
                style={{
                  width: '100%',
                  marginTop: '12px',
                  background: isClaimedToday ? '#222' : 'linear-gradient(135deg, #00c26e, #008850)',
                  color: '#fff',
                  fontWeight: 800,
                }}
                disabled={loading || isClaimedToday}
                onClick={handleClaimStreak}
              >
                {isClaimedToday ? '✓ Bugünkü Ganimet Kasası Açıldı' : '🎁 Bugünkü Ganimet Kasasını Aç'}
              </button>
            </div>
          </>
        )}

        {msg && <div className="status-banner">{msg}</div>}
      </div>
    </div>
  )
}
