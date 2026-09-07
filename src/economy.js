// economy.js — Dinamik Likidite/Enflasyon Değerlemesi, Real-Time WebSocket Rate Engine,
// Varyansa Dayalı Dinamik Kasa Avantajı (Dynamic House Edge) ve Kilitli Varlık (Locked Asset) Rakeback Sistemi.

import { useEffect, useState } from 'react'
import { db, ref, onValue, runTransaction, get, update, ROOT } from './firebase.js'
import { MathEngine, VIP_TIERS } from './core/MathEngine.js'

/**
 * 🌐 1. REAL-TIME MOCK / LIVE WEBSOCKET RATE ENGINE (TON / USDT & ÇİP PARİTESİ)
 * Piyasa derinliği, anlık volatilite ve spread değişimlerini canlı event-stream olarak yayınlar.
 */
class MarketRateStreamer {
  constructor() {
    this.subscribers = new Set()
    this.tonSpotPrice = 3.85
    this.change24h = 2.45
    this.spreadPercent = 4.2
    this.volatilityIndex = 1.05
    this.marketMultiplier = 1.0
    this.wsStatus = 'connecting'
    this.ws = null
    this.intervalTimer = null

    this.initStream()
  }

  initStream() {
    // 1. Canlı WebSocket veya Gelişmiş Dinamik Rate Simülatörü Başlat
    try {
      if (typeof window !== 'undefined') {
        this.startDynamicWebSocket()
      }
    } catch (e) {
      console.warn('WebSocket stream error, fallback to polling:', e)
    }
  }

  startDynamicWebSocket() {
    this.wsStatus = 'live_streaming'

    // Micro-tick canlı döngü (gerçek piyasa derinliği simülasyonu)
    this.intervalTimer = setInterval(() => {
      // Rastgele micro Gauss dağılımlı fiyat kayması (-%0.15 ile +%0.15 arası)
      const delta = (Math.random() - 0.49) * 0.012
      this.tonSpotPrice = Math.max(2.50, Math.min(6.50, parseFloat((this.tonSpotPrice + delta).toFixed(4))))

      // 24 saatlik değişim ve volatilite endeksi güncellemesi
      this.change24h = parseFloat((this.change24h + delta * 3).toFixed(2))
      this.volatilityIndex = Math.max(0.85, Math.min(1.45, 1 + (Math.abs(delta) * 15)))

      // Baz TON = 3.80 USDT kabulüyle dinamik reel piyasa çarpanı
      const priceRatio = this.tonSpotPrice / 3.80
      this.marketMultiplier = Math.max(0.80, Math.min(1.50, parseFloat((priceRatio * this.volatilityIndex).toFixed(4))))

      this.notifySubscribers()
    }, 2500)
  }

  subscribe(listener) {
    this.subscribers.add(listener)
    listener(this.getMarketState())
    return () => this.subscribers.delete(listener)
  }

  notifySubscribers() {
    const state = this.getMarketState()
    this.subscribers.forEach(cb => {
      try { cb(state) } catch (err) { console.error('MarketRateStreamer error:', err) }
    })
  }

  getMarketState() {
    const baseChipUsd = 0.01
    const dynamicChipUsd = parseFloat((baseChipUsd * this.marketMultiplier).toFixed(5))

    return {
      tonSpotPrice: this.tonSpotPrice,
      change24h: this.change24h,
      spreadPercent: this.spreadPercent,
      volatilityIndex: this.volatilityIndex,
      marketMultiplier: this.marketMultiplier,
      dynamicChipUsd,
      wsStatus: this.wsStatus,
      lastUpdated: Date.now(),
    }
  }

  destroy() {
    if (this.intervalTimer) clearInterval(this.intervalTimer)
    this.subscribers.clear()
  }
}

export const marketRateStreamer = new MarketRateStreamer()

export async function fetchLiveMarketRate() {
  return marketRateStreamer.getMarketState().marketMultiplier
}

/**
 * Anlık dinamik 1 Çip USD Değeri
 */
export function getDynamicChipValueUSD() {
  return marketRateStreamer.getMarketState().dynamicChipUsd
}

// Geriye dönük uyumluluk sabitleri
export const CHIP_VALUE_USD = 0.01
export const JACKPOT_CONTRIBUTION_RATE = 0.01 // Her bahsin %1'i ortak progresif jackpot havuzuna akar

/**
 * 🎯 2. VARYANSA DAYALI DİNAMİK KASA AVANTAJI (DYNAMIC HOUSE EDGE ENGINE)
 * Oyuncunun kazanma/kaybetme varyansına, RTP dengesine ve kasa havuzu likiditesine
 * göre kasa marjını %2.2 ile %5.5 arasında dinamik olarak optimize eder.
 */
export class VarianceAdaptiveHouseEdge {
  /**
   * @param {Object} playerStats { winStreak, lossStreak, totalWagered, totalWon }
   * @param {number} poolBalance Mevcut kasa ödül havuzu
   * @returns {Object} Dinamik kasa marjı ve varyans katsayısı
   */
  static calculateDynamicHouseEdge(playerStats = {}, poolBalance = 5000) {
    const BASE_HOUSE_EDGE = 0.032 // %3.2 Taban Marj

    const {
      winStreak = 0,
      lossStreak = 0,
      totalWagered = 0,
      totalWon = 0,
    } = playerStats

    let varianceAdjustment = 0

    // Oyuncu ardışık büyük vurgunlar yapıyorsa (Yüksek Oyuncu Varyansı):
    // Kasa likiditesini korumak için kasa avantajı agresifleşir (+%1.5 - +%2.3)
    if (winStreak >= 2) {
      varianceAdjustment += Math.min(0.023, winStreak * 0.008)
    }

    // Oyuncu ardışık kayıplardaysa ve tilt eşiğindeyse:
    // Oyuncuyu masada tutmak ve dopamin near-miss tetiklemek için marj hafif gevşetilir (-%0.8)
    if (lossStreak >= 3) {
      varianceAdjustment -= Math.min(0.010, lossStreak * 0.003)
    }

    // Oyuncu RTP Oranı Analizi
    const playerRtp = totalWagered > 0 ? (totalWon / totalWagered) : 0.95
    if (playerRtp > 1.20) {
      varianceAdjustment += 0.012 // Aşırı karda olan oyuncuya karşı defans
    } else if (playerRtp < 0.70) {
      varianceAdjustment -= 0.006 // Çok kaybetmiş oyuncuya kurtarma tamponu
    }

    // Kasa havuzu sağlığı (Düşük likiditede defansif marj)
    if (poolBalance < 1500) {
      varianceAdjustment += 0.015
    }

    const effectiveHouseEdge = Math.max(0.022, Math.min(0.055, BASE_HOUSE_EDGE + varianceAdjustment))
    const effectiveRtp = 1 - effectiveHouseEdge

    return {
      baseEdge: BASE_HOUSE_EDGE,
      effectiveHouseEdge,
      effectiveHouseEdgePercent: parseFloat((effectiveHouseEdge * 100).toFixed(2)),
      effectiveRtp: parseFloat((effectiveRtp * 100).toFixed(2)),
      varianceAdjustment,
      tier: effectiveHouseEdge > 0.040 ? 'DEFANSİF (YÜKSEK VARYANS)' : effectiveHouseEdge < 0.028 ? 'DOPAMİN YEMİ (DÜŞÜK MARJ)' : 'STANDART DENGE',
    }
  }
}

export function getDynamicHouseEdge(playerStats, poolBalance) {
  return VarianceAdaptiveHouseEdge.calculateDynamicHouseEdge(playerStats, poolBalance)
}

/**
 * 🔒 3. KİLİTLİ VARLIK (LOCKED ASSET) RAKEBACK SİSTEMİ
 * Rakeback doğrudan nakit dağıtılmaz; 'Rehin Tutulan Varlık' olarak birikir.
 * Gelecekteki çip alımlarıyla orantılı olarak serbest kalır (Sunk-Cost Lock-in).
 */
export class LockedAssetEngine {
  /**
   * Çip alım tutarına göre ne kadar kilitli rakeback serbest kalacağını hesaplar
   */
  static calculateUnlockableRakeback(purchaseChips, lockedRakebackBalance) {
    if (lockedRakebackBalance <= 0) return 0
    // Her 100 Çip satın alımı, birikmiş kilitli rakeback'in %35'ini anında açar
    // 500+ Çip alımı kilitli rakeback'in %100'ünü serbest bırakır!
    if (purchaseChips >= 500) {
      return lockedRakebackBalance
    }
    const unlockRatio = Math.min(1.0, (purchaseChips / 500))
    return Math.round(lockedRakebackBalance * unlockRatio)
  }
}

const econRef = () => ref(db, `${ROOT}/econ`)

export function useEcon() {
  const [e, setE] = useState(null)
  useEffect(() => {
    const un = onValue(econRef(), s => setE(s.val() || {}))
    return () => un()
  }, [])
  return e
}

// Havuz Okuma ve Yönetim Fonksiyonları
export const getPool = () => get(ref(db, `${ROOT}/econ/prize_pool`)).then(s => s.val() || 0)
export const getJackpotPool = () => get(ref(db, `${ROOT}/econ/jackpot_pool`)).then(s => s.val() || 0)

export const adjPool = d => runTransaction(ref(db, `${ROOT}/econ/prize_pool`), c => Math.max(0, (c || 0) + d))
export const adjJackpot = d => runTransaction(ref(db, `${ROOT}/econ/jackpot_pool`), c => Math.max(0, (c || 0) + d))
export const addPaid = d => runTransaction(ref(db, `${ROOT}/econ/paid_chips`), c => (c || 0) + d)
export const addRevenue = d => runTransaction(ref(db, `${ROOT}/econ/revenue_chips`), c => (c || 0) + d)

const todayStr = () => new Date().toISOString().slice(0, 10)

/**
 * 👑 VIP ve Kilitli Rakeback (Sunk-Cost Asset) Bilgilerini Getir
 */
export async function getUserLoyalty(uid) {
  const uRef = ref(db, `${ROOT}/users/${uid}`)
  const u = (await get(uRef)).val() || {}
  const totalWagered = u.total_wagered || 0

  // Kilitli biriken rakeback (Oyuncunun kaybettiklerinden doğan ama rehin tutulan varlık)
  const lockedRakeback = u.locked_rakeback != null ? u.locked_rakeback : (u.accumulated_rakeback || 0)
  const unlockedRakeback = u.unlocked_rakeback || 0
  const vipInfo = MathEngine.getVipTier(totalWagered)
  const lastDaily = u.last_daily_date || null
  const streak = u.login_streak || 0

  return {
    uid,
    totalWagered,
    lockedRakeback,
    unlockedRakeback,
    accumulatedRakeback: lockedRakeback + unlockedRakeback,
    vipTier: vipInfo,
    lastDaily,
    streak,
    chipUsdValue: getDynamicChipValueUSD(),
    marketState: marketRateStreamer.getMarketState(),
  }
}

/**
 * 🔒 SUNK-COST RAKEBACK TAHSİLAT KONTROLÜ:
 * Bedava nakit dağıtmak oyuncuyu masadan kaldırır. Bu yüzden Rakeback 'Kilitli Varlık' (Locked Asset)
 * statüsündedir. Oyuncu direkt çekmeye kalktığında Sunk-Cost Fallacy tetiklenir ve
 * 'Yeni Çip Alımı ile Kilidi Aç' mağazasına yönlendirilir!
 */
export async function claimRakeback(uid) {
  const uRef = ref(db, `${ROOT}/users/${uid}`)
  const u = (await get(uRef)).val() || {}
  
  const lockedAmount = u.locked_rakeback != null ? u.locked_rakeback : (u.accumulated_rakeback || 0)
  const unlockedAmount = u.unlocked_rakeback || 0

  // Eğer kilitli rakeback varsa ama oyuncu henüz çip alarak kilidi açmadıysa:
  if (unlockedAmount <= 0 && lockedAmount > 0) {
    return {
      ok: false,
      isLocked: true,
      lockedAmount,
      msg: `⚠️ REHİN TUTULAN KİLİTLİ VARLIK! Masada biriken ${lockedAmount} Çip (%${Math.round(MathEngine.getVipTier(u.total_wagered || 0).rakebackRate * 100)} VIP Rakeback) kasada rehin tutulmaktadır. Bu tutarı serbest bırakıp bakiyene aktarmak için Mağazadan herhangi bir çip paketi yüklemen gerekir!`,
    }
  }

  if (unlockedAmount <= 0 && lockedAmount <= 0) {
    return { ok: false, isLocked: false, msg: 'Tahsil edilecek birikmiş veya kilidi açılmış rakeback bakiyesi bulunamadı.' }
  }

  // Yalnızca serbest kalmış tutarı tahsil et
  let claimed = 0
  await runTransaction(uRef, user => {
    if (!user) return user
    claimed = user.unlocked_rakeback || 0
    if (claimed <= 0) return user
    user.unlocked_rakeback = 0
    user.balance = (user.balance || 0) + claimed
    user.last_rakeback_claim = Date.now()
    return user
  })

  if (claimed > 0) {
    addPaid(claimed)
    return { ok: true, claimed, isLocked: false }
  }

  return { ok: false, isLocked: false, msg: 'İşlem gerçekleştirilemedi.' }
}

/**
 * 🎁 Günlük Ganimet Kasası (Daily Heist Streak Loot)
 */
export async function claimDailyStreak(uid) {
  const d = todayStr()
  const uRef = ref(db, `${ROOT}/users/${uid}`)
  const u = (await get(uRef)).val() || {}

  if (u.last_daily_date === d) {
    return { ok: false, msg: 'Bugünkü ganimet kasasını zaten açtın. Gece 00:00’da tekrar gel!' }
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  let newStreak = 1
  if (u.last_daily_date === yesterday) {
    newStreak = (u.login_streak || 1) + 1
  }

  const rewardChips = MathEngine.calculateStreakReward(newStreak)

  await runTransaction(ref(db, `${ROOT}/users/${uid}/balance`), c => (c || 0) + rewardChips)
  await update(uRef, {
    last_daily_date: d,
    login_streak: newStreak,
  })

  adjPool(-rewardChips)
  addPaid(rewardChips)

  return {
    ok: true,
    give: rewardChips,
    streak: newStreak,
    isJackpotDay: newStreak % 7 === 0,
  }
}

/**
 * 🛒 Gerçek Çip Paket Satın Alma (TON / Kripto veya Direkt Bakiye Yükleme)
 * 💥 SUNK-COST UNLOCK TETİKLEYİCİ: Paket alındığı an Kilitli Rakeback'in kilidi açılır ve bakiyeye eklenir!
 */
export async function purchaseChipPackage(uid, packageId, txHash = '') {
  try {
    const res = await fetch('/api/shop/verify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, packageId, txHash }),
    })
    const data = await res.json()
    if (!data.success) {
      return { ok: false, msg: data.error || 'Ödeme doğrulanamadı' }
    }

    let unlockedBonus = 0

    // Kullanıcı bakiyesini Firebase üzerinde artır ve Kilitli Rakeback'i serbest bırak
    const uRef = ref(db, `${ROOT}/users/${uid}`)
    await runTransaction(uRef, user => {
      if (!user) return user
      const locked = user.locked_rakeback != null ? user.locked_rakeback : (user.accumulated_rakeback || 0)
      if (locked > 0) {
        unlockedBonus = LockedAssetEngine.calculateUnlockableRakeback(data.chipsAdded, locked)
        user.locked_rakeback = Math.max(0, locked - unlockedBonus)
        user.accumulated_rakeback = user.locked_rakeback
      }
      user.balance = (user.balance || 0) + data.chipsAdded + unlockedBonus
      return user
    })

    addRevenue(data.chipsAdded)
    adjPool(Math.round(data.chipsAdded * 0.4))

    return {
      ok: true,
      chipsAdded: data.chipsAdded,
      unlockedBonus,
      totalReceived: data.chipsAdded + unlockedBonus,
      packageName: data.packageName,
      newBalance: (data.newBalance || 0) + unlockedBonus,
    }
  } catch (err) {
    return { ok: false, msg: err.message || 'Ödeme sunucusuna ulaşılamadı' }
  }
}
