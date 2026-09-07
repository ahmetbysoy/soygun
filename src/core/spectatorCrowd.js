/**
 * spectatorCrowd.js
 * Masaya canlı izleyici kalabalığı (Spectator Crowd) simülasyonu.
 * - Gerçekçi insan davranışları, laf sokmalar, ergen tripleri, bar ve Temel fıkraları.
 * - Çarkın anlık fazına (bahis, dönüş, büyük kazanç, bomba, soygun) göre bağlamsal konuşmalar.
 * - İzleyicilerin birbirine saldırdığı, laf soktuğu 2 adımlı dinamik diyalog zincirleri (Banter Threads).
 * - Tekrara düşmeyen şablon türetme motoru.
 */

export const SPECTATOR_PERSONAS = [
  { id: 'temel', name: 'Temel_Reis', role: 'Laz Dayı', ava: '🐟', color: '#38bdf8' },
  { id: 'dursun', name: 'Dursun_Hoca', role: 'Fıkracı', ava: '👴', color: '#93c5fd' },
  { id: 'ergen1', name: 'xX_GölgeKral_Xx', role: 'Ergen Degen', ava: '🧢', color: '#f43f5e' },
  { id: 'ergen2', name: 'Berkecan_31', role: 'Klavye Delikanlısı', ava: '🛹', color: '#fb7185' },
  { id: 'barmen', name: 'Barmen_Rıza', role: 'Bar Filozofu', ava: '🍸', color: '#fbbf24' },
  { id: 'crypto', name: 'Satoshi_Çırağı', role: 'Kripto Bağımlısı', ava: '🚀', color: '#34d399' },
  { id: 'dayi', name: 'Kazım_Usta', role: 'Kahvehane Dayısı', ava: '☕', color: '#a78bfa' },
  { id: 'toxic', name: 'Melis_Toxic', role: 'Trip Kraliçesi', ava: '💅', color: '#f472b6' },
  { id: 'semt', name: 'Semt_Çocuğu_Burak', role: 'Mahalle Reisi', ava: '🔥', color: '#fb923c' },
]

// Temel Fıkraları Havuzu
export const TEMEL_FIKRALARI = [
  'Temel bara girmiş, barmene "Ula bi duble rakı ver ama içine su katma, hamsiler yüzmesun daa!" demiş.',
  'Dursun Temel\'e sormuş: "Ula Temel, bu çark niye hep bombaya duray?" Temel: "Çünkü şansımız Karadeniz gibi dalgalı daa!"',
  'Temel kumarhanede tüm parayı kaybetmiş, kapıdaki korumaya "Ula en azından taksi parasını verun da" demiş. Koruma "Taksi durağı nerede?" deyince Temel "Trabzon\'da!" demiş.',
  'Temel\'e sormuşlar "Kumarda kazandığın parayla ne yapacaksın?" Temel: "Borçları ödeyecem, kalanlar beklesun daa!"',
  'Temel doktora gitmiş "Doktor bey, çark her döndüğünde kalbim x11 gibi çarpay!" Doktor: "Oğlum o aşk değil, kumar bağımlılığı!"',
  'Dursun Temel\'e "Ula çarkta hile var midur?" demiş. Temel: "Hile yoksa bu paralar nereye akay uşağum?"',
]

// Bar Fıkraları ve Kısa Espriler
export const BAR_FIKRALARI = [
  'Bir gün bir matematikçi, bir kriptocu ve bir kumarbaz bara girmiş... Barmen "Yine kim sıfırlayacak masayı?" demiş.',
  'Adamın biri bara girmiş "Barmen bana öyle bir içki ver ki dünkü x11.64 kaybımı unuttursun!" demiş.',
  'Papaz, imam ve kumarbaz bara girmiş. Kumarbaz çarkı çevirip ikisinin de parasını ütmüş!',
  'Barda oturan adam barmene seslenmiş: "Dostum şu çarkın sesini kıs, beynimdeki kayıp sirenleriyle karışıyor!"',
  'Barmen sormuş: "Viskiniz buzlu mu olsun?" Kumarbaz: "Buzsuz olsun usta, zaten cüzdan dondu!"',
]

// Ergen Tripleri ve Birbirine Saldırmalar
export const ERGEN_TRIPLERI = [
  'ya offf Berkecan sus kanka ya iki kuruş çipin var ötüyon şurda',
  'ağlama melis toxiclik yapma masada',
  'koltuğu boşaltın da prolar otursun beyler noob festivali bittiyse',
  'abi şaka mısınız ya x2.33 basan vizyonsuzdur net',
  'kardeşim klavyeden delikanlılık yapma gel teke tek çark çevirelim',
  'offf yine patladı salaklar çıldırıcam sjjsjs',
  'ben bu masanın agasıyım beğenmeyen çıksın kanka',
  'ağlayacaksanız oynamayalım beyler mendil uzatayım mı?',
]

// Diyalog Zincirleri (1. Mesaj ve ona tetiklenecek 2. Cevap Mesajı)
export const BANTER_THREADS = [
  {
    trigger: { user: 'xX_GölgeKral_Xx', text: 'bu masada benden başka oynamayı bilen yok yeminle' },
    reply: { user: 'Semt_Çocuğu_Burak', text: 'kes lan tıfıl, dün donuna kadar soyulup ağlıyordun burada!' },
  },
  {
    trigger: { user: 'Berkecan_31', text: 'x11 basmayan korkaktır agalar' },
    reply: { user: 'Melis_Toxic', text: 'aynen kanka kesin x11 gelir sen bas da biz senin paraları izleyelim💅' },
  },
  {
    trigger: { user: 'Satoshi_Çırağı', text: 'TON coin fırladı beyler çipleri dolara çevirin hemen' },
    reply: { user: 'Barmen_Rıza', role: 'barmen', text: 'sen önce bana olan 50 çip borcunu öde de sonra grafik oku aslanım.' },
  },
  {
    trigger: { user: 'Temel_Reis', text: 'Ula uşaklar çarkın ibresi sola yatay, kesin Laz inadı tuttu!' },
    reply: { user: 'Dursun_Hoca', text: 'Temel sus daa, senin inadın yüzünden köyün tarlasını kaybettuk!' },
  },
  {
    trigger: { user: 'Kazım_Usta', text: 'Bizim zamanımızda delikanlı gibi x2 basılırdı, şimdikiler hep açgözlü.' },
    reply: { user: 'xX_GölgeKral_Xx', text: 'dayı devir degen devri, senin emekli maaşı yetmez buraya!' },
  },
]

// Bağlamsal (Contextual) Reaksiyonlar
export const CONTEXT_REACTIONS = {
  spin_start: [
    'hadi bakalım ibre nereye kilitlenecek...',
    'çark fırıl fırıl dönüyor nefesler tutuldu!',
    'x11 gelirse masaya lahmacun ısmarlıyorum!',
    'bomba gelmesin de ne gelirse gelsin aman',
    'çevir çevir bakalım kasa kimi öpecek',
  ],
  win_huge: [
    'YUH LAN ÇOCUK GÖTÜRDÜ PARAYI!!',
    'Ohaaa x11.64 patladı helal olsun!',
    'Adam tek elde zengin oldu amk!',
    'Masa yıkıldı beyler cüzdanı açın paralar sığmıyor!',
    'Kıskançlıktan çatlayacam yemin ederim...',
  ],
  bomb_hit: [
    'AHAHAHAHA G.O. PATLADI!',
    'Puf oldu çipler geçmiş olsun agalar',
    'Bomba tam yerine düştü helva kavurun',
    'Ula pimi kim çekti uşaklar kül oldunuz!',
    'Bir dakikalık saygı duruşu beyler paralar havaya uçtu',
  ],
  steal_hit: [
    'SOYGUN GELDİİ CEPLERİ TUTUN!',
    'Tilki herkesin cüzdanı boşalttı afiyet olsun',
    'Temiz iş valla profesyonel hırsızlık!',
    'Çiplere elveda deyin vergi kesildi!',
  ],
  idle_chitchat: [
    'çaylar nerde kaldı garson?',
    'bu çark bugün fazla cömert hayırdır inşallah',
    'kasada para biterse barmen hesabı kime yazacak?',
    'biraz hareket lazım beyler hadi basın çiplerinizi!',
  ],
}

export class SpectatorCrowdEngine {
  constructor(onMessageCallback) {
    this.onMessage = onMessageCallback
    this.activeSpectators = [...SPECTATOR_PERSONAS]
    this.intervalId = null
    this.pendingReply = null
    this.lastActionTime = Date.now()
  }

  start() {
    if (this.intervalId) return
    // Her 4 - 8 saniyede bir doğal sohbet veya fıkra tetikle
    this.intervalId = setInterval(() => {
      this.tick()
    }, 5500 + Math.random() * 3000)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  getRandomSpectator() {
    return this.activeSpectators[Math.floor(Math.random() * this.activeSpectators.length)]
  }

  /**
   * Çark Olaylarına Göre Canlı Tepki Üretimi
   */
  reactToGameEvent(eventType, payload = {}) {
    let msgList = CONTEXT_REACTIONS[eventType] || CONTEXT_REACTIONS.idle_chitchat
    const spec = this.getRandomSpectator()
    const text = msgList[Math.floor(Math.random() * msgList.length)]

    this.postMessage(spec.name, text, spec.color, spec.ava)
  }

  tick() {
    // 1. Eğer sırada bekleyen bir cevap/tartışma zinciri varsa önce onu ateşle
    if (this.pendingReply) {
      const { user, text } = this.pendingReply
      const spec = this.activeSpectators.find(s => s.name === user) || this.getRandomSpectator()
      this.postMessage(spec.name, text, spec.color, spec.ava)
      this.pendingReply = null
      return
    }

    const roll = Math.random()

    // 2. %22 İhtimalle Temel veya Bar Fıkrası Patlat
    if (roll < 0.22) {
      const isTemel = Math.random() > 0.4
      if (isTemel) {
        const spec = this.activeSpectators.find(s => s.id === 'temel') || this.getRandomSpectator()
        const joke = TEMEL_FIKRALARI[Math.floor(Math.random() * TEMEL_FIKRALARI.length)]
        this.postMessage(spec.name, `🗣️ ${joke}`, spec.color, spec.ava)
      } else {
        const spec = this.activeSpectators.find(s => s.id === 'barmen') || this.getRandomSpectator()
        const joke = BAR_FIKRALARI[Math.floor(Math.random() * BAR_FIKRALARI.length)]
        this.postMessage(spec.name, `🍸 ${joke}`, spec.color, spec.ava)
      }
      return
    }

    // 3. %25 İhtimalle İki İzleyici Arasında Karşılıklı Tartışma / Laf Sokma Başlat
    if (roll < 0.47) {
      const thread = BANTER_THREADS[Math.floor(Math.random() * BANTER_THREADS.length)]
      const spec = this.activeSpectators.find(s => s.name === thread.trigger.user) || this.getRandomSpectator()
      this.postMessage(spec.name, thread.trigger.text, spec.color, spec.ava)
      // 2.2 saniye sonra cevabı patlat
      this.pendingReply = thread.reply
      return
    }

    // 4. %25 İhtimalle Ergen Tripleri ve Saldırılar
    if (roll < 0.72) {
      const spec = this.activeSpectators.find(s => s.id.startsWith('ergen') || s.id === 'toxic') || this.getRandomSpectator()
      const text = ERGEN_TRIPLERI[Math.floor(Math.random() * ERGEN_TRIPLERI.length)]
      this.postMessage(spec.name, text, spec.color, spec.ava)
      return
    }

    // 5. Normal Genel Sohbet
    const spec = this.getRandomSpectator()
    const text = CONTEXT_REACTIONS.idle_chitchat[Math.floor(Math.random() * CONTEXT_REACTIONS.idle_chitchat.length)]
    this.postMessage(spec.name, text, spec.color, spec.ava)
  }

  postMessage(author, text, color = '#ffd700', ava = '👤') {
    if (this.onMessage) {
      this.onMessage({
        m: `${ava} [İzleyici] ${author}: "${text}"`,
        cls: 'chat-spectator',
        author,
        text,
        color,
        ts: Date.now(),
      })
    }
  }
}
