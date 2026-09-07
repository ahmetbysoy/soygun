/**
 * SecurityEngine.js
 * Kumarhane masasında race condition, mükerrer bahis (double spend),
 * hızlı spam tıklamaları ve yetkisiz işlemleri engelleyen atomik kilit motoru.
 */

export class SecurityEngine {
  constructor() {
    this.inFlightLocks = new Map() // key: lockId, value: timestamp
    this.userNonces = new Map()     // key: uid, value: lastNonce
    this.rateLimitMap = new Map()   // key: action_uid, value: [timestamps]
    this.LOCK_TIMEOUT_MS = 3500     // Kilidin otomatik düşme süresi (deadlock koruması)
  }

  /**
   * Atomik kilit edin. Eğer işlem zaten sürüyorsa false döner.
   */
  acquireLock(lockKey) {
    const now = Date.now()
    const existing = this.inFlightLocks.get(lockKey)

    if (existing && (now - existing) < this.LOCK_TIMEOUT_MS) {
      return false // Kilit aktif, mükerrer çağrı engellendi
    }

    this.inFlightLocks.set(lockKey, now)
    return true
  }

  /**
   * Kilidi serbest bırak.
   */
  releaseLock(lockKey) {
    this.inFlightLocks.delete(lockKey)
  }

  /**
   * İşlemi atomik olarak yürüt (wrapper)
   */
  async executeAtomic(lockKey, asyncFn) {
    if (!this.acquireLock(lockKey)) {
      throw new Error(`[SecurityEngine] Concurrency collision: ${lockKey} işlemde!`)
    }
    try {
      return await asyncFn()
    } finally {
      this.releaseLock(lockKey)
    }
  }

  /**
   * Spam tıklama / Bot rate limit kontrolü (Örn: 1 saniyede max 4 bahis hamlesi)
   */
  checkRateLimit(uid, action = 'bet', maxPerSec = 4) {
    const key = `${action}_${uid}`
    const now = Date.now()
    let timestamps = this.rateLimitMap.get(key) || []
    
    // Son 1000ms içindekileri filtrele
    timestamps = timestamps.filter(t => (now - t) < 1000)
    
    if (timestamps.length >= maxPerSec) {
      return false // Rate limit aşıldı
    }

    timestamps.push(now)
    this.rateLimitMap.set(key, timestamps)
    return true
  }

  /**
   * Nonce doğrulama (Replay attack koruması)
   */
  verifyAndIncrementNonce(uid, incomingNonce) {
    const current = this.userNonces.get(uid) || 0
    if (incomingNonce <= current) {
      return false // Eski veya tekrarlanan nonce
    }
    this.userNonces.set(uid, incomingNonce)
    return true
  }

  /**
   * İstemci için bir sonraki güvenli nonce değerini üretir
   */
  getNextNonce(uid) {
    const next = (this.userNonces.get(uid) || 0) + 1
    this.userNonces.set(uid, next)
    return next
  }
}

export const securityEngine = new SecurityEngine()
