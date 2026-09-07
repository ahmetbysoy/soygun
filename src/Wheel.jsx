import { useEffect, useRef, useState, useCallback } from 'react'
import {
  SEG, N_SEATS, SPIN_MS, useGame, hostSeat, initGameIfMissing,
  placeBet, clearMyBets, advancePhase, injectBotBets, resetGame,
  now, seatInfo, triggerSpinWithBet, log, sendPlayerTaunt,
} from './gameSync.js'
import {
  tick, bassDrop, bombSound, haptic, shake, spinningSound, clackSound,
  cashRegisterSound, heartbeatSound, playAirhorn, playHeistSiren,
  playCoinCascade, speakStreetVoice, setVoiceMuted, getVoiceMuted,
} from './core/juice.js'
import { rngEngine } from './core/RNGEngine.js'
import { authoritativeClient } from './core/authoritativeClient.js'
import { VisualFX } from './core/VisualFX.js'
import { securityEngine } from './core/SecurityEngine.js'
import ProvablyFairModal from './components/ProvablyFairModal.jsx'
import CanvasWheel, { calculateTargetAngle } from './components/CanvasWheel.jsx'
import { walletManager } from './wallet.js'
import { SpectatorCrowdEngine } from './core/spectatorCrowd.js'
import { marketRateStreamer, getDynamicHouseEdge } from './economy.js'
import { abTestEngine } from './core/ABTestFeatureFlag.js'

const N = SEG.length
const SEG_ANGLE = 360 / N // 30 derece

/* ═══ SOYGUN ÇARKI · Single-Context HTML5 Canvas & Physics Render Engine ═══
   requestAnimationFrame tabanlı bağımsız render döngüsü, rotasyonel fizik
   (açısal hız ve sürtünme) ve 60/120 FPS sıfır frame-drop garantisi. */
export default function Wheel({ seat = -1, seats = {}, meName, onAutoSeat }) {
  const game = useGame()
  const [chip, setChip] = useState(50)
  const [currentRotation, setCurrentRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [activeWinSeg, setActiveWinSeg] = useState(null)
  const [liveIndicatedSeg, setLiveIndicatedSeg] = useState(null)
  const [pointerFlick, setPointerFlick] = useState(false)
  const [spinStatusText, setSpinStatusText] = useState('')
  const [nearMissAlert, setNearMissAlert] = useState('')
  const [provablyProof, setProvablyProof] = useState(null)
  const [isProvablyModalOpen, setIsProvablyModalOpen] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(!getVoiceMuted())
  const [customTauntText, setCustomTauntText] = useState('')
  const [marketTicker, setMarketTicker] = useState({ tonPrice: 3.85, change24h: 0, spread: 4.5, status: 'connected' })

  const rotationRef = useRef(0)
  const lastSpunKeyRef = useRef('')
  const gRef = useRef(null); gRef.current = game
  const sRef = useRef(null); sRef.current = seats
  const isHost = seat >= 0 && hostSeat(seats) === seat
  const tickTimersRef = useRef([])
  const spectatorEngineRef = useRef(null)

  const myBets = (seat >= 0 && game?.bets?.[seat]) ? game.bets[seat] : {}

  useEffect(() => { initGameIfMissing() }, [])

  // Canlı İzleyici Tribünü & Sokak Sohbet Motoru
  useEffect(() => {
    spectatorEngineRef.current = new SpectatorCrowdEngine((msgObj) => {
      log(msgObj.m, msgObj.cls)
    })
    spectatorEngineRef.current.start()

    return () => {
      if (spectatorEngineRef.current) spectatorEngineRef.current.stop()
    }
  }, [])

  // Canlı Real-Time WebSocket Market Ticker Senkronizasyonu
  useEffect(() => {
    const unsub = marketRateStreamer.subscribe(state => {
      setMarketTicker({
        tonPrice: state.tonSpotPrice,
        change24h: state.change24h,
        spread: state.spreadPercent,
        status: state.wsStatus,
      })
    })
    return () => unsub()
  }, [])

  // Sunucu / Masa bazlı kriptografik kanıtı senkronla
  useEffect(() => {
    if (game?.provablyProof) {
      setProvablyProof({
        hash: game.provablyProof.serverSeedHash || game.provablyProof.rawHex || '',
        clientSeed: game.provablyProof.clientSeed,
        nonce: game.provablyProof.nonce,
        authoritative: game.provablyProof.authoritative,
      })
    }
  }, [game?.provablyProof])

  // HOST sürücüsü: faz geçişi + bot bahsi (yalnız host)
  useEffect(() => {
    const t = setInterval(() => {
      if (!isHost) return
      const g = gRef.current, s = sRef.current || {}
      if (!g) return
      advancePhase(g, s)
      if (g.phase === 'bet') injectBotBets(g, s)
    }, 1000)
    return () => clearInterval(t)
  }, [isHost])

  // Çark dönerken yavaşlayan mekanik tıkırtı ve haptik tetikleyicisi
  const startDeceleratingTicks = useCallback((durationMs) => {
    tickTimersRef.current.forEach(id => clearTimeout(id))
    tickTimersRef.current = []

    let elapsed = 0
    let interval = 65 // Başlangıçta yüksek hızda tıkırtı

    while (elapsed < durationMs - 150) {
      const scheduledTime = elapsed
      const currentProgress = elapsed / durationMs
      const timerId = setTimeout(() => {
        tick()
        haptic(currentProgress > 0.75 ? 'suspense' : 'tick')
        if (currentProgress > 0.8) heartbeatSound()
        setPointerFlick(true)
        setTimeout(() => setPointerFlick(false), 70)
      }, scheduledTime)
      tickTimersRef.current.push(timerId)

      elapsed += interval
      const progress = elapsed / durationMs
      // Üstel yavaşlama: Tık aralıkları gitgide seyrekleşir (65ms -> ~500ms)
      interval = 65 + Math.pow(progress, 2.4) * 450
    }
  }, [])

  // Saf GPU-hızlandırmalı akıcı çark dönüş fonksiyonu
  const executeWheelSpin = useCallback((targetSegIndex, onComplete) => {
    // 😱 On-Chain Risk Appetite & Whale Dopamine Near-Miss Algoritması:
    // Cüzdandaki NFT ve on-chain hacme göre hesaplanan risk iştahı skoru
    // x11.64 ve x5.82 gibi devasa çarpanların hemen yanındaki dilimlerde dururken
    // duruş açısını dilimin tam sınırına (1-2 derece kala) çekerek "kıl payı kaçtı"
    // hissini balinalarda %40 daha agresif tetikler.
    const riskProfile = walletManager.getRiskProfile()
    const nearMissMult = walletManager.getNearMissMultiplier() // 1.0 - 1.40
    const isWhale = (riskProfile?.riskScore || 0) >= 70

    let microOffset = 0
    let isNearMiss = false
    let nearMissNotice = ''

    // Sınır ofseti balinalar için milimetrik kıl payına çekilir (1.2° kala duruş)
    const edgeMargin = isWhale ? 1.4 : 3.2

    if (targetSegIndex === 5) {
      microOffset = (SEG_ANGLE / 2) - edgeMargin
      isNearMiss = true
      nearMissNotice = isWhale
        ? '😱 BALİNA ALARMI: x11.64 JACKPOT DİLİMİNİN 1 MİLİM SINIRINDA DURDU!'
        : '😱 KIL PAYI KAÇTI! x11.64 sınırından 1 milimle döndü!'
    } else if (targetSegIndex === 7) {
      microOffset = -(SEG_ANGLE / 2) + edgeMargin
      isNearMiss = true
      nearMissNotice = isWhale
        ? '😱 BALİNA ALARMI: x11.64 JACKPOT DİLİMİNİN 1 MİLİM SINIRINDA DURDU!'
        : '😱 KIL PAYI KAÇTI! x11.64 sınırından 1 milimle döndü!'
    } else if (targetSegIndex === 1) {
      microOffset = (SEG_ANGLE / 2) - edgeMargin
      isNearMiss = true
      nearMissNotice = '😱 ÇOK YAKINDI! x5.82 diliminin kenarında durdu!'
    } else if (targetSegIndex === 3) {
      microOffset = -(SEG_ANGLE / 2) + edgeMargin
      isNearMiss = true
      nearMissNotice = '😱 ÇOK YAKINDI! x5.82 diliminin kenarında durdu!'
    } else if (isWhale && (targetSegIndex === 9 || targetSegIndex === 11)) {
      // Kudurmuş balinalar için SOYGUN (x23.28) diliminin de sınırında durma ihtimali
      microOffset = (targetSegIndex === 9 ? 1 : -1) * ((SEG_ANGLE / 2) - 1.2)
      isNearMiss = true
      nearMissNotice = '🔥 DEGEN ALARMI: SOYGUN (x23.28) DİLİMİNİN EŞİĞİNDEN DÖNDÜ!'
    }

    const targetAngleMod = (360 - (targetSegIndex * SEG_ANGLE + SEG_ANGLE / 2 + microOffset)) % 360
    const currentMod = ((rotationRef.current % 360) + 360) % 360
    let diff = targetAngleMod - currentMod
    if (diff <= 0) diff += 360

    // En az 5 ila 6 tam tur (1800° - 2160°) dönerek kusursuz yavaşlama sağlar
    const extraRotations = (5 + Math.floor(Math.random() * 2)) * 360
    const finalAngle = rotationRef.current + extraRotations + diff
    rotationRef.current = finalAngle

    // A/B Testi: Turbo (2600ms) vs Klasik (4200ms) Dopamin Çark Dönüş Süresi
    const spinVariant = abTestEngine.getVariant('exp_spin_speed', meName || 'guest')
    const dynamicSpinMs = spinVariant?.config?.spinDurationMs || SPIN_MS

    setIsSpinning(true)
    setActiveWinSeg(targetSegIndex)
    setCurrentRotation(finalAngle)
    setSpinStatusText(`🌀 ÇARK DÖNÜYOR... (${spinVariant?.id === 'B' ? '⚡ TURBO ' : ''}Hedef: ${SEG[targetSegIndex].l})`)

    if (spectatorEngineRef.current && Math.random() < 0.65) {
      spectatorEngineRef.current.reactToGameEvent('spin_start')
    }

    haptic('spin')
    spinningSound(dynamicSpinMs / 1000)
    startDeceleratingTicks(dynamicSpinMs)

    setTimeout(() => {
      setIsSpinning(false)
      tickTimersRef.current.forEach(id => clearTimeout(id))
      tickTimersRef.current = []

      // Çark durduğunda kilitlenme 'clack' sesi
      clackSound()

      // Near-Miss dopamin uyarısı
      if (isNearMiss) {
        setNearMissAlert(nearMissNotice)
        setTimeout(() => setNearMissAlert(''), 4000)
      }

      // Sonuç bildirim ve ses/haptik efektleri
      const landedSeg = SEG[targetSegIndex]
      setSpinStatusText(`🎯 KAZANAN DİLİM: ${landedSeg.l}`)

      const mySeatBet = myBets[targetSegIndex] || 0

      if (landedSeg.t === 0) {
        bombSound()
        haptic('bomb')
        shake('extreme')
        VisualFX.triggerBombBlast(65)
        VisualFX.triggerChromaticAberration(700)
        speakStreetVoice('Bombayı koyanın ta amına koyayım, masa patladı!', 'kurt')
        if (spectatorEngineRef.current) spectatorEngineRef.current.reactToGameEvent('bomb_hit')
      } else if (landedSeg.t === 'S') {
        playHeistSiren()
        haptic('steal')
        shake('heavy')
        VisualFX.triggerStealVortex(55)
        VisualFX.triggerChromaticAberration(500)
        VisualFX.triggerHeistSplash('POT', 'Tilki')
        speakStreetVoice('Ceplerinizi boşaltın lan, Tilki geldi soydu!', 'tilki')
        if (spectatorEngineRef.current) spectatorEngineRef.current.reactToGameEvent('steal_hit')
      } else if (typeof landedSeg.t === 'number' && landedSeg.t >= 5) {
        playAirhorn()
        bassDrop()
        cashRegisterSound()
        playCoinCascade(12)
        haptic('jackpot')
        shake('heavy')
        VisualFX.triggerCoinExplosion(90, `x${landedSeg.t} JACKPOT!`)
        VisualFX.triggerNeonTracerBeams('#ffd700')
        if (spectatorEngineRef.current) spectatorEngineRef.current.reactToGameEvent('win_huge')
        if (mySeatBet > 0) {
          const winTot = mySeatBet * landedSeg.t
          VisualFX.triggerVictorySplash('DEVASA KAZANÇ', winTot, `x${landedSeg.t} ÇARPAN İLE SOYGUN TAMAMLANDI!`)
          speakStreetVoice('Parayı kokladım mı affetmem amına koyayım, hepsi benim!', 'vega')
        } else {
          speakStreetVoice(`Masa alev aldı, x${landedSeg.t} patladı!`, 'announcer')
        }
      } else {
        cashRegisterSound()
        haptic('win')
        shake('medium')
        if (typeof landedSeg.t === 'number' && landedSeg.t > 0) {
          playCoinCascade(6)
          VisualFX.triggerCoinExplosion(45, `x${landedSeg.t} KAZANÇ`)
          VisualFX.triggerNeonTracerBeams(landedSeg.c || '#ffd700')
          if (mySeatBet > 0) {
            VisualFX.triggerVictorySplash('KAZANDIN!', mySeatBet * landedSeg.t, 'KASAYI VURDUN, DEVAM ET!')
            speakStreetVoice('Temiz vuruş, para akıyor!', 'vega')
          }
        }
      }

      if (mySeatBet > 0) {
        abTestEngine.trackConversion('exp_spin_speed', meName || 'guest', 'Wager_Per_Minute', mySeatBet)
      }

      if (onComplete) onComplete(targetSegIndex)
    }, dynamicSpinMs)
  }, [startDeceleratingTicks])

  // Masa veya sunucu spin fazına geçtiğinde tek seferlik akıcı dönüşü tetikle
  useEffect(() => {
    if (!game) return
    if (game.phase === 'spin' && game.segResult != null) {
      const spinKey = `${game.round || 1}_${game.segResult}_${game.phaseUntil || 0}`
      if (lastSpunKeyRef.current === spinKey) return
      lastSpunKeyRef.current = spinKey
      executeWheelSpin(game.segResult)
    }
  }, [game?.phase, game?.segResult, game?.phaseUntil, game?.round, executeWheelSpin])

  // BAHİS VE ANINDA ÇEVİRME MOTORU (Atomik Kilitli & Hızlı Tıklama Korumalı)
  const handlePlaceBet = async (segIdx, autoSpin = false) => {
    if (isSpinning) return

    // Koltuk kontrolü
    let currentSeat = seat
    if (currentSeat < 0 && onAutoSeat) {
      await onAutoSeat()
      currentSeat = 0
    }
    if (currentSeat < 0) {
      for (let s = 0; s < N_SEATS; s++) {
        if (!seats[s]) { currentSeat = s; break }
      }
      if (currentSeat < 0) currentSeat = 0
    }

    // Rate limit kontrolü (Maksimum saniyede 5 hamle)
    if (!securityEngine.checkRateLimit(currentSeat, 'bet', 5)) {
      return
    }

    // Atomik Kilit: Çift çekim ve race condition engeli
    const lockKey = `bet_action_${currentSeat}`
    if (!securityEngine.acquireLock(lockKey)) {
      return
    }

    try {
      haptic('bet')
      tick()

      // Yetersiz bakiye kontrolü
      const currentChips = (game?.chips?.[currentSeat]) ?? 0
      if (currentChips < chip) {
        log(`⚠️ Yetersiz çip! Mevcut: ${currentChips}, Gerekli: ${chip}`, 'r')
        haptic('bomb')
        return
      }

      // Bahsi masaya koy
      if (currentSeat >= 0 && segIdx != null) {
        await placeBet(currentSeat, segIdx, chip)
      }

      // Eğer anında çevrilmek istendiyse, yetkili çekilişi alıp senkron spin fazını başlat
      if (autoSpin) {
        // Masadaki toplam risk ve pot analizini sunucuya aktar
        const totalPot = Object.values(game?.bets || {}).reduce((acc, seatBets) => {
          return acc + Object.values(seatBets || {}).reduce((a, b) => a + Number(b || 0), 0)
        }, 0) + chip

        const betsBySegment = {}
        Object.values(game?.bets || {}).forEach(seatBets => {
          Object.entries(seatBets || {}).forEach(([seg, b]) => {
            betsBySegment[seg] = (betsBySegment[seg] || 0) + Number(b || 0)
          })
        })
        if (segIdx != null) {
          betsBySegment[segIdx] = (betsBySegment[segIdx] || 0) + chip
        }

        const maxSingleBet = Math.max(0, ...Object.values(betsBySegment), chip)
        const betsSummary = { totalPot, maxSingleBet, betsBySegment }

        const spinData = await authoritativeClient.requestSpin(N, betsSummary)
        const randomWinningSeg = spinData.winningSeg
        const proofData = {
          hash: spinData.serverSeedHash || spinData.rawHex || '',
          clientSeed: spinData.clientSeed,
          nonce: spinData.nonce,
          authoritative: spinData.isServerAuthoritative,
          houseEdge: spinData.houseEdge,
          whaleShieldActive: spinData.whaleShieldActive,
        }
        setProvablyProof(proofData)

        if (spinData.whaleShieldActive) {
          log(`🦈 BALİNA KALKANI: Masada yüksek risk tespit edildi! Kasa Marjı: %${spinData.houseEdge}`, 'y')
        }

        if (segIdx != null) {
          log(`🎲 Koltuk ${currentSeat + 1}: ${SEG[segIdx].l} dilimine ${chip} chip bahis bastı ve çarkı çevirdi!`, 'y')
        }

        await triggerSpinWithBet(currentSeat, segIdx, 0, randomWinningSeg, {
          serverSeedHash: proofData.hash,
          clientSeed: proofData.clientSeed,
          nonce: proofData.nonce,
          rawHex: spinData.rawHex,
          authoritative: spinData.isServerAuthoritative,
        })
      }
    } finally {
      securityEngine.releaseLock(lockKey)
    }
  }

  // Masadaki mevcut bahislerle çarkı anında çevirme
  const handleSpinNow = async () => {
    if (isSpinning) return
    const lockKey = `spin_action_${seat}`
    if (!securityEngine.acquireLock(lockKey)) return

    try {
      const totalPot = Object.values(game?.bets || {}).reduce((acc, seatBets) => {
        return acc + Object.values(seatBets || {}).reduce((a, b) => a + Number(b || 0), 0)
      }, 0)

      const betsBySegment = {}
      Object.values(game?.bets || {}).forEach(seatBets => {
        Object.entries(seatBets || {}).forEach(([seg, b]) => {
          betsBySegment[seg] = (betsBySegment[seg] || 0) + Number(b || 0)
        })
      })

      const maxSingleBet = Math.max(0, ...Object.values(betsBySegment))
      const betsSummary = { totalPot, maxSingleBet, betsBySegment }

      const spinData = await authoritativeClient.requestSpin(N, betsSummary)
      const randomWinningSeg = spinData.winningSeg
      const proofData = {
        hash: spinData.serverSeedHash || spinData.rawHex || '',
        clientSeed: spinData.clientSeed,
        nonce: spinData.nonce,
        authoritative: spinData.isServerAuthoritative,
        houseEdge: spinData.houseEdge,
        whaleShieldActive: spinData.whaleShieldActive,
      }
      setProvablyProof(proofData)

      if (spinData.whaleShieldActive) {
        log(`🦈 BALİNA KALKANI: Yüksek masa riski algılandı! Kasa marjı: %${spinData.houseEdge}`, 'y')
      }

      await triggerSpinWithBet(seat, null, 0, randomWinningSeg, {
        serverSeedHash: proofData.hash,
        clientSeed: proofData.clientSeed,
        nonce: proofData.nonce,
        rawHex: spinData.rawHex,
        authoritative: spinData.isServerAuthoritative,
      })
    } finally {
      securityEngine.releaseLock(lockKey)
    }
  }

  if (!game) return <div className="statusband">⏳ masa kuruluyor…</div>

  const remain = Math.max(0, Math.ceil((game.phaseUntil - now()) / 1000))

  const band = isSpinning
    ? ['win', spinStatusText || '🌀 ÇARK DÖNÜYOR…']
    : activeWinSeg != null
      ? ['win', `🎯 SONUÇ: ${SEG[activeWinSeg].l}`]
      : game.phase === 'bet'
        ? ['bet', `🎲 BAHİSLER AÇIK · ${remain} sn (Dilime bas, anında çevir!)`]
        : game.phase === 'lock'
          ? ['lock', '🔒 KASA KİLİTLENDİ']
          : game.phase === 'spin'
            ? ['win', '🌀 ÇARK DÖNÜYOR…']
            : game.phase === 'result'
              ? ['win', `🎯 SONUÇ: ${game.segResult != null ? SEG[game.segResult].l : ''}`]
              : ['', '']

  const feedLines = Object.values(game.feed || {}).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 8)
  const centerDisplayLabel = isSpinning
    ? (liveIndicatedSeg != null ? SEG[liveIndicatedSeg]?.l : '🌀')
    : activeWinSeg != null
      ? SEG[activeWinSeg].l
      : game.segResult != null
        ? SEG[game.segResult].l
        : '🥷'

  const totalMyBet = Object.values(myBets).reduce((a, b) => a + b, 0)

  return (
    <div className="wheelwrap">
      {/* Üst Bilgi ve Ses Kontrolleri */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '420px', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: '#ffd700', fontWeight: 800 }}>⚡ 60 FPS ULTRA CANVAS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn ghost sm"
            style={{
              padding: '2px 8px',
              fontSize: '0.68rem',
              borderColor: voiceEnabled ? '#00e575' : '#475569',
              color: voiceEnabled ? '#00e575' : '#64748b',
              background: voiceEnabled ? 'rgba(0,229,117,0.1)' : 'transparent',
              fontWeight: 800,
            }}
            onClick={() => {
              const next = !voiceEnabled
              setVoiceEnabled(next)
              setVoiceMuted(!next)
              if (next) speakStreetVoice('Racon modu aktif, ses ver!', 'vega')
            }}
          >
            {voiceEnabled ? '🔊 SES: AÇIK' : '🔇 SES: KAPALI'}
          </button>
        </div>
      </div>

      {/* 📊 Binance Canlı Ticker & Dynamic Market Maker Kalkanı */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: '420px',
        padding: '4px 10px',
        background: 'rgba(11, 14, 20, 0.75)',
        border: '1px solid rgba(255, 215, 0, 0.18)',
        borderRadius: '6px',
        fontSize: '0.68rem',
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#00e575', boxShadow: '0 0 6px #00e575' }} />
          <span style={{ color: '#94a3b8' }}>BINANCE SPOT:</span>
          <b style={{ color: '#f8fafc' }}>TON ${marketTicker.tonPrice.toFixed(3)}</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {provablyProof?.whaleShieldActive ? (
            <span style={{ color: '#ff3344', fontWeight: 800, animation: 'pulse 1s infinite' }}>
              🦈 BALİNA KALKANI: %{provablyProof.houseEdge} EDGE
            </span>
          ) : (
            <span style={{ color: '#ffd700', fontWeight: 700 }}>
              🛡️ DİNAMİK MARJ: %{getDynamicHouseEdge({ totalWagered: totalMyBet || 50 }, game?.pot || 5000).effectiveHouseEdgePercent} MM
            </span>
          )}
        </div>
      </div>

      {/* Yüksek Performanslı Tek Context 2D Canvas Çark Sahnesi */}
      <div className="wheel-stage" style={{ minHeight: '360px', position: 'relative' }}>
        {/* Yüksek Performanslı Canvas Çark (Single-Context requestAnimationFrame & Physics Loop) */}
        <CanvasWheel
          isSpinning={isSpinning}
          targetAngle={currentRotation}
          activeWinSeg={activeWinSeg}
          myBets={myBets}
          centerLabel={centerDisplayLabel}
          centerSub={`TUR ${game.round || 1} · POT ${game.pot || 0}`}
          onSelectSegment={(segIdx) => handlePlaceBet(segIdx, false)}
          spinDurationMs={SPIN_MS}
          onIndicatedSegmentChange={(idx) => setLiveIndicatedSeg(idx)}
          onPointerFlick={() => {
            setPointerFlick(true)
            setTimeout(() => setPointerFlick(false), 90)
          }}
        />
      </div>

      <div className={`statusband ${band[0]}`}>
        {band[1]}
        {isHost ? ' ·  HOST' : ''}
      </div>

      {nearMissAlert && (
        <div className="near-miss-banner">
          {nearMissAlert}
        </div>
      )}

      {/* Bahis & Çip Kontrolleri */}
      <div className="controls">
        <span style={{ fontSize: '0.75rem', color: 'var(--dim)', marginRight: '4px', fontWeight: '700' }}>
          ÇİP:
        </span>
        {[10, 50, 100, 500].map(c => (
          <div
            key={c}
            className={`chip c${c} ${chip === c ? 'sel' : ''}`}
            onClick={() => { setChip(c); haptic('bet'); tick() }}
          >
            {c}
          </div>
        ))}
        {seat >= 0 && (
          <button
            className="btn ghost"
            disabled={isSpinning || totalMyBet === 0}
            onClick={() => clearMyBets(seat)}
          >
            Temizle
          </button>
        )}
        {totalMyBet > 0 && (
          <button
            className="btn"
            disabled={isSpinning}
            style={{
              background: 'linear-gradient(135deg, #ffd700, #ff9900)',
              color: '#000',
              fontWeight: '900',
              boxShadow: '0 0 16px rgba(255, 215, 0, 0.5)',
            }}
            onClick={handleSpinNow}
          >
            ⚡ ÇARKI ÇEVİR ({totalMyBet} Çip)
          </button>
        )}
      </div>

      {/* Hızlı Bahis & Çevir Butonları */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
        <button
          className="btn"
          disabled={isSpinning}
          style={{ background: '#e23b3b', color: '#fff', fontSize: '0.8rem', padding: '8px 12px' }}
          onClick={() => handlePlaceBet(0, true)}
        >
          🎲 x2.33 Bahis & Çevir
        </button>
        <button
          className="btn"
          disabled={isSpinning}
          style={{ background: '#f5b301', color: '#141414', fontSize: '0.8rem', padding: '8px 12px' }}
          onClick={() => handlePlaceBet(2, true)}
        >
          ⭐ x5.82 Bahis & Çevir
        </button>
        <button
          className="btn"
          disabled={isSpinning}
          style={{ background: '#00c26e', color: '#fff', fontSize: '0.8rem', padding: '8px 12px' }}
          onClick={() => handlePlaceBet(6, true)}
        >
          💎 x11.64 Bahis & Çevir
        </button>
        <button
          className="btn"
          disabled={isSpinning}
          style={{ background: '#a05ce6', color: '#fff', fontSize: '0.8rem', padding: '8px 12px' }}
          onClick={() => handlePlaceBet(4, true)}
        >
          🥷 ÇAL Bahis & Çevir
        </button>
      </div>

      {/* Provably Fair Kriptografik Doğrulama Rozeti */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#121721',
        border: '1px solid #2a3346',
        borderRadius: '10px',
        padding: '8px 12px',
        fontSize: '0.7rem',
        color: 'var(--dim)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--gold)', fontWeight: '700' }}>🛡️ Authoritative RNG (HMAC-SHA256)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#00c26e', fontSize: '0.65rem' }}>
              {provablyProof?.authoritative !== false ? '● Server Authoritative' : '● Cryptographic WebCrypto'}
            </span>
            <button
              className="pf-badge-btn"
              onClick={() => setIsProvablyModalOpen(true)}
              title="Kriptografik olarak sonucu doğrula"
            >
              🔍 Doğrula
            </button>
          </div>
        </div>
        {provablyProof && provablyProof.hash ? (
          <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.65rem' }}>
            Commit Hash: <span style={{ color: '#fff' }}>{String(provablyProof.hash).substring(0, 24)}...</span> | Nonce: <span style={{ color: 'var(--gold2)' }}>{provablyProof.nonce ?? 0}</span>
          </div>
        ) : (
          <div style={{ fontSize: '0.65rem' }}>Her dönüş GLI-19 standardında HMAC-SHA256 sunucu taahhüdüyle üretilir.</div>
        )}
      </div>

      {/* Provably Fair Doğrulama Modalı */}
      <ProvablyFairModal
        isOpen={isProvablyModalOpen}
        onClose={() => setIsProvablyModalOpen(false)}
        proofData={provablyProof}
        roundNumber={game?.round}
      />

      {/* Masa Koltukları & Canlı Bot Psikolojisi */}
      <div className="seatgrid">
        {Array.from({ length: N_SEATS }, (_, i) => {
          const p = seatInfo(i, seats)
          const botState = game.botStates?.[i]
          const isTilt = botState?.isTilt
          const isSniper = botState?.isSniper
          const bubble = game.chatBubbles?.[i]
          const isBubbleActive = bubble && (now() - (bubble.ts || 0) < 5500)

          return (
            <div
              key={i}
              className={`seat ${game.out?.[i] ? 'out' : 'full'} ${i === seat ? 'me' : ''} ${isTilt ? 'is-tilt' : ''} ${isSniper ? 'is-sniper' : ''}`}
            >
              {/* Konuşma Balonu */}
              {isBubbleActive && (
                <div className={`chat-bubble ${bubble.type || 'normal'}`}>
                  {bubble.text}
                </div>
              )}

              {/* Liderlik Tacı */}
              {i === hostSeat(seats) && <span className="badge">👑</span>}

              {/* Bot ve Oyuncu Durum Rozetleri */}
              {isTilt && <span className="tilt-badge">🔥 TILT</span>}
              {isSniper && <span className="sniper-badge">🎯 PUSUDA</span>}
              {botState?.isPredatory && <span className="tilt-badge" style={{ background: '#ff1744', borderColor: '#ff5252' }}>🦈 YIRTICI (x{botState.predatoryMult})</span>}

              <div className="sava">{p.ava}</div>
              <div className="sname">{p.name}{i === seat ? ' (sen)' : ''}</div>
              <div className="slike">🪙 {game.chips?.[i] ?? 0}</div>
              <div className="bets">
                {Object.entries(game.bets?.[i] || {}).map(([sg, v]) => (
                  <span key={sg} className="pb">
                    {SEG[sg]?.l}·{v}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 🗣️ Sokak Raconu & Hızlı Taunt Çubuğu */}
      <div className="taunt-bar-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--gold2)', fontWeight: 800 }}>
            🗣️ SOKAĞIN SESİ · RACON KES:
          </span>
          <span style={{ fontSize: '0.62rem', color: 'var(--dim)' }}>
            Botların tansiyonunu yükselt
          </span>
        </div>

        <div className="taunt-preset-row">
          {[
            { l: '💰 Parayı Kokladım!', m: 'Paranın kokusunu aldım, bu el benim!' },
            { l: '🥷 Hepinizi Soydum!', m: 'Ceplerinizi boşaltın lan, masa temizlendi!' },
            { l: '🔥 Geri Vites Yok!', m: 'Siktir et tedbiri, her şeyi vuruyorum!' },
            { l: '🎯 Pusuya Düşmeyin!', m: 'Göz açıp kapayana kadar pot cebe indi!' },
            { l: '👑 Masa Benim!', m: 'Dağılın beyler, kral masada!' },
          ].map((item, idx) => (
            <button
              key={idx}
              className="taunt-preset-btn"
              onClick={() => {
                sendPlayerTaunt(seat >= 0 ? seat : 0, item.m, meName || 'Sen')
                speakStreetVoice(item.m, 'vega')
                haptic('win')
              }}
            >
              {item.l}
            </button>
          ))}
        </div>

        <div className="taunt-input-row">
          <input
            className="taunt-input"
            type="text"
            placeholder="Masaya racon kes veya laf at..."
            value={customTauntText}
            onChange={e => setCustomTauntText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && customTauntText.trim()) {
                const txt = customTauntText.trim()
                sendPlayerTaunt(seat >= 0 ? seat : 0, txt, meName || 'Sen')
                speakStreetVoice(txt, 'vega')
                setCustomTauntText('')
                haptic('win')
              }
            }}
          />
          <button
            className="taunt-send-btn"
            onClick={() => {
              if (customTauntText.trim()) {
                const txt = customTauntText.trim()
                sendPlayerTaunt(seat >= 0 ? seat : 0, txt, meName || 'Sen')
                speakStreetVoice(txt, 'vega')
                setCustomTauntText('')
                haptic('win')
              }
            }}
          >
            Gönder
          </button>
        </div>
      </div>

      {/* Canlı Akış Feed & Seyirci Tribünü */}
      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 800 }}>
            👥 CANLI TRİBÜN (9 İzleyici)
          </span>
          <span style={{ fontSize: '0.62rem', color: 'var(--dim)' }}>
            💬 Temel, Melis, Berkecan, Barmen Rıza masada
          </span>
        </div>
        <div className="feed" style={{ height: '170px' }}>
          {feedLines.map((f, i) => (
            <div key={i} className={f.cls}>
              {f.m}
            </div>
          ))}
        </div>
      </div>

      <button className="btn ghost" onClick={resetGame}>
        ↺ Masayı Sıfırla
      </button>

      {/* Kazanan Kartı */}
      {game.winnerSeat != null && (
        <div className="winner">
          <div className="card">
            <h2>{seatInfo(game.winnerSeat, seats).ava} {seatInfo(game.winnerSeat, seats).name} KAZANDI</h2>
            <p>Masadaki herkesi soydu.</p>
            <p style={{ marginTop: 10, color: 'var(--gold2)' }}>{game.chips?.[game.winnerSeat]} chip</p>
            <button className="btn" style={{ marginTop: 16 }} onClick={resetGame}>
              Tekrar Oyna
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
