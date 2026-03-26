import '../src/env.js'
import bcrypt from 'bcrypt'
import { db } from '../src/db/client.js'
import { usuarios } from '../src/db/schema.js'

const email = process.env.ADMIN_EMAIL ?? 'admin@laboratoriosobral.com.br'
const senha = process.env.ADMIN_PASSWORD

if (!senha) {
  console.error('❌ Defina ADMIN_PASSWORD no ambiente antes de rodar este script')
  process.exit(1)
}

const senhaHash = await bcrypt.hash(senha, 12)

await db
  .insert(usuarios)
  .values({ email, senhaHash })
  .onConflictDoUpdate({ target: usuarios.email, set: { senhaHash } })

console.log(`✅ Admin criado/atualizado: ${email}`)
process.exit(0)
