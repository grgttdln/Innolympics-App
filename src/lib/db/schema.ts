import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { vector } from "./vector";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    transcript: text("transcript").notNull(),
    aiResponse: text("ai_response"),
    intent: text("intent").notNull(),
    severity: integer("severity").notNull(),
    moodScore: real("mood_score").notNull(),
    emotions: text("emotions")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    flagged: boolean("flagged").notNull().default(false),
    embedding: vector("embedding", { dimensions: 768 }),
    inputType: text("input_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    intentCheck: check(
      "journal_entries_intent_check",
      sql`${table.intent} IN ('crisis','distress','reflection','growth')`,
    ),
    severityCheck: check(
      "journal_entries_severity_check",
      sql`${table.severity} BETWEEN 0 AND 10`,
    ),
    moodCheck: check(
      "journal_entries_mood_score_check",
      sql`${table.moodScore} BETWEEN -1.0 AND 1.0`,
    ),
    inputTypeCheck: check(
      "journal_entries_input_type_check",
      sql`${table.inputType} IN ('voice','text')`,
    ),
    userCreatedIdx: index("idx_entries_user_created").on(
      table.userId,
      table.createdAt.desc(),
    ),
  }),
);

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;

export const escalationEvents = pgTable(
  "escalation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    triggerType: text("trigger_type").notNull(),
    severity: integer("severity").notNull(),
    entryId: uuid("entry_id").references(() => journalEntries.id, {
      onDelete: "set null",
    }),
    context: jsonb("context")
      .notNull()
      .default(sql`'{}'::jsonb`),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    triggerCheck: check(
      "escalation_events_trigger_type_check",
      sql`${table.triggerType} IN ('crisis_flag','mood_decline','keyword_match')`,
    ),
    userCreatedIdx: index("idx_escalation_user_created").on(
      table.userId,
      table.createdAt.desc(),
    ),
  }),
);

export type EscalationEvent = typeof escalationEvents.$inferSelect;
export type NewEscalationEvent = typeof escalationEvents.$inferInsert;
