/**
 * Math & Probability Engine
 * Beklenen değer (EV), Kelly Kriteri, VIP Rakeback ve dinamik kasa marjı modelleri.
 */

export const VIP_TIERS = [
  { id: 0, name: 'Çaylak', minWager: 0, rakebackRate: 0.05, badge: '🧢' },
  { id: 1, name: 'Sokak Kurdu', minWager: 500, rakebackRate: 0.08, badge: '🐺' },
  { id: 2, name: 'Tetikçi', minWager: 2500, rakebackRate: 0.12, badge: '🔫' },
  { id: 3, name: 'Soygun Lideri', minWager: 10000, rakebackRate: 0.16, badge: '💼' },
  { id: 4, name: 'Kartel Baronu', minWager: 50000, rakebackRate: 0.22, badge: '👑' },
]

export class MathEngine {
  /**
   * Expected Value (Beklenen Değer) hesaplaması:
   * EV = (P(Win) * Payout) - (P(Loss) * Stake)
   */
  static calcExpectedValue(probWin, payoutMultiplier, stake = 1) {
    const probLoss = 1 - probWin
    const netWin = stake * (payoutMultiplier - 1)
    return (probWin * netWin) - (probLoss * stake)
  }

  /**
   * Kelly Kriteri Formülü:
   * f* = (bp - q) / b
   * b = net oran (çarpan - 1)
   * p = kazanma olasılığı
   * q = kaybetme olasılığı (1 - p)
   */
  static calculateKellyCriterion(probWin, multiplier, fractionMultiplier = 0.5) {
    const b = multiplier - 1
    if (b <= 0) return 0
    const p = probWin
    const q = 1 - p
    const fStar = (b * p - q) / b

    // Negatifse bahis yapılmamalı, pozitifse bankroll fraksiyonu
    return Math.max(0, fStar * fractionMultiplier)
  }

  /**
   * Dinamik Kasa Marjı:
   * Likidite havuzu ve oyuncu varyansına göre optimize edilen marj.
   */
  static calcDynamicHouseEdge(baseEdge = 0.035, poolDeficitRatio = 0) {
    return Math.min(0.08, baseEdge + (poolDeficitRatio * 0.04))
  }

  /**
   * Toplam bahis hacmine göre VIP Seviyesi
   */
  static getVipTier(totalWagered = 0) {
    let currentTier = VIP_TIERS[0]
    for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
      if (totalWagered >= VIP_TIERS[i].minWager) {
        currentTier = VIP_TIERS[i]
        break
      }
    }
    const nextTier = VIP_TIERS[currentTier.id + 1] || null
    const progress = nextTier
      ? Math.min(100, Math.round(((totalWagered - currentTier.minWager) / (nextTier.minWager - currentTier.minWager)) * 100))
      : 100

    return {
      ...currentTier,
      progress,
      nextTier,
    }
  }

  /**
   * Kayıp tutarı üzerinden anında VIP Rakeback hesaplar
   */
  static calculateRakeback(lossAmount, tierId = 0) {
    if (lossAmount <= 0) return 0
    const tier = VIP_TIERS.find(t => t.id === tierId) || VIP_TIERS[0]
    return Math.max(1, Math.round(lossAmount * tier.rakebackRate))
  }

  /**
   * Günlük seri (streak) ganimet ödülü (Ganimet Kasası):
   * Gün arttıkça katlanan dopamin çarpanı
   */
  static calculateStreakReward(streakCount = 1) {
    const safeStreak = Math.min(30, Math.max(1, streakCount))
    // 1: 50, 2: 90, 3: 140, 4: 210, 5: 300, 6: 420, 7: 650 (Haftalık jackpot)
    if (safeStreak === 7) return 650
    if (safeStreak > 7 && safeStreak % 7 === 0) return 1000
    const base = 50
    const bonus = Math.round(base * (1 + (safeStreak - 1) * 0.4))
    return bonus
  }

  /**
   * Kelly Kriteri sınırlarına göre maksimum güvenli bahis boyutu
   */
  static calcMaxSafeStake(bankroll, maxFraction = 0.15) {
    return Math.max(5, Math.floor(bankroll * maxFraction))
  }
}

