/**
 * LoanSharkStakingEngine.js
 * 1. Sokak Tefecisi (Underground Loan Shark) - Sıfırlanan oyuncuya %10 faizle anlık kredi.
 * 2. Kasa Tahvili (House Staking / Liquidity Yield) - Çip kilitleyip saatlik %0.5 pasif kâr payı alma.
 */

import { db, ROOT, ref, runTransaction, get, update } from '../firebase.js'

class LoanSharkStakingEngine {
  constructor() {
    this.stakingAPY = 120 // Yıllık tahmini %120 APY
    this.hourlyYieldRate = 0.005 // Saatlik %0.5
    this.loanInterestRate = 0.10 // %10 Tefeci faizi
    this.maxLoanAmount = 5000 // Maksimum borç limiti
  }

  /**
   * 1. Tefeci Kredisi Çek
   */
  async requestLoan(uid, amount) {
    if (!uid || amount <= 0) return { success: false, reason: 'Geçersiz parametre' }
    const loanToGive = Math.min(amount, this.maxLoanAmount)
    const debtToPay = Math.round(loanToGive * (1 + this.loanInterestRate))

    try {
      // Kullanıcının mevcut borcunu kontrol et
      const debtSnap = await get(ref(db, `${ROOT}/users/${uid}/active_debt`))
      const currentDebt = debtSnap.val() || 0

      if (currentDebt > 0) {
        return { success: false, reason: `Ödenmemiş ${currentDebt} Çip tefeci borcun var! Önce onu kapat.` }
      }

      // Borcu kaydet ve bakiyeyi güncelle
      await runTransaction(ref(db, `${ROOT}/users/${uid}/active_debt`), () => debtToPay)
      await runTransaction(ref(db, `${ROOT}/users/${uid}/balance`), (bal) => (bal || 0) + loanToGive)

      return {
        success: true,
        loanGiven: loanToGive,
        debtOwed: debtToPay,
        message: `🤝 Tefeci kredisi verildi! +${loanToGive} Çip hesabına aktarıldı. Ödenecek toplam: ${debtToPay} Çip.`,
      }
    } catch (err) {
      console.error('Loan shark error:', err)
      return { success: false, reason: 'Tefeci bağlantısı koptu!' }
    }
  }

  /**
   * 2. Kazanılan Elden Otomatik Borç Kesintisi (Auto-Debt Collection)
   */
  async collectDebtOnWin(uid, winAmount) {
    if (!uid || winAmount <= 0) return { collected: 0, remainingDebt: 0 }

    try {
      const debtSnap = await get(ref(db, `${ROOT}/users/${uid}/active_debt`))
      const currentDebt = debtSnap.val() || 0
      if (currentDebt <= 0) return { collected: 0, remainingDebt: 0 }

      const cut = Math.min(currentDebt, Math.round(winAmount * 0.5)) // Kazancın en fazla %50'si borca kesilir
      const remaining = currentDebt - cut

      await runTransaction(ref(db, `${ROOT}/users/${uid}/active_debt`), () => remaining)
      console.log(`🩸 [TEFECİ TAHSİLATI] ${cut} Çip borç tahsil edildi. Kalan: ${remaining} Çip.`)

      return { collected: cut, remainingDebt: remaining }
    } catch (err) {
      return { collected: 0, remainingDebt: 0 }
    }
  }

  /**
   * 3. Kasa Tahvili / Çip Kilitleme (Staking)
   */
  async stakeChips(uid, amount) {
    if (!uid || amount < 100) return { success: false, reason: 'Minimum staking 100 Çiptir.' }

    try {
      const balSnap = await get(ref(db, `${ROOT}/users/${uid}/balance`))
      const currentBal = balSnap.val() || 0
      if (currentBal < amount) return { success: false, reason: 'Yetersiz bakiye!' }

      await runTransaction(ref(db, `${ROOT}/users/${uid}/balance`), (b) => Math.max(0, (b || 0) - amount))
      await runTransaction(ref(db, `${ROOT}/users/${uid}/staked_chips`), (s) => (s || 0) + amount)
      await update(ref(db, `${ROOT}/users/${uid}`), {
        stake_timestamp: Date.now(),
      })

      return {
        success: true,
        staked: amount,
        message: `🔒 ${amount.toLocaleString()} Çip Kasa Tahviline kilitlendi. Saatlik %0.5 pasif kâr payı birikiyor!`,
      }
    } catch (err) {
      return { success: false, reason: 'Staking işlemi başarısız oldu.' }
    }
  }
}

export const loanSharkEngine = new LoanSharkStakingEngine()
