import { env } from './env.js'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { db } from './db/client.js'
import {
  vendedores,
  snapshotsDashboard,
  snapshotsPositivacao,
  snapshotsTop5Itens,
} from './db/schema.js'
import { desc, eq, sql } from 'drizzle-orm'
import { isAppError } from './errors.js'
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    ...(env.NODE_ENV !== 'production' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
  },
  genReqId: () => crypto.randomUUID(),
}).withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

await app.register(cors, { origin: true })

app.setErrorHandler((error, request, reply) => {
  if (isAppError(error)) {
    return reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
    })
  }
  request.log.error({ err: error }, 'unhandled error')
  return reply.status(500).send({ error: 'Erro interno do servidor' })
})

app.get('/health', async () => ({ status: 'ok' }))

// Lista todos os vendedores
app.get('/vendedores', async () => {
  return db.select().from(vendedores).orderBy(vendedores.nome)
})

// Último snapshot de dashboard de cada vendedor
app.get('/dashboard/latest', async () => {
  const subquery = db
    .select({ slpcode: snapshotsDashboard.slpcode, maxAt: sql<Date>`MAX(${snapshotsDashboard.capturedAt})`.as('max_at') })
    .from(snapshotsDashboard)
    .groupBy(snapshotsDashboard.slpcode)
    .as('latest')

  return db
    .select({
      slpcode: snapshotsDashboard.slpcode,
      meta: snapshotsDashboard.meta,
      faturamentoMes: snapshotsDashboard.faturamentoMes,
      faturamentoDia: snapshotsDashboard.faturamentoDia,
      ticketMedioDia: snapshotsDashboard.ticketMedioDia,
      percentualMes: snapshotsDashboard.percentualMes,
      mediaMes: snapshotsDashboard.mediaMes,
      capturedAt: snapshotsDashboard.capturedAt,
    })
    .from(snapshotsDashboard)
    .innerJoin(
      subquery,
      sql`${snapshotsDashboard.slpcode} = ${subquery.slpcode} AND ${snapshotsDashboard.capturedAt} = ${subquery.maxAt}`,
    )
    .orderBy(desc(snapshotsDashboard.percentualMes))
})

// Histórico de dashboard de um vendedor
app.get(
  '/dashboard/:slpcode',
  {
    schema: {
      params: z.object({ slpcode: z.string().regex(/^\d{1,10}$/, 'slpcode inválido') }),
    },
  },
  async (req) => {
    return db
      .select()
      .from(snapshotsDashboard)
      .where(eq(snapshotsDashboard.slpcode, req.params.slpcode))
      .orderBy(desc(snapshotsDashboard.capturedAt))
      .limit(200)
  }
)

// Último snapshot de positivação de cada vendedor
app.get('/positivacao/latest', async () => {
  const subquery = db
    .select({ slpcode: snapshotsPositivacao.slpcode, maxAt: sql<Date>`MAX(${snapshotsPositivacao.capturedAt})`.as('max_at') })
    .from(snapshotsPositivacao)
    .groupBy(snapshotsPositivacao.slpcode)
    .as('latest')

  return db
    .select()
    .from(snapshotsPositivacao)
    .innerJoin(
      subquery,
      sql`${snapshotsPositivacao.slpcode} = ${subquery.slpcode} AND ${snapshotsPositivacao.capturedAt} = ${subquery.maxAt}`,
    )
})

// Top 5 itens mais recentes de um vendedor
app.get(
  '/top5itens/:slpcode',
  {
    schema: {
      params: z.object({ slpcode: z.string().regex(/^\d{1,10}$/, 'slpcode inválido') }),
    },
  },
  async (req) => {
    const latest = await db
      .select({ maxAt: sql<Date>`MAX(${snapshotsTop5Itens.capturedAt})`.as('max_at') })
      .from(snapshotsTop5Itens)
      .where(eq(snapshotsTop5Itens.slpcode, req.params.slpcode))

    const maxAt = latest[0]?.maxAt
    if (!maxAt) return []

    return db
      .select()
      .from(snapshotsTop5Itens)
      .where(
        sql`${snapshotsTop5Itens.slpcode} = ${req.params.slpcode} AND ${snapshotsTop5Itens.capturedAt} = ${maxAt}`,
      )
      .orderBy(desc(snapshotsTop5Itens.percentual))
  }
)

const port = env.API_PORT
const host = env.API_HOST

app.listen({ port, host }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
