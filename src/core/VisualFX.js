/**
 * VisualFX: Yüksek Performanslı Parçacık, Şok Dalgası ve Dopamin Görsel Motoru.
 * Altın sikkeler, kıvılcım patlamaları, şok dalgaları ve yüzen kazanç rozetleri.
 */

export class VisualFX {
  static getCanvas() {
    let canvas = document.getElementById('fx-canvas')
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.id = 'fx-canvas'
      canvas.style.position = 'fixed'
      canvas.style.inset = '0'
      canvas.style.pointerEvents = 'none'
      canvas.style.zIndex = '9999'
      document.body.appendChild(canvas)
    }
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    return canvas
  }

  /**
   * Genişleyen Şok Dalgası (Radial Shockwave)
   */
  static triggerShockwave(originX, originY, color = '#ffd75e') {
    const canvas = this.getCanvas()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cx = originX ?? canvas.width / 2
    const cy = originY ?? canvas.height / 2
    let radius = 20
    let alpha = 0.95

    function step() {
      if (alpha <= 0) return
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(1, 12 * alpha)
      ctx.globalAlpha = Math.max(0, alpha)
      ctx.shadowColor = color
      ctx.shadowBlur = 18
      ctx.stroke()
      ctx.restore()

      radius += 14
      alpha -= 0.04
      requestAnimationFrame(step)
    }
    step()
  }

  /**
   * Altın Sikke ve Jackpot Patlaması (Dönen 3D Altın Paralar + Parıltı)
   */
  static triggerCoinExplosion(count = 70, multiplierText = null) {
    const canvas = this.getCanvas()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    this.triggerShockwave(canvas.width / 2, canvas.height / 2, '#ffcc00')

    const particles = []
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const goldGradients = ['#ffe066', '#f5b301', '#ffd700', '#ffffff', '#ff9900']

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 5 + Math.random() * 11
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (3 + Math.random() * 4),
        radius: 4 + Math.random() * 5,
        color: goldGradients[Math.floor(Math.random() * goldGradients.length)],
        alpha: 1,
        decay: 0.012 + Math.random() * 0.015,
        gravity: 0.28,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        scaleX: 1,
      })
    }

    if (multiplierText) {
      this.triggerFloatingBadge(multiplierText, 'gold')
    }

    function animate() {
      let active = false

      for (const p of particles) {
        if (p.alpha > 0) {
          active = true
          p.x += p.vx
          p.y += p.vy
          p.vy += p.gravity
          p.alpha -= p.decay
          p.rot += p.rotSpeed
          p.scaleX = Math.cos(p.rot) // 3D bozuk para dönme simülasyonu

          ctx.save()
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.translate(p.x, p.y)
          ctx.scale(Math.abs(p.scaleX), 1)

          // Altın gövde
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2)
          ctx.fill()

          // Metalik parlama kenarı
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.2
          ctx.stroke()

          ctx.restore()
        }
      }

      if (active) {
        requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    animate()
  }

  /**
   * Bomba Patlaması (Ateş, Duman ve Kızıl Enerji Dalgası)
   */
  static triggerBombBlast(count = 60) {
    const canvas = this.getCanvas()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    this.triggerShockwave(canvas.width / 2, canvas.height / 2, '#ff2222')
    this.triggerFloatingBadge('💣 PATLAMA!', 'bomb')

    const particles = []
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const emberColors = ['#ff1e00', '#ff6600', '#ffcc00', '#330000', '#ffffff']

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 4 + Math.random() * 12
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        radius: 3 + Math.random() * 7,
        color: emberColors[Math.floor(Math.random() * emberColors.length)],
        alpha: 1,
        decay: 0.018 + Math.random() * 0.025,
        gravity: 0.15,
      })
    }

    function animate() {
      let active = false

      for (const p of particles) {
        if (p.alpha > 0) {
          active = true
          p.x += p.vx
          p.y += p.vy
          p.vy += p.gravity
          p.alpha -= p.decay

          ctx.save()
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.fillStyle = p.color
          ctx.shadowColor = '#ff2200'
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

      if (active) {
        requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    animate()
  }

  /**
   * Çalma (Steal) Efekti: Mor/Neon Plazma Vorteksi
   */
  static triggerStealVortex(count = 50) {
    const canvas = this.getCanvas()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    this.triggerShockwave(canvas.width / 2, canvas.height / 2, '#bd00ff')
    this.triggerFloatingBadge('🥷 SOYGUN!', 'steal')

    const particles = []
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const stealColors = ['#bd00ff', '#e066ff', '#ffffff', '#7928ca']

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 4 + Math.random() * 8
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        color: stealColors[Math.floor(Math.random() * stealColors.length)],
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02,
      })
    }

    function animate() {
      let active = false

      for (const p of particles) {
        if (p.alpha > 0) {
          active = true
          p.x += p.vx
          p.y += p.vy
          p.alpha -= p.decay

          ctx.save()
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.fillStyle = p.color
          ctx.shadowColor = '#bd00ff'
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

      if (active) {
        requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    animate()
  }

  /**
   * Ekranda Parlayan Yüzen Dopamin Rozeti (Floating Badge)
   */
  static triggerFloatingBadge(text, type = 'gold') {
    const badge = document.createElement('div')
    badge.innerText = text
    badge.style.position = 'fixed'
    badge.style.left = '50%'
    badge.style.top = '42%'
    badge.style.transform = 'translate(-50%, -50%) scale(0.6)'
    badge.style.zIndex = '10000'
    badge.style.pointerEvents = 'none'
    badge.style.fontFamily = 'monospace, sans-serif'
    badge.style.fontWeight = '900'
    badge.style.fontSize = '2.2rem'
    badge.style.letterSpacing = '2px'
    badge.style.padding = '12px 28px'
    badge.style.borderRadius = '16px'
    badge.style.transition = 'all 0.65s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    badge.style.opacity = '0'

    if (type === 'gold') {
      badge.style.background = 'linear-gradient(135deg, rgba(20,16,0,0.92), rgba(40,32,0,0.95))'
      badge.style.color = '#ffd700'
      badge.style.border = '2px solid #ffd700'
      badge.style.boxShadow = '0 0 35px rgba(255, 215, 0, 0.6), inset 0 0 15px rgba(255, 215, 0, 0.4)'
    } else if (type === 'bomb') {
      badge.style.background = 'linear-gradient(135deg, rgba(30,5,5,0.92), rgba(60,10,10,0.95))'
      badge.style.color = '#ff3333'
      badge.style.border = '2px solid #ff3333'
      badge.style.boxShadow = '0 0 35px rgba(255, 50, 50, 0.7), inset 0 0 15px rgba(255, 50, 50, 0.4)'
    } else {
      badge.style.background = 'linear-gradient(135deg, rgba(20,5,30,0.92), rgba(45,10,65,0.95))'
      badge.style.color = '#e066ff'
      badge.style.border = '2px solid #e066ff'
      badge.style.boxShadow = '0 0 35px rgba(224, 102, 255, 0.7), inset 0 0 15px rgba(224, 102, 255, 0.4)'
    }

    document.body.appendChild(badge)

    requestAnimationFrame(() => {
      badge.style.opacity = '1'
      badge.style.transform = 'translate(-50%, -60%) scale(1.15)'
    })

    setTimeout(() => {
      badge.style.opacity = '0'
      badge.style.transform = 'translate(-50%, -100%) scale(0.8)'
      setTimeout(() => badge.remove(), 700)
    }, 1200)
  }

  /**
   * Chromatic Aberration & Ekran Titremesi (Glitch & RGB Split)
   */
  static triggerChromaticAberration(durationMs = 600) {
    const el = document.body
    el.style.filter = 'drop-shadow(-3px 0px 0px rgba(255,0,0,0.7)) drop-shadow(3px 0px 0px rgba(0,255,255,0.7))'
    el.style.transition = 'filter 0.08s ease'

    setTimeout(() => {
      el.style.filter = 'none'
    }, durationMs)
  }

  /**
   * Neon Işık Hüzmesi (Tracer Ray Beam)
   */
  static triggerNeonTracerBeams(color = '#ffd700') {
    const canvas = this.getCanvas()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const rayCount = 16
    let stepCount = 0

    function drawRays() {
      if (stepCount > 25) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        return
      }

      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - stepCount / 25)
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.shadowColor = color
      ctx.shadowBlur = 20

      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2 + (stepCount * 0.05)
        const length = 100 + stepCount * 25
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length)
        ctx.stroke()
      }
      ctx.restore()

      stepCount++
      requestAnimationFrame(drawRays)
    }

    drawRays()
  }

  /**
   * 🏆 ZAFER & JACKPOT EKRAN PATLAMASI (Victory Splash Overlay)
   */
  static triggerVictorySplash(title = 'BÜYÜK KAZANÇ', amount = '1000', subtitle = 'PARANIN KOKUSU MASAYI SARDI') {
    const oldSplash = document.getElementById('victory-splash-modal')
    if (oldSplash) oldSplash.remove()

    const overlay = document.createElement('div')
    overlay.id = 'victory-splash-modal'
    overlay.style.position = 'fixed'
    overlay.style.inset = '0'
    overlay.style.zIndex = '99999'
    overlay.style.pointerEvents = 'none'
    overlay.style.display = 'flex'
    overlay.style.flexDirection = 'column'
    overlay.style.alignItems = 'center'
    overlay.style.justifyContent = 'center'
    overlay.style.background = 'radial-gradient(circle at center, rgba(255,215,0,0.18) 0%, rgba(5,7,12,0.85) 75%)'
    overlay.style.opacity = '0'
    overlay.style.transform = 'scale(0.8)'
    overlay.style.transition = 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'

    overlay.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #18202d, #090e17);
        border: 2px solid #ffd700;
        border-radius: 20px;
        padding: 24px 36px;
        text-align: center;
        box-shadow: 0 0 50px rgba(255, 215, 0, 0.6), inset 0 0 25px rgba(255, 215, 0, 0.2);
        max-width: 90%;
        animation: pulse 1s infinite;
      ">
        <div style="font-size: 0.85rem; font-weight: 900; letter-spacing: 3px; color: #ffd700; text-transform: uppercase; margin-bottom: 6px;">
          👑 ${title}
        </div>
        <div style="font-size: 2.8rem; font-weight: 900; color: #fff; text-shadow: 0 0 25px #ffd700; font-family: monospace; line-height: 1.1;">
          +🪙${amount}
        </div>
        <div style="font-size: 0.78rem; font-weight: 800; color: #00e575; letter-spacing: 1px; margin-top: 10px;">
          ${subtitle}
        </div>
      </div>
    `

    document.body.appendChild(overlay)

    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
      overlay.style.transform = 'scale(1)'
    })

    setTimeout(() => {
      overlay.style.opacity = '0'
      overlay.style.transform = 'scale(1.1)'
      setTimeout(() => overlay.remove(), 400)
    }, 2400)
  }

  /**
   * 🥷 SOYGUN ANİMASYONU (Heist Splash Overlay)
   */
  static triggerHeistSplash(amount = '500', robberName = 'Tilki') {
    const oldSplash = document.getElementById('heist-splash-modal')
    if (oldSplash) oldSplash.remove()

    const overlay = document.createElement('div')
    overlay.id = 'heist-splash-modal'
    overlay.style.position = 'fixed'
    overlay.style.inset = '0'
    overlay.style.zIndex = '99999'
    overlay.style.pointerEvents = 'none'
    overlay.style.display = 'flex'
    overlay.style.flexDirection = 'column'
    overlay.style.alignItems = 'center'
    overlay.style.justifyContent = 'center'
    overlay.style.background = 'radial-gradient(circle at center, rgba(224,102,255,0.2) 0%, rgba(10,5,15,0.85) 75%)'
    overlay.style.opacity = '0'
    overlay.style.transform = 'scale(0.8)'
    overlay.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'

    overlay.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #24122d, #0f0714);
        border: 2px solid #e066ff;
        border-radius: 20px;
        padding: 22px 34px;
        text-align: center;
        box-shadow: 0 0 50px rgba(224, 102, 255, 0.6), inset 0 0 25px rgba(224, 102, 255, 0.2);
        max-width: 90%;
      ">
        <div style="font-size: 0.85rem; font-weight: 900; letter-spacing: 3px; color: #e066ff; text-transform: uppercase; margin-bottom: 6px;">
          🥷 KUSURSUZ SOYGUN!
        </div>
        <div style="font-size: 2.5rem; font-weight: 900; color: #fff; text-shadow: 0 0 25px #e066ff; font-family: monospace; line-height: 1.1;">
          +🪙${amount} ÇALINDI
        </div>
        <div style="font-size: 0.78rem; font-weight: 800; color: #ff99cc; letter-spacing: 1px; margin-top: 10px;">
          ${robberName} MASAYI KURU SAÇTI!
        </div>
      </div>
    `

    document.body.appendChild(overlay)

    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
      overlay.style.transform = 'scale(1)'
    })

    setTimeout(() => {
      overlay.style.opacity = '0'
      overlay.style.transform = 'scale(1.1)'
      setTimeout(() => overlay.remove(), 400)
    }, 2200)
  }
}


