CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"senha_hash" varchar(255) NOT NULL,
	"refresh_token_hash" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
