/**
 * SpatialAudioEngine.js
 * Web Audio API PannerNode ile 3D Uzamsal Ses (Spatial Audio) Motoru.
 * Çark dönerken tık sesleri ve fırlayan paralar sol kulaktan sağ kulağa kayar,
 * oyuncunun mekansal derinlik ve dopamin hissini maksimuma çıkarır.
 */

class SpatialAudioEngine {
  constructor() {
    this.ctx = null
    this.listener = null
    this.isMuted = false
  }

  init() {
    if (this.ctx) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      this.ctx = new AudioCtx()
      this.listener = this.ctx.listener

      // Dinleyici (Kullanıcı) Pozisyonu: (0, 0, 0)
      if (this.listener.positionX) {
        this.listener.positionX.setValueAtTime(0, this.ctx.currentTime)
        this.listener.positionY.setValueAtTime(0, this.ctx.currentTime)
        this.listener.positionZ.setValueAtTime(0, this.ctx.currentTime)
        this.listener.forwardX.setValueAtTime(0, this.ctx.currentTime)
        this.listener.forwardY.setValueAtTime(0, this.ctx.currentTime)
        this.listener.forwardZ.setValueAtTime(-1, this.ctx.currentTime)
      } else if (this.listener.setPosition) {
        this.listener.setPosition(0, 0, 0)
        this.listener.setOrientation(0, 0, -1, 0, 1, 0)
      }
    } catch (e) {
      console.warn('Spatial Audio başlatılamadı:', e)
    }
  }

  ensureContext() {
    this.init()
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  /**
   * 3D Uzamsal Ses Çal
   * @param {string} soundName - 'wheel_tick' | 'coin_drop' | 'jackpot_blast' | 'siren' | 'whoosh'
   * @param {number} x - [-1 (tam sol) ile 1 (tam sağ)]
   * @param {number} y - [-1 (alt) ile 1 (üst)]
   * @param {number} z - [Mesafe derinliği: varsayılan 1]
   */
  playSpatialAudio(soundName = 'wheel_tick', x = 0, y = 0, z = 1) {
    if (this.isMuted) return
    this.ensureContext()
    if (!this.ctx) return

    const now = this.ctx.currentTime

    // Panner Node oluştur
    const panner = this.ctx.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 1
    panner.maxDistance = 10000
    panner.rolloffFactor = 1

    if (panner.positionX) {
      panner.positionX.setValueAtTime(x * 3, now)
      panner.positionY.setValueAtTime(y * 3, now)
      panner.positionZ.setValueAtTime(z * 2, now)
    } else if (panner.setPosition) {
      panner.setPosition(x * 3, y * 3, z * 2)
    }

    const gainNode = this.ctx.createGain()
    gainNode.connect(panner)
    panner.connect(this.ctx.destination)

    switch (soundName) {
      case 'wheel_tick':
        this.synthSpatialTick(now, gainNode)
        break
      case 'coin_drop':
        this.synthSpatialCoin(now, gainNode)
        break
      case 'jackpot_blast':
        this.synthSpatialJackpot(now, gainNode, panner)
        break
      case 'whoosh':
        this.synthSpatialWhoosh(now, gainNode, panner)
        break
      default:
        this.synthSpatialTick(now, gainNode)
    }
  }

  synthSpatialTick(time, gainNode) {
    const osc = this.ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(980, time)
    osc.frequency.exponentialRampToValueAtTime(140, time + 0.04)

    gainNode.gain.setValueAtTime(0.22, time)
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04)

    osc.connect(gainNode)
    osc.start(time)
    osc.stop(time + 0.04)
  }

  synthSpatialCoin(time, gainNode) {
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(2400 + Math.random() * 400, time)
    osc.frequency.exponentialRampToValueAtTime(1200, time + 0.09)

    gainNode.gain.setValueAtTime(0.3, time)
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.09)

    osc.connect(gainNode)
    osc.start(time)
    osc.stop(time + 0.09)
  }

  synthSpatialJackpot(time, gainNode, panner) {
    // Sol kulaktan sağ kulağa hızla kayan mega zafer patlaması
    if (panner.positionX) {
      panner.positionX.setValueAtTime(-5, time)
      panner.positionX.linearRampToValueAtTime(5, time + 1.2)
    }

    const osc = this.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, time)
    osc.frequency.linearRampToValueAtTime(880, time + 0.6)
    osc.frequency.linearRampToValueAtTime(440, time + 1.2)

    gainNode.gain.setValueAtTime(0.4, time)
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.2)

    osc.connect(gainNode)
    osc.start(time)
    osc.stop(time + 1.2)
  }

  synthSpatialWhoosh(time, gainNode, panner) {
    // Çark dönüşü rüzgar sesi (Sol -> Sağ)
    if (panner.positionX) {
      panner.positionX.setValueAtTime(-4, time)
      panner.positionX.linearRampToValueAtTime(4, time + 0.4)
    }

    const bufferSize = this.ctx.sampleRate * 0.4
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(600, time)
    filter.frequency.linearRampToValueAtTime(1800, time + 0.2)
    filter.frequency.linearRampToValueAtTime(300, time + 0.4)

    gainNode.gain.setValueAtTime(0.25, time)
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.4)

    noise.connect(filter)
    filter.connect(gainNode)

    noise.start(time)
    noise.stop(time + 0.4)
  }
}

export const spatialAudio = new SpatialAudioEngine()

export const playSpatialAudio = (soundName, x = 0, y = 0, z = 1) => {
  spatialAudio.playSpatialAudio(soundName, x, y, z)
}
