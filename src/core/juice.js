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

// Dopamin Yüklü Kasa Açılma / Çan Sesi (Pentatonik ziller + metalik tınlama)
export function cashRegisterSound() {
  try {
    const a = ac(), t = a.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51] // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const o = a.createOscillator()
      const g = a.createGain()
      const panner = a.createStereoPanner ? a.createStereoPanner() : null

      o.type = 'sine'
      o.frequency.setValueAtTime(freq, t + idx * 0.06)

      const start = t + idx * 0.06
      g.gain.setValueAtTime(0.0001, start)
      g.gain.linearRampToValueAtTime(0.28 / (idx + 1), start + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.6)

      if (panner) {
        panner.pan.setValueAtTime((idx / (notes.length - 1)) * 1.6 - 0.8, start) // Sol-sağ uzamsal geçiş
        o.connect(g); g.connect(panner); panner.connect(a.destination)
      } else {
        o.connect(g); g.connect(a.destination)
      }

      o.start(start)
      o.stop(start + 0.65)
    })
  } catch (e) {}
}

// 808 sub-bass drop (büyük kazanç)
export function bassDrop() {
  try {
    const a = ac(), t = a.currentTime
    const o = a.createOscillator(), g = a.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.55)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.65, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.75)
  } catch (e) {}
}

// Kalp atışı gerilim sesi (çark yavaşlarken)
export function heartbeatSound() {
  try {
    const a = ac(), t = a.currentTime
    const o = a.createOscillator(), g = a.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(75, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12)
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.2)
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
      else if (kind === 'jackpot') h.notificationOccurred('success')
      else if (kind === 'bomb') h.notificationOccurred('error')
      else if (kind === 'steal') h.notificationOccurred('warning')
      else if (kind === 'suspense') h.impactOccurred('heavy')
      return
    }
    const nav = navigator.vibrate ? navigator.vibrate.bind(navigator) : null
    if (!nav) return
    if (kind === 'bet') nav(15)
    else if (kind === 'spin') nav(35)
    else if (kind === 'tick') nav(12)
    else if (kind === 'suspense') nav([20, 80, 25])
    else if (kind === 'win') nav([40, 30, 80])
    else if (kind === 'jackpot') nav([60, 30, 60, 30, 100, 40, 180])
    else if (kind === 'bomb') nav([120, 40, 90, 30, 160])
    else if (kind === 'steal') nav([45, 25, 45])
  } catch (e) {}
}

export function shake(intensity = 'medium') {
  const app = document.querySelector('.wheelwrap') || document.body
  const amp = { light: 2.5, medium: 6, heavy: 12, extreme: 18 }[intensity] || 6
  const rotAmp = { light: 0.4, medium: 1.2, heavy: 2.5, extreme: 4 }[intensity] || 1.2
  const dur = { light: 140, medium: 320, heavy: 550, extreme: 700 }[intensity] || 320
  let el = 0
  const iv = setInterval(() => {
    const x = (Math.random() - 0.5) * amp * 2
    const y = (Math.random() - 0.5) * amp * 2
    const rot = (Math.random() - 0.5) * rotAmp * 2
    app.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`
    el += 16
    if (el >= dur) {
      clearInterval(iv)
      app.style.transform = ''
    }
  }, 16)
}

// ── 🎺 STREET AIRHORN (Zafer / Jackpot Trompeti) ──────────────
export function playAirhorn() {
  try {
    const a = ac(), t = a.currentTime
    const freqs = [466.16, 466.16, 311.13, 370.0, 466.16] // Bb4, Eb4, F#4, Bb4
    const times = [0, 0.12, 0.28, 0.42, 0.58]
    const durs  = [0.09, 0.11, 0.11, 0.12, 0.38]

    freqs.forEach((f, i) => {
      const st = t + times[i]
      const dur = durs[i]
      const o1 = a.createOscillator()
      const o2 = a.createOscillator()
      const g = a.createGain()

      o1.type = 'sawtooth'
      o2.type = 'square'
      o1.frequency.setValueAtTime(f, st)
      o2.frequency.setValueAtTime(f * 1.008, st)

      g.gain.setValueAtTime(0.0001, st)
      g.gain.linearRampToValueAtTime(0.35, st + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, st + dur)

      o1.connect(g); o2.connect(g); g.connect(a.destination)
      o1.start(st); o1.stop(st + dur + 0.02)
      o2.start(st); o2.stop(st + dur + 0.02)
    })
  } catch (e) {}
}

// ── 🚨 HEIST POLICE SIREN (Soygun / Steal Efekti) ──────────────
export function playHeistSiren() {
  try {
    const a = ac(), t = a.currentTime
    const o = a.createOscillator()
    const g = a.createGain()

    o.type = 'sawtooth'
    // İki döngülü yukarı-aşağı frekans sweep
    o.frequency.setValueAtTime(600, t)
    o.frequency.linearRampToValueAtTime(1250, t + 0.35)
    o.frequency.linearRampToValueAtTime(600, t + 0.70)
    o.frequency.linearRampToValueAtTime(1300, t + 1.05)
    o.frequency.linearRampToValueAtTime(550, t + 1.45)

    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.28, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5)

    o.connect(g); g.connect(a.destination)
    o.start(t); o.stop(t + 1.55)
  } catch (e) {}
}

// ── 🪙 COIN CASCADE STREAM (Hızlı Şelale Çip Sesi) ──────────────
export function playCoinCascade(count = 8) {
  try {
    const a = ac(), t = a.currentTime
    for (let i = 0; i < count; i++) {
      const st = t + i * 0.05 + Math.random() * 0.02
      const freq = 1200 + Math.random() * 1600
      const o = a.createOscillator()
      const g = a.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(freq, st)
      o.frequency.exponentialRampToValueAtTime(freq * 0.5, st + 0.08)

      g.gain.setValueAtTime(0.0001, st)
      g.gain.linearRampToValueAtTime(0.18, st + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.1)

      o.connect(g); g.connect(a.destination)
      o.start(st); o.stop(st + 0.12)
    }
  } catch (e) {}
}

// ── 🗣️ SOKAĞIN SESİ (Web Speech Sentezleyici & Sesli Racon) ────
let isVoiceMuted = false
export function setVoiceMuted(muted) {
  isVoiceMuted = muted
}
export function getVoiceMuted() {
  return isVoiceMuted
}

export function speakStreetVoice(text, role = 'vega') {
  if (isVoiceMuted || typeof window === 'undefined' || !window.speechSynthesis) return

  try {
    // Önceki konuşmayı kesip anında girsin
    window.speechSynthesis.cancel()

    // Temiz metin
    const cleanText = text.replace(/^[^\w\sğüşöçıİĞÜŞÖÇ]+/, '').trim()
    const utter = new SpeechSynthesisUtterance(cleanText)

    utter.lang = 'tr-TR'

    // Role göre ses modülasyonu
    switch (role) {
      case 'vega': // Derin, tok, kendinden emin mafya babası
        utter.pitch = 0.8
        utter.rate = 1.12
        break
      case 'kurt': // Soğuk, hesapçı, robotik
        utter.pitch = 0.95
        utter.rate = 1.0
        break
      case 'tilki': // Hızlı, tiz, sinsi hırsız
        utter.pitch = 1.35
        utter.rate = 1.28
        break
      case 'zehra': // Keskin, soğukkanlı tetikçi
        utter.pitch = 1.15
        utter.rate = 1.18
        break
      case 'announcer': // Gaz verici casino spikeri
        utter.pitch = 0.88
        utter.rate = 1.08
        break
      default:
        utter.pitch = 1.0
        utter.rate = 1.1
    }

    // Sistemdeki Türkçe sesleri bul
    const voices = window.speechSynthesis.getVoices()
    const trVoice = voices.find(v => v.lang.includes('tr') || v.lang.includes('TR'))
    if (trVoice) utter.voice = trVoice

    window.speechSynthesis.speak(utter)
  } catch (e) {}
}

