import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
// Em dev carrega o .env da raiz do monorepo; em produção as vars vêm do Docker
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../../.env'), override: false })
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })
