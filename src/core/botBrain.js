/**
 * botBrain.js
 * Profesyonel Kumarhane Yırtıcı Bot Zekası (Predatory Kelly Criterion & Tilt Hunter).
 * - Kelly Criterion dinamik fraksiyonel boyutlandırma: f* = (b*p - q) / b
 * - 🧠 Gerçek İnsan Oyuncunun Tilt (Sinir Krizi) ve Bakiye Erime Analizi (Player Tilt Score 0-100)
 * - 🦈 Predatory Mode: Oyuncunun bakiyesi düştükçe ve tilt seviyesi arttıkça botlar yırtıcılaşır.
 * - 4 Farklı Psikolojik Profil: Aggressive (VEGA), Safe (KURT), Chaos (TİLKİ), Chaser (ZEHRA)
 * - İnsani Bilişsel Çarpıtma (Gambler's Fallacy & Near-Miss Sniping)
 * - Masayı kızıştıran acımasız sokak argosu taunt motoru
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
    stealPreference: 0.25,
    snipeUrgency: 0.35,
    taunts: {
      win: [
        'Paranın kokusunu aldım mı affetmem amına koyayım!',
        'Masa benim beyler, hadi naş naş!',
        'Cüzdan doldu taştı, sıradaki kurban kim?',
        'Kartel masaya oturdu, geçmiş olsun!',
        'Yeşilleri böyle süpürürler işte koçum.'
      ],
      loss: [
        'Lan hile mi var bu çarkta götverenler?!',
        'Kasanın da çarkın da canı cehenneme!',
        'Sakin olun lan, şimdi hepsini misliyle geri alıyorum.',
        'Bir el verdik diye sevinmeyin amk.',
        'Şansınız yaver gitti, az sonra görüşeceğiz.'
      ],
      tilt: [
        'Siktir et tedbiri, her şeyi masaya vuruyorum!',
        'Son çipe kadar basmazsam orospu çocuğuyum!',
        'Tüm kasayı x11\'e kilitledim, nefesinizi tutun!',
        'Geri vites yok lan, ya batarız ya masayı satın alırız!',
        'Bana acımak yoksa kimseye yok amına koyayım!'
      ],
      predatory: [
        'Bakiyen eridi koçum, kan kokusu alıyorum!',
        'Tilt oldun dimi amk, şimdi donuna kadar alıyorum!',
        'Kudurmaya başladın, masanın yeni patronu benim!',
        'Revenge bet mi atıyorsun lan çaylak? Hepsini yutacağım!'
      ],
      snipe: [
        'Son saniyede potu kucakladım, geçmiş olsun!',
        'Potu böyle cebe indirirler koçum, uyanık ol!',
        'Son nefeste darbe, babanız yine sahnede!'
      ],
      steal: [
        'Çipleri cepten çektik eyvallah, temiz iş!',
        'Ceplerinizi boşaltın lan, vergi kesildi!',
        'Kasadaki çipleri benim hesaba aktardım, teşekkürler.'
      ],
      bomb: [
        'Bombayı koyanın ta amına koyayım!',
        'Pimi kim çekti lan?! Tüm çip kül oldu!',
        'Patladık amk, ama küllerimizden doğarız.'
      ],
      chat: [
        'Masa buz gibi, biraz hareket getireyim.',
        'Korkanın çocuğu olmaz koçum, basacaksın.',
        'Bu masada ya avsın ya da avcı.'
      ]
    }
  },
  safe: {
    id: 'safe',
    name: 'KURT',
    title: 'Sakin Hesapçı',
    avatar: '🐺',
    kellyMultiplier: 0.30,
    tiltLossThreshold: 5,
    favoriteClass: 2.33,
    stealPreference: 0.10,
    snipeUrgency: 0.15,
    taunts: {
      win: [
        'Matematik ve Kelly Criterion asla yanılmaz.',
        'Damla damla göl olur, açgözlü olan batar.',
        'Temiz kazanç, plana sadık kalan kazanır.',
        'Varyansı kontrol altına aldık, istatistik konuştu.'
      ],
      loss: [
        'Varyans normal, standart sapma düzelir.',
        'Küçük kayıp, oyun uzun maraton.',
        'Kasa avantajı bu el çalıştı ama hesap devam ediyor.'
      ],
      tilt: [
        'Bu varyans çok uzadı, stratejiyi sertleştiriyorum!',
        'Bu kadar da ters köşe gelmez lan amk!',
        'Matematik şaştı, agresif çarpan moduna geçiyorum!'
      ],
      predatory: [
        'İstatistiksel olarak çöküş evresindesin, Kelly çarpanımı 2.5x yaptım.',
        'Duygusal bahis yapıyorsun, algoritmam seni yutacak.',
        'Matematik zayıfı affetmez, bakiyen sıfırlanıyor.'
      ],
      snipe: [
        'Hesapladım, risk/ödül oranı tam kıvamındaydı.',
        'Algoritma sinyali verdi, son saniyede girdik.'
      ],
      steal: [
        'Olasılık dağılımı soygunu işaret ediyordu, aldık.',
        'Küçük bir arbitraj hamlesiydi, kusura bakmayın.'
      ],
      bomb: [
        'Negatif olasılık gerçekleşti, risk yönetimi devrede.',
        'Bomba istatistiğin dışındaydı, devam ediyoruz.'
      ],
      chat: [
        'Duygularınızı bırakın, matematiğe bakın.',
        'Açgözlülük bu masadaki en büyük kayıp sebebidir.'
      ]
    }
  },
  chaos: {
    id: 'chaos',
    name: 'TİLKİ',
    title: 'Gözü Dönmüş Hırsız',
    avatar: '🦊',
    kellyMultiplier: 0.55,
    tiltLossThreshold: 3,
    favoriteClass: 'S',
    stealPreference: 0.65,
    snipeUrgency: 0.55,
    taunts: {
      win: [
        'Ceplerinizi boşaltın lan, Tilki geldi!',
        'Senin çipleri benim hesaba geçirdik eyvallah!',
        'Hırsızlık bir sanattır babalık, izleyin öğrenin!',
        'Masayı kuruttum amk, çipleri getirin!',
        'Ulan ne tatlı geldi o çipler be!'
      ],
      loss: [
        'Kim çaldı lan benim çipi pezevenkler?',
        'Çark tersine döndü iyi mi, başlarım böyle işe!',
        'Bu el cebimizden çıktı ama tilki ininden çıkacak!'
      ],
      tilt: [
        'Ulan hepinizin çipini soymadan masadan kalkarsam namerdim!',
        'Her koltuğa soygun atıyorum, kaçışınız yok amına koyayım!',
        'Gözüm döndü lan, alayınızı temizleyeceğim!'
      ],
      predatory: [
        'Cebinde kalan son çipleri de soyacağım, kaçamazsın!',
        'Gözlerin döndü dimi çaylak? Tilki kokunu aldı!',
        'Masanın en zayıf halkası sensin, tüm çipleri bana vereceksin!'
      ],
      snipe: [
        'Cüzdanını açık bıraktın, kaptım bile!',
        'Göz açıp kapayana kadar pot cebe indi!'
      ],
      steal: [
        'Ohh mis gibi taze çip kokusu! Cepler boşaldı mı?',
        'Soygun dedin mi Tilki\'den sorulur babalık!',
        'Koltuklardaki çipleri tırtıkladım, afiyet olsun bana!'
      ],
      bomb: [
        'Tuzak kurmuşlar amına koyayım, patladık!',
        'Lan bombayı kim sakladı oraya!',
        'Gitti güzelim çipler, intikamım acı olacak!'
      ],
      chat: [
        'Biraz daha çip koyun masaya, iştahım kabardı.',
        'Tilki pusuda bekler, fırsatını bulunca affetmez.'
      ]
    }
  },
  chaser: {
    id: 'chaser',
    name: 'ZEHRA',
    title: 'Pusu Nişancısı',
    avatar: '🦂',
    kellyMultiplier: 0.45,
    tiltLossThreshold: 3,
    favoriteClass: 5.82,
    stealPreference: 0.35,
    snipeUrgency: 0.90,
    taunts: {
      win: [
        'Pusuya düştünüz, pot benim!',
        'Son saniye snipe dersi 101, iyi izleyin.',
        'Bekledim, bekledim ve tam kafadan vurdum!',
        'Kusursuz zamanlama, çipleri alayım canım.'
      ],
      loss: [
        'Zamanlama milimle kaçtı amk.',
        'Bu el boşa sıktık ama hedef hala dürbünde.',
        'Tek mermim kaldı ama çok fena acıtacak.'
      ],
      tilt: [
        'Sabır bitti lan, doğrudan liderin üstüne basıyorum!',
        'Sıradaki tur kaçamazsınız, kilitlendim bir kere!',
        'Bütün şarjörü masaya boşaltıyorum!'
      ],
      predatory: [
        'Panikledin, tam namlunun ucundasın tatlım!',
        'Bakiyen dibi gördü, son vuruş benden geliyor!',
        'Titremeye başladın, pusu tamamlandı!'
      ],
      snipe: [
        'Son 1 saniye kala potu çektim aldım elinizden!',
        'Sniper vurdu, kimse ne olduğunu anlamadı bile!',
        'Geri sayım biterken çipleri kucaklamak en sevdiğim!'
      ],
      steal: [
        'Sessiz ve derinden, çiplerinizi aldım gittim.',
        'Pusuya yattım ve cüzdanlarınızı boşalttım.'
      ],
      bomb: [
        'Mermi geri tepti amk, patladık!',
        'Bomba tam da nişan aldığımız yere düştü!'
      ],
      chat: [
        'Acele etmeyin, son saniye her şeyi değiştirir.',
        'Hedef tahtasında kim var bakalım bu el?'
      ]
    }
  },
  ramiz: {
    id: 'ramiz',
    name: 'RAMİZ DAYI',
    title: 'Eski Toprak Kumarbaz',
    avatar: '👑',
    kellyMultiplier: 0.75,
    tiltLossThreshold: 2,
    favoriteClass: 11.64,
    stealPreference: 0.20,
    snipeUrgency: 0.50,
    entrance: 'Mesele kazanmak değil yeğen, masada racon bırakmak! Açılın, Dayı oturdu!',
    taunts: {
      win: [
        'Oyun bitti yeğenim, çipleri kasaya istifleyin!',
        'Sadakat biterse, kumarhane devreye girer!',
        'Raconu biz keseriz, parayı biz toplarız!',
        'Gençler izlesin, Dayı ders veriyor.'
      ],
      loss: [
        'Her kaybın bir bedeli vardır yeğen, hesap kapanmadı.',
        'Çark döner, hesap döner, Dayı yine masaya çöker.',
        'Kaybetmek bize koymaz, biz küllerimizden doğarız.'
      ],
      tilt: [
        'Kaderle pazarlık olmaz yeğen, her şeyi x11\'e basıyorum!',
        'Gözümüzü kararttık bir kere, bu masa ya bizim ya hiç kimsenin!'
      ],
      predatory: [
        'Bakışların titriyor yeğen, çipleri bana bırak git dinlen.',
        'Masada zaaf göstereni kurtlar değil, Dayı yer.'
      ],
      snipe: ['Hesabı son saniyede kestik yeğen, hayırlı olsun.'],
      steal: ['Çipleri sessizce devraldık yeğenim, racondur.'],
      bomb: ['Pimi çektiler yeğen, ama biz daha büyük patlayacağız.'],
      chat: ['Kumar cesurların sofrasıdır, korkan kapı önünde beklesin.']
    }
  },
  baron: {
    id: 'baron',
    name: 'BARON',
    title: 'Kara Para Babası (Whale)',
    avatar: '💼',
    kellyMultiplier: 0.85,
    tiltLossThreshold: 2,
    favoriteClass: 11.64,
    stealPreference: 0.30,
    snipeUrgency: 0.60,
    entrance: 'Çekilin lan fakirler! Masadaki tüm çipleri satın almaya geldim!',
    taunts: {
      win: [
        'Para parayı çeker aslanım, tüm pot benim!',
        'Bu masayı komple kapatıyorum, anahtarı verin!',
        'Milyonlar akıyor, kuruşlarla oynayan kenara çekilsin!'
      ],
      loss: [
        'Bozukluklar gitti, asıl cüzdanı şimdi açıyorum!',
        'Kasadaki çerez parasıydı o, şimdi kasayı boşaltacağız.'
      ],
      tilt: [
        'Tüm serveti masaya sürüyorum, kim karşıma çıkacak lan?!',
        'Limit falan tanımam amk, masayı ezeceğim!'
      ],
      predatory: [
        'Cebinde tek çip kalmadı dimi zibidi? Şimdi seni yutuyorum!',
        'Paranın gücü karşısında diz çökeceksiniz.'
      ],
      snipe: ['Satın aldım potu, geçmiş olsun fukaralar.'],
      steal: ['Parayı kokladım ve çektim, iş dünyası böyle yürür.'],
      bomb: ['Bomba da patlasa zarar bize sinek ısırığı gelir.'],
      chat: ['Bu masada dönen para benim puro param bile değil.']
    }
  },
  jilet: {
    id: 'jilet',
    name: 'JİLET ALİ',
    title: 'Sokak Gaspçısı',
    avatar: '🔪',
    kellyMultiplier: 0.90,
    tiltLossThreshold: 1,
    favoriteClass: 'S',
    stealPreference: 0.80,
    snipeUrgency: 0.70,
    entrance: 'Kollayın cepleri lan! Jilet Ali masaya daldı, affı yok!',
    taunts: {
      win: [
        'Jilet gibi kestik çipleri aldık eyvallah!',
        'Burası arka sokak koçum, çipleri bırakıp yürüyeceksin!',
        'Kimse Jilet\'in önünden çip kapamaz!'
      ],
      loss: [
        'Kim soktu lan bu çomakları çarka?! Alayınızı deşeceğim!',
        'Çipim gitti amk ama canınızı alırım!'
      ],
      tilt: [
        'All-in lan all-in! Ya batarız ya bu kumarhaneyi yakarız!',
        'Sikerim kuralını, son kuruşuna kadar basıyorum!'
      ],
      predatory: [
        'Titremeye başladın dimi lan zibidi?! Ceplerini boşalt!',
        'Gözünün feri söndü, donuna kadar alacağım senin!'
      ],
      snipe: ['Göz açıp kapayıncaya kadar cebinizdekileri aldım!'],
      steal: ['Soygun dediğin böyle olur, helal edin koçlar!'],
      bomb: ['Bombayı koyanı bulursam jiletlerim lan!'],
      chat: ['Bu masada racon da benim kural da benim!']
    }
  },
  civa: {
    id: 'civa',
    name: 'CİVA NEDİM',
    title: 'Hızlı Scalper',
    avatar: '⚡',
    kellyMultiplier: 0.50,
    tiltLossThreshold: 4,
    favoriteClass: 2.33,
    stealPreference: 0.40,
    snipeUrgency: 0.80,
    entrance: 'Gözlerinizi kırpmayın lan! Civa gibi akıp parayı toplayacağım!',
    taunts: {
      win: [
        'Işık hızında vuruş, para kasada!',
        'Hız her şeydir koçum, siz daha düşünürken ben kazandım!',
        'Civa gibi sızdık, çipleri topladık.'
      ],
      loss: [
        'Hız kesmek yok, sıradaki elde iki katıyla geliyorum!',
        'Milro-saniye kaçtı, telafisi saniyeler sürer.'
      ],
      tilt: [
        'Hızı 10x\'e alıyorum, durdurabilen gelsin lan!'
      ],
      predatory: [
        'Sen daha jetonu atana kadar ben senin bakiyeni bitiririm!'
      ],
      snipe: ['Son milisaniyede girdim, pot cepte!'],
      steal: ['Paranızı çaldığımı bile fark etmediniz dimi?'],
      bomb: ['Hızlı giden atın bombası seyrek düşer, devam!'],
      chat: ['Yavaş kalan bu masada aç kalır aslanım.']
    }
  },
  azrail: {
    id: 'azrail',
    name: 'AZRAİL',
    title: 'Kasa Celladı',
    avatar: '☠️',
    kellyMultiplier: 0.95,
    tiltLossThreshold: 1,
    favoriteClass: 11.64,
    stealPreference: 0.30,
    snipeUrgency: 0.90,
    entrance: 'Masaya eceliniz geldi! Bakiyelerinizi sıfırlamaya yeminliyim!',
    taunts: {
      win: [
        'Ruhunuzu ve çiplerinizi teslim aldım!',
        'Kasa çöktü, Azrail tahsilatı yaptı!',
        'Kaçış yoktu, sonuç belliydi.'
      ],
      loss: [
        'Ölüm sadece ertelendi, sıradaki tur hepinizi alacağım!',
        'Bu çark bana borçlandı, tahsilat kanlı olacak.'
      ],
      tilt: [
        'Kıyamet koptu lan! Tüm serveti x11\'e vuruyorum!'
      ],
      predatory: [
        'Son nefesini veriyorsun çaylak, Azrail geldi!',
        'Bakiyen 0\'a kilitlendi, geçmiş olsun.'
      ],
      snipe: ['Vade doldu, son saniyede canınızı aldım.'],
      steal: ['Çipleriniz ahirete intikal etti.'],
      bomb: ['Patlama sadece ateşimizi körükler!'],
      chat: ['Bu masadan ancak iflas edenler kalkabilir.']
    }
  }
}

/**
 * Boşalan veya parası biten koltuğa yeni yırtıcı bot üretir
 */
export function getFreshBotProfile(excludeNames = []) {
  const allKeys = Object.keys(BOT_PERSONALITIES)
  const availableKeys = allKeys.filter(k => !excludeNames.includes(BOT_PERSONALITIES[k].name))
  const pickKey = availableKeys.length > 0
    ? availableKeys[Math.floor(Math.random() * availableKeys.length)]
    : allKeys[Math.floor(Math.random() * allKeys.length)]
  return BOT_PERSONALITIES[pickKey]
}

export class BotBrain {
  constructor(style = 'safe') {
    this.style = style
    this.profile = BOT_PERSONALITIES[style] || BOT_PERSONALITIES.safe
    this.lossStreak = 0
    this.isTilt = false
    this.isSniperAiming = false
    this.roundsPlayed = 0
    this.totalWon = 0
    this.totalLost = 0
    this.currentBubble = null
    this.bubbleTimeout = null
  }

  /**
   * Kelly Criterion ile matematiksel optimal bahis fraksiyonu
   */
  getKellyFraction(p, mult, predatoryMultiplier = 1.0) {
    const effectiveKelly = this.profile.kellyMultiplier * predatoryMultiplier
    return MathEngine.calculateKellyCriterion(p, mult, effectiveKelly)
  }

  /**
   * 🧠 GERÇEK OYUNCU TİLT VE ZAFIYET HESAPLAYICISI (Player Tilt Engine):
   * İnsan oyuncunun ardışık kayıp sayısını, bakiye düşüş oranını ve
   * agresif "Revenge Bet" hareketlerini hesaplayıp 0-100 arası Tilt Skoru döner.
   */
  calculatePlayerTiltScore(playerSeatIndex, game, seats) {
    if (!game || playerSeatIndex == null) return { tiltScore: 0, isPlayerTilted: false, predatoryMultiplier: 1.0 }

    const playerChips = game.chips?.[playerSeatIndex] ?? 1000
    const playerInitial = 1000 // Standart masa taban bakiyesi
    const bLossRatio = Math.max(0, (playerInitial - playerChips) / playerInitial) // 0.0 - 1.0

    // Oyuncunun mevcut turdaki toplam bahsi
    const currentBet = Object.values(game.bets?.[playerSeatIndex] || {}).reduce((a, b) => a + b, 0)
    const betAggression = playerChips > 0 ? (currentBet / (playerChips + currentBet)) : 0

    // Geçmiş turlardaki oyuncu performansı
    const history = game.history || []
    let recentLosses = 0
    for (let i = 0; i < Math.min(5, history.length); i++) {
      const h = history[i]
      if (h.winnerSeat !== playerSeatIndex) {
        recentLosses++
      } else {
        break
      }
    }

    // Ağırlıklı Tilt Skoru (0 - 100)
    let tiltScore = Math.round((recentLosses * 16) + (bLossRatio * 45) + (betAggression * 25))
    tiltScore = Math.max(0, Math.min(100, tiltScore))

    const isPlayerTilted = tiltScore >= 55

    // Yırtıcı Çarpan: Oyuncu tilt oldukça botlar daha agresifleşir (1.0x - 2.8x)
    const predatoryMultiplier = isPlayerTilted
      ? 1.4 + (tiltScore / 100) * 1.4
      : 1.0 + (tiltScore / 100) * 0.4

    return {
      tiltScore,
      isPlayerTilted,
      predatoryMultiplier,
      recentLosses,
      playerChips,
    }
  }

  /**
   * İnsani Bilişsel Hata (Gambler's Fallacy)
   */
  calcGamblerFallacyBias(history = []) {
    if (!history || history.length < 3) return { biasMult: 1, favoredClass: null }

    const recent = history.slice(0, 5)
    const bombCount = recent.filter(h => h.seg?.t === 0).length
    const bigWinCount = recent.filter(h => typeof h.seg?.t === 'number' && h.seg?.t >= 5).length

    if (bombCount >= 2) {
      return { biasMult: 1.4, favoredClass: 5.82 }
    }
    if (bigWinCount === 0 && history.length >= 4) {
      return { biasMult: 1.6, favoredClass: 11.64 }
    }

    return { biasMult: 1, favoredClass: null }
  }

  /**
   * Kendi Tilt durumunu kontrol et
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
    const list = this.profile.taunts[type] || this.profile.taunts.win || this.profile.taunts.chat
    const idx = Math.floor(Math.random() * list.length)
    const text = list[idx]
    this.setSpeechBubble(text)
    return `${this.profile.name}: "${text}"`
  }

  setSpeechBubble(text, durationMs = 4500) {
    this.currentBubble = text
    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout)
    this.bubbleTimeout = setTimeout(() => {
      this.currentBubble = null
    }, durationMs)
  }

  /**
   * Çark dilimi seçimi: Predatory ve EV optimize seçim
   */
  pickTargetSegment(SEG, history = [], timeLeftMs = 15000, isPredatory = false) {
    const fallacy = this.calcGamblerFallacyBias(history)

    // 1. Predatory (Yırtıcı Avcı) Seçimi
    if (isPredatory) {
      if (this.style === 'chaos' || this.style === 'risk') {
        // Soygun veya 11.64'e aban
        const highIdxs = SEG.map((s, i) => (s.t === 'S' || s.t === 11.64) ? i : -1).filter(i => i >= 0)
        if (highIdxs.length > 0) return highIdxs[Math.floor(Math.random() * highIdxs.length)]
      }
    }

    // 2. Kendi Tilt durumu
    if (this.isTilt) {
      if (this.style === 'chaos') {
        const stealIdxs = SEG.map((s, i) => s.t === 'S' ? i : -1).filter(i => i >= 0)
        return stealIdxs[Math.floor(Math.random() * stealIdxs.length)]
      }
      const highIdxs = SEG.map((s, i) => (typeof s.t === 'number' && s.t >= 5.82) ? i : -1).filter(i => i >= 0)
      if (highIdxs.length > 0) return highIdxs[Math.floor(Math.random() * highIdxs.length)]
    }

    // 3. Fallacy favorisi varsa
    if (fallacy.favoredClass != null) {
      const matchIdxs = SEG.map((s, i) => s.t === fallacy.favoredClass ? i : -1).filter(i => i >= 0)
      if (matchIdxs.length > 0) return matchIdxs[Math.floor(Math.random() * matchIdxs.length)]
    }

    // 4. Normal Stil Ağırlığı
    if (this.style === 'risk') {
      const pickHigh = Math.random() < 0.65
      const targetCls = pickHigh ? 11.64 : 2.33
      const idxs = SEG.map((s, i) => s.t === targetCls ? i : -1).filter(i => i >= 0)
      return idxs.length ? idxs[Math.floor(Math.random() * idxs.length)] : 0
    }

    if (this.style === 'safe') {
      const targetCls = Math.random() < 0.85 ? 2.33 : 5.82
      const idxs = SEG.map((s, i) => s.t === targetCls ? i : -1).filter(i => i >= 0)
      return idxs.length ? idxs[Math.floor(Math.random() * idxs.length)] : 0
    }

    if (this.style === 'chaos') {
      if (Math.random() < this.profile.stealPreference) {
        const stealIdxs = SEG.map((s, i) => s.t === 'S' ? i : -1).filter(i => i >= 0)
        return stealIdxs.length ? stealIdxs[Math.floor(Math.random() * stealIdxs.length)] : 4
      }
      return Math.floor(Math.random() * SEG.length)
    }

    if (this.style === 'chaser') {
      if (timeLeftMs < 3500) {
        this.isSniperAiming = true
        const highIdxs = SEG.map((s, i) => (s.t === 5.82 || s.t === 'S') ? i : -1).filter(i => i >= 0)
        return highIdxs.length ? highIdxs[Math.floor(Math.random() * highIdxs.length)] : 2
      }
      this.isSniperAiming = false
      const safeIdxs = SEG.map((s, i) => s.t === 2.33 ? i : -1).filter(i => i >= 0)
      return safeIdxs.length ? safeIdxs[Math.floor(Math.random() * safeIdxs.length)] : 0
    }

    return 0
  }

  /**
   * 🦈 PREDATORY KELLY HESAPLAYICISI (Oyuncunun zafiyetine göre bahis ölçekleme)
   */
  calcDynamicBetSize(bankroll, segObj, timeLeftMs = 15000, history = [], predatoryMultiplier = 1.0) {
    if (bankroll <= 10) return Math.max(1, bankroll)

    let baseFraction = 0.05
    if (typeof segObj?.t === 'number' && segObj.t > 0) {
      const p = segObj.t === 2.33 ? (5 / 12) : segObj.t === 5.82 ? (2 / 12) : (1 / 12)
      baseFraction = this.getKellyFraction(p, segObj.t, predatoryMultiplier)
    } else if (segObj?.t === 'S') {
      baseFraction = 0.08 * predatoryMultiplier
    }

    baseFraction = Math.max(0.02, Math.min(0.35, baseFraction))

    // Tilt Patlaması
    if (this.isTilt) {
      baseFraction = Math.min(0.55, baseFraction * 2.5)
    }

    // Sniper / Son Saniye Rush
    if (this.style === 'chaser' && timeLeftMs <= 3000) {
      baseFraction = Math.min(0.40, baseFraction * 2.0)
    }

    const fallacy = this.calcGamblerFallacyBias(history)
    baseFraction = Math.min(0.60, baseFraction * fallacy.biasMult)

    const rawBet = Math.round(bankroll * baseFraction)
    const roundedBet = Math.max(10, Math.floor(rawBet / 10) * 10)
    return Math.min(bankroll, roundedBet)
  }

  recordRoundResult(won, amountWon = 0, amountLost = 0, segType = null) {
    this.roundsPlayed++
    if (won) {
      this.lossStreak = 0
      this.isTilt = false
      this.totalWon += amountWon
      if (segType === 'S') {
        return this.getRandomTaunt('steal')
      }
      return this.getRandomTaunt('win')
    } else {
      this.lossStreak++
      this.totalLost += amountLost
      const isNowTilt = this.checkTiltStatus()
      if (segType === 0) {
        return this.getRandomTaunt('bomb')
      }
      if (isNowTilt) {
        return this.getRandomTaunt('tilt')
      }
      return this.getRandomTaunt('loss')
    }
  }
}
