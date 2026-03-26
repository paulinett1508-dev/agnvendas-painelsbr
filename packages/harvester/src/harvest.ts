import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import pino from 'pino'
import { agnClient, parseDecimal } from './client.js'
import {
  vendedores,
  snapshotsDashboard,
  snapshotsPositivacao,
  snapshotsTop5Itens,
} from './schema.js'

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
})

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxAttempts) throw err
      const delay = attempt * 1000
      logger.warn({ err, attempt, delay }, `${label}: falhou, retry em ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error('unreachable')
}

export async function runHarvest() {
  const start = Date.now()
  logger.info('iniciando coleta')

  // 1. Vendedores
  const { data: vendedoresData } = await withRetry(
    () => agnClient.get('/cadastrodevendedores'),
    'vendedores',
  )
  for (const v of vendedoresData) {
    await db
      .insert(vendedores)
      .values({ slpcode: String(v.codigo), nome: v.nomedovendedor ?? null, funcao: v.funcao ?? null, ativo: true })
      .onConflictDoUpdate({
        target: vendedores.slpcode,
        set: { nome: v.nomedovendedor ?? null, funcao: v.funcao ?? null },
      })
  }
  logger.debug({ count: vendedoresData.length }, 'vendedores upserted')

  // 2. Dashboard
  const { data: dashboardData } = await withRetry(() => agnClient.get('/dashboard'), 'dashboard')
  const capturedAt = new Date()
  const dashRows = dashboardData.map((d: Record<string, unknown>) => ({
    slpcode: String(d.slpcode),
    meta: parseDecimal(d.meta as string),
    faturamentoMes: parseDecimal(d.faturamentomes as string),
    faturamentoDia: parseDecimal(d.faturamentodia as string),
    ticketMedioDia: parseDecimal(d.ticketmediodia as string),
    percentualMes: parseDecimal(d.percentualmes as string),
    mediaMes: parseDecimal(d.mediames as string),
    capturedAt,
  }))
  if (dashRows.length) await db.insert(snapshotsDashboard).values(dashRows)
  logger.debug({ count: dashRows.length }, 'snapshots_dashboard inserted')

  // 3. Positivação
  const { data: positivacaoData } = await withRetry(() => agnClient.get('/positivacao'), 'positivacao')
  const posRows = positivacaoData.map((p: Record<string, unknown>) => ({
    slpcode: String(p.slpcode),
    baseAtiva: p.baseativa != null ? Number(p.baseativa) : null,
    positivacaoAtual: p.positivacaoatual != null ? Number(p.positivacaoatual) : null,
    qtdVendaMesAtual: p.qtdvendamesatual != null ? Number(p.qtdvendamesatual) : null,
    vrFatMesAtual: parseDecimal(p.vrfatmesatual as string),
    vrFatMesAnterior1: parseDecimal(p.vrfatmesanterior1 as string),
    vrFatMesAnterior2: parseDecimal(p.vrfatmesanterior2 as string),
    vrFatMesAnterior3: parseDecimal(p.vrfatmesanterior3 as string),
    capturedAt,
  }))
  if (posRows.length) await db.insert(snapshotsPositivacao).values(posRows)
  logger.debug({ count: posRows.length }, 'snapshots_positivacao inserted')

  // 4. Top 5 itens (por vendedor)
  const slpcodes: string[] = [...new Set<string>(dashboardData.map((d: Record<string, unknown>) => String(d.slpcode)))]
  let top5Total = 0
  for (const slpcode of slpcodes) {
    const { data: top5 } = await withRetry(
      () => agnClient.get(`/top5itens?slpcode=eq.${slpcode}`),
      `top5[${slpcode}]`,
    )
    if (!top5.length) continue
    const itemRows = top5.map((t: Record<string, unknown>) => ({
      slpcode,
      itemcode: t.itemcode != null ? String(t.itemcode) : null,
      item: t.item != null ? String(t.item) : null,
      qtd: t.qtd != null ? Number(t.qtd) : null,
      percentual: parseDecimal(t.percentual as string),
      capturedAt,
    }))
    await db.insert(snapshotsTop5Itens).values(itemRows)
    top5Total += itemRows.length
  }
  logger.debug({ count: top5Total }, 'snapshots_top5itens inserted')

  logger.info({ durationMs: Date.now() - start }, 'coleta concluída')
}
