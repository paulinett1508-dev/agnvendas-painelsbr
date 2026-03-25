ALTER TABLE "snapshots_dashboard" ALTER COLUMN "captured_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "snapshots_positivacao" ALTER COLUMN "captured_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "snapshots_top5itens" ALTER COLUMN "captured_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vendedores" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;