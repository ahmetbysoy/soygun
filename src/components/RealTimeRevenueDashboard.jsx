import React, { useState, useEffect } from 'react'
import { FinancialMetricsEngine } from '../core/FinancialMetricsEngine.js'
import { AnalyticsEngine } from '../core/AnalyticsEngine.js'
import { abTestEngine, EXPERIMENTS } from '../core/ABTestFeatureFlag.js'
import { TaxReportEngine, TAX_JURISDICTIONS } from '../core/TaxReportEngine.js'
import { STORE_COMPLIANCE } from '../core/StoreSubmissionKit.js'
import { marketRateStreamer, getDynamicHouseEdge } from '../economy.js'
import { revenueTracker, realTimeRevenueDashboard } from '../core/revenueTracker.js'

export default function RealTimeRevenueDashboard({ isOpen, onClose, gameData, econData }) {
  const [activeTab, setActiveTab] = useState('overview') // overview | ledger | ltv_churn | ab_testing | tax_report | store_submission
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('CURACAO_GCB')
  const [marketState, setMarketState] = useState(marketRateStreamer.getMarketState())
  const [abOverrides, setAbOverrides] = useState(abTestEngine.overrides)
  const [downloadSuccess, setDownloadSuccess] = useState('')
  const [revenueStats, setRevenueStats] = useState(revenueTracker.getStats())
  const [ledgerEntries, setLedgerEntries] = useState(revenueTracker.getLedger())

  useEffect(() => {
    const unsubMarket = marketRateStreamer.subscribe(state => setMarketState(state))
    const unsubRevenue = revenueTracker.subscribe((stats, ledger) => {
      setRevenueStats(stats)
      setLedgerEntries(ledger)
    })
    return () => {
      unsubMarket()
      unsubRevenue()
    }
  }, [])

  if (!isOpen) return null

  // Finansal Rakamlar (Canlı Defter + Firebase Verisi)
  const totalWagered = revenueStats.totalWageredChips || (econData?.paid_chips ? (econData.paid_chips * 1.85) : 148500)
  const totalPaidOut = revenueStats.totalPaidOutChips || (econData?.paid_chips ? (econData.paid_chips * 1.78) : 142200)
  const prizePool = econData?.prize_pool || 6400
  const totalRevenueChips = revenueStats.netRevenueChips || (econData?.revenue_chips || 12800)

  const rtp = FinancialMetricsEngine.calculateRTP(totalWagered, totalPaidOut)
  const houseEdge = FinancialMetricsEngine.calculateHouseEdge(rtp)
  const solvency = FinancialMetricsEngine.calculateSolvencyRatio(prizePool, gameData?.pot || 800)

  // Örnek Oyuncu Kohort LTV Analizi
  const sampleWhaleLtv = AnalyticsEngine.calculatePlayerLifetimeValue({
    totalWagered: 48000,
    totalDeposited: 350,
    sessionCount: 28,
    daysActive: 14,
    isWalletVerified: true,
  }, houseEdge / 100)

  const sampleSharkLtv = AnalyticsEngine.calculatePlayerLifetimeValue({
    totalWagered: 14000,
    totalDeposited: 95,
    sessionCount: 12,
    daysActive: 8,
    isWalletVerified: false,
  }, houseEdge / 100)

  const taxReport = TaxReportEngine.generateTaxReportData({
    totalWagered,
    totalPaidOut,
    totalDeposits: totalRevenueChips * 0.01,
  }, selectedJurisdiction)

  const handleDownloadTaxCSV = () => {
    const filename = TaxReportEngine.downloadTaxReportCSV({
      totalWagered,
      totalPaidOut,
      totalDeposits: totalRevenueChips * 0.01,
    }, selectedJurisdiction)
    setDownloadSuccess(`✅ ${filename} başarıyla indirildi!`)
    setTimeout(() => setDownloadSuccess(''), 4500)
  }

  const handleToggleABOverride = (expId, variantId) => {
    abTestEngine.setOverride(expId, variantId)
    setAbOverrides({ ...abTestEngine.overrides })
  }

  return (
    <div className="financial-modal-backdrop" onClick={onClose}>
      <div
        className="financial-modal-content"
        style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Başlık ve Kapat Butonu */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3346', paddingBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--gold)' }}>
              ⚡ MERKEZİ KASA & HASILAT YÖNETİM PANELİ
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--dim)', marginTop: '2px' }}>
              Real-time GGR, LTV Modelleri, A/B Testing, Vergi CSV & Store Submission
            </div>
          </div>
          <button className="btn ghost" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={onClose}>
            ✕ Kapat
          </button>
        </div>

        {/* Tab Menüsü */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px', borderBottom: '1px solid #1f2737', paddingBottom: '8px' }}>
          {[
            { id: 'overview', label: '📊 Canlı Hasılat & GGR' },
            { id: 'ledger', label: '💸 Anlık Gelir/Gider Defteri' },
            { id: 'ltv_churn', label: '🧠 LTV & Churn Modelleri' },
            { id: 'ab_testing', label: '🧪 A/B Testing Motoru' },
            { id: 'tax_report', label: '📑 Vergi Raporu (CSV)' },
            { id: 'store_submission', label: '📱 Store Submission Paketi' },
          ].map(tab => (
            <button
              key={tab.id}
              className="btn"
              style={{
                fontSize: '0.75rem',
                padding: '6px 12px',
                background: activeTab === tab.id ? 'var(--gold)' : '#161d2a',
                color: activeTab === tab.id ? '#000' : '#cbd5e1',
                fontWeight: activeTab === tab.id ? 800 : 500,
                border: '1px solid #2a3346',
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. SEKME: CANLI HASILAT & GGR */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
            {/* Canlı Piyasa & Likidite Ticker */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>TON SPOT ORANI</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>${marketState.tonSpotPrice}</div>
                <div style={{ fontSize: '0.65rem', color: marketState.change24h >= 0 ? '#00c26e' : '#ef4444' }}>
                  {marketState.change24h >= 0 ? '▲ +' : '▼ '}{marketState.change24h}% (24h)
                </div>
              </div>

              <div style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>BRÜT OYUN HASILATI (GGR)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00c26e' }}>
                  ${((totalWagered - totalPaidOut) * 0.01).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>{totalWagered - totalPaidOut} Çip Net Kasa Karı</div>
              </div>

              <div style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>CANLI RTP & HOUSE EDGE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffd700' }}>
                  %{rtp} <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>(Edge: %{houseEdge})</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>Dinamik Varyans Korumalı</div>
              </div>

              <div style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>KASA TEMİNATI (SOLVENCY)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a78bfa' }}>%{solvency.ratio}</div>
                <div style={{ fontSize: '0.65rem', color: '#00c26e' }}>{solvency.statusText}</div>
              </div>
            </div>

            {/* Masa ve Oyuncu Durumu */}
            <div style={{ background: '#0e131d', border: '1px solid #232d40', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                🪑 AKTİF MASA TRAFİĞİ & POT HACMİ
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--dim)' }}>
                <span>Masa Turu: <strong style={{ color: '#fff' }}>Tur #{gameData?.round || 1}</strong></span>
                <span>Masadaki Canlı Pot: <strong style={{ color: '#ffd700' }}>{gameData?.pot || 0} Çip</strong></span>
                <span>Ortak Havuz: <strong style={{ color: '#00c26e' }}>{prizePool} Çip</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* 2. SEKME: ANLIK GELİR / GİDER DEFTERİ (REAL-TIME LEDGER STREAM) */}
        {activeTab === 'ledger' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                  💸 ANLIK HASILAT & GİDER AKIŞI (REAL-TIME LEDGER)
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>
                  Her turdaki bahis girişleri (Inflow), kasa ödemeleri (Outflow) ve anlık marj takibi
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: 'rgba(0, 229, 117, 0.15)',
                  color: '#00e575',
                  border: '1px solid #00c26e',
                  fontWeight: 800,
                }}>
                  Giriş Hızı: +{revenueStats.hourlyInflowChips || 0} Çip/s
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  fontWeight: 800,
                }}>
                  Çıkış Hızı: -{revenueStats.hourlyOutflowChips || 0} Çip/s
                </span>
              </div>
            </div>

            {/* Finansal Akış Tablosu */}
            <div style={{
              background: '#0a0e17',
              border: '1px solid #1f2737',
              borderRadius: '8px',
              maxHeight: '260px',
              overflowY: 'auto',
            }}>
              {ledgerEntries.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--dim)', fontSize: '0.75rem' }}>
                  ⏳ Masada turlar döndükçe anlık finansal defter hareketleri buraya canlı akacaktır.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#121824', color: '#94a3b8', borderBottom: '1px solid #1f2737' }}>
                      <th style={{ padding: '6px 10px' }}>Zaman</th>
                      <th style={{ padding: '6px 10px' }}>İşlem Tipi</th>
                      <th style={{ padding: '6px 10px' }}>Açıklama</th>
                      <th style={{ padding: '6px 10px' }}>Çip Tutarı</th>
                      <th style={{ padding: '6px 10px' }}>USD Karşılığı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map(tx => {
                      const isInflow = tx.type === 'BET_INFLOW' || tx.type === 'DEPOSIT'
                      const isCost = tx.type === 'SERVER_COST'
                      return (
                        <tr key={tx.id} style={{ borderBottom: '1px solid #151d2c' }}>
                          <td style={{ padding: '6px 10px', color: 'var(--dim)' }}>
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '6px 10px', fontWeight: 800 }}>
                            <span style={{
                              color: isInflow ? '#00e575' : isCost ? '#a855f7' : '#ef4444',
                              background: isInflow ? 'rgba(0, 229, 117, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}>
                              {isInflow ? '▲ GELİR / GİRİŞ' : isCost ? '⚙️ MALİYET' : '▼ GİDER / ÖDEME'}
                            </span>
                          </td>
                          <td style={{ padding: '6px 10px', color: '#cbd5e1' }}>
                            {tx.description || tx.actorName}
                          </td>
                          <td style={{ padding: '6px 10px', fontWeight: 800, color: isInflow ? '#00e575' : '#ef4444' }}>
                            {isInflow ? '+' : '-'}{tx.chips} Çip
                          </td>
                          <td style={{ padding: '6px 10px', color: '#ffd700', fontWeight: 700 }}>
                            ${tx.usdAmount}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* 2. SEKME: LTV & CHURN MODELLERİ */}
        {activeTab === 'ltv_churn' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--dim)' }}>
              Matematiksel Projeksiyon: Oyuncunun gelecekte bırakacağı net kasa hasılatı ve terk etme (churn) riski.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {/* Balina Kartı */}
              <div style={{ background: '#121722', border: '1px solid #00c26e', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#00c26e' }}>
                    🐋 {sampleWhaleLtv.monetizationGrade}
                  </span>
                  <span style={{ fontSize: '0.65rem', background: '#00c26e22', color: '#00c26e', padding: '2px 6px', borderRadius: '4px' }}>
                    Risk: {sampleWhaleLtv.churnRisk}
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginTop: '6px' }}>
                  ${sampleWhaleLtv.projectedLtvUSD} <span style={{ fontSize: '0.75rem', color: 'var(--dim)' }}>LTV</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginTop: '4px' }}>
                  Beklenen Ömür: {sampleWhaleLtv.expectedLifespanDays} Gün | Aylık Churn: %{sampleWhaleLtv.monthlyChurnRatePercent}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#ffd700', marginTop: '8px', borderTop: '1px dashed #232d40', paddingTop: '6px' }}>
                  🎯 Tavsiye: {sampleWhaleLtv.retentionAction}
                </div>
              </div>

              {/* Köpekbalığı Kartı */}
              <div style={{ background: '#121722', border: '1px solid #38bdf8', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8' }}>
                    🦈 {sampleSharkLtv.monetizationGrade}
                  </span>
                  <span style={{ fontSize: '0.65rem', background: '#38bdf822', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                    Risk: {sampleSharkLtv.churnRisk}
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginTop: '6px' }}>
                  ${sampleSharkLtv.projectedLtvUSD} <span style={{ fontSize: '0.75rem', color: 'var(--dim)' }}>LTV</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginTop: '4px' }}>
                  Beklenen Ömür: {sampleSharkLtv.expectedLifespanDays} Gün | Aylık Churn: %{sampleSharkLtv.monthlyChurnRatePercent}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#ffd700', marginTop: '8px', borderTop: '1px dashed #232d40', paddingTop: '6px' }}>
                  🎯 Tavsiye: {sampleSharkLtv.retentionAction}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. SEKME: A/B TESTING MOTORU */}
        {activeTab === 'ab_testing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--dim)' }}>
              Canlı Varyant Optimizasyonu: Dopamin tetikleyici parametreleri A/B test ederek hasılatı maksimize edin.
            </div>

            {Object.values(EXPERIMENTS).map(exp => {
              const report = abTestEngine.getExperimentReport(exp.id)
              const activeOverride = abOverrides[exp.id] || 'AUTO'

              return (
                <div key={exp.id} style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffd700' }}>{exp.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>{exp.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>Override:</span>
                      {['AUTO', ...exp.variants.map(v => v.id)].map(vId => (
                        <button
                          key={vId}
                          className="btn"
                          style={{
                            fontSize: '0.65rem',
                            padding: '3px 7px',
                            background: activeOverride === vId ? '#00c26e' : '#1a2333',
                            color: activeOverride === vId ? '#000' : '#fff',
                            fontWeight: 700,
                          }}
                          onClick={() => handleToggleABOverride(exp.id, vId)}
                        >
                          {vId}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Varyant Metrik Tablosu */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '10px' }}>
                    {report?.variants.map(v => (
                      <div
                        key={v.variantId}
                        style={{
                          background: '#0a0e17',
                          border: `1px solid ${report.winnerVariantId === v.variantId ? '#00c26e' : '#1f2737'}`,
                          borderRadius: '6px',
                          padding: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                          <span style={{ color: '#fff' }}>Varyant {v.variantId}: {v.variantName}</span>
                          {report.winnerVariantId === v.variantId && (
                            <span style={{ color: '#00c26e', fontSize: '0.65rem' }}>🏆 KAZANAN</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--dim)', marginTop: '4px' }}>
                          <span>Dönüşüm Oranı: <strong style={{ color: '#ffd700' }}>%{v.conversionRate}</strong></span>
                          <span>Hasılat: <strong style={{ color: '#00c26e' }}>{v.totalValue} Çip</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 4. SEKME: VERGİ RAPORU (CSV) */}
        {activeTab === 'tax_report' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                  📑 ULUSLARARASI VERGİ & DENETİM HESAPLAYICISI
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>
                  GGR / NGR bazlı yasal vergi yükümlülük raporu ve RFC 4180 CSV dışa aktarımı
                </div>
              </div>

              {/* Yargı Bölgesi Seçici */}
              <select
                value={selectedJurisdiction}
                onChange={e => setSelectedJurisdiction(e.target.value)}
                style={{
                  background: '#161d2a',
                  color: '#ffd700',
                  border: '1px solid #2a3346',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {Object.values(TAX_JURISDICTIONS).map(j => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>

            {/* Vergi Özet Kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>TOPLAM BAHİS HACMİ</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>${taxReport.totalWageredUSD}</div>
              </div>

              <div style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>BRÜT HASILAT (GGR)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00c26e' }}>${taxReport.grossGamingRevenueUSD}</div>
              </div>

              <div style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>HESAPLANAN VERGİ BORCU</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>${taxReport.taxPayableUSD}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>Vergi Oranı: %{taxReport.effectiveTaxRatePercent}</div>
              </div>

              <div style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--dim)' }}>NET SERMAYEDE KALAN</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffd700' }}>${taxReport.netRetainedEarningsUSD}</div>
              </div>
            </div>

            {/* İndirme Butonu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
              <button
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #00c26e, #059669)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '10px 18px',
                  boxShadow: '0 0 16px rgba(0, 194, 110, 0.3)',
                }}
                onClick={handleDownloadTaxCSV}
              >
                📥 Vergi Raporunu CSV Olarak İndir (RFC 4180)
              </button>
              {downloadSuccess && (
                <div style={{ fontSize: '0.72rem', color: '#00c26e', fontWeight: 700 }}>
                  {downloadSuccess}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. SEKME: STORE SUBMISSION PAKETİ */}
        {activeTab === 'store_submission' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--dim)' }}>
              Apple App Store & Google Play Store resmi onay gereksinimleri ve yasal uyumluluk sözleşmeleri.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
              {/* Apple App Store */}
              <div style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
                  🍎 {STORE_COMPLIANCE.APP_STORE.platform}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#ffd700', marginBottom: '8px' }}>
                  Yaş Derecelendirmesi: {STORE_COMPLIANCE.APP_STORE.ageRating}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {STORE_COMPLIANCE.APP_STORE.guidelineCompliance.map((g, idx) => (
                    <div key={idx} style={{ fontSize: '0.68rem', color: 'var(--dim)', background: '#0a0e17', padding: '6px', borderRadius: '4px' }}>
                      <strong style={{ color: '#38bdf8' }}>{g.rule}:</strong> {g.desc}
                    </div>
                  ))}
                </div>
              </div>

              {/* Google Play Store */}
              <div style={{ background: '#121722', border: '1px solid #232d40', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
                  🤖 {STORE_COMPLIANCE.GOOGLE_PLAY.platform}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#ffd700', marginBottom: '8px' }}>
                  İçerik Derecesi: {STORE_COMPLIANCE.GOOGLE_PLAY.contentRating}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {STORE_COMPLIANCE.GOOGLE_PLAY.policyCompliance.map((p, idx) => (
                    <div key={idx} style={{ fontSize: '0.68rem', color: 'var(--dim)', background: '#0a0e17', padding: '6px', borderRadius: '4px' }}>
                      <strong style={{ color: '#00c26e' }}>{p.rule}:</strong> {p.desc}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Yasal Sözleşmeler */}
            <div style={{ background: '#0a0e17', border: '1px solid #1f2737', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                📜 KULLANIM KOŞULLARI & GİZLİLİK POLİTİKASI (EULA)
              </div>
              <pre style={{ fontSize: '0.62rem', color: 'var(--dim)', whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto' }}>
                {STORE_COMPLIANCE.LEGAL_DOCS.termsOfService}
                {'\n\n'}
                {STORE_COMPLIANCE.LEGAL_DOCS.privacyPolicy}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
