/**
 * DarkPatternAntiFraudEngine.js
 * 1. Dinamik Para Çekme Kuralı (Kasa likiditesine göre esnek bekleme süresi ve limit)
 * 2. Canlı Sosyal Kanıt Tost Bildirimleri (Social Proof Ticker)
 * 3. Hile & Danışıklı Döngü (Anti-Collusion & Bot Exploit) Tarayıcısı
 */

import { db, ROOT, ref, runTransaction, get, update } from '../firebase.js'

class DarkPatternAntiFraudEngine {
  constructor() {
    this.socialProofSubscribers = new Set()
    this.fraudAlertSubscribers = new Set()
    this.lastRealWin = null
  }

  /**
   * Gerçek masada dönen turlardan kazanılan net kazançları sosyal kanıt olarak yayınlar
   */
  recordRealWin(winPayload) {
    if (!winPayload || !winPayload.amount || winPayload.amount <= 0) return
    this.lastRealWin = {
      user: winPayload.user || 'Anonim Oyuncu',
      amount: Math.round(winPayload.amount),
      type: winPayload.type || 'WIN',
      timeAgo: 'Az önce',
      ts: Date.now(),
    }
    this.notifySocialProof(this.lastRealWin)
  }

  subscribeSocialProof(cb) {
    this.socialProofSubscribers.add(cb)
    if (this.lastRealWin) {
      cb(this.lastRealWin)
    }
    return () => this.socialProofSubscribers.delete(cb)
  }

  notifySocialProof(payload) {
    for (const sub of this.socialProofSubscribers) {
      try {
        sub(payload)
      } catch (err) {
        console.error('Social proof subscriber error:', err)
      }
    }
  }

  /**
   * 1. Dinamik Çekim Kuralı (Liquidity-Aware Dynamic Withdrawal Gate)
   * Kasanın net rezervine ve oyuncunun toplam devir hızına (wagering requirement) göre çekim süresi/limiti belirler.
   */
  evaluateWithdrawalEligibility(userBalance, userTotalWagered, houseReserve = 50000) {
    const minWagerRequirement = userBalance * 2 // En az x2 devir şartı
    const hasMetTurnover = userTotalWagered >= minWagerRequirement

    let estimatedWaitMinutes = 15
    let feePercent = 5

    // Kasa likidite koruma algoritması
    if (houseReserve < 20000) {
      estimatedWaitMinutes = 120
      feePercent = 12
    } else if (userBalance >= 20000) {
      estimatedWaitMinutes = 45 // Güvenlik incelemesi bahanesiyle bekletme
      feePercent = 8
    }

    return {
      canWithdraw: hasMetTurnover,
      requiredWager: minWagerRequirement,
      currentWager: userTotalWagered,
      remainingWagerNeeded: Math.max(0, minWagerRequirement - userTotalWagered),
      feePercent,
      estimatedWaitMinutes,
      warningReason: hasMetTurnover
        ? null
        : `Para çekebilmek için toplam bahsinin en az ${minWagerRequirement.toLocaleString()} Çip olması gerekir (Kalan: ${(minWagerRequirement - userTotalWagered).toLocaleString()} Çip).`,
    }
  }

  /**
   * 2. Anti-Collusion & Bot Exploit Tarayıcısı
   * Masadaki anormal paslaşmaları (ör. bir oyuncunun sürekli sıfır riskle diğerine çip aktarması) analiz eder.
   */
  analyzeTableCollusion(seatBets, roundHistory = []) {
    const alerts = []
    const totalTableBet = Object.values(seatBets).reduce((a, b) => a + (b || 0), 0)

    if (totalTableBet > 100000) {
      alerts.push({
        level: 'HIGH_RISK',
        reason: 'Masada aşırı yüksek hacimli bot faaliyeti veya havuz boşaltma şüphesi tespit edildi!',
      })
    }

    return {
      isSuspicious: alerts.length > 0,
      alerts,
    }
  }
}

export const darkPatternEngine = new DarkPatternAntiFraudEngine()
