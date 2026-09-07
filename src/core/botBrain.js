// botBrain.js — dürüst bot zekâsı. UI'da "BOT" etiketli; oyuncuya yalan söylemez.
// Matematik DOĞRU: EV = p*mult - 1, Kelly f* = (b*p - q)/b. p = SINIF olasılığı (adet/12).
import { MathEngine } from './MathEngine.js'

export class BotBrain {
  constructor(style = 'safe') {
    this.style = style
    this.tiltThreshold = 3
    this.lossStreak = 0
  }

  ev(p, mult) { return MathEngine.calcExpectedValue(p, mult) }
  kelly(p, mult) { return MathEngine.calculateKellyCriterion(p, mult, this.style === 'risk' ? 0.6 : 0.25) }

  pickClass(SEG) {
    const classes = [...new Set(SEG.map(s => s.t).filter(t => typeof t === 'number' && t > 0))]
    if (this.style === 'risk') return Math.max(...classes)   // x11.64
    if (this.style === 'safe') return Math.min(...classes)   // x2.33
    return classes[Math.floor(Math.random() * classes.length)]
  }
  pickSegment(SEG, cls) {
    const idxs = SEG.map((s, j) => (s.t === cls ? j : -1)).filter(j => j >= 0)
    return idxs[Math.floor(Math.random() * idxs.length)]
  }
  betSize(bankroll) {
    let frac = this.style === 'risk' ? 0.08 : this.style === 'safe' ? 0.03 : 0.05
    if (this.lossStreak >= this.tiltThreshold) frac = Math.min(0.25, frac * 3)   // 🔥 tilt
    return Math.max(10, Math.round(bankroll * frac))
  }
  recordWin() { this.lossStreak = 0 }
  recordLoss() { this.lossStreak++ }
}

