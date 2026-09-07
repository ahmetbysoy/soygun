import React, { useState, useEffect } from 'react'

export default function ResurrectionModal({ isOpen, onRevive, onDecline, offerData }) {
  const [timeLeft, setTimeLeft] = useState(offerData?.urgencyTimerSec || 20)

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(offerData?.urgencyTimerSec || 20)
      return
    }
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen, offerData])

  if (!isOpen || !offerData) return null

  return (
    <div className="modal-backdrop">
      <div
        className="modal-card"
        style={{
          maxWidth: '440px',
          border: '2px solid #ffd700',
          boxShadow: '0 0 35px rgba(255, 215, 0, 0.4)',
          background: 'radial-gradient(circle at top, #2b2208, #0a0c10)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.8rem', animation: 'bounce 1s infinite' }}>⚡</div>
        <h2 style={{ color: '#ffd700', fontSize: '1.25rem', fontWeight: 900, margin: '6px 0' }}>
          {offerData.title}
        </h2>
        <p style={{ color: '#ccc', fontSize: '0.82rem', margin: '0 0 14px' }}>
          {offerData.subtitle}
        </p>

        {/* Bonus Rozeti & Paket */}
        <div
          style={{
            background: 'rgba(255, 215, 0, 0.08)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '12px',
            padding: '14px',
            margin: '10px 0',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#ffec8b', fontWeight: 800 }}>
            🔥 SADECE BU TURA ÖZEL CAN SUYU PAKETİ
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '6px 0' }}>
            {offerData.totalChips} ÇİP
            <span style={{ fontSize: '0.8rem', color: '#00e575', marginLeft: '8px' }}>
              (+{offerData.bonusChips} BONUS!)
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#888' }}>
            Normal Değer: 500 Çip | Şimdi: <b>{offerData.totalChips} Çip</b>
          </div>
        </div>

        {/* Kalan Süre Aciliyet Sayacı */}
        <div
          style={{
            color: timeLeft <= 5 ? '#ff4444' : '#ffd700',
            fontWeight: 800,
            fontSize: '0.85rem',
            margin: '10px 0',
          }}
        >
          ⏳ Teklifin Bitişine: <b>{timeLeft} saniye</b>
        </div>

        <button
          className="btn"
          style={{
            background: 'linear-gradient(135deg, #00c26e, #008850)',
            color: '#fff',
            fontWeight: 900,
            fontSize: '1rem',
            width: '100%',
            padding: '14px',
            boxShadow: '0 4px 15px rgba(0, 194, 110, 0.4)',
          }}
          onClick={() => onRevive(offerData.totalChips)}
        >
          ⚡ MASAYA ANINDA DÖN ({offerData.totalChips} Çip Al)
        </button>

        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '0.75rem',
            cursor: 'pointer',
            marginTop: '12px',
          }}
          onClick={onDecline}
        >
          Elendim, koltuğu terk et
        </button>
      </div>
    </div>
  )
}
