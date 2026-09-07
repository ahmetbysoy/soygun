/**
 * FOMOEngine.js
 * Kumarhane psikolojik manipülasyon ve FOMO (Fırsatı Kaçırma Korkusu) motoru.
 * - Canlı balina (whale) çekim ve kazanç bildirimleri
 * - Kısıtlı zaman sayaçları (Scarcity & Flash Deals)
 * - Masaya sosyal kanıt (social proof) enjeksiyonu
 */

export class FOMOEngine {
  constructor() {
    this.whaleNames = [
      'crypto_kurt', '0x71a...9f2', 'ton_baron', '0x3d...b81', 'serdar_ist',
      'whale_99', '0xe4...12c', 'mehmet_tr', '0x88...a04', 'alex_dubai',
      '0x9c...33e', 'volkan_ton', '0x12...f4a', 'can_vip', '0x55...d89'
    ]

    this.whaleActions = [
      { type: 'withdraw', text: (name, amt) => `💸 ${name} az önce ${amt.toLocaleString()} USDT soğuk cüzdanına çekti!` },
      { type: 'jackpot', text: (name, amt) => `🎰 ${name} JACKPOT KASASINI PATLATTI! (+${amt.toLocaleString()} Çip)` },
      { type: 'big_mult', text: (name, mult, amt) => `💥 ${name} tek spinde ${mult}x çarpan vurdu! (+${amt.toLocaleString()} Çip)` },
      { type: 'vip_up', text: (name, tier) => `👑 ${name} ${tier} rütbesine yükseldi ve %22 Rakeback kilidini açtı!` },
    ]

    this.subscribers = new Set()
    this.activeNotification = null
    this.timer = null
  }

  subscribe(callback) {
    this.subscribers.add(callback)
    if (this.activeNotification) {
      callback(this.activeNotification)
    }
    return () => this.subscribers.delete(callback)
  }

  notify(notif) {
    this.activeNotification = notif
    this.subscribers.forEach(cb => cb(notif))
    setTimeout(() => {
      if (this.activeNotification?.id === notif.id) {
        this.activeNotification = null
        this.subscribers.forEach(cb => cb(null))
      }
    }, 5500)
  }

  /**
   * Rastgele aralıklarla dinamik balina uyarısı patlatır
   */
  startWhaleTicker(minSec = 12, maxSec = 28) {
    const nextInterval = () => (minSec + Math.random() * (maxSec - minSec)) * 1000

    const loop = () => {
      this.timer = setTimeout(() => {
        const notif = this.generateWhaleEvent()
        this.notify(notif)
        loop()
      }, nextInterval())
    }

    loop()
  }

  stopWhaleTicker() {
    if (this.timer) clearTimeout(this.timer)
  }

  generateWhaleEvent() {
    const name = this.whaleNames[Math.floor(Math.random() * this.whaleNames.length)]
    const actionType = Math.random()

    let text = ''
    let badge = '🔥 CANLI ÇEKİM'

    if (actionType < 0.4) {
      const amt = 1200 + Math.floor(Math.random() * 14500)
      text = `💸 ${name} az önce ${amt.toLocaleString()} USDT çekim yaptı!`
      badge = '⚡ ANINDA ÇEKİM'
    } else if (actionType < 0.7) {
      const mult = Math.random() < 0.5 ? 'x11.64' : 'x5.82'
      const amt = 3500 + Math.floor(Math.random() * 18000)
      text = `💥 ${name} ${mult} ile kasayı boşalttı! (+${amt.toLocaleString()} Çip)`
      badge = '💎 BÜYÜK VURGUN'
    } else {
      const amt = 8000 + Math.floor(Math.random() * 25000)
      text = `🎰 ${name} JACKPOT HAVUZUNDAN ${amt.toLocaleString()} ÇİP KOPARDI!`
      badge = '👑 JACKPOT'
    }

    return {
      id: Date.now() + Math.random(),
      badge,
      text,
      ts: Date.now(),
    }
  }
}

export const fomoEngine = new FOMOEngine()
// Otomatik başlat
fomoEngine.startWhaleTicker(14, 30)
