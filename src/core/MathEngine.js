/**
 * Math & Probability Engine
 * Beklenen değer (EV), Kelly Kriteri ve dinamik kasa marjı modelleri.
 */

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
   * @param {number} probWin
   * @param {number} multiplier
   * @param {number} fractionMultiplier - Çeyrek/Yarım Kelly katsayısı (genelde 0.25 - 0.5 risk kontrolü için)
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
    // Havuz açığı arttıkça marj güvenlik katsayısıyla esner
    return Math.min(0.08, baseEdge + (poolDeficitRatio * 0.04))
  }
}
