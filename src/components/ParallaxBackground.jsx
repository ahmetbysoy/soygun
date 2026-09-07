import React, { useEffect, useState } from 'react'

/**
 * ParallaxBackground.jsx
 * Fare (mouse) ve mobil jiroskop hareketine duyarlı çok katmanlı karanlık neon kumarhane arka planı.
 */

export default function ParallaxBackground() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window
      const x = (e.clientX - innerWidth / 2) / (innerWidth / 2)
      const y = (e.clientY - innerHeight / 2) / (innerHeight / 2)
      setOffset({ x, y })
    }

    const handleOrientation = (e) => {
      if (e.gamma != null && e.beta != null) {
        const x = Math.min(1, Math.max(-1, e.gamma / 30))
        const y = Math.min(1, Math.max(-1, (e.beta - 45) / 30))
        setOffset({ x, y })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        background: '#04070d',
        pointerEvents: 'none',
      }}
    >
      {/* 1. Katman: Derin Nebula & Gradyan */}
      <div
        style={{
          position: 'absolute',
          inset: '-20px',
          background: 'radial-gradient(circle at 50% 30%, #0d1a2d 0%, #050811 70%, #020307 100%)',
          transform: `translate(${offset.x * -8}px, ${offset.y * -8}px)`,
          transition: 'transform 0.15s ease-out',
        }}
      />

      {/* 2. Katman: Altın & Zümrüt Neon Işık Hüzmeleri (Ambient Beams) */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '15%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 60%)',
          filter: 'blur(50px)',
          transform: `translate(${offset.x * 24}px, ${offset.y * 24}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '10%',
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(0, 229, 117, 0.06) 0%, transparent 60%)',
          filter: 'blur(60px)',
          transform: `translate(${offset.x * -30}px, ${offset.y * -30}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      />

      {/* 3. Katman: Perspektif Kumarhane Zemin Izgarası (Cyber Grid) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '45vh',
          backgroundImage: `
            linear-gradient(rgba(212, 175, 55, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212, 175, 55, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          perspective: '600px',
          transform: `perspective(400px) rotateX(65deg) translateY(${offset.y * 15}px) translateX(${offset.x * 15}px)`,
          transformOrigin: 'bottom center',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
          transition: 'transform 0.1s ease-out',
        }}
      />
    </div>
  )
}
