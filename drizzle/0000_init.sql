CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"dossier_id" text NOT NULL,
	"party_id" text NOT NULL,
	"kind" text DEFAULT 'volmacht' NOT NULL,
	"mode" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 15 NOT NULL,
	"status" text DEFAULT 'gepland' NOT NULL,
	"location" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checks" (
	"id" text PRIMARY KEY NOT NULL,
	"dossier_id" text NOT NULL,
	"key" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"comment" text,
	"decided_by" text,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"dossier_id" text NOT NULL,
	"party_id" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"content" "bytea" NOT NULL,
	"source" text NOT NULL,
	"visibility" text DEFAULT 'intern' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"superseded_by" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dossiers" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"status" text DEFAULT 'concept' NOT NULL,
	"service" text NOT NULL,
	"data" jsonb NOT NULL,
	"draft_token" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" text PRIMARY KEY NOT NULL,
	"dossier_id" text,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"html" text NOT NULL,
	"template" text NOT NULL,
	"status" text DEFAULT 'wachtrij' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"dossier_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"visible_to" text DEFAULT 'intern' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"component" text NOT NULL,
	"verdict" text NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"author" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handovers" (
	"id" text PRIMARY KEY NOT NULL,
	"dossier_id" text NOT NULL,
	"version" integer NOT NULL,
	"reason" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text DEFAULT '' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"redirect_to" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" text PRIMARY KEY NOT NULL,
	"dossier_id" text NOT NULL,
	"side" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"user_id" text,
	"email" text,
	"phone" text,
	"display_name" text DEFAULT '' NOT NULL,
	"data" jsonb NOT NULL,
	"invite_token" text,
	"invited_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payoffs" (
	"id" text PRIMARY KEY NOT NULL,
	"dossier_id" text NOT NULL,
	"lender" text NOT NULL,
	"loan_numbers" text,
	"inschrijving" text,
	"status" text DEFAULT 'op_te_vragen' NOT NULL,
	"amount" integer,
	"valid_until" text,
	"doorhaling_kosten" integer,
	"request_document_id" text,
	"document_id" text,
	"source" text DEFAULT 'kadaster' NOT NULL,
	"toestemming_verkoper" boolean DEFAULT false NOT NULL,
	"requested_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" text PRIMARY KEY NOT NULL,
	"dossier_id" text NOT NULL,
	"side" text NOT NULL,
	"party_id" text,
	"check_key" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"response" text,
	"document_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'klant' NOT NULL,
	"phone" text,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checks" ADD CONSTRAINT "checks_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payoffs" ADD CONSTRAINT "payoffs_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checks_dossier_key_idx" ON "checks" USING btree ("dossier_id","key");--> statement-breakpoint
CREATE INDEX "documents_dossier_idx" ON "documents" USING btree ("dossier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dossiers_reference_idx" ON "dossiers" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "events_dossier_idx" ON "events" USING btree ("dossier_id");--> statement-breakpoint
CREATE INDEX "parties_dossier_idx" ON "parties" USING btree ("dossier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");