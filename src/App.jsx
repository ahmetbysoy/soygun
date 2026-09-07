import { useEffect, useRef, useState } from 'react'
import Wheel from './Wheel.jsx'
import {
  db, ROOT, ref, onValue, set, update, get, remove,
  onDisconnect, runTransaction, identity,
} from './firebase.js'
import { useEcon, getUserLoyalty, claimDailyStreak, claimRakeback } from './economy.js'
import { useGame } from './gameSync.js'
import { walletManager } from './wallet.js'
import ShopModal from './components/ShopModal.jsx'
import LoyaltyModal from './components/LoyaltyModal.jsx'
import FinancialMetricsModal from './components/FinancialMetricsModal.jsx'
import RealTimeRevenueDashboard from './components/RealTimeRevenueDashboard.jsx'
import WhaleNotificationToast from './components/WhaleNotificationToast.jsx'
import SunkCostModal from './components/SunkCostModal.jsx'
import ResurrectionModal from './components/ResurrectionModal.jsx'
import { uxManager } from './core/UXManager.js'

const BUY_IN = 25         // chip — buy-in koltuk bedeli
const START_BAL = 1500     // başlangıç chip sermayesi
const SEATS = 4

export default function App() {
  const me = useRef(identity()).current
  const [bal, setBal] = useState(null)
  const [seats, setSeats] = useState({})
  const [specs, setSpecs] = useState({})
  const [likes, setLikes] = useState({})
  const [feed, setFeed] = useState([])
  const [screen, setScreen] = useState('lobby')   // lobby | game
  const [mySeat, setMySeat] = useState(-1)
  const [walletState, setWalletState] = useState(walletManager.getState())
  const [hearts, setHearts] = useState([])
  const [connecting, setConnecting] = useState(false)
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false)
  const [isMetricsOpen, setIsMetricsOpen] = useState(false)
  const [isRevenueDashboardOpen, setIsRevenueDashboardOpen] = useState(false)
  const [loyaltyData, setLoyaltyData] = useState(null)
  const [sunkCostWarning, setSunkCostWarning] = useState(null)
  const [resurrectionOffer, setResurrectionOffer] = useState(null)
  const econ = useEcon()
  const game = useGame()

  const refreshLoyalty = async () => {
    if (me?.uid) {
      const data = await getUserLoyalty(me.uid)
      setLoyaltyData(data)
    }
  }

  useEffect(() => {
    refreshLoyalty()
  }, [me.uid, bal])

  useEffect(() => {
    return walletManager.subscribe(state => {
      setWalletState(state)
      if (state.isConnected && state.address) {
        update(ref(db, `${ROOT}/users/${me.uid}`), {
          wallet: state.address,
          walletType: state.walletType,
          isVerified: state.isVerified,
        })
        set(ref(db, `${ROOT}/wallets/${me.uid}`), state.address)
      }
    })
  }, [me.uid])

  const handleConnectTON = async () => {
    setConnecting(true)
    const res = await walletManager.connectTON()
    setConnecting(false)
    if (!res.success) {
      alert(res.error || 'TON Cüzdan bağlantısı başarısız oldu.')
    }
  }

  const handleConnectEVM = async () => {
    setConnecting(true)
    const res = await walletManager.connectEVM()
    setConnecting(false)
    if (!res.success) {
      alert(res.error || 'Web3 / MetaMask bağlantısı başarısız oldu.')
    }
  }

  const handleVerifyWallet = async () => {
    const res = await walletManager.signAuthChallenge()
    if (res.verified) {
      alert('✅ Cüzdan sahipliği başarıyla doğrulandı ve imzalandı!')
    } else {
      alert(`Doğrulama başarısız: ${res.error}`)
    }
  }

  const handleDisconnect = () => {
    walletManager.disconnect()
  }

  // ── başlangıç: kullanıcı kaydı + hesap senkronizasyonu ──
  useEffect(() => {
    const currentAddr = walletManager.address || `tg_${me.uid}`
    const uRef = ref(db, `${ROOT}/users/${me.uid}`)
    get(uRef).then(s => {
      if (!s.exists()) {
        set(uRef, {
          name: me.name,
          wallet: currentAddr,
          balance: START_BAL,
          total_wagered: 0,
          accumulated_rakeback: 0,
          ts: Date.now(),
        })
      } else {
        const val = s.val()
        if (val && (val.balance == null || val.balance <= 0)) {
          // Sıfır bakiyeli hesabı otomatik canlandır ve kurtarma sermayesi yükle
          update(uRef, { balance: START_BAL })
        }
      }
    })
    set(ref(db, `${ROOT}/wallets/${me.uid}`), currentAddr)

    const un1 = onValue(ref(db, `${ROOT}/users/${me.uid}/balance`), s => {
      const b = s.val()
      if (b == null || b <= 0) {
        setBal(START_BAL)
        update(ref(db, `${ROOT}/users/${me.uid}`), { balance: START_BAL }).catch(() => {})
      } else {
        setBal(b)
      }
    })
    const un2 = onValue(ref(db, `${ROOT}/table/seats`), s => {
      const v = s.val() || {}
      setSeats(v)
      const mine = Object.entries(v).find(([i, x]) => x?.uid === me.uid)
      if (mine) { setMySeat(+mine[0]); setScreen('game') }
    })
    const un3 = onValue(ref(db, `${ROOT}/table/spectators`), s => setSpecs(s.val() || {}))
    const un4 = onValue(ref(db, `${ROOT}/table/likes`), s => setLikes(s.val() || {}))
    const un5 = onValue(ref(db, `${ROOT}/table/feed`), s => {
      const v = s.val() || {}
      setFeed(Object.values(v).sort((a, b) => b.ts - a.ts).slice(0, 12))
    })

    // ⚡ Global realTimeRevenueDashboard() Event Listener
    const handleRevenueEvent = () => setIsRevenueDashboardOpen(true)
    window.addEventListener('OPEN_REVENUE_DASHBOARD', handleRevenueEvent)

    return () => {
      [un1, un2, un3, un4, un5].forEach(f => f())
      window.removeEventListener('OPEN_REVENUE_DASHBOARD', handleRevenueEvent)
    }
    // eslint-disable-next-line
  }, [])

  const isSpec = mySeat < 0 && specs[me.uid]

  // ── masaya otur ──
  async function joinSeat() {
    let effectiveBal = bal ?? 0
    if (effectiveBal < BUY_IN) {
      effectiveBal = START_BAL
      await update(ref(db, `${ROOT}/users/${me.uid}`), { balance: START_BAL })
      setBal(START_BAL)
    }

    for (let i = 0; i < SEATS; i++) {
      if (seats[i]) continue
      const r = await runTransaction(ref(db, `${ROOT}/table/seats/${i}`), cur => {
        if (cur !== null) return          // dolu → iptal
        return { uid: me.uid, name: me.name, ts: Date.now() }
      })
      if (r.committed) {
        const tableChips = Math.max(effectiveBal, 1000)
        await update(ref(db, `${ROOT}/table/game/chips`), { [i]: tableChips })
        await update(ref(db, `${ROOT}/table/game/out`), { [i]: false })
        await update(ref(db, `${ROOT}/users/${me.uid}`), { balance: tableChips })
        onDisconnect(ref(db, `${ROOT}/table/seats/${i}`)).remove()
        setMySeat(i); setScreen('game')
        pushFeed(`🪑 ${me.name} ${i + 1}. koltuğa oturdu (${tableChips} çip)`)
        return
      }
    }
    alert('Masa dolu — tüm koltuklar kapıldı!')
  }

  function spectate() {
    set(ref(db, `${ROOT}/table/spectators/${me.uid}`), { name: me.name, ts: Date.now() })
    onDisconnect(ref(db, `${ROOT}/table/spectators/${me.uid}`)).remove()
    setMySeat(-1); setScreen('game')
  }

  function leave() {
    if (mySeat >= 0) {
      remove(ref(db, `${ROOT}/table/seats/${mySeat}`))
      if (game?.chips?.[mySeat] != null) {
        update(ref(db, `${ROOT}/users/${me.uid}`), { balance: game.chips[mySeat] })
      }
    }
    remove(ref(db, `${ROOT}/table/spectators/${me.uid}`))
    setMySeat(-1); setScreen('lobby')
  }

  function handleAttemptLeave() {
    if (mySeat >= 0) {
      const warn = uxManager.getSunkCostWarning(bal, econ?.prize_pool, loyaltyData?.streak?.count)
      setSunkCostWarning(warn)
    } else {
      leave()
    }
  }

  // 💀 Elenme durumunda anında masaya geri dönüş (Resurrection Buy-in Upsell)
  useEffect(() => {
    if (mySeat >= 0) {
      const un = onValue(ref(db, `${ROOT}/table/game`), s => {
        const g = s.val()
        if (g && g.out?.[mySeat] && (g.chips?.[mySeat] ?? 0) <= 0) {
          if (!resurrectionOffer) {
            setResurrectionOffer(uxManager.getResurrectionOffer(mySeat, g.round))
          }
        }
      })
      return () => un()
    }
  }, [mySeat, resurrectionOffer])

  const handleRevive = async (chipsToAdd) => {
    if (mySeat >= 0) {
      await update(ref(db, `${ROOT}/table/game/chips`), { [mySeat]: chipsToAdd })
      await update(ref(db, `${ROOT}/table/game/out`), { [mySeat]: false })
      await runTransaction(ref(db, `${ROOT}/users/${me.uid}/balance`), c => (c || 0) + chipsToAdd)
      setResurrectionOffer(null)
      pushFeed(`⚡ ${me.name} Can Suyu paketiyle masaya geri döndü! (+${chipsToAdd} Çip)`)
    }
  }

  function like(i) {
    runTransaction(ref(db, `${ROOT}/table/likes/${i}`), c => (c || 0) + 1)
    burst(i)
  }
  function burst(i) {
    const id = Math.random()
    setHearts(h => [...h, { id, i }])
    setTimeout(() => setHearts(h => h.filter(x => x.id !== id)), 1200)
  }

  function pushFeed(msg) {
    const f = ref(db, `${ROOT}/table/feed`)
    const key = Date.now()
    update(f, { [key]: { msg, ts: key } })
  }

  const seatedCount = Object.values(seats).filter(Boolean).length

  return (
    <div className="app">
      {/* 💸 Canlı Balina Çekim ve Büyük Vurgun FOMO Bildirimleri */}
      <WhaleNotificationToast />

      <header>
        <h1>🥷 SOYGUN ÇARKI</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="tag">💰 {bal ?? '…'} Çip · 👥 {seatedCount}/4</span>
          <button
            className="btn sm"
            style={{
              background: 'linear-gradient(135deg, #ffd700, #ff9900)',
              color: '#000',
              fontWeight: 900,
              fontSize: '0.72rem',
              padding: '4px 10px',
            }}
            onClick={() => setIsShopOpen(true)}
          >
            + ÇİP AL
          </button>
        </div>
      </header>

      {/* Kasa & Jackpot & VIP Durum Bandı */}
      <div className="econbar">
        <span>🏦 Kasa <b>{econ?.prize_pool || 0}</b></span>
        <span style={{ color: '#ffd75e' }}>🎰 Jackpot <b>{econ?.jackpot_pool || 0}</b></span>
        <span>
          👑 VIP <b>{loyaltyData?.vipTier?.badge} {loyaltyData?.vipTier?.name || 'Çaylak'}</b>
        </span>
        <button
          className="btn ghost sm"
          style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
          onClick={() => setIsLoyaltyOpen(true)}
        >
          🎁 VIP & Ganimet ({loyaltyData?.accumulatedRakeback || 0})
        </button>
        <button
          className="btn ghost sm"
          style={{ borderColor: '#4582d3', color: '#6db1ff' }}
          onClick={() => setIsMetricsOpen(true)}
        >
          📊 RTP & Finans (%97.1)
        </button>
        <button
          className="btn ghost sm"
          style={{ borderColor: '#00c26e', color: '#00e575', background: 'rgba(0, 194, 110, 0.1)' }}
          onClick={() => setIsRevenueDashboardOpen(true)}
        >
          ⚡ Admin & Hasılat
        </button>
      </div>

      {screen === 'lobby' ? (
        <div className="lobby">
          <div className="walletcard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="wname">{me.name}</div>
              {walletState.isConnected && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: walletState.isVerified ? '#0d3820' : '#3d2800',
                  color: walletState.isVerified ? '#00e575' : '#ffc400',
                  border: `1px solid ${walletState.isVerified ? '#00c26e' : '#e6a100'}`,
                }}>
                  {walletState.isVerified ? '✓ Doğrulandı' : '⚠ İmza Bekliyor'}
                </span>
              )}
            </div>

            <div className="waddr">
              🔑 {walletState.address ? `${walletState.address.slice(0, 10)}…${walletState.address.slice(-6)}` : 'Cüzdan Bağlı Değil'}
            </div>
            <div className="wbal">💰 {bal ?? 0} chip</div>

            <div className="wsub">
              {walletState.isConnected
                ? `Protokol: ${walletState.walletType}`
                : `Gerçek kripto cüzdanını bağla ${me.tg ? '(Telegram)' : '(Web3)'}`}
            </div>

            {walletState.isConnected && walletState.riskProfile && (
              <div style={{
                marginTop: '8px',
                padding: '8px 10px',
                background: 'rgba(255, 215, 0, 0.08)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '6px',
                fontSize: '0.72rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, color: '#ffd700' }}>
                    {walletState.riskProfile.tier}
                  </span>
                  <span style={{ background: '#222', padding: '1px 6px', borderRadius: '4px', color: '#00e575', fontWeight: 800 }}>
                    Risk Skoru: {walletState.riskProfile.riskScore}/100
                  </span>
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.68rem', marginBottom: '4px' }}>
                  💎 Portföy: ~${walletState.riskProfile.portfolioValueUsd?.toLocaleString()} USD · {walletState.riskProfile.onChainTxCount} Tx
                </div>
                {walletState.riskProfile.holdings?.length > 0 && (
                  <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                    🖼️ Tespit Edilen Varlıklar: {walletState.riskProfile.holdings.slice(0, 2).join(', ')}
                  </div>
                )}
                <div style={{ marginTop: '4px', color: '#ff6666', fontWeight: 700, fontSize: '0.65rem' }}>
                  ⚡ {walletState.riskProfile.dopamineStrategy}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {!walletState.isConnected ? (
                <>
                  <button
                    className="btn sm"
                    style={{ flex: 1, minWidth: '130px', fontSize: '0.72rem', background: '#0088cc', borderColor: '#0099ee' }}
                    onClick={handleConnectTON}
                    disabled={connecting}
                  >
                    💎 TON Connect
                  </button>
                  <button
                    className="btn ghost sm"
                    style={{ flex: 1, minWidth: '130px', fontSize: '0.72rem', borderColor: 'var(--gold)', color: 'var(--gold)' }}
                    onClick={handleConnectEVM}
                    disabled={connecting}
                  >
                    🦊 MetaMask / EVM
                  </button>
                </>
              ) : (
                <>
                  {!walletState.isVerified && (
                    <button
                      className="btn sm"
                      style={{ flex: 1, fontSize: '0.72rem', background: 'var(--gold)', color: '#000' }}
                      onClick={handleVerifyWallet}
                    >
                      ✍️ Sahiplik İmzala
                    </button>
                  )}
                  <button
                    className="btn ghost sm"
                    style={{ fontSize: '0.72rem', color: '#ff6666', borderColor: '#ff4444' }}
                    onClick={handleDisconnect}
                  >
                    Bağlantıyı Kes
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="seatgrid">
            {Array.from({ length: SEATS }, (_, i) => {
              const s = seats[i]
              return (
                <div key={i} className={`seat ${s ? 'full' : ''}`}>
                  <div className="sava">{s ? '😎' : '🪑'}</div>
                  <div className="sname">{s ? s.name : `Koltuk ${i + 1}`}</div>
                  <div className="slike">❤️ {likes[i] || 0}</div>
                </div>
              )
            })}
          </div>

          <div className="lobbtns">
            <button className="btn" onClick={joinSeat}>🪑 OTUR — {BUY_IN} chip</button>
            <button className="btn ghost" onClick={spectate}>👁 İZLE + BEĞEN</button>
          </div>
          <div className="hint">İlk gelen 4 kişi oturur · diğerleri izler & beğenir · koltuk = {BUY_IN} chip</div>
        </div>
      ) : (
        <div className="game">
          <Wheel
            seat={mySeat}
            seats={seats}
            meName={me.name}
            uid={me.uid}
            bal={bal}
            onOpenShop={() => setIsShopOpen(true)}
            onAutoSeat={joinSeat}
          />
          {mySeat < 0 && (
            <div className="likeRow">
              {Array.from({ length: SEATS }, (_, i) => seats[i] && (
                <div key={i} className="likecell">
                  <button className="likebtn" onClick={() => like(i)}>❤️</button>
                  <span className="likename">{seats[i].name} · {likes[i] || 0}</span>
                  {hearts.filter(h => h.i === i).map(h => <span key={h.id} className="heart">❤️</span>)}
                </div>
              ))}
            </div>
          )}
          <button className="btn ghost" onClick={handleAttemptLeave}>← Lobiden Ayrıl</button>
        </div>
      )}

      {/* Sunk-Cost Fallacy Masadan Çıkışı Engelleme Modalı */}
      <SunkCostModal
        isOpen={Boolean(sunkCostWarning)}
        warningData={sunkCostWarning}
        onCancel={() => setSunkCostWarning(null)}
        onConfirmLeave={() => {
          setSunkCostWarning(null)
          leave()
        }}
      />

      {/* Elenme Sonrası Can Suyu (Buy-in Upsell) Modalı */}
      <ResurrectionModal
        isOpen={Boolean(resurrectionOffer)}
        offerData={resurrectionOffer}
        onRevive={handleRevive}
        onDecline={() => {
          setResurrectionOffer(null)
          leave()
        }}
      />

      {/* Kara Borsa Çip Kasası Modalı */}
      <ShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        uid={me.uid}
        onPurchased={(added) => {
          refreshLoyalty()
          if (mySeat >= 0 && added) {
            runTransaction(ref(db, `${ROOT}/table/game/chips/${mySeat}`), c => (c || 0) + added)
            update(ref(db, `${ROOT}/table/game/out`), { [mySeat]: false })
          }
        }}
      />

      {/* VIP & Ganimet Kasası Modalı */}
      <LoyaltyModal
        isOpen={isLoyaltyOpen}
        onClose={() => setIsLoyaltyOpen(false)}
        uid={me.uid}
        onOpenShop={() => setIsShopOpen(true)}
        onClaimed={() => {
          refreshLoyalty()
        }}
      />

      {/* GLI-19 Canlı Finans & RTP Metrik Modalı */}
      <FinancialMetricsModal
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        econ={econ}
        game={game}
        userBal={bal}
        totalWagered={loyaltyData?.totalWagered || 0}
      />

      {/* ⚡ Merkezi Kasa & Hasılat Yönetim Paneli (Admin Real-Time Dashboard) */}
      <RealTimeRevenueDashboard
        isOpen={isRevenueDashboardOpen}
        onClose={() => setIsRevenueDashboardOpen(false)}
        gameData={game}
        econData={econ}
      />
    </div>
  )
}
