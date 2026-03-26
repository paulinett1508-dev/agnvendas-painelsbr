import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import { eq, isNotNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client.js'
import { usuarios } from '../db/schema.js'
import { AppError } from '../errors.js'

const COOKIE_NAME = 'refresh_token'
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 dias em segundos
}

export default async function authRoutes(app: FastifyInstance) {
  // POST /login
  app.post(
    '/login',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        body: z.object({
          email: z.string().email(),
          senha: z.string().min(1),
        }),
      },
    },
    async (req, reply) => {
      const { email, senha } = req.body as { email: string; senha: string }

      const [usuario] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1)
      if (!usuario) throw new AppError(401, 'Credenciais inválidas')

      const senhaOk = await bcrypt.compare(senha, usuario.senhaHash)
      if (!senhaOk) throw new AppError(401, 'Credenciais inválidas')

      const accessToken = app.jwt.sign({ sub: usuario.id, email: usuario.email })

      const refreshToken = crypto.randomBytes(40).toString('hex')
      const refreshTokenHash = await bcrypt.hash(refreshToken, 10)
      await db.update(usuarios).set({ refreshTokenHash }).where(eq(usuarios.id, usuario.id))

      return reply
        .setCookie(COOKIE_NAME, refreshToken, COOKIE_OPTS)
        .send({ accessToken })
    },
  )

  // POST /refresh
  app.post('/refresh', async (req, reply) => {
    const refreshToken = req.cookies?.[COOKIE_NAME]
    if (!refreshToken) throw new AppError(401, 'Refresh token ausente')

    const candidatos = await db
      .select()
      .from(usuarios)
      .where(isNotNull(usuarios.refreshTokenHash))

    let match: typeof candidatos[0] | null = null
    for (const u of candidatos) {
      if (!u.refreshTokenHash) continue
      const ok = await bcrypt.compare(refreshToken, u.refreshTokenHash)
      if (ok) { match = u; break }
    }

    if (!match) throw new AppError(401, 'Refresh token inválido')

    const accessToken = app.jwt.sign({ sub: match.id, email: match.email })
    return reply.send({ accessToken })
  })

  // POST /logout
  app.post('/logout', { onRequest: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as { sub: number }
    await db.update(usuarios).set({ refreshTokenHash: null }).where(eq(usuarios.id, payload.sub))
    return reply.clearCookie(COOKIE_NAME, COOKIE_OPTS).send({ ok: true })
  })
}
