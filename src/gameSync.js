// gameSync.js — 4 koltuklu masayı Firebase üzerinden gerçek zamanlı senkronlar.
// Host = koltuklarda en erken oturan (ts en küçük). Sadece host faz geçirir,
// RNG belirler, boş koltuklara bot bahsi yazar. Herkes aynı `game` node'unu
// okuyup render eder — local state yok.
import { useEffect, useState } from 'react'
import { db, ref, onValue, set, get, update, runTransaction, ROOT } from './firebase.js'
import { getPool, adjPool, addPaid, adjJackpot, getJackpotPool } from './economy.js'
import { BotBrain } from './core/botBrain.js'
import { authoritativeClient } from './core/authoritativeClient.js'
import { MathEngine } from './core/MathEngine.js'

const botBrains = [new BotBrain('risk'), new BotBrain('safe'), new BotBrain('chaos'), new BotBrain('chaser')]

export const N_SEATS = 4
export const BET_S = 15
export const SPIN_MS = 4200
export const LOCK_MS = 1100
export const RESULT_MS = 3600

// Payout ~%3 üniform house edge için (SINIF bazlı: p=adet/12). EV = p*mult-1 ≈ -0.03
export const SEG = [
  { t: 2.33, c: '#e23b3b', l: 'x2.33' }, { t: 0, c: '#1a1d24', l: '💣' },
  { t: 5.82, c: '#f5b301', l: 'x5.82' }, { t: 2.33, c: '#e23b3b', l: 'x2.33' },
  { t: 'S', c: '#a05ce6', l: '🥷' }, { t: 2.33, c: '#e23b3b', l: 'x2.33' },
  { t: 11.64, c: '#00c26e', l: 'x11.64' }, { t: 2.33, c: '#e23b3b', l: 'x2.33' },
  { t: 5.82, c: '#f5b301', l: 'x5.82' }, { t: 'S', c: '#a05ce6', l: '🥷' },
  { t: 2.33, c: '#e23b3b', l: 'x2.33' }, { t: 0, c: '#1a1d24', l: '💣' },
]
const N = SEG.length
const rnd = n => Math.floor(Math.random() * n)

export const BOT_FALLBACK = [
  { name: 'VEGA', ava: '🥷', style: 'risk' },
  { name: 'KURT', ava: '🐺', style: 'safe' },
  { name: 'TİLKİ', ava: '🦊', style: 'chaos' },
  { name: 'ZEHRA', ava: '🦂', style: 'chaser' },
]

export function seatInfo(i, seats) {
  const s = seats[i]
  if (s) return { name: s.name, ava: '😎', bot: false }
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

// oyun node'u yoksa ilk defa kurar.
// 🔴 runTransaction KULLANMA: cache boşken cur=null gelir ve "var olan" oyunu
// ezerdik. get() ile gerçek "yok mu" kontrolü yap, sonra set.
export async function initGameIfMissing() {
  const s = await get(gRef())
  if (s.exists()) return
  const chips = {}, out = {}
  for (let i = 0; i < N_SEATS; i++) { chips[i] = 1000; out[i] = false }
  return set(gRef(), {
    phase: 'bet', round: 1, phaseUntil: now() + BET_S * 1000,
    bets: {}, chips, out, segResult: null, winnerSeat: null, feed: {},
  })
}

export function log(msg, cls = '') {
  update(ref(db, `${ROOT}/table/game/feed`), { [now()]: { m: msg, cls } })
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

  for (let i = 0; i < N_SEATS; i++) {
    if (seats[i]) continue                       // gerçek oyuncu → bot değil
    if (game.out?.[i]) continue

    const brain = botBrains[i]

    // Chaser/Sniper bot son 3 saniyede %80 oranında baskı kurar
    const isSniperTime = brain.style === 'chaser' && timeLeftMs <= 3200
    if (!isSniperTime && Math.random() >= 0.35) continue

    const spent = Object.values(game.bets?.[i] || {}).reduce((a, x) => a + x, 0)
    const bankroll = (game.chips?.[i] ?? 0) - spent
    if (bankroll < 10) continue

    const segIdx = brain.pickTargetSegment(SEG, game.history || [], timeLeftMs)
    const amt = Math.min(brain.calcDynamicBetSize(bankroll, SEG[segIdx], timeLeftMs, game.history || []), bankroll)

    if (amt > 0) {
      placeBet(i, segIdx, amt)
      // Sniper son saniye taunt'u
      if (isSniperTime && Math.random() < 0.4) {
        log(brain.getRandomTaunt('snipe'), 'y')
      }
    }
  }
}

// ── SADECE HOST çağırır: faz süresi dolduysa bir sonraki faza geç ──
// runTransaction ile `phase` alanı korunuyor → iki client aynı anda host
// sanıp çift geçiş yapamaz (reconnect race'ine karşı güvenlik).
export async function advancePhase(game, seats) {
  if (!game || now() < game.phaseUntil) return
  if (game.phase === 'bet') return lockPhase()
  if (game.phase === 'lock') return spinPhase()
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

async function spinPhase() {
  const spinData = await authoritativeClient.requestSpin(N)
  const winIdx = spinData.winningSeg
  return runTransaction(gRef(), g => {
    if (!g || g.phase !== 'lock') return
    g.segResult = winIdx
    g.provablyProof = {
      serverSeedHash: spinData.serverSeedHash,
      clientSeed: spinData.clientSeed,
      nonce: spinData.nonce,
      rawHex: spinData.rawHex,
      authoritative: spinData.isServerAuthoritative,
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
      }
    }
    poolDelta = -over; effMult = mult
  } else if (seg.t === 'S') {
    const thieves = []
    for (let i = 0; i < N_SEATS; i++) if (!out[i] && seatOnClass(i, 'S') > 0) thieves.push(i)
    const rate = thieves.length > 1 ? .1 : .15
    thieves.forEach(th => {
      for (let o = 0; o < N_SEATS; o++) {
        if (o === th || out[o]) continue
        const take = Math.floor((chips[o] || 0) * rate); chips[o] -= take; chips[th] = (chips[th] || 0) + take
      }
    })
  } else { poolDelta += pot }   // 💣 BOMB → kasa

  // 👑 Gerçek İnsan Oyuncuların VIP Hacim & Rakeback Güncellemesi
  for (let i = 0; i < N_SEATS; i++) {
    const seatObj = seats[i]
    if (seatObj && seatObj.uid) {
      const betAmt = seatTotalBet(i)
      if (betAmt > 0) {
        const winAmt = seatWins[i] || 0
        const netLoss = Math.max(0, betAmt - winAmt)
        const uRef = ref(db, `${ROOT}/users/${seatObj.uid}`)
        runTransaction(uRef, u => {
          if (!u) return u
          u.total_wagered = (u.total_wagered || 0) + betAmt
          if (netLoss > 0) {
            const vipTier = MathEngine.getVipTier(u.total_wagered)
            const rakeback = MathEngine.calculateRakeback(netLoss, vipTier.id)
            u.accumulated_rakeback = (u.accumulated_rakeback || 0) + rakeback
          }
          return u
        }).catch(() => {})
      }
    } else {
      // 🤖 Bot Zekası Sonuç Kaydı & Tilt / Galibiyet Tepkisi
      const brain = botBrains[i]
      if (brain) {
        const betAmt = seatTotalBet(i)
        const winAmt = seatWins[i] || 0
        const won = winAmt > betAmt
        const taunt = brain.recordRoundResult(won, winAmt, Math.max(0, betAmt - winAmt))
        if (taunt && (brain.isTilt || Math.random() < 0.35)) {
          log(taunt, brain.isTilt ? 'r' : 'g')
        }
      }
    }
  }

  for (let i = 0; i < N_SEATS; i++) if ((chips[i] || 0) <= 0) { chips[i] = 0; out[i] = true }
  const alive = [0, 1, 2, 3].filter(i => !out[i])
  const updatedHistory = [{ round: game.round || 1, seg: { l: seg.l, t: seg.t }, idx }, ...(game.history || [])].slice(0, 10)
  const patch = { chips, out, phase: 'result', phaseUntil: now() + RESULT_MS, lastMult: effMult, history: updatedHistory }
  if (alive.length === 1) patch.winnerSeat = alive[0]
  await update(gRef(), patch)
  if (poolDelta) adjPool(Math.round(poolDelta))
  if (paidOut) addPaid(paidOut)
  log(`🎯 T${game.round}: ${seg.l}${effMult !== seg.t ? ` →x${effMult.toFixed(2)}` : ''} · pot ${game.pot || 0}`)
}

function startRound(game, seats) {
  if (game.winnerSeat != null) return             // oyun bitti, yeni tur yok
  return runTransaction(gRef(), g => {
    if (!g || g.phase !== 'result') return
    g.round = (g.round || 1) + 1; g.bets = {}; g.segResult = null
    g.phase = 'bet'; g.phaseUntil = now() + BET_S * 1000
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
