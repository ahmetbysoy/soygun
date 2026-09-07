/**
 * AnalyticsEngine.js
 * Profesyonel Oyuncu LTV (Lifetime Value), Churn Tahminleme ve Kohort Davranış Modelleri.
 * Kumarhane matematiğinde kural: "Müşterinin yaşam boyu değeri (LTV), müşteri edinme maliyetinden (CAC) en az 3.5x büyük olmalıdır."
 */

export class AnalyticsEngine {
  /**
   * 💰 OYUNCU LTV (Lifetime Value) HESAPLAMA MOTORU
   * LTV = (ARPU * Gross Margin) / Churn Rate * (1 + VIP_Velocity_Factor)
   * 
   * @param {Object} playerData
   * @param {number} playerData.totalWagered Toplam yatırılan bahis (Çip)
   * @param {number} playerData.totalDeposited Toplam satın alınan çip / depozit (USD)
   * @param {number} playerData.sessionCount Toplam oturum sayısı
   * @param {number} playerData.daysActive Aktif olunan gün sayısı
   * @param {number} playerData.rakebackClaimed Tahsil edilen rakeback
   * @param {boolean} playerData.isWalletVerified Cüzdan doğrulandı mı?
   * @param {number} houseEdge Kasa marjı (varsayılan %3.2)
   */
  static calculatePlayerLifetimeValue(playerData = {}, houseEdge = 0.032) {
    const totalWagered = playerData.totalWagered || 0
    const totalDeposited = playerData.totalDeposited || 0
    const sessionCount = Math.max(1, playerData.sessionCount || 1)
    const daysActive = Math.max(1, playerData.daysActive || 1)
    const isWalletVerified = Boolean(playerData.isWalletVerified)

    // 1. Ortalama Bahis ve Hasılat (ARPU - Average Revenue Per User)
    const avgWagerPerSession = totalWagered / sessionCount
    const houseGrossRevenueChips = totalWagered * houseEdge
    const grossMargin = 0.88 // Kasa işletim ve gaz maliyetleri sonrası brüt kar marjı

    // 2. Churn Olasılığı (Taban Churn Oranı)
    const churnAnalysis = this.predictPlayerChurn(playerData)
    const monthlyChurnRate = Math.max(0.04, Math.min(0.85, churnAnalysis.churnProbability))

    // 3. Yaşam Süresi Tahmini (Ay ve Gün Cinsinden)
    const expectedLifespanMonths = 1 / monthlyChurnRate
    const expectedLifespanDays = Math.round(expectedLifespanMonths * 30.5)

    // 4. Gelecekteki Projeksiyonel Bahis Hacmi ve LTV
    const dailyWagerVelocity = totalWagered / daysActive
    const projectedFutureWagerChips = dailyWagerVelocity * expectedLifespanDays * (isWalletVerified ? 1.4 : 1.0)
    
    // Toplam Projeksiyonel LTV (Çip ve USD)
    const chipUsdRate = 0.01 // $0.01 / Çip baz fiyatı
    const projectedGrossProfitChips = (houseGrossRevenueChips + (projectedFutureWagerChips * houseEdge)) * grossMargin
    const projectedLtvUSD = parseFloat((projectedGrossProfitChips * chipUsdRate).toFixed(2))
    const projectedLtvChips = Math.round(projectedGrossProfitChips)

    // 5. Oyuncu Monetizasyon Sınıflandırması
    let monetizationGrade = 'MINNOW'
    let tierColor = '#94a3b8'

    if (projectedLtvUSD >= 1500 || totalWagered >= 50000) {
      monetizationGrade = 'KARTEL BALİNASI (WHALE)'
      tierColor = '#00c26e'
    } else if (projectedLtvUSD >= 400 || totalWagered >= 15000) {
      monetizationGrade = 'KÖPEKBALIĞI (SHARK)'
      tierColor = '#38bdf8'
    } else if (projectedLtvUSD >= 80 || totalWagered >= 3000) {
      monetizationGrade = 'YUNUS (DOLPHIN)'
      tierColor = '#fbbf24'
    }

    return {
      projectedLtvUSD,
      projectedLtvChips,
      arpuUSD: parseFloat(((totalDeposited + (totalWagered * houseEdge * chipUsdRate)) / sessionCount).toFixed(2)),
      expectedLifespanDays,
      monthlyChurnRatePercent: parseFloat((monthlyChurnRate * 100).toFixed(1)),
      monetizationGrade,
      tierColor,
      churnRisk: churnAnalysis.riskCategory,
      churnScore: churnAnalysis.churnRiskScore,
      retentionAction: churnAnalysis.recommendedAction,
    }
  }

  /**
   * 📉 CHURN (TERK ETME) TAHMİNLEME VE RİSK ANALİZ MOTORU
   * Oyuncunun kayıp serisini, oturum aralıklarını, bakiye düşüşünü ve tilt yorgunluğunu
   * analiz ederek oyuncunun kumarhaneyi terk etme ihtimalini (0-100) çıkarır.
   */
  static predictPlayerChurn(playerData = {}) {
    const {
      currentBalance = 100,
      initialBalance = 100,
      lastActiveTimestamp = Date.now(),
      lossStreak = 0,
      streakCount = 0,
      totalWagered = 0,
    } = playerData

    const now = Date.now()
    const hoursSinceActive = Math.max(0, (now - lastActiveTimestamp) / (1000 * 60 * 60))

    let riskScore = 0

    // 1. Durgunluk Riski (Recency Decay)
    if (hoursSinceActive > 72) riskScore += 45
    else if (hoursSinceActive > 36) riskScore += 25
    else if (hoursSinceActive > 12) riskScore += 10

    // 2. Bakiye Erimesi ve Tükenme Riski (Depletion Factor)
    if (currentBalance <= 10 && initialBalance > 50) {
      riskScore += 35 // Bakiye bitti, terki an meselesi
    } else if (currentBalance < initialBalance * 0.25) {
      riskScore += 20
    }

    // 3. Kayıp Serisi & Tilt Yorgunluğu (Fatigue Index)
    if (lossStreak >= 5) riskScore += 25
    else if (lossStreak >= 3) riskScore += 15

    // 4. Streak Sadakat Koruyucusu (Retention Buffer)
    if (streakCount >= 7) riskScore -= 20
    else if (streakCount >= 3) riskScore -= 10

    // Toplam Churn Puanı (0 - 100)
    riskScore = Math.max(5, Math.min(98, riskScore))
    const churnProbability = parseFloat((riskScore / 100).toFixed(2))

    let riskCategory = 'DÜŞÜK'
    let recommendedAction = 'Standart VIP sadakat puanı işlet.'

    if (riskScore >= 75) {
      riskCategory = 'KRİTİK CHURN (TERK EDİYOR)'
      recommendedAction = '🚨 ANINDA RESURRECTION (CAN SUYU) YA DA %50 İNDİRİMLİ ÇİP PUSH BİLDİRİMİ TETİKLE!'
    } else if (riskScore >= 50) {
      riskCategory = 'YÜKSEK RİSK'
      recommendedAction = '🎁 Günlük ganimet sandığı veya kilitli rakeback kurtarma bildirimi göster.'
    } else if (riskScore >= 30) {
      riskCategory = 'ORTA RİSK'
      recommendedAction = '⚡ Yüksek çarpanlı x11.64 turnuva daveti fırlat.'
    }

    return {
      churnRiskScore: riskScore,
      churnProbability,
      riskCategory,
      recommendedAction,
      isAtRisk: riskScore >= 50,
    }
  }
}
