CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"transcript" text NOT NULL,
	"ai_response" text,
	"intent" text NOT NULL,
	"severity" integer NOT NULL,
	"mood_score" real NOT NULL,
	"emotions" text[] DEFAULT '{}'::text[] NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"embedding" vector(768),
	"input_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_entries_intent_check" CHECK ("intent" IN ('crisis','distress','reflection','growth')),
	CONSTRAINT "journal_entries_severity_check" CHECK ("severity" BETWEEN 0 AND 10),
	CONSTRAINT "journal_entries_mood_score_check" CHECK ("mood_score" BETWEEN -1.0 AND 1.0),
	CONSTRAINT "journal_entries_input_type_check" CHECK ("input_type" IN ('voice','text'))
);
--> statement-breakpoint
CREATE TABLE "escalation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"trigger_type" text NOT NULL,
	"severity" integer NOT NULL,
	"entry_id" uuid,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "escalation_events_trigger_type_check" CHECK ("trigger_type" IN ('crisis_flag','mood_decline','keyword_match'))
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "escalation_events" ADD CONSTRAINT "escalation_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "escalation_events" ADD CONSTRAINT "escalation_events_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_entries_user_created" ON "journal_entries" USING btree ("user_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "idx_entries_embedding" ON "journal_entries" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
--> statement-breakpoint
CREATE INDEX "idx_escalation_user_created" ON "escalation_events" USING btree ("user_id","created_at" DESC);
