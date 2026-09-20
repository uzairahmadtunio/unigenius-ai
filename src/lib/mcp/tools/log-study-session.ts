import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_study_session",
  title: "Log a study session",
  description: "Record a completed study session for the signed-in student so it counts toward progress tracking.",
  inputSchema: {
    subject: z.string().describe("Subject that was studied."),
    durationMinutes: z.number().int().describe("How long the session lasted, in minutes."),
    notes: z.string().describe("Optional notes about what was covered.").optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ subject, durationMinutes, notes }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const trimmed = subject.trim();
    if (!trimmed) throw new ToolError("subject must not be empty");
    if (durationMinutes <= 0 || durationMinutes > 1440) {
      throw new ToolError("durationMinutes must be between 1 and 1440");
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: ctx.getUserId()!,
        subject: trimmed,
        duration_minutes: durationMinutes,
        notes: notes?.trim() || null,
      })
      .select("id, subject, duration_minutes, notes, studied_at")
      .single();
    if (error) throw new ToolError(error.message);
    const session = {
      id: data.id,
      subject: data.subject,
      durationMinutes: data.duration_minutes,
      notes: data.notes ?? null,
      studiedAt: data.studied_at,
    };
    return {
      content: [{ type: "text", text: `Logged ${session.durationMinutes} minutes of ${session.subject}.` }],
      structuredContent: { session },
    };
  },
});
