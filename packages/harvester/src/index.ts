import cron from 'node-cron'
import { runHarvest, pool } from './harvest.js'

const CRON_EXPR = process.env.HARVEST_CRON ?? '*/30 * * * *'
const RUN_ONCE = process.argv.includes('--once')

if (RUN_ONCE) {
  console.log('[harvester] modo manual — executando uma vez')
  await runHarvest()
  await pool.end()
} else {
  console.log(`[harvester] agendado: "${CRON_EXPR}"`)
  // Executa imediatamente na inicialização
  await runHarvest()

  cron.schedule(CRON_EXPR, async () => {
    try {
      await runHarvest()
    } catch (err) {
      console.error('[harvester] erro na coleta:', err)
    }
  })
}
