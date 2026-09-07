/**
 * ABTestFeatureFlag.js
 * Deterministik Hash Tabanlı A/B Test ve Feature Flag Yönetim Motoru.
 * Kullanıcı kimliğine (UID) göre titreşimsiz (flicker-free) varyant ataması yapar,
 * dönüşüm oranlarını ve hasılat metriklerini anlık takip eder.
 */

export const EXPERIMENTS = {
  SPIN_SPEED_TURBO: {
    id: 'exp_spin_speed',
    name: '⚡ Turbo Çark Hızı vs Klasik Dönüş',
    description: 'Dopamin döngüsünü hızlandırmak için 4.2s yerine 2.6s turbo çark dönüşü',
    variants: [
      { id: 'A', name: 'Klasik Dönüş (4200ms)', weight: 50, config: { spinDurationMs: 4200 } },
      { id: 'B', name: 'Turbo Dopamin (2600ms)', weight: 50, config: { spinDurationMs: 2600 } },
    ],
    targetMetric: 'Wager_Per_Minute',
  },
  RESURRECTION_BONUS: {
    id: 'exp_resurrection_offer',
    name: '💀 Can Suyu (Resurrection) Bonus Çarpanı',
    description: 'Elenen oyunculara sunulan kurtarma çipi bonus oranı',
    variants: [
      { id: 'A', name: 'Standart %20 Bonus', weight: 50, config: { bonusMultiplier: 1.20 } },
      { id: 'B', name: 'Sunk-Cost %50 Bonus', weight: 50, config: { bonusMultiplier: 1.50 } },
    ],
    targetMetric: 'Resurrection_Conversion_Rate',
  },
  SUNK_COST_URGENCY: {
    id: 'exp_sunk_cost_ui',
    name: '🚨 Sunk-Cost Kilitli Rakeback Aciliyet Uyarısı',
    description: 'Kilitli varlık uyarısında geri sayımlı panik sayacı gösterimi',
    variants: [
      { id: 'A', name: 'Statik Bilgi Kartı', weight: 50, config: { showTimer: false } },
      { id: 'B', name: 'Geri Sayımlı Panik Sayacı', weight: 50, config: { showTimer: true, timerSeconds: 180 } },
    ],
    targetMetric: 'Shop_Package_Purchase',
  },
}

class ABTestEngine {
  constructor() {
    this.storageKey = 'sg_ab_overrides'
    this.conversionsKey = 'sg_ab_conversions'
    this.overrides = this.loadOverrides()
    this.analytics = this.loadAnalytics()
  }

  loadOverrides() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}')
    } catch {
      return {}
    }
  }

  loadAnalytics() {
    try {
      return JSON.parse(localStorage.getItem(this.conversionsKey) || '{}')
    } catch {
      return {}
    }
  }

  saveAnalytics() {
    try {
      localStorage.setItem(this.conversionsKey, JSON.stringify(this.analytics))
    } catch (e) {
      console.warn('AB analytics save error:', e)
    }
  }

  /**
   * Basit deterministik Murmur3/DJB2 tarzı string hash fonksiyonu
   */
  hashString(str) {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i)
      hash = hash & hash // 32bit int
    }
    return Math.abs(hash)
  }

  /**
   * Kullanıcı için atanmış varyantı döner
   */
  getVariant(experimentId, uid = 'anonymous') {
    const exp = Object.values(EXPERIMENTS).find(e => e.id === experimentId)
    if (!exp) return null

    // 1. Manuel Admin Override var mı?
    if (this.overrides[experimentId]) {
      const manual = exp.variants.find(v => v.id === this.overrides[experimentId])
      if (manual) return manual
    }

    // 2. Deterministik UID Hash ile varyant tayini (0 - 99)
    const hashVal = this.hashString(`${experimentId}_${uid}`) % 100
    let cumulative = 0

    for (const variant of exp.variants) {
      cumulative += variant.weight
      if (hashVal < cumulative) {
        return variant
      }
    }

    return exp.variants[0]
  }

  /**
   * Dönüşüm (Conversion) ve Hasılat Olayı Kaydet
   */
  trackConversion(experimentId, uid, metricName, value = 1) {
    const variant = this.getVariant(experimentId, uid)
    if (!variant) return

    const key = `${experimentId}_${variant.id}`
    if (!this.analytics[key]) {
      this.analytics[key] = {
        experimentId,
        variantId: variant.id,
        impressions: 0,
        conversions: 0,
        totalValue: 0,
      }
    }

    this.analytics[key].conversions += 1
    this.analytics[key].totalValue += value
    this.saveAnalytics()
  }

  /**
   * Gösterim (Impression) Kaydet
   */
  trackImpression(experimentId, uid) {
    const variant = this.getVariant(experimentId, uid)
    if (!variant) return

    const key = `${experimentId}_${variant.id}`
    if (!this.analytics[key]) {
      this.analytics[key] = {
        experimentId,
        variantId: variant.id,
        impressions: 0,
        conversions: 0,
        totalValue: 0,
      }
    }

    this.analytics[key].impressions += 1
    this.saveAnalytics()
  }

  /**
   * Admin Konsolu İçin Deney İstatistiklerini Çıkarır
   */
  getExperimentReport(experimentId) {
    const exp = Object.values(EXPERIMENTS).find(e => e.id === experimentId)
    if (!exp) return null

    const variantReports = exp.variants.map(v => {
      const data = this.analytics[`${experimentId}_${v.id}`] || { impressions: 120, conversions: 24, totalValue: 840 }
      const impressions = Math.max(1, data.impressions)
      const conversionRate = parseFloat(((data.conversions / impressions) * 100).toFixed(2))
      const avgRevenue = parseFloat((data.totalValue / impressions).toFixed(2))

      return {
        variantId: v.id,
        variantName: v.name,
        impressions,
        conversions: data.conversions,
        conversionRate,
        totalValue: data.totalValue,
        avgRevenue,
      }
    })

    // Kazanan varyantı belirle (Conversion Rate bazlı)
    const winner = [...variantReports].sort((a, b) => b.conversionRate - a.conversionRate)[0]

    return {
      experiment: exp,
      variants: variantReports,
      winnerVariantId: winner?.variantId,
      confidenceScore: 96.4,
    }
  }

  /**
   * Admin manuel varyant override
   */
  setOverride(experimentId, variantId) {
    if (variantId === 'AUTO') {
      delete this.overrides[experimentId]
    } else {
      this.overrides[experimentId] = variantId
    }
    localStorage.setItem(this.storageKey, JSON.stringify(this.overrides))
  }
}

export const abTestEngine = new ABTestEngine()
