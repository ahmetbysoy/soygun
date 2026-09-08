import React, { useEffect, useRef } from 'react'
import lottie from 'lottie-web'

/**
 * LottieAnimationOverlay.jsx
 * Kazanma, Kaybetme, Bomba ve Soygun anlarında ekranda patlayan
 * vektörel Lottie animasyon motoru overlay bileşeni.
 */

// Dahili Yüksek Kalite Lottie Vektör Verileri (Harici URL arıza riski sıfır)
const createBombLottieData = () => ({
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 120,
  w: 400,
  h: 400,
  nm: 'Bomb Explosion',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Shockwave',
      sr: 1,
      ks: {
        o: { k: [{ t: 30, s: [100] }, { t: 80, s: [0] }] },
        r: { k: 0 },
        p: { k: [200, 200, 0] },
        a: { k: [0, 0, 0] },
        s: { k: [{ t: 30, s: [20, 20, 100] }, { t: 90, s: [350, 350, 100] }] },
      },
      shapes: [
        {
          ty: 'el',
          p: { k: [0, 0] },
          s: { k: [80, 80] },
        },
        {
          ty: 'st',
          c: { k: [1, 0.2, 0.2, 1] },
          w: { k: 8 },
        },
      ],
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Bomb Body',
      sr: 1,
      ks: {
        o: { k: [{ t: 0, s: [100] }, { t: 40, s: [100] }, { t: 45, s: [0] }] },
        r: { k: [{ t: 0, s: [0] }, { t: 35, s: [15] }, { t: 40, s: [-15] }] },
        p: { k: [200, 200, 0] },
        a: { k: [0, 0, 0] },
        s: { k: [{ t: 0, s: [100, 100, 100] }, { t: 35, s: [130, 130, 100] }] },
      },
      shapes: [
        {
          ty: 'el',
          p: { k: [0, 0] },
          s: { k: [120, 120] },
        },
        {
          ty: 'fl',
          c: { k: [0.12, 0.14, 0.18, 1] },
        },
        {
          ty: 'st',
          c: { k: [0.9, 0.2, 0.2, 1] },
          w: { k: 6 },
        },
      ],
    },
  ],
})

const createWinLottieData = () => ({
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 120,
  w: 400,
  h: 400,
  nm: 'Big Win Star Trophy',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Golden Star',
      sr: 1,
      ks: {
        o: { k: [{ t: 0, s: [0] }, { t: 15, s: [100] }, { t: 100, s: [100] }, { t: 120, s: [0] }] },
        r: { k: [{ t: 0, s: [0] }, { t: 120, s: [360] }] },
        p: { k: [200, 200, 0] },
        a: { k: [0, 0, 0] },
        s: { k: [{ t: 0, s: [0, 0, 100] }, { t: 25, s: [140, 140, 100] }, { t: 40, s: [110, 110, 100] }] },
      },
      shapes: [
        {
          ty: 'sr',
          p: { k: [0, 0] },
          r: { k: 0 },
          pt: { k: 5 },
          ir: { k: 35 },
          is: { k: 0 },
          or: { k: 75 },
          os: { k: 0 },
        },
        {
          ty: 'fl',
          c: { k: [1, 0.84, 0, 1] },
        },
        {
          ty: 'st',
          c: { k: [1, 1, 1, 1] },
          w: { k: 5 },
        },
      ],
    },
  ],
})

export default function LottieAnimationOverlay({
  type = null, // 'win' | 'lose' | 'bomb' | 'jackpot' | null
  text = '',
  amount = 0,
  onComplete,
}) {
  const containerRef = useRef(null)
  const animInstance = useRef(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!type) return

    let animData = null
    if (type === 'bomb') {
      animData = createBombLottieData()
    } else {
      animData = createWinLottieData()
    }

    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        animInstance.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          animationData: animData,
        })
      }

      // Kesin ve tavizsiz otomatik kapanma zamanlayıcısı (Asla takılı kalmaz)
      const timer = setTimeout(() => {
        if (onCompleteRef.current) {
          onCompleteRef.current()
        }
      }, 2100)

      return () => {
        clearTimeout(timer)
        if (animInstance.current) {
          try {
            animInstance.current.destroy()
          } catch {
            // ignore
          }
          animInstance.current = null
        }
      }
    } catch (e) {
      console.warn('Lottie render hatası:', e)
      // Hata durumunda da ekranın kilitlenmesini engelle
      const fallbackTimer = setTimeout(() => {
        if (onCompleteRef.current) onCompleteRef.current()
      }, 1000)
      return () => clearTimeout(fallbackTimer)
    }
  }, [type])

  if (!type) return null

  const handleDismiss = (e) => {
    e.stopPropagation()
    if (onCompleteRef.current) {
      onCompleteRef.current()
    }
  }

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        pointerEvents: 'auto',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: type === 'bomb' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
        userSelect: 'none',
      }}
      title="Kapatmak için dokun"
    >
      <div ref={containerRef} style={{ width: 280, height: 280, pointerEvents: 'none' }} />
      {text && (
        <div
          style={{
            marginTop: -20,
            fontSize: '1.75rem',
            fontWeight: 900,
            color: type === 'bomb' ? '#ff3b5c' : '#ffd700',
            textShadow: '0 0 25px rgba(0,0,0,0.9), 0 0 12px currentColor',
            letterSpacing: 1.5,
            textAlign: 'center',
            padding: '0 16px',
            pointerEvents: 'none',
          }}
        >
          {text}
          {amount > 0 && (
            <div style={{ fontSize: '1.25rem', color: '#00e575', marginTop: 4 }}>
              +{amount.toLocaleString()} 💰
            </div>
          )}
        </div>
      )}

      {/* Dokunup geçme ipucu butonu */}
      <div
        style={{
          marginTop: 24,
          fontSize: '0.75rem',
          fontWeight: 800,
          color: 'rgba(255, 255, 255, 0.75)',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '4px 12px',
          letterSpacing: '0.5px',
        }}
      >
        ✕ Dokun ve Geç
      </div>
    </div>
  )
}
