// juice.js — FAZ 4: Web Audio sentez + haptik + screen-shake. Gerçek sentez, dosya yok.
let ctx = null
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Mekanik pim tıkırtısı (çark dönerken)
export function tick() {
  try {
    const a = ac(), t = a.currentTime
    const o = a.createOscillator(), g = a.createGain()
    o.type = 'square'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.03)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.06)
  } catch (e) {}
}
// 808 sub-bass drop (büyük kazanç)
export function bassDrop() {
  try {
    const a = ac(), t = a.currentTime
    const o = a.createOscillator(), g = a.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.5)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.65)
  } catch (e) {}
}

// Çark dönme sesi (whoosh + mekanik rotor uğultusu)
export function spinningSound(duration = 4.2) {
  try {
    const a = ac(), t = a.currentTime

    // 1. Rotor titreşimi (mekanik çark ekseni)
    const osc = a.createOscillator()
    const oscGain = a.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.6) // Hızlanma
    osc.frequency.exponentialRampToValueAtTime(40, t + duration) // Yavaşlama
    oscGain.gain.setValueAtTime(0.0001, t)
    oscGain.gain.linearRampToValueAtTime(0.18, t + 0.25)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(oscGain)
    oscGain.connect(a.destination)
    osc.start(t)
    osc.stop(t + duration)

    // 2. Rüzgar / whoosh fısıltısı (dinamik filtreli hava sürtünmesi)
    const bufferSize = a.sampleRate * 2
    const buffer = a.createBuffer(1, bufferSize, a.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7
    }
    const noise = a.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const filter = a.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(450, t)
    filter.frequency.exponentialRampToValueAtTime(950, t + 0.6)
    filter.frequency.exponentialRampToValueAtTime(220, t + duration)
    filter.Q.setValueAtTime(2.2, t)

    const noiseGain = a.createGain()
    noiseGain.gain.setValueAtTime(0.0001, t)
    noiseGain.gain.linearRampToValueAtTime(0.15, t + 0.35)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + duration)

    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(a.destination)
    noise.start(t)
    noise.stop(t + duration)

    return {
      stop: () => {
        try {
          const now = a.currentTime
          oscGain.gain.linearRampToValueAtTime(0.0001, now + 0.05)
          noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.05)
          setTimeout(() => {
            try { osc.stop(); noise.stop() } catch (e) {}
          }, 60)
        } catch (e) {}
      }
    }
  } catch (e) {
    return { stop: () => {} }
  }
}
export const playSpinningSound = spinningSound

// Çark durduğunda kilitlenme / mekanik clack sesi
export function clackSound() {
  try {
    const a = ac(), t = a.currentTime

    // 1. Sert pim çarpması (yüksek frekanslı metalik/ahşap klik)
    const clickOsc = a.createOscillator()
    const clickGain = a.createGain()
    clickOsc.type = 'square'
    clickOsc.frequency.setValueAtTime(2400, t)
    clickOsc.frequency.exponentialRampToValueAtTime(340, t + 0.025)
    clickGain.gain.setValueAtTime(0.48, t)
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
    clickOsc.connect(clickGain)
    clickGain.connect(a.destination)
    clickOsc.start(t)
    clickOsc.stop(t + 0.045)

    // 2. Gövde tok darbesi (tok kilitlenme thud)
    const thudOsc = a.createOscillator()
    const thudGain = a.createGain()
    thudOsc.type = 'sine'
    thudOsc.frequency.setValueAtTime(280, t)
    thudOsc.frequency.exponentialRampToValueAtTime(70, t + 0.08)
    thudGain.gain.setValueAtTime(0.55, t)
    thudGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    thudOsc.connect(thudGain)
    thudGain.connect(a.destination)
    thudOsc.start(t)
    thudOsc.stop(t + 0.095)

    // 3. İğne yay geri sekmesi (küçük ikincil klik 30ms sonra)
    const reboundOsc = a.createOscillator()
    const reboundGain = a.createGain()
    const t2 = t + 0.032
    reboundOsc.type = 'triangle'
    reboundOsc.frequency.setValueAtTime(1500, t2)
    reboundOsc.frequency.exponentialRampToValueAtTime(420, t2 + 0.02)
    reboundGain.gain.setValueAtTime(0.0001, t)
    reboundGain.gain.setValueAtTime(0.32, t2)
    reboundGain.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.035)
    reboundOsc.connect(reboundGain)
    reboundGain.connect(a.destination)
    reboundOsc.start(t2)
    reboundOsc.stop(t2 + 0.04)

    haptic('tick')
  } catch (e) {}
}
export const playClackSound = clackSound
// Bomba patlama
export function bombSound() {
  try {
    const a = ac(), t = a.currentTime
    const o = a.createOscillator(), g = a.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.4)
    g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.5)
  } catch (e) {}
}

const tg = () => window.Telegram?.WebApp?.HapticFeedback
export function haptic(kind) {
  try {
    const h = tg()
    if (h) {
      if (kind === 'bet') h.impactOccurred('light')
      else if (kind === 'spin') h.impactOccurred('medium')
      else if (kind === 'tick') h.impactOccurred('rigid')
      else if (kind === 'win') h.notificationOccurred('success')
      else if (kind === 'bomb') h.notificationOccurred('error')
      else if (kind === 'steal') h.notificationOccurred('warning')
      return
    }
    const nav = navigator.vibrate
    if (!nav) return
    if (kind === 'bet') nav(15)
    else if (kind === 'spin') nav(30)
    else if (kind === 'tick') nav(10)
    else if (kind === 'win') nav([50, 30, 100])
    else if (kind === 'bomb') nav([80, 40, 80, 40, 120])
    else if (kind === 'steal') nav([40, 20, 40])
  } catch (e) {}
}

export function shake(intensity = 'medium') {
  const app = document.querySelector('.wheelwrap') || document.body
  const amp = { light: 2, medium: 5, heavy: 10 }[intensity] || 5
  const dur = { light: 120, medium: 300, heavy: 500 }[intensity] || 300
  let el = 0
  const iv = setInterval(() => {
    const x = (Math.random() - 0.5) * amp * 2, y = (Math.random() - 0.5) * amp * 2
    app.style.transform = `translate(${x}px,${y}px)`
    el += 16
    if (el >= dur) { clearInterval(iv); app.style.transform = '' }
  }, 16)
}
