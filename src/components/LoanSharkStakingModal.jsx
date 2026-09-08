import React, { useState } from 'react'
import { loanSharkEngine } from '../core/LoanSharkStakingEngine.js'
import { haptic } from '../core/HapticEngine.js'
import { playSpatialAudio } from '../core/SpatialAudioEngine.js'

/**
 * LoanSharkStakingModal.jsx
 * Sokak Tefecisi (Acil Çip Kredisi) & Kasa Tahvili (Staking Havuzu) Modalı.
 */

export default function LoanSharkStakingModal({ isOpen, onClose, uid, currentBalance = 0, onRefreshBalance }) {
  const [activeTab, setActiveTab] = useState('loan') // 'loan' | 'stake'
  const [loanAmount, setLoanAmount] = useState(1000)
  const [stakeAmount, setStakeAmount] = useState(500)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)

  if (!isOpen) return null

  const handleTakeLoan = async () => {
    setLoading(true)
    setStatusMsg(null)
    const res = await loanSharkEngine.requestLoan(uid, loanAmount)
    setLoading(false)
    if (res.success) {
      haptic('jackpot')
      playSpatialAudio('coin_drop', 0, 0, 1)
      setStatusMsg({ type: 'success', text: res.message })
      if (onRefreshBalance) onRefreshBalance()
    } else {
      haptic('impact')
      setStatusMsg({ type: 'error', text: res.reason })
    }
  }

  const handleStake = async () => {
    setLoading(true)
    setStatusMsg(null)
    const res = await loanSharkEngine.stakeChips(uid, stakeAmount)
    setLoading(false)
    if (res.success) {
      haptic('jackpot')
      playSpatialAudio('coin_drop', 0, 0, 1)
      setStatusMsg({ type: 'success', text: res.message })
      if (onRefreshBalance) onRefreshBalance()
    } else {
      haptic('impact')
      setStatusMsg({ type: 'error', text: res.reason })
    }
  }

  return (
    <div className="financial-modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="financial-modal-content"
        style={{
          maxWidth: '520px',
          background: 'linear-gradient(180deg, #181216 0%, #0c080b 100%)',
          border: '2px solid #ec4899',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 0 40px rgba(236, 72, 153, 0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Tab Seçici */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <button
            className="btn"
            style={{
              padding: '10px',
              fontSize: '0.85rem',
              fontWeight: 900,
              background: activeTab === 'loan' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : '#1f1620',
              color: activeTab === 'loan' ? '#fff' : '#94a3b8',
              border: activeTab === 'loan' ? '1px solid #ef4444' : '1px solid #33202e',
              borderRadius: '8px',
            }}
            onClick={() => { setActiveTab('loan'); setStatusMsg(null); haptic('tick'); }}
          >
            🩸 SOKAK TEFECİSİ (KREDİ)
          </button>
          <button
            className="btn"
            style={{
              padding: '10px',
              fontSize: '0.85rem',
              fontWeight: 900,
              background: activeTab === 'stake' ? 'linear-gradient(135deg, #00e575 0%, #059669 100%)' : '#1f1620',
              color: activeTab === 'stake' ? '#000' : '#94a3b8',
              border: activeTab === 'stake' ? '1px solid #00e575' : '1px solid #33202e',
              borderRadius: '8px',
            }}
            onClick={() => { setActiveTab('stake'); setStatusMsg(null); haptic('tick'); }}
          >
            🔒 KASA TAHVİLİ (STAKING)
          </button>
        </div>

        {/* Tefeci Sekmesi */}
        {activeTab === 'loan' && (
          <div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '12px', lineHeight: 1.4 }}>
              Bakiyen mi sıfırlandı? Kartel tefecisi sana anında borç verir. Kazanılan ellerde borcun %50'si otomatik kesilerek tahsil edilir.
            </div>

            <div style={{ background: '#0f0a0d', border: '1px solid #381a27', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#fca5a5', marginBottom: '8px' }}>
                <span>ÇEKİLECEK BORÇ:</span>
                <span style={{ fontWeight: 800, color: '#ffd700' }}>+{loanAmount.toLocaleString()} ÇİP</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    className="btn ghost sm"
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '0.72rem',
                      borderColor: loanAmount === amt ? '#ef4444' : '#381a27',
                      background: loanAmount === amt ? 'rgba(239,68,68,0.2)' : 'transparent',
                      color: loanAmount === amt ? '#ef4444' : '#94a3b8',
                    }}
                    onClick={() => { setLoanAmount(amt); haptic('tick'); }}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.7rem', color: '#64748b', borderTop: '1px solid #24131b', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Tefeci Faizi: <strong>%10</strong></span>
                <span>Geri Ödenecek Toplam: <strong style={{ color: '#ef4444' }}>{Math.round(loanAmount * 1.1).toLocaleString()} Çip</strong></span>
              </div>
            </div>

            <button
              className="btn"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                marginBottom: '10px',
              }}
              onClick={handleTakeLoan}
            >
              {loading ? 'Tefeci Onaylıyor...' : '🩸 Tefeci Kredisini Çek ve Masaya Dön'}
            </button>
          </div>
        )}

        {/* Staking Sekmesi */}
        {activeTab === 'stake' && (
          <div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '12px', lineHeight: 1.4 }}>
              Çiplerini Kartel Kasa Havuzuna kilitle, masada dönen tüm potlardan ve komisyonlardan <strong>saatlik %0.5 pasif kâr payı</strong> kazan!
            </div>

            <div style={{ background: '#0a0f0d', border: '1px solid #1a3827', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#86efac', marginBottom: '8px' }}>
                <span>KİLİTLENECEK ÇİP:</span>
                <span style={{ fontWeight: 800, color: '#ffd700' }}>{stakeAmount.toLocaleString()} ÇİP</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[500, 1000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    className="btn ghost sm"
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '0.72rem',
                      borderColor: stakeAmount === amt ? '#00e575' : '#1a3827',
                      background: stakeAmount === amt ? 'rgba(0,229,117,0.2)' : 'transparent',
                      color: stakeAmount === amt ? '#00e575' : '#94a3b8',
                    }}
                    onClick={() => { setStakeAmount(amt); haptic('tick'); }}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.7rem', color: '#64748b', borderTop: '1px solid #13241b', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Tahmini Getiri: <strong style={{ color: '#00e575' }}>Saatlik %0.5 (%120 APY)</strong></span>
                <span>Mevcut Bakiyen: <strong>{currentBalance.toLocaleString()} Çip</strong></span>
              </div>
            </div>

            <button
              className="btn"
              disabled={loading || currentBalance < stakeAmount}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 900,
                background: currentBalance >= stakeAmount ? 'linear-gradient(135deg, #00e575 0%, #059669 100%)' : '#27272a',
                color: currentBalance >= stakeAmount ? '#000' : '#71717a',
                border: 'none',
                borderRadius: '8px',
                marginBottom: '10px',
                cursor: currentBalance >= stakeAmount ? 'pointer' : 'not-allowed',
              }}
              onClick={handleStake}
            >
              {loading ? 'Kasa Havuzuna Kilitleniyor...' : '🔒 Kasa Tahviline Yatır (Pasif Getiri Başlat)'}
            </button>
          </div>
        )}

        {/* Durum Bildirimi */}
        {statusMsg && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            marginBottom: '12px',
            background: statusMsg.type === 'success' ? 'rgba(0,229,117,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${statusMsg.type === 'success' ? '#00e575' : '#ef4444'}`,
            color: statusMsg.type === 'success' ? '#00e575' : '#fca5a5',
          }}>
            {statusMsg.text}
          </div>
        )}

        <button
          className="btn ghost"
          style={{ width: '100%', padding: '8px', fontSize: '0.8rem', color: '#94a3b8' }}
          onClick={onClose}
        >
          Kapat
        </button>
      </div>
    </div>
  )
}
