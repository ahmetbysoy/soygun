/**
 * MultiLangCurrencyEngine.js
 * 1. Çoklu Dil Sözlüğü (TR, EN, RU, AR) - Sokak jargonu & Mafya terminolojisi.
 * 2. Kripto / Çip Dönüştürücü (TON, USDT, NOT, STARS) - Canlı parite çevirici.
 */

const DICTIONARY = {
  tr: {
    title: 'SOYGUN ÇARKI',
    spin: 'ÇARKI ÇEVİR',
    spinning: 'ÇARK DÖNÜYOR...',
    pot: 'MASA POTU',
    rakeback: '%20 RAKEBACK',
    tournament: 'TURNUVA',
    vip_lounge: 'VIP SALON',
    loan_stake: 'TEFECİ & STAKE',
    streak: '7G SERİ',
    revenue: 'HASILAT',
    chips: 'ÇİP',
    jackpot_alert: 'JACKPOT PATLAMASINA SON:',
    currency_switch: 'KUR GÖRÜNÜMÜ',
    loss_warning: 'Masayı terk etme! Sigorta devrede.',
    win_celebration: 'Kasa Boşaltıldı!',
  },
  en: {
    title: 'HEIST ROULETTE',
    spin: 'SPIN WHEEL',
    spinning: 'WHEEL SPINNING...',
    pot: 'TABLE POT',
    rakeback: '20% RAKEBACK',
    tournament: 'TOURNAMENT',
    vip_lounge: 'VIP LOUNGE',
    loan_stake: 'LOAN & STAKE',
    streak: '7D STREAK',
    revenue: 'REVENUE',
    chips: 'CHIPS',
    jackpot_alert: 'JACKPOT DROPS IN:',
    currency_switch: 'CURRENCY',
    loss_warning: 'Do not leave! Loss insurance active.',
    win_celebration: 'Vault Cleared!',
  },
  ru: {
    title: 'КАРТЕЛЬ РУЛЕТКА',
    spin: 'КРУТИТЬ',
    spinning: 'КОЛЕСО ВРАЩАЕТСЯ...',
    pot: 'БАНК СТОЛА',
    rakeback: '20% РЕЙКБЕК',
    tournament: 'ТУРНИР',
    vip_lounge: 'VIP ЗАЛ',
    loan_stake: 'РОСТОВЩИК',
    streak: '7Д СЕРИЯ',
    revenue: 'ДОХОД',
    chips: 'ФИШКИ',
    jackpot_alert: 'ДЖЕКПОТ ЧЕРЕЗ:',
    currency_switch: 'ВАЛЮТА',
    loss_warning: 'Не уходи! Страховка активна.',
    win_celebration: 'Куш Сорван!',
  },
  ar: {
    title: 'عجلة الكارتل',
    spin: 'أدر العجلة',
    spinning: 'العجلة تدور...',
    pot: 'مجموع الرهانات',
    rakeback: '20% عمولة',
    tournament: 'بطولة',
    vip_lounge: 'صالة VIP',
    loan_stake: 'قرض وتخزين',
    streak: 'سلسلة 7 أيام',
    revenue: 'الإيرادات',
    chips: 'رقائق',
    jackpot_alert: 'الجائزة الكبرى بعد:',
    currency_switch: 'العملة',
    loss_warning: 'لا تغادر! التأمين نشط.',
    win_celebration: 'تم الاستيلاء على الخزينة!',
  },
}

class MultiLangCurrencyEngine {
  constructor() {
    this.currentLang = 'tr'
    this.currentCurrency = 'CHIP' // 'CHIP' | 'TON' | 'USDT' | 'STARS'
    this.rates = {
      CHIP: 1,
      TON: 0.00035, // 1000 Çip ~ 0.35 TON
      USDT: 0.00135, // 1000 Çip ~ 1.35 USDT
      STARS: 0.065, // 1000 Çip ~ 65 Telegram Stars
    }
    this.subscribers = new Set()
  }

  setLang(lang) {
    if (DICTIONARY[lang]) {
      this.currentLang = lang
      this.notify()
    }
  }

  setCurrency(curr) {
    if (this.rates[curr]) {
      this.currentCurrency = curr
      this.notify()
    }
  }

  t(key) {
    return DICTIONARY[this.currentLang]?.[key] || DICTIONARY.tr[key] || key
  }

  formatChips(chips) {
    if (this.currentCurrency === 'CHIP') {
      return `${chips.toLocaleString()} 🪙`
    }
    if (this.currentCurrency === 'TON') {
      const val = (chips * this.rates.TON).toFixed(2)
      return `${val} 💎 TON`
    }
    if (this.currentCurrency === 'USDT') {
      const val = (chips * this.rates.USDT).toFixed(2)
      return `$${val} USDT`
    }
    if (this.currentCurrency === 'STARS') {
      const val = Math.round(chips * this.rates.STARS)
      return `⭐ ${val} Stars`
    }
    return `${chips} 🪙`
  }

  subscribe(cb) {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  notify() {
    for (const sub of this.subscribers) {
      sub({
        lang: this.currentLang,
        currency: this.currentCurrency,
        t: (k) => this.t(k),
        formatChips: (c) => this.formatChips(c),
      })
    }
  }
}

export const i18nEngine = new MultiLangCurrencyEngine()
