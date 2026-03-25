import { useEffect } from 'react'
import { X, Package, TrendingUp, BarChart2 } from 'lucide-react'
import { useTop5 } from '../hooks/useApi'
import { formatBRL, formatPct, formatNum, metaColor } from '../lib/format'
import VendedorAvatar from './VendedorAvatar'
import type { VendedorEnriquecido } from '../types'

interface Props {
  vendedor: VendedorEnriquecido | null
  onClose: () => void
}

export default function VendedorDrawer({ vendedor, onClose }: Props) {
  const { data: top5, loading: loadingTop5 } = useTop5(vendedor?.slpcode ?? null)
  const d = vendedor?.dashboard
  const p = vendedor?.positivacao

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!vendedor) return null

  const pctRaw = d?.percentualMes ? parseFloat(d.percentualMes) * 100 : 0
  const { bg: pctBg, text: pctText } = metaColor(pctRaw)
  const pctDisplay = d?.percentualMes
    ? `${(parseFloat(d.percentualMes) * 100).toFixed(1)}%`
    : '—'

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-y-auto"
        style={{
          width: 'min(420px, 100vw)',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.25)',
          animation: 'slideDrawer 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        <style>{`
          @keyframes slideDrawer {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0 sticky top-0"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', zIndex: 1 }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <VendedorAvatar nome={vendedor.nome} slpcode={vendedor.slpcode} size={42} />
            <div className="min-w-0">
              <p
                style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
                className="truncate"
              >
                {vendedor.nome ?? 'Vendedor'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                {vendedor.funcao ?? 'Vendedor'} · #{vendedor.slpcode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* % Meta badge */}
          <div
            className="flex items-center justify-between rounded-xl p-4"
            style={{ background: pctBg, border: `1px solid ${pctText}22` }}
          >
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: pctText, fontFamily: 'DM Mono, monospace', marginBottom: 4 }}>
                Atingimento de Meta
              </p>
              <p className="metric-value" style={{ fontSize: 32, color: pctText, lineHeight: 1 }}>
                {pctDisplay}
              </p>
            </div>
            <TrendingUp size={28} color={pctText} opacity={0.5} />
          </div>

          {/* Dashboard metrics */}
          {d && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginBottom: 10 }}>
                Faturamento
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Mês atual', value: formatBRL(d.faturamentoMes) },
                  { label: 'Meta', value: formatBRL(d.meta) },
                  { label: 'Hoje', value: formatBRL(d.faturamentoDia) },
                  { label: 'Ticket médio/dia', value: formatBRL(d.ticketMedioDia) },
                  { label: 'Média mensal', value: formatBRL(d.mediaMes) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg p-3"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  >
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</p>
                    <p className="metric-value" style={{ fontSize: 16, color: 'var(--text-primary)' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positivação */}
          {p && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginBottom: 10 }}>
                Positivação
              </p>
              <div
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Positivados / Base ativa</p>
                    <p className="metric-value" style={{ fontSize: 22, color: 'var(--text-primary)' }}>
                      {formatNum(p.positivacaoAtual)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ {formatNum(p.baseAtiva)}</span>
                    </p>
                  </div>
                  <p className="metric-value" style={{ fontSize: 18, color: 'var(--orange)' }}>
                    {p.baseAtiva && p.positivacaoAtual
                      ? formatPct(p.positivacaoAtual / p.baseAtiva)
                      : '—'}
                  </p>
                </div>
                {/* Progress */}
                <div className="progress-bar">
                  <div
                    className="h-full rounded"
                    style={{
                      width: p.baseAtiva && p.positivacaoAtual
                        ? `${Math.min((p.positivacaoAtual / p.baseAtiva) * 100, 100)}%`
                        : '0%',
                      background: 'linear-gradient(90deg, var(--orange) 0%, #fb923c 100%)',
                      transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                </div>
                {/* Histórico fat */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: 'M-1', value: formatBRL(p.vrFatMesAnterior1) },
                    { label: 'M-2', value: formatBRL(p.vrFatMesAnterior2) },
                    { label: 'M-3', value: formatBRL(p.vrFatMesAnterior3) },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>{m.label}</p>
                      <p className="metric-value" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top 5 itens */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package size={14} style={{ color: 'var(--text-muted)' }} />
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                Top 5 Itens
              </p>
            </div>
            {loadingTop5 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>carregando…</p>
            ) : top5.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>Sem dados</p>
            ) : (
              <div className="space-y-2">
                {top5.map((item, i) => {
                  const pct = item.percentual ? parseFloat(item.percentual) : 0
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg p-3"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)', minWidth: 16, textAlign: 'right' }}
                          >
                            {i + 1}
                          </span>
                          <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }} className="truncate">
                            {item.item ?? item.itemcode ?? '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                            {formatNum(item.qtd)} un
                          </span>
                          <span
                            style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--orange)', background: 'var(--orange-soft)', padding: '2px 6px', borderRadius: 6 }}
                          >
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            borderRadius: 2,
                            background: 'linear-gradient(90deg, var(--orange) 0%, #fb923c 100%)',
                            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div style={{ paddingTop: 8 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', gap: 5 }}>
              <BarChart2 size={12} />
              Dados coletados em {d ? new Date(d.capturedAt).toLocaleString('pt-BR') : '—'}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
