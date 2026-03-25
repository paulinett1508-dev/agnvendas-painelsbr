import axios from 'axios'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_KEY!
const SUPABASE_SCHEMA = process.env.SUPABASE_SCHEMA ?? 'lab_sobral'

export const agnClient = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'accept-profile': SUPABASE_SCHEMA,
    Accept: 'application/json',
  },
})

/** Parse de valor numérico com vírgula decimal (ex: "44241,910000" → 44241.91) */
export function parseDecimal(value: string | null | undefined): number | null {
  if (value == null || value === '') return null
  return parseFloat(String(value).replace(',', '.'))
}
