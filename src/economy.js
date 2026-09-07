// economy.js — Gerçek dinamik ekonomi, kasa havuzu, VIP Rakeback ve kripto paket motoru.
// ❌ Simülasyon, mock veri ve yer tutucu mantıklar tamamen temizlenmiştir.
import { useEffect, useState } from 'react'
import { db, ref, onValue, runTransaction, get, update, ROOT } from './firebase.js'
import { MathEngine, VIP_TIERS } from './core/MathEngine.js'

export const CHIP_VALUE_USD = 0.01 // 1 Chip = 0.01 USD baz piyasa değeri
export const JACKPOT_CONTRIBUTION_RATE = 0.01 // Her bahsin %1'i ortak progresif jackpot havuzuna akar

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
 * 👑 VIP ve Rakeback Bilgilerini Getir
 */
export async function getUserLoyalty(uid) {
  const uRef = ref(db, `${ROOT}/users/${uid}`)
  const u = (await get(uRef)).val() || {}
  const totalWagered = u.total_wagered || 0
  const accumulatedRakeback = u.accumulated_rakeback || 0
  const vipInfo = MathEngine.getVipTier(totalWagered)
  const lastDaily = u.last_daily_date || null
  const streak = u.login_streak || 0

  return {
    uid,
    totalWagered,
    accumulatedRakeback,
    vipTier: vipInfo,
    lastDaily,
    streak,
  }
}

/**
 * 💸 Biriken VIP Rakeback / Cashback'i Oyuncu Bakiyesine Tahsil Et
 */
export async function claimRakeback(uid) {
  const uRef = ref(db, `${ROOT}/users/${uid}`)
  let claimedAmount = 0

  const res = await runTransaction(uRef, user => {
    if (!user) return user
    const pending = user.accumulated_rakeback || 0
    if (pending <= 0) return // Hiç rakeback yok, işlemi durdur
    claimedAmount = pending
    user.accumulated_rakeback = 0
    user.balance = (user.balance || 0) + claimedAmount
    user.last_rakeback_claim = Date.now()
    return user
  })

  if (!res.committed || claimedAmount <= 0) {
    return { ok: false, msg: 'Tahsil edilecek birikmiş rakeback bakiyesi bulunamadı.' }
  }

  addPaid(claimedAmount)
  return { ok: true, claimed: claimedAmount }
}

/**
 * 🎁 Günlük Ganimet Kasası (Daily Heist Streak Loot):
 * Oyuncunun ardışık gün serisine göre artan dopamin ödülü
 */
export async function claimDailyStreak(uid) {
  const d = todayStr()
  const uRef = ref(db, `${ROOT}/users/${uid}`)
  const u = (await get(uRef)).val() || {}

  if (u.last_daily_date === d) {
    return { ok: false, msg: 'Bugünkü ganimet kasasını zaten açtın. Gece 00:00’da tekrar gel!' }
  }

  // Dünün tarihi ile karşılaştırıp streak'i koru veya sıfırla
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

    // Kullanıcı bakiyesini Firebase üzerinde artır
    await runTransaction(ref(db, `${ROOT}/users/${uid}/balance`), c => (c || 0) + data.chipsAdded)
    addRevenue(data.chipsAdded)
    adjPool(Math.round(data.chipsAdded * 0.4)) // %40'ı likidite havuzuna aktarılır

    return {
      ok: true,
      chipsAdded: data.chipsAdded,
      packageName: data.packageName,
      newBalance: data.newBalance,
    }
  } catch (err) {
    return { ok: false, msg: err.message || 'Ödeme sunucusuna ulaşılamadı' }
  }
}
