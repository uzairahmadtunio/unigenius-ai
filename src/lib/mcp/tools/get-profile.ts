import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_profile",
  title: "Get my academic profile",
  description:
    "Get the signed-in student's UniGenius profile: display name, department, current semester, roll number and Pro status.",
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, department, current_semester, roll_number, section, university, is_pro, headline, skills")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("No profile found for this account.");
    const profile = {
      displayName: data.display_name ?? null,
      department: data.department ?? null,
      currentSemester: data.current_semester ?? null,
      rollNumber: data.roll_number ?? null,
      section: data.section ?? null,
      university: data.university ?? null,
      isPro: Boolean(data.is_pro),
      headline: data.headline ?? null,
      skills: (data.skills ?? []).map((s: string) => s),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      structuredContent: { profile },
    };
  },
});
