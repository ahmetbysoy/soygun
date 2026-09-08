// gameSync.js — 4 koltuklu masayı Firebase üzerinden gerçek zamanlı senkronlar.
// Host = koltuklarda en erken oturan (ts en küçük). Sadece host faz geçirir,
// RNG belirler, boş koltuklara bot bahsi yazar. Herkes aynı `game` node'unu
// okuyup render eder — local state yok.
import { useEffect, useState } from 'react'
import { db, ref, onValue, set, get, update, runTransaction, ROOT } from './firebase.js'
import { getPool, adjPool, addPaid, adjJackpot, getJackpotPool } from './economy.js'
import { BotBrain, getFreshBotProfile, BOT_PERSONALITIES, calculatePlayerSkill, dynamicDifficultyAdjustment } from './core/botBrain.js'
import { authoritativeClient } from './core/authoritativeClient.js'
import { MathEngine } from './core/MathEngine.js'
import { revenueTracker } from './core/revenueTracker.js'
import { darkPatternEngine } from './core/DarkPatternAntiFraudEngine.js'

const botBrains = [new BotBrain('risk'), new BotBrain('safe'), new BotBrain('chaos'), new BotBrain('chaser')]

export const N_SEATS = 4
export const BET_S = 15
export const SPIN_MS = 4200
export const LOCK_MS = 1100
export const RESULT_MS = 3600

export const CANONICAL_SEGMENT_MAP = {
  2.33: 0,
  5.82: 2,
  11.64: 6,
  'S': 4,
}

// Payout ~%3 üniform house edge için (SINIF bazlı: p=adet/12). EV = p*mult-1 ≈ -0.03
// 🎨 "Maison Noir" paleti (v2): alaşımlı altın, bordo, zümrüt, ametist, obsidyen.
export const SEG = [
  { t: 2.33, c: '#A83A31', l: 'x2.33' }, { t: 0, c: '#0E1116', l: '💣' },
  { t: 5.82, c: '#C9A24B', l: 'x5.82' }, { t: 2.33, c: '#A83A31', l: 'x2.33' },
  { t: 'S', c: '#5B3E8F', l: '🥷' }, { t: 2.33, c: '#A83A31', l: 'x2.33' },
  { t: 11.64, c: '#1FA97C', l: 'x11.64' }, { t: 2.33, c: '#A83A31', l: 'x2.33' },
  { t: 5.82, c: '#C9A24B', l: 'x5.82' }, { t: 'S', c: '#5B3E8F', l: '🥷' },
  { t: 2.33, c: '#A83A31', l: 'x2.33' }, { t: 0, c: '#0E1116', l: '💣' },
]
const N = SEG.length
const rnd = n => Math.floor(Math.random() * n)

export const BOT_FALLBACK = [
  { name: 'VEGA', ava: '🥷', style: 'risk' },
  { name: 'KURT', ava: '🐺', style: 'safe' },
  { name: 'TİLKİ', ava: '🦊', style: 'chaos' },
  { name: 'ZEHRA', ava: '🦂', style: 'chaser' },
]

export function seatInfo(i, seats, game = null) {
  const s = seats?.[i]
  if (s) return { name: s.name, ava: '😎', bot: false }
  if (game?.botProfiles?.[i]) {
    return {
      name: game.botProfiles[i].name,
      ava: game.botProfiles[i].ava || game.botProfiles[i].avatar || '🥷',
      title: game.botProfiles[i].title,
      style: game.botProfiles[i].style,
      bot: true
    }
  }
  if (botBrains[i]?.profile) {
    return {
      name: botBrains[i].profile.name,
      ava: botBrains[i].profile.avatar,
      title: botBrains[i].profile.title,
      style: botBrains[i].profile.id,
      bot: true
    }
  }
  return { ...BOT_FALLBACK[i], bot: true }
}

// ── server saatiyle senkron "now" — client saat kaymasını düzeltir ──
let offset = 0
onValue(ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0 })
export const now = () => Date.now() + offset

const gRef = () => ref(db, `${ROOT}/table/game`)

export function useGame() {
  const [game, setGame] = useState(null)
  useEffect(() => onValue(gRef(), s => setGame(s.val())), [])
  return game
}

export function hostSeat(seats) {
  let best = -1, bestTs = Infinity
  for (let i = 0; i < N_SEATS; i++) {
    const s = seats[i]
    if (s && s.ts < bestTs) { bestTs = s.ts; best = i }
  }
  return best
}

// ── Parası Biten Botları Yenileme ve Masaya Taze Kumarbaz Çağırma Motoru ──
export async function replenishBankruptBots(game, seats) {
  if (!game) return
  const chips = { ...(game.chips || {}) }
  const out = { ...(game.out || {}) }
  const botProfiles = { ...(game.botProfiles || {}) }
  let changed = false
  const activeBotNames = []

  for (let i = 0; i < N_SEATS; i++) {
    if (botProfiles[i]?.name) activeBotNames.push(botProfiles[i].name)
  }

  for (let i = 0; i < N_SEATS; i++) {
    if (seats[i]) continue // Gerçek oyuncu koltuğu dokunulmaz
    const curChips = chips[i] ?? 0
    const isOut = out[i] === true

    // Eğer bot iflas ettiyse (bakiye < 10) veya out olduysa yerine yeni gangster botu masaya sür!
    if (curChips < 10 || isOut || !botProfiles[i]) {
      const newProfile = getFreshBotProfile(activeBotNames)
      activeBotNames.push(newProfile.name)

      const freshBankroll = Math.floor(1200 + Math.random() * 2000) // 1,200 - 3,200 çip
      chips[i] = freshBankroll
      out[i] = false
      botProfiles[i] = {
        name: newProfile.name,
        ava: newProfile.avatar,
        avatar: newProfile.avatar,
        title: newProfile.title,
        style: newProfile.id,
      }
      botBrains[i] = new BotBrain(newProfile.id)
      changed = true

      const entranceMsg = newProfile.entrance || `${newProfile.name} masaya çöktü!`
      log(`👑 YENİ RAKİP: ${newProfile.name} (${newProfile.title}) masaya ${freshBankroll} çiple çöktü! "${entranceMsg}"`, 'g')
      broadcastBubble(i, entranceMsg, 'win')
    }
  }

  if (changed) {
    const patch = { chips, out, botProfiles }
    if (game.winnerSeat != null) {
      patch.winnerSeat = null
    }
    await update(gRef(), patch)
  }
}

// ── Masadaki Tüm Botları Zorla Yenileme (Kullanıcı / Admin Tetikleyicisi) ──
export async function forceReloadBots(game, seats) {
  const chips = { ...(game?.chips || {}) }
  const out = { ...(game?.out || {}) }
  const botProfiles = {}
  const activeBotNames = []

  for (let i = 0; i < N_SEATS; i++) {
    if (seats[i]) continue
    const newProfile = getFreshBotProfile(activeBotNames)
    activeBotNames.push(newProfile.name)
    const freshBankroll = Math.floor(1500 + Math.random() * 2000)
    chips[i] = freshBankroll
    out[i] = false
    botProfiles[i] = {
      name: newProfile.name,
      ava: newProfile.avatar,
      avatar: newProfile.avatar,
      title: newProfile.title,
      style: newProfile.id,
    }
    botBrains[i] = new BotBrain(newProfile.id)
    const entranceMsg = newProfile.entrance || `${newProfile.name} masaya çöktü!`
    log(`🔥 MASAYA YENİ KAN GELDİ: ${newProfile.name} (${newProfile.title}) ${freshBankroll} çiple oturdu!`, 'g')
    broadcastBubble(i, entranceMsg, 'win')
  }

  const patch = { chips, out, botProfiles, winnerSeat: null, bets: {} }
  await update(gRef(), patch)
}

// oyun node'u yoksa ilk defa kurar.
export async function initGameIfMissing() {
  const s = await get(gRef())
  if (s.exists()) return
  const chips = {}, out = {}, botProfiles = {}
  const activeBotNames = []

  for (let i = 0; i < N_SEATS; i++) {
    const profile = getFreshBotProfile(activeBotNames)
    activeBotNames.push(profile.name)
    chips[i] = Math.floor(1200 + Math.random() * 1500)
    out[i] = false
    botProfiles[i] = {
      name: profile.name,
      ava: profile.avatar,
      avatar: profile.avatar,
      title: profile.title,
      style: profile.id,
    }
    botBrains[i] = new BotBrain(profile.id)
  }

  return set(gRef(), {
    phase: 'bet', round: 1, phaseUntil: now() + BET_S * 1000,
    bets: {}, chips, out, botProfiles, segResult: null, winnerSeat: null, feed: {},
  })
}

export function log(msg, cls = '') {
  update(ref(db, `${ROOT}/table/game/feed`), { [now()]: { m: msg, cls } })
}

// ── Canlı Konuşma Balonu & Racon Yayınlama ──
export function broadcastBubble(seat, text, type = 'normal') {
  update(ref(db, `${ROOT}/table/game/chatBubbles`), {
    [seat]: { text, ts: now(), type }
  })
}

export function sendPlayerTaunt(seat, text, playerName = 'Sen') {
  broadcastBubble(seat, text, 'player')
  log(`🗣️ ${playerName}: "${text}"`, 'y')
}

// ── bahis yaz (herkes kendi koltuğu için çağırır) ──
export function placeBet(seat, seg, amount) {
  return runTransaction(ref(db, `${ROOT}/table/game/bets/${seat}/${seg}`), cur => (cur || 0) + amount)
}
export function clearMyBets(seat) {
  return update(ref(db, `${ROOT}/table/game/bets`), { [seat]: null })
}

// ── SADECE HOST çağırır: bot bahsi enjekte et ──
export function injectBotBets(game, seats) {
  const timeLeftMs = Math.max(0, (game.phaseUntil || 0) - now())
  const botStatesPatch = {}

  // Gerçek insan oyuncunun koltuğunu bul
  const realPlayerSeat = seats.findIndex(s => s != null)
  let playerTiltInfo = { tiltScore: 0, isPlayerTilted: false, predatoryMultiplier: 1.0 }
  let playerSkill = { skillScore: 10, gamesPlayed: 0, winCount: 0, winRate: 0, netProfit: 0, streak: 0, tierName: 'Yeni Gelen (Çaylak)', tierBadge: '🐣' }
  let dda = dynamicDifficultyAdjustment(10)

  if (realPlayerSeat !== -1) {
    if (botBrains[0]) {
      playerTiltInfo = botBrains[0].calculatePlayerTiltScore(realPlayerSeat, game, seats)
    }
    playerSkill = calculatePlayerSkill(realPlayerSeat, game, seats)
    dda = dynamicDifficultyAdjustment(playerSkill, null, game)
  }

  const realPlayerBets = realPlayerSeat !== -1 ? (game.bets?.[realPlayerSeat] || {}) : {}

  for (let i = 0; i < N_SEATS; i++) {
    if (seats[i]) continue                       // gerçek oyuncu → bot değil
    
    // Eğer botun parası bitmişse anında yenileme tetikle
    if ((game.chips?.[i] ?? 0) < 10 || game.out?.[i]) {
      replenishBankruptBots(game, seats)
      continue
    }

    const brain = botBrains[i] || new BotBrain('risk')

    // Chaser/Sniper bot son 3 saniyede %85 oranında pusuya yatar
    const isSniperTime = brain.style === 'chaser' && timeLeftMs <= Math.max(2500, (dda.snipeUrgency || 0.5) * 4000)
    const isTilt = brain.checkTiltStatus()
    const isPredatory = playerTiltInfo.isPlayerTilted || dda.level === 'CARTEL_HELL'

    botStatesPatch[i] = {
      isTilt,
      isSniper: isSniperTime,
      isPredatory,
      style: brain.style,
      name: game.botProfiles?.[i]?.name || brain.profile.name,
      title: game.botProfiles?.[i]?.title || brain.profile.title,
      avatar: game.botProfiles?.[i]?.ava || brain.profile.avatar,
      predatoryMult: playerTiltInfo.predatoryMultiplier.toFixed(2),
      ddaLevel: dda.level,
    }

    if (!isSniperTime && !isTilt && !isPredatory && Math.random() >= (0.38 * dda.botAggression)) continue

    const spent = Object.values(game.bets?.[i] || {}).reduce((a, x) => a + x, 0)
    const bankroll = (game.chips?.[i] ?? 0) - spent
    if (bankroll < 10) continue

    const segIdx = brain.pickTargetSegment(SEG, game.history || [], timeLeftMs, isPredatory, dda, realPlayerBets)
    const targetSeg = SEG[segIdx]
    const canonicalIdx = targetSeg ? (CANONICAL_SEGMENT_MAP[targetSeg.t] ?? segIdx) : segIdx
    const amt = Math.min(
      brain.calcDynamicBetSize(bankroll, targetSeg || SEG[canonicalIdx], timeLeftMs, game.history || [], playerTiltInfo.predatoryMultiplier, dda),
      bankroll
    )

    if (amt > 0) {
      placeBet(i, canonicalIdx, amt)
      
      // Taunt ve Konuşma Balonları (DDA ile senkron - Tek bot konuşur, ekran boğulmaz)
      if (!botStatesPatch._speechChosen) {
        if (dda.level === 'HONEYMOON' && Math.random() < 0.20) {
          const taunt = brain.getRandomTaunt('rookie_praise')
          log(`🍯 ${taunt}`, 'g')
          broadcastBubble(i, brain.currentBubble || '🐣 Acemiye yol verin!', 'chat')
          botStatesPatch._speechChosen = true
        } else if (dda.level === 'CARTEL_HELL' && Math.random() < 0.35) {
          const taunt = brain.getRandomTaunt('cartel_crush')
          log(`☠️ ${taunt}`, 'r')
          broadcastBubble(i, brain.currentBubble || '👑 KARTEL MASAYA ÇÖKTÜ!', 'predatory')
          botStatesPatch._speechChosen = true
        } else if (isPredatory && Math.random() < 0.35) {
          const taunt = brain.getRandomTaunt('predatory')
          log(`🦈 ${taunt}`, 'r')
          broadcastBubble(i, brain.currentBubble || '🦈 KOKUNU ALDIM, BİTTİN SEN!', 'predatory')
          botStatesPatch._speechChosen = true
        } else if (isSniperTime && Math.random() < 0.6) {
          const taunt = brain.getRandomTaunt('snipe')
          log(taunt, 'y')
          broadcastBubble(i, brain.currentBubble || '🎯 PUSUYA DÜŞTÜNÜZ!', 'snipe')
          botStatesPatch._speechChosen = true
        } else if (isTilt && Math.random() < 0.25) {
          const taunt = brain.getRandomTaunt('tilt')
          log(taunt, 'r')
          broadcastBubble(i, brain.currentBubble || '🔥 HER ŞEYİ MASAYA VURUYORUM!', 'tilt')
          botStatesPatch._speechChosen = true
        } else if (Math.random() < 0.08) {
          const taunt = brain.getRandomTaunt('chat')
          log(taunt, 'p')
          broadcastBubble(i, brain.currentBubble, 'chat')
          botStatesPatch._speechChosen = true
        }
      }
    }
  }

  // DDA Durumunu ve Bot Durumlarını masaya patchle
  const fullPatch = {
    ...botStatesPatch,
  }
  update(ref(db, `${ROOT}/table/game/botStates`), fullPatch).catch(() => {})
  update(ref(db, `${ROOT}/table/game/ddaState`), dda).catch(() => {})
}

// ── SADECE HOST çağırır: faz süresi dolduysa bir sonraki faza geç ──
// runTransaction ile `phase` alanı korunuyor → iki client aynı anda host
// sanıp çift geçiş yapamaz (reconnect race'ine karşı güvenlik).
export async function advancePhase(game, seats) {
  if (!game || now() < game.phaseUntil) return
  if (game.phase === 'bet') return lockPhase()
  if (game.phase === 'lock') return spinPhase(game, seats)
  if (game.phase === 'spin') {
    const pool = await getPool()
    return settlePhase(game, pool, seats)
  }
  if (game.phase === 'result') return startRound(game, seats)
}

function lockPhase() {
  return runTransaction(gRef(), g => {
    if (!g || g.phase !== 'bet') return
    let pot = 0
    const chips = { ...g.chips }
    for (let i = 0; i < N_SEATS; i++) {
      const t = Object.values(g.bets?.[i] || {}).reduce((a, x) => a + x, 0)
      chips[i] = (chips[i] || 0) - t; pot += t
    }
    g.chips = chips; g.pot = pot; g.phase = 'lock'; g.phaseUntil = now() + LOCK_MS
    return g
  })
}

async function spinPhase(game, seats = []) {
  // Masadaki bahis dağılımı ve DDA parametrelerini hesapla
  const totalPot = game?.pot || 0
  let maxSingleBet = 0
  const betsBySegment = {}
  for (let i = 0; i < N_SEATS; i++) {
    for (let j = 0; j < N; j++) {
      const b = game?.bets?.[i]?.[j] || 0
      if (b > 0) {
        betsBySegment[j] = (betsBySegment[j] || 0) + b
        if (b > maxSingleBet) maxSingleBet = b
      }
    }
  }

  const realPlayerSeat = Array.isArray(seats) ? seats.findIndex(s => s != null) : -1
  const playerBets = (realPlayerSeat !== -1 && game?.bets?.[realPlayerSeat]) ? game.bets[realPlayerSeat] : {}
  const playerSkill = calculatePlayerSkill(realPlayerSeat, game, seats)
  const dda = dynamicDifficultyAdjustment(playerSkill, null, game)

  const spinData = await authoritativeClient.requestSpin(N, {
    totalPot,
    maxSingleBet,
    betsBySegment,
    playerBets,
    dda,
  })

  const winIdx = spinData.winningSeg
  return runTransaction(gRef(), g => {
    if (!g || g.phase !== 'lock') return
    g.segResult = winIdx
    g.ddaState = dda
    g.provablyProof = {
      serverSeedHash: spinData.serverSeedHash,
      clientSeed: spinData.clientSeed,
      nonce: spinData.nonce,
      rawHex: spinData.rawHex,
      authoritative: spinData.isServerAuthoritative,
      ddaLevel: spinData.ddaLevel || dda.level,
    }
    g.phase = 'spin'
    g.phaseUntil = now() + SPIN_MS + 250
    return g
  })
}

// Dinamik RTP: çarpan ödemesinin "pot üstü" kısmı PRIZE POOL'dan gelir.
// Pool yetmezse çarpan otomatik küçülür → kasa asla negatife düşmez.
// BOMB → kasa kazanır, pot prize pool'a akar. STEAL → oyuncular arası (pool nötr).
// Her bahsin %1'i PROGRESİF JACKPOT havuzuna beslenir.
async function settlePhase(game, pool, seats = {}) {
  const idx = game.segResult, seg = SEG[idx]
  const chips = { ...game.chips }, out = { ...game.out }
  let poolDelta = 0, paidOut = 0, effMult = seg.t
  const pot = game.pot || 0

  // 🎰 Her bahisten %1 ortak progresif jackpot havuzuna aktar
  if (pot > 0) {
    const jackpotCut = Math.max(1, Math.round(pot * 0.01))
    adjJackpot(jackpotCut)
  }

  // bir koltuğun verilen çarpan SINIFINDAKI tüm dilimlere koyduğu toplam bahis
  const seatOnClass = (i, cls) => {
    let s = 0
    for (let j = 0; j < SEG.length; j++) if (SEG[j].t === cls) s += game.bets?.[i]?.[j] || 0
    return s
  }

  // Her koltuğun toplam yatırdığı bahis
  const seatTotalBet = (i) => {
    return Object.values(game.bets?.[i] || {}).reduce((a, x) => a + x, 0)
  }

  const seatWins = {}

  if (typeof seg.t === 'number' && seg.t > 0) {
    const cls = seg.t
    let totalB = 0; const per = {}
    for (let i = 0; i < N_SEATS; i++) { per[i] = seatOnClass(i, cls); totalB += per[i] }
    let mult = cls, over = totalB * (mult - 1)
    if (over > pool) { mult = 1 + pool / Math.max(1, totalB); if (mult < 1) mult = 1; over = totalB * (mult - 1) }
    for (let i = 0; i < N_SEATS; i++) {
      if (per[i] > 0) {
        let win = Math.round(per[i] * mult)
        // 💎 Büyük Vuruş (x11.64): Progresif Jackpot Havuzundan %15 Ekstra Bonus Patlar!
        if (cls >= 11) {
          const curJackpot = await getJackpotPool()
          if (curJackpot > 50) {
            const jackpotBonus = Math.round(curJackpot * 0.15)
            win += jackpotBonus
            adjJackpot(-jackpotBonus)
            log(`💥 JACKPOT PATLADI! ${seats[i]?.name || `Koltuk ${i + 1}`} +${jackpotBonus} chip ekstra ödül aldı!`, 'g')
          }
        }
        chips[i] = (chips[i] || 0) + win
        paidOut += win
        seatWins[i] = win

        // 🌟 Sadece gerçek kazanç durumunda sosyal kanıt tetikle
        darkPatternEngine.recordRealWin({
          user: seats[i]?.name || game.botProfiles?.[i]?.name || `Koltuk ${i + 1}`,
          amount: win,
          type: cls >= 11 ? 'JACKPOT' : win >= 2500 ? 'MEGA_VURGUN' : 'WIN',
        })
      }
    }
    poolDelta = -over; effMult = mult
  } else if (seg.t === 'S') {
    const thieves = []
    for (let i = 0; i < N_SEATS; i++) if (!out[i] && seatOnClass(i, 'S') > 0) thieves.push(i)
    const rate = thieves.length > 1 ? .1 : .15
    thieves.forEach(th => {
      let stolenTotal = 0
      for (let o = 0; o < N_SEATS; o++) {
        if (o === th || out[o]) continue
        const take = Math.floor((chips[o] || 0) * rate); chips[o] -= take; chips[th] = (chips[th] || 0) + take
        stolenTotal += take
      }
      if (stolenTotal > 0) {
        darkPatternEngine.recordRealWin({
          user: seats[th]?.name || game.botProfiles?.[th]?.name || `Koltuk ${th + 1}`,
          amount: stolenTotal,
          type: 'MEGA_VURGUN',
        })
      }
    })
  } else { poolDelta += pot }   // 💣 BOMB → kasa

  // 👑 Gerçek İnsan Oyuncuların VIP Hacim & Rakeback Güncellemesi ve Bakiye Senkronizasyonu
  let bestTauntCandidate = null

  for (let i = 0; i < N_SEATS; i++) {
    const seatObj = seats[i]
    if (seatObj && seatObj.uid) {
      const betAmt = seatTotalBet(i)
      const winAmt = seatWins[i] || 0
      const netLoss = Math.max(0, betAmt - winAmt)
      const uRef = ref(db, `${ROOT}/users/${seatObj.uid}`)
      runTransaction(uRef, u => {
        if (!u) return u
        u.balance = chips[i] != null ? chips[i] : (u.balance || 0)
        u.total_wagered = (u.total_wagered || 0) + betAmt
        if (netLoss > 0) {
          const vipTier = MathEngine.getVipTier(u.total_wagered)
          const rakeback = MathEngine.calculateRakeback(netLoss, vipTier.id)
          u.locked_rakeback = (u.locked_rakeback || 0) + rakeback
          u.accumulated_rakeback = (u.locked_rakeback || 0) + (u.unlocked_rakeback || 0)
        }
        return u
      }).catch(() => {})
    } else {
      // 🤖 Bot Zekası Sonuç Kaydı & Tilt / Galibiyet / Soygun / Bomba Tepkisi
      const brain = botBrains[i]
      if (brain) {
        const betAmt = seatTotalBet(i)
        const winAmt = seatWins[i] || 0
        const won = winAmt > betAmt
        const taunt = brain.recordRoundResult(won, winAmt, Math.max(0, betAmt - winAmt), seg.t)
        if (taunt && (brain.isTilt || won || Math.random() < 0.65)) {
          const colorCls = brain.isTilt ? 'r' : (seg.t === 'S' && won ? 'p' : (won ? 'g' : 'r'))
          log(taunt, colorCls)
          const priority = (seg.t === 'S' && won) ? 4 : (brain.isTilt ? 3 : (won ? 2 : 1))
          if (!bestTauntCandidate || priority > bestTauntCandidate.priority) {
            bestTauntCandidate = {
              seat: i,
              text: brain.currentBubble || taunt,
              type: brain.isTilt ? 'tilt' : (won ? 'win' : 'loss'),
              priority,
            }
          }
        }
      }
    }
  }

  // Sadece en dikkat çekici tek bir bot masaya balon fırlatır (Balon karmaşasını önler)
  if (bestTauntCandidate) {
    broadcastBubble(bestTauntCandidate.seat, bestTauntCandidate.text, bestTauntCandidate.type)
  }

  for (let i = 0; i < N_SEATS; i++) if ((chips[i] || 0) <= 0) { chips[i] = 0; out[i] = true }
  const alive = [0, 1, 2, 3].filter(i => !out[i])
  const updatedHistory = [{ round: game.round || 1, seg: { l: seg.l, t: seg.t }, idx }, ...(game.history || [])].slice(0, 10)
  const patch = { chips, out, phase: 'result', phaseUntil: now() + RESULT_MS, lastMult: effMult, history: updatedHistory }
  if (alive.length === 1) patch.winnerSeat = alive[0]
  await update(gRef(), patch)
  if (poolDelta) adjPool(Math.round(poolDelta))
  if (paidOut) addPaid(paidOut)

  // 🏦 Finansal Deftere Gerçek Zamanlı Gelir / Gider Kaydı (Inflow vs Outflow)
  if (pot > 0) {
    revenueTracker.recordTransaction({
      type: 'BET_INFLOW',
      chips: pot,
      actorId: 'table_pot',
      actorName: `Tur #${game.round || 1} Masası`,
      description: `Tur #${game.round || 1} masaya konan toplam bahis hacmi`,
      roundId: game.round || 1,
    }).catch(() => {})
  }
  if (paidOut > 0) {
    revenueTracker.recordTransaction({
      type: 'PAYOUT_OUTFLOW',
      chips: paidOut,
      actorId: 'payout_engine',
      actorName: 'Kasa Ödeme Motoru',
      description: `Tur #${game.round || 1} kazananlara dağıtılan ödül (${seg.l})`,
      roundId: game.round || 1,
    }).catch(() => {})
  }

  log(`🎯 T${game.round}: ${seg.l}${effMult !== seg.t ? ` →x${effMult.toFixed(2)}` : ''} · pot ${game.pot || 0}`)
}

async function startRound(game, seats) {
  // Parası biten botların yerine taze parayla yeni gangster botlar girer
  await replenishBankruptBots(game, seats)

  return runTransaction(gRef(), g => {
    if (!g || g.phase !== 'result') return
    g.round = (g.round || 1) + 1
    g.bets = {}
    g.segResult = null
    g.winnerSeat = null
    g.phase = 'bet'
    g.phaseUntil = now() + BET_S * 1000
    return g
  })
}

export function resetGame() {
  return update(ref(db, `${ROOT}/table`), { game: null })
}

// Bahis konduğunda doğrudan çarkı çeviren ve güvenli kazanan dilimi belirleyen motor
export async function triggerSpinWithBet(seat, segIdx, amount, customWinSeg, customProof) {
  let winIdx = customWinSeg
  let proof = customProof || null

  if (winIdx == null || winIdx < 0) {
    const authData = await authoritativeClient.requestSpin(N)
    winIdx = authData.winningSeg
    proof = {
      serverSeedHash: authData.serverSeedHash,
      clientSeed: authData.clientSeed,
      nonce: authData.nonce,
      rawHex: authData.rawHex,
      authoritative: authData.isServerAuthoritative,
    }
  }
  
  if (seat >= 0 && segIdx != null && amount > 0) {
    await runTransaction(ref(db, `${ROOT}/table/game/bets/${seat}/${segIdx}`), cur => (cur || 0) + amount)
  }

  await runTransaction(gRef(), g => {
    if (!g) return
    let pot = 0
    const chips = { ...g.chips }
    for (let i = 0; i < N_SEATS; i++) {
      const t = Object.values(g.bets?.[i] || {}).reduce((a, x) => a + x, 0)
      chips[i] = (chips[i] || 0) - t
      pot += t
    }
    g.chips = chips
    g.pot = pot
    g.segResult = winIdx
    if (proof) g.provablyProof = proof
    g.phase = 'spin'
    g.phaseUntil = now() + SPIN_MS + 250
    return g
  })

  return winIdx
}
