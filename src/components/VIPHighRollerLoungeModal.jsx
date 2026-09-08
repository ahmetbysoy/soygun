import React from 'react'
import { haptic } from '../core/HapticEngine.js'

/**
 * VIPHighRollerLoungeModal.jsx
 * Kasasında 10.000+ çip olan veya VIP statüsüne erişmek isteyen oyunculara özel salon.
 */

export default function VIPHighRollerLoungeModal({ isOpen, onClose, userBalance = 0, onJoinLounge }) {
  if (!isOpen) return null

  const isEligible = userBalance >= 10000

  return (
    <div className="financial-modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="financial-modal-content"
        style={{
          maxWidth: '560px',
          background: 'linear-gradient(180deg, #181206 0%, #0a0803 100%)',
          border: '2px solid #ffd700',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 0 45px rgba(255, 215, 0, 0.35)',
          textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '4px' }}>👑</div>

        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffd700', letterSpacing: '0.5px' }}>
          VIP KARTEL HIGH-ROLLER SALONU
        </div>

        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.5 }}>
          Sokak çıraklarının giremediği, sadece gerçek balinaların ve kartel ortaklarının oturduğu yüksek limitli özel oda.
        </div>

        {/* Salon Ayrıcalıkları */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '20px 0', textAlign: 'left' }}>
          <div style={{ background: '#130e05', border: '1px solid #382806', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffd700' }}>🎰 x100 ÇARPAN & POTLAR</div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Minimum bahis 1.000 Çip, potlar 500.000+ Çip.</div>
          </div>
          <div style={{ background: '#130e05', border: '1px solid #382806', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#00e575' }}>💸 %50 DAHA DÜŞÜK RAKE</div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Kasa komisyonu %3.5 yerine sadece %1.75.</div>
          </div>
          <div style={{ background: '#130e05', border: '1px solid #382806', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8' }}>💎 ÖZEL 3D NFT ÇERÇEVE</div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Masada altın parıltılı Baron tacı rozeti.</div>
          </div>
          <div style={{ background: '#130e05', border: '1px solid #382806', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ec4899' }}>🚨 CANLI BALİNA ALARMI</div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Her vurduğun jackpot tüm kanallara yayınlanır.</div>
          </div>
        </div>

        {/* Bakiye Durumu */}
        <div style={{
          background: isEligible ? 'rgba(0, 229, 117, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isEligible ? '#00e575' : '#ef4444'}`,
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '0.75rem', color: '#fff' }}>
            Mevcut Bakiyen: <strong>{userBalance.toLocaleString()} ÇİP</strong> | Giriş Şartı: <strong>10.000 ÇİP</strong>
          </span>
        </div>

        {/* Butonlar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="btn"
            disabled={!isEligible}
            style={{
              padding: '12px',
              fontSize: '0.95rem',
              fontWeight: 900,
              background: isEligible ? 'linear-gradient(135deg, #ffd700 0%, #ff8800 100%)' : '#27272a',
              color: isEligible ? '#000' : '#71717a',
              border: 'none',
              borderRadius: '8px',
              cursor: isEligible ? 'pointer' : 'not-allowed',
            }}
            onClick={() => {
              if (isEligible) {
                haptic('jackpot')
                if (onJoinLounge) onJoinLounge()
                onClose()
              }
            }}
          >
            {isEligible ? '👑 VIP Masaya Otur (High-Roller)' : '🔒 Bakiye Yetersiz (Minimum 10.000 Çip)'}
          </button>

          <button
            className="btn ghost"
            style={{ padding: '8px', fontSize: '0.78rem', color: '#94a3b8' }}
            onClick={onClose}
          >
            Geri Dön
          </button>
        </div>
      </div>
    </div>
  )
}
