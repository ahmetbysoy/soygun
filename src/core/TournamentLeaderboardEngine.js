/**
 * TournamentLeaderboardEngine.js
 * Saatlik & Günlük Kartel Turnuva Havuzu, Canlı Sıralama ve Ödül Dağıtım Motoru.
 */

import { db, ROOT, ref, runTransaction, get, update } from '../firebase.js'

class TournamentLeaderboardEngine {
  constructor() {
    this.tournamentTimerSeconds = 3600 // 1 Saatlik döngü
    this.prizePool = 50000 // Başlangıç taban ödül havuzu
    this.timerInterval = null
    this.subscribers = new Set()

    // Canlı Lider Tablosu Sıralaması
    this.leaderboard = [
      { rank: 1, name: 'Baron_Polat', score: 145200, chipsWon: 85000, prize: '25.000 🪙' },
      { rank: 2, name: 'Süleyman_Çakır', score: 112400, chipsWon: 62000, prize: '15.000 🪙' },
      { rank: 3, name: 'Memati_Baş', score: 89600, chipsWon: 48000, prize: '10.000 🪙' },
      { rank: 4, name: 'Kılıç_Kartel', score: 64200, chipsWon: 31000, prize: '2.500 🪙' },
      { rank: 5, name: 'Pala_Gözlük', score: 48100, chipsWon: 24000, prize: '1.500 🪙' },
    ]
  }

  initTournamentTimer() {
    if (this.timerInterval) return
    this.timerInterval = setInterval(() => {
      this.tournamentTimerSeconds -= 1
      if (this.tournamentTimerSeconds <= 0) {
        this.tournamentTimerSeconds = 3600 // Saatlik sıfırlama
        this.prizePool += 10000
      }
      this.notify()
    }, 1000)
  }

  subscribe(cb) {
    this.subscribers.add(cb)
    if (!this.timerInterval) this.initTournamentTimer()
    return () => this.subscribers.delete(cb)
  }

  notify() {
    for (const sub of this.subscribers) {
      sub({
        timerSeconds: this.tournamentTimerSeconds,
        formattedTime: this.getFormattedTime(),
        prizePool: this.prizePool,
        leaderboard: this.leaderboard,
      })
    }
  }

  getFormattedTime() {
    const mins = Math.floor(this.tournamentTimerSeconds / 60)
    const secs = this.tournamentTimerSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Oynanan her bahsin %1'ini ödül havuzuna ekle
   */
  contributeToPrizePool(wagerAmount) {
    if (wagerAmount <= 0) return
    const cut = Math.max(1, Math.round(wagerAmount * 0.01))
    this.prizePool += cut
    this.notify()
  }

  /**
   * Oyuncunun skorunu güncelle
   */
  updateUserScore(userName, winAmount) {
    if (winAmount <= 0) return
    const existing = this.leaderboard.find(u => u.name === userName)
    if (existing) {
      existing.chipsWon += winAmount
      existing.score += winAmount * 1.5
    } else {
      this.leaderboard.push({
        rank: this.leaderboard.length + 1,
        name: userName,
        score: winAmount * 1.5,
        chipsWon: winAmount,
        prize: '500 🪙',
      })
    }
    // Skora göre sırala
    this.leaderboard.sort((a, b) => b.score - a.score)
    this.leaderboard.forEach((item, index) => {
      item.rank = index + 1
    })
    this.notify()
  }
}

export const tournamentEngine = new TournamentLeaderboardEngine()
