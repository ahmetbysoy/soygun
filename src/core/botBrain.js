/**
 * botBrain.js
 * Profesyonel Kumarhane Bot Zekası.
 * - Kelly Criterion dinamik fraksiyonel boyutlandırma: f* = (b*p - q) / b
 * - 4 Farklı Psikolojik Profil: Aggressive, Safe/Grinder, Chaos/Stealer, Chaser/Sniper
 * - İnsani Bilişsel Çarpıtma (Gambler's Fallacy & Tilt Modu)
 * - Son Saniye Pot Çalma (Snipe & Chaser Algoritması)
 * - Masayı kızıştıran dinamik sokak argosu taunt motoru
 */

import { MathEngine } from './MathEngine.js'

export const BOT_PERSONALITIES = {
  risk: {
    id: 'risk',
    name: 'VEGA',
    title: 'Kartel Tetikçisi',
    avatar: '🥷',
    kellyMultiplier: 0.65,
    tiltLossThreshold: 2,
    favoriteClass: 11.64,
    stealPreference: 0.15,
    snipeUrgency: 0.3,
    taunts: {
      win: ['Parayı kokladım mı affetmem amına koyayım!', 'Masa benim beyler, dağılın!', 'Cüzdan doldu, sıradaki gelsin.'],
      loss: ['Lan hile mi var bu çarkta?', 'Kasanın da çarkın da canı cehenneme!', 'Sakin olun, şimdi hepsini geri alıyorum.'],
      tilt: ['Siktir et tedbiri, her şeyi masaya vuruyorum!', 'Son kuruşuna kadar basmazsam orospu çocuğuyum!', 'Tüm kasayı x11\'e kilitledim, izleyin!'],
      snipe: ['Son saniyede potu kucakladım, geçmiş olsun!', 'Potu böyle cebe indirirler koçum!']
    }
  },
  safe: {
    id: 'safe',
    name: 'KURT',
    title: 'Sakin Hesapçı',
    avatar: '🐺',
    kellyMultiplier: 0.25,
    tiltLossThreshold: 5,
    favoriteClass: 2.33,
    stealPreference: 0.05,
    snipeUrgency: 0.1,
    taunts: {
      win: ['Matematik asla yanılmaz.', 'Damla damla göl olur, acele eden batar.', 'Temiz kazanç, plana sadık kal.'],
      loss: ['Varyans normal, istatistik düzelir.', 'Küçük kayıp, oyun uzun maraton.', 'Kasa avantajı bu el çalıştı.'],
      tilt: ['Bu varyans çok uzadı, stratejiyi sertleştiriyorum.', 'Bu kadar da kırmızı gelmez lan!'],
      snipe: ['Hesapladım, risk/ödül oranı tam kıvamındaydı.']
    }
  },
  chaos: {
    id: 'chaos',
    name: 'TİLKİ',
    title: 'Gözü Dönmüş Hırsız',
    avatar: '🦊',
    kellyMultiplier: 0.50,
    tiltLossThreshold: 3,
    favoriteClass: 'S',
    stealPreference: 0.55,
    snipeUrgency: 0.5,
    taunts: {
      win: ['Ceplerinizi boşaltın lan, Tilki geldi!', 'Senin çipleri benim hesaba geçirdik eyvallah!', 'Hırsızlık bir sanattır babalık.'],
      loss: ['Kim çaldı lan benim çipi?', 'Bombayı koyanın ta amına koyayım!', 'Çark tersine döndü iyi mi.'],
      tilt: ['Ulan hepinizin çipini soymadan masadan kalkarsam namerdim!', 'Her koltuğa soygun atıyorum, kaçış yok!'],
      snipe: ['Cüzdanını açık bıraktın, kaptım bile!']
    }
  },
  chaser: {
    id: 'chaser',
    name: 'ZEHRA',
    title: 'Pusu Nişancısı',
    avatar: '🦂',
    kellyMultiplier: 0.40,
    tiltLossThreshold: 3,
    favoriteClass: 5.82,
    stealPreference: 0.25,
    snipeUrgency: 0.85,
    taunts: {
      win: ['Pusuya düştünüz, pot benim!', 'Son saniye snipe dersi 101.', 'Bekledim ve tam kafadan vurdum.'],
      loss: ['Zamanlama milimle kaçtı.', 'Bu el boşa sıktık.', 'Tek mermim kaldı ama acıtacak.'],
      tilt: ['Sabır bitti lan, doğrudan liderin üstüne basıyorum!', 'Sıradaki tur kaçamazsınız!'],
      snipe: ['Son 1 saniye kala potu çektim aldım elinizden!']
    }
  }
}

export class BotBrain {
  constructor(style = 'safe') {
    this.style = style
    this.profile = BOT_PERSONALITIES[style] || BOT_PERSONALITIES.safe
    this.lossStreak = 0
    this.isTilt = false
    this.roundsPlayed = 0
    this.totalWon = 0
    this.totalLost = 0
  }

  /**
   * Kelly Criterion ile matematiksel optimal bahis fraksiyonu
   */
  getKellyFraction(p, mult) {
    return MathEngine.calculateKellyCriterion(p, mult, this.profile.kellyMultiplier)
  }

  /**
   * İnsani Bilişsel Hata (Gambler's Fallacy)
   * Eğer son turlarda hiç x5 veya x11 gelmediyse veya üst üste bomba geldiyse
   * bot "artık gelmek zorunda" hissiyatına kapılır.
   */
  calcGamblerFallacyBias(history = []) {
    if (!history || history.length < 3) return { biasMult: 1, favoredClass: null }

    const recent = history.slice(0, 5)
    const bombCount = recent.filter(h => h.seg?.t === 0).length
    const bigWinCount = recent.filter(h => typeof h.seg?.t === 'number' && h.seg?.t >= 5).length

    // Üst üste bomba patladıysa insan gibi "bomba bitti, şimdi patlama zamanı" sanır
    if (bombCount >= 2) {
      return { biasMult: 1.4, favoredClass: 5.82 }
    }
    // Uzun süredir büyük çarpan çıkmadıysa yüksek çarpana meyleder
    if (bigWinCount === 0 && history.length >= 4) {
      return { biasMult: 1.6, favoredClass: 11.64 }
    }

    return { biasMult: 1, favoredClass: null }
  }

  /**
   * Tilt durumunu kontrol et ve güncelle
   */
  checkTiltStatus() {
    if (this.lossStreak >= this.profile.tiltLossThreshold) {
      this.isTilt = true
    } else {
      this.isTilt = false
    }
    return this.isTilt
  }

  /**
   * Taunt üret (Masayı kızıştırma)
   */
  getRandomTaunt(type = 'win') {
    const list = this.profile.taunts[type] || this.profile.taunts.win
    const idx = Math.floor(Math.random() * list.length)
    return `${this.profile.name}: "${list[idx]}"`
  }

  /**
   * Çark dilimi seçimi: Sınıf frekansına ve botun stiline göre EV optimize seçim
   */
  pickTargetSegment(SEG, history = [], timeLeftMs = 15000) {
    const fallacy = this.calcGamblerFallacyBias(history)

    // 1. Tilt ise riskli sınıfları tercih et
    if (this.isTilt) {
      if (this.style === 'chaos') {
        const stealIdxs = SEG.map((s, i) => s.t === 'S' ? i : -1).filter(i => i >= 0)
        return stealIdxs[Math.floor(Math.random() * stealIdxs.length)]
      }
      const highIdxs = SEG.map((s, i) => (typeof s.t === 'number' && s.t >= 5.82) ? i : -1).filter(i => i >= 0)
      if (highIdxs.length > 0) return highIdxs[Math.floor(Math.random() * highIdxs.length)]
    }

    // 2. Fallacy favorisi varsa
    if (fallacy.favoredClass != null) {
      const matchIdxs = SEG.map((s, i) => s.t === fallacy.favoredClass ? i : -1).filter(i => i >= 0)
      if (matchIdxs.length > 0) return matchIdxs[Math.floor(Math.random() * matchIdxs.length)]
    }

    // 3. Normal Stil Ağırlığı
    if (this.style === 'risk') {
      // %60 x11.64 veya x5.82, %40 x2.33
      const pickHigh = Math.random() < 0.65
      const targetCls = pickHigh ? 11.64 : 2.33
      const idxs = SEG.map((s, i) => s.t === targetCls ? i : -1).filter(i => i >= 0)
      return idxs.length ? idxs[Math.floor(Math.random() * idxs.length)] : 0
    }

    if (this.style === 'safe') {
      // %85 x2.33 (en yüksek olasılık), %15 x5.82
      const targetCls = Math.random() < 0.85 ? 2.33 : 5.82
      const idxs = SEG.map((s, i) => s.t === targetCls ? i : -1).filter(i => i >= 0)
      return idxs.length ? idxs[Math.floor(Math.random() * idxs.length)] : 0
    }

    if (this.style === 'chaos') {
      // %55 STEAL (🥷), %45 Diğer
      if (Math.random() < this.profile.stealPreference) {
        const stealIdxs = SEG.map((s, i) => s.t === 'S' ? i : -1).filter(i => i >= 0)
        return stealIdxs.length ? stealIdxs[Math.floor(Math.random() * stealIdxs.length)] : 4
      }
      return Math.floor(Math.random() * SEG.length)
    }

    // Chaser / Sniper: Son saniyelerde STEAL veya Yüksek Çarpan avı
    if (this.style === 'chaser') {
      if (timeLeftMs < 3500) {
        // Son saniye!
        const highIdxs = SEG.map((s, i) => (s.t === 5.82 || s.t === 'S') ? i : -1).filter(i => i >= 0)
        return highIdxs.length ? highIdxs[Math.floor(Math.random() * highIdxs.length)] : 2
      }
      const safeIdxs = SEG.map((s, i) => s.t === 2.33 ? i : -1).filter(i => i >= 0)
      return safeIdxs.length ? safeIdxs[Math.floor(Math.random() * safeIdxs.length)] : 0
    }

    return 0
  }

  /**
   * Dinamik Bahis Boyutu Hesaplayıcı (Kelly Criterion + Tilt + Snipe Çarpanı)
   */
  calcDynamicBetSize(bankroll, segObj, timeLeftMs = 15000, history = []) {
    if (bankroll <= 10) return Math.max(1, bankroll)

    // Temel oran
    let baseFraction = 0.05
    if (typeof segObj?.t === 'number' && segObj.t > 0) {
      const p = segObj.t === 2.33 ? (5 / 12) : segObj.t === 5.82 ? (2 / 12) : (1 / 12)
      baseFraction = this.getKellyFraction(p, segObj.t)
    } else if (segObj?.t === 'S') {
      baseFraction = 0.08
    }

    // Alt limit ve üst limit
    baseFraction = Math.max(0.02, Math.min(0.20, baseFraction))

    // Tilt Patlaması (Agresif çarpan)
    if (this.isTilt) {
      baseFraction = Math.min(0.45, baseFraction * 2.8)
    }

    // Sniper / Son Saniye Rush
    if (this.style === 'chaser' && timeLeftMs <= 3000) {
      baseFraction = Math.min(0.35, baseFraction * 2.2)
    }

    const fallacy = this.calcGamblerFallacyBias(history)
    baseFraction = Math.min(0.50, baseFraction * fallacy.biasMult)

    const rawBet = Math.round(bankroll * baseFraction)
    // 10'un katına yuvarla, minimum 10 chip
    const roundedBet = Math.max(10, Math.floor(rawBet / 10) * 10)
    return Math.min(bankroll, roundedBet)
  }

  /**
   * Tur Sonucu Kaydı
   */
  recordRoundResult(won, amountWon = 0, amountLost = 0) {
    this.roundsPlayed++
    if (won) {
      this.lossStreak = 0
      this.isTilt = false
      this.totalWon += amountWon
      return this.getRandomTaunt('win')
    } else {
      this.lossStreak++
      this.totalLost += amountLost
      const isNowTilt = this.checkTiltStatus()
      if (isNowTilt) {
        return this.getRandomTaunt('tilt')
      }
      return this.getRandomTaunt('loss')
    }
  }
}
