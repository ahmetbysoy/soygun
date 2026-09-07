import React, { useEffect, useRef, useCallback } from 'react'
import { SEG } from '../gameSync.js'

const N = SEG.length
const SEG_ANGLE_DEG = 360 / N
const SEG_ANGLE_RAD = (2 * Math.PI) / N

/**
 * CanvasWheel - Yüksek Performanslı 2D Canvas Çarkı
 * - DOM/SVG reflow ve layout repaint yükünü sıfıra indirir.
 * - Çark grafiği Canvas üzerine yüksek çözünürlükte (Hi-DPI) çizilir.
 * - Dönüş animasyonu CSS hardware-accelerated transform ile çalışır.
 * - Dönüş esnasında canvas yeniden çizilmez; saf 60/120 FPS sıfır frame-drop sağlar.
 */
export default function CanvasWheel({
  isSpinning,
  currentRotation = 0,
  activeWinSeg = null,
  myBets = {},
  onSelectSegment,
  spinDurationMs = 4200,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  // Çark yüzeyini Canvas API ile çiz (sadece bahis veya kazanan dilim değiştiğinde tetiklenir)
  const renderWheel = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = 600 * dpr
    canvas.width = size
    canvas.height = size

    const center = size / 2
    const radius = size * 0.475
    const innerRadius = size * 0.16

    ctx.clearRect(0, 0, size, size)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // ── 1. Dış Metalik Altın Çember (Outer Metallic Bezel) ──
    const outerGrad = ctx.createRadialGradient(center, center, radius * 0.93, center, center, radius)
    outerGrad.addColorStop(0, '#ffd700')
    outerGrad.addColorStop(0.3, '#f5b301')
    outerGrad.addColorStop(0.7, '#b8860b')
    outerGrad.addColorStop(1, '#5c4303')

    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.fillStyle = outerGrad
    ctx.fill()

    ctx.lineWidth = 3 * dpr
    ctx.strokeStyle = '#2a1a00'
    ctx.stroke()

    // ── 2. Dilimleri Çiz (Slices) ──
    for (let i = 0; i < N; i++) {
      const seg = SEG[i]
      const startAngle = i * SEG_ANGLE_RAD - Math.PI / 2
      const endAngle = (i + 1) * SEG_ANGLE_RAD - Math.PI / 2
      const midAngle = startAngle + SEG_ANGLE_RAD / 2
      const isWinner = activeWinSeg === i

      ctx.save()

      // Dilim Yolu
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius * 0.935, startAngle, endAngle)
      ctx.closePath()

      // Dilim Arka Plan Radyal Gradyanı
      const segGrad = ctx.createRadialGradient(
        center,
        center,
        innerRadius,
        center + Math.cos(midAngle) * radius * 0.7,
        center + Math.sin(midAngle) * radius * 0.7,
        radius * 0.935
      )

      if (isWinner) {
        segGrad.addColorStop(0, '#fff')
        segGrad.addColorStop(0.4, '#ffd700')
        segGrad.addColorStop(1, seg.c || '#f5b301')
      } else {
        segGrad.addColorStop(0, '#10141c')
        segGrad.addColorStop(0.3, seg.c || '#2563eb')
        segGrad.addColorStop(0.9, '#070a10')
        segGrad.addColorStop(1, '#020406')
      }

      ctx.fillStyle = segGrad
      ctx.fill()

      // Dilim Kenar Hatları
      ctx.lineWidth = 1.5 * dpr
      ctx.strokeStyle = isWinner ? '#ffffff' : '#0b0e14'
      ctx.stroke()

      // Dilim Metni & Çarpan
      ctx.translate(center, center)
      ctx.rotate(midAngle + Math.PI / 2)

      // Metin gölgesi
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
      ctx.shadowBlur = 6 * dpr
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 2 * dpr

      // Dilim Etiketi
      ctx.fillStyle = isWinner ? '#000000' : '#ffffff'
      ctx.font = `800 ${19 * dpr}px 'Segoe UI', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(seg.l, 0, -radius * 0.64)

      // Kullanıcı Bahsi Rozeti (Badge)
      const bet = myBets[i]
      if (bet > 0) {
        // Çip Arka Planı
        const chipY = -radius * 0.42
        const chipR = 12 * dpr

        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'
        ctx.shadowBlur = 8 * dpr

        ctx.beginPath()
        ctx.arc(0, chipY, chipR, 0, Math.PI * 2)
        ctx.fillStyle = '#ffd700'
        ctx.fill()
        ctx.lineWidth = 2 * dpr
        ctx.strokeStyle = '#000'
        ctx.stroke()

        // Çip Değeri
        ctx.shadowBlur = 0
        ctx.fillStyle = '#000000'
        ctx.font = `900 ${11 * dpr}px monospace`
        ctx.fillText(bet >= 1000 ? `${(bet / 1000).toFixed(1)}k` : `${bet}`, 0, chipY)
      }

      ctx.restore()
    }

    // ── 3. Dış Çember Casino Çivileri (Studs / Pegs) ──
    for (let i = 0; i < N; i++) {
      const angle = i * SEG_ANGLE_RAD - Math.PI / 2
      const pegX = center + radius * 0.965 * Math.cos(angle)
      const pegY = center + radius * 0.965 * Math.sin(angle)

      ctx.save()
      ctx.beginPath()
      ctx.arc(pegX, pegY, 4.5 * dpr, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = 8 * dpr
      ctx.fill()

      ctx.lineWidth = 1.5 * dpr
      ctx.strokeStyle = '#b8860b'
      ctx.stroke()
      ctx.restore()
    }

    // ── 4. İç Çember İnce Metalik Hat ──
    ctx.beginPath()
    ctx.arc(center, center, innerRadius * 1.08, 0, Math.PI * 2)
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 2 * dpr
    ctx.stroke()
  }, [activeWinSeg, myBets])

  // myBets veya activeWinSeg değiştiğinde Canvas'ı güncelle
  useEffect(() => {
    renderWheel()
  }, [renderWheel])

  // Çark tıklandığında hangi dilime tıklandığını hesapla ve bahsi bas
  const handleCanvasClick = (e) => {
    if (isSpinning || !onSelectSegment) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left - rect.width / 2
    const clickY = e.clientY - rect.top - rect.height / 2

    const dist = Math.sqrt(clickX * clickX + clickY * clickY)
    const maxRadius = rect.width / 2
    const minRadius = rect.width * 0.16

    // Merkez göbeğe veya çok dışarı tıklandıysa yoksay
    if (dist < minRadius || dist > maxRadius) return

    // Tıklanan açıyı radyan ve derece cinsinden hesapla
    let clickAngleDeg = (Math.atan2(clickY, clickX) * 180) / Math.PI + 90
    if (clickAngleDeg < 0) clickAngleDeg += 360

    // Çarkın mevcut dönüş açısını çıkararak dilim indeksini bul
    const normalizedRotation = ((currentRotation % 360) + 360) % 360
    let relativeAngleDeg = clickAngleDeg - normalizedRotation
    if (relativeAngleDeg < 0) relativeAngleDeg += 360

    const segIdx = Math.floor(relativeAngleDeg / SEG_ANGLE_DEG) % N
    if (segIdx >= 0 && segIdx < N) {
      onSelectSegment(segIdx)
    }
  }

  // CSS hardware-accelerated rotational style
  const wheelboxStyle = {
    transform: `rotate(${currentRotation}deg)`,
    '--spin-duration': `${spinDurationMs}ms`,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    display: 'block',
    cursor: isSpinning ? 'not-allowed' : 'pointer',
  }

  return (
    <div
      ref={containerRef}
      className={`wheelbox ${isSpinning ? 'spinning' : ''}`}
      style={wheelboxStyle}
      onClick={handleCanvasClick}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}
