import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { agnClient, parseDecimal } from './client.js'
import {
  vendedores,
  snapshotsDashboard,
  snapshotsPositivacao,
  snapshotsTop5Itens,
} from './schema.js'

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

export async function runHarvest() {
  console.log(`[harvester] iniciando coleta — ${new Date().toISOString()}`)

  // 1. Vendedores
  const { data: vendedoresData } = await agnClient.get('/cadastrodevendedores')
  for (const v of vendedoresData) {
    await db
      .insert(vendedores)
      .values({
        slpcode: String(v.codigo),
        nome: v.nomedovendedor ?? null,
        funcao: v.funcao ?? null,
        ativo: true,
      })
      .onConflictDoUpdate({
        target: vendedores.slpcode,
        set: { nome: v.nomedovendedor ?? null, funcao: v.funcao ?? null },
      })
  }

  // 2. Dashboard
  const { data: dashboardData } = await agnClient.get('/dashboard')
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

  // 3. Positivação
  const { data: positivacaoData } = await agnClient.get('/positivacao')
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

  // 4. Top 5 itens (por vendedor)
  const slpcodes: string[] = [...new Set(dashboardData.map((d: Record<string, unknown>) => String(d.slpcode)))]
  for (const slpcode of slpcodes) {
    const { data: top5 } = await agnClient.get(`/top5itens?slpcode=eq.${slpcode}`)
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
  }

  console.log(`[harvester] coleta concluída — ${new Date().toISOString()}`)
}
