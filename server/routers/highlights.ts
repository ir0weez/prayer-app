import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { verseHighlights } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const highlightsRouter = router({
  // Save a new highlight
  create: protectedProcedure
    .input(
      z.object({
        book: z.string(),
        chapter: z.number(),
        verse: z.number(),
        version: z.enum(["kjv", "csb"]),
        highlightedText: z.string(),
        color: z.enum(["yellow", "green", "blue", "pink", "orange"]),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(verseHighlights).values({
        userId: ctx.user.id,
        book: input.book,
        chapter: input.chapter,
        verse: input.verse,
        version: input.version,
        highlightedText: input.highlightedText,
        color: input.color,
        note: input.note,
      });
      return result;
    }),

  // Get all highlights for a specific chapter
  getChapterHighlights: protectedProcedure
    .input(
      z.object({
        book: z.string(),
        chapter: z.number(),
        version: z.enum(["kjv", "csb"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const highlights = await db
        .select()
        .from(verseHighlights)
        .where(
          and(
            eq(verseHighlights.userId, ctx.user.id),
            eq(verseHighlights.book, input.book),
            eq(verseHighlights.chapter, input.chapter),
            eq(verseHighlights.version, input.version)
          )
        );
      return highlights;
    }),

  // Update a highlight
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        color: z.enum(["yellow", "green", "blue", "pink", "orange"]).optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db
        .update(verseHighlights)
        .set({
          color: input.color,
          note: input.note,
        })
        .where(
          and(
            eq(verseHighlights.id, input.id),
            eq(verseHighlights.userId, ctx.user.id)
          )
        );
      return result;
    }),

  // Delete a highlight
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db
        .delete(verseHighlights)
        .where(
          and(
            eq(verseHighlights.id, input.id),
            eq(verseHighlights.userId, ctx.user.id)
          )
        );
      return result;
    }),
});
