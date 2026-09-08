import React from 'react'
import { haptic } from '../core/HapticEngine.js'
import { spawnWinParticles } from '../core/PixiParticles.js'
import { playSpatialAudio } from '../core/SpatialAudioEngine.js'

/**
 * LossAversionInsuranceModal.jsx
 * Masadan çıkmak / terk etmek isteyen veya para kaybeden oyuncuyu masada tutan sigorta modali.
 */

export default function LossAversionInsuranceModal({ isOpen, onClose, onAcceptInsurance, lossData }) {
  if (!isOpen || !lossData) return null

  const refundAmount = lossData.refundChips || Math.round((lossData.sessionLostChips || 500) * 0.15)

  const handleAccept = () => {
    haptic('jackpot')
    playSpatialAudio('coin_drop', 0, 0, 1)
    spawnWinParticles('gold_shower', 80)
    if (onAcceptInsurance) {
      onAcceptInsurance(refundAmount)
    }
    onClose()
  }

  return (
    <div className="financial-modal-backdrop" onClick={onClose} style={{ zIndex: 10005 }}>
      <div
        className="financial-modal-content"
        style={{
          maxWidth: '460px',
          background: 'linear-gradient(180deg, #1e1014 0%, #0d080a 100%)',
          border: '2px solid #ef4444',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.4)',
          textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: '2.4rem', marginBottom: '6px' }}>🚨</div>

        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444', letterSpacing: '0.3px' }}>
          MASAYI TERK ETME! SİGORTA DEVREDE!
        </div>

        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '8px', lineHeight: 1.5 }}>
          Bu masada şansın yaver gitmedi mi? Kartel kasası seni yalnız bırakmıyor.
          Şimdi masada kalırsan kaybettiğin çipin %15'i anında geri verilecek!
        </div>

        {/* İade Miktarı Kutusu */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '10px',
          padding: '12px',
          margin: '16px 0',
        }}>
          <div style={{ fontSize: '0.7rem', color: '#fca5a5', fontWeight: 800 }}>KASADAN ANLIK İADE EDİLECEK:</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffd700', marginTop: '2px' }}>
            +{refundAmount.toLocaleString()} ÇİP 🪙
          </div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
            (Kaybın: {lossData.sessionLostChips || 500} Çip)
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="btn"
            style={{
              padding: '12px',
              fontSize: '0.95rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #00e575 0%, #059669 100%)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 0 20px rgba(0, 229, 117, 0.4)',
            }}
            onClick={handleAccept}
          >
            🔥 İadeyi Al ve Masada Rövanşı Al!
          </button>

          <button
            className="btn ghost"
            style={{ padding: '8px', fontSize: '0.78rem', color: '#64748b' }}
            onClick={onClose}
          >
            Yine de Çıkmak İstiyorum
          </button>
        </div>
      </div>
    </div>
  )
}
