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
import ThreeDWheel from './components/ThreeDWheel.jsx'
import CanvasWheel from './components/CanvasWheel.jsx'

const N = SEG.length
const SEG_ANGLE = 360 / N // 30 derece

/* ═══ SOYGUN ÇARKI · CSS Animasyonlu Çark Masası ═══
   Bahis yapıldığında .wheelbox elemanı için CSS tabanlı rotasyon
   animasyonu tetiklenir, yavaşlar ve rastgele kazanan dilimde durur. */
export default function Wheel({ seat = -1, seats = {}, meName, onAutoSeat }) {
  const game = useGame()
  const [chip, setChip] = useState(50)
  const [currentRotation, setCurrentRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [activeWinSeg, setActiveWinSeg] = useState(null)
  const [pointerFlick, setPointerFlick] = useState(false)
  const [spinStatusText, setSpinStatusText] = useState('')
  const [nearMissAlert, setNearMissAlert] = useState('')
  const [provablyProof, setProvablyProof] = useState(null)
  const [isProvablyModalOpen, setIsProvablyModalOpen] = useState(false)
  const [visualMode, setVisualMode] = useState('2d') // '2d' (Ultra akıcı) | '3d'
  const [voiceEnabled, setVoiceEnabled] = useState(!getVoiceMuted())
  const [customTauntText, setCustomTauntText] = useState('')

  const rotationRef = useRef(0)
  const lastSpunKeyRef = useRef('')
  const gRef = useRef(null); gRef.current = game
  const sRef = useRef(null); sRef.current = seats
  const isHost = seat >= 0 && hostSeat(seats) === seat
  const tickTimersRef = useRef([])

  const myBets = (seat >= 0 && game?.bets?.[seat]) ? game.bets[seat] : {}

  useEffect(() => { initGameIfMissing() }, [])

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
    // 😱 Near-Miss Algoritması:
    // Eğer kazanan dilim büyük çarpan dilimlerine (x11.64 veya x5.82) komşuysa,
    // duruş açısını dilimin tam sınırına (1-2 derece kala) denk getiriyoruz.
    // Bu, oyuncunun beyninde "kıl payı kaçtı" dopamin patlamasını tetikler.
    let microOffset = 0
    let isNearMiss = false
    let nearMissNotice = ''

    if (targetSegIndex === 5) {
      microOffset = (SEG_ANGLE / 2) - 3.2
      isNearMiss = true
      nearMissNotice = '😱 KIL PAYI KAÇTI! x11.64 sınırından 1 milimle döndü!'
    } else if (targetSegIndex === 7) {
      microOffset = -(SEG_ANGLE / 2) + 3.2
      isNearMiss = true
      nearMissNotice = '😱 KIL PAYI KAÇTI! x11.64 sınırından 1 milimle döndü!'
    } else if (targetSegIndex === 1) {
      microOffset = (SEG_ANGLE / 2) - 3.2
      isNearMiss = true
      nearMissNotice = '😱 ÇOK YAKINDI! x5.82 diliminin kenarında durdu!'
    } else if (targetSegIndex === 3) {
      microOffset = -(SEG_ANGLE / 2) + 3.2
      isNearMiss = true
      nearMissNotice = '😱 ÇOK YAKINDI! x5.82 diliminin kenarında durdu!'
    }

    const targetAngleMod = (360 - (targetSegIndex * SEG_ANGLE + SEG_ANGLE / 2 + microOffset)) % 360
    const currentMod = ((rotationRef.current % 360) + 360) % 360
    let diff = targetAngleMod - currentMod
    if (diff <= 0) diff += 360

    // En az 5 ila 6 tam tur (1800° - 2160°) dönerek kusursuz yavaşlama sağlar
    const extraRotations = (5 + Math.floor(Math.random() * 2)) * 360
    const finalAngle = rotationRef.current + extraRotations + diff
    rotationRef.current = finalAngle

    setIsSpinning(true)
    setActiveWinSeg(targetSegIndex)
    setCurrentRotation(finalAngle)
    setSpinStatusText(`🌀 ÇARK DÖNÜYOR... (Hedef: ${SEG[targetSegIndex].l})`)

    haptic('spin')
    spinningSound(SPIN_MS / 1000)
    startDeceleratingTicks(SPIN_MS)

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
      } else if (landedSeg.t === 'S') {
        playHeistSiren()
        haptic('steal')
        shake('heavy')
        VisualFX.triggerStealVortex(55)
        VisualFX.triggerChromaticAberration(500)
        VisualFX.triggerHeistSplash('POT', 'Tilki')
        speakStreetVoice('Ceplerinizi boşaltın lan, Tilki geldi soydu!', 'tilki')
      } else if (typeof landedSeg.t === 'number' && landedSeg.t >= 5) {
        playAirhorn()
        bassDrop()
        cashRegisterSound()
        playCoinCascade(12)
        haptic('jackpot')
        shake('heavy')
        VisualFX.triggerCoinExplosion(90, `x${landedSeg.t} JACKPOT!`)
        VisualFX.triggerNeonTracerBeams('#ffd700')
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

      if (onComplete) onComplete(targetSegIndex)
    }, SPIN_MS)
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
        const spinData = await authoritativeClient.requestSpin(N)
        const randomWinningSeg = spinData.winningSeg
        const proofData = {
          hash: spinData.serverSeedHash || spinData.rawHex || '',
          clientSeed: spinData.clientSeed,
          nonce: spinData.nonce,
          authoritative: spinData.isServerAuthoritative,
        }
        setProvablyProof(proofData)

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
      const spinData = await authoritativeClient.requestSpin(N)
      const randomWinningSeg = spinData.winningSeg
      const proofData = {
        hash: spinData.serverSeedHash || spinData.rawHex || '',
        clientSeed: spinData.clientSeed,
        nonce: spinData.nonce,
        authoritative: spinData.isServerAuthoritative,
      }
      setProvablyProof(proofData)

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
    ? '🌀'
    : activeWinSeg != null
      ? SEG[activeWinSeg].l
      : game.segResult != null
        ? SEG[game.segResult].l
        : '🥷'

  const totalMyBet = Object.values(myBets).reduce((a, b) => a + b, 0)

  return (
    <div className="wheelwrap">
      {/* 3D / 2D Görsel Motor Modu Değiştirici */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '420px', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--dim)', fontWeight: 700 }}>MOTOR:</span>
          <button
            className="btn ghost sm"
            style={{
              padding: '2px 8px',
              fontSize: '0.68rem',
              borderColor: visualMode === '3d' ? 'var(--gold)' : '#2a3346',
              color: visualMode === '3d' ? 'var(--gold2)' : 'var(--dim)',
              background: visualMode === '3d' ? '#1c2331' : 'transparent',
              fontWeight: 800,
            }}
            onClick={() => setVisualMode('3d')}
          >
            🎮 3D WebGL
          </button>
          <button
            className="btn ghost sm"
            style={{
              padding: '2px 8px',
              fontSize: '0.68rem',
              borderColor: visualMode === '2d' ? 'var(--gold)' : '#2a3346',
              color: visualMode === '2d' ? 'var(--gold2)' : 'var(--dim)',
              background: visualMode === '2d' ? '#1c2331' : 'transparent',
              fontWeight: 800,
            }}
            onClick={() => setVisualMode('2d')}
          >
            ⚡ 2D Vektör
          </button>
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
            {voiceEnabled ? '🔊 RACON SESİ: AÇIK' : '🔇 SES: KAPALI'}
          </button>
          <span style={{ fontSize: '0.68rem', color: '#00e575', fontWeight: 800 }}>
            {visualMode === '3d' ? '● 3D Modu' : '● Ultra Hızlı (Donmasız)'}
          </span>
        </div>
      </div>

      {/* Çark Sahnesi: 3D Three.js veya Yüksek Performanslı 2D Canvas */}
      <div className="wheel-stage" style={{ minHeight: '360px' }}>
        {visualMode === '3d' ? (
          <ThreeDWheel
            isSpinning={isSpinning}
            targetSegIndex={activeWinSeg}
            currentRotationDeg={currentRotation}
            onSelectSegment={(segIdx) => handlePlaceBet(segIdx, false)}
            myBets={myBets}
            activeWinSeg={activeWinSeg}
            spinDurationMs={SPIN_MS}
          />
        ) : (
          <>
            {/* İğne çarkın tepesinde sabit kalır */}
            <div className={`pointer ${pointerFlick ? 'flick' : ''}`} />

            {/* Yüksek Performanslı Canvas Çark (CSS GPU-Accelerated Transform) */}
            <CanvasWheel
              isSpinning={isSpinning}
              currentRotation={currentRotation}
              activeWinSeg={activeWinSeg}
              myBets={myBets}
              onSelectSegment={(segIdx) => handlePlaceBet(segIdx, false)}
              spinDurationMs={SPIN_MS}
            />

            {/* Merkez Göbek (Statik ve kristal netliğinde, çarkın dönüşünden bağımsız dik durur) */}
            <div className="hub">
              <div className="core">
                <div className="mult">{centerDisplayLabel}</div>
                <div className="sub">TUR {game.round || 1} · POT {game.pot || 0}</div>
              </div>
            </div>
          </>
        )}
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

              {/* Bot Durum Rozetleri */}
              {isTilt && <span className="tilt-badge">🔥 TILT</span>}
              {isSniper && <span className="sniper-badge">🎯 PUSUDA</span>}

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

      {/* Canlı Akış Feed */}
      <div className="feed">
        {feedLines.map((f, i) => (
          <div key={i} className={f.cls}>
            {f.m}
          </div>
        ))}
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
