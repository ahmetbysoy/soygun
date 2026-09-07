/**
 * UXManager.js
 * Oyuncuyu masada tutma, Sunk-Cost Fallacy ve Anında Can Suyu (Buy-in Upsell) yöneticisi.
 */

export class UXManager {
  /**
   * Masadan ayrılma isteğinde Sunk-Cost Fallacy hesaplaması
   */
  getSunkCostWarning(chips, pot = 0, streak = 1) {
    const estimatedLoss = Math.max(150, Math.round((chips || 0) * 1.5 + pot + streak * 80))
    const messages = [
      `⚠️ DUR! Masadan ayrılırsan masadaki ${chips || 20} çiplik payın ve yaklaşan x11.64 patlama sıran yanacak!`,
      `🛑 KORKUP KAÇIYOR MUSUN? Masadaki pot ${pot} çipe ulaştı, sıradaki elde kasa devrilecek!`,
      `🔥 VIP SERİN YANACAK! Masadan şimdi çıkarsan ${streak}. Günlük ganimet serisi bonusun kilitlenir!`,
    ]
    const randomMsg = messages[Math.floor(Math.random() * messages.length)]

    return {
      title: '⚠️ MASAYI BIRAKIP GİDİYOR MUSUN?',
      message: randomMsg,
      estimatedLoss,
      stayCta: '🔥 Masada Kal ve Parayı Al',
      leaveCta: 'Vazgeç ve Çık',
    }
  }

  /**
   * Elenme durumunda anında masaya geri dönüş (Resurrection Buy-in) teklifi
   */
  getResurrectionOffer(seatIdx, round) {
    return {
      title: '💀 ELENDİN! AMA OYUN BİTMEDİ!',
      subtitle: 'Koltuktaki yerini kaybetmeden %30 ekstra bonusla masaya can suyu bas!',
      chips: 500,
      bonusChips: 150,
      totalChips: 650,
      priceUsd: 2.99,
      tonEst: 0.75,
      urgencyTimerSec: 20,
    }
  }
}

export const uxManager = new UXManager()
