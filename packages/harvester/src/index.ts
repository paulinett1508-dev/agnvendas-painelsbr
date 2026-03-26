import cron from 'node-cron'
import { runHarvest, pool, logger } from './harvest.js'

const CRON_EXPR = process.env.HARVEST_CRON ?? '*/30 * * * *'
const RUN_ONCE = process.argv.includes('--once')
const SHUTDOWN_TIMEOUT_MS = 30_000

let harvesting = false
let shuttingDown = false

async function gracefulShutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, 'sinal recebido, encerrando...')

  if (harvesting) {
    logger.info(`aguardando coleta em andamento (timeout: ${SHUTDOWN_TIMEOUT_MS}ms)`)
    const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS
    while (harvesting && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200))
    }
    if (harvesting) logger.warn('timeout atingido, forçando saída')
  }

  await pool.end()
  logger.info('pool encerrado, saindo')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

async function safeHarvest() {
  if (shuttingDown) return
  harvesting = true
  try {
    await runHarvest()
  } catch (err) {
    logger.error({ err }, 'erro na coleta')
  } finally {
    harvesting = false
  }
}

if (RUN_ONCE) {
  logger.info('modo manual — executando uma vez')
  await safeHarvest()
  await pool.end()
} else {
  logger.info({ cron: CRON_EXPR }, 'agendado')
  await safeHarvest()
  cron.schedule(CRON_EXPR, safeHarvest)
}
