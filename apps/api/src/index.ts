import { env } from './env.js'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import fastifyCookie from '@fastify/cookie'
import authenticate from './plugins/authenticate.js'
import authRoutes from './routes/auth.js'
import { db, pool } from './db/client.js'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
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

app.decorate('config', { JWT_SECRET: env.JWT_SECRET, CORS_ORIGIN: env.CORS_ORIGIN })

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }),
})

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
})

await app.register(fastifyCookie)

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

await app.register(authenticate)

await app.register(authRoutes, { prefix: '/auth' })

app.get('/health', async () => ({ status: 'ok' }))

// Lista todos os vendedores
app.get('/vendedores', { onRequest: [app.authenticate] }, async () => {
  return db.select().from(vendedores).orderBy(vendedores.nome)
})

// Último snapshot de dashboard de cada vendedor
app.get('/dashboard/latest', { onRequest: [app.authenticate] }, async () => {
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
    onRequest: [app.authenticate],
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
app.get('/positivacao/latest', { onRequest: [app.authenticate] }, async () => {
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
    onRequest: [app.authenticate],
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

const __dirname = dirname(fileURLToPath(import.meta.url))
await migrate(db, { migrationsFolder: join(__dirname, '../drizzle') })

const port = env.API_PORT
const host = env.API_HOST

await app.listen({ port, host })

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'sinal recebido, encerrando...')
  await app.close()
  await pool.end()
  app.log.info('servidor encerrado')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
