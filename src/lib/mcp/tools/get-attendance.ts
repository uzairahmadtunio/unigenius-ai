import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_attendance_summary",
  title: "Get attendance summary",
  description:
    "Summarise the signed-in student's attendance per subject (present, absent, percentage) for a semester, with the most recent records.",
  inputSchema: {
    semester: z.number().int().describe("Semester number to summarise. Omit for all semesters.").optional(),
    subject: z.string().describe("Filter to a single subject name.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ semester, subject }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("attendance")
      .select("subject, status, date, semester")
      .eq("user_id", ctx.getUserId())
      .order("date", { ascending: false })
      .limit(500);
    if (typeof semester === "number") query = query.eq("semester", semester);
    if (subject) query = query.eq("subject", subject);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    const bySubject = new Map<string, { subject: string; present: number; absent: number; total: number }>();
    for (const row of data ?? []) {
      const entry = bySubject.get(row.subject) ?? { subject: row.subject, present: 0, absent: 0, total: 0 };
      entry.total += 1;
      if (row.status === "present") entry.present += 1;
      else entry.absent += 1;
      bySubject.set(row.subject, entry);
    }
    const subjects = [...bySubject.values()].map((e) => ({
      ...e,
      percentage: e.total ? Math.round((e.present / e.total) * 1000) / 10 : 0,
      belowThreshold: e.total ? e.present / e.total < 0.75 : false,
    }));
    const recent = (data ?? []).slice(0, 20).map((r) => ({
      subject: r.subject,
      status: r.status,
      date: r.date,
      semester: r.semester,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ subjects, recent }, null, 2) }],
      structuredContent: { subjects, recent },
    };
  },
});
