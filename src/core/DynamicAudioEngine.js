/**
 * DynamicAudioEngine.js
 * Web Audio API ile sıfır harici dosya bağımlılığıyla çalışan,
 * dinamik durumsal arka plan müziği (Interactive Dynamic BGM) ve synth motoru.
 * Oyunun fazlarına (Bahis, Çark Dönüşü, Jackpot, Bomba) göre frekans filtresi,
 * tempo ve arpej modülasyonu yapar.
 */

class DynamicAudioEngine {
  constructor() {
    this.ctx = null
    this.isMuted = false
    this.isPlaying = false
    this.masterGain = null
    this.filterNode = null
    this.tempo = 118 // BPM
    this.currentPhase = 'betting' // betting | spinning | win | idle
    this.timerId = null
    this.step = 0
    this.volume = 0.28

    // Pentatonik / Cyberpunk Kartel Akor Dizilimi (F minör / D minör karanlık kumarhane)
    this.bassNotes = [36.71, 36.71, 41.20, 43.65, 32.70, 36.71, 48.99, 43.65] // D1, F1, G1, C1...
    this.arpNotes = [146.83, 174.61, 220.00, 261.63, 293.66, 349.23, 440.00, 523.25]
  }

  init() {
    if (this.ctx) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      this.ctx = new AudioCtx()

      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime)

      this.filterNode = this.ctx.createBiquadFilter()
      this.filterNode.type = 'lowpass'
      this.filterNode.frequency.setValueAtTime(800, this.ctx.currentTime)
      this.filterNode.Q.setValueAtTime(2.5, this.ctx.currentTime)

      this.filterNode.connect(this.masterGain)
      this.masterGain.connect(this.ctx.destination)
    } catch (e) {
      console.warn('Web Audio API başlatılamadı:', e)
    }
  }

  ensureContext() {
    this.init()
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  start() {
    this.ensureContext()
    if (this.isPlaying || !this.ctx) return
    this.isPlaying = true
    this.step = 0
    this.scheduleLoop()
  }

  stop() {
    this.isPlaying = false
    if (this.timerId) clearTimeout(this.timerId)
  }

  setPhase(phase) {
    this.currentPhase = phase
    if (!this.ctx || !this.filterNode) return

    const now = this.ctx.currentTime
    if (phase === 'spinning') {
      // Çark dönerken gerilimi tırmandır: Filtreyi aç, bası sıklaştır
      this.filterNode.frequency.exponentialRampToValueAtTime(3200, now + 1.2)
      this.tempo = 138
    } else if (phase === 'win' || phase === 'jackpot') {
      // Vurgun kutlaması
      this.filterNode.frequency.exponentialRampToValueAtTime(4800, now + 0.4)
      this.tempo = 124
    } else {
      // Normal bahis aşaması: Karanlık ve derinden
      this.filterNode.frequency.exponentialRampToValueAtTime(750, now + 0.8)
      this.tempo = 114
    }
  }

  setMuted(muted) {
    this.isMuted = muted
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : this.volume, now + 0.1)
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime)
    }
  }

  // 16'lık Ritim Adım Tetikleyici
  scheduleLoop() {
    if (!this.isPlaying) return

    const intervalMs = (60 / this.tempo / 4) * 1000
    this.playBeatStep(this.step)
    this.step = (this.step + 1) % 32

    this.timerId = setTimeout(() => this.scheduleLoop(), intervalMs)
  }

  playBeatStep(step) {
    if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return
    const now = this.ctx.currentTime

    // 1. Derin Sub-Bass (Her 4 adımda bir veya çark dönüşünde her 2 adımda bir)
    const isBassStep = this.currentPhase === 'spinning' ? (step % 2 === 0) : (step % 4 === 0)
    if (isBassStep) {
      const bassIndex = Math.floor(step / 4) % this.bassNotes.length
      const freq = this.bassNotes[bassIndex]
      this.synthSubBass(freq, now, 0.22)
    }

    // 2. Cyberpunk Arpeggiator (Spinning fazında 16'lık hızlı arpej)
    if (this.currentPhase === 'spinning' || this.currentPhase === 'win') {
      const arpIndex = (step * 2) % this.arpNotes.length
      const arpFreq = this.arpNotes[arpIndex]
      this.synthArpPluck(arpFreq, now, 0.09)
    }

    // 3. Lo-Fi Kumarhane Hi-Hat & Shaker (Off-beat)
    if (step % 2 === 1) {
      this.synthHiHat(now, step % 4 === 3 ? 0.04 : 0.02)
    }

    // 4. Kick Heartbeat (Her vuruşun başında)
    if (step % 4 === 0) {
      this.synthKick(now, this.currentPhase === 'spinning' ? 0.25 : 0.15)
    }
  }

  synthSubBass(freq, time, duration) {
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(freq, time)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.95, time + duration)

    gain.gain.setValueAtTime(0.35, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration)

    osc.connect(gain)
    gain.connect(this.filterNode)

    osc.start(time)
    osc.stop(time + duration)
  }

  synthArpPluck(freq, time, duration) {
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, time)

    gain.gain.setValueAtTime(0.18, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration)

    osc.connect(gain)
    gain.connect(this.filterNode)

    osc.start(time)
    osc.stop(time + duration)
  }

  synthHiHat(time, duration) {
    // Beyaz gürültü filtreleme
    const bufferSize = this.ctx.sampleRate * duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(7000, time)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.08, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    noise.start(time)
    noise.stop(time + duration)
  }

  synthKick(time, gainVal) {
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.frequency.setValueAtTime(130, time)
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.12)

    gain.gain.setValueAtTime(gainVal, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12)

    osc.connect(gain)
    gain.connect(this.masterGain)

    osc.start(time)
    osc.stop(time + 0.12)
  }
}

export const dynamicAudio = new DynamicAudioEngine()
