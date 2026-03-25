import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') })
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
