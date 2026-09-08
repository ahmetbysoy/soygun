# SOYGUN ÇARKI — PATCH & GELİŞTİRME PLANI
**v2026.09-1** · Her patch tek PR'lık granülerlikte yazıldı; P0'lar yangın, P1'ler mimari, P2'ler ürün, P3'ler ciladır.
Durum etiketi: `[UYGULANDI]` bu oturumda koda işlendi · `[APILABILIR]` repo'da açık.

---

## FAZ A — YANGIN SÖNDÜRME (P0 · bu hafta, yayın öncesi şart)

### PATCH-001 `[APILABILIR]` — Sahte doğrulama endpoint'ini kapat
- **Dosya:** `server.ts` (`/api/game/verify`), `src/core/provablyFair.js`
- **Sorun:** Her istek `valid: true` dönüyor; `calculatedSeg` gerçek sonuçla kıyaslanmıyor.
- **Değişiklik:** `roundsHistory`'den `winningSeg`'i çek, `recomputed !== winningSeg` ise `valid:false, reason:"outcome_overridden"` dön. Reroll mantığı silinene kadar **tüm** turlar dürüstçe `valid:false` dönecek — UI'a "Doğrulama şu an kapalıdır (audit öncesi)" rozeti koy.
- **Kabul:** Verifier modal'ı yalan söylemiyor; 100 tur döngüsünde 0 sahte-true.

### PATCH-002 `[APILABILIR]` — DDA / WhaleShield outcome-manipülasyonunu sil
- **Dosya:** `server.ts:236-260` (`botIntentionalMiss`, `whaleDefense`), `economy.js` `VarianceAdaptiveHouseEdge`, `gameSync.js` `dynamicDifficultyAdjustment` çağrıları
- **Değişiklik:** Kazanan dilim **yalnızca** HMAC(serverSeed, clientSeed:nonce) mod N ile belirlenir. Marj, dilim tablosunun sabit yapısından gelir (bugünkü %2.9 zaten marjın kendisi). "Balina" ayrımı tamamen kalkar.
- **Kabul:** 1M simülasyon turunda segment histogramı uniform (χ² p>0.01); kodda `houseEdge` kelimesi sadece tablo açıklamasında geçer.

### PATCH-003 `[APILABILIR]` — Çip matbaasını kapat: tek `addChips` defteri
- **Dosyalar:** `App.jsx:176` (auto-1000), `App.jsx:126-131` (auto-refill), `Wheel.jsx:340-352` (+1000 butonu), `Wheel.jsx:383-392` (MAHALLE SİPERİ), `App.jsx:186-193` (ücretsiz Resurrection)
- **Değişiklik:** Sunucu tarafından imzalı tek mutator: `grantChips(uid, amount, reason, idemKey)`; izinli reason seti `daily_streak | ad_reward | admin_comp`. Reason'sız yazım reddedilir. Buy-in artık gerçekten `balance -= BUY_IN` (transfer), `Math.max(bal,1000)` değil. `+1000 Yükle` butonu silinir, yerine yokluğu gösteren "Bakiye yetersiz → Musluk/Reklam" akışı gelir.
- **Kabul:** 1 hafta boyunca arz defteri = tüm `grant` toplamları; tek "nedeni olmayan çip" yok.

### PATCH-004 `[APILABILIR]` — Otoriter masa state'ini sunucuya taşı
- **Dosyalar:** `gameSync.js` (host-driven phase loop, client settlePhase), `core/SecurityEngine.js` (client-side Map), `core/gameServer.js` (ölü worker istemcisi)
- **Değişiklik:** Node sunucuda (bu depoya zaten var olan `server.ts`) `Room` state machine: join/bet/spin/settle REST+WS endpoint'leri, Postgres/Redis ledger. Firebase yalnızca presence + feed yayın kanalı olur (read-only). `SecurityEngine` idempotency-key'le sunucu transaction'ına dönüşür. Worker'a referans veren `gameServer.js` ya worker'ı yaz ya sil.
- **Kabul:** İki tarayıcı aynı anda `chips`'i yazamıyor; RTDB rules: `soygun/table/game` client için read-only.

### PATCH-005 `[APILABILIR]` — Admin panelini bundle'dan sök
- **Dosyalar:** `App.jsx:36-40,259-262`, `Wheel.jsx:518-530`, `components/RealTimeRevenueDashboard.jsx`, `core/revenueTracker.js`
- **Değişiklik:** Dashboard `/admin` route'una, Cloudflare Access veya Telegram login-widget + allowlist ile; oyundan `OPEN_REVENUE_DASHBOARD` event'i ve butonları kalkar. `revenueTracker` ledger'ı sunucuya taşınır (client'a sadece kendi özetin).
- **Kabul:** Ana bundle'dan `Dashboard` chunk'ı import edilmiyor (rollup analizi); admin'e izinsiz erişim 401.

### PATCH-006 `[APILABILIR]` — Telegram auth + koltuk gaspı koruması
- **Dosya:** `firebase.js:107-115` `identity()`
- **Değişiklik:** `initDataUnsafe` hash'i bot token ile sunucuda HMAC-doğrulanır; web'de anonim hesap "konuk" yetkisiyle oturamaz (bahis için Telegram şart). `joinSeat` transaction'ına `uid` kilidi: koltuk verisi `uid` ile yazılır, `onDisconnect` yalnızca kendi uid'sini siler.
- **Kabul:** Sahte uid ile join 403; seat-chips yazımı sadece `seats[i].uid` sahibinden.

### PATCH-007 `[APILABILIR]` — 18+ kapısı ve sorumlu oyun (yasal minimum)
- **Değişiklik:** İlk açılışta yaş beyanı + kalıcı kayıt; günlük süre/çip limiti (varsayılan açık), "reality check" 30 dk overlay'i, self-exclude (7/30/90 gün, sunucu tarafı), TR erişiminin kapatılması (ülke kilidi: sadece oyun-parası modu TR'de legal gri — reklam-ödüllü modeli için hukukçu onayı). SunkCost/Resurrection-urgency/FOMO sahte-çekim bildirimleri **silinir**; yerine kayıp-limiti hatırlatması gelir.
- **Neden:** `docs/reklam-arastirma.md` faz planın "çekim = kumar" uyarını kendin koymuşsun; bu katman olmadan o satır kâğıt üstünde kalıyor.

### PATCH-008 `[UYGULANDI]` — Küfürsüz, moderasyonlu metinler
- **Yapılan:** `Wheel.jsx` (2 satır) + `botBrain.js` (6 satır) TTS/feed küfürleri temizlendi — `grep -i amına|siktir → 0`.
- **Kalan:** Oyuncu taunt'ları sunucu tarafı regex+yasaklı-liste moderasyonu; taunt TTS'i yalnızca preset'lere açık.

### PATCH-009 `[UYGULANDI]` — Stilsiz kalan dashboard/streak modallarına CSS
- **Yapılan:** `src/index.css` v2'de hiç tanımlı olmayan `.financial-modal-backdrop`, `.financial-modal-content`, `.animate-slide-down` sınıfları yazıldı (önceki sürümde bu sınıflar kullanılıyor ama tanımsızdı — 871 satırlık panel çıplak render oluyordu).

### PATCH-010 `[APILABILIR]` — Feed & bellek sızıntıları
- `log()` anahtarı `now()+counter` (ms çarpışması); `settlePhase` sonunda `feed` node'unu son 50 çocukla budamak; `MarketRateStreamer.destroy()` unmount'ta çağrılmıyor → `useEffect` cleanup ekle; modül-yüklemede `new` ile setInterval başlatan üç singleton'ı (`marketRateStreamer`, `fomoEngine`, `revenueTracker`) tembel başlat.

---

## FAZ B — MİMARİ YENİLENME (P1 · 2-4 hafta)

### PATCH-011 `[APILABILIR]` — Tek render yolu: CanvasWheel'ı kanonikleştir
- Three.js + Canvas + Lottie üç katman aynı çarkı çiziyor. CanvasWheel v2 (aşağıdaki TASARIM notları) tek yol olsun; ThreeJS modu `import()` ile lazy, varsayılan kapalı. Lottie overlay: elle-zorlanan Lottie yerine canvas parçacıkları (zaten `PixiParticles` var — Pixi'yi de ya ana sisteme entegre et ya düşür; 3 partikül motoru = 1 fazla).
- Bağımlılık diyeti: `lottie-web`, `pixi.js`, `three` üçünden en az ikisi gider; `@google/genai` (kullanım yok) ve `lucide-react`/`motion` (2-3 kullanım) hemen silinir; `firebase` tam paket yerine sadece `firebase/app + database`. Hedef bundle: 1.85 MB → <350 KB.

### PATCH-012 `[APILABILIR]` — `Wheel.jsx` parçala
- `useGameLoop` (faz makinesi), `useWheelSpin` (animasyon+fizik), `useBetting`, `SeatCard.jsx`, `ControlsRail.jsx`, `TickerBar.jsx`. 1.203 satır → 150'şer satır. 400+ inline stil token'lara (`--gold-foil` vb.) bağlanır; JSX'te `style` yalnızca hesaplanan değerler için.

### PATCH-013 `[APILABILIR]` — Tip güvenliği + gerçek lint
- tsconfig: `checkJs:true, strict:true, noImplicitAny`; `src` .ts/.tsx'e göç etsin (kademeli). ESLint (react-hooks, exhaustive-deps) + Prettier + husky pre-commit. `npm run lint` bugün hiçbir şey kontrol etmiyor — script'i `tsc -p . --noEmit && eslint src` yap.

### PATCH-014 `[APILABILIR]` — Deterministik oyun testi (ilk testler!)
- `settlePhase` saf fonksiyona indirge (`computeSettlement(state, winIdx) -> patch`); 12 dilim, sınıf-toplama, pool-yetmezliği, BOMB, SOYGUN çalma matematiği için vitest sabit-seed testleri. + RNG χ² testi (1M). CI: GitHub Actions `test+build` — repo'da `.github/` bugün yok.

### PATCH-015 `[APILABILIR]` — Provably-fair v2 (gerçek commit-reveal)
- Tur başına: `serverSeed` hash'i önceden yayınlanır (masa üstünde ticker), 50'lik batch sonunda batch seed + her turun nonce'u açıklanır; tarayıcıda yeniden üretilebilir. `docs/`'a verifier spec + halka açık replay-aracı. "GLI-19" ifadesi sertifikan yoksa **her yerden** silinir (ticari yanıltma riski).

### PATCH-016 `[APILABILIR]` — Ekran saati değil sunucu saati
- Faz zaman damgaları `serverTs`'ye taşınır; 30+ sn disconnect sonrası `phaseUntil` geçmişse tur auto-settle (host'un sekmesi öldü diye masa donmasın). Host-kavramı tamamen kalkar (P0-4 sonrası gereksiz).

### PATCH-017 `[APILABILIR]` — Reklam musluğu S2S
- `docs/TODO.md` Faz 1'i kendi kendinin garantisi: client callback ile çip BASILMAZ. Monetag SSV/postback'i sunucuda `grantChips(uid, n, 'ad_reward', cb.id)` idempotent key'i ile yaz; aynı `cb.id` iki gelirse bir kez.

### PATCH-018 `[APILABILIR]` — Ödeme (yalnız hedef bölge lisanslıysa)
- Şu an `verify-order` hiçbir şeyi doğrulamıyor. Ya Tonkeeper/TON payment v4 + sunucu-side tx-scan (workbook'ta adres formatı `EQ...` base64; mevcut string sahte) ve order→chips'i yalnızca onaylı tx'e bağla; ya da mağazayı tamamen kapat (reklam modeli için zaten gereksiz).

### PATCH-019 `[APILABILIR]` — Çok masa + eşleştirme
- `/table` tek dünya-masası: tek `tableId` seçimi, `tables/{id}` ağacı, lobide masa listesi + pot/masa başı oyuncu sayısı, `joinSeat` yerine matchmaking (kuyruk). Sybil: `tg_id` + device-fingerprint + min-oturum.

---

## FAZ C — ÜRÜN & GELİŞTİRME FİKİRLERİ (P2)

### DEV-020 — "Salon Sezonu" lig sistemi
Haftalık lig: her masada net çip kazancı → sezon puanı; sezon sonu reset'li prestij (çipler sıfırlanmaz, stat sıfırlanır). Rakeback yerine **sezon ödül havuzu** (reklam gelirinin %X'i) — manipülasyon değil, emek-ödülü.

### DEV-021 — Gerçek çok-oyunculu masa (2-6) + boş koltuk yok
Bot koltuk sayısını azalt: botlar "seyirci tribününden davet" akışıyla girsin; davet butonu kaldırılabilir (`🔥 Taze Kumarbazlar Çağır` butonu UI'dan silinecek bir özellik değil). Botların çipi de ledger'dan geçen sanal hesap olur.

### DEV-022 — Seyirci bahsi ("Pit Wager")
İzleyiciler masadaki oyunculara mikro-bahis oynar (kazanana %3 pay) — izleme süresini paraya değil **sosyal statüye** çevirir. FOMOEngine'in sahte bildirimleri yerine gerçek pit-notları: "Kurt 3 eldir x5.82'ye yatıyor" (gerçek history'den, uydurma değil).

### DEV-023 — Sohbet moderasyon kuyruğu + preset-only TTS
Sunucu-side profanity filter (TR+EN listesi), rate-limit, küfürlü mesaj = gölge ban. Oyuncu TTS'i kapat; sesli anons yalnızca sunucu-tarafi crupier replikleri.

### DEV-024 — Ekonomi görselleştirme: "Masa Karnesi"
Her tur sonunda tek ekran özet: girdi/çıktı/EV — oyuncu kaybını görür (regülasyonların istediği "net position" bilgilendirmesi). Bu, `FinancialMetricsEngine`'in kopyalamaya çalıştığı şeyin doğru hali.

### DEV-025 — Jackpot şeffaflığı
Progresif jackpot'un her tur %1 katkısı + patlama koşulu (belirli kombinasyon) + beklenen frekans tabloda yazılı olsun. `JACKPOT_CONTRIBUTION_RATE` ekonomide var ama UI'da tek satır açıklama yok.

### DEV-026 — Ses tasarımı
`DynamicAudioEngine` sentetik arpejleri yerine tek ambient katman (crupier masası uğultusu, çip şıkırtısı); `startDeceleratingTicks`'in setTimeout-ordusu (~60 timer/spin) tek rAF zamanlayıcısına; spatial-audio "sol→sağ tık" süsü çıkarılabilir (kulaklık testi: kimse duymuyor).

### DEV-027 — Offline/PWA & performans
Manifest var ama service worker yok; `vite-plugin-pwa` + wheel-assetleri inline. Telegram pull-to-refresh kapatma (`tg.disableVerticalSwipes()` hiç çağrılmıyor). `haptic` çağrılarını `navigator.vibrate` guard'la (iOS'ta yok — şu an her tuşta konsol warning'i).

### DEV-028 — A/B: ölç, ama ölçtüğünü söyle
`ABTestFeatureFlag` kaldırılsın demiyorum; ama kumar bağlamında oyuncuya görünür "deney" bilgisi + opt-out şart; metrik listenizden `Wager_Per_Minute`'ı çıkarıp `Session_Length_within_Limit` gibi sağlıklı KPI'lar ekleyin.

---

## FAZ D — TASARIM YAMALARI (P3 · görsel sistemin devamı)

### PATCH-030 `[UYGULANDI]` — "Maison Noir" tema çekirdeği
- `src/index.css` tamamen yeniden yazıldı: obsidiyen + şampanya-altını folyo, keçe dokusu (saf CSS, harici asset yok), Cinzel/Inter/JetBrains-Mono tipografi üçlüsü, çift çerçeveli lake paneller, gerçek casino-çipi render'ı (conic kenak + çentik maskesi), ölçülü glow. Tüm eski sınıf adları korundu → bileşenler yeniden yazılmadan yeni temaya geçti.
- `gameSync.js` SEG paleti: neon → bordo `#A83A31` / altın `#C9A24B` / zümrüt `#1FA97C` / ametist `#5B3E8F` / obsidyen `#0E1116`.
- `design/preview.html`: interaktif maket (canvas çark, tıklanabilir dilimler, bahis çipleri, before/after skin toggle) — ekibin referans aldığı tek kaynak bu olsun.

### PATCH-031 `[APILABILIR]` — CanvasWheel v2 "çark şekli"
- 12 dilim yerine **24 ince dilim + 6 geniş jackpot dilimi** (Dream Catcher estetiği); dilim arası **pirinç perlon çiviler** (dönüşte tek tek parlaması için `pegIndex` zaten physicsRef'te var — render'ı ekle); dış çemberde 36 LED yerine **sönük altın jant** ve yalnızca kazananda yanan tek spot; hub: saat kadranı gibi **tur sayacı + pot** (mevcut `centerLabel`/`centerSub` yetiyor).
- Kazanınan dilime `fillLight` yerine ince iç-çevre oku + jant ışığı; "near-miss" kırmızı banner'ı kalsın ama tek satır, `prefers-reduced-motion`'da animasyonsuz (v2 CSS'te hazır).

### PATCH-032 `[APILABILIR]` — Masa (layout) yeniden kurulumu
- Mobil bugün dikey kule (1080px `max-width` + 420px içerik): salon düzeni = üstte ticker, ortada keçe masa (oval) üzerinde çark, çarkın etrafında 4 koltuk (saat 10/2/8/4 yönleri), altta tek çip-ray + SPIN; feed sağdan alta iner. `seatgrid` 4-kart yerine **oval masa kenarı** (`position:absolute` + trigonometrik yerleşim) — preview'daki dikey sütunlar masa-gerçekçiliğinin mobil önceli.
- Masa çipi: her koltukta `Chip3DStack` yerine 2D izometrik yığın (SVG, 3D motor gereksiz).

### PATCH-033 `[APILABILIR]` — 88 inline stilin tasfiyesi
`Wheel.jsx`/`App.jsx` içindeki `style={{...}}` blokları (`btn gold`, `badge-*`, `ticker-*` yardımcı sınıflarıyla) CSS'e çıkarılsın; tema tek noktadan yönetilsin.

### PATCH-034 `[APILABILIR]` — Tema token'larını JS'e verme
`SEG[].c` paleti ile CSS token'ları senkron tutsun: `theme.ts` export → hem canvas `fillStyle` hem CSS var. Şu an çarkın renkleri JS'te, çip renkleri CSS'te — ikinci bir patch-teksinimi (P2D-034).

---

## KABUL KRİTERLERİ SETİ (tüm plan için ortak definition-of-done)
1. `npm run build && npm test` CI'da yeşil; lint 0 hata.
2. `grep -rE "amına|siktir|GLI-19|provably" src/` → 0 eşleşme (iddia silinene ya da gerçekten kurulana dek).
3. Ekonomi testi: hiçbir UI akışı tek `grantChips` kaydı olmadan çip üretemiyor.
4. 1M tur simülasyon: uniform segment histogramı; payout = tablo.
5. Lighthouse (Telegram WebView profili): TTI < 2.5s, bundle < 350 KB gzip-öncesi.
6. Design QA: preview.html ile birebir (token'lar, boşluklar, hareket süreleri).

> **Yazım kuralı:** "premium" bir kelime değil, bir bütçedir — görselde boşluk, kodda sadelik, matematikte dürüstlük. Faz A bitmeden Faz D'ye bütçe ayıran, ışıklı tabelayı salonun kendisi sanır.
