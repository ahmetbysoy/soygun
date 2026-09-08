/**
 * ViralGrowthEngine.js
 * Piramit tipi Rakeback, Loss Aversion Sigortası, FOMO Sayacı ve Balina Telegram Alarm Motoru.
 */

import { db, ROOT, ref, get, runTransaction, update } from '../firebase.js'
import { revenueTracker } from './revenueTracker.js'

class ViralGrowthEngine {
  constructor() {
    this.fomoTimerSeconds = 165 // 02:45 geri sayım
    this.fomoInterval = null
    this.subscribers = new Set()
  }

  initFOMOTimer() {
    if (this.fomoInterval) return
    this.fomoInterval = setInterval(() => {
      this.fomoTimerSeconds -= 1
      if (this.fomoTimerSeconds <= 0) {
        this.fomoTimerSeconds = 180 + Math.floor(Math.random() * 60) // Yeniden rastgele 3-4 dakikalık döngü
      }
      this.notifySubscribers()
    }, 1000)
  }

  subscribe(callback) {
    this.subscribers.add(callback)
    if (!this.fomoInterval) this.initFOMOTimer()
    return () => this.subscribers.delete(callback)
  }

  notifySubscribers() {
    for (const sub of this.subscribers) {
      sub({
        fomoTimerSeconds: this.fomoTimerSeconds,
        formattedTime: this.getFormattedFOMOTime(),
      })
    }
  }

  getFormattedFOMOTime() {
    const mins = Math.floor(this.fomoTimerSeconds / 60)
    const secs = this.fomoTimerSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * 1. Multi-Level Rakeback & Referans Kodu Üretici
   */
  generateReferralCode(uid) {
    if (!uid) return 'KARTEL_VIP'
    const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    return `KARTEL_${cleanUid.slice(0, 6)}`
  }

  /**
   * Davet edilen oyuncunun bahsinden davet edene %20 Rakeback dağıt
   */
  async distributeRakeback(referrerUid, wageredChips) {
    if (!referrerUid || wageredChips <= 0) return 0
    const rakebackCut = Math.max(1, Math.round(wageredChips * 0.035 * 0.20)) // Kasanın aldığı %3.5 rake'in %20'si

    try {
      await runTransaction(ref(db, `${ROOT}/users/${referrerUid}/balance`), (bal) => (bal || 0) + rakebackCut)
      await runTransaction(ref(db, `${ROOT}/users/${referrerUid}/total_rakeback_earned`), (total) => (total || 0) + rakebackCut)
      console.log(`💸 [RAKEBACK] ${referrerUid} kullanıcısına +${rakebackCut} Çip pasif komisyon aktarıldı.`)
      return rakebackCut
    } catch (err) {
      console.warn('Rakeback transaction hatası:', err)
      return 0
    }
  }

  /**
   * 2. Loss Aversion Sigortası
   * Kaybeden oyuncuya masada kalması için anlık %15 iade teklif eder
   */
  calculateLossInsurance(sessionLostChips) {
    if (sessionLostChips < 100) return null
    const refundChips = Math.round(sessionLostChips * 0.15)
    return {
      sessionLostChips,
      refundChips,
      retentionMessage: `⚠️ Masadan çıkma! Kaybettiğin ${sessionLostChips} çipin %15'i (${refundChips} Çip) Kasadan İade Sigortası ile hesabına aktarılacak!`,
    }
  }

  /**
   * 3. Telegram Balina Alarmı Simülasyonu / Webhook Çağrısı
   */
  async triggerWhaleAlert(whaleData) {
    const message = `🚨 <b>[KARTEL BALİNA ALARMI]</b>\n` +
      `👤 Oyuncu: <code>${whaleData.name || 'Anonim Balina'}</code>\n` +
      `💰 Bakiye/Pot: <b>${whaleData.chips?.toLocaleString()} ÇİP</b>\n` +
      `🎯 Masa: #${whaleData.tableId || 'MASA_1'}\n` +
      `⚡ Durum: Masada büyük para dönüyor, DDA Botları pusuda!`

    console.log(`📢 [TELEGRAM WHALE WEBHOOK SENT]:\n${message}`)

    // Window event fırlat (UI üzerinde bildirim çıksın)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('WHALE_ALERT_BROADCAST', { detail: { ...whaleData, message } }))
    }

    return { status: 'BROADCASTED', message }
  }
}

export const viralGrowthEngine = new ViralGrowthEngine()
