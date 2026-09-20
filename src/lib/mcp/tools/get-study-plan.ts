import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_study_plan",
  title: "Get my study plan",
  description: "Get the signed-in student's latest generated weekly study plan, including subjects, weekly hours and schedule.",
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("study_plans")
      .select("id, semester, subjects, weekly_hours, exam_date, schedule, updated_at")
      .eq("user_id", ctx.getUserId())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) {
      return { content: [{ type: "text", text: "No study plan has been generated yet." }] };
    }
    const plan = {
      id: data.id,
      semester: data.semester,
      subjects: (data.subjects ?? []).map((s: string) => s),
      weeklyHours: data.weekly_hours,
      examDate: data.exam_date ?? null,
      schedule: data.schedule ?? null,
      updatedAt: data.updated_at,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(plan, null, 2) }],
      structuredContent: { plan },
    };
  },
});
