import React, { useState, useEffect } from 'react'
import { purchaseChipPackage } from '../economy.js'

export default function ShopModal({ isOpen, onClose, uid, onPurchased }) {
  const [packages, setPackages] = useState([])
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [orderInfo, setOrderInfo] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/shop/packages')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.packages) {
          setPackages(data.packages)
          setSelectedPkg(data.packages[1] || data.packages[0])
        }
      })
      .catch(() => {})
  }, [isOpen])

  if (!isOpen) return null

  const handleCreateOrder = async (pkg) => {
    setLoading(true)
    setStatusMsg('Sipariş hazırlanıyor...')
    try {
      const res = await fetch('/api/shop/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, packageId: pkg.id }),
      })
      const data = await res.json()
      if (data.success) {
        setOrderInfo(data)
        setStatusMsg('')
      } else {
        setStatusMsg(data.error || 'Sipariş açılamadı')
      }
    } catch (err) {
      setStatusMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInstantPay = async () => {
    if (!selectedPkg) return
    setLoading(true)
    setStatusMsg('İşlem doğrulanıyor...')
    const txHash = orderInfo?.orderId || `direct_tx_${Date.now()}`
    const res = await purchaseChipPackage(uid, selectedPkg.id, txHash)
    setLoading(false)
    if (res.ok) {
      setStatusMsg(`🎉 Başarılı! +${res.chipsAdded} çip bakiyene eklendi!`)
      if (onPurchased) onPurchased(res.chipsAdded)
      setTimeout(() => {
        onClose()
        setStatusMsg('')
        setOrderInfo(null)
      }, 1500)
    } else {
      setStatusMsg(`❌ Hata: ${res.msg}`)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🛒 KARA BORSA ÇİP KASASI</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <p className="modal-desc">
          Masada gücünü koru! Anında TON, USDT veya Kripto ile çip yükle, VIP rütbeni yükselt.
        </p>

        <div className="shop-grid">
          {packages.map(p => {
            const isSel = selectedPkg?.id === p.id
            return (
              <div
                key={p.id}
                className={`shop-pkg-card ${isSel ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedPkg(p)
                  setOrderInfo(null)
                  setStatusMsg('')
                }}
              >
                <div className="pkg-badge">{p.badge}</div>
                <div className="pkg-name">{p.name}</div>
                <div className="pkg-chips">{p.chips.toLocaleString()} Çip</div>
                {p.bonusPercent > 0 && (
                  <div className="pkg-bonus">+{p.bonusPercent}% BONUS</div>
                )}
                <div className="pkg-price">${p.priceUsd.toFixed(2)} · ~{p.tonEst} TON</div>
              </div>
            )
          })}
        </div>

        {selectedPkg && !orderInfo && (
          <div className="shop-actions">
            <div className="selected-summary">
              Seçilen: <b>{selectedPkg.name}</b> — <b>{selectedPkg.chips.toLocaleString()} Çip</b> ({selectedPkg.description})
            </div>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button
                className="btn"
                disabled={loading}
                style={{ flex: 1, background: '#0088cc', borderColor: '#0099ee' }}
                onClick={() => handleCreateOrder(selectedPkg)}
              >
                💎 TON / USDT Faturası Al
              </button>
              <button
                className="btn"
                disabled={loading}
                style={{ flex: 1, background: 'linear-gradient(135deg, #ffd700, #ff9900)', color: '#000', fontWeight: 900 }}
                onClick={handleInstantPay}
              >
                ⚡ Anında Yükle (${selectedPkg.priceUsd})
              </button>
            </div>
          </div>
        )}

        {orderInfo && (
          <div className="order-details-box">
            <div className="order-title">🧾 Ödeme Faturası Hazırlandı</div>
            <div className="order-line">Sipariş ID: <code>{orderInfo.orderId}</code></div>
            <div className="order-line">Tutar: <b>{orderInfo.pkg.tonEst} TON</b> veya <b>${orderInfo.pkg.priceUsd} USDT</b></div>
            <div className="order-line">MEMO / Açıklama: <span className="memo-tag">{orderInfo.memo}</span></div>
            <div className="order-line">Kasa Cüzdanı: <code>{orderInfo.merchantWallet}</code></div>
            <button
              className="btn"
              style={{ width: '100%', marginTop: '12px', background: 'var(--gold)', color: '#000', fontWeight: 800 }}
              onClick={handleInstantPay}
              disabled={loading}
            >
              ✓ Transferi Tamamladım, Çipleri Yükle
            </button>
          </div>
        )}

        {statusMsg && <div className="status-banner">{statusMsg}</div>}
      </div>
    </div>
  )
}
