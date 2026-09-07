/**
 * VisualFX: Canvas tabanlı konfeti/altın parçacık patlamaları ve ekran sarsıntısı.
 */

export class VisualFX {
  static createParticleCanvas() {
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
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    return canvas
  }

  static triggerCoinExplosion(count = 60) {
    const canvas = this.createParticleCanvas()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particles = []
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const colors = ['#f5b301', '#ffd75e', '#ffffff', '#e23b3b']

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 4 + Math.random() * 8
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.015 + Math.random() * 0.02,
        gravity: 0.25,
      })
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
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
}
