CREATE TABLE IF NOT EXISTS "snapshots_dashboard" (
	"id" serial PRIMARY KEY NOT NULL,
	"slpcode" varchar(50) NOT NULL,
	"meta" numeric(15, 2),
	"faturamento_mes" numeric(15, 2),
	"faturamento_dia" numeric(15, 2),
	"ticket_medio_dia" numeric(15, 2),
	"percentual_mes" numeric(8, 4),
	"media_mes" numeric(15, 2),
	"captured_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snapshots_positivacao" (
	"id" serial PRIMARY KEY NOT NULL,
	"slpcode" varchar(50) NOT NULL,
	"base_ativa" integer,
	"positivacao_atual" integer,
	"qtd_venda_mes_atual" integer,
	"vr_fat_mes_atual" numeric(15, 2),
	"vr_fat_mes_anterior1" numeric(15, 2),
	"vr_fat_mes_anterior2" numeric(15, 2),
	"vr_fat_mes_anterior3" numeric(15, 2),
	"captured_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snapshots_top5itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"slpcode" varchar(50) NOT NULL,
	"itemcode" varchar(100),
	"item" varchar(255),
	"qtd" integer,
	"percentual" numeric(8, 4),
	"captured_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"slpcode" varchar(50) NOT NULL,
	"nome" varchar(255),
	"funcao" varchar(100),
	"ativo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "vendedores_slpcode_unique" UNIQUE("slpcode")
);
