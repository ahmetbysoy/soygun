/**
 * HapticEngine.js
 * Mobil (Telegram WebApp & Web Vibration API) için çok katmanlı mikro-hissiyat (haptic) motoru.
 * Bahis, çark dişli tıkları, bomba patlaması, soygun ve jackpot anlarında fiziksel dokunma hissi üretir.
 */

export class HapticEngine {
  static trigger(type = 'light') {
    // 1. Telegram WebApp Native Haptic
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      const tg = window.Telegram.WebApp.HapticFeedback
      switch (type) {
        case 'bet':
        case 'light':
          tg.impactOccurred('light')
          break
        case 'medium':
        case 'tick':
          tg.impactOccurred('medium')
          break
        case 'heavy':
        case 'spin':
          tg.impactOccurred('heavy')
          break
        case 'win':
        case 'jackpot':
          tg.notificationOccurred('success')
          break
        case 'bomb':
        case 'steal':
          tg.notificationOccurred('error')
          break
        case 'warning':
          tg.notificationOccurred('warning')
          break
        default:
          tg.impactOccurred('light')
      }
    }

    // 2. Web Navigator Vibrate Fallback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        switch (type) {
          case 'bet':
            navigator.vibrate(18)
            break
          case 'tick':
            navigator.vibrate(10)
            break
          case 'spin':
            navigator.vibrate([25, 40, 30])
            break
          case 'win':
            navigator.vibrate([40, 50, 60, 80, 120])
            break
          case 'jackpot':
            navigator.vibrate([60, 40, 80, 50, 100, 60, 200])
            break
          case 'bomb':
            navigator.vibrate([150, 50, 250, 80, 300])
            break
          case 'steal':
            navigator.vibrate([80, 40, 80, 40, 140])
            break
          case 'clear':
            navigator.vibrate(25)
            break
          default:
            navigator.vibrate(15)
        }
      } catch {
        // Sessiz devam et
      }
    }
  }
}

export const haptic = (type) => HapticEngine.trigger(type)
