import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_study_materials",
  title: "List study materials",
  description: "List teacher-uploaded study materials available to the signed-in student, optionally filtered by subject or semester.",
  inputSchema: {
    subject: z.string().describe("Filter by subject name.").optional(),
    semester: z.number().int().describe("Filter by semester number.").optional(),
    limit: z.number().int().describe("Maximum number of materials to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ subject, semester, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("study_materials")
      .select("id, title, description, subject, semester, file_name, file_url, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));
    if (subject) query = query.eq("subject", subject);
    if (typeof semester === "number") query = query.eq("semester", semester);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    const materials = (data ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description ?? null,
      subject: m.subject,
      semester: m.semester ?? null,
      fileName: m.file_name,
      fileUrl: m.file_url,
      createdAt: m.created_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(materials, null, 2) }],
      structuredContent: { materials },
    };
  },
});
