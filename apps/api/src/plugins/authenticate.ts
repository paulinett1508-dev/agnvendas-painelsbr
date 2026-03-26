import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'

export interface JwtPayload {
  sub: number   // usuario.id
  email: string
}

export default fp(async function authenticate(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: app.config.JWT_SECRET,
    sign: { expiresIn: '8h' },
  })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify<JwtPayload>()
    } catch {
      reply.status(401).send({ error: 'Não autorizado' })
    }
  })
})

// Augment Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    config: { JWT_SECRET: string; CORS_ORIGIN: string }
  }
}
