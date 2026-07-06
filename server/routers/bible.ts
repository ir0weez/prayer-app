import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

export const bibleRouter = router({
  getChapterSummary: publicProcedure
    .input(z.object({ book: z.string(), chapter: z.string() }))
    .mutation(async ({ input }) => {
      const { book, chapter } = input;
      const chapterNum = parseInt(chapter, 10);
      const prevChapter = Math.max(1, chapterNum - 1);

      try {
        const res = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a biblical storyteller creating dramatic chapter previews. Generate exactly 3 lines:\n1. 'Last time in [Book] [Previous Chapter]:' followed by a 1-sentence recap of the previous chapter's key event.\n2. 'This time in [Book] [Current Chapter]:' followed by a 1-sentence preview of this chapter's main action/conflict.\n3. A cliffhanger question (e.g., 'Will so-and-so survive?' or 'What will happen next?')\n\nKeep each line punchy and exciting. Make it sound like a TV show recap and preview.",
            },
            {
              role: "user",
              content: `Create a dramatic preview for ${book} chapter ${chapter}. Format it as:\nLast time in ${book} ${prevChapter}: [recap of previous chapter]\nThis time in ${book} ${chapter}: [preview of this chapter]\n[Cliffhanger question]`,
            },
          ],
        });

        const summary = res.choices[0].message.content || "";
        // Clear old cache entries for this book to force regeneration
        return { summary };
      } catch (error) {
        console.error("Error generating chapter summary:", error);
        return { summary: "Summary unavailable" };
      }
    }),
});
