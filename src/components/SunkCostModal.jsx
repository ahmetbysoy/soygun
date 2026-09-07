import React from 'react'

export default function SunkCostModal({ isOpen, onCancel, onConfirmLeave, warningData }) {
  if (!isOpen || !warningData) return null

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          border: '1px solid #ff4444',
          boxShadow: '0 0 30px rgba(255, 68, 68, 0.35)',
          background: 'radial-gradient(circle at top, #261010, #0d0f14)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚠️</div>
          <h2 style={{ color: '#ff5c5c', fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>
            {warningData.title}
          </h2>
        </div>

        <p style={{ fontSize: '0.9rem', color: '#eee', lineHeight: 1.5, textAlign: 'center' }}>
          {warningData.message}
        </p>

        <div
          style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px dashed #ff4444',
            borderRadius: '10px',
            padding: '10px',
            margin: '14px 0',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: '#ff9e9e',
          }}
        >
          <b>Risk:</b> Masayı terk edersen yaklaşık <b>{warningData.estimatedLoss} ÇİP</b> değerinde pot ve bonus şansın buharlaşacak!
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <button
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
              color: '#000',
              fontWeight: 900,
              fontSize: '0.95rem',
              padding: '12px',
              animation: 'pulse 1.8s infinite',
            }}
            onClick={onCancel}
          >
            {warningData.stayCta}
          </button>

          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '0.78rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '6px',
            }}
            onClick={onConfirmLeave}
          >
            {warningData.leaveCta}
          </button>
        </div>
      </div>
    </div>
  )
}
