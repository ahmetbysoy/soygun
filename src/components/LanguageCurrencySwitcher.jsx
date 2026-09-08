import React, { useState, useEffect } from 'react'
import { i18nEngine } from '../core/MultiLangCurrencyEngine.js'
import { haptic } from '../core/HapticEngine.js'

/**
 * LanguageCurrencySwitcher.jsx
 * Masanın köşesinde duran hızlı Dil & Kripto Para Değiştirme Buton Grubu.
 */

export default function LanguageCurrencySwitcher() {
  const [lang, setLang] = useState(i18nEngine.currentLang)
  const [currency, setCurrency] = useState(i18nEngine.currentCurrency)

  useEffect(() => {
    const unsub = i18nEngine.subscribe((state) => {
      setLang(state.lang)
      setCurrency(state.currency)
    })
    return () => unsub()
  }, [])

  const handleLangChange = (newLang) => {
    i18nEngine.setLang(newLang)
    haptic('tick')
  }

  const handleCurrChange = (newCurr) => {
    i18nEngine.setCurrency(newCurr)
    haptic('tick')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {/* Dil Seçici */}
      <div style={{
        display: 'flex',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid #1e293b',
        borderRadius: '6px',
        padding: '2px',
        gap: '2px',
      }}>
        {['tr', 'en', 'ru', 'ar'].map((l) => (
          <button
            key={l}
            className="btn ghost"
            style={{
              padding: '2px 5px',
              fontSize: '0.62rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              background: lang === l ? '#38bdf8' : 'transparent',
              color: lang === l ? '#000' : '#94a3b8',
              borderRadius: '4px',
              border: 'none',
            }}
            onClick={() => handleLangChange(l)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Kripto Kur Seçici */}
      <div style={{
        display: 'flex',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid #1e293b',
        borderRadius: '6px',
        padding: '2px',
        gap: '2px',
      }}>
        {['CHIP', 'TON', 'USDT', 'STARS'].map((c) => (
          <button
            key={c}
            className="btn ghost"
            style={{
              padding: '2px 5px',
              fontSize: '0.62rem',
              fontWeight: 800,
              background: currency === c ? '#ffd700' : 'transparent',
              color: currency === c ? '#000' : '#94a3b8',
              borderRadius: '4px',
              border: 'none',
            }}
            onClick={() => handleCurrChange(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
