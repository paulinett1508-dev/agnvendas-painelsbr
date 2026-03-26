import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vendedores = pgTable('vendedores', {
  id: serial('id').primaryKey(),
  slpcode: varchar('slpcode', { length: 50 }).notNull().unique(),
  nome: varchar('nome', { length: 255 }),
  funcao: varchar('funcao', { length: 100 }),
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const snapshotsDashboard = pgTable('snapshots_dashboard', {
  id: serial('id').primaryKey(),
  slpcode: varchar('slpcode', { length: 50 }).notNull(),
  meta: numeric('meta', { precision: 15, scale: 2 }),
  faturamentoMes: numeric('faturamento_mes', { precision: 15, scale: 2 }),
  faturamentoDia: numeric('faturamento_dia', { precision: 15, scale: 2 }),
  ticketMedioDia: numeric('ticket_medio_dia', { precision: 15, scale: 2 }),
  percentualMes: numeric('percentual_mes', { precision: 8, scale: 4 }),
  mediaMes: numeric('media_mes', { precision: 15, scale: 2 }),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow(),
})

export const snapshotsPositivacao = pgTable('snapshots_positivacao', {
  id: serial('id').primaryKey(),
  slpcode: varchar('slpcode', { length: 50 }).notNull(),
  baseAtiva: integer('base_ativa'),
  positivacaoAtual: integer('positivacao_atual'),
  qtdVendaMesAtual: integer('qtd_venda_mes_atual'),
  vrFatMesAtual: numeric('vr_fat_mes_atual', { precision: 15, scale: 2 }),
  vrFatMesAnterior1: numeric('vr_fat_mes_anterior1', { precision: 15, scale: 2 }),
  vrFatMesAnterior2: numeric('vr_fat_mes_anterior2', { precision: 15, scale: 2 }),
  vrFatMesAnterior3: numeric('vr_fat_mes_anterior3', { precision: 15, scale: 2 }),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow(),
})

export const snapshotsTop5Itens = pgTable('snapshots_top5itens', {
  id: serial('id').primaryKey(),
  slpcode: varchar('slpcode', { length: 50 }).notNull(),
  itemcode: varchar('itemcode', { length: 100 }),
  item: varchar('item', { length: 255 }),
  qtd: integer('qtd'),
  percentual: numeric('percentual', { precision: 8, scale: 4 }),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow(),
})

export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
