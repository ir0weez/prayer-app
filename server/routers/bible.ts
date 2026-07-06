import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

export const bibleRouter = router({
  getChapterSummary: publicProcedure
    .input(z.object({ book: z.string(), chapter: z.string() }))
    .mutation(async ({ input }) => {
      const { book, chapter } = input;

      try {
        const res = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a biblical storyteller. Generate a dramatic, enticing 1-2 sentence preview of the given Bible chapter that makes the reader excited to dive in. Use a 'Coming up in [Book] Chapter [Number]...' style. Focus on the most compelling action, conflict, or revelation. Keep it short and punchy.",
            },
            {
              role: "user",
              content: `Create a dramatic preview for ${book} chapter ${chapter}. Start with 'Coming up in ${book} ${chapter}:' and make it sound exciting and compelling.`,
            },
          ],
        });

        const summary = res.choices[0].message.content || "";
        return { summary };
      } catch (error) {
        console.error("Error generating chapter summary:", error);
        return { summary: "Summary unavailable" };
      }
    }),
});
