import * as PIXI from 'pixi.js'

/**
 * PixiParticles.js
 * PixiJS GPU Hızlandırmalı Altın Yağmuru, Para Fışkırması ve Parçacık Patlama Motoru.
 * `spawnWinParticles('gold_shower' | 'jackpot' | 'cash_rain' | 'sparks', count)`
 */

class PixiParticleManager {
  constructor() {
    this.app = null
    this.container = null
    this.particles = []
    this.isInitialized = false
    this.canvasElement = null
  }

  async init(targetElement) {
    if (this.isInitialized && this.app) return

    try {
      this.app = new PIXI.Application()
      await this.app.init({
        resizeTo: window,
        backgroundAlpha: 0,
        antialias: true,
        powerPreference: 'high-performance',
      })

      this.app.canvas.style.position = 'fixed'
      this.app.canvas.style.top = '0'
      this.app.canvas.style.left = '0'
      this.app.canvas.style.width = '100vw'
      this.app.canvas.style.height = '100vh'
      this.app.canvas.style.pointerEvents = 'none'
      this.app.canvas.style.zIndex = '9999'

      document.body.appendChild(this.app.canvas)
      this.canvasElement = this.app.canvas

      this.container = new PIXI.Container()
      this.app.stage.addChild(this.container)

      this.app.ticker.add((ticker) => {
        this.update(ticker.deltaTime)
      })

      this.isInitialized = true
    } catch (e) {
      console.warn('PixiJS Particle Engine başlatılamadı:', e)
    }
  }

  // 🪙 Altın Yağmuru ve Vurgun Parçacığı Tetikleme
  spawnWinParticles(type = 'gold_shower', count = 120, customText = '') {
    if (!this.isInitialized || !this.app) {
      this.init().then(() => this.spawnWinParticles(type, count, customText))
      return
    }

    const screenW = window.innerWidth
    const screenH = window.innerHeight
    const originX = screenW / 2
    const originY = screenH * 0.45

    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics()
      let pType = type

      if (type === 'jackpot') {
        const types = ['coin', 'cash', 'diamond', 'spark']
        pType = types[Math.floor(Math.random() * types.length)]
      }

      if (pType === 'coin' || pType === 'gold_shower') {
        // 🪙 Altın Sikke Çizimi
        g.circle(0, 0, 10 + Math.random() * 8)
        g.fill({ color: 0xffd700, alpha: 0.95 })
        g.stroke({ width: 2, color: 0xffaa00 })
      } else if (pType === 'cash' || pType === 'cash_rain') {
        // 💵 Dolar Banknotu
        g.roundRect(-14, -8, 28, 16, 3)
        g.fill({ color: 0x00e575, alpha: 0.9 })
        g.stroke({ width: 1.5, color: 0x008040 })
      } else if (pType === 'diamond') {
        // 💎 Elmas
        g.poly([0, -12, 10, -3, 6, 12, -6, 12, -10, -3])
        g.fill({ color: 0x00e5ff, alpha: 0.95 })
      } else {
        // ✨ Işık Parıltısı
        g.star(0, 0, 4, 10, 4)
        g.fill({ color: 0xffea00, alpha: 0.95 })
      }

      this.container.addChild(g)

      const angle = (Math.random() * Math.PI * 2)
      const speed = Math.random() * 16 + 8
      const spinSpeed = (Math.random() - 0.5) * 0.25

      this.particles.push({
        graphic: g,
        x: originX + (Math.random() - 0.5) * 100,
        y: originY + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed * (Math.random() < 0.2 ? 1.5 : 1),
        vy: (Math.sin(angle) * speed) - (Math.random() * 12 + 6), // Yukarı fırlama
        gravity: 0.42 + Math.random() * 0.15,
        rotation: Math.random() * Math.PI,
        rotSpeed: spinSpeed,
        scaleX: 1,
        scaleY: 1,
        scaleSpeed: 0.08 + Math.random() * 0.05,
        alpha: 1,
        life: 1.0,
        decay: 0.007 + Math.random() * 0.008,
      })
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += p.gravity * dt
      p.rotation += p.rotSpeed * dt

      // 3D Yuvarlanma İllüzyonu (ScaleX salınımı)
      p.scaleX = Math.cos(p.rotation * 3)

      p.life -= p.decay * dt
      p.graphic.alpha = Math.max(0, p.life)
      p.graphic.position.set(p.x, p.y)
      p.graphic.rotation = p.rotation
      p.graphic.scale.set(p.scaleX, 1)

      // Ömrü biteni veya ekrandan çıkanı temizle
      if (p.life <= 0 || p.y > window.innerHeight + 50) {
        this.container.removeChild(p.graphic)
        p.graphic.destroy()
        this.particles.splice(i, 1)
      }
    }
  }
}

export const pixiParticleManager = new PixiParticleManager()

export const spawnWinParticles = (type = 'gold_shower', count = 120, customText = '') => {
  pixiParticleManager.spawnWinParticles(type, count, customText)
}
