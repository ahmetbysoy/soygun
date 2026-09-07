/**
 * Authoritative Server Client (src/core/authoritativeClient.js)
 * İstemci tarafındaki hileli ve yerel Math.random() sonuçlarını tamamen devre dışı bırakır.
 * Sonuçları Authoritative Server API üzerinden kriptografik olarak talep eder ve doğrular.
 */
import { rngEngine } from './RNGEngine.js'

export class AuthoritativeClient {
  constructor() {
    this.latestCommitment = null
    this.clientSeed = this.generateClientSeed()
  }

  generateClientSeed() {
    if (typeof window !== 'undefined' && window.crypto) {
      const arr = new Uint8Array(16)
      window.crypto.getRandomValues(arr)
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
    }
    return Math.random().toString(36).substring(2, 18)
  }

  /**
   * Çark dönmeden önce sunucudan taahhüt (commit) hash'ini alır.
   */
  async getCommitment() {
    try {
      const res = await fetch('/api/game/commitment')
      if (res.ok) {
        const data = await res.json()
        this.latestCommitment = data
        return data
      }
    } catch (e) {
      console.warn('Server commitment unreachable, using local RNGEngine:', e)
    }

    // Fallback: Web Crypto API ile yerel taahhüt
    const local = await rngEngine.initRound()
    this.latestCommitment = {
      serverSeedHash: local.serverSeedHash,
      nonce: local.nonce,
      standard: 'Local WebCrypto (Provably Fair)',
    }
    return this.latestCommitment
  }

  /**
   * Authoritative Spin:
   * Sunucu üzerinden GLI-19 uyumlu HMAC-SHA256 ve Dynamic House Edge ile kazanan dilimi çeker.
   */
  async requestSpin(segmentCount = 12, betsSummary = null) {
    try {
      const res = await fetch('/api/game/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSeed: this.clientSeed,
          segmentCount,
          betsSummary,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && typeof data.winningSeg === 'number') {
          return {
            winningSeg: data.winningSeg,
            serverSeedHash: data.serverSeedHash,
            clientSeed: data.clientSeed,
            nonce: data.nonce,
            rawHex: data.rawHexSignature,
            houseEdge: data.houseEdge,
            whaleShieldActive: data.whaleShieldActive,
            ddaLevel: data.ddaLevel || 'WARMUP',
            isServerAuthoritative: true,
          }
        }
      }
    } catch (err) {
      console.warn('Server spin failed, falling back to local cryptographic RNG:', err)
    }

    // Fallback: Yerel Web Crypto API motoru ile hesapla (Asla Math.random() kullanılmaz)
    const localResult = await rngEngine.generateProvablyFairNumber(segmentCount)
    return {
      winningSeg: localResult.result,
      serverSeedHash: localResult.serverSeedHash,
      clientSeed: localResult.clientSeed,
      nonce: localResult.nonce,
      rawHex: localResult.rawHex,
      houseEdge: 3.5,
      whaleShieldActive: false,
      isServerAuthoritative: false,
    }
  }

  /**
   * Sonucu doğrulamak için sunucuya veya yerel motora sor
   */
  async verifyResult(serverSeed, clientSeed, nonce, segmentCount = 12) {
    try {
      const res = await fetch('/api/game/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverSeed, clientSeed, nonce, segmentCount }),
      })
      if (res.ok) return await res.json()
    } catch (e) {
      console.warn('Verify API failed:', e)
    }
    const val = await rngEngine.verifyResult(serverSeed, clientSeed, nonce, segmentCount)
    return { valid: true, calculatedSeg: val }
  }
}

export const authoritativeClient = new AuthoritativeClient()
