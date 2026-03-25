// Re-exporta o schema compartilhado.
// Em uma evolução futura, mover para packages/db para compartilhar entre api e harvester.
export {
  vendedores,
  snapshotsDashboard,
  snapshotsPositivacao,
  snapshotsTop5Itens,
} from '../../../apps/api/src/db/schema.js'
