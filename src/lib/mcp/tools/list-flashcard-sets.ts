import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_flashcard_sets",
  title: "List my flashcard sets",
  description: "List the signed-in student's saved flashcard sets, with card counts and optionally the cards themselves.",
  inputSchema: {
    subject: z.string().describe("Filter by subject name.").optional(),
    includeCards: z.boolean().describe("Include the cards of each set (default false).").optional(),
    limit: z.number().int().describe("Maximum number of sets to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ subject, includeCards, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("flashcard_sets")
      .select("id, title, subject, semester, source_type, cards, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 50));
    if (subject) query = query.eq("subject", subject);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    const sets = (data ?? []).map((s) => {
      const cards = Array.isArray(s.cards) ? s.cards : [];
      return {
        id: s.id,
        title: s.title,
        subject: s.subject,
        semester: s.semester,
        sourceType: s.source_type,
        cardCount: cards.length,
        createdAt: s.created_at,
        cards: includeCards
          ? cards.map((c: unknown) => {
              const card = (c ?? {}) as Record<string, unknown>;
              return {
                front: typeof card.front === "string" ? card.front : String(card.question ?? ""),
                back: typeof card.back === "string" ? card.back : String(card.answer ?? ""),
              };
            })
          : [],
      };
    });
    return {
      content: [{ type: "text", text: JSON.stringify(sets, null, 2) }],
      structuredContent: { sets },
    };
  },
});
