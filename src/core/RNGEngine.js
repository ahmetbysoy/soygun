/**
 * Provably Fair RNG Engine
 * Web Crypto API (HMAC-SHA256) tabanlı deterministik ve doğrulanabilir rastgele sayı motoru.
 */

export class RNGEngine {
  constructor() {
    this.serverSeed = this.generateRandomHex(32)
    this.serverSeedHash = null
    this.clientSeed = this.generateRandomHex(16)
    this.nonce = 0
  }

  generateRandomHex(byteCount = 32) {
    const array = new Uint8Array(byteCount)
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array)
    } else {
      for (let i = 0; i < byteCount; i++) array[i] = Math.floor(Math.random() * 256)
    }
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
  }

  // SHA-256 Hash üretimi (Server seed taahhüdü için)
  async hashString(message) {
    const msgUint8 = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async initRound() {
    this.serverSeed = this.generateRandomHex(32)
    this.serverSeedHash = await this.hashString(this.serverSeed)
    this.nonce++
    return {
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
    }
  }

  /**
   * HMAC-SHA256 ile [0, max - 1] aralığında kanıtlanabilir adil sonuç üretir.
   */
  async generateProvablyFairNumber(max = 12) {
    this.nonce++
    if (!this.serverSeedHash) {
      this.serverSeedHash = await this.hashString(this.serverSeed)
    }

    const keyData = new TextEncoder().encode(this.serverSeed)
    const message = `${this.clientSeed}:${this.nonce}`
    const msgData = new TextEncoder().encode(message)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    const hashBytes = new Uint8Array(signature)
    
    // İlk 4 byte'ı 32-bit tamsayıya çevirerek üniform modülo hesapla
    const view = new DataView(hashBytes.buffer)
    const intVal = view.getUint32(0, false)
    const result = intVal % max

    return {
      result,
      serverSeed: this.serverSeed,
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
      rawHex: Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
    }
  }

  /**
   * İstemci tarafında doğrulanabilirlik kontrolü
   */
  static async verifyResult(serverSeed, clientSeed, nonce, max = 12) {
    const keyData = new TextEncoder().encode(serverSeed)
    const message = `${clientSeed}:${nonce}`
    const msgData = new TextEncoder().encode(message)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    const hashBytes = new Uint8Array(signature)
    const view = new DataView(hashBytes.buffer)
    const intVal = view.getUint32(0, false)
    return intVal % max
  }
}

export const rngEngine = new RNGEngine()
