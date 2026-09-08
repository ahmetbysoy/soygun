# SOYGUN ÇARKI · "MAISON NOIR" TASARIM REHBERİ v2.0
Uygulama: `src/index.css` (yazıldı) · `src/gameSync.js → SEG` paleti (yazıldı) · Maket: `design/preview.html`

## 1. Konsept
> *Gece yarısı özel salonu. Işık tavandan tek demet düşer; geri kalan her şey suskundur.*

v1 "slot makinesi bayramı" idi (neon sarı, emoji yağmuru, her şey titriyor). v2 "crupier masası": altın yalnızca **folyo** olarak (gradyan kesim), yeşil yalnızca **keçe** olarak, kırmızı yalnızca **uyarı** olarak vardır. Premium = kısıt.

## 2. Renk Token'ları (`:root`)
| Token | Değer | Kullanım |
|---|---|---|
| `--bg-deep` | `#04050A` | Gece zemin (layered radial vignette + doku) |
| `--panel` | `rgba(14,17,24,.88)` | Lake cam yüzey (blur 12px) |
| `--felt` | `#0C3A2C` | Baize — yalnızca masa ışığında görünür |
| `--gold` | `#C9A24B` | Alaşım altın — tek altın tonun gövdesi |
| `--gold2` | `#E9D08C` | Şampanya — rakam/vurgu rengi |
| `--gold-foil` | 6-stoplı gradyan | BUTON + başlık metali; yan yana iki folyo yüzey asla aynı eksende durmaz |
| `--hairline-foil` | ortası silik şerit | Kart üstü tek tel çizgi — "çerçeve" imzası |
| `--red` | `#B3372F` | Bordo: kayıp, bomb, tilt — asla `#f00` değil |
| `--green` | `#1FA97C` | Zümrüt: kazanma, açık bahıs, canlı nokta |
| `--purple` | `#6D4AA8` | Ametist: soygun/özel dilim |

**Kural:** Tek kroma kanal, tek ışık sıcaklığı (3000K altın). Cyan/lacivert "kasa paneli" mavisi v1'den kalma ve silindi.

## 3. Tipografi
| Rol | Aile | Stil |
|---|---|---|
| Display (H1, modal başlığı, hub çarpanı) | Cinzel → Playfair → Didot → Georgia | 700, **0.14–0.28em tracking**, uppercase |
| Gövde | Inter → system-ui | 600–700 küçük etiket, 400 paragraf |
| Sayı/Rakam | JetBrains Mono → ui-monospace | `font-variant-numeric: tabular-nums` ŞART |

Rakamlar çipte, kasada, stack'te daima tabular mono — bir kumarhanede hizalanmayan sayı güven kaybeder. Üretimde üç web font `font-display: swap` ile `index.html`'e eklenir (preview bilinçli fallback'le çalışır).

## 4. Şekil dili
- **Radyus:** 20px panel / 14px bant / pill rozet. Tek kademe kırılması yok.
- **Çerçeve:** 1px `--line` + `outline-offset:6px` ikinci tel (modal/kazanan) = çift paspartu. Asla 2px kalın sarı border.
- **Derinlik:** Işık tepeden: `inset 0 1px 0` üst tel + 24–48px yumuşak gölge. Neon `text-shadow` yerine 0.14 opaklıkta ambient `--shadow-gold`.
- **Çip:** Gerçek çip anatomisi — renk gövde + 6 adet fildişi kenar çentiği (`repeating-conic-gradient` + radial mask) + metalik merkez parlaması. Seçili çip: altın halka + 5px lift + glow (v1'in `scale(1.15)` beyaz çerçevesi yerine).
- **Çark:** Sahne = ceviz+keçe halka (conic wood), çark = 2px altın jant + 1px gölge tel; iğne = **elmas kesim pentagon** (clip-path), eskiden ucuz üçgen `border` hilesiydi. Hub: saat kadranı — dash halka + serif çarpan.
- **Dilim paleti (SEG v2):** `#A83A31 / #0E1116 / #C9A24B / #5B3E8F / #1FA97C`. Dilimler canvas'ta radial gradyanla gölgelenir: kenar koyu, yüzey orta — düz boya yasak.

## 5. Hareket
| İmza | Süredeğer | Not |
|---|---|---|
| Folyo shine sweep (buton hover) | 500ms | tek parlama, sonsuz `pulse` yok |
| Band breathing (bet fazı) | 2.4s ease | v1'in 0.6s strobe'u yerine nefes |
| bubblePop | 350ms spring | 1.275 overshoot korundu (imza) |
| Tilt/Sniper | 1.6–1.8s glow | v1 `tiltShake` (titreşen kart) silindi — titreme ucuzluk, glow gerilim |
| near-miss | 4s tek geçiş fade | sonsuz pulse yasak |
| `prefers-reduced-motion` | tamam | v2 CSS global kill-switch içeriyor |

Emoji politikası: emoji **veri** olabilir (💣 dilim, 🦊 avatar) ama **UI süsü** olamaz — buton etiketlerinden (`⚡ 🔥 👑` prefix'leri) temizleme: `PATCH-033` ile inline stillerle birlikte gider.

## 6. Düzen
- Shell: 1120px; header (brand + tag'ler + CTA), tek ticker band, üç kolon masa: sol koltuklar / çark+kontrol / sağ koltuklar+pit board. Mobil: çark üste, koltuklar 2'li grid, feed en alt.
- Boşluk skalası: 4/8/12/16/24 — v1'in keyfi `gap:10px`'leri bu ölçeğe oturtuldu.
- `env(safe-area-inset)` alt padding — Telegram mini-app'te home bar üstüne buton basma çağı bitti.

## 7. Erişilebilirlik & tutum
- Kontrast: body ≥ 4.5:1 (obsidiyen üzerinde `#E8E6DF`), altın metaller yalnız büyük/serif boyutta.
- Tıklama hedefleri ≥ 44px (chip 46px ✓).
- Sorumlu oyun ses tonu: UI, oyuncuyu **bilgilendirir** (kayıp limiti, gerçek pozisyon), **korkutmaz** — v1'deki "KORKUP KAÇIYOR MUSUN?" tarzı ayrılma-engelleme metinleri tasarım dili olarak da yasaklandı (hukuki gerekçe: `ELESTIRI-RAPORU` §4).

## 8. Before → After (özet)
| | v1 | v2 Maison Noir |
|---|---|---|
| Zemin | düz lacivert | katmanlı ışık + keçe + doku |
| Altın | tek sarı `#f5b301` | folyo gradyan + tek tel hairline |
| Tipografi | 0.68rem system UI | serif display + tabular mono |
| Çip | düz daire, dashed border | gerçek çip anatomisi |
| Çark | float eden canvas | ceviz halka + altın jant + elmas iğne |
| Animasyon | strobe × 8 | nefes × 3 + sweep |
| Modal | tek çerçeve | çift paspartu lake |
| Bildirim | neon balina toast | suskun salon bandı |

## 9. Uygulama notları (geliştirici için)
1. Yeni bileşen: token'dan renk ver, hex yazma; yazma zorundaysan `docs`'ta "neden token yetmedi" notu bırak.
2. Inline `style` = kod incelemesinde otomatik "request changes" (istisna: runtime hesaplı değer).
3. Maket tek gerçeklik kaynağıdır: `design/preview.html` aç, bak, sonra yaz.
4. Tema değişirse (yılbaşı kırmızısı vb.) yalnız `:root` + SEG bloğu patch'lenir — v2'nin getirisi bu: tek dosya, bütün marka.
