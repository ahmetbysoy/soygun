import React, { useEffect, useRef, useCallback } from 'react'
import { SEG } from '../gameSync.js'
import { tick } from '../core/juice.js'

const N = SEG.length
const SEG_ANGLE_DEG = 360 / N
const SEG_ANGLE_RAD = (2 * Math.PI) / N
const NUM_BULBS = 36 // Dış çemberdeki casino LED ampul sayısı

/**
 * Winwheel-inspired Mathematical Helper:
 * Çarkın mevcut dönüş açısı ve iğne konumuna (0° / 12 o'clock) göre
 * o anda iğnenin tam altında bulunan dilim indeksini (0..N-1) döner.
 */
export function getIndicatedSegment(currentRotationDeg, pointerAngleDeg = 0) {
  const normalized = ((currentRotationDeg % 360) + 360) % 360
  const indicatedAngle = (360 - normalized + pointerAngleDeg) % 360
  const segIndex = Math.floor(indicatedAngle / SEG_ANGLE_DEG) % N
  return (segIndex + N) % N
}

/**
 * Winwheel-inspired Angle Generator:
 * Verilen hedef dilim için güvenli rastgele duruş açısı (jitter) veya
 * Near-Miss (kıl payı kaçırma) marjı hesaplar.
 */
export function calculateTargetAngle(targetSegIndex, currentRotationDeg, isNearMiss = false, nearMissType = 'edge') {
  let microOffsetDeg = 0
  if (isNearMiss) {
    microOffsetDeg = nearMissType === 'left' ? -(SEG_ANGLE_DEG / 2 - 1.8) : (SEG_ANGLE_DEG / 2 - 1.8)
  } else {
    microOffsetDeg = (Math.random() - 0.5) * (SEG_ANGLE_DEG * 0.45)
  }

  const targetAngleMod = (360 - (targetSegIndex * SEG_ANGLE_DEG + SEG_ANGLE_DEG / 2 + microOffsetDeg)) % 360
  const currentMod = ((currentRotationDeg % 360) + 360) % 360
  let diff = targetAngleMod - currentMod
  if (diff <= 0) diff += 360

  const extraSpins = (5 + Math.floor(Math.random() * 2)) * 360
  return currentRotationDeg + extraSpins + diff
}

/**
 * CanvasWheel - Yüksek Performanslı 60/120 FPS Casino & Fizik Render Motoru
 * - Bağımsız requestAnimationFrame render döngüsü.
 * - 36 adet dinamik dış Casino LED ampulü (Chaser & Strobe efektli).
 * - Canvas içi fiziksel altın para fıskiyesi ve kıvılcım parçacık simülasyonu.
 * - Anlık hover/tıklama lazer aydınlatması.
 */
export default function CanvasWheel({
  isSpinning,
  targetAngle = 0,
  activeWinSeg = null,
  myBets = {},
  centerLabel = '🥷',
  centerSub = '',
  onSelectSegment,
  spinDurationMs = 4200,
  onSpinFinish,
  onPointerFlick,
  onIndicatedSegmentChange,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  // Fizik & Parçacık Durum Ref'leri
  const physicsRef = useRef({
    currentAngle: 0,
    startAngle: 0,
    targetAngle: 0,
    velocity: 0,
    startTime: 0,
    duration: spinDurationMs,
    spinning: false,
    lastIndicatedSeg: -1,
    lastPegIndex: -1,
    needleDeflection: 0,
    bulbPhase: 0,
    hoveredSeg: -1,
    particles: [], // [ {x, y, vx, vy, rot, vRot, size, color, alpha, life, maxLife, isCoin} ]
  })

  const stateRef = useRef({
    activeWinSeg,
    myBets,
    isSpinning,
    centerLabel,
    centerSub,
    onIndicatedSegmentChange,
  })
  stateRef.current = {
    activeWinSeg,
    myBets,
    isSpinning,
    centerLabel,
    centerSub,
    onIndicatedSegmentChange,
  }

  // Kazanç anında canvas içi altın para patlaması tetikle
  useEffect(() => {
    if (activeWinSeg != null && !isSpinning) {
      const p = physicsRef.current
      const seg = SEG[activeWinSeg]
      const count = typeof seg.t === 'number' && seg.t >= 5 ? 45 : 25

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2.5 + Math.random() * 6.5
        p.particles.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.25,
          size: 5 + Math.random() * 6,
          color: Math.random() > 0.3 ? '#ffd700' : '#ffffff',
          alpha: 1,
          life: 0,
          maxLife: 60 + Math.random() * 40,
          isCoin: Math.random() > 0.4,
        })
      }
    }
  }, [activeWinSeg, isSpinning])

  // Spin Tetikleme
  useEffect(() => {
    const p = physicsRef.current
    if (isSpinning && targetAngle !== p.targetAngle) {
      p.startAngle = p.currentAngle
      p.targetAngle = targetAngle
      p.startTime = performance.now()
      p.duration = spinDurationMs
      p.spinning = true
    }
  }, [isSpinning, targetAngle, spinDurationMs])

  // Canvas Render Loop (requestAnimationFrame)
  useEffect(() => {
    let animId = null
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5)

    const renderLoop = (time) => {
      const p = physicsRef.current
      const {
        activeWinSeg: currentWinSeg,
        myBets: currentBets,
        centerLabel: curCenterLabel,
        centerSub: curCenterSub,
        onIndicatedSegmentChange: onSegChange,
      } = stateRef.current

      p.bulbPhase += p.spinning ? 0.35 : 0.04

      // ── 1. Rotasyon & Hız Fiziği ──
      if (p.spinning) {
        const elapsed = time - p.startTime
        const progress = Math.min(1, elapsed / p.duration)

        if (progress < 1) {
          const eased = easeOutQuint(progress)
          p.currentAngle = p.startAngle + (p.targetAngle - p.startAngle) * eased
          const remaining = 1 - progress
          p.velocity = (p.targetAngle - p.startAngle) * (5 * Math.pow(remaining, 4)) / p.duration
        } else {
          p.currentAngle = p.targetAngle
          p.spinning = false
          p.velocity = 0
          p.needleDeflection = 0
          if (onSpinFinish) onSpinFinish()
        }

        // Winwheel Anlık Dilim Tespiti
        const liveIndicated = getIndicatedSegment(p.currentAngle, 0)
        if (liveIndicated !== p.lastIndicatedSeg) {
          p.lastIndicatedSeg = liveIndicated
          if (onSegChange) onSegChange(liveIndicated)
        }

        // Çivi Çarpışması & İğne İmpulsu
        const normalizedAngle = ((p.currentAngle % 360) + 360) % 360
        const pegOffsetAngle = (360 - normalizedAngle) % 360
        const currentPegIndex = Math.floor(pegOffsetAngle / SEG_ANGLE_DEG)

        if (currentPegIndex !== p.lastPegIndex) {
          p.lastPegIndex = currentPegIndex
          p.needleDeflection = Math.min(26, 8 + Math.abs(p.velocity) * 4.8)
          if (onPointerFlick) onPointerFlick()
          try { tick() } catch (e) {}
        }
      }

      // İğne Titreşim Sönümlenmesi
      if (p.needleDeflection > 0) {
        p.needleDeflection *= 0.81
        if (p.needleDeflection < 0.15) p.needleDeflection = 0
      }

      // ── 2. Hi-DPI Canvas Boyutlandırma ──
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      const displaySize = Math.floor(Math.min(rect.width || 360, rect.height || 360))
      const renderSize = Math.floor(displaySize * dpr)

      if (canvas.width !== renderSize || canvas.height !== renderSize) {
        canvas.width = renderSize
        canvas.height = renderSize
      }

      const size = canvas.width
      const center = size / 2
      const radius = size * 0.445
      const bulbRadius = size * 0.482
      const innerRadius = size * 0.165

      ctx.clearRect(0, 0, size, size)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // ── 3. Casino Dış LED Ampulleri (Chaser Lights) ──
      ctx.save()
      ctx.translate(center, center)
      for (let b = 0; b < NUM_BULBS; b++) {
        const bulbAngle = (b / NUM_BULBS) * Math.PI * 2
        const bulbX = bulbRadius * Math.cos(bulbAngle)
        const bulbY = bulbRadius * Math.sin(bulbAngle)

        const bulbLit = Math.sin(b * 0.6 + p.bulbPhase) > 0.1
        const bulbColor = bulbLit ? '#ffd700' : '#332200'

        ctx.save()
        ctx.beginPath()
        ctx.arc(bulbX, bulbY, (bulbLit ? 3.8 : 2.5) * dpr, 0, Math.PI * 2)
        ctx.fillStyle = bulbColor
        if (bulbLit) {
          ctx.shadowColor = '#ffd700'
          ctx.shadowBlur = 8 * dpr
        }
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()

      // ── 4. Dönen Çark Gövdesi (Rotating Body) ──
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate((p.currentAngle * Math.PI) / 180)

      // A) Dış Metalik Altın Çerçeve
      const outerGrad = ctx.createRadialGradient(0, 0, radius * 0.91, 0, 0, radius)
      outerGrad.addColorStop(0, '#ffd700')
      outerGrad.addColorStop(0.25, '#f5b301')
      outerGrad.addColorStop(0.7, '#b8860b')
      outerGrad.addColorStop(1, '#4a3502')

      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fillStyle = outerGrad
      ctx.fill()

      ctx.lineWidth = 2.5 * dpr
      ctx.strokeStyle = '#1a1000'
      ctx.stroke()

      // B) Dilimler (Segments)
      for (let i = 0; i < N; i++) {
        const seg = SEG[i]
        const startAngle = i * SEG_ANGLE_RAD - Math.PI / 2
        const endAngle = (i + 1) * SEG_ANGLE_RAD - Math.PI / 2
        const midAngle = startAngle + SEG_ANGLE_RAD / 2
        const isWinner = currentWinSeg === i
        const isHovered = p.hoveredSeg === i

        ctx.save()

        // Dilim Geometrisi
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, radius * 0.935, startAngle, endAngle)
        ctx.closePath()

        // Dilim Gradyanı
        const segGrad = ctx.createRadialGradient(
          0,
          0,
          innerRadius,
          Math.cos(midAngle) * radius * 0.7,
          Math.sin(midAngle) * radius * 0.7,
          radius * 0.935
        )

        if (isWinner) {
          segGrad.addColorStop(0, '#ffffff')
          segGrad.addColorStop(0.35, '#ffd700')
          segGrad.addColorStop(1, '#f59e0b')
        } else if (isHovered) {
          segGrad.addColorStop(0, '#7dd3fc')
          segGrad.addColorStop(0.5, seg.c || '#2563eb')
          segGrad.addColorStop(1, '#0369a1')
        } else {
          // Parlak ve zengin canlı casino tonları (Karanlık çamur renkler kalktı)
          segGrad.addColorStop(0, '#f8fafc')
          segGrad.addColorStop(0.22, seg.c || '#2563eb')
          segGrad.addColorStop(0.75, seg.c || '#1d4ed8')
          segGrad.addColorStop(1, '#0f172a')
        }

        ctx.fillStyle = segGrad
        ctx.fill()

        // Dilim Ayırıcı Çizgiler
        ctx.lineWidth = 1.6 * dpr
        ctx.strokeStyle = isWinner ? '#ffffff' : (isHovered ? '#38bdf8' : '#0b0e14')
        ctx.stroke()

        // Dilim Metin ve Tipografi
        ctx.rotate(midAngle + Math.PI / 2)

        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
        ctx.shadowBlur = 6 * dpr
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 2 * dpr

        ctx.fillStyle = isWinner ? '#000000' : '#ffffff'
        ctx.font = `800 ${18 * dpr}px 'Segoe UI', system-ui, -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(seg.l, 0, -radius * 0.63)

        // Bahis Çipi Rozeti
        const bet = currentBets[i]
        if (bet > 0) {
          const chipY = -radius * 0.40
          const chipR = 12 * dpr

          ctx.shadowColor = 'rgba(255, 215, 0, 0.85)'
          ctx.shadowBlur = 8 * dpr

          ctx.beginPath()
          ctx.arc(0, chipY, chipR, 0, Math.PI * 2)
          ctx.fillStyle = '#ffd700'
          ctx.fill()
          ctx.lineWidth = 2 * dpr
          ctx.strokeStyle = '#000000'
          ctx.stroke()

          ctx.shadowBlur = 0
          ctx.fillStyle = '#000000'
          ctx.font = `900 ${11 * dpr}px monospace`
          ctx.fillText(bet >= 1000 ? `${(bet / 1000).toFixed(1)}k` : `${bet}`, 0, chipY)
        }

        ctx.restore()
      }

      // C) Çiviler (Pins / Studs)
      for (let i = 0; i < N; i++) {
        const angle = i * SEG_ANGLE_RAD - Math.PI / 2
        const pegX = radius * 0.962 * Math.cos(angle)
        const pegY = radius * 0.962 * Math.sin(angle)

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

      ctx.restore() // Rotasyon koordinat sistemini kapat

      // ── 5. Sabit Merkez Göbek (Static Center Hub) ──
      ctx.save()
      ctx.translate(center, center)

      // Dış Göbek Gölgesi
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
      ctx.shadowBlur = 18 * dpr
      ctx.beginPath()
      ctx.arc(0, 0, innerRadius * 1.05, 0, Math.PI * 2)
      ctx.fillStyle = '#0b0e14'
      ctx.fill()

      // İç Göbek Gradyanı
      const hubGrad = ctx.createRadialGradient(-innerRadius * 0.3, -innerRadius * 0.3, 2, 0, 0, innerRadius)
      hubGrad.addColorStop(0, '#2a3346')
      hubGrad.addColorStop(0.7, '#10141c')
      hubGrad.addColorStop(1, '#05070a')

      ctx.beginPath()
      ctx.arc(0, 0, innerRadius, 0, Math.PI * 2)
      ctx.fillStyle = hubGrad
      ctx.fill()

      // Göbek Altın Çerçevesi
      ctx.lineWidth = 3 * dpr
      ctx.strokeStyle = '#ffd700'
      ctx.shadowColor = 'rgba(245, 179, 1, 0.45)'
      ctx.shadowBlur = 12 * dpr
      ctx.stroke()

      // Göbek Ana Metni
      ctx.shadowBlur = 0
      ctx.fillStyle = '#ffd700'
      ctx.font = `900 ${22 * dpr}px 'Segoe UI', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(curCenterLabel || '🥷', 0, curCenterSub ? -5 * dpr : 0)

      // Göbek Alt Metni
      if (curCenterSub) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = `700 ${8.5 * dpr}px 'Segoe UI', system-ui, sans-serif`
        ctx.fillText(curCenterSub, 0, 15 * dpr)
      }

      ctx.restore()

      // ── 6. Canvas İçi Fiziksel Altın Para & Kıvılcım Fıskiyesi (Particles) ──
      if (p.particles.length > 0) {
        ctx.save()
        ctx.translate(center, center)

        for (let i = p.particles.length - 1; i >= 0; i--) {
          const pt = p.particles[i]
          pt.x += pt.vx
          pt.y += pt.vy
          pt.vy += 0.18 // Yerçekimi
          pt.rot += pt.vRot
          pt.life++

          const alpha = Math.max(0, 1 - pt.life / pt.maxLife)

          ctx.save()
          ctx.translate(pt.x * dpr, pt.y * dpr)
          ctx.rotate(pt.rot)
          ctx.globalAlpha = alpha

          if (pt.isCoin) {
            ctx.beginPath()
            ctx.arc(0, 0, pt.size * dpr, 0, Math.PI * 2)
            ctx.fillStyle = pt.color
            ctx.shadowColor = '#ffd700'
            ctx.shadowBlur = 6 * dpr
            ctx.fill()
            ctx.lineWidth = 1 * dpr
            ctx.strokeStyle = '#000'
            ctx.stroke()
          } else {
            ctx.fillStyle = pt.color
            ctx.shadowColor = pt.color
            ctx.shadowBlur = 8 * dpr
            ctx.fillRect(-pt.size * dpr / 2, -pt.size * dpr / 2, pt.size * dpr, pt.size * dpr)
          }

          ctx.restore()

          if (pt.life >= pt.maxLife) {
            p.particles.splice(i, 1)
          }
        }

        ctx.restore()
      }

      // ── 7. Sabit ve Seken İğne (Top Spring Needle) ──
      ctx.save()
      ctx.translate(center, center - radius * 0.985)
      ctx.rotate((-p.needleDeflection * Math.PI) / 180)

      // İğne Gövdesi
      ctx.beginPath()
      ctx.moveTo(-9 * dpr, -18 * dpr)
      ctx.lineTo(9 * dpr, -18 * dpr)
      ctx.lineTo(0, 14 * dpr)
      ctx.closePath()

      const needleGrad = ctx.createLinearGradient(-9 * dpr, 0, 9 * dpr, 0)
      needleGrad.addColorStop(0, '#ffffff')
      needleGrad.addColorStop(0.45, '#ffd700')
      needleGrad.addColorStop(1, '#ff3344')
      ctx.fillStyle = needleGrad
      ctx.shadowColor = 'rgba(255, 51, 68, 0.85)'
      ctx.shadowBlur = 10 * dpr
      ctx.fill()

      ctx.lineWidth = 1.5 * dpr
      ctx.strokeStyle = '#000000'
      ctx.stroke()

      // İğne Üst Pimi
      ctx.beginPath()
      ctx.arc(0, -14 * dpr, 4.5 * dpr, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.stroke()

      ctx.restore()

      // Render döngüsünü sürdür
      animId = requestAnimationFrame(renderLoop)
    }

    animId = requestAnimationFrame(renderLoop)
    return () => {
      if (animId) cancelAnimationFrame(animId)
    }
  }, [onPointerFlick, onSpinFinish])

  // Mouse / Touch Hover ile aktif dilimi aydınlatma
  const handleMouseMove = (e) => {
    if (isSpinning) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left - rect.width / 2
    const clickY = e.clientY - rect.top - rect.height / 2

    const dist = Math.sqrt(clickX * clickX + clickY * clickY)
    const maxRadius = rect.width / 2
    const minRadius = rect.width * 0.17

    if (dist < minRadius || dist > maxRadius) {
      physicsRef.current.hoveredSeg = -1
      return
    }

    let clickAngleDeg = (Math.atan2(clickY, clickX) * 180) / Math.PI + 90
    if (clickAngleDeg < 0) clickAngleDeg += 360

    const currentAngle = physicsRef.current.currentAngle
    const normalizedRotation = ((currentAngle % 360) + 360) % 360
    let relativeAngleDeg = clickAngleDeg - normalizedRotation
    if (relativeAngleDeg < 0) relativeAngleDeg += 360

    const segIdx = Math.floor(relativeAngleDeg / SEG_ANGLE_DEG) % N
    physicsRef.current.hoveredSeg = (segIdx >= 0 && segIdx < N) ? segIdx : -1
  }

  const handleMouseLeave = () => {
    physicsRef.current.hoveredSeg = -1
  }

  // Polar Hit-Testing (Tıklanan dilime anında bahis basma)
  const handleCanvasClick = (e) => {
    if (isSpinning || !onSelectSegment) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left - rect.width / 2
    const clickY = e.clientY - rect.top - rect.height / 2

    const dist = Math.sqrt(clickX * clickX + clickY * clickY)
    const maxRadius = rect.width / 2
    const minRadius = rect.width * 0.17

    if (dist < minRadius || dist > maxRadius) return

    let clickAngleDeg = (Math.atan2(clickY, clickX) * 180) / Math.PI + 90
    if (clickAngleDeg < 0) clickAngleDeg += 360

    const currentAngle = physicsRef.current.currentAngle
    const normalizedRotation = ((currentAngle % 360) + 360) % 360
    let relativeAngleDeg = clickAngleDeg - normalizedRotation
    if (relativeAngleDeg < 0) relativeAngleDeg += 360

    const segIdx = Math.floor(relativeAngleDeg / SEG_ANGLE_DEG) % N
    if (segIdx >= 0 && segIdx < N) {
      onSelectSegment(segIdx)
    }
  }

  return (
    <div
      ref={containerRef}
      className="wheelbox"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isSpinning ? 'not-allowed' : 'pointer',
      }}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '430px',
          maxHeight: '430px',
          aspectRatio: '1',
          display: 'block',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}
