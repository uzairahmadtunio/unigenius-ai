import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_upcoming_exams",
  title: "List upcoming exams",
  description: "List upcoming exams from the university exam schedule, optionally filtered by semester.",
  inputSchema: {
    semester: z.number().int().describe("Filter by semester number.").optional(),
    limit: z.number().int().describe("Maximum number of exams to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ semester, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const today = new Date().toISOString().slice(0, 10);
    let query = supabase
      .from("exam_schedule")
      .select("id, subject, exam_type, exam_date, semester")
      .gte("exam_date", today)
      .order("exam_date", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));
    if (typeof semester === "number") query = query.eq("semester", semester);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    const exams = (data ?? []).map((e) => ({
      id: e.id,
      subject: e.subject,
      examType: e.exam_type,
      examDate: e.exam_date,
      semester: e.semester,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(exams, null, 2) }],
      structuredContent: { exams },
    };
  },
});
