import React, { useState, useEffect } from 'react'
import { haptic } from '../core/HapticEngine.js'
import { viralGrowthEngine } from '../core/ViralGrowthEngine.js'
import { playSpatialAudio } from '../core/SpatialAudioEngine.js'

/**
 * ReferralRakebackModal.jsx
 * Multi-Level Piramit Referans & Pasif Gelir (Rakeback) Paneli.
 */

export default function ReferralRakebackModal({ isOpen, onClose, uid, currentBalance }) {
  const [copied, setCopied] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [invitedCount, setInvitedCount] = useState(6)
  const [totalEarnedChips, setTotalEarnedChips] = useState(1450)

  useEffect(() => {
    if (uid) {
      setReferralCode(viralGrowthEngine.generateReferralCode(uid))
    } else {
      setReferralCode('KARTEL_VIP_88')
    }
  }, [uid, isOpen])

  if (!isOpen) return null

  const handleCopy = () => {
    const inviteLink = `https://t.me/kartel_soygun_bot?start=${referralCode}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      haptic('tick')
      playSpatialAudio('coin_drop', 0, 0, 1)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div className="financial-modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="financial-modal-content"
        style={{
          maxWidth: '520px',
          background: 'linear-gradient(180deg, #111827 0%, #090d16 100%)',
          border: '2px solid #00e575',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 0 35px rgba(0, 229, 117, 0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00e575', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>💸 KARTEL ÇETE ORTAKLIĞI (RAKEBACK)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Arkadaşlarını masaya çağır; onların oynadığı her elden <strong>%20 RAKE KOMİSYONU</strong> anında cüzdanına yatsın!
          </div>
        </div>

        {/* 3 Küçük Metrik Kutusu */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <div style={{ background: '#0a0e17', border: '1px solid #1f293d', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>DAVET EDİLENLER</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>{invitedCount} Kişi</div>
          </div>
          <div style={{ background: '#0a0e17', border: '1px solid #1f293d', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>TOPLAM KOMİSYON</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00e575', marginTop: '2px' }}>+{totalEarnedChips.toLocaleString()} 🪙</div>
          </div>
          <div style={{ background: '#0a0e17', border: '1px solid #1f293d', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>KOMİSYON ORANI</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffd700', marginTop: '2px' }}>%20 Sabit</div>
          </div>
        </div>

        {/* Davet Kodu / Link Kutusu */}
        <div style={{ background: '#0d131f', border: '1px solid #243048', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: '#ffd700', fontWeight: 800, marginBottom: '6px' }}>
            ÖZEL KARTEL DAVET LİNKİN:
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={`https://t.me/kartel_soygun_bot?start=${referralCode}`}
              style={{
                flex: 1,
                background: '#06090e',
                border: '1px solid #1f2a3e',
                borderRadius: '6px',
                color: '#00e575',
                padding: '8px 10px',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
              }}
            />
            <button
              className="btn"
              onClick={handleCopy}
              style={{
                background: copied ? '#00e575' : '#ffd700',
                color: '#000',
                fontWeight: 900,
                fontSize: '0.75rem',
                padding: '8px 14px',
              }}
            >
              {copied ? '✓ Kopyalandı!' : '📋 Kopyala'}
            </button>
          </div>
        </div>

        {/* Kural & Kanca */}
        <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.4, marginBottom: '16px', background: 'rgba(0,229,117,0.05)', padding: '8px 12px', borderRadius: '6px', border: '1px dashed rgba(0,229,117,0.3)' }}>
          💡 <strong>Pasif Gelir Taktığı:</strong> Davet ettiğin herif ne kadar çok oynarsa, kazansın ya da kaybetsin kasanın kestiği komisyondan payın otomatik hesabına yansır.
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
