import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const verseHighlights = mysqlTable("verseHighlights", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  book: varchar("book", { length: 64 }).notNull(),
  chapter: int("chapter").notNull(),
  verse: int("verse").notNull(),
  version: varchar("version", { length: 10 }).notNull().default("kjv"),
  highlightedText: text("highlightedText").notNull(),
  color: mysqlEnum("color", ["yellow", "green", "blue", "pink", "orange"]).notNull().default("yellow"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VerseHighlight = typeof verseHighlights.$inferSelect;
export type InsertVerseHighlight = typeof verseHighlights.$inferInsert;
