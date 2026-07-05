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
                "You are a biblical scholar. Provide a brief, 1-2 sentence summary of the main themes and events in the given Bible chapter. Be concise and accessible.",
            },
            {
              role: "user",
              content: `Summarize ${book} ${chapter} from the Bible.`,
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
